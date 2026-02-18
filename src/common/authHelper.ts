// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { MapAuthHelper, SDKAuthHelper } from "./types";
import { Signer } from "../utils/signer";

/**
 * Creates a transformRequest function that signs Amazon Location Service URLs using SigV4.
 *
 * @param region AWS region used for signing.
 * @param getCredentials Function that returns the current credentials.
 */
export function createTransformRequest(
  region: string,
  getCredentials: () => AwsCredentialIdentity,
): (url: string, resourceType?: string) => { url: string } {
  return (url: string, resourceType?: string) => {
    // Only sign Amazon Location Service URLs
    if (url.match(/^https:\/\/maps\.(geo|geo-fips)\.[a-z0-9-]+\.(amazonaws\.com|api\.aws)/)) {
      const urlObj = new URL(url);

      // Split the pathname into parts, using the filter(Boolean) to ignore any empty parts,
      // since the first item will be empty because the pathname looks like:
      //    /v2/styles/Standard/descriptor
      const pathParts = urlObj.pathname.split("/").filter(Boolean);

      // The signing service name for the standalone Maps SDK is "geo-maps"
      let serviceName = "geo-maps";
      if (pathParts?.[0] == "v2") {
        // For this case, we only need to sign the map tiles, so we
        // can return the original url if it is for descriptor, sprites, or glyphs
        if (!resourceType || resourceType !== "Tile") {
          return { url };
        }
      } else {
        // The signing service name for the consolidated Location Client is "geo"
        // In this case, we need to sign all URLs (sprites, glyphs, map tiles)
        serviceName = "geo";
      }

      const credentials = getCredentials();
      return {
        url: Signer.signUrl(url, region, serviceName, {
          access_key: credentials.accessKeyId,
          secret_key: credentials.secretAccessKey,
          session_token: credentials.sessionToken,
        }),
      };
    }

    return { url };
  };
}

/**
 * Sets up automatic credential refresh. Credentials are refreshed 1 minute before expiration, or every hour if no
 * expiration is provided.
 *
 * @param credentialProvider Function that fetches fresh credentials.
 * @returns A function that returns the current credentials after the initial fetch.
 */
export async function setupCredentialRefresh(
  credentialProvider: AwsCredentialIdentityProvider,
): Promise<() => AwsCredentialIdentity> {
  let credentials: AwsCredentialIdentity;

  async function refreshCredentials() {
    credentials = await credentialProvider();

    let timeToRefresh = 3600000; // default to 1 hour if credentials does not have expiration field
    if (credentials.expiration) {
      timeToRefresh = credentials.expiration.getTime() - new Date().getTime();
    }

    // timeToRefresh minus 1 minute to give some time for the actual refresh to happen.
    setTimeout(refreshCredentials, timeToRefresh - 60000);
  }

  await refreshCredentials();

  return () => credentials;
}

/**
 * Builds a complete MapAuthHelper & SDKAuthHelper from a credentials provider and region.
 *
 * @param credentialProvider Function that fetches AWS credentials.
 * @param region AWS region for signing and client config.
 */
export async function buildAuthHelper(
  credentialProvider: AwsCredentialIdentityProvider,
  region: string,
): Promise<MapAuthHelper & SDKAuthHelper> {
  const getCredentials = await setupCredentialRefresh(credentialProvider);

  const clientConfig = {
    credentials: credentialProvider,
    region,
  };

  return {
    getMapAuthenticationOptions: () => ({
      transformRequest: createTransformRequest(region, getCredentials),
    }),
    getLocationClientConfig: () => clientConfig,
    getClientConfig: () => clientConfig,
    getCredentials,
  };
}

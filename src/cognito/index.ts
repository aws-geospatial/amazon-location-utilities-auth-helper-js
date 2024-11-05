// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MapAuthHelper, SDKAuthHelper } from "../common/types";
import { FromCognitoIdentityPoolParameters, fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { Signer } from "../utils/signer";
import { AwsCredentialIdentity } from "@aws-sdk/types";
/**
 * Creates an auth helper instance using credentials from Cognito.
 *
 * @param identityPoolId Cognito Identity Pool Id
 */
export async function withIdentityPoolId(
  identityPoolId: string,
  options?: Partial<FromCognitoIdentityPoolParameters>,
): Promise<MapAuthHelper & SDKAuthHelper> {
  const region = identityPoolId.split(":")[0];
  const credentialsProvider = fromCognitoIdentityPool({
    ...(options || {}),
    identityPoolId,
    clientConfig: {
      ...(options && options.clientConfig ? options.clientConfig : {}),
      region,
    },
  });

  let credentials: AwsCredentialIdentity;
  async function refreshCredentials() {
    credentials = await credentialsProvider();

    let timeToRefresh = 3600000; // default to 1 hour if credentials does not have expiration field
    if (credentials.expiration) {
      timeToRefresh = credentials.expiration.getTime() - new Date().getTime();
    }

    // timeToRefresh minus 1 minute to give some time for the actual refresh to happen.
    setTimeout(refreshCredentials, timeToRefresh - 60000);
  }

  await refreshCredentials();

  const clientConfig = {
    credentials: credentialsProvider,
    region: region,
  };

  return {
    getMapAuthenticationOptions: () => ({
      transformRequest: (url: string, resourceType?: string) => {
        // Only sign Amazon Location Service URLs
        if (url.match(/^https:\/\/maps\.(geo|geo-fips)\.[a-z0-9-]+\.(amazonaws\.com)/)) {
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

          return {
            url: Signer.signUrl(url, region, serviceName, {
              access_key: credentials.accessKeyId,
              secret_key: credentials.secretAccessKey,
              session_token: credentials.sessionToken,
            }),
          };
        }

        return { url };
      },
    }),
    getLocationClientConfig: () => clientConfig,
    getClientConfig: () => clientConfig,
    getCredentials: () => credentials,
  };
}

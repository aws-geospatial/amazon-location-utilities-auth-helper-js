// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MapAuthHelper, SDKAuthHelper } from "../common/types";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { Signer } from "@aws-amplify/core";
import { AwsCredentialIdentity } from "@aws-sdk/types";
/**
 * Creates an auth helper instance using credentials from Cognito.
 *
 * @param identityPoolId Cognito Identity Pool Id
 */
export async function withIdentityPoolId(identityPoolId: string): Promise<MapAuthHelper & SDKAuthHelper> {
  const credentialsProvider = fromCognitoIdentityPool({
    identityPoolId,
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

  return {
    getMapAuthenticationOptions: () => ({
      transformRequest: (url: string) => {
        // Only sign aws URLs
        if (url.includes("amazonaws.com")) {
          return {
            url: Signer.signUrl(url, {
              access_key: credentials.accessKeyId,
              secret_key: credentials.secretAccessKey,
              session_token: credentials.sessionToken,
            }),
          };
        }

        return { url };
      },
    }),
    getLocationClientConfig: () => ({
      credentials,
    }),
    getCredentials: () => credentials,
  };
}

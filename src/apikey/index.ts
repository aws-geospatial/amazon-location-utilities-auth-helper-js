// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { LocationClientConfig, SDKAuthHelper } from "../common/types";

/**
 * Creates an auth helper instance using APIKey. The `getClientConfig` function creates a signer to set the APIKey in
 * all the commands of a client.
 *
 * @param apiKey APIKey
 */
export async function withAPIKey(apiKey: string, region?: string): Promise<SDKAuthHelper> {
  const clientConfig: LocationClientConfig = {
    signer: {
      sign: async (requestToSign) => {
        // APIKey in the command can override the APIKey set by auth helper.
        requestToSign.query = {
          key: apiKey,
          ...(requestToSign.query ?? {}),
        };
        return requestToSign;
      },
    },
    // Empty value to avoid calling the default credential providers chain
    credentials: (async () => ({})) as AwsCredentialIdentityProvider,
  };

  // Include the region, if it was supplied
  if (region) {
    clientConfig.region = region;
  }

  return {
    getLocationClientConfig: () => clientConfig,
    getClientConfig: () => clientConfig,
  };
}

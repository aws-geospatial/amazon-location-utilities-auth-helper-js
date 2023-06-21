// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKAuthHelper } from "../common/types";

/**
 * Creates an auth helper instance using APIKey. Its `getLocationClientConfig` function creates a signer to set the
 * APIKey in all the commands of a client.
 *
 * @param apiKey APIKey
 */
export async function withAPIKey(apiKey: string): Promise<SDKAuthHelper> {
  return {
    getLocationClientConfig: () => ({
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
    }),
  };
}

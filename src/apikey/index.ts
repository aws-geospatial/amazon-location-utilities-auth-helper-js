// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKAuthHelper } from "../common/types";

/**
 * Creates an auth helper instance using APIKey.
 *
 * @param apiKey APIKey
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function withAPIKey(apiKey: string): Promise<SDKAuthHelper> {
  return {
    getLocationClientConfig: () => ({}),
  };
}

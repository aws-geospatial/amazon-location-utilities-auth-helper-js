// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthHelper } from "../common/types";

/**
 * Creates an auth helper instance using credentials from Cognito.
 *
 * @param identityPoolId Cognito Identity Pool Id
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function withIdentityPoolId(identityPoolId: string): Promise<AuthHelper> {
  await new Promise((resolve) => setTimeout(resolve, 1));
  return {
    getMapAuthenticationOptions: () => ({}),
    getLocationClientConfig: () => ({}),
    getCredentials: () => ({
      accessKeyId: "",
      secretAccessKey: "",
      sessionToken: "",
    }),
  };
}

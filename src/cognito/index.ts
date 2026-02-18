// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MapAuthHelper, SDKAuthHelper } from "../common/types";
import { FromCognitoIdentityPoolParameters, fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { buildAuthHelper } from "../common/authHelper";

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
  const credentialProvider = fromCognitoIdentityPool({
    ...(options || {}),
    identityPoolId,
    clientConfig: {
      ...(options && options.clientConfig ? options.clientConfig : {}),
      region,
    },
  });

  return buildAuthHelper(credentialProvider, region);
}

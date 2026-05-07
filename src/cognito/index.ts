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
  // Validate identity pool ID format (expected: "region:guid")
  if (!identityPoolId || typeof identityPoolId !== "string") {
    throw new Error("Identity pool ID must be a non-empty string");
  }

  const parts = identityPoolId.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid identity pool ID format: "${identityPoolId}". Expected format: "region:guid" (e.g., "us-east-1:12345678-1234-1234-1234-123456789012")`,
    );
  }

  const region = parts[0];
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

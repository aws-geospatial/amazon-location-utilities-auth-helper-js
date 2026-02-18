// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { MapAuthHelper, SDKAuthHelper } from "../common/types";
import { buildAuthHelper } from "../common/authHelper";

/**
 * Creates an auth helper instance using an arbitrary AWS credentials provider function. This is useful when credentials
 * are obtained through a custom mechanism, such as a Cognito Identity Pool that requires authentication first, or a
 * dedicated back-end service.
 *
 * @param credentialProvider A function that returns AWS credentials (or a promise of them).
 * @param region The AWS region for signing requests.
 */
export async function withCredentialProvider(
  credentialProvider: AwsCredentialIdentityProvider,
  region: string,
): Promise<MapAuthHelper & SDKAuthHelper> {
  return buildAuthHelper(credentialProvider, region);
}

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AwsCredentialIdentity } from "@aws-sdk/types";

// eslint-disable-next-line  @typescript-eslint/no-empty-interface
export interface MapAuthenticationOptions {}

// eslint-disable-next-line  @typescript-eslint/no-empty-interface
export interface LocationClientConfig {}

export interface getMapAuthenticationOptionsFunc {
  (): MapAuthenticationOptions;
}

export interface getLocationClientConfigFunc {
  (): LocationClientConfig;
}

export interface getCredentialsFunc {
  (): AwsCredentialIdentity;
}

export interface AuthHelper extends SDKAuthHelper {
  getMapAuthenticationOptions: getMapAuthenticationOptionsFunc;
  getCredentials: getCredentialsFunc;
}

export interface SDKAuthHelper {
  getLocationClientConfig: getLocationClientConfigFunc;
}

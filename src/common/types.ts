// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AwsCredentialIdentity, RequestSigner } from "@aws-sdk/types";

// eslint-disable-next-line  @typescript-eslint/no-empty-interface
export interface MapAuthenticationOptions {}

export interface LocationClientConfig {
  signer?: RequestSigner;
}

export type getMapAuthenticationOptionsFunc = () => MapAuthenticationOptions;
export type getLocationClientConfigFunc = () => LocationClientConfig;
export type getCredentialsFunc = () => AwsCredentialIdentity;

export interface MapAuthHelper {
  getMapAuthenticationOptions: getMapAuthenticationOptionsFunc;
  getCredentials: getCredentialsFunc;
}

export interface SDKAuthHelper {
  getLocationClientConfig: getLocationClientConfigFunc;
}

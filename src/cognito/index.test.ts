// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { withIdentityPoolId } from "./index";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { Signer } from "@aws-amplify/core";
import Mock = jest.Mock;
import { CognitoIdentityCredentialProvider } from "@aws-sdk/credential-provider-cognito-identity";

jest.mock("@aws-sdk/credential-providers");
jest.mock("@aws-amplify/core");

describe("AuthHelper for Cognito", () => {
  jest.useFakeTimers();
  const region = "us-west-2";
  const cognitoIdentityPoolId = `${region}:TEST-IDENTITY-POOL-ID`;
  const url = "https://maps.geo.us-west-2.amazonaws.com/";
  const signedUrl = "https://maps.geo.us-west-2.amazonaws.com/#signed";
  const nonAWSUrl = "https://example.com/";
  const mockedCredentials = {
    identityId: "identityId",
    accessKeyId: "accessKeyId",
    secretAccessKey: "secretAccessKey",
    sessionToken: "sessionToken",
  };

  const mockedUpdatedCredentials = {
    identityId: "identityId",
    accessKeyId: "updated",
    secretAccessKey: "updated",
    sessionToken: "updated",
  };
  const mockedCredentialsProvider = jest.fn();

  beforeAll(() => {
    Signer.signUrl = jest.fn(() => signedUrl);
    (<Mock<CognitoIdentityCredentialProvider>>fromCognitoIdentityPool).mockReturnValue(mockedCredentialsProvider);
  });

  beforeEach(() => {
    (<Mock<CognitoIdentityCredentialProvider>>fromCognitoIdentityPool).mockClear();
    mockedCredentialsProvider.mockResolvedValue(mockedCredentials);
    (<Mock<string>>Signer.signUrl).mockClear();
  });

  it("should get credentials from cognito", async () => {
    await withIdentityPoolId(cognitoIdentityPoolId);
    expect(fromCognitoIdentityPool).toHaveBeenCalledTimes(1);
    expect(fromCognitoIdentityPool).toHaveBeenCalledWith({
      identityPoolId: cognitoIdentityPoolId,
      clientConfig: {
        region,
      },
    });
  });

  it("should refresh credentials in 1 hour minus 1 minute by default", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);

    expect(authHelper.getCredentials()).toStrictEqual(mockedCredentials);
    mockedCredentialsProvider.mockResolvedValue(mockedUpdatedCredentials);
    await jest.advanceTimersByTimeAsync(3530000);
    expect(authHelper.getCredentials()).toStrictEqual(mockedCredentials);
    await jest.advanceTimersByTimeAsync(20000);
    expect(authHelper.getCredentials()).toStrictEqual(mockedUpdatedCredentials);
  });

  it("should refresh credentials at 1 minute before expiration specified in the credentials", async () => {
    const mockedCredentialsWithExpiration = {
      ...mockedCredentials,
      expiration: new Date(new Date().getTime() + 300000), // expire in 5 minutes
    };
    mockedCredentialsProvider.mockResolvedValue(mockedCredentialsWithExpiration);

    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    expect(authHelper.getCredentials()).toStrictEqual(mockedCredentialsWithExpiration);
    mockedCredentialsProvider.mockResolvedValue(mockedUpdatedCredentials);
    await jest.advanceTimersByTimeAsync(230000);
    expect(authHelper.getCredentials()).toStrictEqual(mockedCredentialsWithExpiration);
    await jest.advanceTimersByTimeAsync(20000);
    expect(authHelper.getCredentials()).toStrictEqual(mockedUpdatedCredentials);
  });

  it("getMapAuthenticationOptions should contain transformRequest funtion to sign the AWS Urls using amplify signer", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;
    expect(transformRequest(url)).toStrictEqual({
      url: signedUrl,
    });
    expect(transformRequest(nonAWSUrl)).toStrictEqual({
      url: nonAWSUrl,
    });
    expect(Signer.signUrl).toHaveBeenCalledTimes(1);
    expect(Signer.signUrl).toHaveBeenCalledWith(url, {
      access_key: mockedCredentials.accessKeyId,
      secret_key: mockedCredentials.secretAccessKey,
      session_token: mockedCredentials.sessionToken,
    });
  });

  it("getLocationClientConfig should provide credentials from cognito", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    const additionalLocationClientConfig = authHelper.getLocationClientConfig();
    expect("signer" in additionalLocationClientConfig).toBe(false);
    expect(await additionalLocationClientConfig.credentials()).toStrictEqual(mockedCredentials);
  });

  it("getCredentials should return the credentials", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    expect(authHelper.getCredentials()).toStrictEqual(mockedCredentials);
  });
});

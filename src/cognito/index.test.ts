// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { withIdentityPoolId } from "./index";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import Mock = jest.Mock;
import { CognitoIdentityCredentialProvider } from "@aws-sdk/credential-provider-cognito-identity";

jest.mock("@aws-sdk/credential-providers");

describe("AuthHelper for Cognito", () => {
  jest.useFakeTimers();
  const region = "us-west-2";
  const cognitoIdentityPoolId = `${region}:TEST-IDENTITY-POOL-ID`;
  const standaloneMapsUrl = "https://maps.geo.us-west-2.amazonaws.com/v2";
  const locationUrl = "https://maps.geo.us-west-2.amazonaws.com/maps/v0/maps/TestMapName";
  const govCloudUrl = "https://maps.geo-fips.us-gov-west-1.amazonaws.com/";
  const nonAWSUrl = "https://example.com/";
  const nonLocationAWSUrl = "https://my.cool.service.us-west-2.amazonaws.com/";
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
    (<Mock<CognitoIdentityCredentialProvider>>fromCognitoIdentityPool).mockReturnValue(mockedCredentialsProvider);
  });

  beforeEach(() => {
    (<Mock<CognitoIdentityCredentialProvider>>fromCognitoIdentityPool).mockClear();
    mockedCredentialsProvider.mockResolvedValue(mockedCredentials);
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

  it("should get credentials from cognito using custom logins token", async () => {
    await withIdentityPoolId(cognitoIdentityPoolId, {
      logins: {
        "cognito-idp.<region>.amazonaws.com/<YOUR_USER_POOL_ID>": "cognito-id-token",
      },
    });
    expect(fromCognitoIdentityPool).toHaveBeenCalledTimes(1);
    expect(fromCognitoIdentityPool).toHaveBeenCalledWith({
      identityPoolId: cognitoIdentityPoolId,
      clientConfig: {
        region,
      },
      logins: {
        "cognito-idp.<region>.amazonaws.com/<YOUR_USER_POOL_ID>": "cognito-id-token",
      },
    });
  });

  it("should get credentials from cognito using custom options with client config", async () => {
    await withIdentityPoolId(cognitoIdentityPoolId, {
      clientConfig: {
        maxAttempts: 10,
      },
      logins: {
        "cognito-idp.<region>.amazonaws.com/<YOUR_USER_POOL_ID>": "cognito-id-token",
      },
    });
    expect(fromCognitoIdentityPool).toHaveBeenCalledTimes(1);
    expect(fromCognitoIdentityPool).toHaveBeenCalledWith({
      identityPoolId: cognitoIdentityPoolId,
      clientConfig: {
        region,
        maxAttempts: 10,
      },
      logins: {
        "cognito-idp.<region>.amazonaws.com/<YOUR_USER_POOL_ID>": "cognito-id-token",
      },
    });
  });

  it("should not use region and identityPoolId provided inside the options", async () => {
    // region and identity pool id provided in the options are ignored since it's inferred from the cognitoIdentityPoolId
    await withIdentityPoolId(cognitoIdentityPoolId, {
      clientConfig: {
        region: "unused-region",
      },
      identityPoolId: "unused-idp-id",
    });
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

  // For the standalone Places SDK, the url should only be signed when accessing the map tiles
  it("getMapAuthenticationOptions should contain transformRequest function to sign the AWS standalone Maps URLs for map tiles using our custom signer", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

    const url = standaloneMapsUrl + "/tiles";

    const originalUrl = new URL(url);
    const signedUrl = new URL(transformRequest(url).url);

    // Host and pathname should still be the same
    expect(signedUrl.hostname).toStrictEqual(originalUrl.hostname);
    expect(signedUrl.pathname).toStrictEqual(originalUrl.pathname);

    const searchParams = signedUrl.searchParams;
    expect(searchParams.size).toStrictEqual(6);

    // Verify these search params exist on the signed url
    // We don't need to test the actual values since they are non-deterministic or constants
    const expectedSearchParams = ["X-Amz-Algorithm", "X-Amz-Date", "X-Amz-SignedHeaders", "X-Amz-Signature"];
    expectedSearchParams.forEach((value) => {
      expect(searchParams.has(value)).toStrictEqual(true);
    });

    // We can expect the session token to match exactly as passed in
    const securityToken = searchParams.get("X-Amz-Security-Token");
    expect(securityToken).toStrictEqual(mockedCredentials.sessionToken);

    // The credential is formatted as such:
    //    <Access Key ID>/<CURRENT DATE>/<SIGNING REGION>/<SIGNING SERVICE NAME>/aws4_request
    // We need to validate that the access key matches our mocked credentials,
    // and that the signing service name is "geo-maps" for all standalone Maps SDK tile requests
    const credential = searchParams.get("X-Amz-Credential");
    const credentialParts = credential?.split("/");
    expect(credentialParts?.[0]).toStrictEqual(mockedCredentials.accessKeyId);
    expect(credentialParts?.[3]).toStrictEqual("geo-maps");
  });

  // For the standalone Places SDK, the url should not be signed when accessing all style descriptor, sprites, and glyphs
  it.each([["/styles/Standard/descriptor"], ["/styles/Standard/Light/Default/sprites"], ["/glyphs"]])(
    "getMapAuthenticationOptions should contain transformRequest function to sign the AWS Location URLs for %i using our custom signer",
    async (resourceName) => {
      const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
      const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

      const url = standaloneMapsUrl + resourceName;

      expect(transformRequest(url)).toStrictEqual({
        url: url,
      });
    },
  );

  // For the consolidated Location SDK, the url should be signed when accessing all resources (style descriptor, sprites, glyphs, and map tiles)
  it.each([["/style-descriptor"], ["/sprites"], ["/glyphs"], ["/tiles"]])(
    "getMapAuthenticationOptions should contain transformRequest function to sign the AWS Location URLs for %i using our custom signer",
    async (resourceName) => {
      const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
      const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

      const url = locationUrl + resourceName;

      const originalUrl = new URL(url);
      const signedUrl = new URL(transformRequest(url).url);

      // Host and pathname should still be the same
      expect(signedUrl.hostname).toStrictEqual(originalUrl.hostname);
      expect(signedUrl.pathname).toStrictEqual(originalUrl.pathname);

      const searchParams = signedUrl.searchParams;
      expect(searchParams.size).toStrictEqual(6);

      // Verify these search params exist on the signed url
      // We don't need to test the actual values since they are non-deterministic or constants
      const expectedSearchParams = ["X-Amz-Algorithm", "X-Amz-Date", "X-Amz-SignedHeaders", "X-Amz-Signature"];
      expectedSearchParams.forEach((value) => {
        expect(searchParams.has(value)).toStrictEqual(true);
      });

      // We can expect the session token to match exactly as passed in
      const securityToken = searchParams.get("X-Amz-Security-Token");
      expect(securityToken).toStrictEqual(mockedCredentials.sessionToken);

      // The credential is formatted as such:
      //    <Access Key ID>/<CURRENT DATE>/<SIGNING REGION>/<SIGNING SERVICE NAME>/aws4_request
      // We need to validate that the access key matches our mocked credentials,
      // and that the signing service name is "geo" for all consolidated Location SDK requests
      const credential = searchParams.get("X-Amz-Credential");
      const credentialParts = credential?.split("/");
      expect(credentialParts?.[0]).toStrictEqual(mockedCredentials.accessKeyId);
      expect(credentialParts?.[3]).toStrictEqual("geo");
    },
  );

  it("getMapAuthenticationOptions should contain transformRequest function to sign the AWS GovCloud Urls using our custom signer", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;
    const originalUrl = new URL(govCloudUrl);
    const signedUrl = new URL(transformRequest(govCloudUrl).url);

    // Host and pathname should still be the same
    expect(signedUrl.hostname).toStrictEqual(originalUrl.hostname);
    expect(signedUrl.pathname).toStrictEqual(originalUrl.pathname);

    const searchParams = signedUrl.searchParams;
    expect(searchParams.size).toStrictEqual(6);

    // Verify these search params exist on the signed url
    // We don't need to test the actual values since they are non-deterministic or constants
    const expectedSearchParams = ["X-Amz-Algorithm", "X-Amz-Date", "X-Amz-SignedHeaders", "X-Amz-Signature"];
    expectedSearchParams.forEach((value) => {
      expect(searchParams.has(value)).toStrictEqual(true);
    });

    // We can expect the session token to match exactly as passed in
    const securityToken = searchParams.get("X-Amz-Security-Token");
    expect(securityToken).toStrictEqual(mockedCredentials.sessionToken);

    // The credential starts with our access key, the rest is generated
    const credential = searchParams.get("X-Amz-Credential");
    expect(credential).toContain(mockedCredentials.accessKeyId);
  });

  it("getMapAuthenticationOptions transformRequest function should pass-through non AWS Urls unchanged", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

    expect(transformRequest(nonAWSUrl)).toStrictEqual({
      url: nonAWSUrl,
    });
  });

  it("getMapAuthenticationOptions transformRequest function should pass-through AWS Urls that aren't for the Amazon Location Service unchanged", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

    expect(transformRequest(nonLocationAWSUrl)).toStrictEqual({
      url: nonLocationAWSUrl,
    });
  });

  it("getLocationClientConfig should provide credentials from cognito", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    const additionalLocationClientConfig = authHelper.getLocationClientConfig();
    expect("signer" in additionalLocationClientConfig).toBe(false);

    expect("credentials" in additionalLocationClientConfig).toBe(true);
    if (additionalLocationClientConfig.credentials) {
      expect(await additionalLocationClientConfig.credentials()).toStrictEqual(mockedCredentials);
    }
  });

  it("getLocationClientConfig should provide region from cognito", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    const locationClientConfig = authHelper.getLocationClientConfig();

    expect(locationClientConfig.region).toStrictEqual(region);
  });

  it("getClientConfig should provide credentials from cognito", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    const additionalClientConfig = authHelper.getClientConfig();
    expect("signer" in additionalClientConfig).toBe(false);

    expect("credentials" in additionalClientConfig).toBe(true);
    if (additionalClientConfig.credentials) {
      expect(await additionalClientConfig.credentials()).toStrictEqual(mockedCredentials);
    }
  });

  it("getClientConfig should provide region from cognito", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    const clientConfig = authHelper.getClientConfig();

    expect(clientConfig.region).toStrictEqual(region);
  });

  it("getCredentials should return the credentials", async () => {
    const authHelper = await withIdentityPoolId(cognitoIdentityPoolId);
    expect(authHelper.getCredentials()).toStrictEqual(mockedCredentials);
  });
});

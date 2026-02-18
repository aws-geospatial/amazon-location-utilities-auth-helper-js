// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { withCredentialProvider } from "./index";

describe("AuthHelper for Credential Provider", () => {
  jest.useFakeTimers();
  const region = "us-west-2";
  const standaloneMapsUrl = "https://maps.geo.us-west-2.amazonaws.com/v2";
  const locationUrl = "https://maps.geo.us-west-2.amazonaws.com/maps/v0/maps/TestMapName";
  const govCloudUrl = "https://maps.geo-fips.us-gov-west-1.amazonaws.com/";
  const dualStackUrl = "https://maps.geo.us-west-2.api.aws/maps/v0/maps/TestMapName";
  const dualStackStandaloneMapsUrl = "https://maps.geo.us-west-2.api.aws/v2";
  const nonAWSUrl = "https://example.com/";
  const nonLocationAWSUrl = "https://my.cool.service.us-west-2.amazonaws.com/";
  const mockedCredentials = {
    accessKeyId: "accessKeyId",
    secretAccessKey: "secretAccessKey",
    sessionToken: "sessionToken",
  };

  const mockedUpdatedCredentials = {
    accessKeyId: "updated",
    secretAccessKey: "updated",
    sessionToken: "updated",
  };

  let mockedCredentialProvider: jest.Mock;

  beforeEach(() => {
    mockedCredentialProvider = jest.fn().mockResolvedValue(mockedCredentials);
  });

  it("should call the credentials provider on initialization", async () => {
    await withCredentialProvider(mockedCredentialProvider, region);
    expect(mockedCredentialProvider).toHaveBeenCalledTimes(1);
  });

  it("should refresh credentials in 1 hour minus 1 minute by default", async () => {
    const authHelper = await withCredentialProvider(mockedCredentialProvider, region);

    expect(authHelper.getCredentials()).toStrictEqual(mockedCredentials);
    mockedCredentialProvider.mockResolvedValue(mockedUpdatedCredentials);
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
    mockedCredentialProvider.mockResolvedValue(mockedCredentialsWithExpiration);

    const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
    expect(authHelper.getCredentials()).toStrictEqual(mockedCredentialsWithExpiration);
    mockedCredentialProvider.mockResolvedValue(mockedUpdatedCredentials);
    await jest.advanceTimersByTimeAsync(230000);
    expect(authHelper.getCredentials()).toStrictEqual(mockedCredentialsWithExpiration);
    await jest.advanceTimersByTimeAsync(20000);
    expect(authHelper.getCredentials()).toStrictEqual(mockedUpdatedCredentials);
  });

  // For the standalone Maps SDK, the url should only be signed when accessing the map tiles
  it("getMapAuthenticationOptions should contain transformRequest function to sign the AWS standalone Maps URLs for map tiles using our custom signer", async () => {
    const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
    const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

    const url = standaloneMapsUrl + "/tiles";

    const originalUrl = new URL(url);
    const signedUrl = new URL(transformRequest(url, "Tile").url);

    // Host and pathname should still be the same
    expect(signedUrl.hostname).toStrictEqual(originalUrl.hostname);
    expect(signedUrl.pathname).toStrictEqual(originalUrl.pathname);

    const searchParams = signedUrl.searchParams;
    expect(searchParams.size).toStrictEqual(6);

    // Verify these search params exist on the signed url
    const expectedSearchParams = ["X-Amz-Algorithm", "X-Amz-Date", "X-Amz-SignedHeaders", "X-Amz-Signature"];
    expectedSearchParams.forEach((value) => {
      expect(searchParams.has(value)).toStrictEqual(true);
    });

    // We can expect the session token to match exactly as passed in
    const securityToken = searchParams.get("X-Amz-Security-Token");
    expect(securityToken).toStrictEqual(mockedCredentials.sessionToken);

    // Validate that the signing service name is "geo-maps" for standalone Maps SDK tile requests
    const credential = searchParams.get("X-Amz-Credential");
    const credentialParts = credential?.split("/");
    expect(credentialParts?.[0]).toStrictEqual(mockedCredentials.accessKeyId);
    expect(credentialParts?.[3]).toStrictEqual("geo-maps");
  });

  // For the standalone Maps SDK, the url should not be signed when accessing style descriptor, sprites, and glyphs
  it.each([["Style"], ["SpriteJSON"], ["Glyphs"]])(
    "getMapAuthenticationOptions should contain transformRequest function that doesn't sign the AWS Maps URLs for %i using our custom signer",
    async (resourceType) => {
      const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
      const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

      expect(transformRequest(standaloneMapsUrl, resourceType)).toStrictEqual({
        url: standaloneMapsUrl,
      });
    },
  );

  // For the consolidated Location SDK, the url should be signed when accessing all resources
  it.each([["Style"], ["SpriteJSON"], ["Glyphs"], ["Tile"]])(
    "getMapAuthenticationOptions should contain transformRequest function to sign the AWS Location URLs for %i using our custom signer",
    async (resourceType) => {
      const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
      const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

      const originalUrl = new URL(locationUrl);
      const signedUrl = new URL(transformRequest(locationUrl, resourceType).url);

      expect(signedUrl.hostname).toStrictEqual(originalUrl.hostname);
      expect(signedUrl.pathname).toStrictEqual(originalUrl.pathname);

      const searchParams = signedUrl.searchParams;
      expect(searchParams.size).toStrictEqual(6);

      const expectedSearchParams = ["X-Amz-Algorithm", "X-Amz-Date", "X-Amz-SignedHeaders", "X-Amz-Signature"];
      expectedSearchParams.forEach((value) => {
        expect(searchParams.has(value)).toStrictEqual(true);
      });

      const securityToken = searchParams.get("X-Amz-Security-Token");
      expect(securityToken).toStrictEqual(mockedCredentials.sessionToken);

      // Signing service name should be "geo" for consolidated Location SDK requests
      const credential = searchParams.get("X-Amz-Credential");
      const credentialParts = credential?.split("/");
      expect(credentialParts?.[0]).toStrictEqual(mockedCredentials.accessKeyId);
      expect(credentialParts?.[3]).toStrictEqual("geo");
    },
  );

  it("getMapAuthenticationOptions should contain transformRequest function to sign the AWS GovCloud Urls using our custom signer", async () => {
    const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
    const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;
    const originalUrl = new URL(govCloudUrl);
    const signedUrl = new URL(transformRequest(govCloudUrl).url);

    expect(signedUrl.hostname).toStrictEqual(originalUrl.hostname);
    expect(signedUrl.pathname).toStrictEqual(originalUrl.pathname);

    const searchParams = signedUrl.searchParams;
    expect(searchParams.size).toStrictEqual(6);

    const expectedSearchParams = ["X-Amz-Algorithm", "X-Amz-Date", "X-Amz-SignedHeaders", "X-Amz-Signature"];
    expectedSearchParams.forEach((value) => {
      expect(searchParams.has(value)).toStrictEqual(true);
    });

    const securityToken = searchParams.get("X-Amz-Security-Token");
    expect(securityToken).toStrictEqual(mockedCredentials.sessionToken);

    const credential = searchParams.get("X-Amz-Credential");
    expect(credential).toContain(mockedCredentials.accessKeyId);
  });

  // Dual-stack URLs for consolidated Location SDK
  it.each([["Style"], ["SpriteJSON"], ["Glyphs"], ["Tile"]])(
    "getMapAuthenticationOptions should contain transformRequest function to sign the AWS Location Dual-stack URLs for %i using our custom signer",
    async (resourceType) => {
      const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
      const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

      const originalUrl = new URL(dualStackUrl);
      const signedUrl = new URL(transformRequest(dualStackUrl, resourceType).url);

      expect(signedUrl.hostname).toStrictEqual(originalUrl.hostname);
      expect(signedUrl.pathname).toStrictEqual(originalUrl.pathname);

      const searchParams = signedUrl.searchParams;
      expect(searchParams.size).toStrictEqual(6);

      const expectedSearchParams = ["X-Amz-Algorithm", "X-Amz-Date", "X-Amz-SignedHeaders", "X-Amz-Signature"];
      expectedSearchParams.forEach((value) => {
        expect(searchParams.has(value)).toStrictEqual(true);
      });

      const securityToken = searchParams.get("X-Amz-Security-Token");
      expect(securityToken).toStrictEqual(mockedCredentials.sessionToken);

      const credential = searchParams.get("X-Amz-Credential");
      const credentialParts = credential?.split("/");
      expect(credentialParts?.[0]).toStrictEqual(mockedCredentials.accessKeyId);
      expect(credentialParts?.[3]).toStrictEqual("geo");
    },
  );

  // Dual-stack standalone Maps SDK - only tiles should be signed
  it("getMapAuthenticationOptions should contain transformRequest function to sign the AWS standalone Maps Dual-stack URLs for map tiles using our custom signer", async () => {
    const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
    const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

    const url = dualStackStandaloneMapsUrl + "/tiles";

    const originalUrl = new URL(url);
    const signedUrl = new URL(transformRequest(url, "Tile").url);

    expect(signedUrl.hostname).toStrictEqual(originalUrl.hostname);
    expect(signedUrl.pathname).toStrictEqual(originalUrl.pathname);

    const searchParams = signedUrl.searchParams;
    expect(searchParams.size).toStrictEqual(6);

    const expectedSearchParams = ["X-Amz-Algorithm", "X-Amz-Date", "X-Amz-SignedHeaders", "X-Amz-Signature"];
    expectedSearchParams.forEach((value) => {
      expect(searchParams.has(value)).toStrictEqual(true);
    });

    const securityToken = searchParams.get("X-Amz-Security-Token");
    expect(securityToken).toStrictEqual(mockedCredentials.sessionToken);

    const credential = searchParams.get("X-Amz-Credential");
    const credentialParts = credential?.split("/");
    expect(credentialParts?.[0]).toStrictEqual(mockedCredentials.accessKeyId);
    expect(credentialParts?.[3]).toStrictEqual("geo-maps");
  });

  // Dual-stack standalone Maps SDK - style descriptor, sprites, and glyphs should not be signed
  it.each([["Style"], ["SpriteJSON"], ["Glyphs"]])(
    "getMapAuthenticationOptions should contain transformRequest function that doesn't sign the AWS Maps Dual-stack URLs for %i using our custom signer",
    async (resourceType) => {
      const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
      const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

      expect(transformRequest(dualStackStandaloneMapsUrl, resourceType)).toStrictEqual({
        url: dualStackStandaloneMapsUrl,
      });
    },
  );

  it("getMapAuthenticationOptions transformRequest function should pass-through non AWS Urls unchanged", async () => {
    const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
    const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

    expect(transformRequest(nonAWSUrl)).toStrictEqual({
      url: nonAWSUrl,
    });
  });

  it("getMapAuthenticationOptions transformRequest function should pass-through AWS Urls that aren't for the Amazon Location Service unchanged", async () => {
    const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
    const transformRequest = authHelper.getMapAuthenticationOptions().transformRequest;

    expect(transformRequest(nonLocationAWSUrl)).toStrictEqual({
      url: nonLocationAWSUrl,
    });
  });

  it("getLocationClientConfig should provide the credentials provider", async () => {
    const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
    const locationClientConfig = authHelper.getLocationClientConfig();
    expect("signer" in locationClientConfig).toBe(false);

    expect("credentials" in locationClientConfig).toBe(true);
    if (locationClientConfig.credentials) {
      expect(await locationClientConfig.credentials()).toStrictEqual(mockedCredentials);
    }
  });

  it("getLocationClientConfig should provide the region", async () => {
    const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
    const locationClientConfig = authHelper.getLocationClientConfig();

    expect(locationClientConfig.region).toStrictEqual(region);
  });

  it("getClientConfig should provide the credentials provider", async () => {
    const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
    const clientConfig = authHelper.getClientConfig();
    expect("signer" in clientConfig).toBe(false);

    expect("credentials" in clientConfig).toBe(true);
    if (clientConfig.credentials) {
      expect(await clientConfig.credentials()).toStrictEqual(mockedCredentials);
    }
  });

  it("getClientConfig should provide the region", async () => {
    const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
    const clientConfig = authHelper.getClientConfig();

    expect(clientConfig.region).toStrictEqual(region);
  });

  it("getCredentials should return the credentials", async () => {
    const authHelper = await withCredentialProvider(mockedCredentialProvider, region);
    expect(authHelper.getCredentials()).toStrictEqual(mockedCredentials);
  });
});

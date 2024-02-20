// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { withAPIKey } from "./index";

describe("AuthHelper for APIKey", () => {
  const API_KEY = "api.key";
  it.each([
    [{}, { key: API_KEY }],
    [{ other: "value" }, { other: "value", key: API_KEY }],
    [null, { key: API_KEY }],
  ])("getLocationClientConfig should provide a signer to add api key to the query", async (query, expectedQuery) => {
    const authHelper = await withAPIKey(API_KEY);
    const signer = authHelper.getLocationClientConfig().signer;
    const request = {
      hostname: "amazonaws.com",
      path: "/",
      protocol: "https",
      method: "GET",
      headers: {},
    };
    expect(
      await signer.sign({
        ...request,
        query,
      }),
    ).toStrictEqual({
      ...request,
      query: expectedQuery,
    });
  });

  it("APIKey provided by getLocationClientConfig should be overridden by one set in the command", async () => {
    const authHelper = await withAPIKey(API_KEY);
    const signer = authHelper.getLocationClientConfig().signer;
    const request = {
      hostname: "amazonaws.com",
      path: "/",
      protocol: "https",
      method: "GET",
      headers: {},
      query: {
        key: "OTHER_KEY",
      },
    };
    expect(await signer.sign(request)).toStrictEqual(request);
  });

  it("should not provide stub getMapAuthenticationOptions function", async () => {
    const authHelper = await withAPIKey(API_KEY);
    expect("getMapAuthenticationOptions" in authHelper).toBe(false);
  });

  it("should not provide getCredentials function", async () => {
    const authHelper = await withAPIKey(API_KEY);
    expect("getCredentials" in authHelper).toBe(false);
  });

  it("should provide an empty `credentials` config value", async () => {
    const authHelper = await withAPIKey(API_KEY);
    expect(await authHelper.getLocationClientConfig().credentials()).toEqual({});
  });
});

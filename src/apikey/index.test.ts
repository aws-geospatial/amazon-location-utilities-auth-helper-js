// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { withAPIKey } from "./index";

describe("AuthHelper for Cognito", () => {
  it("should not provide stub getMapAuthenticationOptions function", async () => {
    const authHelper = await withAPIKey("api.key");
    expect("getMapAuthenticationOptions" in authHelper).toBe(false);
  });

  it("should not provide stub getLocationClientConfig function", async () => {
    const authHelper = await withAPIKey("api.key");
    expect(authHelper.getLocationClientConfig()).toStrictEqual({});
  });

  it("should not provide getCredentials function", async () => {
    const authHelper = await withAPIKey("api.key");
    expect("getCredentials" in authHelper).toBe(false);
  });
});

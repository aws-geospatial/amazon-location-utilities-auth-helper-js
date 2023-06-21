// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { withIdentityPoolId } from "./index";

describe("AuthHelper for Cognito", () => {
  it("should provide stub getMapAuthenticationOptions function", async () => {
    const authHelper = await withIdentityPoolId("identity-pool-id");
    expect(authHelper.getMapAuthenticationOptions()).toStrictEqual({});
  });

  it("should provide stub getLocationClientConfig function", async () => {
    const authHelper = await withIdentityPoolId("identity-pool-id");
    expect(authHelper.getLocationClientConfig()).toStrictEqual({});
  });

  it("should provide stub getCredentials function", async () => {
    const authHelper = await withIdentityPoolId("identity-pool-id");
    expect(authHelper.getCredentials()).toStrictEqual({
      accessKeyId: "",
      secretAccessKey: "",
      sessionToken: "",
    });
  });
});

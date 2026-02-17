import * as amazonLocationAuthHelper from ".";

describe("Exported functions", () => {
  it("Should export withAPIKey", () => {
    expect("withAPIKey" in amazonLocationAuthHelper).toBe(true);
  });

  it("Should export withIdentityPoolId", () => {
    expect("withIdentityPoolId" in amazonLocationAuthHelper).toBe(true);
  });

  it("Should export withCredentialProvider", () => {
    expect("withCredentialProvider" in amazonLocationAuthHelper).toBe(true);
  });
});

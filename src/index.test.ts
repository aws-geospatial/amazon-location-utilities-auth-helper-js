import * as amazonLocationAuthHelper from ".";

describe("Exported functions", () => {
  it("Should export withAPIKey", () => {
    expect("withAPIKey" in amazonLocationAuthHelper).toBe(true);
  });

  it("Should export withAPIKey", () => {
    expect("withIdentityPoolId" in amazonLocationAuthHelper).toBe(true);
  });
});

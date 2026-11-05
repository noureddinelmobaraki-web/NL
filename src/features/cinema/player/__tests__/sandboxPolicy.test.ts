import { describe, expect, it } from "vitest";
import { getIframeSandbox } from "../sandboxPolicy";

describe("sandboxPolicy (zero-sandbox enforcement)", () => {
  it("always returns undefined so embed servers never trigger 'Please Disable Sandbox'", () => {
    expect(getIframeSandbox({ id: "server-vl", capabilities: { timeEvents: true } })).toBeUndefined();
    expect(getIframeSandbox({ id: "server-7", capabilities: {} })).toBeUndefined();
    expect(getIframeSandbox(null)).toBeUndefined();
  });
});

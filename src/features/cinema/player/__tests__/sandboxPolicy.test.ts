import { beforeEach, describe, expect, it } from "vitest";
import { SANDBOX_STRICT } from "../../../../config/servers";
import {
  getIframeSandbox,
  getSandboxVerdict,
  markSandboxVerdict,
  SANDBOX_STORAGE_KEY,
} from "../sandboxPolicy";

const srv = { id: "server-vl", capabilities: { timeEvents: true, sandbox: SANDBOX_STRICT } };

describe("sandboxPolicy", () => {
  beforeEach(() => localStorage.removeItem(SANDBOX_STORAGE_KEY));
  it("returns strict tokens without allow-popups by default", () => {
    const sb = getIframeSandbox(srv);
    expect(sb).toBe(SANDBOX_STRICT);
    expect(sb).not.toMatch(/allow-popups|allow-top-navigation/);
  });
  it("drops sandbox after a refused verdict", () => {
    markSandboxVerdict("server-vl", "refused");
    expect(getSandboxVerdict("server-vl")).toBe("refused");
    expect(getIframeSandbox(srv)).toBeUndefined();
  });
  it("returns undefined for servers without sandbox capability", () => {
    expect(getIframeSandbox({ id: "x", capabilities: {} })).toBeUndefined();
  });
});

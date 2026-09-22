import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertReadonlyArgs, guardContext } from "../lib/kubectl.js";

describe("kubectl guard", () => {
  it("allows get", () => {
    assert.deepEqual(assertReadonlyArgs(["get", "pods"]), ["get", "pods"]);
  });
  it("blocks apply", () => {
    assert.throws(() => assertReadonlyArgs(["apply", "-f", "x"]), /not allowed|blocked/);
  });
  it("guards context allowlist", () => {
    assert.equal(guardContext("dev", ["dev"]), "dev");
    assert.throws(() => guardContext("prod", ["dev"]), /allowedContexts/);
  });
});

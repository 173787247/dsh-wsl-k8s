import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertReadonlyArgs, guardContext, clampTail, parseContextsTable } from "../lib/kubectl.js";

describe("kubectl guard", () => {
  it("allows get", () => {
    assert.deepEqual(assertReadonlyArgs(["get", "pods"]), ["get", "pods"]);
  });
  it("blocks apply", () => {
    assert.throws(() => assertReadonlyArgs(["apply", "-f", "x"]), /not allowed|blocked/);
  });
  it("allows config get-contexts", () => {
    assert.deepEqual(assertReadonlyArgs(["config", "get-contexts"]), ["config", "get-contexts"]);
  });
  it("guards context allowlist", () => {
    assert.equal(guardContext("dev", ["dev"]), "dev");
    assert.throws(() => guardContext("prod", ["dev"]), /allowedContexts/);
  });
  it("clamps log tail", () => {
    assert.equal(clampTail(9999, { maxTail: 500 }), 500);
    assert.equal(clampTail(undefined, { defaultTail: 80, maxTail: 500 }), 80);
    assert.equal(clampTail(10, { maxTail: 500 }), 10);
  });
  it("parses contexts table", () => {
    const text = `CURRENT   NAME   CLUSTER   AUTHINFO   NAMESPACE
*         dev    c-dev      u-dev      default
          prod   c-prod     u-prod     `;
    const rows = parseContextsTable(text);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].current, true);
    assert.equal(rows[0].name, "dev");
    assert.equal(rows[1].name, "prod");
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import { verifyExamples } from "../../../scripts/verify-examples.mjs";

test("所有批量示例可经真实 CLI dry-run，且不创建工程", async () => {
  const result = await verifyExamples();
  assert.ok(result.examples >= 8);
  assert.ok(result.applicationPlans >= result.examples);
  assert.equal(result.actualBuilds, 0);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyKnowledgeMutation,
  decideKnowledgeMutation,
  shellReferencesKnowledge,
} from "../knowledge-write-policy.mjs";
import { registerKnowledgeWriteGate } from "../knowledge-write-gate.mjs";

const cwd = "/tmp/agenticlab-gate-fixture";

function makePi() {
  const handlers = new Map();
  return {
    pi: {
      on(eventName, callback) {
        handlers.set(eventName, callback);
      },
    },
    call(event, ctx) {
      const handler = handlers.get("tool_call");
      assert.ok(handler, "gate registered its tool_call handler");
      return handler(event, ctx);
    },
    callUserBash(event, ctx) {
      const handler = handlers.get("user_bash");
      assert.ok(handler, "gate registered its user_bash handler");
      return handler(event, ctx);
    },
  };
}

test("file writes to project knowledge require confirmation", () => {
  const request = classifyKnowledgeMutation("write", {
    path: "AgenticLab/knowledge/decisions/date-format.md",
    content: "Synthetic fixture only",
  }, cwd);
  assert.equal(request?.kind, "file-tool");
  assert.equal(request?.target, `${cwd}/AgenticLab/knowledge/decisions/date-format.md`);
  assert.match(request?.preview, /Synthetic fixture only/);
});

test("current Pi edits[] input produces a before-and-after preview", () => {
  const request = classifyKnowledgeMutation("edit", {
    path: "AgenticLab/knowledge/INDEX.md",
    edits: [{ oldText: "No records yet", newText: "One record listed" }],
  }, cwd);
  assert.match(request?.preview, /--- existing text ---\nNo records yet/);
  assert.match(request?.preview, /\+\+\+ proposed text \+\+\+\nOne record listed/);
});

test("writes outside project knowledge and path traversal are not classified as memory writes", () => {
  assert.equal(classifyKnowledgeMutation("write", { path: "src/controller.py" }, cwd), null);
  assert.equal(
    classifyKnowledgeMutation("edit", { path: "AgenticLab/knowledge/../../src/controller.py" }, cwd),
    null,
  );
});

test("read-only active knowledge shell access is allowed; pending and policy paths are blocked", async () => {
  const activeRead = "find AgenticLab/knowledge -maxdepth 2 -type f";
  assert.equal(await shellReferencesKnowledge(cwd, activeRead), false);
  assert.equal(classifyKnowledgeMutation("bash", { command: activeRead }, cwd), null);

  const activeWrite = "rm AgenticLab/knowledge/example.md";
  assert.equal(await shellReferencesKnowledge(cwd, activeWrite), true);

  const pendingRead = "cat AgenticLab/knowledge-pending/batch-x/bundle.json";
  assert.equal(await shellReferencesKnowledge(cwd, pendingRead), true);

  const policyRead = "cat AgenticLab/knowledge-capture-policy.json";
  assert.equal(await shellReferencesKnowledge(cwd, policyRead), true);
});

test("unrelated tools and shell commands pass without a confirmation prompt", () => {
  assert.equal(classifyKnowledgeMutation("read", { path: "AgenticLab/knowledge/INDEX.md" }, cwd), null);
  assert.equal(classifyKnowledgeMutation("bash", { command: "python -m unittest" }, cwd), null);
  assert.deepEqual(decideKnowledgeMutation(null, false, false), { allow: true });
});

test("approval decision fails closed without UI or after rejection", () => {
  const request = classifyKnowledgeMutation("write", { path: "AgenticLab/knowledge/INDEX.md" }, cwd);
  assert.equal(decideKnowledgeMutation(request, false, false).allow, false);
  assert.equal(decideKnowledgeMutation(request, true, false).allow, false);
  assert.equal(decideKnowledgeMutation(request, true, true).allow, true);
});

test("Pi handler blocks knowledge writes without UI", async () => {
  const mock = makePi();
  registerKnowledgeWriteGate(mock.pi);
  const result = await mock.call(
    { toolName: "write", input: { path: "AgenticLab/knowledge/INDEX.md", content: "fixture" } },
    { cwd, hasUI: false },
  );
  assert.equal(result?.block, true);
  assert.match(result?.reason, /interactive user confirmation/);
});

test("Pi handler asks and blocks when the user rejects", async () => {
  const mock = makePi();
  let shown = "";
  registerKnowledgeWriteGate(mock.pi);
  const result = await mock.call(
    {
      toolName: "edit",
      input: {
        path: "AgenticLab/knowledge/INDEX.md",
        edits: [{ oldText: "old fixture", newText: "new fixture" }],
      },
    },
    {
      cwd,
      hasUI: true,
      ui: { async confirm(title, message) { shown = `${title}\n${message}`; return false; } },
    },
  );
  assert.equal(result?.block, true);
  assert.match(shown, /AgenticLab\/knowledge\/INDEX\.md/);
  assert.match(shown, /old fixture/);
  assert.match(shown, /new fixture/);
});

test("Pi handler blocks a knowledge edit if it cannot build a preview", async () => {
  const mock = makePi();
  let confirmationRequested = false;
  registerKnowledgeWriteGate(mock.pi);
  const result = await mock.call(
    { toolName: "edit", input: { path: "AgenticLab/knowledge/INDEX.md", edits: [{ unexpected: "shape" }] } },
    {
      cwd,
      hasUI: true,
      ui: { async confirm() { confirmationRequested = true; return true; } },
    },
  );
  assert.equal(result?.block, true);
  assert.equal(confirmationRequested, false);
  assert.match(result?.reason, /reviewable preview could not be built/);
});

test("Pi handler blocks shell access to pending without a misleading approval prompt", async () => {
  const mock = makePi();
  let confirmationRequested = false;
  registerKnowledgeWriteGate(mock.pi);
  const result = await mock.call(
    { toolName: "bash", input: { command: "cat AgenticLab/knowledge-pending/batch-x/bundle.json" } },
    { cwd, hasUI: true, ui: { async confirm() { confirmationRequested = true; return true; } } },
  );
  assert.equal(result?.block, true);
  assert.equal(confirmationRequested, false);
  assert.match(result?.reason, /private pending queue/u);
});

test("Pi handler blocks if confirmation UI fails", async () => {
  const mock = makePi();
  registerKnowledgeWriteGate(mock.pi);
  const result = await mock.call(
    { toolName: "write", input: { path: "AgenticLab/knowledge/INDEX.md", content: "fixture" } },
    { cwd, hasUI: true, ui: { async confirm() { throw new Error("UI unavailable"); } } },
  );
  assert.equal(result?.block, true);
  assert.match(result?.reason, /confirmation was unavailable/);
});

test("Pi handler allows a confirmed knowledge change", async () => {
  const mock = makePi();
  registerKnowledgeWriteGate(mock.pi);
  const result = await mock.call(
    { toolName: "write", input: { path: "AgenticLab/knowledge/INDEX.md", content: "fixture" } },
    { cwd, hasUI: true, ui: { async confirm() { return true; } } },
  );
  assert.equal(result, undefined);
});

test("Pi user_bash hook blocks private pending and policy paths", async () => {
  const mock = makePi();
  registerKnowledgeWriteGate(mock.pi);
  const result = await mock.callUserBash(
    { command: "cat AgenticLab/knowledge-pending/batch-x/bundle.json" },
    { cwd },
  );
  assert.equal(result.result.exitCode, 126);
});

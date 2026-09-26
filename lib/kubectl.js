import { spawn } from "node:child_process";

const WRITE_VERBS = new Set([
  "apply",
  "create",
  "delete",
  "edit",
  "patch",
  "replace",
  "scale",
  "rollout",
  "exec",
  "cp",
  "run",
  "expose",
  "annotate",
  "label",
  "taint",
  "cordon",
  "drain",
  "uncordon",
]);

export function assertReadonlyArgs(args) {
  const list = Array.isArray(args) ? args.map(String) : [];
  if (!list.length) throw new Error("kubectl args required");
  // allow: get, describe, logs, top, api-resources, version, cluster-info, config view/get-contexts/current-context
  const allowed = new Set([
    "get",
    "describe",
    "logs",
    "top",
    "api-resources",
    "api-versions",
    "version",
    "cluster-info",
    "explain",
    "auth",
    "config",
  ]);
  if (!allowed.has(list[0])) throw new Error(`kubectl verb not allowed: ${list[0]} (read-only plugin)`);
  if (WRITE_VERBS.has(list[0])) throw new Error("write verb blocked");
  if (list[0] === "config") {
    const sub = list[1] || "";
    const okSub = new Set(["view", "get-contexts", "current-context", "get-clusters"]);
    if (!okSub.has(sub)) throw new Error(`kubectl config subcommand not allowed: ${sub}`);
  }
  if (list[0] === "auth" && list[1] !== "can-i") throw new Error("only kubectl auth can-i allowed");
  for (const a of list) {
    if (a === "--raw" || a.startsWith("--raw=")) throw new Error("--raw blocked");
  }
  return list;
}

export function clampTail(tail, { defaultTail = 100, maxTail = 500 } = {}) {
  const max = Math.min(2000, Math.max(1, Number(maxTail) || 500));
  const d = Math.min(max, Math.max(1, Number(defaultTail) || 100));
  const n = Number(tail);
  if (!Number.isFinite(n) || n <= 0) return d;
  return Math.min(max, Math.max(1, Math.floor(n)));
}

export function runKubectl(args, { timeoutMs = 30_000, maxOutputChars = 40_000, context } = {}) {
  const finalArgs = [...args];
  if (context) finalArgs.unshift("--context", String(context));
  return new Promise((resolve, reject) => {
    const child = spawn("kubectl", finalArgs, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("kubectl timeout"));
    }, timeoutMs);
    child.stdout.on("data", (d) => {
      stdout += d;
      if (stdout.length > maxOutputChars * 2) child.kill("SIGKILL");
    });
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      clearTimeout(t);
      resolve({
        code,
        stdout: stdout.slice(0, maxOutputChars),
        stderr: stderr.slice(0, 4000),
        truncated: stdout.length > maxOutputChars,
      });
    });
    child.on("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export function guardContext(context, allowedContexts = []) {
  const c = String(context || "").trim();
  if (!c) return undefined;
  if (allowedContexts.length && !allowedContexts.includes(c)) {
    throw new Error(`context not in allowedContexts: ${c}`);
  }
  return c;
}

export function parseContextsTable(text) {
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(Boolean);
  if (!lines.length) return [];
  // kubectl config get-contexts: CURRENT NAME CLUSTER AUTHINFO NAMESPACE
  const rows = [];
  for (const line of lines.slice(1)) {
    const parts = line.trim().split(/\s+/);
    if (!parts.length) continue;
    let current = false;
    let rest = parts;
    if (parts[0] === "*") {
      current = true;
      rest = parts.slice(1);
    }
    if (!rest[0]) continue;
    rows.push({
      current,
      name: rest[0],
      cluster: rest[1] || null,
      authInfo: rest[2] || null,
      namespace: rest[3] || null,
    });
  }
  return rows;
}

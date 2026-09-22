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
  const verb = list[0].replace(/^-*/, "");
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
  // block --force --overwrite etc already N/A for get
  for (const a of list) {
    if (a === "--raw" || a.startsWith("--raw=")) throw new Error("--raw blocked");
  }
  return list;
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

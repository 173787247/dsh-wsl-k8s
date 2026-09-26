import { assertReadonlyArgs, runKubectl, guardContext, clampTail, parseContextsTable } from "./lib/kubectl.js";

export const name = "dsh-wsl-k8s";
export const inject = ["tools", "systemPrompt"];

export function apply(ctx, config = {}) {
  if (config.enabled === false) {
    console.log("[dsh-wsl-k8s] disabled");
    return;
  }
  const timeoutMs = positive(config.timeoutMs, 30_000);
  const maxOutputChars = positive(config.maxOutputChars, 40_000);
  const maxTail = positive(config.maxTail, 500);
  const defaultTail = positive(config.defaultTail, 100);
  const allowedContexts = Array.isArray(config.allowedContexts) ? config.allowedContexts.map(String) : [];
  console.log(`[dsh-wsl-k8s] read-only kubectl allowedContexts=${allowedContexts.length || "any"} maxTail=${maxTail}`);

  ctx.systemPrompt.section({
    name: "tool:k8s",
    order: 132,
    text: "dsh-wsl-k8s exposes read-only kubectl (contexts/get/describe/logs/top/config view). It cannot apply/delete/exec. Prefer k8s_contexts then k8s_get. k8s_logs tail is capped. Set allowedContexts in config for production clusters.",
  });

  ctx.tools.register({
    name: "k8s_status",
    description: "kubectl client/server reachability, current context, and context count (read-only).",
    parameters: { type: "object", additionalProperties: false, properties: {} },
    output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: JSON.stringify(v, null, 2) }] },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute() {
      try {
        const ver = await runKubectl(["version", "--client=true", "-o", "yaml"], { timeoutMs, maxOutputChars });
        const ctxOut = await runKubectl(["config", "current-context"], { timeoutMs, maxOutputChars });
        const listOut = await runKubectl(["config", "get-contexts"], { timeoutMs, maxOutputChars });
        const contexts = parseContextsTable(listOut.stdout);
        let server = null;
        try {
          const srv = await runKubectl(["version", "-o", "yaml"], { timeoutMs: Math.min(timeoutMs, 15_000), maxOutputChars: 8_000 });
          if (srv.code === 0) server = "reachable";
          else server = { ok: false, stderr: (srv.stderr || "").slice(0, 200) };
        } catch (e) {
          server = { ok: false, error: e instanceof Error ? e.message : String(e) };
        }
        return {
          ok: true,
          client: ver.stdout.trim().slice(0, 4000),
          currentContext: ctxOut.code === 0 ? ctxOut.stdout.trim() : null,
          contextCount: contexts.length,
          allowedContexts,
          maxTail,
          defaultTail,
          server,
        };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "k8s status" }),
    presentResult: (_a, r) => ({ card: "generic", title: "k8s status", content: r.content }),
  });

  ctx.tools.register({
    name: "k8s_contexts",
    description: "List kubectl contexts (name/cluster/current). Honors allowedContexts filter when set.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
    output: {
      schema: { type: "object", additionalProperties: true },
      render: (_a, v) => [
        {
          type: "text",
          text:
            v.ok === false
              ? v.error
              : (v.contexts || [])
                  .map((c) => `${c.current ? "*" : " "} ${c.name}\tcluster=${c.cluster || "-"}\tns=${c.namespace || "-"}`)
                  .join("\n") || "(none)",
        },
      ],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute() {
      try {
        assertReadonlyArgs(["config", "get-contexts"]);
        const out = await runKubectl(["config", "get-contexts"], { timeoutMs, maxOutputChars });
        if (out.code !== 0) throw new Error(out.stderr || `exit ${out.code}`);
        let contexts = parseContextsTable(out.stdout);
        if (allowedContexts.length) {
          contexts = contexts.filter((c) => allowedContexts.includes(c.name));
        }
        return {
          ok: true,
          count: contexts.length,
          current: contexts.find((c) => c.current)?.name || null,
          contexts: contexts.slice(0, 100),
        };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "k8s contexts" }),
    presentResult: (_a, r) => ({ card: "generic", title: "k8s contexts", content: r.content }),
  });

  ctx.tools.register({
    name: "k8s_get",
    description: "kubectl get RESOURCE (read-only). Optional namespace and context.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["resource"],
      properties: {
        resource: { type: "string", description: "e.g. pods, deploy, svc/my-svc" },
        namespace: { type: "string" },
        context: { type: "string" },
        output: { type: "string", description: "wide|yaml|json|name (default wide)" },
      },
    },
    output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: v.ok === false ? v.error : v.stdout || "" }] },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      try {
        const context = guardContext(args.context, allowedContexts);
        const a = ["get", String(args.resource)];
        if (args.namespace) a.push("-n", String(args.namespace));
        a.push("-o", String(args.output || "wide"));
        assertReadonlyArgs(a);
        const out = await runKubectl(a, { timeoutMs, maxOutputChars, context });
        return { ok: out.code === 0, ...out };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "k8s get" }),
    presentResult: (_a, r) => ({ card: "generic", title: "k8s get", content: r.content }),
  });

  ctx.tools.register({
    name: "k8s_describe",
    description: "kubectl describe RESOURCE NAME (read-only).",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["resource", "name"],
      properties: {
        resource: { type: "string" },
        name: { type: "string" },
        namespace: { type: "string" },
        context: { type: "string" },
      },
    },
    output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: v.ok === false ? v.error : v.stdout || "" }] },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      try {
        const context = guardContext(args.context, allowedContexts);
        const a = ["describe", String(args.resource), String(args.name)];
        if (args.namespace) a.push("-n", String(args.namespace));
        assertReadonlyArgs(a);
        const out = await runKubectl(a, { timeoutMs, maxOutputChars, context });
        return { ok: out.code === 0, ...out };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "k8s describe" }),
    presentResult: (_a, r) => ({ card: "generic", title: "k8s describe", content: r.content }),
  });

  ctx.tools.register({
    name: "k8s_logs",
    description: "kubectl logs POD (tail capped by config.maxTail, default 500). Read-only.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["pod"],
      properties: {
        pod: { type: "string" },
        namespace: { type: "string" },
        container: { type: "string" },
        tail: { type: "number", description: `Lines from end (default ${defaultTail}, max ${maxTail})` },
        context: { type: "string" },
      },
    },
    output: { schema: { type: "object", additionalProperties: true }, render: (_a, v) => [{ type: "text", text: v.ok === false ? v.error : v.stdout || "" }] },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      try {
        const context = guardContext(args.context, allowedContexts);
        const tail = clampTail(args.tail, { defaultTail, maxTail });
        const a = ["logs", String(args.pod), `--tail=${tail}`];
        if (args.namespace) a.push("-n", String(args.namespace));
        if (args.container) a.push("-c", String(args.container));
        assertReadonlyArgs(a);
        const out = await runKubectl(a, { timeoutMs, maxOutputChars, context });
        return { ok: out.code === 0, tail, ...out };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    presentCall: () => ({ card: "generic", title: "k8s logs" }),
    presentResult: (_a, r) => ({ card: "generic", title: "k8s logs", content: r.content }),
  });
}

function positive(v, fb) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fb;
}

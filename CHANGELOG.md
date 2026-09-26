# Changelog

## 0.1.1

- `k8s_contexts`: list contexts (name/cluster/current); honors `allowedContexts`.
- Richer `k8s_status`: context count + server reachability probe.
- `k8s_logs`: configurable `maxTail` / `defaultTail` clamp (default max 500).

## 0.1.0

- Read-only `k8s_status`, `k8s_get`, `k8s_describe`, `k8s_logs`.

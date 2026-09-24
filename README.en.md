# dsh-wsl-k8s

> **Languages:** [中文（首页）](./README.md) · **English** (this file)

Read-only **kubectl** tools for dsh on WSL: get / describe / logs. No apply / delete / exec / port-forward.

## Quick start

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-k8s
# kubectl must already talk to your cluster (kubeconfig)
```

## Tools

| Tool | Role |
|------|------|
| `k8s_status` | kubectl on PATH + current context |
| `k8s_get` | `kubectl get` (truncated) |
| `k8s_describe` | `kubectl describe` (truncated) |
| `k8s_logs` | Pod logs (truncated) |

## Config

```yaml
config:
  enabled: true
  timeoutMs: 30000
  maxChars: 8000
  allowedContexts: []      # empty = any context; still read-only
```

Optional `allowedContexts: [dev]` — empty means no context filter (commands remain read-only).

## Compatibility

| Field | Value |
|-------|-------|
| **Plugin** | `dsh-wsl-k8s` **0.1.0** |
| **Minimum dsh** | ≥ **0.1.2** (web UI one-shot `?token=` on Windows relay `:3081`) |
| **Latest verified** | See [dsh-wsl-kit Compatibility](https://github.com/173787247/dsh-wsl-kit#compatibility-2026-09) (currently **`0.1.7-alpha.2`**) — single source of truth for the suite |
| **Kit set** | optional (not in `install.sh` / `KIT_SET=daily` by default) |

## License

MIT

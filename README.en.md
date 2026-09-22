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

## License

MIT

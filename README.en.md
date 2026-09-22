# dsh-wsl-k8s

> **Languages:** [中文（首页）](./README.md) · **English** (this file)

Read-only **kubectl** tools for dsh on WSL: get / describe / logs. No apply/delete/exec.

## Install

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-k8s
```

## Tools

| Tool | Role |
|------|------|
| `k8s_status` | kubectl + current context |
| `k8s_get` | `kubectl get` |
| `k8s_describe` | `kubectl describe` |
| `k8s_logs` | Pod logs (truncated) |

Optional config `allowedContexts: [dev]` — empty means no context filter (still read-only).

## License

MIT

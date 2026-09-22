# dsh-wsl-k8s

> **语言：** **中文**（本页） · [English](./README.en.md)

只读 **kubectl** 工具：`k8s_get` / `k8s_describe` / `k8s_logs`。

**不能** apply / delete / exec / port-forward。适合排障看状态，不改集群。

## 最短上手

```sh
# kubectl 已配置好 kubeconfig
dsh plugin --profile web add github:173787247/dsh-wsl-k8s
```

## 工具

| 工具 | 作用 |
|------|------|
| `k8s_status` | kubectl 是否可用、当前 context |
| `k8s_get` | `kubectl get`（输出有长度上限） |
| `k8s_describe` | `kubectl describe` |
| `k8s_logs` | Pod 日志（截断） |

## 配置

```yaml
config:
  enabled: true
  timeoutMs: 30000
  maxOutputChars: 40000
  # 非空时只允许这些 context；空 = 不限制（仍只读）
  allowedContexts: []
  # 例: allowedContexts: [dev, staging]
```

生产集群建议显式写 `allowedContexts`，并保证 kubeconfig 本身权限最小。

## License

MIT

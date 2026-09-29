# Kubernetes

> 基于 Kubernetes 1.31/1.32（2025-2026 时点）。K8s 是容器编排的事实标准，运维日常的核心对象。

## 核心概念

### 架构

```
┌─────────────────────────────────────────────────┐
│                  Control Plane                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ API Server│ │ Scheduler│ │ Controller Mgr   │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────────────────────────────────────┐   │
│  │              etcd (状态存储)               │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
         │                    │
┌────────┴──────┐    ┌────────┴──────┐
│   Node 1      │    │   Node 2      │
│  ┌─────────┐  │    │  ┌─────────┐  │
│  │ kubelet │  │    │  │ kubelet │  │
│  │ kube-   │  │    │  │ kube-   │  │
│  │ proxy   │  │    │  │ proxy   │  │
│  │ Pods... │  │    │  │ Pods... │  │
│  └─────────┘  │    │  └─────────┘  │
└───────────────┘    └───────────────┘
```

+ **Control Plane**：集群大脑，负责调度、决策、状态存储
+ **Node**：工作机器（物理机/虚拟机），跑容器
+ **etcd**：分布式 KV 存储，保存集群所有状态

### 核心对象

| 对象 | 作用 | 类比 |
|------|------|------|
| **Pod** | 最小调度单元，一个或多个容器共享网络和存储 | 进程组 |
| **Deployment** | 管理无状态 Pod 的副本数和滚动更新 | 进程管理器 |
| **StatefulSet** | 管理有状态应用（数据库等），有序部署/伸缩 | 有序进程组 |
| **Service** | 为一组 Pod 提供稳定访问入口（负载均衡） | 反向代理 |
| **Ingress** | 外部流量路由到集群内部服务（HTTP/HTTPS 层） | 网关 |
| **ConfigMap** | 非敏感配置存储 | 配置文件 |
| **Secret** | 敏感配置存储（base64 编码） | 密钥管理 |
| **Namespace** | 资源隔离和权限边界 | 虚拟集群 |
| **PV/PVC** | 持久化存储声明 | 存储卷 |
| **DaemonSet** | 每个 Node 跑一个 Pod（日志/监控 agent） | 守护进程 |
| **Job/CronJob** | 一次性/定时任务 | cron |

### Pod 生命周期

```
Pending → Running → Succeeded/Failed
              ↓
         CrashLoopBackOff（崩溃重启循环）
              ↓
         ImagePullBackOff（镜像拉取失败）
```

常用排查命令：

```bash
kubectl get pods -n <namespace>                    # 查看 Pod 状态
kubectl describe pod <pod> -n <namespace>           # 查看事件和详情
kubectl logs <pod> -n <namespace> --tail=100 -f    # 查看日志
kubectl logs <pod> -c <container>                  # 多容器 Pod 指定容器
kubectl exec -it <pod> -n <namespace> -- /bin/sh   # 进入容器
kubectl top pod -n <namespace>                     # 资源用量（需 metrics-server）
```

## 工作负载管理

### Deployment 滚动更新

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # 更新时最多多出 1 个 Pod
      maxUnavailable: 0  # 更新时最少可用 Pod 数
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:v1.2.0
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          readinessProbe:   # 就绪探针：通过才接流量
            httpGet:
              path: /health
              port: 8080
          livenessProbe:    # 存活探针：失败则重启
            httpGet:
              path: /health
              port: 8080
```

```bash
kubectl apply -f deployment.yaml
kubectl rollout status deployment/my-app     # 查看更新进度
kubectl rollout history deployment/my-app    # 查看历史版本
kubectl rollout undo deployment/my-app       # 回滚到上一版本
kubectl rollout undo --to-revision=2         # 回滚到指定版本
```

### HPA（水平自动伸缩）

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## 服务发现与流量

### Service 类型

| 类型 | 用途 | 场景 |
|------|------|------|
| **ClusterIP** | 集群内部访问（默认） | 后端服务间调用 |
| **NodePort** | 每个 Node 开端口暴露 | 开发测试 |
| **LoadBalancer** | 云厂商 LB 暴露 | 生产外部访问 |
| **ExternalName** | DNS CNAME 映射 | 引用外部服务 |

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
spec:
  type: ClusterIP
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

### Ingress（HTTP 路由）

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-svc
                port:
                  number: 80
```

## 配置与存储

### ConfigMap 与 Secret

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: production
  LOG_LEVEL: info
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
data:
  DB_PASSWORD: cGFzc3dvcmQxMjM=  # base64 编码
```

Pod 中引用：

```yaml
env:
  - name: APP_ENV
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: APP_ENV
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: app-secret
        key: DB_PASSWORD
```

### 持久化存储

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 10Gi
```

## 运维日常

### 资源排查

```bash
# 节点状态
kubectl get nodes -o wide
kubectl describe node <node>

# 资源使用
kubectl top nodes
kubectl top pods -A --sort-by=memory

# 事件（最近发生的异常）
kubectl get events -A --sort-by='.lastTimestamp'

# 查看 Pod 为什么 Pending
kubectl describe pod <pod> -n <ns>
# 常见原因：资源不足、PVC 未绑定、镜像拉取失败、节点选择器不匹配
```

### 网络排查

```bash
# 进入 Pod 测试网络
kubectl exec -it <pod> -- curl http://my-app-svc:80/health
kubectl exec -it <pod> -- nslookup my-app-svc

# 查看 Service 和 Endpoints
kubectl get svc -n <ns>
kubectl get endpoints -n <ns>

# Ingress 控制器日志
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller --tail=100
```

### 安全：RBAC

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
  - kind: ServiceAccount
    name: my-sa
    namespace: default
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

## 版本动态（1.31/1.32）

+ **Sidecar 容器 GA**（1.32）— `initContainers` + `restartPolicy: Always` 正式稳定，服务网格 sidecar 生命周期管理更可靠
+ **In-Place Pod Vertical Scaling**（1.32 beta）— 不重启 Pod 调整 CPU/内存
+ **In-Tree 云厂商移除**（1.32）— AWS/Azure/GCP 云厂商代码移除，必须用外部 CCM
+ **AppArmor GA**（1.31）— 容器安全策略
+ **Structured Auth Config**（1.32 GA）— API Server 认证配置结构化

## 参考

+ [Kubernetes 官方文档](https://kubernetes.io/docs/)
+ [Kubernetes API 参考](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.31/)
+ 本站：[Rancher 管理平台](/notes/ops/rancher) · [监控栈](/notes/ops/monitoring) · [Docker](/notes/ops/docker)

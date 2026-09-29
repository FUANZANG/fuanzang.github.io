# Rancher 管理平台

> 基于 Rancher v2.15（2026-09 时点）。Rancher 是 SUSE 旗下的 Kubernetes 集群管理平台，解决"多集群怎么管"的问题。

## 解决什么问题

原生 K8s 的痛点：

+ 多集群管理困难（每个集群一套 kubeconfig）
+ 统一认证/权限难做
+ 监控/日志/告警分散
+ 应用部署和升级靠手写 YAML

Rancher 的定位：**K8s 之上的 K8s 管理层**，一个控制台管所有集群。

## 核心能力

```
┌──────────────────────────────────────────────┐
│              Rancher Server                   │
│  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ 统一认证 │ │ 集群管理  │ │ 监控/日志/告警 │  │
│  │ (RBAC)  │ │ (RKE/K3s)│ │ (Prometheus)  │  │
│  └─────────┘ └──────────┘ └───────────────┘  │
│  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ App     │ │ Fleet    │ │ CIS 安全扫描   │  │
│  │ Catalog │ │ (GitOps) │ │               │  │
│  └─────────┘ └──────────┘ └───────────────┘  │
└──────────────────────────────────────────────┘
         │              │              │
    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
    │ Cluster │    │ Cluster │    │ Cluster │
    │  (RKE)  │    │  (EKS)  │    │ (K3s)   │
    └─────────┘    └─────────┘    └─────────┘
```

### 1. 多集群统一管理

+ **导入现有集群** — 任何 K8s 集群（自建/云托管）都能导入
+ **RKE/RKE2** — Rancher 自己的 K8s 发行版，一键创建集群
+ **K3s** — 轻量级 K8s，适合边缘/IoT 场景
+ **云托管集群** — 直接管理 EKS/GKE/AKS

### 2. 统一认证与 RBAC

+ 对接 LDAP/AD/OIDC/SAML 等身份源
+ 集群级别、项目级别、命名空间级别的权限控制
+ 一个账号管所有集群，不需要切换 kubeconfig

### 3. 内置监控栈

+ **Prometheus** — 指标采集
+ **Grafana** — 可视化面板
+ **Alertmanager** — 告警路由
+ 开箱即用，不需要手动搭建

### 4. Fleet（GitOps 持续交付）

+ 从 Git 仓库自动部署应用到多个集群
+ 支持 Bundle/Helm/Kustomize 等多种方式
+ 适合边缘场景（成百上千个集群统一发版）

### 5. App Catalog

+ Helm Chart 仓库管理
+ 一键部署常见应用（Redis、MySQL、Nginx 等）
+ 支持私有 Chart 仓库

### 6. CIS 安全扫描

+ 自动扫描集群安全配置
+ 对照 CIS Kubernetes Benchmark 生成报告
+ 发现不安全的配置（如特权容器、缺失 NetworkPolicy）

## 安装部署

### 单节点安装（开发/测试）

```bash
docker run -d --restart=unless-stopped \
  -p 80:80 -p 443:443 \
  --privileged \
  rancher/rancher:latest
```

访问 `https://<server-ip>`，按引导设置管理员密码。

### HA 安装（生产）

```bash
# 用 Helm 安装到 K8s 集群
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set replicas=3 \
  --set bootstrapPassword=admin
```

生产要求：

+ 至少 3 个节点（etcd 奇数）
+ 外部数据库（PostgreSQL/MySQL）或内置 etcd
+ 负载均衡器（Nginx/HAProxy/云 LB）
+ TLS 证书

## 日常操作

### 创建集群

1. **RKE2 自建** — Rancher UI → Cluster Management → Create → RKE2/K3s → 自定义节点
2. **导入现有** — 在目标集群执行 Rancher 生成的 `kubectl apply` 命令
3. **云托管** — 对接 AWS/GCP/Azure 凭证，自动创建 EKS/GKE/AKS

### 项目与命名空间

Rancher 的 **Project** 是 K8s Namespace 之上的逻辑分组：

```
Cluster
├── Project A（团队 A）
│   ├── Namespace: app-a-prod
│   ├── Namespace: app-a-staging
│   └── 成员: user1, user2
├── Project B（团队 B）
│   ├── Namespace: app-b-prod
│   └── 成员: user3
```

### 应用部署

```yaml
# Rancher 也支持原生 K8s YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: app-a-prod
spec:
  replicas: 2
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
          image: registry.example.com/my-app:v1.0
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: app-a-prod
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

Rancher UI 中：Cluster → Project → Workloads → Deploy → 粘贴 YAML。

### 监控面板

Rancher 内置 Grafana 面板：

+ **Cluster Dashboard** — 节点 CPU/内存/磁盘/网络
+ **Workload Dashboard** — Pod 资源使用、重启次数
+ **Etcd Dashboard** — etcd 延迟、DB 大小、leader 切换
+ **Node Dashboard** — 单节点详细指标

### 日志

Rancher 支持多种日志方案：

| 方案 | 特点 |
|------|------|
| **内置 Fluentd** | 轻量，适合小集群 |
| **Elasticsearch** | 全文检索，适合大规模 |
| **Loki** | 轻量，和 Prometheus 集成好 |
| **Splunk** | 企业级，功能全面 |

## 与原生 K8s 的关系

| 维度 | 原生 K8s | Rancher |
|------|----------|---------|
| 多集群管理 | 每集群一套 kubeconfig | 一个控制台管所有 |
| 认证 | 每集群单独配 RBAC | 统一认证源 |
| 监控 | 手动搭建 Prometheus | 内置 Prometheus + Grafana |
| 应用部署 | kubectl/Helm | UI + kubectl + Fleet |
| 安全扫描 | 手动跑 kube-bench | 内置 CIS 扫描 |
| 学习曲线 | 陡峭 | 中等（UI 降低门槛） |

## 常见坑

+ **Rancher Server 不要跑在它管理的集群里** — 鸡蛋问题，建议独立集群或外部安装
+ **K3s 不适合大规模生产** — 单节点 etcd，适合边缘/开发
+ **升级 Rancher 前先备份** — etcd 快照 + Rancher Server 备份
+ **Fleet 的 GitRepo 资源要设 finalizer** — 否则删除时残留
+ **监控数据保留时间** — 默认 24h，生产建议调长或接外部存储

## 参考

+ [Rancher 官方文档](https://ranchermanager.docs.rancher.com/)
+ [RKE2 文档](https://docs.rke2.io/)
+ [K3s 文档](https://docs.k3s.io/)
+ [Fleet 文档](https://fleet.rancher.io/)
+ 本站：[Kubernetes](/notes/ops/kubernetes) · [监控栈](/notes/ops/monitoring) · [Docker](/notes/ops/docker)

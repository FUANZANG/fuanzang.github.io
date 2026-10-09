# 监控栈（Prometheus / Grafana / ELK）

> 2026-09 时点。监控是运维的眼睛，三大支柱：Metrics（指标）、Tracing（链路）、Logging（日志）。

## 全景

```
┌───────────────────────────────────────────────────────────┐
│                         可视化层                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │    Grafana    │  │    Kibana     │  │    Jaeger     │  │
│  │    (指标)     │   │    (日志)     │   │    (链路)     │  │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  │
├──────────┼──────────────────┼──────────────────┼──────────┤
│          │                  │                  │          │
│  ┌───────┴───────┐  ┌───────┴───────┐  ┌───────┴───────┐  │
│  │  Prometheus   │  │    ELK/EFK    │  │ OpenTelemetry │  │
│  │  (指标采集)    │   │  (日志采集)   │   │  (链路采集)    │  │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  │
├──────────┼──────────────────┼──────────────────┼──────────┤
│          │                  │                  │          │
│  ┌───────┴──────────────────┴──────────────────┴───────┐  │
│  │                  被监控的服务/节点                     │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Prometheus（指标采集）

### 核心概念

+ **Pull 模式** — Prometheus 主动拉取目标指标（而非被动接收）
+ **PromQL** — 查询语言，用于查询和聚合指标
+ **Alertmanager** — 告警路由和通知
+ **Service Discovery** — 自动发现监控目标（K8s、Consul、EC2 等）

### 架构

```
Prometheus Server
├── 抓取配置（scrape_configs）
│   ├── K8s Pods（通过 annotations 自动发现）
│   ├── Node Exporter（节点指标）
│   ├── App Metrics（应用 /metrics 端点）
│   └── Pushgateway（短生命周期任务）
├── 存储（本地 TSDB，默认保留 15 天）
└── 告警规则 → Alertmanager → 通知（邮件/钉钉/企微/Slack）
```

### 安装

```yaml
# docker-compose.yml
services:
  prometheus:
    image: prom/prometheus:v3.15.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'

volumes:
  prometheus-data:
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alerts/*.yml'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

### PromQL 常用查询

```promql
# CPU 使用率（百分比）
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 内存使用率
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# HTTP 请求 QPS
rate(http_requests_total[5m])

# P99 延迟
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# 错误率
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Pod 重启次数
kube_pod_container_status_restarts_total
```

### 告警规则示例

```yaml
# alerts/cpu.yml
groups:
  - name: cpu-alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU 使用率过高"
          description: "{{ $labels.instance }} CPU 使用率超过 80%，当前值 {{ $value }}%"

      - alert: HighMemoryUsage
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "内存使用率过高"
          description: "{{ $labels.instance }} 内存使用率超过 85%"

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod 反复重启"
          description: "{{ $labels.pod }} 在 15 分钟内重启了 {{ $value }} 次"
```

## Grafana（可视化）

### 安装

```yaml
# docker-compose.yml
services:
  grafana:
    image: grafana/grafana:13.2.3
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./provisioning:/etc/grafana/provisioning

volumes:
  grafana-data:
```

### 核心功能

+ **Dashboard** — 自定义监控面板
+ **DataSource** — 对接 Prometheus/Loki/Elasticsearch 等
+ **Alerting** — Grafana 自身也支持告警（v8+ 统一告警）
+ **Explore** — 交互式查询调试

### 常用面板

| 面板类型 | 用途 |
|----------|------|
| **Time Series** — 时序曲线（CPU、内存、QPS） |
| **Stat** — 单值显示（当前连接数、错误数） |
| **Gauge** — 仪表盘（磁盘使用率） |
| **Table** — 表格（Pod 列表、节点列表） |
| **Heatmap** — 热力图（延迟分布） |
| **Logs** — 日志面板（对接 Loki/ES） |

## ELK / EFK（日志栈）

### 架构

```
应用日志 → Filebeat/Fluentd → Logstash → Elasticsearch → Kibana
                                                      ↓
                                                   搜索/可视化
```

+ **Elasticsearch** — 分布式搜索和分析引擎，存储日志
+ **Logstash** — 日志收集、转换、转发（重量级）
+ **Kibana** — 日志可视化界面
+ **Filebeat** — 轻量级日志采集器（替代 Logstash 的采集端）
+ **Fluentd/Fluent Bit** — 另一种日志采集器（CNCF 项目）

### 简化版：EFK（去掉 Logstash）

```
应用日志 → Fluentd → Elasticsearch → Kibana
```

对于结构化日志（JSON），Fluentd 直接转发即可，不需要 Logstash 做转换。

### docker-compose 示例

```yaml
services:
  elasticsearch:
    image: elasticsearch:9.5.5
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es-data:/usr/share/elasticsearch/data

  kibana:
    image: kibana:9.5.5
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  fluentd:
    image: fluent/fluentd:v1.18
    volumes:
      - ./fluent.conf:/fluentd/etc/fluent.conf
      - /var/log:/var/log:ro
    depends_on:
      - elasticsearch

volumes:
  es-data:
```

```xml
# fluent.conf
<source>
  @type tail
  path /var/log/app/*.log
  pos_file /var/log/fluentd-app.pos
  tag app.*
  <parse>
    @type json
  </parse>
</source>

<match app.*>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix app
</match>
```

### Kibana 查询

```text
# 搜索 ERROR 级别日志
level:ERROR AND service:order-service

# 时间范围 + 关键字
@timestamp:[now-1h TO now] AND message:"timeout"

# 聚合统计
# 用 Kibana 的 Visualize 功能做：
# - 按服务分组的错误数柱状图
# - 按时间分布的日志量曲线
```

## Loki（轻量日志方案）

Loki 是 Grafana 出品的日志聚合系统，比 ELK 轻量很多：

```
应用日志 → Promtail → Loki → Grafana
```

+ **Grafana Alloy** — 日志/指标/链路采集器（Promtail 已废弃，功能合并进 Alloy）
+ **Loki** — 日志存储（只索引标签，不索引全文，省资源）
+ **Grafana** — 可视化（和指标面板放一起）

> ⚠️ Promtail 在 Loki 3.6 标记废弃，3.7.3 起完全移除。新部署建议直接用 Grafana Alloy 替代。

```yaml
# docker-compose.yml
services:
  loki:
    image: grafana/loki:3.7.8
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml

  promtail:
    image: grafana/alloy:v1.8.0
    volumes:
      - ./alloy-config.yml:/etc/alloy/config.yml
      - /var/log:/var/log:ro
    depends_on:
      - loki
```

**Loki vs ELK 选择**：

| 维度 | Loki | ELK |
|------|------|-----|
| 资源占用 | 低 | 高（JVM） |
| 全文搜索 | 弱（靠标签过滤） | 强（倒排索引） |
| 日志量 | 中小规模 | 大规模 |
| 运维复杂度 | 低 | 高 |
| 和 Grafana 集成 | 原生 | 需配置 |

## 监控体系搭建建议

### 最小可用方案（小团队/开发环境）

```
Prometheus + Grafana + Alertmanager
    +
Node Exporter（节点指标）
    +
App /metrics（应用指标）
```

### 标准方案（生产环境）

```
Prometheus + Grafana + Alertmanager
    +
Node Exporter（节点指标）
    +
App /metrics（应用指标）
    +
Loki + Grafana Alloy（日志）
    +
OpenTelemetry（链路追踪）
    +
Uptime Kuma（可用性监控）
```

### 告警通知渠道

| 渠道 | 配置方式 |
|------|----------|
| **邮件** | Alertmanager SMTP |
| **钉钉** | Alertmanager Webhook → 钉钉机器人 |
| **企微** | Alertmanager Webhook → 企微机器人 |
| **Slack** | Alertmanager Webhook → Slack Incoming Webhook |
| **PagerDuty** | Alertmanager PagerDuty 集成 |

## 常见坑

+ **Prometheus 存储爆炸** — 控制 retention 时间，或用 Thanos/Cortex 做长期存储
+ **Grafana 面板太多找不到** — 用 Folder 和 Tag 组织
+ **告警疲劳** — 只对"需要人处理"的告警设通知，其他只记录
+ **ELK 内存不够** — Elasticsearch 是 JVM 应用，生产至少 4GB 堆内存
+ **Loki 查询慢** — 标签设计要合理，避免高基数标签（如 userId）
+ **Promtail 已废弃** — Loki 3.6 标记废弃，3.7.3 起完全移除，新部署用 Grafana Alloy
+ **监控数据断点** — 检查 Prometheus 的 scrape 间隔和目标健康状态

## 参考

+ [Prometheus 官方文档](https://prometheus.io/docs/)
+ [Grafana 官方文档](https://grafana.com/docs/)
+ [Elasticsearch 官方文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
+ [Loki 官方文档](https://grafana.com/docs/loki/latest/)
+ 本站：[Kubernetes](/notes/ops/kubernetes) · [Rancher 管理平台](/notes/ops/rancher) · [后端可观测](/notes/ops/observability)

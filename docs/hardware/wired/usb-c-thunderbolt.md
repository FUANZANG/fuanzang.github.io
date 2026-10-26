# USB-C 与 Thunderbolt

> 📌 本文件记录 USB-C 接口的物理特性、Thunderbolt 3/4/5 的演进、以及两者与 USB4 的关系。
>
> 📅 基于 2026-10 时点：Thunderbolt 5 与 USB4 v2 并行推进，Thunderbolt 5 强制 80 Gbps + 240W。

---

## 1. USB-C 的物理特性

USB-C（全称 USB Type-C）是 2014 年发布的接口标准，特点：

| 特性 | 参数 |
|------|------|
| 引脚数 | 24 个 |
| 尺寸 | 8.4mm × 2.6mm |
| 正反插 | ✅ 支持 |
| 最大速度 | 取决于协议（USB4 v2: 80 Gbps） |
| 最大供电 | 240W（USB PD 3.1 EPR） |
| 视频输出 | DisplayPort 2.1 / HDMI Alt Mode |

> 前端类比：USB-C 就像前端的"统一 API 层"——一个接口适配多种协议（数据、视频、供电）。

---

## 2. Thunderbolt 演进

### 2.1 Thunderbolt 1/2（2011-2013）

- 接口：Mini DisplayPort
- 速度：10 Gbps（TB1）/ 20 Gbps（TB2）
- 用途：苹果设备专用

### 2.2 Thunderbolt 3（2015）——转折点

- 接口：**改为 USB-C**
- 速度：40 Gbps
- 供电：100W
- 特点：Intel 开源协议，成为 USB4 的基础

### 2.3 Thunderbolt 4（2020）——标准化

- 接口：USB-C
- 速度：40 Gbps
- 供电：100W
- 强制要求：PCIe 32 Gbps、双 4K 显示器、菊花链
- 特点：Intel 认证，保证最低性能

### 2.4 Thunderbolt 5（2024）——80 Gbps 时代

- 接口：USB-C
- 速度：80 Gbps（对称）/ 120 Gbps（非对称）
- 供电：240W（强制）
- 强制要求：PCIe Gen4 32 Gbps、双 8K 显示器、菊花链
- 特点：基于 USB4 v2，但认证更严格

---

## 3. USB-C ≠ USB4 ≠ Thunderbolt

**关键区分**：USB-C 是接口形状，USB4 和 Thunderbolt 是协议。

| 组合 | 速度 | 供电 | 视频 | 典型设备 |
|------|------|------|------|----------|
| USB-C + USB 2.0 | 480 Mbps | 15W | ❌ | 廉价配件 |
| USB-C + USB 3.2 | 5-20 Gbps | 15W | 部分 | 中端手机 |
| USB-C + USB4 v1 | 40 Gbps | 100W | ✅ | 高端笔记本 |
| USB-C + USB4 v2 | 80 Gbps | 240W | ✅ | 2026 旗舰 |
| USB-C + Thunderbolt 4 | 40 Gbps | 100W | ✅ | Intel 认证设备 |
| USB-C + Thunderbolt 5 | 80 Gbps | 240W | ✅ | 2024+ 旗舰 |

---

## 4. Alt Mode（替代模式）

USB-C 的 24 个引脚可以被重新定义，实现"一线通"：

| Alt Mode | 功能 | 引脚占用 |
|----------|------|----------|
| DisplayPort Alt Mode | 视频输出 | 高速 lane 复用 |
| HDMI Alt Mode | 视频输出 | 部分 lane |
| Thunderbolt Alt Mode | 数据 + 视频 + 供电 | 全 lane |
| USB4 Alt Mode | 数据 + 视频 + 供电 | 全 lane |

> 前端类比：Alt Mode 就像前端的"协议复用"——同一个 HTTP 连接可以传输不同的内容类型（JSON、二进制、SSE）。

---

## 5. 线缆选择

| 线缆 | 速度 | 供电 | 特点 |
|------|------|------|------|
| USB-C 2.0 | 480 Mbps | 15W | 最便宜，充电够用 |
| USB-C 3.2 | 5-20 Gbps | 15W | 数据传输够用 |
| USB4 40Gbps | 40 Gbps | 100W | 需要 E-Marker 芯片 |
| Thunderbolt 4 | 40 Gbps | 100W | 认证线缆，兼容 USB4 |
| Thunderbolt 5 | 80 Gbps | 240W | 2024+ 旗舰设备 |

**重要提醒**：
- 线缆长度影响速度——超过 1m 的 USB4/Thunderbolt 线缆需要主动放大
- 廉价线缆可能无法达到标称速度
- 240W 供电需要 EPR（Extended Power Range）认证线缆

---

---

## 参考

- [Thunderbolt 技术官网](https://www.thunderbolttechnology.net/)
- [USB-C 规范](https://www.usb.org/documents)
- [USB4 规范](https://www.usb.org/usb4)

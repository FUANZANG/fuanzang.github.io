# 存储接口：M.2 / SATA / UFS / NVMe

> 📌 本文件记录 M.2、SATA、UFS、NVMe 等存储接口标准的演进、速度对比、以及 2026 年现状。
>
> 📅 基于 2026-10 时点：PCIe 4.0 NVMe 是主流，UFS 4.1 是手机旗舰标配，UFS 5.0 刚发布。

---

## 1. 一句话区分

| 接口 | 定位 | 一句话 |
|------|------|--------|
| **SATA** | 传统接口 | 便宜、慢、老设备仍在用 |
| **M.2** | 物理形态 | 小型化接口，支持 PCIe 和 SATA 两种协议 |
| **NVMe** | 协议标准 | 为 SSD 设计的高性能协议，走 PCIe 通道 |
| **UFS** | 嵌入式存储 | 手机/平板的存储标准，类似"嵌入式 NVMe" |

---

## 2. 速度对比

| 接口/协议 | 最大速度 | 实际顺序读取 | 典型设备 |
|-----------|----------|--------------|----------|
| SATA III | 6 Gbps | ~550 MB/s | 老 SSD、机械硬盘 |
| M.2 SATA | 6 Gbps | ~550 MB/s | 入门级 SSD |
| M.2 NVMe Gen3 | 32 Gbps | ~3,500 MB/s | 主流 SSD |
| M.2 NVMe Gen4 | 64 Gbps | ~7,000 MB/s | 高端 SSD |
| M.2 NVMe Gen5 | 128 Gbps | ~14,000 MB/s | 旗舰 SSD |
| UFS 3.1 | 23.2 Gbps | ~1,200 MB/s | 中端手机 |
| UFS 4.1 | 46.4 Gbps | ~4,300 MB/s | 旗舰手机 |
| UFS 5.0 | 93.2 Gbps | ~10,800 MB/s | 2027 年旗舰手机 |

---

## 3. M.2 接口详解

M.2 是一种物理接口，支持两种协议：

| 协议 | 走总线 | 速度 | 用途 |
|------|--------|------|------|
| M.2 SATA | SATA | 6 Gbps | 入门级 SSD |
| M.2 NVMe | PCIe | 32-128 Gbps | 主流/高端 SSD |

**常见规格**：
- **M.2 2280**：22mm 宽，80mm 长（最常见）
- **M.2 2242**：22mm 宽，42mm 长（部分笔记本）

---

## 4. NVMe 协议

NVMe（Non-Volatile Memory Express）是专为 SSD 设计的协议：

| 特性 | 说明 |
|------|------|
| 多队列 | 最多 64K 队列，每队列 64K 命令 |
| 低延迟 | 绕过 SATA 控制器，直接走 PCIe |
| 并行处理 | 充分利用 SSD 的并行读写能力 |

> 前端类比：NVMe 的队列设计类似消息队列——多队列并行处理，比单队列（SATA）高效得多。

---

## 5. UFS 嵌入式存储

UFS（Universal Flash Storage）是手机/平板的存储标准：

| 版本 | 年份 | 速度 | 特点 |
|------|------|------|------|
| UFS 2.1 | 2013 | 8.4 Gbps | 早期智能手机 |
| UFS 3.0 | 2018 | 23.2 Gbps | 旗舰手机 |
| UFS 3.1 | 2020 | 23.2 Gbps | 写入增强 |
| UFS 4.0 | 2022 | 46.4 Gbps | 速度翻倍 |
| UFS 4.1 | 2025 | 46.4 Gbps | 区域存储 |
| UFS 5.0 | 2026 | 93.2 Gbps | 再次翻倍 |

---

---

## 6. 参考

- [JEDEC UFS 标准](https://www.jedec.org/)
- [NVM Express 官方](https://nvmexpress.org/)
- [三星 UFS 产品页](https://semiconductor.samsung.com/estorage/ufs/)

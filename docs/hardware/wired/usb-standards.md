# USB 标准演进

> 📌 本文件记录 USB 从 1.0 到 USB4 v2 的完整演进史、速度对比、以及 2026 年现状。
>
> 📅 基于 2026-10 时点：USB4 v2 开始进入高端设备，Thunderbolt 5 并行推进。

---

## 1. USB 版本全览

| 版本 | 年份 | 速度 | 市场名称 | 接口 |
|------|------|------|----------|------|
| USB 1.0 | 1996 | 1.5 Mbps | Low-Speed | Type-A / Type-B |
| USB 1.1 | 1998 | 12 Mbps | Full-Speed | Type-A / Type-B |
| USB 2.0 | 2000 | 480 Mbps | High-Speed | Type-A / Type-B / Mini / Micro |
| USB 3.0 | 2008 | 5 Gbps | SuperSpeed | Type-A（蓝口）/ Type-B |
| USB 3.1 | 2013 | 10 Gbps | SuperSpeed+ | Type-C |
| USB 3.2 | 2017 | 20 Gbps | SuperSpeed+ | Type-C |
| USB4 v1 | 2019 | 40 Gbps | USB 40Gbps | Type-C |
| USB4 v2 | 2022 | 80 Gbps | USB 80Gbps | Type-C |

> 前端类比：USB 的演进就像网络协议从 HTTP/1.0 到 HTTP/3 的演进——每一代都在提升速度，同时简化接口（统一到 Type-C）。

---

## 2. 各代详解

### 2.1 USB 2.0（2000）——统治了 20 年

- 速度：480 Mbps（60 MB/s）
- 接口：Type-A（电脑端）、Type-B（打印机）、Mini-B（旧手机）、Micro-B（Android 手机）
- 供电：5V / 500mA（2.5W）
- 特点：半双工，兼容性强，至今仍在大量设备中使用

### 2.2 USB 3.x（2008-2017）——速度革命

USB 3.x 的命名极其混乱，USB-IF 多次改名：

| 原始名称 | 改名后 | 速度 |
|----------|--------|------|
| USB 3.0 | USB 3.2 Gen 1 | 5 Gbps |
| USB 3.1 | USB 3.2 Gen 2 | 10 Gbps |
| USB 3.2 | USB 3.2 Gen 2x2 | 20 Gbps |

> 前端类比：这种改名就像 ES6 → ES2015 → ES2016 的改名——同一个东西换了好几次名字，让人困惑。

### 2.3 USB4 v1（2019）——基于 Thunderbolt 3

- 速度：40 Gbps（双通道）
- 接口：仅 Type-C
- 供电：兼容 USB PD（最高 100W）
- 隧道协议：支持 DisplayPort、PCIe、USB 3.2 隧道
- 特点：基于 Intel 开源的 Thunderbolt 3 协议

### 2.4 USB4 v2（2022/2023）——80 Gbps 时代

- 速度：80 Gbps（对称）/ 120 Gbps（非对称，显示优化）
- 接口：仅 Type-C
- 关键技术：PAM3 调制（替代 NRZ）
- 特点：不需要额外的物理线路，通过更高效的编码提升速度

> 前端类比：PAM3 调制就像前端的"更高效的序列化协议"——同样的带宽，传输更多数据。

---

## 3. 接口形状对比

| 接口 | 形状 | 常见设备 | 特点 |
|------|------|----------|------|
| Type-A | 长方形 | 电脑、充电器 | 最经典，只能一个方向插 |
| Type-B | 方形 | 打印机、扫描仪 | 逐渐淘汰 |
| Mini-B | 小梯形 | 旧手机、MP3 | 已被 Micro 取代 |
| Micro-B | 超薄梯形 | Android 手机、充电宝 | 已被 Type-C 取代 |
| Type-C | 椭圆形 | 现代手机、笔记本 | 正反可插，全功能 |

---

## 4. USB4 v2 vs Thunderbolt 5

USB4 v2 和 Thunderbolt 5 在技术层面几乎相同，区别在于认证要求：

| 特性 | USB4 v2 | Thunderbolt 5 |
|------|---------|---------------|
| 最大速度 | 80 Gbps | 80 Gbps |
| 非对称模式 | 可选 | 强制（120 Gbps） |
| PCIe 隧道 | 可选 | 强制（32 Gbps） |
| 供电 | 可选 PD | 强制 240W |
| 菊花链 | 可选 | 强制 |
| 认证 | USB-IF | Intel |

> 前端类比：USB4 v2 像 Web 标准（W3C），Thunderbolt 5 像浏览器厂商的增强实现——基础相同，但后者保证更高的下限。

---

## 5. 线缆选择

| 线缆类型 | 最大速度 | 最大供电 | 价格区间 |
|----------|----------|----------|----------|
| USB 2.0 Type-C | 480 Mbps | 15W | ¥10-30 |
| USB 3.2 Gen 1 Type-C | 5 Gbps | 15W | ¥20-50 |
| USB 3.2 Gen 2 Type-C | 10 Gbps | 100W | ¥30-80 |
| USB4 v1 Type-C | 40 Gbps | 100W | ¥50-150 |
| USB4 v2 Type-C | 80 Gbps | 240W | ¥100-300 |

**重要提醒**：线缆质量直接影响速度和供电。廉价线缆可能无法达到标称速度。

---

---

## 参考

- [USB-IF 官方规范](https://www.usb.org/documents)
- [Tom's Hardware USB 指南](https://www.tomshardware.com/peripherals/usb)
- [USB4 规范解读](https://www.usb.org/usb4)

# 各厂商芯片历代对比

> 📌 本文件记录 AMD、Intel、Apple、高通、联发科、NVIDIA 等厂商的历代芯片演进与最新对比。
>
> 📅 基于 2026-10 时点：AMD Ryzen 9000（Zen 5）/ Intel Core Ultra 300（Panther Lake）/ Apple M5-M6 / 骁龙 X2 Elite / Dimensity 9500 / RTX 5090。

---

## 1. CPU 厂商

### 1.1 AMD（x86）

| 代际 | 架构 | 制程 | 代表产品 | 亮点 |
|------|------|------|----------|------|
| 2017 | Zen 1 | 14nm | Ryzen 1000 | 翻身之作，IPC 提升 52% |
| 2019 | Zen 2 | 7nm | Ryzen 3000 | Chiplet 设计，多核优势 |
| 2020 | Zen 3 | 7nm | Ryzen 5000 | 统一 CCX，游戏性能反超 |
| 2022 | Zen 4 | 5nm | Ryzen 7000 | DDR5 + PCIe 5.0 |
| 2024 | Zen 5 | 4nm | Ryzen 9000 | AI 加速 + 3D V-Cache |
| 2026 | Zen 6 | 2nm (N2X) | Ryzen 10000（预计） | IPC 提升 25-30%，DDR5-6400+ |

**前端视角**：AMD 的 Chiplet 设计类似微前端——把一个大芯片拆成多个小芯片（CCD + IOD），各自独立制造再封装在一起。

### 1.2 Intel（x86）

| 代际 | 架构 | 制程 | 代表产品 | 亮点 |
|------|------|------|----------|------|
| 2020 | Sunny Cove | 10nm | Core 10代 | 首次 10nm |
| 2021 | Golden Cove | Intel 7 | Core 12代 | 混合架构（P核+E核） |
| 2023 | Raptor Lake | Intel 7 | Core 14代 | 频率突破 6GHz |
| 2024 | Lion Cove | Intel 4 | Core Ultra 200 | 集成 NPU，AI PC |
| 2026 | Panther Lake | 18A | Core Ultra 300 | RibbonFET + PowerVia，50 TOPS NPU |

**前端视角**：Intel 的混合架构（P核 + E核）类似前端的"关键渲染路径"优化——重要任务用大核（P核），后台任务用小核（E核）。

### 1.3 Apple（ARM）

| 代际 | 架构 | 制程 | 代表产品 | 亮点 |
|------|------|------|----------|------|
| 2020 | Firestorm | 5nm | M1 | ARM 桌面芯片震惊行业 |
| 2022 | Avalanche | 5nm | M2 | GPU 核心翻倍 |
| 2023 | Everest | 3nm | M3 | 硬件光追 + 动态缓存 |
| 2024 | Sawtooth | 3nm | M4 | 更强 NPU，AI 能力 |
| 2026 | TBA | 3nm | M5 | 每个 CPU 核心集成 Neural Accelerator |
| 2026 | TBA | 2nm | M6 | 苹果首款 2nm 芯片，12 核 CPU + 12 核 GPU |

**前端视角**：Apple 的统一内存架构（UMA）类似前端的"单例模式"——CPU 和 GPU 共享同一块内存，不用拷贝数据。

### 1.4 高通（ARM）

| 代际 | 架构 | 制程 | 代表产品 | 亮点 |
|------|------|------|----------|------|
| 2021 | Kryo 680 | 5nm | 骁龙 888 | 首次 X1 超大核 |
| 2022 | Kryo 780 | 4nm | 骁龙 8 Gen 1 | 换台积电，能效改善 |
| 2023 | Kryo 880 | 4nm | 骁龙 8 Gen 3 | 性能追平苹果 |
| 2024 | Oryon | 4nm | 骁龙 X Elite | 自研核心，Windows PC |
| 2026 | Oryon 2 | 4nm | 骁龙 X2 Elite | 18 核 5.0GHz，80 TOPS NPU |

**前端视角**：高通从公版 ARM 核心转向自研 Oryon 核心，类似前端从用 jQuery 框架转向自研框架——为了更深度的性能优化。

### 1.5 联发科（ARM）

| 代际 | 架构 | 制程 | 代表产品 | 亮点 |
|------|------|------|----------|------|
| 2021 | Armv9 | 6nm | Dimensity 9000 | 首次旗舰芯片 |
| 2022 | Armv9 | 4nm | Dimensity 9200 | 全大核设计 |
| 2023 | Armv9 | 4nm | Dimensity 9300 | 硬件生成式 AI |
| 2024 | Armv9 | 3nm | Dimensity 9400 | 全大核 + AI |
| 2026 | Armv9 | 3nm (N3P) | Dimensity 9500 | 全大核自研（Travis/Alto/Gelas）+ NPU |

**前端视角**：联发科的"全大核"设计类似前端性能优化中的"关键路径优先"——所有核心都是大核，优先保证响应速度。

---

## 2. GPU 厂商

### 2.1 NVIDIA

| 代际 | 架构 | 制程 | 代表产品 | 亮点 |
|------|------|------|----------|------|
| 2020 | Ampere | 8nm | RTX 3090 | 光追普及 |
| 2022 | Ada Lovelace | 4nm | RTX 4090 | DLSS 3 帧生成 |
| 2025 | Blackwell | 4nm | RTX 5090 | DLSS 4，当前旗舰 |
| 2027-28 | Rubin (预计) | 3nm | RTX 6090 | 未发布，可能延期至 2028 |

### 2.2 AMD

| 代际 | 架构 | 制程 | 代表产品 | 亮点 |
|------|------|------|----------|------|
| 2020 | RDNA 2 | 7nm | RX 6900 XT | 光追 + Infinity Cache |
| 2022 | RDNA 3 | 5nm | RX 7900 XTX | Chiplet GPU |
| 2024 | RDNA 4 | 4nm | RX 9070 XT | AI 加速 |

---

## 3. 最新旗舰对比（2026）

| 维度 | AMD Ryzen 9 9950X | Intel Core Ultra X9 300 | Apple M6 |
|------|-------------------|--------------------------|-----------|
| 架构 | Zen 5 | Panther Lake + Skymont | ARMv9 |
| 制程 | 4nm | Intel 18A (≈2nm) | 2nm (GAA) |
| 核心 | 16C/32T | 16C/24T (4P+8E+4LPE) | 12C |
| 频率 | 5.7 GHz | 5.5 GHz | — |
| 功耗 | 170W | 65-80W | — |
| 内存 | DDR5 | LPDDR5x / DDR5 | 统一内存 |
| AI | Ryzen AI (NPU) | NPU 50 TOPS | Neural Engine |
| 游戏 | 极强 | 强（Xe3 GPU ≈ RTX 4050） | 一般 |
| 能效 | 中等 | 强 | 极强 |

---

## 参考

- [AnandTech 处理器评测](https://www.anandtech.com/)
- [Chiphell 硬件社区](https://www.chiphell.com/)
- [Apple 芯片新闻稿](https://www.apple.com/newsroom/)
- [高通骁龙产品页](https://www.qualcomm.com/products/mobile/snapdragon)

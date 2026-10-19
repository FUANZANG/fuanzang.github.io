# 显示接口：HDMI vs DisplayPort

> 📌 本文件记录 HDMI 和 DisplayPort 两大显示接口标准的演进、带宽对比、以及 2026 年现状。
>
> 📅 基于 2026-10 时点：HDMI 2.2 已发布，DisplayPort 2.1 逐步普及。

---

## 1. 一句话区分

| 接口 | 定位 | 一句话 |
|------|------|--------|
| **HDMI** | 消费电子标准 | 电视、游戏机、主机的通用接口 |
| **DisplayPort** | PC / 专业标准 | 高刷新率、多显示器、PC 首选 |

---

## 2. HDMI 演进

| 版本 | 年份 | 带宽 | 最大分辨率/刷新率 | 关键特性 |
|------|------|------|-------------------|----------|
| HDMI 1.4 | 2010 | 10.2 Gbps | 4K@30Hz | 3D、ARC |
| HDMI 2.0 | 2013 | 18 Gbps | 4K@60Hz | HDR、32 声道 |
| HDMI 2.1 | 2017 | 48 Gbps | 4K@120Hz / 8K@60Hz | VRR、ALLM、eARC、DSC |
| HDMI 2.2 | 2025 | 96 Gbps | 4K@240Hz / 8K@120Hz | 更高带宽、动态 HDR |

---

## 3. DisplayPort 演进

| 版本 | 年份 | 带宽 | 最大分辨率/刷新率 | 关键特性 |
|------|------|------|-------------------|----------|
| DP 1.2 | 2010 | 21.6 Gbps | 4K@60Hz | — |
| DP 1.4 | 2016 | 32.4 Gbps | 8K@60Hz (DSC) | HDR、DSC |
| DP 2.1 | 2019 | 80 Gbps | 16K@60Hz (DSC) | UHBR、更高带宽 |

---

## 4. 2026 年主流对比

| 维度 | HDMI 2.1 | HDMI 2.2 | DP 1.4 | DP 2.1 |
|------|----------|----------|--------|--------|
| 带宽 | 48 Gbps | 96 Gbps | 32.4 Gbps | 80 Gbps |
| 4K 高刷 | 4K@120Hz | 4K@240Hz | 4K@144Hz (DSC) | 4K@240Hz |
| 8K | 8K@60Hz | 8K@120Hz | 8K@60Hz (DSC) | 8K@120Hz |
| VRR | ✅ | ✅ | ✅ | ✅ |
| 多显示器 | 需分配器 | 需分配器 | 原生菊花链 | 原生菊花链 |
| DSC | ✅ | ✅ | ✅ | ✅ |
| 典型设备 | 电视、主机 | 2025+ 高端电视 | 显示器 | 高端显示器 |

---

## 5. 前端开发者为什么要关心

### 5.1 WebGPU 与显示输出

```javascript
// WebGPU 可以检测显示设备的色彩空间和 HDR 能力
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();

// 根据显示器能力选择色彩格式
// HDR 显示器 → 'rgba16float' 或 'bgra8unorm-srgb'
// SDR 显示器 → 'bgra8unorm'
```

### 5.2 多显示器开发环境

```javascript
// 前端开发者常见多显示器设置
// 需要 DisplayPort 菊花链或 Thunderbolt 扩展坞
// HDMI 在多显示器场景下需要分配器，不如 DP 方便

// 检测显示器信息（通过 Screen API）
const screens = window.screen;
// 注意：浏览器 API 无法直接获取 HDMI/DP 版本信息
// 但可以通过分辨率和刷新率推断
```

### 5.3 响应式设计的刷新率适配

```javascript
// 高刷新率显示器（120Hz+）下，动画更流畅
// 可以通过媒体查询适配
const mediaQuery = window.matchMedia('(update-frequency: 120hz)');
if (mediaQuery.matches) {
  // 高刷屏优化：减少不必要的重绘
}
```

---

## 6. 参考

- [HDMI 官方规范](https://www.hdmi.org/)
- [VESA DisplayPort 规范](https://www.vesa.org/technical-resources/)
- [AnandTech 显示接口评测](https://www.anandtag.com/)

# 其他快充协议：QC / VOOC / SCP 等

> 📌 本文件记录除 USB PD 之外的主流快充协议，包括高通 QC、华为 SCP/FCP、OPPO SuperVOOC 等。
>
> 📅 基于 2026-10 时点：USB PD 3.2 逐步成为通用标准，私有协议仍广泛使用。

---

## 1. 快充协议全景

| 协议 | 厂商 | 最大功率 | 类型 | 兼容性 |
|------|------|----------|------|--------|
| USB PD 3.2 | USB-IF | 240W | 开放标准 | 通用 |
| QC 5 | 高通 | 100W+ | 半开放 | 需骁龙芯片 |
| SuperVOOC | OPPO/一加/realme | 240W | 私有 | 需原装配件 |
| SCP/FCP | 华为/荣耀 | 100W | 私有 | 需原装配件 |
| PPS | 多种 | 100W | 半开放 | 需兼容充电器 |

---

## 2. 高通 Quick Charge（QC）

| 版本 | 最大功率 | 电压/电流 | 特点 |
|------|----------|-----------|------|
| QC 2.0 | 18W | 9V/2A | 固定高压 |
| QC 3.0 | 18-24W | 3.6V-20V 动态 | 动态电压调节 |
| QC 4+ | 27-30W | 兼容 USB-PD | 过渡方案 |
| QC 5 | 100W+ | 双电芯 | 兼容 PD/PPS |

**现状**：QC 4+ 后高通转向兼容 USB PD，QC 5 主要面向双电芯设计。

---

## 3. OPPO SuperVOOC

| 版本 | 最大功率 | 电压/电流 | 特点 |
|------|----------|-----------|------|
| VOOC | 20W | 5V/4A | 低压大电流 |
| SuperVOOC | 65W | 10V/6.5A | 电荷泵技术 |
| SuperVOOC 2.0 | 100W | 10V/10A | 双电芯 |
| SuperVOOC 3.0 | 150W | 20V/7.5A | 三电荷泵 |
| SuperVOOC 4.0 | 240W | 20V/12A | 四电荷泵 |

**特点**：低压大电流设计，充电时手机发热低，但需专用线缆和充电器。

---

## 4. 华为 SCP / FCP

| 版本 | 最大功率 | 电压/电流 | 特点 |
|------|----------|-----------|------|
| FCP | 18W | 9V/2A | 早期高压方案 |
| SCP | 22.5W | 4.5V/5A | 低压大电流 |
| SCP 2.0 | 40W | 10V/4A | 电荷泵 |
| SCP 3.0 | 66W | 11V/6A | 双电芯 |
| SCP 4.0 | 100W | 20V/5A | 三电芯 |

**特点**：类似 OPPO 的低压大电流路线，需原装配件。

---

## 5. 私有协议 vs 开放标准

| 维度 | 私有协议（VOOC/SCP） | 开放标准（USB PD） |
|------|---------------------|-------------------|
| 最大功率 | 240W | 240W |
| 兼容性 | 需原装配件 | 通用 |
| 充电发热 | 较低（低压大电流） | 较高（高压） |
| 成本 | 高（专用芯片） | 低（标准芯片） |
| 趋势 | 逐步兼容 PD | 成为通用标准 |

---

## 6. 前端开发者为什么要关心

### 6.1 设备充电检测

```javascript
// 检测用户设备的充电状态
navigator.getBattery().then(battery => {
  console.log('充电中:', battery.charging);
  console.log('电量:', battery.level);
  console.log('充满时间:', battery.chargingTime);
});

// 根据充电状态优化应用行为
// 充电时：预加载资源、同步数据
// 电池供电时：减少动画、降低帧率
```

### 6.2 PWA 与网络状况适配

```javascript
// 根据网络状况调整资源加载策略
const connection = navigator.connection;
if (connection) {
  const { effectiveType, downlink, rtt } = connection;
  
  if (effectiveType === '4g' && downlink > 5) {
    // 快速网络：加载高清资源
  } else if (effectiveType === '2g' || downlink < 0.5) {
    // 慢速网络：加载低分辨率图片、延迟加载非关键资源
  }
}
```

---

## 7. 参考

- [USB-IF 快充规范](https://www.usb.org/documents)
- [高通 Quick Charge](https://www.qualcomm.com/products/features/quick-charge)
- [OPPO SuperVOOC](https://www.oppo.com/en/technology/supervooc/)
- [华为 SCP](https://consumer.huawei.com/cn/technology/supercharge/)

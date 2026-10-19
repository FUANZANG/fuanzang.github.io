# 无线标准：Wi-Fi / Bluetooth

> 📌 本文件记录 Wi-Fi 和 Bluetooth 无线标准的演进、速度对比、以及 2026 年现状。
>
> 📅 基于 2026-10 时点：Wi-Fi 7 逐步普及，蓝牙 5.4 是当前主流。

---

## 1. Wi-Fi 演进

| 版本 | 年份 | 频段 | 最大速率 | 关键特性 |
|------|------|------|----------|----------|
| Wi-Fi 5 (802.11ac) | 2014 | 5 GHz | 3.5 Gbps | MU-MIMO |
| Wi-Fi 6 (802.11ax) | 2019 | 2.4/5 GHz | 9.6 Gbps | OFDMA、BSS Coloring |
| Wi-Fi 6E | 2021 | 2.4/5/6 GHz | 9.6 Gbps | 6 GHz 频段 |
| Wi-Fi 7 (802.11be) | 2024 | 2.4/5/6 GHz | 46 Gbps | MLO、4K-QAM、320MHz |

---

## 2. Wi-Fi 7 的核心改进

| 特性 | 说明 |
|------|------|
| MLO | 多链路操作，同时使用多个频段传输 |
| 4K-QAM | 更高阶调制，提升单流速率 |
| 320MHz | 更宽信道，6 GHz 频段独占 |
| Multi-RU | 多资源单元，更高效利用频谱 |

> 前端类比：MLO 类似 HTTP/2 的多路复用——多个请求同时传输，而不是排队等待。

---

## 3. 蓝牙演进

| 版本 | 年份 | 最大速率 | 距离 | 关键特性 |
|------|------|----------|------|----------|
| 蓝牙 4.0 | 2010 | 1 Mbps | 50m | BLE 低功耗 |
| 蓝牙 4.2 | 2014 | 1 Mbps | 50m | 安全连接 |
| 蓝牙 5.0 | 2016 | 2 Mbps | 200m | 2 倍距离、4 倍范围 |
| 蓝牙 5.1 | 2017 | 2 Mbps | 200m | 方向查找 |
| 蓝牙 5.2 | 2019 | 2 Mbps | 200m | LE Audio |
| 蓝牙 5.3 | 2021 | 2 Mbps | 200m | 更低功耗 |
| 蓝牙 5.4 | 2023 | 2 Mbps | 200m | PAwR、电子货架标签 |

---

## 4. 2026 年现状

| 技术 | 当前主流 | 趋势 |
|------|----------|------|
| Wi-Fi | Wi-Fi 6 (26.7%) / Wi-Fi 5 (38.3%) | Wi-Fi 7 增长中 (1.8%) |
| 蓝牙 | 蓝牙 5.x | LE Audio 普及 |

**Wi-Fi 7 市场份额**：2026 年 Q1 约 1.8%，主要集中高端路由器和旗舰手机。

---

## 5. 前端开发者为什么要关心

### 5.1 Web Bluetooth API

```javascript
// Web Bluetooth 可以直接与蓝牙设备通信
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: ['battery_service'] }]
});

const server = await device.gatt.connect();
const service = await server.getPrimaryService('battery_service');
const characteristic = await service.getCharacteristic('battery_level');

const value = await characteristic.readValue();
console.log(`电量: ${value.getUint8(0)}%`);
```

### 5.2 Wi-Fi 信息获取

```javascript
// Network Information API 可以获取网络信息
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

if (connection) {
  console.log('类型:', connection.type); // 'wifi' / 'cellular' / 'ethernet'
  console.log('下行速度:', connection.downlink); // Mbps
  console.log('往返时延:', connection.rtt); // ms
}

// 根据网络状况优化资源加载
if (connection.downlink < 1) {
  // 慢速网络：加载低分辨率图片
}
```

### 5.3 WebRTC 与实时通信

```javascript
// WebRTC 依赖低延迟网络
// Wi-Fi 6/7 的 OFDMA 和 MLO 可以显著降低延迟
// 适合视频会议、在线协作等场景

const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});
```

---

## 6. 参考

- [Wi-Fi 联盟](https://www.wi-fi.org/)
- [蓝牙技术联盟](https://www.bluetooth.com/)
- [Ookla 全球 Wi-Fi 报告](https://www.ookla.com/)

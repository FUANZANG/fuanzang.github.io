---
title: 硬件杂谈
layout: page
---

<script setup>
import PageShell from '../components/PageShell.vue'
</script>

<PageShell title="🔩 硬件杂谈" subtitle="芯片、接口、无线、充电——零散但实用的硬件知识" max-width="880px">
  <table class="hw-table">
    <thead>
      <tr><th>分类</th><th>主题</th><th>链接</th></tr>
    </thead>
    <tbody>
      <tr><td rowspan="6">芯片</td><td>CPU 架构对比</td><td><a href="./chips/cpu-architectures">查看</a></td></tr>
      <tr><td>各厂商芯片历代对比</td><td><a href="./chips/chip-generations">查看</a></td></tr>
      <tr><td>制程工艺与摩尔定律</td><td><a href="./chips/chip-process">查看</a></td></tr>
      <tr><td>DDR 内存标准</td><td><a href="./chips/ddr-standards">查看</a></td></tr>
      <tr><td>GPU 架构与显存</td><td><a href="./chips/gpu-architectures">查看</a></td></tr>
      <tr><td>移动 SoC 横评</td><td><a href="./chips/mobile-soc">查看</a></td></tr>
      <tr><td rowspan="5">有线接口</td><td>USB 标准演进</td><td><a href="./wired/usb-standards">查看</a></td></tr>
      <tr><td>USB-C 与 Thunderbolt</td><td><a href="./wired/usb-c-thunderbolt">查看</a></td></tr>
      <tr><td>显示接口</td><td><a href="./wired/display-interfaces">查看</a></td></tr>
      <tr><td>存储接口</td><td><a href="./wired/storage-interfaces">查看</a></td></tr>
      <tr><td>存储介质（HDD/SSD）</td><td><a href="./wired/storage-media">查看</a></td></tr>
      <tr><td>无线标准</td><td>Wi-Fi / Bluetooth</td><td><a href="./wireless/wireless-standards">查看</a></td></tr>
      <tr><td rowspan="2">电源与充电</td><td>USB PD 快充协议</td><td><a href="./power/usb-pd">查看</a></td></tr>
      <tr><td>其他快充协议</td><td><a href="./power/charging-protocols">查看</a></td></tr>
    </tbody>
  </table>

  <h2>参考</h2>
  <ul>
    <li><a href="https://www.anandtech.com/" target="_blank" rel="noopener">AnandTech</a> — 深度芯片评测</li>
    <li><a href="https://www.chiphell.com/" target="_blank" rel="noopener">Chiphell</a> — 中文硬件社区</li>
    <li><a href="https://www.usb.org/documents" target="_blank" rel="noopener">USB-IF 官方规范</a> — USB 标准文档</li>
  </ul>
</PageShell>

<style>
.hw-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0 1.5rem;
}
.hw-table th,
.hw-table td {
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  text-align: left;
}
.hw-table th {
  color: var(--vp-c-text-2);
  font-weight: 600;
}
.hw-table a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.hw-table a:hover {
  text-decoration: underline;
}
</style>

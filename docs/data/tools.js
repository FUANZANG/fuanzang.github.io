/** 工具列表：按 group 聚拢；侧栏分组与 ?tool= 深链都读这份数据 */
export const tools = [
  // 编解码
  { id: 'json', name: 'JSON 格式化', group: '编解码' },
  { id: 'csv', name: 'CSV ↔ JSON', group: '编解码' },
  { id: 'base64', name: 'Base64', group: '编解码' },
  { id: 'url', name: 'URL 编码', group: '编解码' },
  { id: 'urlparse', name: 'URL 解析', group: '编解码' },
  { id: 'html', name: 'HTML 实体', group: '编解码' },
  { id: 'unicode', name: 'Unicode 转义', group: '编解码' },
  { id: 'base', name: '进制转换', group: '编解码' },
  // 文本
  { id: 'regex', name: '正则测试', group: '文本' },
  { id: 'markdown', name: 'Markdown 预览', group: '文本' },
  { id: 'text', name: '文本统计', group: '文本' },
  { id: 'lines', name: '文本行处理', group: '文本' },
  { id: 'newline', name: '换行符转换', group: '文本' },
  { id: 'case', name: '命名转换', group: '文本' },
  { id: 'diff', name: '文本差异', group: '文本' },
  // 时间
  { id: 'timestamp', name: '时间戳转换', group: '时间' },
  { id: 'date', name: '日期差', group: '时间' },
  { id: 'timezone', name: '时区转换', group: '时间' },
  { id: 'cron', name: 'Cron 解读', group: '时间' },
  // 生成 · 校验
  { id: 'uuid', name: 'UUID 生成', group: '生成 · 校验' },
  { id: 'password', name: '密码生成', group: '生成 · 校验' },
  { id: 'hash', name: '哈希计算', group: '生成 · 校验' },
  { id: 'jwt', name: 'JWT 解析', group: '生成 · 校验' },
  // 图像
  { id: 'color', name: '颜色转换', group: '图像' },
  { id: 'img', name: '图片转 Base64', group: '图像' },
  { id: 'qrcode', name: '二维码生成', group: '图像' },
  { id: 'plantuml', name: 'PlantUML 预览', group: '图像' }
]

/** 按 tools 数组里 group 首次出现的顺序分组，供侧栏渲染 */
export function groupTools(list = tools) {
  const order = []
  const map = new Map()
  for (const tool of list) {
    if (!map.has(tool.group)) {
      map.set(tool.group, [])
      order.push(tool.group)
    }
    map.get(tool.group).push(tool)
  }
  return order.map(label => ({ label, items: map.get(label) }))
}

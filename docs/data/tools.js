/** 工具列表：按功能分类聚拢排列 */
export const tools = [
  // 编解码
  { id: 'json', name: 'JSON 格式化', kind: 'format' },
  { id: 'base64', name: 'Base64', kind: 'codec' },
  { id: 'url', name: 'URL 编码', kind: 'codec' },
  { id: 'html', name: 'HTML 实体', kind: 'codec' },
  { id: 'unicode', name: 'Unicode 转义', kind: 'codec' },
  // 时间·解析
  { id: 'timestamp', name: '时间戳转换', kind: 'timestamp' },
  { id: 'date', name: '日期差', kind: 'date' },
  { id: 'jwt', name: 'JWT 解析', kind: 'jwt' },
  // 文本
  { id: 'regex', name: '正则测试', kind: 'regex' },
  { id: 'text', name: '文本统计', kind: 'text' },
  { id: 'lines', name: '文本行处理', kind: 'lines' },
  { id: 'newline', name: '换行符转换', kind: 'newline' },
  // 随机
  { id: 'uuid', name: 'UUID 生成', kind: 'uuid' },
  { id: 'password', name: '密码生成', kind: 'password' },
  // 数值·格式
  { id: 'base', name: '进制转换', kind: 'base' },
  { id: 'case', name: '命名转换', kind: 'case' },
  { id: 'color', name: '颜色转换', kind: 'color' },
  { id: 'hash', name: '哈希计算', kind: 'hash' },
  // 媒体·对比
  { id: 'img', name: '图片转 Base64', kind: 'img' },
  { id: 'qrcode', name: '二维码生成', kind: 'qrcode' },
  { id: 'plantuml', name: 'PlantUML 预览', kind: 'plantuml' },
  { id: 'diff', name: '文本差异', kind: 'diff' }
]

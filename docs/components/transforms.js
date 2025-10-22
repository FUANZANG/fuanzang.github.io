// 各「输入 → 输出」类工具的纯函数与元信息，供 SimpleTool 复用

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach(b => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

function b64ToUtf8(str) {
  const bin = atob(str)
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function htmlEncode(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function htmlDecode(str) {
  const ta = document.createElement('textarea')
  ta.innerHTML = str
  return ta.value
}

function toUnicode(str) {
  let out = ''
  for (const ch of str) {
    const cp = ch.codePointAt(0)
    out += cp > 0x7f ? '\\u' + cp.toString(16).padStart(4, '0') : ch
  }
  return out
}

function fromUnicode(str) {
  return str.replace(/\\u([0-9a-fA-F]{1,4})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16))
  )
}

function capitalize(w) {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
}

function splitWords(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-.\s]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function toCase(s, style) {
  const words = splitWords(s)
  if (!words.length) return ''
  switch (style) {
    case 'camel':
      return words
        .map((w, i) => (i === 0 ? w.toLowerCase() : capitalize(w)))
        .join('')
    case 'pascal':
      return words.map(capitalize).join('')
    case 'snake':
      return words.map(w => w.toLowerCase()).join('_')
    case 'kebab':
      return words.map(w => w.toLowerCase()).join('-')
    case 'constant':
      return words.map(w => w.toUpperCase()).join('_')
    default:
      return s
  }
}

function parseColor(str) {
  str = str.trim()
  let m = str.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (m) {
    let h = m[1]
    if (h.length === 3)
      h = h
        .split('')
        .map(c => c + c)
        .join('')
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    }
  }
  m = str.match(/rgba?\(?\s*(\d{1,3})[,\s]+(\d{1,3})[,\s]+(\d{1,3})/i)
  if (m) return { r: +m[1], g: +m[2], b: +m[3] }
  m = str.match(/hsla?\(?\s*(\d{1,3})[,\s]+(\d{1,3})%?[,\s]+(\d{1,3})/i)
  if (m) return hslToRgb(+m[1], +m[2], +m[3])
  throw new Error('无法识别的颜色格式（支持 HEX / rgb / hsl）')
}

function hslToRgb(h, s, l) {
  s /= 100
  l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255)
  }
}

function rgbToHsl({ r, g, b }) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) }
}

function toHex({ r, g, b }) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

function convertBase(str, from, to) {
  const n = parseInt(str.trim(), from)
  if (isNaN(n)) throw new Error('输入不是合法的 ' + from + ' 进制数')
  return n.toString(to)
}

function textStats(s) {
  const chars = s.length
  const noSpace = s.replace(/\s/g, '').length
  const lines = s === '' ? 0 : s.split(/\r\n|\r|\n/).length
  const bytes = new TextEncoder().encode(s).length
  const enWords = (s.match(/[A-Za-z0-9]+/g) || []).length
  const cnChars = (s.match(/[一-龥]/g) || []).length
  return (
    '字符数（含换行）：' +
    chars +
    '\n不含空白字符：' +
    noSpace +
    '\n行数：' +
    lines +
    '\n英文词数：' +
    enWords +
    '\n中文字数：' +
    cnChars +
    '\nUTF-8 字节数：' +
    bytes
  )
}

function processLines(s, opts) {
  let lines = s.split(/\r\n|\r|\n/)
  if (opts.trim) lines = lines.map(l => l.trim())
  if (opts.dropEmpty) lines = lines.filter(l => l.trim() !== '')
  if (opts.dedupe) lines = [...new Set(lines)]
  if (opts.sort) lines = lines.sort((a, b) => a.localeCompare(b, 'zh'))
  return lines.join('\n')
}

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return b64ToUtf8(s)
}

function parseJwt(str) {
  const parts = str.trim().split('.')
  if (parts.length < 2)
    throw new Error('JWT 格式不正确（需 header.payload.signature）')
  const header = JSON.parse(b64urlDecode(parts[0]))
  const payload = JSON.parse(b64urlDecode(parts[1]))
  return (
    'Header:\n' +
    JSON.stringify(header, null, 2) +
    '\n\nPayload:\n' +
    JSON.stringify(payload, null, 2)
  )
}

function timestampTransform(input, mode) {
  if (mode === 'encode') {
    const t = Date.parse(input)
    if (isNaN(t)) throw new Error('无法解析该时间字符串')
    return String(Math.floor(t / 1000))
  } else {
    const n = Number(input)
    if (!input.trim() || isNaN(n)) throw new Error('请输入数字时间戳')
    const ms = input.includes('.') || input.length > 11 ? n : n * 1000
    const d = new Date(ms)
    if (isNaN(d.getTime())) throw new Error('时间戳无效')
    return d.toLocaleString('zh-CN', { hour12: false }) + '\n' + d.toISOString()
  }
}

function formatColor(c) {
  const hsl = rgbToHsl(c)
  return (
    'HEX\t' +
    toHex(c) +
    '\nRGB\trgb(' +
    c.r +
    ', ' +
    c.g +
    ', ' +
    c.b +
    ')' +
    '\nHSL\thsl(' +
    hsl.h +
    ', ' +
    hsl.s +
    '%, ' +
    hsl.l +
    '%)'
  )
}

export function colorPreview(str) {
  return toHex(parseColor(str))
}

export function runTransform(id, input, o) {
  switch (id) {
    case 'url':
      return o.mode === 'encode'
        ? encodeURIComponent(input)
        : decodeURIComponent(input)
    case 'base64':
      return o.mode === 'encode' ? utf8ToB64(input) : b64ToUtf8(input)
    case 'html':
      return o.mode === 'encode' ? htmlEncode(input) : htmlDecode(input)
    case 'unicode':
      return o.mode === 'encode' ? toUnicode(input) : fromUnicode(input)
    case 'json': {
      const obj = JSON.parse(input)
      return o.mode === 'encode'
        ? JSON.stringify(obj, null, 2)
        : JSON.stringify(obj)
    }
    case 'timestamp':
      return timestampTransform(input, o.mode)
    case 'case':
      return toCase(input, o.caseStyle)
    case 'base':
      return convertBase(input, o.fromBase, o.toBase)
    case 'text':
      return textStats(input)
    case 'jwt':
      return parseJwt(input)
    case 'lines':
      return processLines(input, o.lineOpts)
    case 'color':
      return formatColor(parseColor(input))
    default:
      return ''
  }
}

export const simpleMeta = {
  url: { mode: true, modeLabels: ['编码', '解码'] },
  base64: { mode: true, modeLabels: ['编码', '解码'] },
  html: { mode: true, modeLabels: ['编码', '解码'] },
  unicode: { mode: true, modeLabels: ['编码', '解码'] },
  json: { mode: true, modeLabels: ['格式化', '压缩'] },
  timestamp: { mode: true, modeLabels: ['时间 → 戳', '戳 → 时间'] },
  case: { control: 'case' },
  hash: { control: 'hash' },
  base: { control: 'base' },
  lines: { control: 'lines' },
  color: {},
  text: {},
  jwt: {}
}

export const placeholderMap = {
  url: '输入待编码的文本，如：前端 开发',
  base64: '输入任意文本（支持中文）',
  html: '输入 <div>前端 & "开发"</div>',
  unicode: '输入中文或特殊字符，如：你好🌏',
  json: '粘贴 JSON，如：{"a":1,"b":[2,3]}',
  timestamp: '输入时间，如：2026-07-15 12:00:00',
  case: '输入任意命名，如：my_userName 或 user-name',
  color: '输入颜色，如：#3b82f6 或 rgb(59,130,246) 或 hsl(217,90%,59%)',
  base: '输入数字，如：255 或 FF（按左侧进制解析）',
  text: '粘贴文本，统计字符、行数、词数与字节',
  jwt: '粘贴 JWT（header.payload.signature）',
  lines: '粘贴多行文本，勾选处理方式'
}

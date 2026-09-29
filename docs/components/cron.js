const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
}
const WEEKDAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
const WEEKDAY_LABEL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const FIELD_META = {
  second: { label: '秒', every: '每秒', min: 0, max: 59 },
  minute: { label: '分', every: '每分钟', min: 0, max: 59 },
  hour: { label: '时', every: '每小时', min: 0, max: 23 },
  dom: { label: '日', every: '每日', min: 1, max: 31 },
  month: { label: '月', every: '每月', min: 1, max: 12 },
  dow: { label: '周', every: '每天', min: 0, max: 7 }
}
const MINUTE_STEPS = 366 * 24 * 60
const SECOND_STEPS = 2 * 24 * 60 * 60

function tokenValue(token, names) {
  const key = token.toLowerCase()
  if (names && Object.prototype.hasOwnProperty.call(names, key)) return names[key]
  if (!/^\d+$/.test(token)) throw new Error('无法识别：' + token)
  return Number(token)
}

function expandPart(part, min, max, names) {
  const [base, stepRaw] = part.split('/')
  const step = stepRaw == null ? 1 : Number(stepRaw)
  if (!Number.isInteger(step) || step < 1) throw new Error('步长无效：' + part)
  let start = min
  let end = max
  if (base !== '*' && base !== '?') {
    const [from, to] = base.split('-')
    start = tokenValue(from, names)
    end = to == null ? (stepRaw == null ? start : max) : tokenValue(to, names)
  }
  if (start < min || end > max || start > end) throw new Error('超出范围：' + part)
  const values = []
  for (let n = start; n <= end; n += step) values.push(n)
  return values
}

function parseField(expr, kind) {
  const meta = FIELD_META[kind]
  const names = kind === 'month' ? MONTHS : kind === 'dow' ? WEEKDAYS : null
  const values = new Set()
  for (const part of expr.split(',')) {
    if (!part) throw new Error('字段为空')
    expandPart(part.trim(), meta.min, meta.max, names).forEach(n => values.add(n))
  }
  if (kind === 'dow' && values.has(7)) {
    values.delete(7)
    values.add(0)
  }
  return [...values].sort((a, b) => a - b)
}

function isOpen(expr) {
  return expr === '*' || expr === '?'
}

function describeValues(kind, values) {
  if (kind === 'dow') return values.map(n => WEEKDAY_LABEL[n]).join('、')
  if (kind === 'hour') return values.map(n => n + ' 点').join('、')
  if (kind === 'minute') return values.map(n => '第 ' + n + ' 分').join('、')
  if (kind === 'second') return values.map(n => '第 ' + n + ' 秒').join('、')
  if (kind === 'dom') return values.map(n => n + ' 日').join('、')
  if (kind === 'month') return values.map(n => n + ' 月').join('、')
  return values.join('、')
}

function describeField(kind, expr, values) {
  const meta = FIELD_META[kind]
  if (isOpen(expr)) return meta.label + '：' + meta.every
  return meta.label + '：' + describeValues(kind, values)
}

function fieldHits(values, current) {
  return values.includes(current)
}

function matches(date, fields) {
  if (fields.second && !fieldHits(fields.second, date.getSeconds())) return false
  if (!fieldHits(fields.minute, date.getMinutes())) return false
  if (!fieldHits(fields.hour, date.getHours())) return false
  if (!fieldHits(fields.month, date.getMonth() + 1)) return false
  const domOk = fieldHits(fields.dom, date.getDate())
  const dowOk = fieldHits(fields.dow, date.getDay())
  if (!isOpen(fields.domExpr) && !isOpen(fields.dowExpr)) return domOk || dowOk
  return domOk && dowOk
}

function formatLocal(date) {
  const pad = n => String(n).padStart(2, '0')
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    ' ' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes()) +
    ':' +
    pad(date.getSeconds())
  )
}

function nextRuns(fields, hasSecond) {
  const step = hasSecond ? 1000 : 60000
  const limit = hasSecond ? SECOND_STEPS : MINUTE_STEPS
  const cursor = new Date()
  if (hasSecond) cursor.setMilliseconds(0)
  else cursor.setSeconds(0, 0)
  const found = []
  for (let i = 0; i < limit && found.length < 5; i++) {
    cursor.setTime(cursor.getTime() + step)
    if (matches(cursor, fields)) found.push(formatLocal(new Date(cursor)))
  }
  if (!found.length) throw new Error('在可搜索范围内没有匹配的触发时间')
  return found
}

function buildFields(parts) {
  const hasSecond = parts.length === 6
  const [second, minute, hour, dom, month, dow] = hasSecond ? parts : [null, ...parts]
  return {
    hasSecond,
    second: hasSecond ? parseField(second, 'second') : null,
    minute: parseField(minute, 'minute'),
    hour: parseField(hour, 'hour'),
    dom: parseField(dom, 'dom'),
    month: parseField(month, 'month'),
    dow: parseField(dow, 'dow'),
    secondExpr: second,
    minuteExpr: minute,
    hourExpr: hour,
    domExpr: dom,
    monthExpr: month,
    dowExpr: dow
  }
}

export function explainCron(input) {
  const parts = input.trim().split(/\s+/)
  if (parts.length < 5 || parts.length > 6) {
    throw new Error('需要 5 段（分 时 日 月 周）或 6 段（秒 分 时 日 月 周）')
  }
  const fields = buildFields(parts)
  const lines = [
    fields.hasSecond ? '6 段：秒 分 时 日 月 周' : '5 段：分 时 日 月 周',
    ''
  ]
  if (fields.hasSecond) lines.push(describeField('second', fields.secondExpr, fields.second))
  lines.push(describeField('minute', fields.minuteExpr, fields.minute))
  lines.push(describeField('hour', fields.hourExpr, fields.hour))
  lines.push(describeField('dom', fields.domExpr, fields.dom))
  lines.push(describeField('month', fields.monthExpr, fields.month))
  lines.push(describeField('dow', fields.dowExpr, fields.dow))
  if (!isOpen(fields.domExpr) && !isOpen(fields.dowExpr)) {
    lines.push('', '日和周都写了具体值时，满足其中之一即触发。')
  }
  lines.push('', '接下来 5 次（本机时区）：')
  nextRuns(fields, fields.hasSecond).forEach(item => lines.push(item))
  return lines.join('\n')
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderInline(text) {
  let html = escapeHtml(text)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  return html
}

function renderParagraph(lines) {
  return '<p>' + lines.map(renderInline).join('<br>') + '</p>'
}

function renderList(items, ordered) {
  const tag = ordered ? 'ol' : 'ul'
  const body = items.map(item => '<li>' + renderInline(item) + '</li>').join('')
  return '<' + tag + '>' + body + '</' + tag + '>'
}

function isListLine(line) {
  return /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)
}

function listItemText(line) {
  return line.replace(/^([-*]|\d+\.)\s+/, '')
}

function renderPlainBlocks(chunk) {
  const lines = chunk.split('\n')
  const html = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (/^#{1,6}\s+/.test(line)) {
      const level = line.match(/^#+/)[0].length
      html.push('<h' + level + '>' + renderInline(line.replace(/^#{1,6}\s+/, '')) + '</h' + level + '>')
      i++
      continue
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      html.push('<hr>')
      i++
      continue
    }
    if (line.startsWith('>')) {
      const quote = []
      while (i < lines.length && lines[i].startsWith('>')) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      html.push('<blockquote>' + renderParagraph(quote) + '</blockquote>')
      continue
    }
    if (isListLine(line)) {
      const ordered = /^\d+\.\s+/.test(line)
      const items = []
      while (i < lines.length && isListLine(lines[i])) {
        items.push(listItemText(lines[i]))
        i++
      }
      html.push(renderList(items, ordered))
      continue
    }
    const para = []
    while (i < lines.length && lines[i].trim() && !/^#{1,6}\s+/.test(lines[i]) && !lines[i].startsWith('>') && !isListLine(lines[i]) && !/^(-{3,}|\*{3,})$/.test(lines[i].trim())) {
      para.push(lines[i])
      i++
    }
    html.push(renderParagraph(para))
  }
  return html.join('\n')
}

function renderFenced(source) {
  const parts = source.split(/```/)
  return parts
    .map((part, index) => {
      if (index % 2 === 0) return renderPlainBlocks(part)
      const body = part.replace(/^[^\n]*\n/, '')
      return '<pre><code>' + escapeHtml(body.replace(/\n$/, '')) + '</code></pre>'
    })
    .join('\n')
}

export function renderMarkdown(source) {
  return renderFenced(source.replace(/\r\n/g, '\n'))
}

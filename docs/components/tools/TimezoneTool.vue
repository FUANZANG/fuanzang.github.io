<script setup>
import { ref, computed } from 'vue'

const ZONES = [
  { id: 'Asia/Shanghai', label: '北京' },
  { id: 'Asia/Tokyo', label: '东京' },
  { id: 'Asia/Singapore', label: '新加坡' },
  { id: 'UTC', label: 'UTC' },
  { id: 'Europe/London', label: '伦敦' },
  { id: 'Europe/Paris', label: '巴黎' },
  { id: 'America/New_York', label: '纽约' },
  { id: 'America/Los_Angeles', label: '洛杉矶' },
  { id: 'Australia/Sydney', label: '悉尼' }
]

const error = ref('')
const fromZone = ref('Asia/Shanghai')
const toZone = ref('America/New_York')
const wall = ref(nowInput())

function pad(n) {
  return String(n).padStart(2, '0')
}

function nowInput() {
  const date = new Date()
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes())
  )
}

function zoneParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date)
  const pick = type => Number(parts.find(part => part.type === type).value)
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second')
  }
}

function zonedToDate(value, timeZone) {
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!matched) throw new Error('时间格式无效')
  const desired = Date.UTC(+matched[1], +matched[2] - 1, +matched[3], +matched[4], +matched[5], 0)
  let utc = desired
  for (let i = 0; i < 3; i++) {
    const wallParts = zoneParts(new Date(utc), timeZone)
    const asUtc = Date.UTC(
      wallParts.year,
      wallParts.month - 1,
      wallParts.day,
      wallParts.hour,
      wallParts.minute,
      wallParts.second
    )
    utc += desired - asUtc
  }
  return new Date(utc)
}

function formatZone(date, timeZone) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

function zoneLabel(id) {
  return ZONES.find(zone => zone.id === id)?.label || id
}

const rows = computed(() => {
  error.value = ''
  if (!wall.value) return []
  try {
    const instant = zonedToDate(wall.value, fromZone.value)
    return ZONES.map(zone => ({
      id: zone.id,
      label: zone.label,
      text: formatZone(instant, zone.id),
      active: zone.id === toZone.value
    }))
  } catch (e) {
    error.value = e && e.message ? e.message : String(e)
    return []
  }
})

const summary = computed(() => {
  const target = rows.value.find(row => row.id === toZone.value)
  if (!target) return ''
  return zoneLabel(fromZone.value) + ' → ' + target.label + '：' + target.text
})

function useNow() {
  wall.value = nowInput()
}
</script>

<template>
  <div class="panel">
    <div class="tz-row">
      <label>
        墙上时间
        <input v-model="wall" type="datetime-local" />
      </label>
      <label>
        从
        <select v-model="fromZone">
          <option v-for="zone in ZONES" :key="zone.id" :value="zone.id">
            {{ zone.label }}
          </option>
        </select>
      </label>
      <label>
        到
        <select v-model="toZone">
          <option v-for="zone in ZONES" :key="'to-' + zone.id" :value="zone.id">
            {{ zone.label }}
          </option>
        </select>
      </label>
      <button type="button" class="text-btn" @click="useNow">设为现在</button>
    </div>
    <p v-if="summary" class="summary">{{ summary }}</p>
    <ul class="tz-list">
      <li v-for="row in rows" :key="row.id" :class="{ active: row.active }">
        <span>{{ row.label }}</span>
        <span>{{ row.text }}</span>
      </li>
    </ul>
    <p v-if="error" class="err">{{ error }}</p>
  </div>
</template>

<style scoped>
.panel {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  padding: 1.4rem 1.6rem;
}
.tz-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.8rem;
  margin-bottom: 1rem;
}
.tz-row label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}
.tz-row input,
.tz-row select {
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.88rem;
}
.text-btn {
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.82rem;
}
.summary {
  margin: 0 0 0.8rem;
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
}
.tz-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
}
.tz-list li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0.9rem;
  font-size: 0.88rem;
  border-top: 1px solid var(--vp-c-divider);
}
.tz-list li:first-child {
  border-top: none;
}
.tz-list li.active {
  background: color-mix(in srgb, var(--c-purple) 16%, transparent);
}
.err {
  margin-top: 1rem;
  color: #dc2626;
  font-size: 0.85rem;
}
@media (max-width: 860px) {
  .tz-row {
    flex-direction: column;
    align-items: stretch;
  }
  .tz-row input,
  .tz-row select,
  .tz-row .text-btn {
    width: 100%;
  }
  .tz-list li {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
  }
}
</style>

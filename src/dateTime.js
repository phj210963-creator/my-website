export const EVENT_TIME_ZONE = 'Asia/Hong_Kong'

export function formatEventDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('zh-HK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: EVENT_TIME_ZONE,
  }).format(date)
}

export function toEventDateTimeInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function eventDateTimeInputToIso(value) {
  if (!value) return null
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) throw new Error('日期及時間格式不正確。')
  const [, year, month, day, hour, minute, second = '00'] = match
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`)
  if (Number.isNaN(date.getTime())) throw new Error('日期及時間格式不正確。')
  return date.toISOString()
}

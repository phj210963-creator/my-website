import { useEffect, useMemo, useState } from 'react'
import {
  BellRing, CalendarDays, ChartNoAxesColumnIncreasing, Check, ClipboardCheck,
  Download, FileText, Gauge, LogOut, Mail, Menu, Pencil, Plus, QrCode,
  Search, ShieldCheck, Trash2, Upload, UserPlus, Users, WalletCards, X,
} from 'lucide-react'
import { isConfigured, supabase } from './supabase'

const navItems = [
  [Gauge, '總覽'], [CalendarDays, '活動管理'], [BellRing, '通告發佈'],
  [FileText, '報名設定'], [Users, '參加者'], [UserPlus, '會員名錄'], [ClipboardCheck, '點名'],
  [WalletCards, '付款'], [ChartNoAxesColumnIncreasing, '報表'],
  [ShieldCheck, '用戶及權限'],
]

const pageTable = {
  活動管理: 'events', 通告發佈: 'announcements', 報名設定: 'registration_settings', 參加者: 'registrations',
  會員名錄: 'members', 點名: 'attendance', 付款: 'payments', 用戶及權限: 'profiles',
}

const emptyForms = {
  events: { title: '', venue: '', starts_at: '', ends_at: '', registration_deadline: '', capacity: 100, fee: 0, status: 'draft', description: '', poster: null },
  announcements: { event_id: '', subject: '', body_html: '', status: 'draft', scheduled_for: '' },
  registration_settings: { event_id: '', form_title: '活動報名表格', instructions: '請填寫以下資料完成報名。', success_message: '報名成功，我們將以電郵與你聯絡。', require_name_zh: true, require_name_en: false, require_email: true, require_phone: true, require_organization: false, allow_guest: true, is_open: true },
  registrations: { event_id: '', profile_id: '', attendee_name_zh: '', attendee_name_en: '', attendee_email: '', attendee_phone: '', organization: '', status: 'confirmed', guest_count: 0, special_requirements: '' },
  members: { profile_id: '', membership_number: '', organization: '', title: '', joined_on: new Date().toISOString().slice(0, 10), expires_on: '', notes: '' },
  attendance: { registration_id: '', method: 'manual', notes: '' },
  payments: { registration_id: '', amount: 0, status: 'pending', provider: 'manual', provider_reference: '', paid_at: '', receipt: null },
  profiles: { full_name: '', full_name_zh: '', full_name_en: '', phone: '', role: 'member', status: 'active' },
}

const pageInfo = {
  events: ['活動', '管理活動、海報、QR Code 與報名狀態'],
  announcements: ['通告', '製作、排程及發送活動通告'],
  registration_settings: ['報名設定', '設定公開報名表格、必填欄位及開放狀態'],
  registrations: ['參加者', '建立及管理活動報名'],
  members: ['會員', '管理會員身份與機構資料'],
  attendance: ['點名', '現場登記與出席紀錄'],
  payments: ['付款', '記錄款項、狀態及收據'],
  profiles: ['用戶及權限', '設定管理員、職員及會員權限'],
}

const fmtDate = value => value ? new Date(value).toLocaleString('zh-HK') : '—'
const money = cents => `HK$ ${(Number(cents || 0) / 100).toFixed(2)}`
const clean = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined))

function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      : await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.name } } })
    setBusy(false)
    if (result.error) setMessage(result.error.message)
    else if (mode === 'signup' && !result.data.session) setMessage('帳戶已建立，請查收確認電郵。')
  }
  return <div className="auth-page"><section className="auth-card">
    <div className="auth-brand"><span className="brand-mark">J</span><span><b>聚辦</b><small>EventFlow</small></span></div>
    <h1>{mode === 'login' ? '歡迎回來' : '建立帳戶'}</h1><p>登入後管理活動、會員、報名、點名與付款。</p>
    <form onSubmit={submit}>
      {mode === 'signup' && <label>姓名<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>}
      <label>電郵<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label>
      <label>密碼<input required minLength="8" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></label>
      {message && <div className="form-message">{message}</div>}
      <button className="primary wide" disabled={busy}>{busy ? '處理中…' : mode === 'login' ? '登入' : '註冊'}</button>
    </form>
    <button className="switch-auth" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? '未有帳戶？立即註冊' : '已有帳戶？返回登入'}</button>
  </section></div>
}

function PublicRegistration({ slug }) {
  const [event, setEvent] = useState(null)
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState({ attendee_name_zh: '', attendee_name_en: '', attendee_email: '', attendee_phone: '', organization: '', guest_count: 0, special_requirements: '' })
  const [state, setState] = useState({ loading: true, busy: false, error: '', done: false })
  useEffect(() => {
    async function load() {
      const { data: ev, error } = await supabase.from('events').select('*').eq('slug', slug).eq('status', 'open').maybeSingle()
      if (error || !ev) return setState(s => ({ ...s, loading: false, error: '找不到活動，或報名已經截止。' }))
      const { data: config } = await supabase.from('registration_settings').select('*').eq('event_id', ev.id).maybeSingle()
      setEvent(ev); setSettings(config || emptyForms.registration_settings); setState(s => ({ ...s, loading: false }))
    }
    load()
  }, [slug])
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))
  async function submit(e) {
    e.preventDefault(); setState(s => ({ ...s, busy: true, error: '' }))
    const { error } = await supabase.from('registrations').insert({
      event_id: event.id, profile_id: null, source: 'public_link', status: 'pending',
      attendee_name_zh: form.attendee_name_zh, attendee_name_en: form.attendee_name_en,
      attendee_email: form.attendee_email, attendee_phone: form.attendee_phone,
      organization: form.organization, guest_count: Number(form.guest_count || 0),
      special_requirements: form.special_requirements,
    })
    setState(s => ({ ...s, busy: false, done: !error, error: error?.message || '' }))
  }
  if (state.loading) return <div className="loading-page">正在載入報名表格…</div>
  if (state.error && !event) return <div className="public-page"><section className="public-card"><h1>未能報名</h1><p>{state.error}</p></section></div>
  if (!settings?.is_open) return <div className="public-page"><section className="public-card"><h1>報名已截止</h1><p>多謝你的關注。</p></section></div>
  if (state.done) return <div className="public-page"><section className="public-card success-card"><span className="success-icon"><Check size={32}/></span><h1>報名完成</h1><p>{settings?.success_message}</p><b>{event.title}</b></section></div>
  return <div className="public-page"><section className="public-card">
    <div className="auth-brand"><span className="brand-mark">J</span><span><b>聚辦</b><small>EventFlow</small></span></div>
    <p className="eyebrow">公開活動報名</p><h1>{settings?.form_title || '活動報名表格'}</h1>
    <div className="public-event"><b>{event.title}</b><span>{fmtDate(event.starts_at)} · {event.venue}</span></div>
    <p className="public-instructions">{settings?.instructions}</p>
    <form className="data-form" onSubmit={submit}>
      <div className="form-grid">
        <Input label="參加者中文姓名" required={settings?.require_name_zh} value={form.attendee_name_zh} onChange={v => set('attendee_name_zh', v)}/>
        <Input label="Participant Name (English)" required={settings?.require_name_en} value={form.attendee_name_en} onChange={v => set('attendee_name_en', v)}/>
      </div>
      <div className="form-grid">
        <Input label="電郵" type="email" required={settings?.require_email} value={form.attendee_email} onChange={v => set('attendee_email', v)}/>
        <Input label="電話" required={settings?.require_phone} value={form.attendee_phone} onChange={v => set('attendee_phone', v)}/>
      </div>
      <Input label="公司／機構" required={settings?.require_organization} value={form.organization} onChange={v => set('organization', v)}/>
      <Input label="同行人數（不包括自己）" type="number" value={form.guest_count} onChange={v => set('guest_count', v)}/>
      <Input label="飲食需要／特別要求" rows={3} value={form.special_requirements} onChange={v => set('special_requirements', v)}/>
      {state.error && <div className="form-message">{state.error}</div>}
      <button className="primary wide" disabled={state.busy}>{state.busy ? '提交中…' : '提交報名'}</button>
    </form>
    <small className="privacy-note">此表格只供活動報名。參加者毋須是會員，亦不能瀏覽管理功能。</small>
  </section></div>
}

function Sidebar({ open, close, active, setActive, profile }) {
  const initials = (profile?.full_name || profile?.email || 'U').slice(0, 2).toUpperCase()
  return <><button className={`scrim ${open ? 'show' : ''}`} onClick={close}/>
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark">J</span><span><b>聚辦</b><small>EventFlow</small></span><button className="mobile-close" onClick={close}><X size={20}/></button></div>
      <nav>{navItems.map(([Icon, label]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); close() }}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <div className="profile"><p>目前權限</p><span className="role">{profile?.role || 'member'}</span><div className="profile-row"><span className="avatar">{initials}</span><span><b>{profile?.full_name || 'EventFlow 用戶'}</b><small>{profile?.email}</small></span></div><button className="logout" onClick={() => supabase.auth.signOut()}><LogOut size={17}/>登出</button></div>
    </aside></>
}

function Modal({ title, close, children }) {
  return <div className="modal-backdrop" onMouseDown={close}><section className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={close}><X size={19}/></button></div>{children}</section></div>
}

function Input({ label, type = 'text', value = '', onChange, options, required, rows, accept }) {
  return <label>{label}{options
    ? <select value={value || ''} onChange={e => onChange(e.target.value)} required={required}><option value="">請選擇</option>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
    : rows ? <textarea rows={rows} value={value || ''} onChange={e => onChange(e.target.value)} required={required}/>
    : <input type={type} value={type === 'file' ? undefined : value || ''} onChange={e => onChange(type === 'file' ? e.target.files[0] : e.target.value)} required={required} accept={accept}/>}</label>
}

async function addQrToPoster(file, url) {
  if (!file?.type?.startsWith('image/') || !window.QRCode) return file
  const image = await createImageBitmap(file)
  const holder = document.createElement('div')
  new window.QRCode(holder, { text: url, width: 360, height: 360 })
  await new Promise(resolve => setTimeout(resolve, 60))
  const qrCanvas = holder.querySelector('canvas')
  if (!qrCanvas) return file
  const canvas = document.createElement('canvas')
  canvas.width = image.width; canvas.height = image.height
  const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0)
  const size = Math.max(180, Math.min(image.width, image.height) * .22)
  const pad = Math.max(20, size * .12)
  ctx.fillStyle = '#fff'; ctx.fillRect(image.width - size - pad * 2, image.height - size - pad * 2, size + pad * 2, size + pad * 2)
  ctx.drawImage(qrCanvas, image.width - size - pad, image.height - size - pad, size, size)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', .95))
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-with-registration-qr.png`, { type: 'image/png' })
}

function EntityForm({ table, value, lookups, user, close, refresh, notify }) {
  const [form, setForm] = useState(value ? toForm(table, value) : { ...emptyForms[table] })
  const [busy, setBusy] = useState(false)
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const opts = (rows, label) => rows.map(r => ({ value: r.id, label: label(r) }))
  async function upload(bucket, file, folder = '') {
    if (!file) return null
    const safe = file.name.replace(/[^\w.-]/g, '-')
    const path = `${folder}${Date.now()}-${safe}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) throw error
    return path
  }
  async function save(e) {
    e.preventDefault(); setBusy(true)
    try {
      let payload = {}
      if (table === 'events') {
        payload = clean({ title: form.title, venue: form.venue, starts_at: form.starts_at, ends_at: form.ends_at, registration_deadline: form.registration_deadline, capacity: Number(form.capacity), fee_cents: Math.round(Number(form.fee) * 100), status: form.status, description: form.description, created_by: user.id })
        if (!value) payload.slug = `${form.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')}-${Date.now()}`
        if (form.poster) {
          const slug = payload.slug || value.slug
          const poster = await addQrToPoster(form.poster, `${location.origin}/?register=${slug}`)
          payload.poster_path = await upload('event-posters', poster)
        }
      } else if (table === 'announcements') payload = clean({ event_id: form.event_id, subject: form.subject, body_html: form.body_html, status: form.status, scheduled_for: form.scheduled_for, sent_at: form.status === 'sent' ? new Date().toISOString() : null, created_by: user.id })
      else if (table === 'registration_settings') payload = { event_id: form.event_id, form_title: form.form_title, instructions: form.instructions, success_message: form.success_message, require_name_zh: Boolean(form.require_name_zh), require_name_en: Boolean(form.require_name_en), require_email: Boolean(form.require_email), require_phone: Boolean(form.require_phone), require_organization: Boolean(form.require_organization), allow_guest: Boolean(form.allow_guest), is_open: Boolean(form.is_open) }
      else if (table === 'registrations') payload = clean({ event_id: form.event_id, profile_id: form.profile_id || null, attendee_name_zh: form.attendee_name_zh, attendee_name_en: form.attendee_name_en, attendee_email: form.attendee_email, attendee_phone: form.attendee_phone, organization: form.organization, status: form.status, guest_count: Number(form.guest_count), special_requirements: form.special_requirements, source: 'admin' })
      else if (table === 'members') payload = clean({ profile_id: form.profile_id, membership_number: form.membership_number, organization: form.organization, title: form.title, joined_on: form.joined_on, expires_on: form.expires_on, notes: form.notes })
      else if (table === 'attendance') payload = clean({ registration_id: form.registration_id, method: form.method, notes: form.notes, checked_in_by: user.id, checked_in_at: new Date().toISOString() })
      else if (table === 'payments') {
        const reg = lookups.registrations.find(r => r.id === form.registration_id)
        payload = clean({ registration_id: form.registration_id, profile_id: reg?.profile_id, amount_cents: Math.round(Number(form.amount) * 100), status: form.status, provider: form.provider, provider_reference: form.provider_reference || `manual-${Date.now()}`, paid_at: form.status === 'paid' ? (form.paid_at || new Date().toISOString()) : null })
        if (form.receipt) payload.receipt_path = await upload('payment-receipts', form.receipt, `${reg?.profile_id || 'guest'}/`)
      } else if (table === 'profiles') payload = clean({ full_name: form.full_name, full_name_zh: form.full_name_zh, full_name_en: form.full_name_en, phone: form.phone, role: form.role, status: form.status })
      const query = table === 'registration_settings'
        ? supabase.from(table).upsert(payload, { onConflict: 'event_id' })
        : value ? supabase.from(table).update(payload).eq('id', value.id) : supabase.from(table).insert(payload)
      const { error } = await query
      if (error) throw error
      notify(`${pageInfo[table][0]}已儲存`, 'success'); await refresh(); close()
    } catch (err) { notify(err.message, 'error') } finally { setBusy(false) }
  }
  const events = opts(lookups.events, r => r.title)
  const profiles = opts(lookups.profiles, r => `${r.full_name || r.email} · ${r.email}`)
  const regs = opts(lookups.registrations, r => `${r.profiles?.full_name || r.profiles?.email || '參加者'} · ${r.events?.title || '活動'}`)
  return <form className="data-form" onSubmit={save}>
    {table === 'events' && <><Input label="活動名稱" required value={form.title} onChange={v => set('title', v)}/><Input label="地點" value={form.venue} onChange={v => set('venue', v)}/><div className="form-grid"><Input label="開始時間" type="datetime-local" required value={form.starts_at} onChange={v => set('starts_at', v)}/><Input label="結束時間" type="datetime-local" value={form.ends_at} onChange={v => set('ends_at', v)}/></div><div className="form-grid"><Input label="截止報名" type="datetime-local" value={form.registration_deadline} onChange={v => set('registration_deadline', v)}/><Input label="名額" type="number" required value={form.capacity} onChange={v => set('capacity', v)}/></div><div className="form-grid"><Input label="費用（HKD）" type="number" value={form.fee} onChange={v => set('fee', v)}/><Input label="狀態" value={form.status} onChange={v => set('status', v)} options={enumOpts(['draft','open','closed','completed','cancelled'])}/></div><Input label="活動簡介" rows={4} value={form.description} onChange={v => set('description', v)}/><Input label="活動 Poster（圖片/PDF）" type="file" accept="image/*,.pdf" onChange={v => set('poster', v)}/></>}
    {table === 'announcements' && <><Input label="相關活動" value={form.event_id} onChange={v => set('event_id', v)} options={events}/><Input label="主旨" required value={form.subject} onChange={v => set('subject', v)}/><Input label="通告內容" required rows={7} value={form.body_html} onChange={v => set('body_html', v)}/><div className="form-grid"><Input label="狀態" value={form.status} onChange={v => set('status', v)} options={enumOpts(['draft','scheduled','sent'])}/><Input label="排程時間" type="datetime-local" value={form.scheduled_for} onChange={v => set('scheduled_for', v)}/></div></>}
    {table === 'registration_settings' && <><Input label="活動" required value={form.event_id} onChange={v => set('event_id', v)} options={events}/><Input label="表格標題" required value={form.form_title} onChange={v => set('form_title', v)}/><Input label="報名說明" rows={4} value={form.instructions} onChange={v => set('instructions', v)}/><Input label="成功訊息" rows={3} value={form.success_message} onChange={v => set('success_message', v)}/><div className="check-grid">{[['require_name_zh','中文姓名必填'],['require_name_en','英文姓名必填'],['require_email','電郵必填'],['require_phone','電話必填'],['require_organization','機構必填'],['allow_guest','接受非會員'],['is_open','開放報名']].map(([key,label]) => <label className="check-field" key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={e => set(key, e.target.checked)}/>{label}</label>)}</div></>}
    {table === 'registrations' && <><Input label="活動" required value={form.event_id} onChange={v => set('event_id', v)} options={events}/><Input label="會員帳戶（非會員可留空）" value={form.profile_id} onChange={v => set('profile_id', v)} options={profiles}/><div className="form-grid"><Input label="中文姓名" value={form.attendee_name_zh} onChange={v => set('attendee_name_zh', v)}/><Input label="英文姓名" value={form.attendee_name_en} onChange={v => set('attendee_name_en', v)}/></div><div className="form-grid"><Input label="電郵" type="email" value={form.attendee_email} onChange={v => set('attendee_email', v)}/><Input label="電話" value={form.attendee_phone} onChange={v => set('attendee_phone', v)}/></div><Input label="公司／機構" value={form.organization} onChange={v => set('organization', v)}/><div className="form-grid"><Input label="狀態" value={form.status} onChange={v => set('status', v)} options={enumOpts(['pending','confirmed','cancelled','waitlisted'])}/><Input label="同行人數" type="number" value={form.guest_count} onChange={v => set('guest_count', v)}/></div><Input label="特別要求" rows={3} value={form.special_requirements} onChange={v => set('special_requirements', v)}/></>}
    {table === 'members' && <><Input label="用戶帳戶" required value={form.profile_id} onChange={v => set('profile_id', v)} options={profiles}/><Input label="會員編號" required value={form.membership_number} onChange={v => set('membership_number', v)}/><div className="form-grid"><Input label="機構" value={form.organization} onChange={v => set('organization', v)}/><Input label="職銜" value={form.title} onChange={v => set('title', v)}/></div><div className="form-grid"><Input label="加入日期" type="date" required value={form.joined_on} onChange={v => set('joined_on', v)}/><Input label="到期日" type="date" value={form.expires_on} onChange={v => set('expires_on', v)}/></div><Input label="備註" rows={3} value={form.notes} onChange={v => set('notes', v)}/></>}
    {table === 'attendance' && <><Input label="報名紀錄" required value={form.registration_id} onChange={v => set('registration_id', v)} options={regs}/><Input label="點名方式" value={form.method} onChange={v => set('method', v)} options={enumOpts(['manual','qr','import'])}/><Input label="備註" rows={3} value={form.notes} onChange={v => set('notes', v)}/></>}
    {table === 'payments' && <><Input label="報名紀錄" required value={form.registration_id} onChange={v => set('registration_id', v)} options={regs}/><div className="form-grid"><Input label="金額（HKD）" type="number" required value={form.amount} onChange={v => set('amount', v)}/><Input label="狀態" value={form.status} onChange={v => set('status', v)} options={enumOpts(['pending','paid','failed','refunded','waived'])}/></div><div className="form-grid"><Input label="付款方式" value={form.provider} onChange={v => set('provider', v)} options={enumOpts(['manual','cash','bank_transfer','cheque','stripe'])}/><Input label="交易編號" value={form.provider_reference} onChange={v => set('provider_reference', v)}/></div><Input label="收據（圖片/PDF）" type="file" accept="image/*,.pdf" onChange={v => set('receipt', v)}/></>}
    {table === 'profiles' && <><div className="form-grid"><Input label="中文姓名" value={form.full_name_zh} onChange={v => set('full_name_zh', v)}/><Input label="Name in English" value={form.full_name_en} onChange={v => set('full_name_en', v)}/></div><Input label="显示姓名" required value={form.full_name} onChange={v => set('full_name', v)}/><Input label="電話" value={form.phone} onChange={v => set('phone', v)}/><div className="form-grid"><Input label="權限" value={form.role} onChange={v => set('role', v)} options={enumOpts(['admin','staff','member'])}/><Input label="狀態" value={form.status} onChange={v => set('status', v)} options={enumOpts(['active','inactive','suspended'])}/></div></>}
    <button className="primary wide" disabled={busy}>{busy ? '儲存中…' : '儲存'}</button>
  </form>
}

function enumOpts(values) { return values.map(v => ({ value: v, label: v })) }
function localDate(value) { return value ? new Date(value).toISOString().slice(0, 16) : '' }
function toForm(table, row) {
  if (table === 'events') return { ...row, starts_at: localDate(row.starts_at), ends_at: localDate(row.ends_at), registration_deadline: localDate(row.registration_deadline), fee: Number(row.fee_cents || 0) / 100, poster: null }
  if (table === 'payments') return { ...row, amount: Number(row.amount_cents || 0) / 100, paid_at: localDate(row.paid_at), receipt: null }
  if (table === 'announcements') return { ...row, scheduled_for: localDate(row.scheduled_for) }
  return { ...row }
}

function Dashboard({ data, setActive }) {
  const stats = [
    ['已報名', data.registrations.length, Users, 'green'], ['已付款', data.payments.filter(x => x.status === 'paid').length, WalletCards, 'blue'],
    ['會員', data.members.length, UserPlus, 'purple'], ['活動', data.events.length, FileText, 'orange'],
  ]
  const event = data.events.find(x => x.status === 'open') || data.events[0]
  const eventRegs = data.registrations.filter(x => x.event_id === event?.id).length
  const pct = event?.capacity ? Math.round(eventRegs / event.capacity * 100) : 0
  return <><div className="stat-grid">{stats.map(([label, value, Icon, color]) => <article className="stat-card" key={label}><span className={`icon-box ${color}`}><Icon size={21}/></span><div><p>{label}</p><strong>{value}</strong></div></article>)}</div>
    <div className="two-col lead-row"><article className="card event-card"><div className="eyebrow-row"><p className="eyebrow">目前活動</p><span className="status">{event?.status || '未有活動'}</span></div><h2>{event?.title || '建立第一個活動'}</h2><p className="muted"><CalendarDays size={16}/>{event ? `${fmtDate(event.starts_at)} · ${event.venue || '待定'}` : '開始管理你的活動'}</p><div className="capacity"><strong>{eventRegs}</strong><span>/ {event?.capacity || 0} 人</span><b>{pct}% 已滿</b></div><div className="progress"><i style={{ width: `${Math.min(100, pct)}%` }}/></div></article>
    <article className="card quick-card"><p className="eyebrow">快捷操作</p><h2>日常營運</h2><div className="quick-stack"><button onClick={() => setActive('參加者')}><Users size={18}/>管理報名</button><button onClick={() => setActive('點名')}><ClipboardCheck size={18}/>現場點名</button><button onClick={() => setActive('付款')}><WalletCards size={18}/>付款紀錄</button></div></article></div></>
}

function RowContent({ table, row }) {
  if (table === 'events') return <><b>{row.title}</b><span>{fmtDate(row.starts_at)} · {row.venue || '地點待定'}</span><em>{row.status} · {money(row.fee_cents)}</em></>
  if (table === 'registration_settings') return <><b>{row.events?.title || '活動報名設定'}</b><span>{row.form_title}</span><em>{row.is_open ? '開放報名' : '暫停報名'}</em></>
  if (table === 'announcements') return <><b>{row.subject}</b><span>{row.events?.title || '一般通告'} · {fmtDate(row.scheduled_for || row.sent_at)}</span><em>{row.status}</em></>
  if (table === 'registrations') return <><b>{row.attendee_name_zh || row.attendee_name_en || row.profiles?.full_name || row.profiles?.email || '非會員參加者'}</b><span>{row.attendee_email || row.profiles?.email || '沒有電郵'} · {row.events?.title} · {fmtDate(row.registered_at)}</span><em>{row.status}</em></>
  if (table === 'members') return <><b>{row.profiles?.full_name || row.profiles?.email}</b><span>{row.membership_number} · {row.organization || '—'}</span><em>{row.expires_on ? `到期 ${row.expires_on}` : '永久'}</em></>
  if (table === 'attendance') return <><b>{row.registrations?.attendee_name_zh || row.registrations?.attendee_name_en || row.registrations?.profiles?.full_name || row.registrations?.profiles?.email || '參加者'}</b><span>{row.registrations?.events?.title} · {fmtDate(row.checked_in_at)}</span><em>{row.method}</em></>
  if (table === 'payments') return <><b>{row.registrations?.attendee_name_zh || row.registrations?.attendee_name_en || row.profiles?.full_name || row.profiles?.email || '付款人'}</b><span>{money(row.amount_cents)} · {row.provider || '—'} · {fmtDate(row.paid_at)}</span><em>{row.status}</em></>
  return <><b>{[row.full_name_zh, row.full_name_en].filter(Boolean).join(' / ') || row.full_name || row.email}</b><span>{row.email} · {row.phone || '—'}</span><em>{row.role} · {row.status}</em></>
}

function Manager({ table, rows, lookups, user, refresh, notify, profile }) {
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const filtered = rows.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
  const canWrite = profile?.role === 'admin' || profile?.role === 'staff'
  async function remove(row) {
    if (!confirm(`確定刪除這筆${pageInfo[table][0]}資料？`)) return
    const { error } = await supabase.from(table).delete().eq('id', row.id)
    if (error) notify(error.message, 'error'); else { notify('已刪除', 'success'); refresh() }
  }
  function qr(row) {
    const url = table === 'events' ? `${location.origin}/?register=${row.slug}` : `${location.origin}/?checkin=${row.qr_token}`
    setEditing({ qr: true, url, title: row.events?.title || row.title || 'EventFlow QR Code' })
  }
  function emailAnnouncement(row) {
    const recipients = lookups.profiles.map(p => p.email).filter(Boolean).join(',')
    window.location.href = `mailto:?bcc=${encodeURIComponent(recipients)}&subject=${encodeURIComponent(row.subject)}&body=${encodeURIComponent(row.body_html.replace(/<[^>]+>/g, ''))}`
  }
  return <article className="card records-card">
    <div className="manager-head"><div><p className="eyebrow">即時資料</p><h2>{pageInfo[table][0]}</h2><small>{pageInfo[table][1]}</small></div><div className="manager-actions"><label className="mini-search"><Search size={15}/><input placeholder="搜尋" value={search} onChange={e => setSearch(e.target.value)}/></label>{canWrite && <button className="primary" onClick={() => setEditing({})}><Plus size={17}/>新增</button>}</div></div>
    <div className="record-list">{filtered.length === 0 ? <p className="empty">暫時未有資料。</p> : filtered.map(row => <div className="record-row" key={row.id || row.event_id}><div className="record-main"><RowContent table={table} row={row}/></div><div className="row-buttons">
      {(table === 'registrations' || table === 'events') && <button title="QR Code" onClick={() => qr(row)}><QrCode size={16}/></button>}
      {table === 'announcements' && <button title="發送電郵" onClick={() => emailAnnouncement(row)}><Mail size={16}/></button>}
      {canWrite && <button title="編輯" onClick={() => setEditing(row)}><Pencil size={16}/></button>}
      {canWrite && !['profiles','registration_settings'].includes(table) && <button title="刪除" className="danger" onClick={() => remove(row)}><Trash2 size={16}/></button>}
    </div></div>)}</div>
    {editing && !editing.qr && <Modal title={`${editing.id || editing.event_id ? '編輯' : '新增'}${pageInfo[table][0]}`} close={() => setEditing(null)}><EntityForm table={table} value={editing.id || editing.event_id ? editing : null} lookups={lookups} user={user} close={() => setEditing(null)} refresh={refresh} notify={notify}/></Modal>}
    {editing?.qr && <Modal title={editing.title} close={() => setEditing(null)}><QrPanel value={editing.url}/></Modal>}
  </article>
}

function QrPanel({ value }) {
  const ref = element => {
    if (element && window.QRCode) { element.innerHTML = ''; new window.QRCode(element, { text: value, width: 220, height: 220 }) }
  }
  return <div className="qr-panel"><div ref={ref}/><p>{value}</p><button className="secondary" onClick={() => navigator.clipboard.writeText(value)}>複製連結</button></div>
}

function Reports({ data }) {
  function exportCsv(name, rows) {
    if (!rows.length) return
    const keys = Object.keys(rows[0]).filter(k => !k.includes('profiles') && !k.includes('events'))
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = `${name}-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  }
  const total = data.payments.filter(x => x.status === 'paid').reduce((s, x) => s + Number(x.amount_cents), 0)
  const paidIds = new Set(data.payments.filter(x => ['paid','waived'].includes(x.status)).map(x => x.registration_id))
  const outstanding = data.registrations.filter(r => r.status !== 'cancelled' && Number(r.events?.fee_cents) > 0 && !paidIds.has(r.id)).map(r => ({
    participant: r.attendee_name_zh || r.attendee_name_en || r.profiles?.full_name || r.profiles?.email || '參加者',
    email: r.attendee_email || r.profiles?.email || '',
    event: r.events?.title || '',
    amount_due_hkd: (Number(r.events?.fee_cents) / 100).toFixed(2),
    registered_at: r.registered_at,
  }))
  const due = outstanding.reduce((s, r) => s + Number(r.amount_due_hkd) * 100, 0)
  return <div className="report-grid"><article className="card report-summary"><p className="eyebrow">財務摘要</p><h2>已收款項</h2><strong>{money(total)}</strong><span>{data.payments.filter(x => x.status === 'paid').length} 筆已付款紀錄</span></article>
    <article className="card report-summary outstanding"><p className="eyebrow">應收未收</p><h2>尚欠款項</h2><strong>{money(due)}</strong><span>{outstanding.length} 筆待收款</span><button className="secondary" onClick={() => exportCsv('應收未收款項', outstanding)}>匯出報表</button></article>
    {[['活動',data.events],['報名',data.registrations],['會員',data.members],['點名',data.attendance],['付款',data.payments]].map(([name,rows]) => <article className="card export-card" key={name}><span className="icon-box green"><Download size={19}/></span><div><b>{name}報表</b><small>{rows.length} 筆資料</small></div><button className="secondary" onClick={() => exportCsv(name, rows)}>匯出 CSV</button></article>)}</div>
}

function Toast({ toast }) { return toast && <div className={`toast ${toast.type}`}><Check size={16}/>{toast.text}</div> }

function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [active, setActive] = useState('總覽')
  const [menu, setMenu] = useState(false)
  const [profile, setProfile] = useState(null)
  const [data, setData] = useState({ events: [], profiles: [], registrations: [], members: [], attendance: [], payments: [], announcements: [], registration_settings: [] })
  const [toast, setToast] = useState(null)
  const notify = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500) }
  useEffect(() => {
    if (!isConfigured) { setChecking(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  async function refresh() {
    if (!session) return
    const queries = await Promise.all([
      supabase.from('events').select('*').order('starts_at'),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('registrations').select('*, profiles(full_name,full_name_zh,full_name_en,email), events(title,fee_cents)').order('registered_at', { ascending: false }),
      supabase.from('members').select('*, profiles(full_name,email)').order('created_at', { ascending: false }),
      supabase.from('attendance').select('*, registrations(attendee_name_zh,attendee_name_en,profiles(full_name,email),events(title))').order('checked_in_at', { ascending: false }),
      supabase.from('payments').select('*, profiles(full_name,email), registrations(attendee_name_zh,attendee_name_en,attendee_email)').order('created_at', { ascending: false }),
      supabase.from('announcements').select('*, events(title)').order('created_at', { ascending: false }),
      supabase.from('registration_settings').select('*, events(title)').order('updated_at', { ascending: false }),
    ])
    const next = { events: queries[0].data || [], profiles: queries[1].data || [], registrations: queries[2].data || [], members: queries[3].data || [], attendance: queries[4].data || [], payments: queries[5].data || [], announcements: queries[6].data || [], registration_settings: queries[7].data || [] }
    setData(next); setProfile(next.profiles.find(p => p.id === session.user.id) || null)
    const err = queries.find(q => q.error)?.error; if (err) notify(err.message, 'error')
  }
  useEffect(() => { refresh() }, [session])
  const titleDate = useMemo(() => new Intl.DateTimeFormat('zh-HK', { dateStyle: 'long' }).format(new Date()), [])
  const publicSlug = new URLSearchParams(location.search).get('register')
  if (!isConfigured) return <div className="setup-error">尚未設定 Supabase 環境變數。</div>
  if (publicSlug) return <PublicRegistration slug={publicSlug}/>
  if (checking) return <div className="loading-page">正在載入 EventFlow…</div>
  if (!session) return <Login/>
  const table = pageTable[active]
  return <div className="app-shell"><Sidebar open={menu} close={() => setMenu(false)} active={active} setActive={setActive} profile={profile}/><main>
    <header className="topbar"><button className="menu-button" onClick={() => setMenu(true)}><Menu size={22}/></button><div><p>{titleDate}</p><h1>{active}</h1></div><div className="header-actions"><span className="live-dot">● 雲端已同步</span></div></header>
    <section className="content">{active === '總覽' ? <Dashboard data={data} setActive={setActive}/> : active === '報表' ? <Reports data={data}/> : <Manager table={table} rows={data[table]} lookups={data} user={session.user} refresh={refresh} notify={notify} profile={profile}/>}</section>
    <Toast toast={toast}/>
  </main></div>
}

export default App

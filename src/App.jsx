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
  members: { profile_id: '', name_zh: '', name_en: '', email: '', phone: '', membership_number: '', organization: '', title: '', joined_on: new Date().toISOString().slice(0, 10), expires_on: '', member_status: 'active', notes: '' },
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
  const labelHeight = Math.max(34, size * .18)
  ctx.fillStyle = '#fff'; ctx.fillRect(image.width - size - pad * 2, image.height - size - pad * 2 - labelHeight, size + pad * 2, size + pad * 2 + labelHeight)
  ctx.drawImage(qrCanvas, image.width - size - pad, image.height - size - pad - labelHeight, size, size)
  ctx.fillStyle = '#164f45'; ctx.font = `600 ${Math.max(12, size * .055)}px sans-serif`; ctx.textAlign = 'center'
  ctx.fillText('掃描 QR Code 或點擊電郵內連結報名', image.width - size / 2 - pad, image.height - pad - 6, size + pad)
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
      else if (table === 'members') payload = clean({ profile_id: form.profile_id || null, name_zh: form.name_zh, name_en: form.name_en, email: form.email, phone: form.phone, membership_number: form.membership_number, organization: form.organization, title: form.title, joined_on: form.joined_on, expires_on: form.expires_on, member_status: form.member_status, notes: form.notes })
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
    {table === 'members' && <><div className="form-grid"><Input label="中文姓名" required value={form.name_zh} onChange={v => set('name_zh', v)}/><Input label="Name in English" required value={form.name_en} onChange={v => set('name_en', v)}/></div><div className="form-grid"><Input label="電郵地址" type="email" required value={form.email} onChange={v => set('email', v)}/><Input label="手提電話" value={form.phone} onChange={v => set('phone', v)}/></div><Input label="連結用戶帳戶（可選）" value={form.profile_id} onChange={v => set('profile_id', v)} options={profiles}/><Input label="會員編號" required value={form.membership_number} onChange={v => set('membership_number', v)}/><div className="form-grid"><Input label="公司／機構" value={form.organization} onChange={v => set('organization', v)}/><Input label="職位" value={form.title} onChange={v => set('title', v)}/></div><div className="form-grid"><Input label="加入日期" type="date" required value={form.joined_on} onChange={v => set('joined_on', v)}/><Input label="會員狀態" value={form.member_status} onChange={v => set('member_status', v)} options={[{value:'active',label:'有效'},{value:'pending',label:'待確認'},{value:'inactive',label:'停用'}]}/></div><Input label="備註" rows={3} value={form.notes} onChange={v => set('notes', v)}/></>}
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

function MemberDirectory({ data, user, profile, refresh, notify }) {
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const rows = data.members.filter(row => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()))
  const active = data.members.filter(row => row.member_status === 'active').length
  return <div className="feature-page">
    <div className="feature-head"><div><p className="eyebrow">MEMBER DATABASE</p><h2>會員名錄</h2><span>會員資料可獨立建立，不需要先開設登入帳戶。</span></div><button className="primary" onClick={() => setEditing({})}><Plus size={17}/>新增會員</button></div>
    <div className="stat-grid mini-stats"><article className="stat-card"><span className="icon-box green"><Users size={20}/></span><div><p>會員總數</p><strong>{data.members.length}</strong></div></article><article className="stat-card"><span className="icon-box blue"><Check size={20}/></span><div><p>有效會員</p><strong>{active}</strong></div></article><article className="stat-card"><span className="icon-box orange"><UserPlus size={20}/></span><div><p>待確認資料</p><strong>{data.members.filter(x => x.member_status === 'pending').length}</strong></div></article></div>
    <article className="card directory-card"><div className="manager-actions"><label className="mini-search"><Search size={15}/><input placeholder="搜尋姓名、公司、電郵或會員編號..." value={search} onChange={e => setSearch(e.target.value)}/></label></div>
      <div className="table-scroll"><table className="directory-table"><thead><tr><th>會員</th><th>公司及職位</th><th>聯絡資料</th><th>入會日期</th><th>狀態</th><th>操作</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><b>{row.name_zh || row.profiles?.full_name_zh || '—'}</b><small>{row.name_en || row.profiles?.full_name_en || row.profiles?.full_name || '—'} · {row.membership_number}</small></td><td>{row.organization || '—'}<small>{row.title || '—'}</small></td><td>{row.phone || row.profiles?.phone || '—'}<small>{row.email || row.profiles?.email || '—'}</small></td><td>{row.joined_on || '—'}</td><td><span className="status">{row.member_status === 'active' ? '有效' : row.member_status === 'pending' ? '待確認' : '停用'}</span></td><td><button className="icon-action" onClick={() => setEditing(row)}><Pencil size={16}/></button></td></tr>)}</tbody></table></div>
    </article>
    {editing && <Modal title={editing.id ? '編輯會員' : '新增會員'} close={() => setEditing(null)}><EntityForm table="members" value={editing.id ? editing : null} lookups={data} user={user} close={() => setEditing(null)} refresh={refresh} notify={notify}/></Modal>}
  </div>
}

function AttendanceBoard({ data, user, refresh, notify }) {
  const event = data.events.find(x => x.status === 'open') || data.events[0]
  const rows = data.registrations.filter(x => !event || x.event_id === event.id)
  const checked = new Map(data.attendance.map(x => [x.registration_id, x]))
  async function toggle(row) {
    const current = checked.get(row.id)
    const result = current
      ? await supabase.from('attendance').delete().eq('id', current.id)
      : await supabase.from('attendance').insert({ registration_id: row.id, checked_in_by: user.id, method: 'manual' })
    if (result.error) notify(result.error.message, 'error'); else { notify(current ? '已取消點名' : '已完成點名'); refresh() }
  }
  return <div className="feature-page attendance-page"><div className="feature-head"><div><p className="eyebrow">ATTENDANCE</p><h2>即場點名</h2><span>{event?.title || '所有活動'} · {event ? fmtDate(event.starts_at) : ''}</span></div><button className="secondary print-hide" onClick={() => window.print()}><Download size={17}/>列印點名表</button></div>
    <article className="card checkin-list">{rows.length ? rows.map(row => { const name = row.attendee_name_zh || row.attendee_name_en || row.profiles?.full_name || row.profiles?.email || '參加者'; const done = checked.has(row.id); const paid = data.payments.some(p => p.registration_id === row.id && p.status === 'paid'); return <div className="checkin-row" key={row.id}><span className="avatar">{name.slice(0,1)}</span><div><b>{name}</b><small>{row.qr_token?.slice(0,8).toUpperCase()} · {row.attendee_phone || '沒有電話'}</small></div><span className={`payment-pill ${paid ? 'paid' : ''}`}>{paid ? '已付款' : '待付款'}</span><button className={done ? 'checked-button' : 'primary'} onClick={() => toggle(row)}>{done ? <><Check size={16}/>已點名</> : '點名'}</button></div>}) : <p className="empty">這個活動暫時未有報名紀錄。</p>}</article>
  </div>
}

async function qrDataUrl(url) {
  const holder = document.createElement('div')
  new window.QRCode(holder, { text: url, width: 500, height: 500 })
  await new Promise(resolve => setTimeout(resolve, 50))
  return holder.querySelector('canvas')?.toDataURL('image/png')
}

async function createDigitalNotice(file, url) {
  const qrUrl = await qrDataUrl(url)
  if (file.type === 'application/pdf' && window.PDFLib && qrUrl) {
    const pdf = await window.PDFLib.PDFDocument.load(await file.arrayBuffer())
    const page = pdf.getPages()[0], qrBytes = await (await fetch(qrUrl)).arrayBuffer(), qr = await pdf.embedPng(qrBytes)
    const size = Math.min(page.getWidth(), page.getHeight()) * .18, pad = 18
    page.drawRectangle({ x: page.getWidth() - size - pad * 2, y: pad, width: size + pad * 2, height: size + pad * 2 + 18, color: window.PDFLib.rgb(1,1,1) })
    page.drawImage(qr, { x: page.getWidth() - size - pad, y: pad + 18, width: size, height: size })
    page.drawText('Registration link', { x: page.getWidth() - size - pad, y: pad + 5, size: 8, color: window.PDFLib.rgb(.05,.3,.26) })
    return new File([await pdf.save()], `${file.name.replace(/\.pdf$/i,'')}-with-QR.pdf`, { type: 'application/pdf' })
  }
  return addQrToPoster(file, url)
}

function NoticePublisher({ data, user, refresh, notify }) {
  const [eventId, setEventId] = useState(data.events.find(x => x.status === 'open')?.id || data.events[0]?.id || '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('各位會員：\n\n誠邀閣下參加以下活動。詳情請參閱通告，並點擊報名連結或掃描 QR Code 完成報名。\n\n期待與您見面！')
  const [file, setFile] = useState(null), [generated, setGenerated] = useState(null), [preview, setPreview] = useState(''), [busy, setBusy] = useState(false)
  const event = data.events.find(x => x.id === eventId)
  const registrationUrl = event ? `${location.origin}/?register=${event.slug}` : ''
  const recipients = data.members.filter(x => x.member_status !== 'inactive').map(x => x.email || x.profiles?.email).filter(Boolean)
  async function generate() {
    if (!file || !event) return
    setBusy(true)
    try {
      const result = await createDigitalNotice(file, registrationUrl)
      setGenerated(result)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(result.type.startsWith('image/') ? URL.createObjectURL(result) : '')
      notify('已產生包含 QR Code 的數碼通告')
    } catch (err) { notify(err.message, 'error') } finally { setBusy(false) }
  }
  function download() {
    if (!generated) return
    const a = document.createElement('a'); a.href = URL.createObjectURL(generated); a.download = generated.name; a.click()
  }
  function selectFile(next) { if (next) { setFile(next); setGenerated(null); setPreview('') } }
  async function makeEml() {
    const bytes = new Uint8Array(await generated.arrayBuffer())
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    const attachment = btoa(binary).match(/.{1,76}/g).join('\r\n')
    const boundary = `EventFlow-${Date.now()}`, emailSubject = subject || `誠邀出席｜${event.title}`
    const eml = [
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(emailSubject)))}?=`,
      `Bcc: ${recipients.join(', ')}`, 'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`, '',
      `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: 8bit', '',
      `${body}\r\n\r\n網上報名：${registrationUrl}`, '',
      `--${boundary}`, `Content-Type: ${generated.type}; name="${generated.name}"`,
      'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${generated.name}"`, '', attachment, '',
      `--${boundary}--`,
    ].join('\r\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([eml], {type:'message/rfc822'})); a.download = `${event.slug}-email-with-notice.eml`; a.click()
  }
  async function saveAndEmail() {
    if (!generated || !event) return
    setBusy(true)
    try {
      const path = `notices/${Date.now()}-${generated.name.replace(/[^\w.-]/g,'-')}`
      const up = await supabase.storage.from('event-posters').upload(path, generated, { upsert: true })
      if (up.error) throw up.error
      const result = await supabase.from('announcements').insert({ event_id: event.id, subject: subject || `誠邀出席｜${event.title}`, body_html: body.replaceAll('\n','<br>'), attachment_path: path, registration_url: registrationUrl, recipient_group: 'all_active_members', status: 'sent', sent_at: new Date().toISOString(), created_by: user.id })
      if (result.error) throw result.error
      await makeEml()
      notify('已建立包含數碼通告附件的電郵檔案'); refresh()
    } catch (err) { notify(err.message, 'error') } finally { setBusy(false) }
  }
  return <div className="feature-page"><div className="feature-head"><div><p className="eyebrow">NOTICE PUBLISHER</p><h2>活動通告發佈</h2><span>上載通告或 Poster，自動加入報名 QR Code，再以電郵發送給會員。</span></div><span className="recipient-count">會員名單 {recipients.length} 人</span></div>
    <div className="notice-steps"><span><b>1</b>上載通告</span><span><b>2</b>加入 QR Code</span><span><b>3</b>電郵發佈</span></div>
    <div className="notice-grid"><article className="card notice-editor"><p className="eyebrow">POSTER EDITOR</p><h2>通告及 QR Code</h2><Input label="活動" value={eventId} onChange={setEventId} options={data.events.map(x => ({value:x.id,label:x.title}))}/><label className={`drop-zone ${file?'has-file':''}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();selectFile(e.dataTransfer.files?.[0])}}><Upload size={30}/><b>{file?file.name:'拖放檔案到這裡'}</b><span>或按此選擇 JPG、PNG、PDF</span><input type="file" accept="image/*,.pdf" onChange={e=>selectFile(e.target.files?.[0])}/></label><small>系統會在右下角加入 QR Code；會員亦可直接點擊電郵內的報名網址。</small>{preview && <img className="notice-preview" src={preview} alt="已加入 QR Code 的通告預覽"/>}{generated && !preview && <div className="pdf-ready"><FileText size={32}/>PDF 通告已加入 QR Code</div>}<div className="notice-actions"><button className="primary" disabled={!file || busy} onClick={generate}><QrCode size={17}/>{busy ? '處理中…' : '產生數碼通告'}</button><button className="secondary" disabled={!generated} onClick={download}><Download size={17}/>下載</button></div></article>
      <aside className="card email-panel"><p className="eyebrow">EMAIL DELIVERY</p><h2>電郵發佈</h2><Input label="電郵主旨" value={subject} onChange={setSubject}/><Input label="電郵內容" rows={8} value={body} onChange={setBody}/><div className="registration-link"><b>專屬報名頁</b><a href={registrationUrl} target="_blank">{registrationUrl || '請先選擇活動'}</a></div><div className="email-summary"><span><b>{recipients.length}</b> 預計收件人</span><span><b>{generated ? '✓' : '—'}</b> 數碼通告附件</span></div><button className="primary wide" disabled={!generated || !recipients.length || busy} onClick={saveAndEmail}><Mail size={17}/>建立附有數碼通告的電郵</button><small>下載的 .eml 電郵檔已包含會員 BCC、主旨、內容、報名網址及數碼通告附件；開啟後即可檢查並發送。</small></aside></div>
  </div>
}

function RowContent({ table, row }) {
  if (table === 'events') return <><b>{row.title}</b><span>{fmtDate(row.starts_at)} · {row.venue || '地點待定'}</span><em>{row.status} · {money(row.fee_cents)}</em></>
  if (table === 'registration_settings') return <><b>{row.events?.title || '活動報名設定'}</b><span>{row.form_title}</span><em>{row.is_open ? '開放報名' : '暫停報名'}</em></>
  if (table === 'announcements') return <><b>{row.subject}</b><span>{row.events?.title || '一般通告'} · {fmtDate(row.scheduled_for || row.sent_at)}</span><em>{row.status}</em></>
  if (table === 'registrations') return <><b>{row.attendee_name_zh || row.attendee_name_en || row.profiles?.full_name || row.profiles?.email || '非會員參加者'}</b><span>{row.attendee_email || row.profiles?.email || '沒有電郵'} · {row.events?.title} · {fmtDate(row.registered_at)}</span><em>{row.status}</em></>
  if (table === 'members') return <><b>{[row.name_zh, row.name_en].filter(Boolean).join(' / ') || row.profiles?.full_name || row.profiles?.email}</b><span>{row.membership_number} · {row.organization || '—'}</span><em>{row.member_status || 'active'}</em></>
  if (table === 'attendance') return <><b>{row.registrations?.attendee_name_zh || row.registrations?.attendee_name_en || row.registrations?.profiles?.full_name || row.registrations?.profiles?.email || '參加者'}</b><span>{row.registrations?.events?.title} · {fmtDate(row.checked_in_at)}</span><em>{row.method}</em></>
  if (table === 'payments') return <><b>{row.payer_name || row.registrations?.attendee_name_zh || row.registrations?.attendee_name_en || row.profiles?.full_name || row.profiles?.email || '付款人'}</b><span>{money(row.amount_cents)} · {row.provider || '—'} · {row.payment_date || fmtDate(row.paid_at)}</span><em>{row.status}</em></>
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

function exportCsv(name, rows) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = `${name}-${new Date().toISOString().slice(0,10)}.csv`; a.click()
}

function receivableRows(data, eventId = '') {
  return data.registrations.filter(r => r.status !== 'cancelled' && (!eventId || r.event_id === eventId)).map(r => {
    const expected = Number(r.events?.fee_cents || 0) * (Number(r.guest_count || 0) + 1)
    const paid = data.payments.filter(p => p.registration_id === r.id && p.status === 'paid').reduce((sum, p) => sum + Number(p.amount_cents || 0), 0)
    return {
      registration_id: r.id,
      participant: r.attendee_name_zh || r.attendee_name_en || r.profiles?.full_name || r.profiles?.email || '參加者',
      email: r.attendee_email || r.profiles?.email || '',
      phone: r.attendee_phone || '',
      event: r.events?.title || '',
      event_id: r.event_id,
      registered_at: r.registered_at,
      expected_cents: expected,
      paid_cents: paid,
      outstanding_cents: Math.max(0, expected - paid),
    }
  })
}

function PaymentBoard({ data, refresh, notify }) {
  const [editing, setEditing] = useState(false)
  const [eventId, setEventId] = useState(data.events[0]?.id || '')
  const [form, setForm] = useState({ registration_id:'', payer_name:'', payer_email:'', amount:'', status:'paid', provider:'bank_transfer', payment_date:new Date().toISOString().slice(0,10), provider_reference:'', notes:'' })
  const rows = receivableRows(data, eventId)
  const expected = rows.reduce((s,r)=>s+r.expected_cents,0), received = rows.reduce((s,r)=>s+r.paid_cents,0), outstanding = rows.reduce((s,r)=>s+r.outstanding_cents,0)
  const selected = data.registrations.find(r => r.id === form.registration_id)
  function chooseRegistration(id) {
    const r = data.registrations.find(x => x.id === id), rr = rows.find(x => x.registration_id === id)
    setForm(f => ({...f, registration_id:id, payer_name:r?.attendee_name_zh || r?.attendee_name_en || r?.profiles?.full_name || '', payer_email:r?.attendee_email || r?.profiles?.email || '', amount:((rr?.outstanding_cents || r?.events?.fee_cents || 0)/100).toFixed(2)}))
  }
  async function save(e) {
    e.preventDefault()
    const payload = { registration_id:form.registration_id, profile_id:selected?.profile_id || null, payer_name:form.payer_name, payer_email:form.payer_email, amount_cents:Math.round(Number(form.amount)*100), status:form.status, provider:form.provider, provider_reference:form.provider_reference || `manual-${Date.now()}`, payment_date:form.payment_date, paid_at:form.status==='paid' ? new Date(`${form.payment_date}T12:00:00`).toISOString() : null, notes:form.notes }
    const { error } = await supabase.from('payments').insert(payload)
    if (error) notify(error.message,'error'); else { notify('付款紀錄已儲存'); setEditing(false); await refresh() }
  }
  return <div className="feature-page"><div className="feature-head"><div><p className="eyebrow">PAYMENT RECORDS</p><h2>付款紀錄</h2><span>每筆付款均連結付款人、參加者及活動。</span></div><button className="primary" onClick={()=>setEditing(true)}><Plus size={17}/>新增付款紀錄</button></div>
    <label className="report-filter">查看活動<select value={eventId} onChange={e=>setEventId(e.target.value)}>{data.events.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
    <div className="stat-grid mini-stats"><article className="stat-card"><div><p>預計總收入</p><strong>{money(expected)}</strong></div></article><article className="stat-card"><div><p>已收款</p><strong>{money(received)}</strong></div></article><article className="stat-card"><div><p>待收款</p><strong>{money(outstanding)}</strong></div></article></div>
    <article className="card directory-card"><div className="table-scroll"><table className="directory-table"><thead><tr><th>參加者／活動</th><th>聯絡資料</th><th>應付</th><th>已付</th><th>尚欠</th><th>狀態</th></tr></thead><tbody>{rows.map(r=><tr key={r.registration_id}><td><b>{r.participant}</b><small>{r.event}</small></td><td>{r.phone||'—'}<small>{r.email||'—'}</small></td><td>{money(r.expected_cents)}</td><td>{money(r.paid_cents)}</td><td><b>{money(r.outstanding_cents)}</b></td><td><span className="status">{r.outstanding_cents ? '待付款' : '已付款'}</span></td></tr>)}</tbody></table></div></article>
    {editing&&<Modal title="新增付款紀錄" close={()=>setEditing(false)}><form className="data-form" onSubmit={save}><Input label="活動" required value={eventId} onChange={v=>{setEventId(v);setForm(f=>({...f,registration_id:''}))}} options={data.events.map(x=>({value:x.id,label:x.title}))}/><Input label="參加者／報名紀錄" required value={form.registration_id} onChange={chooseRegistration} options={data.registrations.filter(r=>r.event_id===eventId).map(r=>({value:r.id,label:`${r.attendee_name_zh||r.attendee_name_en||r.profiles?.full_name||'參加者'} · ${r.events?.title}`}))}/><div className="form-grid"><Input label="付款人姓名" required value={form.payer_name} onChange={v=>setForm(f=>({...f,payer_name:v}))}/><Input label="付款人電郵" type="email" value={form.payer_email} onChange={v=>setForm(f=>({...f,payer_email:v}))}/></div><div className="form-grid"><Input label="付款日期" type="date" required value={form.payment_date} onChange={v=>setForm(f=>({...f,payment_date:v}))}/><Input label="付款金額（HKD）" type="number" required value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))}/></div><div className="form-grid"><Input label="付款方式" value={form.provider} onChange={v=>setForm(f=>({...f,provider:v}))} options={[{value:'cash',label:'現金'},{value:'bank_transfer',label:'銀行轉帳'},{value:'cheque',label:'支票'},{value:'fps',label:'轉數快'},{value:'credit_card',label:'信用卡'}]}/><Input label="付款狀態" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))} options={[{value:'paid',label:'已付款'},{value:'pending',label:'待確認'},{value:'refunded',label:'已退款'},{value:'waived',label:'豁免'}]}/></div><Input label="交易編號" value={form.provider_reference} onChange={v=>setForm(f=>({...f,provider_reference:v}))}/><Input label="備註" rows={3} value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))}/><button className="primary wide">儲存付款紀錄</button></form></Modal>}
  </div>
}

function Reports({ data }) {
  const [eventId,setEventId]=useState(data.events[0]?.id||'')
  const rows=receivableRows(data,eventId), outstanding=rows.filter(r=>r.outstanding_cents>0)
  const expected=rows.reduce((s,r)=>s+r.expected_cents,0), received=rows.reduce((s,r)=>s+r.paid_cents,0), due=rows.reduce((s,r)=>s+r.outstanding_cents,0), progress=expected?Math.round(received/expected*100):0
  const exportRows=outstanding.map(r=>({參加者:r.participant,活動:r.event,電話:r.phone,電郵:r.email,報名日期:fmtDate(r.registered_at),應付金額:(r.expected_cents/100).toFixed(2),已付金額:(r.paid_cents/100).toFixed(2),尚欠金額:(r.outstanding_cents/100).toFixed(2)}))
  return <div className="feature-page"><div className="feature-head"><div><p className="eyebrow">ACCOUNTS RECEIVABLE</p><h2>應收未收報表</h2><span>集中查看哪位參加者、哪個活動尚未付款。</span></div><button className="secondary" onClick={()=>exportCsv('應收未收報表',exportRows)}><Download size={17}/>匯出報表</button></div>
    <label className="report-filter">活動<select value={eventId} onChange={e=>setEventId(e.target.value)}>{data.events.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
    <article className="card receivable-summary"><div><p>待收款總額</p><strong>{money(due)}</strong><span>共 {outstanding.length} 位參加者</span></div><div className="progress-ring">{progress}%</div><div><p>收款進度</p><b>已收 {money(received)} ／預計 {money(expected)}</b></div></article>
    <article className="card directory-card"><div className="table-scroll"><table className="directory-table"><thead><tr><th>參加者</th><th>活動</th><th>聯絡資料</th><th>報名日期</th><th>已付／應付</th><th>尚欠金額</th></tr></thead><tbody>{outstanding.map(r=><tr key={r.registration_id}><td><b>{r.participant}</b></td><td>{r.event}</td><td>{r.phone||'—'}<small>{r.email||'—'}</small></td><td>{fmtDate(r.registered_at)}</td><td>{money(r.paid_cents)} / {money(r.expected_cents)}</td><td><b>{money(r.outstanding_cents)}</b></td></tr>)}</tbody></table></div>{!outstanding.length&&<p className="empty">這個活動沒有未收款項。</p>}</article>
  </div>
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
      supabase.from('members').select('*, profiles(full_name,full_name_zh,full_name_en,email,phone)').order('created_at', { ascending: false }),
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
    <section className="content">{active === '總覽' ? <Dashboard data={data} setActive={setActive}/> : active === '報表' ? <Reports data={data}/> : active === '會員名錄' ? <MemberDirectory data={data} user={session.user} profile={profile} refresh={refresh} notify={notify}/> : active === '點名' ? <AttendanceBoard data={data} user={session.user} refresh={refresh} notify={notify}/> : active === '通告發佈' ? <NoticePublisher data={data} user={session.user} refresh={refresh} notify={notify}/> : active === '付款' ? <PaymentBoard data={data} refresh={refresh} notify={notify}/> : <Manager table={table} rows={data[table]} lookups={data} user={session.user} refresh={refresh} notify={notify} profile={profile}/>}</section>
    <Toast toast={toast}/>
  </main></div>
}

export default App

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BellRing, CalendarDays, ChartNoAxesColumnIncreasing, Check, ClipboardCheck,
  ArrowLeft, Download, FileText, Gauge, LogOut, Mail, Menu, Pencil, Plus, Printer, QrCode,
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
  const [form, setForm] = useState({ email: '', password: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage('')
    const result = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    setBusy(false)
    if (result.error) setMessage(result.error.message)
    else setMessage('')
  }
  return <div className="auth-page"><section className="auth-card">
    <div className="auth-brand"><span className="brand-mark">J</span><span><b>聚辦</b><small>EventFlow</small></span></div>
    <h1>後台登入</h1><p>程式管理員及 User 請使用獲邀請的電郵帳戶登入。</p>
    <form onSubmit={submit}>
      <label>電郵<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label>
      <label>密碼<input required minLength="8" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></label>
      {message && <div className="form-message">{message}</div>}
      <button className="primary wide" disabled={busy}>{busy ? '登入中…' : '登入'}</button>
    </form>
    <small className="privacy-note">新後台用戶必須由程式管理員發出邀請，並透過邀請連結自行設定密碼。</small>
  </section></div>
}

function InvitationSignup({ token }) {
  const [invite, setInvite] = useState(null)
  const [form, setForm] = useState({ full_name:'', password:'', confirm:'' })
  const [state, setState] = useState({ loading:true, busy:false, error:'', done:false })
  useEffect(()=>{ supabase.rpc('get_user_invitation',{invitation_token:token}).then(({data,error})=>{
    const row=data?.[0]; setInvite(row||null); setForm(f=>({...f,full_name:row?.full_name||''})); setState(s=>({...s,loading:false,error:error?.message||(!row?'邀請連結無效或已過期。':'')}))
  }) },[token])
  async function submit(e) {
    e.preventDefault()
    if(form.password!==form.confirm) return setState(s=>({...s,error:'兩次輸入的密碼不相同。'}))
    setState(s=>({...s,busy:true,error:''}))
    const {error}=await supabase.auth.signUp({email:invite.email,password:form.password,options:{data:{full_name:form.full_name}}})
    if(error) setState(s=>({...s,busy:false,error:error.message}))
    else { setState(s=>({...s,busy:false,done:true})) }
  }
  if(state.loading)return <div className="loading-page">正在驗證邀請…</div>
  return <div className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="brand-mark">J</span><span><b>聚辦</b><small>EventFlow</small></span></div>{state.done?<><h1>帳戶已建立</h1><p>電郵已透過邀請連結完成驗證。現在可使用電郵及剛設定的密碼登入。</p><a className="primary link-button" href="/">前往登入</a></>:<><h1>接受後台邀請</h1>{invite&&<p>{invite.email} · {invite.role==='admin'?'程式管理員':'User'}</p>}<form onSubmit={submit}><Input label="姓名" required value={form.full_name} onChange={v=>setForm(f=>({...f,full_name:v}))}/><Input label="自行設定密碼" type="password" required value={form.password} onChange={v=>setForm(f=>({...f,password:v}))}/><Input label="再次輸入密碼" type="password" required value={form.confirm} onChange={v=>setForm(f=>({...f,confirm:v}))}/>{state.error&&<div className="form-message">{state.error}</div>}<button className="primary wide" disabled={!invite||state.busy}>{state.busy?'建立中…':'建立帳戶'}</button></form></>}</section></div>
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
  const visibleItems = navItems.filter(([,label]) => label !== '用戶及權限' || profile?.role === 'admin')
  return <><button className={`scrim ${open ? 'show' : ''}`} onClick={close}/>
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark">J</span><span><b>聚辦</b><small>EventFlow</small></span><button className="mobile-close" onClick={close}><X size={20}/></button></div>
      <nav>{visibleItems.map(([Icon, label]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); close() }}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <div className="profile"><p>目前權限</p><span className="role">{profile?.role === 'admin' ? '程式管理員' : 'User'}</span><div className="profile-row"><span className="avatar">{initials}</span><span><b>{profile?.full_name || 'EventFlow 用戶'}</b><small>{profile?.email}</small></span></div><button className="logout" onClick={() => supabase.auth.signOut()}><LogOut size={17}/>登出</button></div>
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

function prepareExportNode(targetId) {
  const source = document.getElementById(targetId)
  if (!source) throw new Error('找不到需要輸出的表格。')
  const host = document.createElement('div')
  host.className = 'export-render-host'
  const clone = source.cloneNode(true)
  clone.removeAttribute('id')
  clone.classList.add('export-render')
  clone.querySelectorAll('.print-hide,.screen-checkin').forEach(node => node.remove())
  host.appendChild(clone)
  document.body.appendChild(host)
  return host
}

function printDocument(title, targetId) {
  const host = prepareExportNode(targetId)
  const frame = document.createElement('iframe')
  frame.className = 'print-frame'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  doc.open()
  doc.write(`<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><title>${title}</title><style>
    @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;color:#172f2a;font-family:"Microsoft JhengHei","PingFang HK",Arial,sans-serif}
    h1{font-size:22px;margin:0 0 7px}.print-heading{display:block;border-bottom:2px solid #174f45;padding-bottom:10px;margin-bottom:15px}.print-heading p,.print-heading b{font-size:11px}
    .card{border:0}.table-scroll{overflow:visible}.directory-table,.print-attendance-table table{width:100%;min-width:0;border-collapse:collapse;font-size:9px}
    th,td{padding:7px 6px;border:1px solid #82928d;text-align:left;vertical-align:top}th{background:#edf3f1}td b,td small{display:block}td small{margin-top:3px;color:#526762}
    .print-attendance-table{display:block}.status{border:0;padding:0;background:none}.empty{text-align:center;padding:30px}
  </style></head><body>${host.innerHTML}</body></html>`)
  doc.close()
  host.remove()
  setTimeout(() => {
    frame.contentWindow.focus()
    frame.contentWindow.print()
    setTimeout(() => frame.remove(), 1000)
  }, 150)
}

async function downloadDocumentPdf(title, targetId) {
  if (!window.html2canvas || !window.jspdf?.jsPDF) throw new Error('PDF 元件尚未載入，請重新整理頁面後再試。')
  const host = prepareExportNode(targetId)
  try {
    await document.fonts?.ready
    const canvas = await window.html2canvas(host.firstElementChild, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const { jsPDF } = window.jspdf
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
    const pageWidth = 277
    const pageHeight = 186
    const pxPerPage = Math.floor(canvas.width * pageHeight / pageWidth)
    let offset = 0
    while (offset < canvas.height) {
      const sliceHeight = Math.min(pxPerPage, canvas.height - offset)
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sliceHeight
      pageCanvas.getContext('2d').drawImage(canvas, 0, offset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)
      if (offset > 0) pdf.addPage('a4', 'landscape')
      const renderedHeight = sliceHeight * pageWidth / canvas.width
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', .94), 'JPEG', 10, 10, pageWidth, renderedHeight, undefined, 'FAST')
      offset += sliceHeight
    }
    pdf.save(`${title}.pdf`)
  } finally {
    host.remove()
  }
}

function PrintActions({ title, targetId, notify }) {
  const [exporting, setExporting] = useState(false)
  async function pdf() {
    setExporting(true)
    try { await downloadDocumentPdf(title, targetId); notify?.('PDF 檔案已生成並開始下載') }
    catch (err) { notify?.(err.message, 'error') }
    finally { setExporting(false) }
  }
  return <div className="print-actions print-hide">
    <button className="secondary" onClick={() => printDocument(title, targetId)}><Printer size={17}/>列印紙張</button>
    <button className="secondary" disabled={exporting} onClick={pdf}><Download size={17}/>{exporting ? '正在生成…' : '下載 PDF'}</button>
  </div>
}

function ParticipantBoard({ data, user, refresh, notify, selectedEventId, setSelectedEventId }) {
  const [editing, setEditing] = useState(null)
  const eventId = selectedEventId || data.events[0]?.id || ''
  const event = data.events.find(x => x.id === eventId)
  const rows = data.registrations.filter(x => x.event_id === eventId)
  return <div className="feature-page participant-page">
    <div className="feature-head"><div><p className="eyebrow">PARTICIPANTS</p><h2>活動參加者名單</h2><span>選擇活動後查看、列印或輸出該活動的參加者名單。</span></div><div className="feature-head-actions"><PrintActions title={`${event?.title || '活動'}-參加者名單`} targetId="participant-export-sheet" notify={notify}/><button className="primary print-hide" onClick={() => setEditing({})}><Plus size={17}/>新增參加者</button></div></div>
    <label className="report-filter print-hide">選擇活動<select value={eventId} onChange={e => setSelectedEventId(e.target.value)}>{data.events.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
    <section className="print-sheet" id="participant-export-sheet">
      <div className="print-heading"><h1>{event?.title || '活動參加者名單'}</h1><p>{event ? `${fmtDate(event.starts_at)} · ${event.venue || '地點待定'}` : ''}</p><b>參加人數：{rows.reduce((sum, row) => sum + Number(row.guest_count || 0) + 1, 0)} 人</b></div>
      <article className="card directory-card"><div className="table-scroll"><table className="directory-table printable-table"><thead><tr><th>#</th><th>參加者姓名</th><th>電郵</th><th>電話</th><th>機構</th><th>同行</th><th>報名狀態</th><th className="print-hide">操作</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}><td>{index + 1}</td><td><b>{row.attendee_name_zh || '—'}</b><small>{row.attendee_name_en || row.profiles?.full_name || '—'}</small></td><td>{row.attendee_email || row.profiles?.email || '—'}</td><td>{row.attendee_phone || '—'}</td><td>{row.organization || '—'}</td><td>{row.guest_count || 0}</td><td><span className="status">{row.status}</span></td><td className="print-hide"><button className="icon-action" onClick={() => setEditing(row)}><Pencil size={16}/></button></td></tr>)}</tbody></table></div>{!rows.length && <p className="empty">這個活動暫時未有報名紀錄。</p>}</article>
    </section>
    {editing && <Modal title={editing.id ? '編輯參加者' : '新增參加者'} close={() => setEditing(null)}><EntityForm table="registrations" value={editing.id ? editing : null} lookups={data} user={user} close={() => setEditing(null)} refresh={refresh} notify={notify}/></Modal>}
  </div>
}

function AttendanceBoard({ data, user, refresh, notify, selectedEventId, setSelectedEventId }) {
  const eventId = selectedEventId || data.events[0]?.id || ''
  const event = data.events.find(x => x.id === eventId)
  const rows = data.registrations.filter(x => x.event_id === eventId)
  const checked = new Map(data.attendance.map(x => [x.registration_id, x]))
  async function toggle(row) {
    const current = checked.get(row.id)
    const result = current
      ? await supabase.from('attendance').delete().eq('id', current.id)
      : await supabase.from('attendance').insert({ registration_id: row.id, checked_in_by: user.id, method: 'manual' })
    if (result.error) notify(result.error.message, 'error'); else { notify(current ? '已取消點名' : '已完成點名'); refresh() }
  }
  return <div className="feature-page attendance-page"><div className="feature-head"><div><p className="eyebrow">ATTENDANCE</p><h2>活動點名表</h2><span>選擇活動後進行即場點名或列印完整點名表。</span></div><PrintActions title={`${event?.title || '活動'}-點名表`} targetId="attendance-export-sheet" notify={notify}/></div>
    <label className="report-filter print-hide">選擇活動<select value={eventId} onChange={e => setSelectedEventId(e.target.value)}>{data.events.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
    <section className="print-sheet" id="attendance-export-sheet"><div className="print-heading"><h1>{event?.title || '活動點名表'}</h1><p>{event ? `${fmtDate(event.starts_at)} · ${event.venue || '地點待定'}` : ''}</p><b>報名紀錄：{rows.length}　已點名：{rows.filter(row => checked.has(row.id)).length}</b></div>
      <article className="card checkin-list screen-checkin">{rows.length ? rows.map(row => { const name = row.attendee_name_zh || row.attendee_name_en || row.profiles?.full_name || row.profiles?.email || '參加者'; const done = checked.has(row.id); const paid = data.payments.some(p => p.registration_id === row.id && p.status === 'paid'); return <div className="checkin-row" key={row.id}><span className="avatar">{name.slice(0,1)}</span><div><b>{name}</b><small>{row.attendee_name_en || '—'} · {row.attendee_phone || '沒有電話'}</small></div><span className={`payment-pill ${paid ? 'paid' : ''}`}>{paid ? '已付款' : '待付款'}</span><button className={done ? 'checked-button' : 'primary'} onClick={() => toggle(row)}>{done ? <><Check size={16}/>已點名</> : '點名'}</button></div>}) : <p className="empty">這個活動暫時未有報名紀錄。</p>}</article>
      <article className="print-attendance-table"><table><thead><tr><th>#</th><th>中文姓名</th><th>英文姓名</th><th>電話</th><th>電郵</th><th>付款</th><th>出席</th><th>簽署／備註</th></tr></thead><tbody>{rows.map((row, index) => { const paid = data.payments.some(p => p.registration_id === row.id && p.status === 'paid'); return <tr key={row.id}><td>{index + 1}</td><td>{row.attendee_name_zh || '—'}</td><td>{row.attendee_name_en || row.profiles?.full_name || '—'}</td><td>{row.attendee_phone || '—'}</td><td>{row.attendee_email || row.profiles?.email || '—'}</td><td>{paid ? '已付' : '未付'}</td><td>{checked.has(row.id) ? '✓' : '□'}</td><td></td></tr>})}</tbody></table></article>
    </section>
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

function NoticePublisher({ data, user, refresh, notify, selectedEventId, setSelectedEventId }) {
  const fileInput = useRef(null)
  const eventId = selectedEventId || data.events.find(x => x.status === 'open')?.id || data.events[0]?.id || ''
  const setEventId = setSelectedEventId
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('各位會員：\n\n誠邀閣下參加以下活動。詳情請參閱通告，並點擊報名連結或掃描 QR Code 完成報名。\n\n期待與您見面！')
  const [file, setFile] = useState(null), [generated, setGenerated] = useState(null), [preview, setPreview] = useState(''), [busy, setBusy] = useState(false)
  const [dragActive, setDragActive] = useState(false), [uploadError, setUploadError] = useState('')
  const event = data.events.find(x => x.id === eventId)
  const registrationUrl = event ? `${location.origin}/?register=${event.slug}` : ''
  const recipients = data.members.filter(x => x.member_status !== 'inactive').map(x => x.email || x.profiles?.email).filter(Boolean)
  const sendHistory = data.email_send_logs.filter(x => x.event_id === eventId)
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
  function selectFile(next) {
    if (!next) return
    const allowed = next.type.startsWith('image/') || next.type === 'application/pdf' || /\.pdf$/i.test(next.name)
    if (!allowed) return setUploadError('只接受 JPG、PNG、其他圖片格式或 PDF。')
    if (next.size > 25 * 1024 * 1024) return setUploadError('檔案不可大於 25MB。')
    setUploadError('')
    setFile(next)
    setGenerated(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview('')
  }
  function pasteFile(e) {
    const pasted = [...(e.clipboardData?.items || [])].find(item => item.kind === 'file')?.getAsFile()
    if (pasted) { e.preventDefault(); selectFile(pasted) }
  }
  async function saveAndEmail() {
    if (!generated || !event) return
    if (!confirm(`确定立即发送给会员名录中的 ${recipients.length} 个电邮地址？`)) return
    setBusy(true)
    try {
      const path = `notices/${Date.now()}-${generated.name.replace(/[^\w.-]/g,'-')}`
      const up = await supabase.storage.from('event-posters').upload(path, generated, { upsert: true })
      if (up.error) throw up.error
      const emailSubject = subject || `誠邀出席｜${event.title}`
      const announcement = await supabase.from('announcements').insert({ event_id: event.id, subject: emailSubject, body_html: body.replaceAll('\n','<br>'), attachment_path: path, registration_url: registrationUrl, recipient_group: 'all_active_members', status: 'draft', created_by: user.id }).select('id').single()
      if (announcement.error) throw announcement.error
      const { data: sessionData } = await supabase.auth.getSession()
      const response = await fetch('/api/send-notice', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${sessionData.session?.access_token || ''}` },
        body: JSON.stringify({
          event_id:event.id, announcement_id:announcement.data.id, subject:emailSubject, body,
          registration_url:registrationUrl, attachment_path:path,
          attachment_name:generated.name, attachment_type:generated.type,
        }),
      })
      const outcome = await response.json()
      if (!response.ok) {
        throw new Error(outcome.error || '电邮发送失败。')
      }
      await supabase.from('announcements').update({ status:'sent', sent_at:new Date().toISOString() }).eq('id', announcement.data.id)
      notify(`电邮已发送：成功 ${outcome.success_count}，失败 ${outcome.failed_count}`); await refresh()
    } catch (err) { notify(err.message, 'error') } finally { setBusy(false) }
  }
  return <div className="feature-page"><div className="feature-head"><div><p className="eyebrow">NOTICE PUBLISHER</p><h2>活動通告發佈</h2><span>上載通告或 Poster，自動加入報名 QR Code，再以電郵發送給會員。</span></div><span className="recipient-count">會員名單 {recipients.length} 人</span></div>
    <div className="notice-steps"><span><b>1</b>上載通告</span><span><b>2</b>加入 QR Code</span><span><b>3</b>電郵發佈</span></div>
    <div className="notice-grid"><article className="card notice-editor" onPaste={pasteFile}><p className="eyebrow">POSTER EDITOR</p><h2>通告及 QR Code</h2><Input label="活動" value={eventId} onChange={setEventId} options={data.events.map(x => ({value:x.id,label:x.title}))}/><div className={`drop-zone ${file?'has-file':''} ${dragActive?'drag-active':''}`} tabIndex="0" onDragEnter={e=>{e.preventDefault();setDragActive(true)}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';setDragActive(true)}} onDragLeave={e=>{e.preventDefault();if(!e.currentTarget.contains(e.relatedTarget))setDragActive(false)}} onDrop={e=>{e.preventDefault();setDragActive(false);selectFile(e.dataTransfer.files?.[0])}}><Upload size={30}/><b>{file?file.name:'拖放檔案到這裡'}</b><span>{file ? `已成功上載檔案 · ${(file.size / 1024 / 1024).toFixed(2)} MB` : '可拖放、貼上圖片，或使用選檔按鈕'}</span><button type="button" className="secondary choose-file" onClick={()=>fileInput.current?.click()}>{file ? '更換檔案' : '從電腦選擇檔案'}</button><input ref={fileInput} className="file-picker" type="file" accept="image/*,.pdf,application/pdf" onChange={e=>{selectFile(e.target.files?.[0]);e.target.value=''}}/></div>{file && <div className="upload-success"><Check size={17}/><span><b>檔案已上載成功</b><small>{file.name}</small></span></div>}{uploadError&&<div className="form-message">{uploadError}</div>}<small>支援 JPG、PNG、其他圖片及 PDF（最大 25MB）。系統會在右下角加入 QR Code；會員亦可直接點擊電郵內的報名網址。</small>{preview && <img className="notice-preview" src={preview} alt="已加入 QR Code 的通告預覽"/>}{generated && !preview && <div className="pdf-ready"><FileText size={32}/>PDF 通告已加入 QR Code</div>}<div className="notice-actions"><button className="primary" disabled={!file || busy} onClick={generate}><QrCode size={17}/>{busy ? '處理中…' : '產生數碼通告'}</button><button className="secondary" disabled={!generated} onClick={download}><Download size={17}/>下載</button></div></article>
      <aside className="card email-panel"><p className="eyebrow">EMAIL DELIVERY</p><h2>電郵發佈</h2><Input label="電郵主旨" value={subject} onChange={setSubject}/><Input label="電郵內容" rows={8} value={body} onChange={setBody}/><div className="registration-link"><b>專屬報名頁</b><a href={registrationUrl} target="_blank">{registrationUrl || '請先選擇活動'}</a></div><div className="email-summary"><span><b>{recipients.length}</b> 会员收件人</span><span><b>{generated ? '✓' : '—'}</b> 数码通告附件</span></div><button className="primary wide send-now" disabled={!generated || !recipients.length || busy} onClick={saveAndEmail}><Mail size={17}/>{busy?'正在发送…':'立即发送给所有会员'}</button><small>收件名单来自「会员名录」中的有效会员。每次发送都会附上数码通告及报名网址，并自动保存发送记录。</small><div className="send-history"><div className="history-head"><b>发送记录</b><span>这个活动已发送 {sendHistory.length} 次</span></div>{sendHistory.length?sendHistory.map(log=><div className="history-row" key={log.id}><span><b>{fmtDate(log.sent_at)}</b><small>{log.subject}</small></span><em className={log.status==='sent'?'sent':'failed'}>{log.status==='sent'?`成功 ${log.success_count}/${log.recipient_count}`:`失败${log.error_message?`：${log.error_message}`:''}`}</em></div>):<p className="empty">这个活动尚未发送电邮。</p>}</div></aside></div>
  </div>
}

function UserAdministration({ data, user, refresh, notify }) {
  const [inviteOpen,setInviteOpen]=useState(false), [editing,setEditing]=useState(null), [editingInvite,setEditingInvite]=useState(null)
  const [form,setForm]=useState({full_name:'',email:'',role:'staff'})
  const pendingInvitations=(data.user_invitations||[]).filter(invite=>invite.status==='pending')
  async function invite(e){
    e.preventDefault()
    const token=crypto.randomUUID()
    const {error}=await supabase.from('user_invitations').insert({full_name:form.full_name,email:form.email.toLowerCase(),role:form.role,token,invited_by:user.id})
    if(error)return notify(error.message,'error')
    const link=`${location.origin}/?invite=${token}`, roleLabel=form.role==='admin'?'程式管理員':'User'
    const subject='EventFlow 後台帳戶邀請'
    const body=`${form.full_name}：\n\n你已獲邀成為 EventFlow 的「${roleLabel}」。請使用以下專屬連結，以 ${form.email} 作為登入名稱並自行設定密碼：\n\n${link}\n\n邀請連結有效期為 7 日。`
    location.href=`mailto:${encodeURIComponent(form.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    notify('邀請已建立，並已開啟邀請電郵'); setInviteOpen(false); setForm({full_name:'',email:'',role:'staff'}); await refresh()
  }
  async function saveUser(e){
    e.preventDefault()
    const {error}=await supabase.from('profiles').update({full_name:editing.full_name,role:editing.role,status:editing.status}).eq('id',editing.id)
    if(error)notify(error.message,'error');else{notify('用戶資料已更新');setEditing(null);refresh()}
  }
  async function remove(profile){
    if(profile.id===user.id)return notify('不能刪除自己的管理員帳戶','error')
    if(!confirm(`確定刪除 ${profile.email} 的後台存取權？`))return
    const {error}=await supabase.from('profiles').update({status:'inactive',role:'member'}).eq('id',profile.id)
    if(error)notify(error.message,'error');else{notify('用戶存取權已刪除');refresh()}
  }
  async function saveInvitation(e){
    e.preventDefault()
    const {error}=await supabase.from('user_invitations').update({full_name:editingInvite.full_name,email:editingInvite.email.toLowerCase(),role:editingInvite.role}).eq('id',editingInvite.id).eq('status','pending')
    if(error)notify(error.message,'error');else{notify('待接受邀請已更新');setEditingInvite(null);await refresh()}
  }
  async function removeInvitation(invite){
    if(!confirm(`確定刪除寄給 ${invite.email} 的待接受邀請？`))return
    const {error}=await supabase.from('user_invitations').delete().eq('id',invite.id).eq('status','pending')
    if(error)notify(error.message,'error');else{notify('待接受邀請已刪除');await refresh()}
  }
  return <div className="feature-page"><div className="feature-head"><div><p className="eyebrow">ACCESS CONTROL</p><h2>用戶及權限</h2><span>只有程式管理員可邀請、編輯及刪除後台用戶。</span></div><button className="primary" onClick={()=>setInviteOpen(true)}><Mail size={17}/>邀請用戶</button></div>
    <div className="permission-cards"><article className="card"><ShieldCheck size={24}/><h3>程式管理員</h3><p>可使用所有功能，並管理、邀請及刪除用戶。</p></article><article className="card"><Users size={24}/><h3>User</h3><p>可進入所有營運功能，輸入及編輯資料，但不能管理用戶。</p></article><article className="card"><QrCode size={24}/><h3>會員參加者</h3><p>不建立後台帳戶，只能透過公開連結或 QR Code 報名。</p></article></div>
    <article className="card directory-card"><div className="table-scroll"><table className="directory-table"><thead><tr><th>姓名</th><th>登入電郵</th><th>權限</th><th>狀態</th><th>操作</th></tr></thead><tbody>{data.profiles.filter(p=>['admin','staff'].includes(p.role)).map(p=><tr key={p.id}><td><b>{p.full_name||'—'}</b></td><td>{p.email}</td><td><span className="status">{p.role==='admin'?'程式管理員':'User'}</span></td><td>{p.status}</td><td><div className="row-buttons"><button title="編輯" onClick={()=>setEditing({...p})}><Pencil size={16}/></button><button title="刪除" className="danger" disabled={p.id===user.id} onClick={()=>remove(p)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div></article>
    <article className="card directory-card pending-invitations"><div className="section-table-head"><div><p className="eyebrow">PENDING INVITATIONS</p><h3>待接受邀請</h3><span>已發出但尚未完成註冊的用戶邀請。</span></div><b>{pendingInvitations.length} 個 Pending</b></div><div className="table-scroll"><table className="directory-table"><thead><tr><th>姓名</th><th>受邀電郵</th><th>預設權限</th><th>狀態</th><th>邀請日期／到期日</th><th>操作</th></tr></thead><tbody>{pendingInvitations.map(invite=><tr key={invite.id}><td><b>{invite.full_name||'—'}</b></td><td>{invite.email}</td><td><span className="status">{invite.role==='admin'?'程式管理員':'User'}</span></td><td><span className="pending-pill">Pending</span></td><td>{fmtDate(invite.created_at)}<small>到期：{fmtDate(invite.expires_at)}</small></td><td><div className="row-buttons"><button title="編輯待接受邀請" onClick={()=>setEditingInvite({...invite})}><Pencil size={16}/></button><button title="刪除待接受邀請" className="danger" onClick={()=>removeInvitation(invite)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>{!pendingInvitations.length&&<p className="empty">目前沒有待接受邀請。</p>}</article>
    {inviteOpen&&<Modal title="邀請後台用戶" close={()=>setInviteOpen(false)}><form className="data-form" onSubmit={invite}><Input label="用戶姓名" required value={form.full_name} onChange={v=>setForm(f=>({...f,full_name:v}))}/><Input label="登入電郵（Username）" type="email" required value={form.email} onChange={v=>setForm(f=>({...f,email:v}))}/><Input label="權限" required value={form.role} onChange={v=>setForm(f=>({...f,role:v}))} options={[{value:'admin',label:'程式管理員'},{value:'staff',label:'User'}]}/><p className="form-help">受邀者會透過專屬連結自行設定密碼。</p><button className="primary wide">建立並發送邀請</button></form></Modal>}
    {editing&&<Modal title="編輯後台用戶" close={()=>setEditing(null)}><form className="data-form" onSubmit={saveUser}><Input label="姓名" required value={editing.full_name} onChange={v=>setEditing(f=>({...f,full_name:v}))}/><Input label="登入電郵" value={editing.email} onChange={()=>{}}/><Input label="權限" value={editing.role} onChange={v=>setEditing(f=>({...f,role:v}))} options={[{value:'admin',label:'程式管理員'},{value:'staff',label:'User'}]}/><Input label="狀態" value={editing.status} onChange={v=>setEditing(f=>({...f,status:v}))} options={[{value:'active',label:'有效'},{value:'inactive',label:'停用'}]}/><button className="primary wide">儲存</button></form></Modal>}
    {editingInvite&&<Modal title="編輯待接受邀請" close={()=>setEditingInvite(null)}><form className="data-form" onSubmit={saveInvitation}><Input label="用戶姓名" required value={editingInvite.full_name} onChange={v=>setEditingInvite(f=>({...f,full_name:v}))}/><Input label="受邀電郵（Username）" type="email" required value={editingInvite.email} onChange={v=>setEditingInvite(f=>({...f,email:v}))}/><Input label="預設權限" required value={editingInvite.role} onChange={v=>setEditingInvite(f=>({...f,role:v}))} options={[{value:'admin',label:'程式管理員'},{value:'staff',label:'User'}]}/><p className="form-help">此修改只適用於尚未完成註冊的邀請。</p><button className="primary wide">儲存邀請資料</button></form></Modal>}
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

function EventCenter({ data, selectedEventId, setSelectedEventId, setActive, user, refresh, notify }) {
  const [detailOpen, setDetailOpen] = useState(Boolean(selectedEventId))
  const [editing, setEditing] = useState(null)
  const event = data.events.find(x => x.id === selectedEventId)
  function openEvent(id) { setSelectedEventId(id); setDetailOpen(true) }
  function go(label) { setActive(label) }
  if (!detailOpen || !event) return <div className="feature-page">
    <div className="feature-head"><div><p className="eyebrow">EVENTS</p><h2>所有活動</h2><span>按下活動，進入活動中心查看資料及使用相關功能。</span></div><button className="primary" onClick={() => setEditing({})}><Plus size={17}/>新增活動</button></div>
    <div className="event-directory">{data.events.map(row => {
      const registrations = data.registrations.filter(x => x.event_id === row.id)
      const people = registrations.reduce((sum, x) => sum + Number(x.guest_count || 0) + 1, 0)
      return <article className="card event-directory-card" key={row.id} onClick={() => openEvent(row.id)}><div><span className="status">{row.status}</span><h3>{row.title}</h3><p>{fmtDate(row.starts_at)} · {row.venue || '地點待定'}</p><p>{money(row.fee_cents)} · 名額 {row.capacity || 0}</p></div><div className="event-card-side"><strong>{people}<small>參加人數</small></strong><button className="icon-action" title="編輯活動" onClick={e => { e.stopPropagation(); setEditing(row) }}><Pencil size={16}/></button></div></article>
    })}</div>
    {!data.events.length && <article className="card"><p className="empty">暫時未有活動。</p></article>}
    {editing && <Modal title={editing.id ? '編輯活動' : '新增活動'} close={() => setEditing(null)}><EntityForm table="events" value={editing.id ? editing : null} lookups={data} user={user} close={() => setEditing(null)} refresh={refresh} notify={notify}/></Modal>}
  </div>
  const registrations = data.registrations.filter(x => x.event_id === event.id)
  const people = registrations.reduce((sum, x) => sum + Number(x.guest_count || 0) + 1, 0)
  const notices = data.announcements.filter(x => x.event_id === event.id)
  const paid = data.payments.filter(p => p.status === 'paid' && registrations.some(r => r.id === p.registration_id)).reduce((sum, p) => sum + Number(p.amount_cents || 0), 0)
  const registrationUrl = `${location.origin}/?register=${event.slug}`
  return <div className="feature-page event-detail-page">
    <div className="event-detail-top"><button className="back-button" onClick={() => setDetailOpen(false)}><ArrowLeft size={17}/>返回所有活動</button><button className="secondary" onClick={() => setEditing(event)}><Pencil size={16}/>編輯活動資料</button></div>
    <section className="event-detail-hero"><div><span className="status">{event.status}</span><h2>{event.title}</h2><p><CalendarDays size={16}/>{fmtDate(event.starts_at)} · {event.venue || '地點待定'}</p><p>{event.description || '暫時未有活動簡介。'}</p><div className="event-meta"><span>活動費用：{money(event.fee_cents)}</span><span>截止報名：{fmtDate(event.registration_deadline)}</span><span>活動狀態：{event.status}</span></div></div><div className="event-detail-number"><strong>{people}</strong><span>/ {event.capacity || 0} 人</span><small>現有參加人數</small></div></section>
    <div className="stat-grid mini-stats"><article className="stat-card"><div><p>報名紀錄</p><strong>{registrations.length}</strong></div></article><article className="stat-card"><div><p>通告數目</p><strong>{notices.length}</strong></div></article><article className="stat-card"><div><p>已收款</p><strong>{money(paid)}</strong></div></article></div>
    <div className="event-detail-grid"><article className="card event-qr-card"><p className="eyebrow">REGISTRATION QR CODE</p><h3>活動報名 QR Code</h3><QrPanel value={registrationUrl}/></article><article className="card"><p className="eyebrow">ANNOUNCEMENTS</p><h3>活動通告</h3><div className="detail-notices">{notices.length ? notices.map(row => <div key={row.id}><b>{row.subject}</b><span>{fmtDate(row.sent_at || row.created_at)} · {row.status}</span></div>) : <p className="empty">此活動尚未有通告。</p>}</div></article></div>
    <article className="card event-function-card"><p className="eyebrow">EVENT FUNCTIONS</p><h3>活動功能</h3><div className="event-function-buttons"><button onClick={() => go('參加者')}><Users size={18}/>參加者</button><button onClick={() => go('點名')}><ClipboardCheck size={18}/>點名</button><button onClick={() => go('通告發佈')}><BellRing size={18}/>通告發佈</button><button onClick={() => go('付款')}><WalletCards size={18}/>付款</button><button onClick={() => go('報表')}><ChartNoAxesColumnIncreasing size={18}/>報表</button><button onClick={() => go('報名設定')}><FileText size={18}/>報名設定</button></div></article>
    {editing && <Modal title="編輯活動" close={() => setEditing(null)}><EntityForm table="events" value={editing} lookups={data} user={user} close={() => setEditing(null)} refresh={refresh} notify={notify}/></Modal>}
  </div>
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

function PaymentBoard({ data, refresh, notify, selectedEventId, setSelectedEventId }) {
  const [editing, setEditing] = useState(false)
  const eventId = selectedEventId || data.events[0]?.id || ''
  const setEventId = setSelectedEventId
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

function Reports({ data, selectedEventId, setSelectedEventId }) {
  const eventId=selectedEventId||data.events[0]?.id||''
  const setEventId=setSelectedEventId
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
  const [selectedEventId, setSelectedEventId] = useState('')
  const [menu, setMenu] = useState(false)
  const [profile, setProfile] = useState(null)
  const [data, setData] = useState({ events: [], profiles: [], registrations: [], members: [], attendance: [], payments: [], announcements: [], registration_settings: [], email_send_logs: [], user_invitations: [] })
  const [toast, setToast] = useState(null)
  const notify = (text, type = 'success') => { setToast({ text, type }); setTimeout(() => setToast(null), 3500) }
  useEffect(() => {
    if (!isConfigured) { setChecking(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  async function refresh() {
    if (!session) return
    let currentProfile = null, profileError = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      currentProfile = result.data; profileError = result.error
      if (currentProfile || profileError) break
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    if (profileError) { notify(`未能驗證用戶權限：${profileError.message}`, 'error'); return }
    if (!currentProfile) { notify('找不到此登入帳戶的用戶資料，請聯絡程式管理員。', 'error'); return }
    if (!['admin','staff'].includes(currentProfile.role) || currentProfile.status !== 'active') {
      await supabase.auth.signOut(); setSession(null); setProfile(null); return
    }
    const queries = await Promise.all([
      supabase.from('events').select('*').order('starts_at'),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('registrations').select('*, profiles(full_name,full_name_zh,full_name_en,email), events(title,fee_cents)').order('registered_at', { ascending: false }),
      supabase.from('members').select('*, profiles(full_name,full_name_zh,full_name_en,email,phone)').order('created_at', { ascending: false }),
      supabase.from('attendance').select('*, registrations(attendee_name_zh,attendee_name_en,profiles(full_name,email),events(title))').order('checked_in_at', { ascending: false }),
      supabase.from('payments').select('*, profiles(full_name,email), registrations(attendee_name_zh,attendee_name_en,attendee_email)').order('created_at', { ascending: false }),
      supabase.from('announcements').select('*, events(title)').order('created_at', { ascending: false }),
      supabase.from('registration_settings').select('*, events(title)').order('updated_at', { ascending: false }),
      supabase.from('email_send_logs').select('*').order('sent_at', { ascending: false }),
      currentProfile.role === 'admin' ? supabase.from('user_invitations').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ])
    const next = { events: queries[0].data || [], profiles: queries[1].data || [], registrations: queries[2].data || [], members: queries[3].data || [], attendance: queries[4].data || [], payments: queries[5].data || [], announcements: queries[6].data || [], registration_settings: queries[7].data || [], email_send_logs: queries[8].data || [], user_invitations: queries[9].data || [] }
    setData(next); setProfile(currentProfile)
    const err = queries.find(q => q.error)?.error; if (err) notify(err.message, 'error')
  }
  useEffect(() => { refresh() }, [session])
  const titleDate = useMemo(() => new Intl.DateTimeFormat('zh-HK', { dateStyle: 'long' }).format(new Date()), [])
  const params = new URLSearchParams(location.search), publicSlug = params.get('register'), inviteToken = params.get('invite')
  if (!isConfigured) return <div className="setup-error">尚未設定 Supabase 環境變數。</div>
  if (publicSlug) return <PublicRegistration slug={publicSlug}/>
  if (inviteToken) return <InvitationSignup token={inviteToken}/>
  if (checking) return <div className="loading-page">正在載入 EventFlow…</div>
  if (!session) return <Login/>
  const table = pageTable[active]
  return <div className="app-shell"><Sidebar open={menu} close={() => setMenu(false)} active={active} setActive={setActive} profile={profile}/><main>
    <header className="topbar"><button className="menu-button" onClick={() => setMenu(true)}><Menu size={22}/></button><div><p>{titleDate}</p><h1>{active}</h1></div><div className="header-actions"><span className="live-dot">● 雲端已同步</span><button className="top-logout" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/>登出</button></div></header>
    <section className="content">{active === '總覽' ? <Dashboard data={data} setActive={setActive}/> : active === '活動管理' ? <EventCenter data={data} selectedEventId={selectedEventId} setSelectedEventId={setSelectedEventId} setActive={setActive} user={session.user} refresh={refresh} notify={notify}/> : active === '參加者' ? <ParticipantBoard data={data} user={session.user} refresh={refresh} notify={notify} selectedEventId={selectedEventId} setSelectedEventId={setSelectedEventId}/> : active === '報表' ? <Reports data={data} selectedEventId={selectedEventId} setSelectedEventId={setSelectedEventId}/> : active === '會員名錄' ? <MemberDirectory data={data} user={session.user} profile={profile} refresh={refresh} notify={notify}/> : active === '點名' ? <AttendanceBoard data={data} user={session.user} refresh={refresh} notify={notify} selectedEventId={selectedEventId} setSelectedEventId={setSelectedEventId}/> : active === '通告發佈' ? <NoticePublisher data={data} user={session.user} refresh={refresh} notify={notify} selectedEventId={selectedEventId} setSelectedEventId={setSelectedEventId}/> : active === '付款' ? <PaymentBoard data={data} refresh={refresh} notify={notify} selectedEventId={selectedEventId} setSelectedEventId={setSelectedEventId}/> : active === '用戶及權限' ? <UserAdministration data={data} user={session.user} refresh={refresh} notify={notify}/> : <Manager table={table} rows={data[table]} lookups={data} user={session.user} refresh={refresh} notify={notify} profile={profile}/>}</section>
    <Toast toast={toast}/>
  </main></div>
}

export default App

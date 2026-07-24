import { useEffect, useMemo, useState } from 'react'
import {
  BellRing, CalendarDays, ChartNoAxesColumnIncreasing, ChevronRight, CircleDollarSign,
  ClipboardCheck, FileText, Gauge, LogOut, Menu, Plus, Search, Settings, ShieldCheck,
  UserPlus, Users, WalletCards, X,
} from 'lucide-react'
import { isConfigured, supabase } from './supabase'

const navItems = [
  [Gauge, '總覽'], [CalendarDays, '活動管理'], [BellRing, '通告發佈'],
  [Users, '參加者'], [UserPlus, '會員名錄'], [ClipboardCheck, '點名'],
  [WalletCards, '付款'], [ChartNoAxesColumnIncreasing, '報表'], [ShieldCheck, '用戶及權限'],
]

const tableFor = {
  活動管理: 'events', 通告發佈: 'announcements', 參加者: 'registrations',
  會員名錄: 'members', 點名: 'attendance', 付款: 'payments', 用戶及權限: 'profiles',
}

const labels = {
  events: ['活動', '名稱', '活動日期'], announcements: ['通告', '標題', '發佈時間'],
  registrations: ['參加者', '姓名', '報名時間'], members: ['會員', '姓名', '電郵'],
  attendance: ['點名紀錄', '狀態', '簽到時間'], payments: ['付款', '金額', '狀態'],
  profiles: ['用戶', '姓名', '權限'],
}

function Login({ onReady }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMessage('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    setBusy(false)
    if (result.error) setMessage(result.error.message)
    else if (mode === 'signup' && !result.data.session) setMessage('帳戶已建立，請到電郵確認後登入。')
    else onReady(result.data.session)
  }

  return <div className="auth-page"><section className="auth-card">
    <div className="auth-brand"><span className="brand-mark">J</span><span><b>聚辦</b><small>EventFlow</small></span></div>
    <h1>{mode === 'login' ? '歡迎回來' : '建立帳戶'}</h1>
    <p>登入即可管理活動、會員、報名、點名及付款。</p>
    <form onSubmit={submit}>
      {mode === 'signup' && <label>姓名<input required value={name} onChange={e => setName(e.target.value)} /></label>}
      <label>電郵<input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>密碼<input required minLength="8" type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      {message && <div className="form-message">{message}</div>}
      <button className="primary wide" disabled={busy}>{busy ? '處理中…' : mode === 'login' ? '登入' : '註冊'}</button>
    </form>
    <button className="switch-auth" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>
      {mode === 'login' ? '未有帳戶？立即註冊' : '已有帳戶？返回登入'}
    </button>
  </section></div>
}

function Sidebar({ open, close, active, setActive, profile }) {
  const initials = (profile?.full_name || profile?.email || 'U').slice(0, 2).toUpperCase()
  return <>
    {open && <button className="scrim" aria-label="關閉選單" onClick={close} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark">J</span><span><b>聚辦</b><small>EventFlow</small></span><button className="mobile-close" onClick={close}><X size={20}/></button></div>
      <nav>{navItems.map(([Icon, label]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); close() }}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <div className="profile"><p>目前權限</p><span className="role">{profile?.role || 'member'}</span><div className="profile-row"><span className="avatar">{initials}</span><span><b>{profile?.full_name || 'EventFlow 用戶'}</b><small>{profile?.email}</small></span></div><button className="logout" onClick={() => supabase.auth.signOut()}><LogOut size={17}/>登出</button></div>
    </aside>
  </>
}

function Modal({ title, children, close }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={close}><section className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={close}><X size={19}/></button></div>{children}</section></div>
}

function EventForm({ close, refresh }) {
  const [form, setForm] = useState({ title: '', location: '', starts_at: '', registration_deadline: '', capacity: 100, fee: 0, status: 'draft', description: '' })
  const [message, setMessage] = useState('')
  const set = (key, value) => setForm({ ...form, [key]: value })
  async function save(e) {
    e.preventDefault()
    const slug = `${form.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')}-${Date.now()}`
    const { error } = await supabase.from('events').insert({ ...form, slug })
    if (error) return setMessage(error.message)
    await refresh(); close()
  }
  return <form className="data-form" onSubmit={save}>
    <label>活動名稱<input required value={form.title} onChange={e => set('title', e.target.value)}/></label>
    <label>地點<input value={form.location} onChange={e => set('location', e.target.value)}/></label>
    <div className="form-grid"><label>活動日期<input required type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)}/></label><label>截止報名<input type="datetime-local" value={form.registration_deadline} onChange={e => set('registration_deadline', e.target.value)}/></label></div>
    <div className="form-grid"><label>名額<input min="1" type="number" value={form.capacity} onChange={e => set('capacity', Number(e.target.value))}/></label><label>費用（HKD）<input min="0" type="number" value={form.fee} onChange={e => set('fee', Number(e.target.value))}/></label></div>
    <label>狀態<select value={form.status} onChange={e => set('status', e.target.value)}><option value="draft">草稿</option><option value="open">接受報名</option><option value="closed">截止</option></select></label>
    <label>簡介<textarea rows="3" value={form.description} onChange={e => set('description', e.target.value)}/></label>
    {message && <div className="form-message">{message}</div>}<button className="primary wide">儲存活動</button>
  </form>
}

function RecordList({ active, rows, loading }) {
  const table = tableFor[active]
  const [noun, first, second] = labels[table] || []
  const values = row => {
    if (table === 'events') return [row.title, row.starts_at && new Date(row.starts_at).toLocaleString('zh-HK'), row.status]
    if (table === 'announcements') return [row.title, row.sent_at ? new Date(row.sent_at).toLocaleString('zh-HK') : '草稿', row.status]
    if (table === 'registrations') return [row.attendee_name || row.attendee_email, new Date(row.created_at).toLocaleString('zh-HK'), row.status]
    if (table === 'members') return [row.full_name, row.email, row.status]
    if (table === 'attendance') return [row.status, row.checked_in_at ? new Date(row.checked_in_at).toLocaleString('zh-HK') : '—', row.method]
    if (table === 'payments') return [`HK$ ${Number(row.amount || 0).toFixed(2)}`, row.status, row.provider || '—']
    return [row.full_name || row.email, row.role, row.email]
  }
  return <article className="card records-card"><div className="section-head"><div><p className="eyebrow">即時資料</p><h2>{noun}管理</h2></div><span>{rows.length} 筆</span></div>
    {loading ? <p className="empty">載入中…</p> : rows.length === 0 ? <p className="empty">暫時未有資料。</p> : <div className="table-wrap"><table><thead><tr><th>{first}</th><th>{second}</th><th>狀態 / 詳情</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{values(row).map((v, i) => <td key={i}>{v || '—'}</td>)}</tr>)}</tbody></table></div>}
  </article>
}

function Dashboard({ counts, events }) {
  const current = events[0]
  const stats = [
    ['已報名', counts.registrations, Users, 'green'], ['已付款', counts.payments, CircleDollarSign, 'blue'],
    ['有效會員', counts.members, UserPlus, 'purple'], ['活動', counts.events, FileText, 'orange'],
  ]
  const percentage = current?.capacity ? Math.min(100, Math.round((counts.registrations / current.capacity) * 100)) : 0
  return <>
    <div className="stat-grid">{stats.map(([label, value, Icon, color]) => <article className="stat-card" key={label}><span className={`icon-box ${color}`}><Icon size={21}/></span><div><p>{label}</p><strong>{value}</strong></div></article>)}</div>
    <div className="two-col lead-row"><article className="card event-card"><div className="eyebrow-row"><p className="eyebrow">最新活動</p><span className="status">{current?.status || '未有活動'}</span></div><h2>{current?.title || '建立第一個活動'}</h2><p className="muted"><CalendarDays size={16}/>{current ? `${new Date(current.starts_at).toLocaleString('zh-HK')} · ${current.location || '待定'}` : '按右上角「建立活動」開始'}</p><div className="capacity"><strong>{counts.registrations}</strong><span>/ {current?.capacity || 0} 人</span><b>{percentage}% 已滿</b></div><div className="progress"><i style={{width: `${percentage}%`}}/></div></article>
    <article className="card access-card"><p className="eyebrow"><ShieldCheck size={15}/>系統狀態</p><h2>功能已連接</h2><div className="check-list"><p>✓ 安全登入及權限</p><p>✓ 活動與會員資料庫</p><p>✓ 報名、點名及付款紀錄</p><p>✓ 即時雲端同步</p></div></article></div>
  </>
}

function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('總覽')
  const [modal, setModal] = useState(null)
  const [profile, setProfile] = useState(null)
  const [rows, setRows] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState({ registrations: 0, payments: 0, members: 0, events: 0 })

  useEffect(() => {
    if (!isConfigured) { setChecking(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  async function loadProfile() {
    if (!session) return
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
    setProfile(data || { email: session.user.email, full_name: session.user.user_metadata?.full_name })
  }

  async function loadDashboard() {
    const [{ data: ev }, ...results] = await Promise.all([
      supabase.from('events').select('*').order('starts_at', { ascending: true }),
      supabase.from('registrations').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('events').select('*', { count: 'exact', head: true }),
    ])
    setEvents(ev || [])
    setCounts({ registrations: results[0].count || 0, payments: results[1].count || 0, members: results[2].count || 0, events: results[3].count || 0 })
  }

  async function loadPage() {
    if (!session) return
    setLoading(true)
    if (active === '總覽' || active === '報表') await loadDashboard()
    else {
      const table = tableFor[active]
      const { data } = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(200)
      setRows(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { if (session) { loadProfile(); loadPage() } }, [session, active])
  const titleDate = useMemo(() => new Intl.DateTimeFormat('zh-HK', { dateStyle: 'long' }).format(new Date()), [])

  if (!isConfigured) return <div className="setup-error">尚未設定 Supabase 環境變數。</div>
  if (checking) return <div className="loading-page">正在載入 EventFlow…</div>
  if (!session) return <Login onReady={setSession}/>

  return <div className="app-shell"><Sidebar open={menuOpen} close={() => setMenuOpen(false)} active={active} setActive={setActive} profile={profile}/><main>
    <header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(true)}><Menu size={22}/></button><div><p>{titleDate}</p><h1>{active}</h1></div><div className="header-actions"><button className="search"><Search size={19}/></button><button className="primary" onClick={() => setModal('event')}><Plus size={18}/>建立活動</button></div></header>
    <section className="content">{active === '總覽' ? <Dashboard counts={counts} events={events}/> : active === '報表' ? <Dashboard counts={counts} events={events}/> : <RecordList active={active} rows={rows} loading={loading}/>}</section>
    {modal === 'event' && <Modal title="建立活動" close={() => setModal(null)}><EventForm close={() => setModal(null)} refresh={loadDashboard}/></Modal>}
  </main></div>
}

export default App

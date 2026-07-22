import { useState } from 'react'
import {
  BellRing, CalendarDays, ChartNoAxesColumnIncreasing, ChevronRight, CircleDollarSign,
  ClipboardCheck, FileText, Gauge, LogOut, MailPlus, Menu, Plus, Search, Settings,
  ShieldCheck, Sparkles, UserPlus, Users, WalletCards, X,
} from 'lucide-react'

const navItems = [
  [Gauge, '總覽'], [CalendarDays, '活動管理'], [BellRing, '通告發佈', 'NEW'],
  [Settings, '報名設定'], [Users, '參加者'], [UserPlus, '會員名錄'],
  [ClipboardCheck, '點名'], [WalletCards, '付款'],
  [ChartNoAxesColumnIncreasing, '報表'], [ShieldCheck, '用戶及權限'],
]

const stats = [
  ['已報名', '128', Users, 'green'], ['已付款', '103', CircleDollarSign, 'blue'],
  ['有效會員', '268', UserPlus, 'purple'], ['待發通告', '2', FileText, 'orange'],
]

const actions = [
  [MailPlus, '發佈活動通告', '上載 Poster 及加 QR', 'mint'],
  [UserPlus, '新增會員', '建立會員資料', 'lavender'],
  [ClipboardCheck, '開啟點名表', '即場登記出席', 'sky'],
  [ChartNoAxesColumnIncreasing, '匯出應收報表', '查看未付款名單', 'sand'],
]

function Sidebar({ open, close, active, setActive }) {
  return <>
    {open && <button className="scrim" aria-label="關閉選單" onClick={close} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark">J</span><span><b>聚辦</b><small>EventFlow</small></span><button className="mobile-close" onClick={close}><X size={20}/></button></div>
      <nav aria-label="主要功能">
        {navItems.map(([Icon, label, badge]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); close() }}><Icon size={19}/><span>{label}</span>{badge && <em>{badge}</em>}</button>)}
      </nav>
      <div className="profile">
        <p>目前權限</p><span className="role">程式管理員</span>
        <div className="profile-row"><span className="avatar">JL</span><span><b>Jules Lee</b><small>jules@eventflow.hk</small></span></div>
        <button className="logout"><LogOut size={17}/>登出</button>
      </div>
    </aside>
  </>
}

function StatCard({ item }) {
  const [label, value, Icon, color] = item
  return <article className="stat-card"><span className={`icon-box ${color}`}><Icon size={21}/></span><div><p>{label}</p><strong>{value}</strong></div><span className="trend">+12%</span></article>
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('總覽')
  return <div className="app-shell">
    <Sidebar open={menuOpen} close={() => setMenuOpen(false)} active={active} setActive={setActive}/>
    <main>
      <header className="topbar">
        <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="開啟選單"><Menu size={22}/></button>
        <div><p>2026年7月22日 · 星期三</p><h1>{active}</h1></div>
        <div className="header-actions"><button className="search" aria-label="搜尋"><Search size={19}/></button><button className="primary"><Plus size={18}/>建立活動</button></div>
      </header>

      <section className="content">
        <div className="stat-grid">{stats.map(item => <StatCard key={item[0]} item={item}/>)}</div>

        <div className="two-col lead-row">
          <article className="card event-card">
            <div className="eyebrow-row"><p className="eyebrow"><span className="pulse"/>現正接受報名</p><span className="status">進行中</span></div>
            <h2>2026 夏日交流晚宴</h2>
            <p className="muted"><CalendarDays size={16}/>2026年8月18日　·　香港會議展覽中心</p>
            <div className="capacity"><strong>128</strong><span>/ 160 人</span><b>80% 已滿</b></div>
            <div className="progress"><i/></div>
            <div className="event-metrics"><div><small>活動容量</small><b>160 人</b></div><div><small>報名來源</small><b>QR 78%</b></div><div><small>已付款</small><b>103 人</b></div><div><small>待付款</small><b>25 人</b></div></div>
          </article>

          <article className="card notice-card">
            <p className="eyebrow"><Sparkles size={15}/>發佈流程</p><h2>下一份活動通告</h2>
            <div className="notice-title"><span className="doc-icon"><FileText size={21}/></span><div><b>人工智能商業論壇 2026</b><small>Poster 已上載 · QR Code 待確認</small></div><span className="draft">草稿</span></div>
            <ol><li className="done"><span>✓</span>上載活動 Poster</li><li className="current"><span>2</span>設定 QR Code 位置</li><li><span>3</span>預覽及發送電郵</li></ol>
            <button className="secondary">繼續製作通告<ChevronRight size={17}/></button>
          </article>
        </div>

        <div className="two-col bottom-row">
          <article className="card quick-card"><div className="section-head"><div><p className="eyebrow">常用功能</p><h2>快捷操作</h2></div></div><div className="action-grid">{actions.map(([Icon,title,sub,color]) => <button className="action" key={title}><span className={`icon-box ${color}`}><Icon size={20}/></span><span><b>{title}</b><small>{sub}</small></span><ChevronRight size={17}/></button>)}</div></article>
          <article className="card access-card"><p className="eyebrow"><ShieldCheck size={15}/>權限安全</p><h2>三層存取控制</h2><div className="access-list"><div><span className="avatar dark">JL</span><span><b>程式管理員</b><small>完整系統存取</small></span><strong>2 人</strong></div><div><span className="avatar teal">U</span><span><b>一般用戶</b><small>日常營運操作</small></span><strong>5 人</strong></div><div><span className="avatar pale">M</span><span><b>會員參加者</b><small>個人報名及付款</small></span><strong>268 人</strong></div></div><button className="text-button">管理用戶權限 <ChevronRight size={16}/></button></article>
        </div>
      </section>
    </main>
  </div>
}

export default App

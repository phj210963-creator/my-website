import tls from 'node:tls'

const json = (res, status, body) => res.status(status).json(body)
const encodeHeader = value => `=?UTF-8?B?${Buffer.from(value).toString('base64')}?=`
const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char])

function smtpClient(user, password) {
  const socket = tls.connect({ host: 'smtp.gmail.com', port: 465, servername: 'smtp.gmail.com' })
  let buffer = '', pending = []
  socket.setEncoding('utf8')
  socket.on('data', chunk => {
    buffer += chunk
    const lines = buffer.split('\r\n')
    buffer = lines.pop() || ''
    let response = []
    for (const line of lines) {
      response.push(line)
      if (/^\d{3} /.test(line)) pending.shift()?.resolve(response.join('\n')), response = []
    }
  })
  socket.on('error', error => pending.shift()?.reject(error))
  const read = () => new Promise((resolve, reject) => pending.push({ resolve, reject }))
  const command = async (value, valid = [2, 3]) => {
    if (value !== null) socket.write(`${value}\r\n`)
    const response = await read()
    const code = Number(response.slice(0, 3))
    if (!valid.includes(Math.floor(code / 100))) throw new Error(`SMTP ${code}: ${response.replace(/\n/g, ' ')}`)
    return response
  }
  return {
    async connect() {
      await command(null, [2])
      await command(`EHLO eventflow.vercel.app`, [2])
      await command('AUTH LOGIN', [3])
      await command(Buffer.from(user).toString('base64'), [3])
      await command(Buffer.from(password).toString('base64'), [2])
    },
    async send({ recipients, subject, text, html, attachment }) {
      await command(`MAIL FROM:<${user}>`, [2])
      const accepted = []
      for (const email of recipients) {
        try { await command(`RCPT TO:<${email}>`, [2, 3]); accepted.push(email) } catch {}
      }
      if (!accepted.length) throw new Error('沒有收件地址获 Gmail 接受。')
      await command('DATA', [3])
      const boundary = `EventFlow_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const alt = `${boundary}_alternative`
      const lines = [
        `From: EventFlow <${user}>`,
        `To: EventFlow Members <${user}>`,
        `Subject: ${encodeHeader(subject)}`,
        `Date: ${new Date().toUTCString()}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        `Content-Type: multipart/alternative; boundary="${alt}"`,
        '',
        `--${alt}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(text).toString('base64').match(/.{1,76}/g)?.join('\r\n') || '',
        `--${alt}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(html).toString('base64').match(/.{1,76}/g)?.join('\r\n') || '',
        `--${alt}--`,
      ]
      if (attachment) lines.push(
        `--${boundary}`,
        `Content-Type: ${attachment.type}; name="${attachment.name.replaceAll('"', '')}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachment.name.replaceAll('"', '')}"`,
        '',
        attachment.content.match(/.{1,76}/g)?.join('\r\n') || '',
      )
      lines.push(`--${boundary}--`, '')
      socket.write(`${lines.join('\r\n').replace(/\r\n\./g, '\r\n..')}\r\n.\r\n`)
      await command(null, [2])
      return accepted.length
    },
    async close() {
      try { await command('QUIT', [2]) } finally { socket.end() }
    },
  }
}

async function supabaseFetch(path, token, options = {}) {
  const base = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  return fetch(`${base}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
}

async function writeLog(token, payload) {
  await supabaseFetch('/rest/v1/email_send_logs', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return json(res, 401, { error: '请先登入。' })
  const smtpUser = process.env.SMTP_USER
  const smtpPassword = process.env.SMTP_APP_PASSWORD
  if (!smtpUser || !smtpPassword) return json(res, 503, { error: '电邮服务器尚未完成设定。' })

  const { event_id, announcement_id, subject, body, registration_url, attachment_path, attachment_name, attachment_type } = req.body || {}
  if (!event_id || !subject || !body) return json(res, 400, { error: '活动、主旨及电邮内容均为必填。' })

  let userId = null
  try {
    const userResponse = await supabaseFetch('/auth/v1/user', token)
    if (!userResponse.ok) return json(res, 401, { error: '登入已过期，请重新登入。' })
    userId = (await userResponse.json()).id
    const profileResponse = await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role,status`, token)
    const profile = (await profileResponse.json())?.[0]
    if (!profile || !['admin', 'staff'].includes(profile.role) || profile.status !== 'active') return json(res, 403, { error: '你没有发送通告的权限。' })

    const membersResponse = await supabaseFetch('/rest/v1/members?select=email,profiles(email)&member_status=neq.inactive', token)
    if (!membersResponse.ok) throw new Error('无法读取会员电邮名录。')
    const members = await membersResponse.json()
    const recipients = [...new Set(members.map(member => member.email || member.profiles?.email).filter(Boolean).map(email => email.trim().toLowerCase()))]
    if (!recipients.length) throw new Error('会员名录没有可用的电邮地址。')

    let attachment = null
    if (attachment_path) {
      const safePath = attachment_path.split('/').map(encodeURIComponent).join('/')
      const fileResponse = await supabaseFetch(`/storage/v1/object/authenticated/event-posters/${safePath}`, token)
      if (!fileResponse.ok) throw new Error('无法读取数码通告附件。')
      attachment = {
        name: attachment_name || attachment_path.split('/').pop(),
        type: attachment_type || fileResponse.headers.get('content-type') || 'application/octet-stream',
        content: Buffer.from(await fileResponse.arrayBuffer()).toString('base64'),
      }
    }

    const messageText = `${body}\n\n网上报名：${registration_url || ''}`
    const messageHtml = `<div style="font-family:Arial,sans-serif;line-height:1.7">${escapeHtml(body).replace(/\n/g, '<br>')}<p><strong>网上报名：</strong><a href="${escapeHtml(registration_url || '')}">${escapeHtml(registration_url || '')}</a></p></div>`
    const client = smtpClient(smtpUser, smtpPassword)
    await client.connect()
    let success = 0
    try {
      for (let index = 0; index < recipients.length; index += 50) {
        success += await client.send({ recipients: recipients.slice(index, index + 50), subject, text: messageText, html: messageHtml, attachment })
      }
    } finally { await client.close() }

    await writeLog(token, {
      event_id, announcement_id: announcement_id || null, sent_by: userId, subject,
      recipient_count: recipients.length, success_count: success,
      failed_count: Math.max(0, recipients.length - success), status: success ? 'sent' : 'failed',
      attachment_path: attachment_path || null,
    })
    return json(res, 200, { recipient_count: recipients.length, success_count: success, failed_count: Math.max(0, recipients.length - success) })
  } catch (error) {
    if (userId) await writeLog(token, {
      event_id, announcement_id: announcement_id || null, sent_by: userId, subject: subject || '活动通告',
      recipient_count: 0, success_count: 0, failed_count: 0, status: 'failed',
      attachment_path: attachment_path || null, error_message: error.message,
    }).catch(() => {})
    return json(res, 500, { error: error.message || '发送失败。' })
  }
}

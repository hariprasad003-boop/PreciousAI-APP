// Email service using Resend REST API (no SDK — plain fetch)
// From: PreciousAI <reminders@preciousai.app>

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_ADDRESS = 'PreciousAI <reminders@preciousai.app>'

interface SendResult {
  success: boolean
  error?: string
}

// ─── Shared HTML helpers ─────────────────────────────────────────────────────

function emailWrapper(storeName: string, primaryColor: string, body: string): string {
  const gold = '#D4AF37'
  const accent = primaryColor || gold

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${storeName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1A1A2E 0%,#16213E 100%);padding:32px 40px;text-align:center;border-bottom:4px solid ${accent};">
              <p style="margin:0;font-size:22px;font-weight:700;color:${accent};letter-spacing:1px;text-transform:uppercase;">${storeName}</p>
              <p style="margin:6px 0 0;font-size:12px;color:#aaaaaa;letter-spacing:2px;text-transform:uppercase;">Powered by PreciousAI</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:24px 40px;border-top:1px solid #eeeeee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#999999;">
                You are receiving this because you have notifications enabled on PreciousAI.<br/>
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://preciousai.app'}/settings/notifications" style="color:${accent};text-decoration:none;">Manage notification preferences</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#cccccc;">
                &copy; ${new Date().getFullYear()} PreciousAI. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(label: string, url: string, color: string): string {
  return `<a href="${url}" style="display:inline-block;padding:14px 32px;background-color:${color};color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.5px;margin-top:8px;">${label}</a>`
}

// ─── Core send function ───────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY is not set')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[email] Resend error ${res.status}:`, text)
      return { success: false, error: `Resend API error ${res.status}: ${text}` }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] fetch error:', message)
    return { success: false, error: message }
  }
}

// ─── Birthday Reminder ────────────────────────────────────────────────────────

export async function sendBirthdayReminder(opts: {
  to: string
  staffName: string
  customerName: string
  customerPhone: string
  birthdayDate: string
  storeName: string
  primaryColor?: string
}): Promise<SendResult> {
  const { to, staffName, customerName, customerPhone, birthdayDate, storeName, primaryColor } = opts
  const gold = '#D4AF37'
  const accent = primaryColor || gold
  const waText = encodeURIComponent(`Happy Birthday ${customerName}! Wishing you a wonderful day. 🎂`)
  const waLink = `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${waText}`

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;color:#1A1A2E;">Birthday Reminder</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#888888;border-bottom:1px solid #eeeeee;padding-bottom:24px;">Upcoming celebration alert</p>

    <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px;">
      Hi <strong>${staffName}</strong>,
    </p>
    <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 24px;">
      <strong style="color:${accent};">${customerName}</strong>'s birthday is coming up on
      <strong>${birthdayDate}</strong>. This is a great opportunity to reach out with a
      personalised message or a special offer!
    </p>

    <div style="background:#fffbee;border-left:4px solid ${accent};padding:16px 20px;border-radius:4px;margin:0 0 32px;">
      <p style="margin:0;font-size:14px;color:#555555;">
        <strong>Tip:</strong> A birthday discount or a complimentary gift wrap offer can significantly
        increase customer loyalty and lifetime value.
      </p>
    </div>

    <p style="text-align:center;margin:0 0 16px;">
      ${ctaButton('Send Birthday WhatsApp', waLink, '#25D366')}
    </p>
    <p style="text-align:center;margin:0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://preciousai.app'}/customers" style="font-size:13px;color:${accent};text-decoration:none;">View Customer Profile &rarr;</a>
    </p>
  `

  return sendEmail({
    to,
    subject: `🎂 ${customerName}'s Birthday is Coming Up!`,
    html: emailWrapper(storeName, accent, body),
  })
}

// ─── Anniversary Reminder ─────────────────────────────────────────────────────

export async function sendAnniversaryReminder(opts: {
  to: string
  staffName: string
  customerName: string
  customerPhone: string
  anniversaryDate: string
  storeName: string
  primaryColor?: string
}): Promise<SendResult> {
  const { to, staffName, customerName, customerPhone, anniversaryDate, storeName, primaryColor } = opts
  const gold = '#D4AF37'
  const accent = primaryColor || gold
  const waText = encodeURIComponent(`Happy Anniversary ${customerName}! Wishing you and your loved one a beautiful day. 💍`)
  const waLink = `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${waText}`

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;color:#1A1A2E;">Anniversary Reminder</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#888888;border-bottom:1px solid #eeeeee;padding-bottom:24px;">Upcoming celebration alert</p>

    <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px;">
      Hi <strong>${staffName}</strong>,
    </p>
    <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 24px;">
      <strong style="color:${accent};">${customerName}</strong>'s anniversary is coming up on
      <strong>${anniversaryDate}</strong>. Consider reaching out with a special offer on
      anniversary jewellery — rings, pendants, or personalised gifts!
    </p>

    <div style="background:#fffbee;border-left:4px solid ${accent};padding:16px 20px;border-radius:4px;margin:0 0 32px;">
      <p style="margin:0;font-size:14px;color:#555555;">
        <strong>Tip:</strong> Anniversary customers have a high intent to purchase. A curated
        collection message can convert quickly.
      </p>
    </div>

    <p style="text-align:center;margin:0 0 16px;">
      ${ctaButton('Send Anniversary WhatsApp', waLink, '#25D366')}
    </p>
    <p style="text-align:center;margin:0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://preciousai.app'}/customers" style="font-size:13px;color:${accent};text-decoration:none;">View Customer Profile &rarr;</a>
    </p>
  `

  return sendEmail({
    to,
    subject: `💍 ${customerName}'s Anniversary is Coming Up!`,
    html: emailWrapper(storeName, accent, body),
  })
}

// ─── Follow-up Reminder ───────────────────────────────────────────────────────

export async function sendFollowUpReminder(opts: {
  to: string
  staffName: string
  leadName: string
  leadPhone: string
  followUpMessage: string
  scheduledAt: string
  leadId?: string
  storeName: string
  primaryColor?: string
}): Promise<SendResult> {
  const { to, staffName, leadName, leadPhone, followUpMessage, scheduledAt, leadId, storeName, primaryColor } = opts
  const gold = '#D4AF37'
  const accent = primaryColor || gold
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://preciousai.app'
  const leadUrl = leadId ? `${appUrl}/leads/${leadId}` : `${appUrl}/leads`
  const waLink = `https://wa.me/${leadPhone.replace(/\D/g, '')}`

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;color:#1A1A2E;">Follow-up Due</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#888888;border-bottom:1px solid #eeeeee;padding-bottom:24px;">A follow-up action requires your attention</p>

    <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px;">
      Hi <strong>${staffName}</strong>,
    </p>
    <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 8px;">
      You have a follow-up scheduled for <strong style="color:${accent};">${leadName}</strong>
      on <strong>${scheduledAt}</strong>.
    </p>

    <div style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:6px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:12px;color:#888888;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Follow-up Message</p>
      <p style="margin:0;font-size:15px;color:#333333;line-height:1.7;">${followUpMessage}</p>
    </div>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 8px;">
      <tr>
        <td style="padding:0 8px 0 0;">
          <p style="margin:0;font-size:13px;color:#555555;"><strong>Lead:</strong> ${leadName}</p>
        </td>
        <td>
          <p style="margin:0;font-size:13px;color:#555555;"><strong>Phone:</strong> ${leadPhone}</p>
        </td>
      </tr>
    </table>

    <p style="text-align:center;margin:32px 0 16px;">
      ${ctaButton('View Lead', leadUrl, accent)}
    </p>
    <p style="text-align:center;margin:0;">
      ${ctaButton('Open WhatsApp', waLink, '#25D366')}
    </p>
  `

  return sendEmail({
    to,
    subject: `⏰ Follow-up Due: ${leadName}`,
    html: emailWrapper(storeName, accent, body),
  })
}

// ─── Team Invite ──────────────────────────────────────────────────────────────

export async function sendTeamInvite(opts: {
  to: string
  storeName: string
  inviterName: string
  inviteUrl: string
  primaryColor?: string
}): Promise<SendResult> {
  const { to, storeName, inviterName, inviteUrl, primaryColor } = opts
  const gold = '#D4AF37'
  const accent = primaryColor || gold

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;color:#1A1A2E;">You've been invited!</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#888888;border-bottom:1px solid #eeeeee;padding-bottom:24px;">Team invitation from ${storeName}</p>

    <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px;">
      <strong>${inviterName}</strong> has invited you to join <strong style="color:${accent};">${storeName}</strong>
      on PreciousAI — the all-in-one CRM for jewellery stores.
    </p>

    <p style="font-size:15px;color:#555555;line-height:1.6;margin:0 0 32px;">
      Click the button below to accept your invitation and set up your account. This link will
      expire in 7 days.
    </p>

    <p style="text-align:center;margin:0 0 32px;">
      ${ctaButton('Accept Invitation', inviteUrl, accent)}
    </p>

    <div style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:6px;padding:20px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#888888;">With PreciousAI you can:</p>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#555555;line-height:1.8;">
        <li>Manage leads and customers with AI-powered insights</li>
        <li>Track follow-ups and never miss an opportunity</li>
        <li>Send WhatsApp messages directly from the platform</li>
        <li>Get birthday and anniversary reminders automatically</li>
      </ul>
    </div>

    <p style="font-size:12px;color:#aaaaaa;text-align:center;margin:0;">
      If you did not expect this invitation, you can safely ignore this email.
    </p>
  `

  return sendEmail({
    to,
    subject: `You've been invited to join ${storeName} on PreciousAI`,
    html: emailWrapper(storeName, accent, body),
  })
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  to: string
  ownerName: string
  storeName: string
  loginUrl: string
  primaryColor?: string
}): Promise<SendResult> {
  const { to, ownerName, storeName, loginUrl, primaryColor } = opts
  const gold = '#D4AF37'
  const accent = primaryColor || gold

  const checkmark = `<span style="color:${accent};font-weight:700;">&#10003;</span>`

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;color:#1A1A2E;">Welcome to PreciousAI!</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#888888;border-bottom:1px solid #eeeeee;padding-bottom:24px;">Your store is ready, ${ownerName}</p>

    <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px;">
      Hi <strong>${ownerName}</strong>,
    </p>
    <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 24px;">
      Your store <strong style="color:${accent};">${storeName}</strong> is all set up on PreciousAI.
      Here's a quick checklist to help you get started:
    </p>

    <div style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:6px;padding:24px;margin:0 0 32px;">
      <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#1A1A2E;text-transform:uppercase;letter-spacing:1px;">Getting Started Checklist</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#555555;border-bottom:1px solid #eeeeee;">${checkmark}&nbsp;&nbsp;Store created &amp; account activated</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#555555;border-bottom:1px solid #eeeeee;">&#9633;&nbsp;&nbsp;Add your first customer or lead</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#555555;border-bottom:1px solid #eeeeee;">&#9633;&nbsp;&nbsp;Connect your WhatsApp Business account</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#555555;border-bottom:1px solid #eeeeee;">&#9633;&nbsp;&nbsp;Invite your team members</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#555555;">&#9633;&nbsp;&nbsp;Customise your store branding</td>
        </tr>
      </table>
    </div>

    <p style="text-align:center;margin:0 0 32px;">
      ${ctaButton('Go to Dashboard', loginUrl, accent)}
    </p>

    <p style="font-size:14px;color:#888888;line-height:1.6;text-align:center;margin:0;">
      Questions? Reply to this email or visit our
      <a href="https://preciousai.app/docs" style="color:${accent};text-decoration:none;">Help Centre</a>.
    </p>
  `

  return sendEmail({
    to,
    subject: `Welcome to PreciousAI — Your Store is Ready!`,
    html: emailWrapper(storeName, accent, body),
  })
}

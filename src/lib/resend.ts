// src/lib/resend.ts
// Email + SMS-via-email (no Twilio needed — 100% free)

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from: string = 'RenewalRadar <onboarding@resend.dev>'
): Promise<{ id: string } | null> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Resend error:', text);
      return null;
    }

    return res.json();
  } catch (err) {
    console.error('sendEmail failed:', err);
    return null;
  }
}

// SMS via email-to-SMS gateways — FREE, no Twilio
// Carrier must be known; can ask user during signup
const SMS_GATEWAYS: Record<string, string> = {
  att: 'txt.att.net',
  verizon: 'vtext.com',
  tmobile: 'tmomail.net',
  sprint: 'messaging.sprintpcs.com',
  boost: 'sms.myboostmobile.com',
  cricket: 'sms.cricketwireless.net',
  metropcs: 'mymetropcs.com',
  uscellular: 'email.uscc.net',
};

export async function sendSmsViaEmail(
  phone: string,
  carrier: string,
  message: string
): Promise<boolean> {
  const gateway = SMS_GATEWAYS[carrier.toLowerCase().replace(/[^a-z]/g, '')];
  if (!gateway) {
    console.warn(`Unknown carrier: ${carrier}`);
    return false;
  }

  const smsEmail = `${phone.replace(/\D/g, '')}@${gateway}`;
  const result = await sendEmail(smsEmail, 'RenewalRadar', `<p>${message}</p>`);
  return result !== null;
}

// Build welcome email HTML
export function buildWelcomeEmail(
  agencyName: string,
  agencyId: string,
  trialEnds: string,
  sendTime: string,
  appUrl: string
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#f5f5f5;margin:0;padding:40px 20px;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="margin-bottom:32px;">
      <span style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#ef4444;font-weight:600;">RENEWALRADAR</span>
      <h1 style="font-size:28px;font-weight:800;margin:8px 0 0;color:#f5f5f5;">You're in. Let's protect your revenue.</h1>
    </div>

    <div style="background:#161616;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:14px;color:#999;">Your 7-day trial ends</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#ef4444;">${new Date(trialEnds).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
    </div>

    <div style="margin-bottom:24px;">
      <p style="font-size:14px;color:#aaa;margin:0 0 16px;">Every morning at ${sendTime}, you'll get:</p>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="background:#161616;border-left:3px solid #ef4444;padding:12px 16px;border-radius:0 8px 8px 0;">
          <p style="margin:0;font-size:14px;font-weight:600;">🎯 Churn risk scores</p>
          <p style="margin:4px 0 0;font-size:13px;color:#888;">0–100 score per client based on engagement, impressions, and posting frequency</p>
        </div>
        <div style="background:#161616;border-left:3px solid #f97316;padding:12px 16px;border-radius:0 8px 8px 0;">
          <p style="margin:0;font-size:14px;font-weight:600;">📞 AI intervention scripts</p>
          <p style="margin:4px 0 0;font-size:13px;color:#888;">Exact words to say when you call the client — natural, not salesy</p>
        </div>
        <div style="background:#161616;border-left:3px solid #22c55e;padding:12px 16px;border-radius:0 8px 8px 0;">
          <p style="margin:0;font-size:14px;font-weight:600;">💰 Revenue at risk</p>
          <p style="margin:4px 0 0;font-size:13px;color:#888;">Dollar figure at stake so you know exactly who to call first</p>
        </div>
      </div>
    </div>

    <div style="background:#161616;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#f5f5f5;">Next steps:</p>
      <ol style="margin:0;padding-left:20px;color:#aaa;font-size:14px;line-height:2;">
        <li>Open your dashboard (link below)</li>
        <li>Add your first client brand</li>
        <li>Connect their Twitter/X account</li>
        <li>Get your first risk report tomorrow morning</li>
      </ol>
    </div>

    <a href="${appUrl}/dashboard?agency=${agencyId}"
       style="display:block;background:#ef4444;color:#fff;text-align:center;padding:16px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;margin-bottom:24px;">
      Go to Dashboard →
    </a>

    <p style="font-size:12px;color:#555;text-align:center;">Questions? Just reply to this email.<br>RenewalRadar · Built for agencies that protect their revenue</p>
  </div>
</body>
</html>`;
}

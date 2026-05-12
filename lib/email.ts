import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Budowa Koszty <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://budowa-koszty.vercel.app'

export async function sendInvitationEmail({
  toEmail,
  projectName,
  inviterEmail,
}: {
  toEmail: string
  projectName: string
  inviterEmail: string
}) {
  const loginUrl = `${APP_URL}/login`

  const { error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Zaproszenie do projektu "${projectName}" — Budowa Koszty`,
    html: `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#3dbdaa;padding:28px 32px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Budowa Koszty</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Masz zaproszenie!</p>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              <strong style="color:#111827;">${inviterEmail}</strong> zaprasza Cię do wspólnego śledzenia kosztów budowy w projekcie:
            </p>

            <div style="background:#f3faf9;border:1px solid #3dbdaa33;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;font-size:17px;font-weight:600;color:#111827;">🏗 ${projectName}</p>
            </div>

            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
              Zaloguj się (lub utwórz konto z <strong>${toEmail}</strong>), by zobaczyć projekt.
              Dostęp zostanie przyznany automatycznie po zalogowaniu.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${loginUrl}"
                     style="display:inline-block;background:#3dbdaa;color:#ffffff;font-size:15px;font-weight:600;padding:13px 32px;border-radius:8px;text-decoration:none;">
                    Przejdź do Budowa Koszty →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Jeśli nie spodziewałeś się tego zaproszenia, możesz zignorować tę wiadomość.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
}

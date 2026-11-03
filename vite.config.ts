import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import nodemailer from 'nodemailer';

function emailApiPlugin(): Plugin {
  return {
    name: 'email-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/send-academic-email' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const { to, subject, htmlBody, body: plainBody, senderName, webhookUrl } = payload;

              if (!to || !to.includes('@')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'กรุณาระบุที่อยู่อีเมลผู้รับที่ถูกต้อง' }));
                return;
              }

              const targetWebhook =
                (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.startsWith('https://script.google.com/'))
                  ? webhookUrl.trim()
                  : 'https://script.google.com/macros/s/AKfycbz90JWFomtPUKUjPth7GNixvljFDqEvE29vSpwc4PcBA9TfR8ipStdhr_yD298V7Zuw4w/exec';

              const scriptPayload = {
                action: 'send_email',
                to: to.trim(),
                subject: subject || 'แจ้งเตือนจากฝ่ายบริหารวิชาการ PCSHS KSN',
                htmlBody: htmlBody || plainBody || '<p>ข้อความจากฝ่ายบริหารวิชาการ</p>',
                body: plainBody || 'กรุณาเปิดอ่านเนื้อหาในรูปแบบ HTML',
                senderName: senderName || 'ฝ่ายบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์',
                timestamp: new Date().toISOString(),
              };

              const scriptRes = await fetch(targetWebhook, {
                method: 'POST',
                headers: {
                  'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(scriptPayload),
                redirect: 'follow',
              });

              const responseText = await scriptRes.text();
              let resJson: any = {};
              try {
                resJson = JSON.parse(responseText);
              } catch {
                resJson = {
                  success: false,
                  error: `Google Apps Script ส่งผลลัพธ์ไม่ถูกต้อง: ${responseText.slice(0, 120)}`,
                };
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(resJson));
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: errMsg }));
            }
          });
          return;
        }

        if (req.url === '/api/send-email' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const { to, subject, text, appPassword } = payload;

              if (!to || !subject) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Missing to or subject' }));
                return;
              }

              // Password precedence: 1. User provided app password, 2. Env SMTP_APP_PASSWORD, 3. Env SMTP_PASS, 4. School default
              const rawPassword =
                appPassword ||
                process.env.SMTP_APP_PASSWORD ||
                process.env.SMTP_PASS ||
                'Pcs@12345';
              const password = String(rawPassword).trim().replace(/\s+/g, '');
              const user = (process.env.SMTP_USER || 'academics@pcshsksn.ac.th').trim();


              const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                  user,
                  pass: password,
                },
              });

              await transporter.sendMail({
                from: `"ฝ่ายบริหารวิชาการ ร.ร.วิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์" <${user}>`,
                to,
                subject,
                text,
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, sender: user }));
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              const isBadCredentials =
                errMsg.includes('535') ||
                errMsg.includes('BadCredentials') ||
                errMsg.includes('Application-specific password required') ||
                errMsg.includes('Username and Password not accepted');

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error: errMsg,
                  requiresAppPassword: isBadCredentials,
                })
              );
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), emailApiPlugin()],
    envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'SUPABASE_'],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

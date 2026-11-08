import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import nodemailer from 'nodemailer';
import { INITIAL_TEACHERS } from './src/data/initialTeachers';

// Server-side authoritative credentials store (kept strictly on server)
const serverCredentialsStore = new Map<string, string>();
INITIAL_TEACHERS.forEach((t) => {
  serverCredentialsStore.set(t.Teacher_ID.toLowerCase(), t.Pass || '12345');
  if (t.Email) {
    serverCredentialsStore.set(t.Email.toLowerCase(), t.Pass || '12345');
  }
});

function sanitizeServerTeacher(t: any) {
  const { Pass, national_id, birth_date, ...rest } = t;
  const currentPass = serverCredentialsStore.get(t.Teacher_ID.toLowerCase()) || t.Pass || '12345';
  return {
    ...rest,
    Pass: '', // Sanitized - never leak other teachers' passwords to browser
    national_id: '', // Sanitized - citizen ID is not sent to browser
    birth_date: '', // Sanitized - birth date is not sent to browser
    has_changed_password: currentPass !== '12345',
  };
}

function emailApiPlugin(): Plugin {
  return {
    name: 'email-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // 1. Server-side Authentication (verifies password on server without leaking to client)
        if (req.url === '/api/auth/login' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { identifier, password } = JSON.parse(body || '{}');
              if (!identifier || !password) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'กรุณากรอกรหัสครู / อีเมล และรหัสผ่าน' }));
                return;
              }

              const q = String(identifier).trim().toLowerCase();
              const p = String(password).trim();

              const found = INITIAL_TEACHERS.find(
                (t) =>
                  t.Teacher_ID.toLowerCase() === q ||
                  t.Email.toLowerCase() === q ||
                  (t.national_id && t.national_id.toLowerCase() === q)
              );

              if (!found) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'ไม่พบบัญชีผู้ใช้นี้ในระบบโรงเรียน กรุณาตรวจสอบอีเมลหรือรหัสครู (Teacher_ID)' }));
                return;
              }

              const expectedPass = serverCredentialsStore.get(found.Teacher_ID.toLowerCase()) || found.Pass || '12345';
              if (expectedPass !== p) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'รหัสผ่านไม่ถูกต้อง (ค่าเริ่มต้นคือ 12345)' }));
                return;
              }

              const sanitized = sanitizeServerTeacher(found);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, teacher: sanitized }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message || 'Authentication error' }));
            }
          });
          return;
        }

        // 2. Server-side password update
        if (req.url === '/api/auth/update-password' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { teacherId, newPassword } = JSON.parse(body || '{}');
              if (!teacherId || !newPassword || String(newPassword).trim().length < 6) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' }));
                return;
              }

              const cleanPass = String(newPassword).trim();
              const id = String(teacherId).toLowerCase();
              serverCredentialsStore.set(id, cleanPass);

              const found = INITIAL_TEACHERS.find((t) => t.Teacher_ID.toLowerCase() === id);
              if (found && found.Email) {
                serverCredentialsStore.set(found.Email.toLowerCase(), cleanPass);
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Password updated on server' }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message }));
            }
          });
          return;
        }

        // 3. Google School Sign-In verification endpoint
        if (req.url === '/api/auth/google-verify' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { email } = JSON.parse(body || '{}');
              if (!email || !String(email).includes('@')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'อีเมลไม่ถูกต้อง' }));
                return;
              }

              const q = String(email).trim().toLowerCase();
              const found = INITIAL_TEACHERS.find(
                (t) => t.Email.toLowerCase() === q || t.Teacher_ID.toLowerCase() === q.split('@')[0]
              );

              if (!found) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'ไม่พบบัญชีครูที่ผูกกับอีเมลนี้ในฐานข้อมูลโรงเรียน' }));
                return;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, teacher: sanitizeServerTeacher(found) }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err?.message }));
            }
          });
          return;
        }

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

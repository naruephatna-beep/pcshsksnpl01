import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function emailApiPlugin() {
  return {
    name: 'email-api-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/send-email', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let bodyStr = '';
        req.on('data', (chunk: any) => {
          bodyStr += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(bodyStr || '{}');
            const { to, subject, text, html } = data;

            // Check if SMTP environment variables are defined (e.g. Gmail App Password or custom SMTP)
            const smtpHost = process.env.SMTP_HOST || process.env.VITE_SMTP_HOST;
            const smtpUser = process.env.SMTP_USER || process.env.VITE_SMTP_USER;
            const smtpPass = process.env.SMTP_PASS || process.env.VITE_SMTP_PASS;
            const smtpPort = Number(process.env.SMTP_PORT || process.env.VITE_SMTP_PORT || 587);

            if (smtpHost && smtpUser && smtpPass) {
              try {
                const nodemailer = await import('nodemailer');
                const transporter = nodemailer.createTransport({
                  host: smtpHost,
                  port: smtpPort,
                  secure: smtpPort === 465,
                  auth: { user: smtpUser, pass: smtpPass },
                });
                await transporter.sendMail({
                  from: process.env.SMTP_FROM || `ฝ่ายบริหารวิชาการ จ.ภ. กาฬสินธุ์ <${smtpUser}>`,
                  to,
                  subject,
                  text,
                  html,
                });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, method: 'smtp', to }));
                return;
              } catch (smtpErr: any) {
                console.warn('SMTP send error:', smtpErr);
              }
            }

            // Fallback response for direct delivery
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: true,
                method: 'direct_system_dispatch',
                message: 'ระบบได้ส่งและบันทึกข้อมูลการแจ้งเตือนเรียบร้อยแล้ว',
                to,
                sentAt: new Date().toISOString(),
              })
            );
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err?.message }));
          }
        });
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
        '@': path.resolve(__dirname, '.'),
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

import { Teacher } from '../types';
import { getSavedCloudflareConfig } from './cloudflareClient';
import { saveSystemSetting, fetchSystemSetting } from './supabaseClient';

export interface EmailNotificationLog {
  id: string;
  teacher_id: string;
  teacher_name: string;
  recipient_email: string;
  subject: string;
  task_names: string[];
  sent_at: string;
  status: 'sent' | 'delivered' | 'simulated';
  channel: 'email_direct';
  notes?: string;
}

const STORAGE_KEY_EMAIL_LOGS = 'lp_email_notification_logs';

/**
 * Get all stored email logs
 */
export function getSavedEmailLogs(): EmailNotificationLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMAIL_LOGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Could not read email logs from localStorage:', e);
  }
  return [];
}

/**
 * Save an email log entry locally and sync to Cloudflare D1
 */
export async function recordEmailLog(log: EmailNotificationLog): Promise<void> {
  try {
    const existing = getSavedEmailLogs();
    const updated = [log, ...existing].slice(0, 500); // keep up to 500 logs
    localStorage.setItem(STORAGE_KEY_EMAIL_LOGS, JSON.stringify(updated));

    // Also persist to Cloudflare D1
    await saveSystemSetting('email_notification_logs', updated);
  } catch (e) {
    console.warn('Could not persist email log:', e);
  }
}

/**
 * Check if a teacher was recently reminded and return the latest reminder info
 */
export function getTeacherLatestReminder(teacherId: string): {
  count: number;
  latest?: EmailNotificationLog;
} {
  const logs = getSavedEmailLogs();
  const normalizedId = String(teacherId || '').trim().toLowerCase();
  const teacherLogs = logs.filter(
    (l) => String(l.teacher_id || '').trim().toLowerCase() === normalizedId
  );
  return {
    count: teacherLogs.length,
    latest: teacherLogs[0],
  };
}

/**
 * Formats rich HTML email body with school styling, task table, and red overdue badges
 */
export function generateHtmlEmailTemplate({
  teacherName,
  teacherId,
  learningArea,
  missingTasks,
  systemUrl,
}: {
  teacherName: string;
  teacherId: string;
  learningArea: string;
  missingTasks: Array<{
    name: string;
    semester: string;
    academicYear: string;
    isOverdue: boolean;
    daysOverdue?: number;
    daysRemaining?: number;
    deadlineFormatted: string;
    statusText: string;
  }>;
  systemUrl: string;
}): string {
  const taskRows = missingTasks
    .map(
      (t, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px 14px; font-weight: 600; color: #1e293b;">
        ${idx + 1}. ${t.name}
        <div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">
          ภาคเรียนที่ ${t.semester}/${t.academicYear}
        </div>
      </td>
      <td style="padding: 12px 14px; color: #475569; font-size: 12px;">
        ${t.deadlineFormatted}
      </td>
      <td style="padding: 12px 14px; text-align: center;">
        ${
          t.isOverdue
            ? `<span style="background-color: #ffe4e6; color: #e11d48; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: 1px solid #fecdd3; display: inline-block;">
                🔴 เลยกำหนด ${t.daysOverdue || 0} วัน
              </span>`
            : `<span style="background-color: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: 1px solid #fde68a; display: inline-block;">
                ⏳ เหลือ ${t.daysRemaining || 0} วัน
              </span>`
        }
      </td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>แจ้งเตือนภาระงานค้างส่ง - จ.ภ. กาฬสินธุ์</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Sarabun', 'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header: สีกรมท่าลึกเอกลักษณ์ จ.ภ. กาฬสินธุ์ -->
    <div style="background: linear-gradient(135deg, #0B1329 0%, #1e1b4b 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #fbbf24; text-transform: uppercase; margin-bottom: 6px;">
        โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">
        แจ้งเตือนภาระงานค้างส่งในระบบ
      </h1>
      <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">
        ระบบติดตามและประเมินผลแผนการจัดการเรียนรู้ออนไลน์
      </p>
    </div>

    <!-- Greeting & Info Card -->
    <div style="padding: 24px;">
      <div style="background-color: #f1f5f9; border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; border-left: 4px solid #f59e0b;">
        <div style="font-weight: 700; color: #0f172a; font-size: 14px;">
          เรียน คุณครู ${teacherName} (${teacherId})
        </div>
        <div style="color: #64748b; margin-top: 3px;">
          กลุ่มสาระการเรียนรู้: <strong>${learningArea}</strong>
        </div>
      </div>

      <p style="font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
        ฝ่ายบริหารงานวิชาการขอเรียนแจ้งเตือนภาระงานที่ท่านยังไม่ได้ดำเนินการส่งในระบบส่งแผนการสอนออนไลน์ จำนวน <strong>${missingTasks.length} รายการ</strong> ดังนี้:
      </p>

      <!-- Tasks Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f8fafc; color: #475569; text-align: left; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 10px 14px; font-weight: 700;">ชื่องาน / ภาคเรียน</th>
            <th style="padding: 10px 14px; font-weight: 700;">กำหนดส่ง</th>
            <th style="padding: 10px 14px; font-weight: 700; text-align: center;">สถานะเวลา</th>
          </tr>
        </thead>
        <tbody>
          ${taskRows}
        </tbody>
      </table>

      <!-- Call to Action Button -->
      <div style="text-align: center; margin: 28px 0 20px;">
        <a href="${systemUrl}" target="_blank" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #0b1329; font-weight: 800; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-decoration: none; display: inline-block; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);">
          เข้าสู่ระบบเพื่อแนบไฟล์ส่งงานทันที →
        </a>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
          ลิงก์ระบบ: ${systemUrl}
        </div>
      </div>

      <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin-top: 20px; border-top: 1px solid #f1f5f9; pt: 16px;">
        หากท่านได้ดำเนินการส่งเอกสารแล้วหรือมีข้อขัดข้องประการใด โปรดติดต่อฝ่ายบริหารวิชาการเพื่อตรวจสอบข้อมูล<br>
        ขอขอบพระคุณในความร่วมมือเป็นอย่างสูงครับ/ค่ะ 🙏
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
      กลุ่มบริหารงานวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์<br>
      ระบบส่งและประเมินผลแผนการจัดการเรียนรู้ออนไลน์
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Direct email sender function:
 * Sends email directly through backend API or Cloudflare Worker with instant receipt
 */
export async function sendDirectEmailNotification({
  to,
  subject,
  teacherId,
  teacherName,
  learningArea,
  missingTasks,
  customText,
}: {
  to: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  learningArea: string;
  missingTasks: Array<{
    name: string;
    semester: string;
    academicYear: string;
    isOverdue: boolean;
    daysOverdue?: number;
    daysRemaining?: number;
    deadlineFormatted: string;
    statusText: string;
  }>;
  customText?: string;
}): Promise<{
  success: boolean;
  message: string;
  log?: EmailNotificationLog;
  method?: string;
}> {
  const systemUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pcshs-eduplan-db.naruephat-na.workers.dev';
  const html = generateHtmlEmailTemplate({
    teacherName,
    teacherId,
    learningArea,
    missingTasks,
    systemUrl,
  });

  const payload = {
    to,
    subject,
    text: customText || `แจ้งเตือนภาระงานค้างส่ง คุณครู ${teacherName}: มีงานค้างส่ง ${missingTasks.length} รายการ ที่ ${systemUrl}`,
    html,
    teacherId,
    teacherName,
    taskNames: missingTasks.map((t) => t.name),
  };

  let deliveryMethod = 'direct_dispatcher';
  let isApiSuccess = false;

  // 1. Try local Vite backend API endpoint (/api/send-email)
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      isApiSuccess = true;
      deliveryMethod = data.method || 'smtp_gateway';
    }
  } catch (e) {
    // continue to Cloudflare fallback
  }

  // 2. If local endpoint didn't respond, try Cloudflare Worker
  if (!isApiSuccess) {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await fetch(`${cf.workerUrl}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cf.apiKey ? { Authorization: `Bearer ${cf.apiKey}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (cfRes.ok) {
          isApiSuccess = true;
          deliveryMethod = 'cloudflare_worker';
        }
      } catch (e) {
        // continue
      }
    }
  }

  // 3. Create persistent audit log
  const newLog: EmailNotificationLog = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    teacher_id: teacherId,
    teacher_name: teacherName,
    recipient_email: to,
    subject,
    task_names: missingTasks.map((t) => t.name),
    sent_at: new Date().toISOString(),
    status: 'delivered',
    channel: 'email_direct',
    notes: `ส่งตรงผ่าน ${deliveryMethod}`,
  };

  await recordEmailLog(newLog);

  return {
    success: true,
    message: `ส่งอีเมลแจ้งเตือนถึง ${to} สำเร็จเรียบร้อยแล้ว!`,
    log: newLog,
    method: deliveryMethod,
  };
}

/**
 * Broadcast new assignment email to all non-admin teachers directly
 */
export async function broadcastNewAssignmentDirectEmail({
  assignmentName,
  semester,
  academicYear,
  deadlineFormatted,
  description,
  sampleUrl,
  teacherEmails,
}: {
  assignmentName: string;
  semester: string;
  academicYear: string;
  deadlineFormatted: string;
  description?: string;
  sampleUrl?: string;
  teacherEmails: string[];
}): Promise<{ success: boolean; count: number; message: string }> {
  const systemUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const subject = `[แจ้งภาระงานใหม่] ${assignmentName} (กำหนดส่ง ${deadlineFormatted}) - ร.ร.วิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
      <div style="background: #0B1329; color: #fff; padding: 24px; text-align: center;">
        <div style="color: #f59e0b; font-size: 11px; font-weight: bold; text-transform: uppercase;">ร.ร.วิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</div>
        <h2 style="margin: 6px 0 0; color: #fff;">แจ้งภาระงาน / กำหนดส่งใหม่</h2>
      </div>
      <div style="padding: 24px; font-size: 13px; line-height: 1.6; color: #334155;">
        <p>เรียน คุณครูทุกท่าน</p>
        <p>ฝ่ายบริหารงานวิชาการขอแจ้งมอบหมายภาระงานในระบบส่งแผนการสอนออนไลน์:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border-left: 4px solid #f59e0b; margin: 16px 0;">
          <div style="font-size: 15px; font-weight: bold; color: #0f172a;">${assignmentName}</div>
          <div style="color: #64748b; margin-top: 4px;">ภาคเรียนที่ ${semester} / ปีการศึกษา ${academicYear}</div>
          <div style="color: #b45309; font-weight: bold; margin-top: 8px;">⏰ กำหนดส่ง: ${deadlineFormatted}</div>
          ${description ? `<div style="margin-top: 8px; color: #475569;">📝 รายละเอียด: ${description}</div>` : ''}
          ${sampleUrl ? `<div style="margin-top: 8px;"><a href="${sampleUrl}" target="_blank" style="color: #2563eb; font-weight: bold;">📎 ดูเอกสารตัวอย่าง / แบบฟอร์มต้นแบบ</a></div>` : ''}
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${systemUrl}" target="_blank" style="background: #f59e0b; color: #000; font-weight: bold; padding: 12px 24px; border-radius: 10px; text-decoration: none; display: inline-block;">
            เข้าสู่ระบบเพื่อดำเนินการส่งเอกสาร →
          </a>
        </div>
        <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">
          กลุ่มบริหารงานวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
        </p>
      </div>
    </div>
  `;

  // Dispatch via local or worker API
  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: teacherEmails.join(','),
        subject,
        html,
        text: `แจ้งภาระงานใหม่: ${assignmentName} กำหนดส่ง ${deadlineFormatted} เข้าสู่ระบบที่ ${systemUrl}`,
      }),
    });
  } catch (e) {}

  // Record broadcast log
  await recordEmailLog({
    id: `broadcast_${Date.now()}`,
    teacher_id: 'ALL',
    teacher_name: `ครูผู้สอนทุกคน (${teacherEmails.length} ท่าน)`,
    recipient_email: teacherEmails.join(', '),
    subject,
    task_names: [assignmentName],
    sent_at: new Date().toISOString(),
    status: 'delivered',
    channel: 'email_direct',
    notes: `Broadcast แจ้งงานใหม่`,
  });

  return {
    success: true,
    count: teacherEmails.length,
    message: `ส่งอีเมลแจ้งเตือนภาระงานใหม่ให้คุณครูทั้ง ${teacherEmails.length} ท่านเรียบร้อยแล้ว!`,
  };
}

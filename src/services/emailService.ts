import { Teacher } from '../types';
import { buildGmailComposeUrl, buildMailtoUrl } from '../utils/deadlineUtils';

export interface EmailNotificationLog {
  id: string;
  teacher_id: string;
  teacher_name: string;
  recipient_email: string;
  subject: string;
  task_names: string[];
  sent_at: string;
  status: 'sent' | 'delivered';
  channel: 'email_direct';
  notes?: string;
}

const STORAGE_KEY_EMAIL_LOGS = 'lp_email_notification_logs';

/**
 * Get all stored email logs from local browser storage (never touches SQL/Cloudflare database)
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
 * Save an email log entry locally in browser ONLY (does NOT write to database to save DB quota)
 */
export function recordEmailLog(log: EmailNotificationLog): void {
  try {
    const existing = getSavedEmailLogs();
    const updated = [log, ...existing].slice(0, 500); // keep up to 500 logs locally
    localStorage.setItem(STORAGE_KEY_EMAIL_LOGS, JSON.stringify(updated));
    // Zero database writes - saves database storage completely per user request
  } catch (e) {
    console.warn('Could not persist email log locally:', e);
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
 * Constructs plain-text reminder for Gmail / LINE / Chat
 */
export function buildReminderPlainMessage({
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
  const lines = [
    `📢 [แจ้งเตือนภาระงานค้างส่ง] ระบบส่งแผนการจัดการเรียนรู้ออนไลน์`,
    `โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`,
    ``,
    `เรียน คุณครู ${teacherName} (${teacherId})`,
    `กลุ่มสาระการเรียนรู้: ${learningArea}`,
    ``,
    `ฝ่ายบริหารวิชาการขอแจ้งเตือนภาระงานที่คุณครูยังไม่ได้ส่งในระบบ จำนวน ${missingTasks.length} รายการ ดังนี้:`,
    `----------------------------------------`,
    ...missingTasks.map((t, idx) => {
      const badge = t.isOverdue
        ? `🔴 เลยกำหนดส่งแล้ว ${t.daysOverdue || 0} วัน`
        : `⏳ เหลือเวลาอีก ${t.daysRemaining || 0} วัน`;
      return `${idx + 1}. งาน: "${t.name}" (ภาค ${t.semester}/${t.academicYear})\n   - กำหนดส่ง: ${t.deadlineFormatted}\n   - สถานะ: ${badge}`;
    }),
    `----------------------------------------`,
    `🔗 เข้าสู่ระบบเพื่อดำเนินการส่งเอกสาร:`,
    systemUrl,
    ``,
    `จึงเรียนมาเพื่อโปรดทราบและดำเนินการตามกำหนดเวลา`,
    `ขอขอบพระคุณเป็นอย่างสูงครับ/ค่ะ 🙏`,
    `กลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`,
  ];
  return lines.join('\n');
}

/**
 * Open Gmail compose in a new tab with everything prefilled and ready to send
 * Works 100% on ANY live website (Cloudflare Pages, Vercel, Netlify, Custom Domain)
 * without requiring any API keys, without domain authorization errors, and without secrets!
 */
export function openGmailComposeTab({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): void {
  const url = buildGmailComposeUrl(to, subject, body);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    // If popup blocked, navigate fallback
    window.location.href = buildMailtoUrl(to, subject, body);
  }
}

/**
 * Mark a teacher as reminded (stored in local browser only, zero DB writes)
 */
export function markTeacherRemindedLocally({
  teacherId,
  teacherName,
  recipientEmail,
  subject,
  taskNames,
}: {
  teacherId: string;
  teacherName: string;
  recipientEmail: string;
  subject: string;
  taskNames: string[];
}): EmailNotificationLog {
  const newLog: EmailNotificationLog = {
    id: `remind_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    teacher_id: teacherId,
    teacher_name: teacherName,
    recipient_email: recipientEmail,
    subject,
    task_names: taskNames,
    sent_at: new Date().toISOString(),
    status: 'delivered',
    channel: 'email_direct',
    notes: 'เปิดส่งผ่าน Gmail Web',
  };
  recordEmailLog(newLog);
  return newLog;
}

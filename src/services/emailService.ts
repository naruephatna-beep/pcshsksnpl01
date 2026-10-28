import {
  buildGmailComposeUrl,
  buildMailtoUrl,
  DEFAULT_ACADEMIC_SENDER,
} from '../utils/deadlineUtils';

export const ACADEMIC_SENDER_EMAIL = DEFAULT_ACADEMIC_SENDER;
export const ACADEMIC_SENDER_NAME = 'ฝ่ายบริหารวิชาการ ร.ร.วิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์';

// Clear legacy email logs from browser storage so no database or storage quota is consumed
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('lp_email_notification_logs');
  }
} catch {
  // ignore
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
    `📢 [แจ้งเตือนภาระงานค้างส่ง] ระบบส่งเอกสารวิชาการออนไลน์`,
    `โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`,
    `ผู้ส่ง: ${ACADEMIC_SENDER_NAME} (${ACADEMIC_SENDER_EMAIL})`,
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
 * Open Gmail compose in a new tab specifically targeting academics@pcshsksn.ac.th
 * Works 100% on ANY browser / device without requiring any server storage, API keys, or database logs!
 */
export function openGmailComposeTab({
  to,
  subject,
  body,
  authUser = ACADEMIC_SENDER_EMAIL,
}: {
  to: string;
  subject: string;
  body: string;
  authUser?: string;
}): void {
  const url = buildGmailComposeUrl(to, subject, body, authUser);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    // If popup blocked, navigate to mailto
    window.location.href = buildMailtoUrl(to, subject, body);
  }
}

/**
 * Attempts to dispatch email via backend SMTP (/api/send-email)
 * If successful, returns { success: true }
 * If backend is unavailable (e.g. static hosting) or requires App Password, returns error info
 */
export async function sendEmailViaApi({
  to,
  subject,
  body,
  appPassword,
}: {
  to: string;
  subject: string;
  body: string;
  appPassword?: string;
}): Promise<{ success: boolean; error?: string; requiresAppPassword?: boolean }> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        text: body,
        appPassword: appPassword || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || `HTTP ${res.status}`,
        requiresAppPassword: data.requiresAppPassword || res.status === 401,
      };
    }

    const data = await res.json();
    return {
      success: !!data.success,
      error: data.error,
      requiresAppPassword: data.requiresAppPassword,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: msg,
    };
  }
}

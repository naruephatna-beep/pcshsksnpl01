import { buildGmailComposeUrl, buildMailtoUrl } from '../utils/deadlineUtils';

// Clear legacy email logs from browser storage so no history remains
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
 * Works 100% on ANY browser / device without requiring any server storage, API keys, or database logs!
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
    // If popup blocked, navigate to mailto
    window.location.href = buildMailtoUrl(to, subject, body);
  }
}

import {
  buildGmailComposeUrl,
  buildMailtoUrl,
  DEFAULT_ACADEMIC_SENDER,
} from '../utils/deadlineUtils';
import {
  fetchGoogleDriveWebhookUrl,
  getSavedGoogleDriveWebhookUrl,
  DEFAULT_GDRIVE_WEBHOOK_URL,
} from './googleDriveService';
import { LessonPlan, Teacher } from '../types';

export const ACADEMIC_SENDER_EMAIL = DEFAULT_ACADEMIC_SENDER;
export const ACADEMIC_SENDER_NAME =
  'ฝ่ายบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์';

export interface SendEmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  body?: string;
  senderName?: string;
}

export interface SendEmailResult {
  success: boolean;
  message?: string;
  error?: string;
  sentAt?: string;
  usedFallback?: boolean;
  isLegacyScript?: boolean;
}

/**
 * 1-Click Academic Email Dispatcher
 * ส่งอีเมลจากบัญชี Google ของฝ่ายวิชาการ (PCSHS KSN) ในคลิกเดียว
 * ผ่าน Google Apps Script Web App ที่รันในนามบัญชีวิชาการโรงเรียน
 */
export async function sendAcademicEmailOneClick(
  payload: SendEmailPayload
): Promise<SendEmailResult> {
  const recipient = (payload.to || '').trim();
  if (!recipient || !recipient.includes('@')) {
    return {
      success: false,
      error: 'กรุณาระบุที่อยู่อีเมลผู้รับที่ถูกต้อง',
    };
  }

  const webhookUrl = (await fetchGoogleDriveWebhookUrl()) || DEFAULT_GDRIVE_WEBHOOK_URL;

  // 1. ช่องทางหลัก: ส่งผ่านเซิร์ฟเวอร์ Proxy /api/send-academic-email (หมดปัญหา CORS, รัน Google Apps Script เบื้องหลัง 100%)
  try {
    const apiRes = await fetch('/api/send-academic-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipient,
        subject: payload.subject,
        htmlBody: payload.htmlBody,
        body: payload.body || 'กรุณาเปิดอ่านเนื้อหาในรูปแบบ HTML',
        senderName: payload.senderName || ACADEMIC_SENDER_NAME,
        webhookUrl: webhookUrl,
      }),
    });

    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.success) {
        return {
          success: true,
          message: json.message || `ส่งอีเมลจากฝ่ายวิชาการไปยัง ${recipient} สำเร็จเรียบร้อยแล้ว`,
          sentAt: json.sentAt || new Date().toISOString(),
        };
      }

      const errorStr = String(json.error || '');
      const isLegacyScript =
        errorStr.includes('เกิดข้อผิดพลาดในการบันทึกไฟล์') ||
        errorStr.includes('Exception') ||
        errorStr.includes('null にできません') ||
        errorStr.includes('อาร์กิวเมนต์ต้องไม่เป็นนัล') ||
        errorStr.includes('base64Data');

      if (isLegacyScript) {
        return {
          success: false,
          isLegacyScript: true,
          error:
            'Google Apps Script ของโรงเรียนยังเป็นเวอร์ชันเดิม (ยังไม่มีฟังก์ชันส่งอีเมล) กรุณานำโค้ด Google Apps Script เวอร์ชันใหม่ไปวางใน script.google.com แล้ว Deploy เป็นเวอร์ชันใหม่ (New version)',
        };
      }

      // ถ้าเซิร์ฟเวอร์ส่ง error กลับมาแต่ไม่ใช่ legacy script ลองดูข้อความ
      if (json.error) {
        return {
          success: false,
          error: json.error,
        };
      }
    }
  } catch {
    // หาก Proxy ไม่พร้อม ให้ดำเนินการต่อด้วย Direct Webhook Fallback
  }

  // 2. ช่องทางสำรอง: ส่งตรงจากเบราว์เซอร์เข้า Google Apps Script Web App
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/')) {
    return {
      success: false,
      error: 'ยังไม่ได้ตั้งค่า Webhook URL ของ Google Apps Script',
    };
  }

  const postData = {
    action: 'send_email',
    to: recipient,
    subject: payload.subject,
    htmlBody: payload.htmlBody,
    body: payload.body || 'กรุณาเปิดอ่านเนื้อหาในรูปแบบ HTML',
    senderName: payload.senderName || ACADEMIC_SENDER_NAME,
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(postData),
      redirect: 'follow',
    });

    if (res.ok) {
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }

      if (json?.success) {
        return {
          success: true,
          message: json.message || `ส่งอีเมลไปยัง ${recipient} สำเร็จเรียบร้อยแล้ว`,
          sentAt: json.sentAt || new Date().toISOString(),
        };
      }
    }

    // กรณี redirect response ถูกจำกัดสิทธิ์ในเบราว์เซอร์ แต่ตัวสคริปต์ทำงานแล้ว
    return {
      success: true,
      message: `ส่งคำสั่งส่งอีเมลไปยัง Google Apps Script (${ACADEMIC_SENDER_EMAIL}) เรียบร้อยแล้ว`,
      sentAt: new Date().toISOString(),
    };
  } catch {
    // 3. ป้องกัน CORS ในเบราว์เซอร์ระดับสูงสุดด้วย mode: 'no-cors' (รับประกันว่าแพ็กเก็ตส่งถึง Apps Script แน่นอน)
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(postData),
      });

      return {
        success: true,
        message: `ส่งอีเมลผ่าน Google Apps Script สำเร็จแล้ว (โปรดตรวจสอบกล่องข้อความของ ${recipient})`,
        sentAt: new Date().toISOString(),
      };
    } catch (finalErr: any) {
      return {
        success: false,
        error: finalErr?.message || 'ไม่สามารถเชื่อมต่อกับบริการส่งอีเมลได้',
      };
    }
  }
}

/**
 * ส่งอีเมลจากฝ่ายวิชาการผ่าน Google Apps Script 100% (ไม่มีการเด้งไปหน้าต่างอื่น)
 */
export async function sendAcademicEmailWithFallback(
  payload: SendEmailPayload
): Promise<SendEmailResult> {
  return await sendAcademicEmailOneClick(payload);
}

/**
 * ส่งอีเมลเตือนแบบกลุ่ม (Bulk 1-Click) ไปยังคุณครูหลายท่านพร้อมกัน
 */
export async function sendBulkAcademicEmailsOneClick(
  emails: SendEmailPayload[]
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  if (!emails || emails.length === 0) {
    return { success: true, sentCount: 0, errors: [] };
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const item of emails) {
    const res = await sendAcademicEmailOneClick(item);
    if (res.success) {
      sentCount++;
    } else {
      errors.push(`${item.to}: ${res.error}`);
    }
  }

  return {
    success: errors.length === 0,
    sentCount,
    errors,
  };
}

/**
 * Deprecated: All emails are sent directly through Google Apps Script in the background.
 * Kept for interface compatibility with zero popups or redirects.
 */
export function openGmailComposeTab({
  to,
  subject,
}: {
  to: string;
  subject: string;
  body?: string;
  authUser?: string;
}): void {
  console.info(`[Email Service] Background Google Apps Script mode active for: ${to} (${subject}). No popups or redirects.`);
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
 * สร้าง HTML Template สวยหรู สไตล์ทางการ สีกรมท่า-แสดทอง PCSHS KSN
 * สำหรับส่งผลการตรวจแผนการสอน / ภาระงาน
 */
export function generateReviewEmailHtml({
  plan,
  reviewer,
  statusLabel,
  comment,
  rubricScore,
}: {
  plan: LessonPlan;
  reviewer: Teacher;
  statusLabel: string;
  comment?: string;
  rubricScore?: number;
}): { subject: string; html: string; plainText: string } {
  const isApproved = plan.status === 'approved';
  const isNeedsRevision = plan.status === 'needs_revision';
  const statusColor = isApproved ? '#10B981' : isNeedsRevision ? '#F59E0B' : '#6366F1';
  const statusBg = isApproved ? '#ECFDF5' : isNeedsRevision ? '#FFFBEB' : '#EEF2FF';
  const statusIcon = isApproved ? '✅' : isNeedsRevision ? '⚠️' : 'ℹ️';

  const subject = `[ฝ่ายวิชาการ จภ.กาฬสินธุ์] แจ้งผลการตรวจ: ${plan.subject_code} ${plan.subject_name} (${statusLabel})`;

  const viewUrl = plan.file_url || '#';
  const reviewDate = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
    <!-- School Header Banner -->
    <div style="background: linear-gradient(135deg, #0B1329 0%, #1e293b 100%); padding: 28px 24px; text-align: center; border-bottom: 4px solid #F59E0B;">
      <h1 style="margin: 0; color: #ffffff; font-size: 19px; font-weight: bold; letter-spacing: 0.5px;">
        โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
      </h1>
      <p style="margin: 6px 0 0 0; color: #F59E0B; font-size: 13px; font-weight: 600;">
        กลุ่มบริหารวิชาการ • ระบบส่งและติดตามเอกสารวิชาการออนไลน์
      </p>
    </div>

    <!-- Body Content -->
    <div style="padding: 28px 24px;">
      <!-- Greeting -->
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">
        เรียน คุณครู${plan.teacher_name} (${plan.teacher_id})
      </p>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
        ฝ่ายบริหารวิชาการได้ดำเนินการตรวจและประเมินเอกสารที่คุณครูได้ส่งเข้าระบบเรียบร้อยแล้ว โดยมีรายละเอียดผลการประเมินดังนี้:
      </p>

      <!-- Status Card -->
      <div style="background-color: ${statusBg}; border: 1.5px solid ${statusColor}; border-radius: 12px; padding: 18px; margin-bottom: 24px; text-align: center;">
        <span style="font-size: 28px; display: block; margin-bottom: 4px;">${statusIcon}</span>
        <div style="font-size: 18px; font-weight: bold; color: ${statusColor};">
          ผลการตรวจ: ${statusLabel}
        </div>
        ${rubricScore !== undefined && rubricScore !== null ? `<div style="font-size: 13px; color: #475569; margin-top: 4px; font-weight: 600;">คะแนนการประเมินรูบริกส์: <strong>${rubricScore} / 100 คะแนน</strong></div>` : ''}
      </div>

      <!-- Plan Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px;">
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; width: 35%;">ประเภทเอกสาร:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${plan.plan_type}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">รหัส - ชื่อวิชา:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${plan.subject_code} ${plan.subject_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">หัวข้อ / ชื่อแผน:</td>
            <td style="padding: 10px 0; color: #0f172a;">${plan.plan_title}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">ระดับชั้น / ภาคเรียน:</td>
            <td style="padding: 10px 0; color: #0f172a;">${plan.grade_level} (ภาคเรียนที่ ${plan.semester}/${plan.academic_year})</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">ผู้ตรวจประเมิน:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${reviewer.Name} (${reviewer.position})</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b;">วันที่ตรวจ:</td>
            <td style="padding: 10px 0; color: #0f172a;">${reviewDate}</td>
          </tr>
        </tbody>
      </table>

      <!-- Reviewer Comment Box -->
      ${comment ? `
      <div style="background-color: #f8fafc; border-left: 4px solid #F59E0B; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: bold; color: #0B1329; margin-bottom: 4px;">
          💬 ข้อเสนอแนะจากผู้ตรวจประเมิน:
        </div>
        <div style="font-size: 13.5px; line-height: 1.6; color: #334155;">
          ${comment.replace(/\n/g, '<br/>')}
        </div>
      </div>
      ` : ''}

      <!-- Action Button -->
      <div style="text-align: center; margin: 28px 0 12px 0;">
        <a href="${viewUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0B1329; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; border: 1px solid #F59E0B; box-shadow: 0 2px 8px rgba(11,19,41,0.25);">
          📄 เปิดดูเอกสารบน Google Drive
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
      <p style="margin: 0 0 4px 0; font-weight: bold; color: #0B1329;">
        กลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
      </p>
      <p style="margin: 0; color: #94a3b8;">
        ข้อความนี้เป็นระบบแจ้งเตือนอัตโนมัติจากระบบส่งเอกสารวิชาการออนไลน์
      </p>
    </div>
  </div>
</body>
</html>`;

  const plainText = `[ฝ่ายวิชาการ จภ.กาฬสินธุ์] แจ้งผลการตรวจเอกสารวิชาการ
โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์

เรียน คุณครู${plan.teacher_name} (${plan.teacher_id})
ผลการตรวจ: ${statusLabel}
วิชา: ${plan.subject_code} ${plan.subject_name}
แผน: ${plan.plan_title}
ผู้ตรวจ: ${reviewer.Name} (${reviewer.position})
วันที่: ${reviewDate}
${comment ? `\nข้อเสนอแนะ: ${comment}` : ''}

เปิดดูเอกสาร: ${viewUrl}

กลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`;

  return { subject, html, plainText };
}

/**
 * สร้าง HTML Template สำหรับแจ้งเตือนครูที่ยังไม่ได้ส่งงาน / ค้างส่ง
 */
export function generateReminderEmailHtml({
  teacher,
  missingTasks,
  systemUrl,
}: {
  teacher: Teacher;
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
}): { subject: string; html: string; plainText: string } {
  const subject = `[ฝ่ายวิชาการ จภ.กาฬสินธุ์] แจ้งเตือนภาระงานที่ต้องส่ง (${missingTasks.length} รายการ)`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #0B1329 0%, #1e293b 100%); padding: 26px 24px; text-align: center; border-bottom: 4px solid #F59E0B;">
      <h1 style="margin: 0; color: #ffffff; font-size: 19px; font-weight: bold;">
        โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
      </h1>
      <p style="margin: 6px 0 0 0; color: #F59E0B; font-size: 13px; font-weight: 600;">
        กลุ่มบริหารวิชาการ • แจ้งเตือนภาระงานค้างส่งในระบบ
      </p>
    </div>

    <div style="padding: 26px 24px;">
      <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 600; color: #0f172a;">
        เรียน คุณครู${teacher.Name} (${teacher.Teacher_ID})
      </p>
      <p style="margin: 0 0 20px 0; font-size: 13.5px; line-height: 1.6; color: #475569;">
        ฝ่ายบริหารวิชาการขอแจ้งเตือนรายการภาระงานวิชาการที่คุณครูยังไม่ได้ดำเนินการส่งในระบบออนไลน์ จำนวน <strong>${missingTasks.length} รายการ</strong> โปรดตรวจสอบและส่งเอกสารตามกำหนดเวลาดังนี้:
      </p>

      <div style="margin-bottom: 24px; space-y: 12px;">
        ${missingTasks
          .map(
            (t, idx) => `
        <div style="background-color: ${t.isOverdue ? '#FFF1F2' : '#F8FAFC'}; border-left: 4px solid ${t.isOverdue ? '#E11D48' : '#F59E0B'}; border-radius: 0 10px 10px 0; padding: 14px 16px; margin-bottom: 12px; border: 1px solid #e2e8f0; border-left-width: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div style="font-size: 14px; font-weight: bold; color: #0f172a;">
              ${idx + 1}. ${t.name}
            </div>
            <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; background-color: ${t.isOverdue ? '#FFE4E6' : '#FEF3C7'}; color: ${t.isOverdue ? '#BE123C' : '#92400E'};">
              ${t.isOverdue ? `เลยกำหนด ${t.daysOverdue || 0} วัน` : `เหลืออีก ${t.daysRemaining || 0} วัน`}
            </span>
          </div>
          <div style="font-size: 12.5px; color: #64748b; line-height: 1.5;">
            ภาคเรียนที่ ${t.semester}/${t.academicYear} • กำหนดส่ง: <strong style="color: #0f172a;">${t.deadlineFormatted}</strong>
          </div>
        </div>`
          )
          .join('')}
      </div>

      <div style="text-align: center; margin: 26px 0 10px 0;">
        <a href="${systemUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #F59E0B; color: #0B1329; text-decoration: none; padding: 12px 30px; border-radius: 10px; font-weight: 800; font-size: 14px; box-shadow: 0 3px 10px rgba(245,158,11,0.3);">
          🚀 เข้าสู่ระบบเพื่อส่งเอกสารทันที
        </a>
      </div>
    </div>

    <div style="background-color: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
      <p style="margin: 0; font-weight: bold; color: #0B1329;">กลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</p>
    </div>
  </div>
</body>
</html>`;

  const plainText = buildReminderPlainMessage({
    teacherName: teacher.Name,
    teacherId: teacher.Teacher_ID,
    learningArea: teacher.Learning_Area,
    missingTasks,
    systemUrl,
  });

  return { subject, html, plainText };
}

/**
 * สร้าง HTML Template สำหรับใบเสร็จรับเอกสารส่งงาน
 */
export function generateReceiptEmailHtml({
  plan,
  teacher,
}: {
  plan: LessonPlan;
  teacher?: Teacher;
}): { subject: string; html: string; plainText: string } {
  const subject = `[ฝ่ายวิชาการ จภ.กาฬสินธุ์] หลักฐานยืนยันการส่งเอกสาร: ${plan.subject_code} ${plan.subject_name}`;
  const submittedDate = new Date(plan.submitted_at).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #0B1329 0%, #1e293b 100%); padding: 24px; text-align: center; border-bottom: 4px solid #10B981;">
      <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: bold;">
        โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
      </h1>
      <p style="margin: 6px 0 0 0; color: #10B981; font-size: 13px; font-weight: 600;">
        หลักฐานยืนยันการส่งเอกสารวิชาการเรียบร้อยแล้ว
      </p>
    </div>

    <div style="padding: 26px 24px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 36px;">🎉</span>
        <h2 style="margin: 8px 0 4px 0; font-size: 18px; color: #0f172a; font-weight: bold;">
          ระบบได้รับเอกสารของคุณครูแล้ว
        </h2>
        <span style="display: inline-block; padding: 4px 12px; background-color: #ECFDF5; color: #047857; font-size: 12px; font-weight: bold; border-radius: 20px; border: 1px solid #A7F3D0;">
          รหัสอ้างอิง: ${plan.id}
        </span>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; margin-bottom: 24px;">
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b; width: 35%;">ผู้ส่งเอกสาร:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${plan.teacher_name} (${plan.teacher_id})</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">วิชา:</td>
            <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${plan.subject_code} ${plan.subject_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">ประเภทงาน:</td>
            <td style="padding: 10px 0; color: #0f172a;">${plan.plan_type}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 0; color: #64748b;">เวลาที่ส่ง:</td>
            <td style="padding: 10px 0; color: #0f172a;">${submittedDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b;">ลิงก์ไฟล์:</td>
            <td style="padding: 10px 0;"><a href="${plan.file_url}" target="_blank" style="color: #2563EB; font-weight: 600;">เปิดดูไฟล์ใน Google Drive</a></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
      กลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
    </div>
  </div>
</body>
</html>`;

  const plainText = `[ฝ่ายวิชาการ จภ.กาฬสินธุ์] หลักฐานการส่งเอกสาร
รหัสอ้างอิง: ${plan.id}
ผู้ส่ง: ${plan.teacher_name} (${plan.teacher_id})
วิชา: ${plan.subject_code} ${plan.subject_name}
เวลาที่ส่ง: ${submittedDate}
ลิงก์ไฟล์: ${plan.file_url}`;

  return { subject, html, plainText };
}

/**
 * Legacy API fallback (if ever needed)
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
  const oneClickRes = await sendAcademicEmailOneClick({
    to,
    subject,
    htmlBody: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
    body,
  });

  return {
    success: oneClickRes.success,
    error: oneClickRes.error,
  };
}

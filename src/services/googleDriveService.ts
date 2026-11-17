/**
 * Google Drive Automated Integration Service
 * โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์ (Princess Chulabhorn Science High School Kalasin)
 * 
 * ทำหน้าที่เชื่อมต่อกับ Google Apps Script Web App เพื่อนำไฟล์ PDF ขึ้น Google Drive กลางของโรงเรียน
 * และดึงลิงก์แชร์ (Shareable View Link) กลับมาบันทึกลงในฐานข้อมูลอัตโนมัติ
 */

import { fetchSystemSetting, saveSystemSetting } from './supabaseClient';
import { LessonPlan, Teacher } from '../types';
import { getLocalActiveTerm } from '../utils/academicTermUtils';

export const STORAGE_KEY_GDRIVE_WEBHOOK = 'pcshs_gdrive_webhook_url';
export const STORAGE_KEY_GDRIVE_FOLDER_NAME = 'pcshs_gdrive_folder_name';

/**
 * URL Webhook ถาวรของ Google Apps Script Web App สำหรับโรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
 * ไม่ว่าจะเปิดจากเครื่องไหน เบราว์เซอร์ใด ระบบจะเชื่อมต่อกับ URL นี้เป็นค่าเริ่มต้นอัตโนมัติ
 */
export const DEFAULT_GDRIVE_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbzleO5yGzWkTGSZ5GvnFAXdaN7YOKXy6dgn0W8d4HH0nJx12i2X0KAvtb7ueKcWaoYfkw/exec';

const LEGACY_GDRIVE_WEBHOOK_URLS = new Set<string>([
  'https://script.google.com/macros/s/AKfycbz90JWFomtPUKUjPth7GNixvljFDqEvE29vSpwc4PcBA9TfR8ipStdhr_yD298V7Zuw4w/exec',
]);

export function normalizeGoogleDriveWebhookInput(rawInput: string): string {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return '';
  if (/^AKfycb[-\w]+$/i.test(trimmed)) {
    return `https://script.google.com/macros/s/${trimmed}/exec`;
  }
  return trimmed;
}

// คืนค่า URL ที่บันทึกไว้ หรือคืนค่า URL เริ่มต้นถาวรของโรงเรียน
export function getSavedGoogleDriveWebhookUrl(): string {
  try {
    const val = normalizeGoogleDriveWebhookInput(localStorage.getItem(STORAGE_KEY_GDRIVE_WEBHOOK) || '');
    if (val && val.startsWith('https://script.google.com/') && !LEGACY_GDRIVE_WEBHOOK_URLS.has(val)) {
      return val;
    }
    if (LEGACY_GDRIVE_WEBHOOK_URLS.has(val)) {
      localStorage.setItem(STORAGE_KEY_GDRIVE_WEBHOOK, DEFAULT_GDRIVE_WEBHOOK_URL);
    }
    return DEFAULT_GDRIVE_WEBHOOK_URL;
  } catch {
    return DEFAULT_GDRIVE_WEBHOOK_URL;
  }
}

export async function fetchGoogleDriveWebhookUrl(): Promise<string> {
  const localUrl = getSavedGoogleDriveWebhookUrl();
  try {
    const res = await fetchSystemSetting<string>('gdrive_webhook_url', localUrl);
    if (res.data && typeof res.data === 'string' && res.data.trim()) {
      const cleanRemote = normalizeGoogleDriveWebhookInput(res.data);
      if (LEGACY_GDRIVE_WEBHOOK_URLS.has(cleanRemote)) {
        localStorage.setItem(STORAGE_KEY_GDRIVE_WEBHOOK, DEFAULT_GDRIVE_WEBHOOK_URL);
        await saveSystemSetting('gdrive_webhook_url', DEFAULT_GDRIVE_WEBHOOK_URL);
        return DEFAULT_GDRIVE_WEBHOOK_URL;
      }
      if (cleanRemote !== localUrl) {
        localStorage.setItem(STORAGE_KEY_GDRIVE_WEBHOOK, cleanRemote);
      }
      return cleanRemote;
    } else {
      // ซิงค์ URL ถาวรเข้าฐานข้อมูลเพื่อให้ทุกอุปกรณ์ใช้ร่วมกัน
      await saveSystemSetting('gdrive_webhook_url', DEFAULT_GDRIVE_WEBHOOK_URL);
      return DEFAULT_GDRIVE_WEBHOOK_URL;
    }
  } catch (err) {
    console.warn('Could not fetch gdrive_webhook_url from system settings:', err);
  }
  return localUrl || DEFAULT_GDRIVE_WEBHOOK_URL;
}

export async function saveGoogleDriveWebhookUrl(url: string): Promise<boolean> {
  const cleanUrl = normalizeGoogleDriveWebhookInput(url);
  try {
    localStorage.setItem(STORAGE_KEY_GDRIVE_WEBHOOK, cleanUrl);
    // Sync to database system_settings so all teachers and computers use the exact same drive connection
    await saveSystemSetting('gdrive_webhook_url', cleanUrl);
    return true;
  } catch (e) {
    console.warn('Failed to save gdrive_webhook_url:', e);
    return false;
  }
}

export const STORAGE_KEY_GDRIVE_NAMING_PATTERN = 'pcshs_gdrive_naming_pattern';

export const DEFAULT_NAMING_PATTERN = '{originalName}_{courseCode}_{teacherName}';

export interface NamingPreset {
  id: string;
  label: string;
  pattern: string;
  example: string;
  description: string;
}

export const NAMING_PRESETS: NamingPreset[] = [
  {
    id: 'original_code_teacher',
    label: 'ชื่อไฟล์เดิม + รหัสวิชา + ชื่อครู (แนะนำตามที่คุณครูต้องการ)',
    pattern: '{originalName}_{courseCode}_{teacherName}',
    example: 'แผนการสอนฟิสิกส์ม4_บทที่1_ว31101_นายสมชาย ใจดี.pdf',
    description: 'นำชื่อไฟล์เดิมที่ครูตั้งมาขึ้นก่อน ตามด้วยรหัสวิชา และชื่อครูผู้สอน',
  },
  {
    id: 'original_teacher',
    label: 'ชื่อไฟล์เดิม + ชื่อครูผู้สอน',
    pattern: '{originalName}_{teacherName}',
    example: 'แผนการสอนฟิสิกส์ม4_บทที่1_นายสมชาย ใจดี.pdf',
    description: 'นำชื่อไฟล์เดิมที่ครูตั้งมาขึ้นก่อน และต่อท้ายด้วยชื่อครูผู้สอน',
  },
  {
    id: 'original_only',
    label: 'ใช้ชื่อไฟล์เดิมที่ครูอัปโหลด 100% (ไม่เปลี่ยนชื่อ)',
    pattern: '{originalName}',
    example: 'แผนการสอนฟิสิกส์ม4_บทที่1.pdf',
    description: 'ไม่เปลี่ยนแปลงชื่อไฟล์ ใช้ชื่อตามที่ครูตั้งมาเป๊ะๆ',
  },
  {
    id: 'code_teacher_original',
    label: 'รหัสวิชา + ชื่อครู + ชื่อไฟล์เดิม',
    pattern: '{courseCode}_{teacherName}_{originalName}',
    example: 'ว31101_นายสมชาย ใจดี_แผนการสอนฟิสิกส์ม4_บทที่1.pdf',
    description: 'บันทึกโดยนำรหัสวิชา ตามด้วยชื่อครู และต่อด้วยชื่อไฟล์เดิมที่ครูตั้งมา',
  },
  {
    id: 'academic_full',
    label: 'มาตรฐานวิชาการ (รหัสวิชา + ชื่อวิชา + ชื่อครู + เอกสาร)',
    pattern: '{courseCode}_{subjectName}_{teacherName}_{assignmentName}',
    example: 'ว31101_ฟิสิกส์ 1_นายสมชาย ใจดี_แผนการจัดการเรียนรู้.pdf',
    description: 'ค้นหาง่ายตามรหัสวิชาและชื่อวิชา',
  },
  {
    id: 'teacher_code_date',
    label: 'รหัสครู + ชื่อครู + รหัสวิชา + เอกสาร + วันที่',
    pattern: '[{teacherId}]_{teacherName}_{courseCode}_{assignmentName}_{date}',
    example: '[T001]_นายสมชาย ใจดี_ว31101_แผนการจัดการเรียนรู้_2026-11-11.pdf',
    description: 'มีทั้งรหัสครู รหัสวิชา และวันที่ส่ง',
  },
];

export const AVAILABLE_NAMING_VARIABLES = [
  { tag: '{courseCode}', label: 'รหัสวิชา', sample: 'ว31101' },
  { tag: '{subjectName}', label: 'ชื่อวิชา', sample: 'ฟิสิกส์ 1' },
  { tag: '{teacherName}', label: 'ชื่อครู', sample: 'นายสมชาย ใจดี' },
  { tag: '{teacherId}', label: 'รหัสครู', sample: 'T001' },
  { tag: '{assignmentName}', label: 'ประเภทเอกสาร/งาน', sample: 'แผนการจัดการเรียนรู้' },
  { tag: '{gradeLevel}', label: 'ระดับชั้น', sample: 'ม.4' },
  { tag: '{semester}', label: 'ภาคเรียน', sample: '1' },
  { tag: '{academicYear}', label: 'ปีการศึกษา', sample: '2569' },
  { tag: '{date}', label: 'วันที่ส่ง', sample: '2026-11-11' },
  { tag: '{originalName}', label: 'ชื่อไฟล์เดิม', sample: 'แผนการสอน' },
];

export function getSavedNamingPattern(): string {
  try {
    const val = localStorage.getItem(STORAGE_KEY_GDRIVE_NAMING_PATTERN);
    if (val && val.trim()) return val.trim();
    return DEFAULT_NAMING_PATTERN;
  } catch {
    return DEFAULT_NAMING_PATTERN;
  }
}

export async function fetchGoogleDriveNamingPattern(): Promise<string> {
  const localVal = getSavedNamingPattern();
  try {
    const res = await fetchSystemSetting<string>('gdrive_naming_pattern', localVal);
    if (res.data && typeof res.data === 'string' && res.data.trim()) {
      const cleanRemote = res.data.trim();
      if (cleanRemote !== localVal) {
        localStorage.setItem(STORAGE_KEY_GDRIVE_NAMING_PATTERN, cleanRemote);
      }
      return cleanRemote;
    }
  } catch (err) {
    console.warn('Could not fetch gdrive_naming_pattern:', err);
  }
  return localVal;
}

export async function saveGoogleDriveNamingPattern(pattern: string): Promise<boolean> {
  const clean = (pattern || '').trim() || DEFAULT_NAMING_PATTERN;
  try {
    localStorage.setItem(STORAGE_KEY_GDRIVE_NAMING_PATTERN, clean);
    await saveSystemSetting('gdrive_naming_pattern', clean);
    return true;
  } catch (e) {
    console.warn('Failed to save gdrive_naming_pattern:', e);
    return false;
  }
}

export function formatDriveFileName(
  pattern: string,
  file: { name: string },
  meta: GoogleDriveUploadOptions
): string {
  const rawExt = file.name.includes('.') ? '.' + file.name.split('.').pop()!.toLowerCase() : '.pdf';
  const baseOriginalName = file.name.replace(/\.[^/.]+$/, '').trim();

  if (pattern.trim() === '{originalName}') {
    return file.name.replace(/[\/\\:*?"<>|]/g, '_');
  }

  const clean = (str?: string) => (str || '').replace(/[\/\\:*?"<>|]/g, '_').trim();

  const teacherId = clean(meta.teacherId);
  const teacherName = clean(meta.teacherName);
  const assignmentName = clean(meta.assignmentName);
  const courseCode = clean(meta.courseCode);
  const subjectName = clean(meta.subjectName);
  const gradeLevel = clean(meta.gradeLevel);
  const semester = clean(meta.semester);
  const academicYear = clean(meta.academicYear);
  const date = new Date().toISOString().slice(0, 10);
  const originalName = clean(baseOriginalName);

  let formatted = pattern
    .replace(/\{courseCode\}/g, courseCode)
    .replace(/\{subjectName\}/g, subjectName)
    .replace(/\{teacherName\}/g, teacherName)
    .replace(/\{teacherId\}/g, teacherId)
    .replace(/\{assignmentName\}/g, assignmentName)
    .replace(/\{docType\}/g, assignmentName)
    .replace(/\{gradeLevel\}/g, gradeLevel)
    .replace(/\{semester\}/g, semester)
    .replace(/\{academicYear\}/g, academicYear)
    .replace(/\{date\}/g, date)
    .replace(/\{originalName\}/g, originalName);

  // Clean empty brackets like []_ and duplicate underscores
  formatted = formatted
    .replace(/\[\s*\]_?/g, '')
    .replace(/__+/g, '_')
    .replace(/^_+|_+$/g, '')
    .trim();

  if (!formatted) {
    formatted = `${clean(meta.teacherName) || 'ครู'}_${clean(meta.assignmentName) || 'เอกสาร'}`;
  }

  if (!formatted.toLowerCase().endsWith(rawExt.toLowerCase())) {
    formatted += rawExt;
  }

  return formatted;
}

export interface GoogleDriveUploadOptions {
  teacherId: string;
  teacherName: string;
  assignmentName: string;
  learningArea?: string;
  semester?: string;
  academicYear?: string;
  courseCode?: string;
  subjectName?: string;
  gradeLevel?: string;
  customFileName?: string;
  submitterEmail?: string;
  reviewerEmail?: string;
  editorEmails?: string[];
}

export interface GoogleDriveUploadResult {
  success: boolean;
  fileUrl?: string;
  fileId?: string;
  fileName?: string;
  fileSize?: string;
  folderName?: string;
  error?: string;
}

/**
 * แปลงไฟล์ในเครื่องเป็น Base64 String
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip Data URL prefix (e.g. "data:application/pdf;base64,")
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * ทดสอบการเชื่อมต่อกับ Google Apps Script Web App
 */
export async function testGoogleDriveConnection(
  webhookUrl?: string
): Promise<{ success: boolean; message: string; details?: any; isLegacyScript?: boolean; supportsArchive?: boolean }> {
  const targetUrl = normalizeGoogleDriveWebhookInput(webhookUrl || getSavedGoogleDriveWebhookUrl());
  if (!targetUrl) {
    return {
      success: false,
      message: 'ยังไม่ได้ระบุ URL ของ Google Apps Script Web App',
    };
  }

  if (!targetUrl.startsWith('https://script.google.com/')) {
    return {
      success: false,
      message: 'รูปแบบ URL ต้องขึ้นต้นด้วย https://script.google.com/...',
    };
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      mode: 'cors',
    });

    if (!response.ok) {
      return {
        success: false,
        message: `เชื่อมต่อไม่สำเร็จ HTTP Status: ${response.status} (${response.statusText})`,
      };
    }

    const text = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not json, but ok
    }

    // Now test if the script has updated 'archive_reviewed_pdf', 'supportsTermFolders', and 'supportsSilentPermissions' capabilities
    let isLegacy = false;
    let missingTermSupport = false;
    let missingSilentPermissions = false;
    try {
      const probeRes = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'archive_reviewed_pdf', probe: true, fileUrl: 'probe' }),
        redirect: 'follow',
      });
      if (probeRes.ok) {
        const probeText = await probeRes.text();
        if (
          probeText.includes('引數不能為空值') ||
          probeText.includes('อาร์กิวเมนต์ต้องไม่เป็นนัล') ||
          probeText.includes('Exception: อาร์กิวเมนต์ต้องไม่เป็นนัล')
        ) {
          isLegacy = true;
        } else {
          try {
            const probeJson = JSON.parse(probeText);
            if (!probeJson.supportsTermFolders) {
              isLegacy = true;
              missingTermSupport = true;
            } else if (!probeJson.supportsSilentPermissions) {
              isLegacy = true;
              missingSilentPermissions = true;
            }
          } catch {
            isLegacy = true;
          }
        }
      }
    } catch {
      // probe error ignored
    }

    if (isLegacy) {
      return {
        success: true,
        isLegacyScript: true,
        supportsArchive: !missingTermSupport,
        message: missingTermSupport
          ? 'เชื่อมต่อสำเร็จ แต่สคริปต์ของ URL นี้ยังเป็นเวอร์ชันเก่า (ยังไม่รองรับโฟลเดอร์แยกปีการศึกษา/เทอม)'
          : missingSilentPermissions
          ? 'เชื่อมต่อสำเร็จ แต่สคริปต์ยังเป็นเวอร์ชันเดิม (ยังส่งเมลแจ้งเตือนแชร์ไฟล์เวลาเพิ่มสิทธิ์ผู้ตรวจ)'
          : 'เชื่อมต่อสำเร็จ แต่สคริปต์ในไดรฟ์ยังเป็นเวอร์ชันเดิม (ยังไม่รองรับการทำสำเนาไฟล์ที่ตรวจแล้ว)',
        details: 'กรุณาคัดลอกโค้ดใหม่จากแท็บ "โค้ดสคริปต์" ไปวางทับใน Code.gs แล้วกด Deploy > Manage deployments > รูปดินสอ > New version',
      };
    }

    return {
      success: true,
      supportsArchive: true,
      message: 'เชื่อมต่อกับ Google Apps Script สำเร็จพร้อมใช้งาน! (รองรับโฟลเดอร์ปี/เทอม, เพิ่มสิทธิ์แบบไม่ส่งเมลรบกวน, ย้ายลงถังขยะ และทำสำเนาไฟล์ตรวจแล้วครบวงจร)',
      details: json || text,
    };
  } catch (err: any) {
    // Note: Due to Google Apps Script 302 redirects, standard CORS GET may return opaque or error in some browsers
    // but POST with text/plain always succeeds. Let's provide helpful feedback.
    return {
      success: false,
      message: `ไม่สามารถเชื่อมต่อได้: ${err?.message || 'โปรดตรวจสอบสิทธิ์การแชร์เป็น "Anyone" ใน Web App'}`,
    };
  }
}

/**
 * อัปโหลดไฟล์ PDF ขึ้น Google Drive ของโรงเรียนผ่าน Google Apps Script Web App
 * และรับลิงก์เปิดดูไฟล์ (Shareable URL) กลับมาโดยตรง
 */
export async function uploadPdfFileToGoogleDrive(
  file: File,
  meta: GoogleDriveUploadOptions
): Promise<GoogleDriveUploadResult> {
  const webhookUrl = (await fetchGoogleDriveWebhookUrl()).trim();

  const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
  const sizeText = Number(fileSizeMb) < 1 ? `${Math.round(file.size / 1024)} KB` : `${fileSizeMb} MB`;

  if (!webhookUrl) {
    return {
      success: false,
      error: 'ยังไม่ได้เชื่อมต่อ Google Apps Script Web App (กรุณาให้ผู้ดูแลระบบตั้งค่า URL Google Drive ในเมนูตั้งค่า)',
      fileSize: sizeText,
    };
  }

  try {
    const base64Data = await fileToBase64(file);

    // ตรวจสอบนามสกุลไฟล์จริง (.pdf, .xlsx, .xls, .csv, .docx ฯลฯ)
    const rawExt = file.name.includes('.') ? '.' + file.name.split('.').pop()!.toLowerCase() : '.pdf';
    
    // ตั้งชื่อไฟล์ตามเทมเพลตที่ผู้ดูแลระบบหรือโรงเรียนกำหนดไว้
    const pattern = await fetchGoogleDriveNamingPattern();
    const generatedFileName = meta.customFileName || formatDriveFileName(pattern, file, meta);

    // กำหนด MIME type ให้ถูกต้องสำหรับ Google Drive
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (rawExt === '.xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (rawExt === '.xls') mimeType = 'application/vnd.ms-excel';
      else if (rawExt === '.csv') mimeType = 'text/csv';
      else if (rawExt === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (rawExt === '.doc') mimeType = 'application/msword';
      else mimeType = 'application/pdf';
    }

    const rawEditorEmails = [
      ...(Array.isArray(meta.editorEmails) ? meta.editorEmails : []),
      meta.submitterEmail,
      meta.reviewerEmail,
    ];
    const validEditorEmails = Array.from(
      new Set(
        rawEditorEmails
          .map((e) => (e || '').trim().toLowerCase())
          .filter((e) => e && e.includes('@'))
      )
    );

    const activeTerm = getLocalActiveTerm();
    const effectiveYear = (meta.academicYear || activeTerm.academic_year || '2569').trim();
    const effectiveSemester = (meta.semester || activeTerm.semester || '2').trim();

    const payload = {
      action: 'upload',
      fileName: generatedFileName,
      originalFileName: file.name,
      base64Data: base64Data,
      mimeType: mimeType,
      teacherId: meta.teacherId,
      teacherName: meta.teacherName,
      assignmentName: meta.assignmentName,
      courseCode: meta.courseCode || '',
      subjectName: meta.subjectName || '',
      gradeLevel: meta.gradeLevel || '',
      learningArea: meta.learningArea || '',
      semester: effectiveSemester,
      academicYear: effectiveYear,
      submitterEmail: (meta.submitterEmail || '').trim().toLowerCase(),
      reviewerEmail: (meta.reviewerEmail || '').trim().toLowerCase(),
      editorEmails: validEditorEmails,
    };

    // ส่งแบบ text/plain เพื่อป้องกัน Browser CORS preflight (OPTIONS) ปฏิเสธ
    // Google Apps Script รองรับ e.postData.contents อย่างสมบูรณ์ 100%
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script ส่งสถานะ HTTP ${response.status}`);
    }

    const resText = await response.text();
    let resJson: any;
    try {
      resJson = JSON.parse(resText);
    } catch {
      throw new Error(`รูปแบบข้อมูลตอบกลับจาก Google Drive ไม่ถูกต้อง: ${resText.slice(0, 100)}`);
    }

    if (!resJson.success) {
      throw new Error(resJson.error || 'Google Apps Script รายงานข้อผิดพลาดในการบันทึกไฟล์');
    }

    const driveUrl = resJson.fileUrl || `https://drive.google.com/file/d/${resJson.fileId}/view`;

    return {
      success: true,
      fileUrl: driveUrl,
      fileId: resJson.fileId,
      fileName: generatedFileName,
      fileSize: sizeText,
      folderName: resJson.folderName,
    };
  } catch (err: any) {
    console.error('Error uploading to Google Drive:', err);
    return {
      success: false,
      error: `อัปโหลดเข้า Google Drive ไม่สำเร็จ: ${err?.message || 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'}`,
      fileSize: sizeText,
    };
  }
}

/**
 * ดึง Google Drive File ID จาก URL รูปแบบต่างๆ หรือถ้าเป็น ID อยู่แล้วก็คืนค่ากลับมา
 */
export function extractGoogleDriveFileId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // Pattern 1: /file/d/([-\w]+)
  const dMatch = trimmed.match(/\/file\/d\/([-\w]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];

  // Pattern 2: id=([-\w]+)
  const idMatch = trimmed.match(/[?&]id=([-\w]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];

  // Pattern 3: /d/([-\w]+) (Google user content / lh3)
  const uMatch = trimmed.match(/\/d\/([-\w]+)/);
  if (uMatch && uMatch[1]) return uMatch[1];

  // Pattern 4: Raw file ID (usually 25-45 characters alphanumeric with - or _)
  if (/^[-\w]{25,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * สั่งย้ายไฟล์ใน Google Drive ไปไว้ใน "ถังขยะ (Trash)" อัตโนมัติ (สามารถกู้คืนได้ภายใน 30 วัน)
 */
export async function trashGoogleDriveFile(
  fileUrlOrId: string
): Promise<{ success: boolean; message: string; fileId?: string; isLegacyScript?: boolean; error?: string }> {
  if (!fileUrlOrId) {
    return {
      success: false,
      message: 'ไม่มี URL หรือ ID ไฟล์',
    };
  }

  const fileId = extractGoogleDriveFileId(fileUrlOrId);
  if (!fileId) {
    return {
      success: false,
      message: 'ไม่พบ ID ไฟล์ Google Drive ที่ถูกต้อง (อาจเป็นลิงก์ภายนอก)',
    };
  }

  const webhookUrl = (await fetchGoogleDriveWebhookUrl()).trim();
  if (!webhookUrl) {
    return {
      success: false,
      message: 'ยังไม่ได้ตั้งค่า Webhook URL ของ Google Apps Script',
    };
  }

  try {
    const payload = {
      action: 'trash',
      fileId: fileId,
      fileUrl: fileUrlOrId,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Google Apps Script ส่งสถานะ HTTP ${response.status}`,
      };
    }

    const resText = await response.text();
    let resJson: any;
    try {
      resJson = JSON.parse(resText);
    } catch {
      return {
        success: false,
        message: 'ข้อมูลตอบกลับจาก Google Drive ไม่ถูกต้อง',
      };
    }

    if (!resJson.success) {
      const errorStr = String(resJson.error || '');
      // Check if this error indicates the Apps Script is an older version that only knows file uploads
      // (throws: "อาร์กิวเมนต์ต้องไม่เป็นนัล: data" or "เกิดข้อผิดพลาดในการบันทึกไฟล์")
      const isLegacyUploadScript =
        errorStr.includes('อาร์กิวเมนต์ต้องไม่เป็นนัล: data') ||
        errorStr.includes('Exception: อาร์กิวเมนต์ต้องไม่เป็นนัล') ||
        errorStr.includes('เกิดข้อผิดพลาดในการบันทึกไฟล์') ||
        errorStr.includes('base64Data');

      if (isLegacyUploadScript) {
        return {
          success: false,
          isLegacyScript: true,
          message: 'Google Apps Script ยังเป็นเวอร์ชันอัปโหลดอย่างเดียว (สามารถคัดลอกโค้ดสคริปต์ใหม่ในระบบเพื่อเปิดใช้การย้ายไฟล์ลงถังขยะอัตโนมัติ)',
          error: resJson.error,
        };
      }

      return {
        success: false,
        message: resJson.error || 'Google Drive รายงานว่าไม่สามารถย้ายไฟล์ลงถังขยะได้',
        error: resJson.error,
      };
    }

    return {
      success: true,
      message: resJson.message || 'ย้ายไฟล์ลงถังขยะของ Google Drive เรียบร้อยแล้ว (สามารถกู้คืนได้ใน 30 วัน)',
      fileId: fileId,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `ไม่สามารถย้ายไฟล์ลงถังขยะใน Google Drive ได้: ${err?.message || 'ข้อผิดพลาดเครือข่าย'}`,
      error: err?.message,
    };
  }
}

export interface ArchiveReviewedOptions {
  planId: string;
  planTitle: string;
  planType: string;
  branch?: string;
  learningArea?: string;
  teacherName: string;
  teacherId?: string;
  fileUrl: string;
  fileName?: string;
  reviewerName?: string;
  reviewerId?: string;
  academicYear?: string;
  semester?: string;
}

export interface ArchiveReviewedResult {
  success: boolean;
  fileUrl?: string;
  fileId?: string;
  folderPath?: string;
  folderName?: string;
  fileName?: string;
  isLegacyScript?: boolean;
  error?: string;
}

/**
 * ส่งคำสั่งไป Google Apps Script ให้คัดลอกไฟล์สำเนาที่ตรวจเสร็จแล้ว
 * ไปจัดเก็บในโฟลเดอร์ Google Drive: "ตรวจแล้ว/ประเภทเอกสาร_สาขาวิชา"
 * รองรับทั้ง Google Drive Link, ลิงก์ตรงไฟล์ PDF ภายนอก และ Base64 Data
 */
export async function archiveReviewedPlanToGoogleDrive(
  options: ArchiveReviewedOptions
): Promise<ArchiveReviewedResult> {
  if (!options.fileUrl) {
    return {
      success: false,
      error: 'ไม่พบลิงก์หรือไฟล์เอกสารที่ต้องการสำรอง',
    };
  }

  const webhookUrl = await fetchGoogleDriveWebhookUrl();
  if (!webhookUrl) {
    return {
      success: false,
      error: 'ยังไม่ได้เชื่อมต่อ Google Drive Webhook URL',
    };
  }

  try {
    const cleanDocType = (options.planType || 'เอกสารทั่วไป').trim();
    const cleanBranch = (options.branch || options.learningArea || 'ทั่วไป').trim();
    const subfolderName = `${cleanDocType}_${cleanBranch}`.replace(/[\/\\:*?"<>|]/g, '_');

    let cleanFileName = options.fileName?.trim();
    if (!cleanFileName) {
      cleanFileName = `[ตรวจแล้ว]_${options.teacherName || 'ครู'}_${options.planTitle || cleanDocType}.pdf`.replace(/[\/\\:*?"<>|]/g, '_');
    } else if (!cleanFileName.startsWith('[ตรวจแล้ว]')) {
      cleanFileName = `[ตรวจแล้ว]_${cleanFileName}`;
    }

    const activeTerm = getLocalActiveTerm();
    const effectiveYear = (options.academicYear || activeTerm.academic_year || '2569').trim();
    const effectiveSemester = (options.semester || activeTerm.semester || '2').trim();

    const payload: any = {
      action: 'archive_reviewed_pdf',
      planId: options.planId,
      docType: cleanDocType,
      branch: cleanBranch,
      subfolderName: subfolderName,
      teacherName: options.teacherName,
      teacherId: options.teacherId,
      planTitle: options.planTitle,
      fileUrl: options.fileUrl,
      fileName: cleanFileName,
      reviewerName: options.reviewerName,
      reviewerId: options.reviewerId,
      academicYear: effectiveYear,
      semester: effectiveSemester,
      reviewedAt: new Date().toISOString(),
    };

    // If fileUrl is a data URL, extract base64 directly
    if (options.fileUrl.startsWith('data:')) {
      const parts = options.fileUrl.split(',');
      if (parts[1]) {
        payload.base64Data = parts[1];
      }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script ส่งสถานะ HTTP ${response.status}`);
    }

    const resText = await response.text();
    let resJson: any;
    try {
      resJson = JSON.parse(resText);
    } catch {
      throw new Error(`รูปแบบข้อมูลตอบกลับจาก Google Drive ไม่ถูกต้อง: ${resText.slice(0, 100)}`);
    }

    if (!resJson.success) {
      const errorStr = String(resJson.error || '');
      const isLegacy =
        errorStr.includes('引數不能為空值') ||
        errorStr.includes('อาร์กิวเมนต์ต้องไม่เป็นนัล') ||
        errorStr.includes('Exception: อาร์กิวเมนต์ต้องไม่เป็นนัล');

      if (isLegacy) {
        return {
          success: false,
          isLegacyScript: true,
          error: 'สคริปต์ Google Apps Script ในไดรฟ์ยังเป็นเวอร์ชันเดิม กรุณาอัปเดตโค้ดสคริปต์ในเมนู "ตั้งค่า Google Drive (Auto)" เพื่อเปิดใช้งานการทำสำเนาอัตโนมัติ',
        };
      }
      throw new Error(resJson.error || 'Google Apps Script ไม่สามารถคัดลอกไฟล์สำเนาได้');
    }

    return {
      success: true,
      fileUrl: resJson.fileUrl,
      fileId: resJson.fileId,
      folderPath: resJson.folderPath || `ตรวจแล้ว/${subfolderName}`,
      folderName: resJson.folderName || subfolderName,
      fileName: resJson.fileName || cleanFileName,
    };
  } catch (err: any) {
    console.warn('Failed to archive reviewed plan to Google Drive:', err);
    return {
      success: false,
      error: err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google Drive',
    };
  }
}

/**
 * สร้างโฟลเดอร์ปีการศึกษา/ภาคเรียนใหม่บน Google Drive ล่วงหน้า:
 * จภ_กาฬสินธุ์_ปีการศึกษา_<year> / เทอม_<sem>
 */
export async function ensureDriveTermFolderExists(options: {
  academicYear: string;
  semester: string;
}): Promise<{
  success: boolean;
  folderPath?: string;
  folderUrl?: string;
  isLegacyScript?: boolean;
  error?: string;
}> {
  const webhookUrl = (await fetchGoogleDriveWebhookUrl()).trim();
  if (!webhookUrl) {
    return { success: false, error: 'ยังไม่ได้ตั้งค่า Webhook URL ของ Google Apps Script' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'ensure_term_folder',
        academicYear: options.academicYear,
        semester: options.semester,
      }),
      redirect: 'follow',
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const resText = await response.text();
    const resJson = JSON.parse(resText);
    if (!resJson.success) {
      const errStr = String(resJson.error || '');
      const isLegacy =
        errStr.includes('base64Data') ||
        errStr.includes('อาร์กิวเมนต์ต้องไม่เป็นนัล') ||
        errStr.includes('action');
      return {
        success: false,
        isLegacyScript: isLegacy,
        error: resJson.error || 'ไม่สามารถสร้างโฟลเดอร์ปีการศึกษาใน Google Drive ได้',
      };
    }

    return {
      success: true,
      folderPath: resJson.folderPath,
      folderUrl: resJson.folderUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'ไม่สามารถเชื่อมต่อ Google Apps Script',
    };
  }
}

/**
 * ย้ายไฟล์และโฟลเดอร์งานเดิมใน Google Drive เข้าสู่โครงสร้าง:
 * จภ_กาฬสินธุ์_ปีการศึกษา_<year> / เทอม_<sem>
 * โดยไม่ทำให้ File ID หรือ URL เดิมเปลี่ยนแปลง
 */
export async function migrateDriveFilesToTermStructure(options: {
  academicYear: string;
  semester: string;
}): Promise<{
  success: boolean;
  movedFilesCount?: number;
  movedFoldersCount?: number;
  targetPath?: string;
  folderUrl?: string;
  isLegacyScript?: boolean;
  error?: string;
}> {
  const webhookUrl = (await fetchGoogleDriveWebhookUrl()).trim();
  if (!webhookUrl) {
    return { success: false, error: 'ยังไม่ได้ตั้งค่า Webhook URL ของ Google Apps Script' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'migrate_to_term_folders',
        academicYear: options.academicYear,
        semester: options.semester,
      }),
      redirect: 'follow',
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const resText = await response.text();
    const resJson = JSON.parse(resText);
    if (!resJson.success) {
      const errStr = String(resJson.error || '');
      const isLegacy =
        errStr.includes('base64Data') ||
        errStr.includes('อาร์กิวเมนต์ต้องไม่เป็นนัล') ||
        errStr.includes('action');
      return {
        success: false,
        isLegacyScript: isLegacy,
        error: resJson.error || 'ไม่สามารถย้ายไฟล์เข้าโฟลเดอร์ใหม่ได้',
      };
    }

    return {
      success: true,
      movedFilesCount: resJson.movedFilesCount || 0,
      movedFoldersCount: resJson.movedFoldersCount || 0,
      targetPath: resJson.targetPath,
      folderUrl: resJson.folderUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google Apps Script',
    };
  }
}

/**
 * ดึง URL ไฟล์ Google Drive ทั้งหมดที่แนบมากับแผนการสอน (ทั้งไฟล์หลักและไฟล์แนบใน notes)
 */
export function extractGoogleDriveFileUrlsFromPlan(plan: LessonPlan): string[] {
  const urls: string[] = [];
  const seenIds = new Set<string>();

  const tryAddUrl = (rawUrl?: string) => {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed === '#') return;
    const fileId = extractGoogleDriveFileId(trimmed);
    if (fileId && !seenIds.has(fileId)) {
      seenIds.add(fileId);
      urls.push(trimmed);
    }
  };

  tryAddUrl(plan.file_url);

  if (plan.notes) {
    try {
      const parsed = JSON.parse(plan.notes);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed._attachments)) {
          parsed._attachments.forEach((att: any) => {
            if (att && typeof att === 'object') tryAddUrl(att.file_url);
          });
        }
        Object.entries(parsed).forEach(([key, val]) => {
          if (key === '_attachments' || key === '_file_reviews') return;
          if (typeof val === 'string') {
            tryAddUrl(val);
          } else if (Array.isArray(val)) {
            val.forEach((item: any) => {
              if (typeof item === 'string') tryAddUrl(item);
              else if (item && typeof item === 'object' && item.file_url) tryAddUrl(item.file_url);
            });
          } else if (val && typeof val === 'object' && (val as any).file_url) {
            tryAddUrl((val as any).file_url);
          }
        });
      }
    } catch {
      // plain text notes
    }
  }

  return urls;
}

/**
 * คืนค่ารายชื่ออีเมลที่มีสิทธิ์แก้ไข (Editor) ของแผนการสอนนี้:
 * เฉพาะอีเมลครูผู้ส่ง + อีเมลกรรมการผู้ตรวจที่ได้รับมอบหมายเท่านั้น
 */
export function resolveEmailsForPlanEditors(plan: LessonPlan, teachers: Teacher[]): string[] {
  const emails = new Set<string>();

  const addTeacherEmail = (id?: string, name?: string) => {
    if (!id && !name) return;
    const cleanId = (id || '').trim().toLowerCase();
    const cleanName = (name || '').trim().toLowerCase();
    const found = teachers.find((t) => {
      const tId = (t.Teacher_ID || '').trim().toLowerCase();
      const tName = (t.Name || '').trim().toLowerCase();
      return (cleanId && tId === cleanId) || (cleanName && tName === cleanName);
    });
    const email = (found?.Email || '').trim().toLowerCase();
    if (email && email.includes('@')) {
      emails.add(email);
    }
  };

  // 1. Submitter email
  addTeacherEmail(plan.teacher_id, plan.teacher_name);

  // 2. Assigned reviewer email (or reviewed_by fallback if assigned_reviewer_id is absent)
  if (plan.assigned_reviewer_id || plan.assigned_reviewer_name) {
    addTeacherEmail(plan.assigned_reviewer_id, plan.assigned_reviewer_name);
  } else if (plan.reviewed_by || plan.reviewer_name) {
    addTeacherEmail(plan.reviewed_by, plan.reviewer_name);
  }

  return Array.from(emails);
}

/**
 * อัปเดตสิทธิ์ Google Drive ของไฟล์ (Option B2):
 * เปิดให้ทุกคนที่มีลิงก์ดูได้ (VIEW) เพื่อให้พรีวิวบนหน้าเว็บได้ลื่น
 * แต่มอบสิทธิ์แก้ไข (Editor) ให้เฉพาะอีเมลผู้ส่งและผู้ตรวจที่ระบุเท่านั้น
 */
export async function syncGoogleDriveFileEditors(options: {
  fileUrls: string[];
  editorEmails: string[];
  removeUnauthorizedEditors?: boolean;
}): Promise<{ success: boolean; updatedCount?: number; skipped?: boolean; error?: string }> {
  const fileIds = Array.from(
    new Set(
      (options.fileUrls || [])
        .map((u) => extractGoogleDriveFileId(u))
        .filter((id): id is string => Boolean(id))
    )
  );

  const editorEmails = Array.from(
    new Set(
      (options.editorEmails || [])
        .map((e) => (e || '').trim().toLowerCase())
        .filter((e) => e && e.includes('@'))
    )
  );

  if (fileIds.length === 0 || editorEmails.length === 0) {
    return { success: true, skipped: true };
  }

  const webhookUrl = (await fetchGoogleDriveWebhookUrl()).trim();
  if (!webhookUrl) {
    return { success: false, error: 'ยังไม่ได้ตั้งค่า Google Drive Webhook URL' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'sync_permissions',
        fileIds,
        editorEmails,
        removeUnauthorizedEditors: options.removeUnauthorizedEditors !== false,
      }),
      redirect: 'follow',
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const resText = await response.text();
    try {
      const resJson = JSON.parse(resText);
      return {
        success: Boolean(resJson.success),
        updatedCount: resJson.updatedCount,
        error: resJson.error,
      };
    } catch {
      return { success: false, error: 'Invalid response from Google Apps Script' };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * ซิงค์สิทธิ์แก้ไขไฟล์ Google Drive ให้ตรงกับผู้ส่งและผู้ตรวจคนปัจจุบันของแผนการสอน
 */
export async function syncLessonPlanDriveEditors(
  plan: LessonPlan,
  teachers: Teacher[]
): Promise<void> {
  try {
    const fileUrls = extractGoogleDriveFileUrlsFromPlan(plan);
    if (fileUrls.length === 0) return;
    const editorEmails = resolveEmailsForPlanEditors(plan, teachers);
    if (editorEmails.length === 0) return;

    await syncGoogleDriveFileEditors({
      fileUrls,
      editorEmails,
      removeUnauthorizedEditors: true,
    });
  } catch (err) {
    console.warn('[Drive Sync Permissions Notice]', err);
  }
}

/**
 * โค้ดแม่แบบ Google Apps Script ฉบับสมบูรณ์ที่พร้อมใช้งานทันที (รองรับ Upload + มอบสิทธิ์ Editor เฉพาะผู้ส่งและคนตรวจ, ย้ายลง Trash, ส่งอีเมล และจัดเก็บไฟล์ตรวจแล้ว)
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * =========================================================================
 * PCSHS KSN - GOOGLE DRIVE AUTO-UPLOADER & TRASH MANAGER (WEB APP SCRIPT)
 * โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
 * =========================================================================
 * 
 * ความสามารถของสคริปต์นี้:
 * 1. อัปโหลดไฟล์ PDF จากเว็บ เข้า Google Drive ของฝ่ายวิชาการอัตโนมัติ
 * 2. ตั้งสิทธิ์เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู (Viewer)" เพื่อพรีวิวบนหน้าเว็บได้ลื่น
 *    และมอบสิทธิ์ "แก้ไข (Editor)" เฉพาะอีเมลผู้ส่งและอีเมลผู้ตรวจที่ได้รับมอบหมายเท่านั้น (Option B2)
 * 3. เมื่อครูหรือแอดมินยกเลิก/ลบงานในเว็บ สคริปต์จะย้ายไฟล์ลง "ถังขยะ (Trash)" ให้อัตโนมัติ
 *    (กู้คืนได้ภายใน 30 วัน ป้องกันการลบข้อมูลผิดพลาด)
 * 4. ส่งอีเมลแจ้งเตือน / ผลตรวจ / ใบเสร็จ จากเมลฝ่ายวิชาการในคลิกเดียว (1-Click Academic Email)
 * 
 * ขั้นตอนการติดตั้ง:
 * 1. เข้าไปที่ https://script.google.com ด้วยบัญชี Google ของฝ่ายวิชาการ
 * 2. กดปุ่ม "+ โครงการใหม่" (New Project) แล้วลบโค้ดเดิมออกทั้งหมด
 * 3. นำโค้ดด้านล่างนี้ทั้งหมดไปวางแทนที่
 * 4. (ไม่บังคับ) หากต้องการกำหนดโฟลเดอร์ปลายทางเอง ให้ใส่ไอดีโฟลเดอร์ใน TARGET_FOLDER_ID
 *    หากปล่อยว่างไว้ ระบบจะสร้าง/ใช้โฟลเดอร์ "PCSHS_KSN_งานวิชาการ" ให้อัตโนมัติ
 * 5. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) -> "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. เลือกประเภทเป็น "เว็บแอป" (Web app)
 * 7. ตั้งค่า:
 *    - ปฏิบัติการในฐานะ (Execute as): "ฉัน" (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): "ทุกคน" (Anyone) **สำคัญมาก**
 * 8. กด "ทำให้ใช้งานได้" (Deploy) แล้วคัดลอก "URL ของเว็บแอป" มาวางในระบบของโรงเรียน
 */

// (ไม่บังคับ) ใส่ ID ของโฟลเดอร์ Google Drive กลางของโรงเรียนตรงนี้ หรือปล่อยว่าง "" เพื่อใช้โฟลเดอร์ "PCSHS_KSN_งานวิชาการ" อัตโนมัติ
var TARGET_FOLDER_ID = "";

/**
 * ฟังก์ชันหลักรับคำสั่ง POST จากระบบส่งงานของโรงเรียน
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, error: "ไม่พบข้อมูลที่ส่งมา (No post data)" });
    }

    var data = JSON.parse(e.postData.contents);

    // =========================================================================
    // คำสั่งที่ 1: ย้ายไฟล์ลงถังขยะของ Google Drive (Trash) เมื่อยกเลิกหรือลบการส่งงาน
    // =========================================================================
    if (data.action === "trash" || data.action === "delete") {
      var targetFileId = data.fileId;
      if (!targetFileId && data.fileUrl) {
        var match = data.fileUrl.match(/[-\\w]{25,}/);
        if (match) targetFileId = match[0];
      }

      if (!targetFileId) {
        return responseJSON({ success: false, error: "ไม่พบ File ID ที่จะย้ายลงถังขยะ" });
      }

      try {
        var fileToTrash = DriveApp.getFileById(targetFileId.trim());
        var fileName = fileToTrash.getName();
        fileToTrash.setTrashed(true); // ย้ายลงถังขยะ Google Drive ทันที

        return responseJSON({
          success: true,
          message: "ย้ายไฟล์ \\"" + fileName + "\\" ลงถังขยะของ Google Drive เรียบร้อยแล้ว (สามารถกู้คืนได้ภายใน 30 วัน)",
          fileId: targetFileId,
          fileName: fileName
        });
      } catch (trashErr) {
        var errStr = trashErr.toString();
        if (errStr.indexOf("not found") !== -1 || errStr.indexOf("No item with the given ID") !== -1) {
          return responseJSON({
            success: true,
            message: "ไฟล์นี้ไม่อยู่ใน Google Drive แล้ว หรือถูกลบไปก่อนหน้า",
            fileId: targetFileId
          });
        }
        return responseJSON({
          success: false,
          error: "ไม่สามารถย้ายไฟล์ลงถังขยะได้: " + errStr
        });
      }
    }

    // =========================================================================
    // คำสั่งที่ 2: ส่งอีเมลจากบัญชี Google ฝ่ายวิชาการในคลิกเดียว (1-Click Academic Email)
    // =========================================================================
    if (data.action === "send_email") {
      var recipient = (data.to || "").toString().trim();
      if (!recipient) {
        return responseJSON({ success: false, error: "กรุณาระบุอีเมลผู้รับ (to)" });
      }

      try {
        var senderName = data.senderName || "ฝ่ายบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์";
        MailApp.sendEmail({
          to: recipient,
          subject: data.subject || "แจ้งเตือนจากฝ่ายบริหารวิชาการ PCSHS KSN",
          body: data.body || "กรุณาเปิดอ่านเนื้อหาในรูปแบบ HTML",
          htmlBody: data.htmlBody || data.body,
          name: senderName
        });

        return responseJSON({
          success: true,
          message: "ส่งอีเมลจากฝ่ายวิชาการไปยัง " + recipient + " เรียบร้อยแล้ว",
          recipient: recipient,
          sentAt: new Date().toISOString()
        });
      } catch (mailErr) {
        return responseJSON({
          success: false,
          error: "ไม่สามารถส่งอีเมลได้: " + mailErr.toString()
        });
      }
    }

    // ส่งอีเมลแบบกลุ่มหลายฉบับ (Bulk Emails)
    if (data.action === "send_bulk_emails" && Array.isArray(data.emails)) {
      var results = [];
      var bulkSender = data.senderName || "ฝ่ายบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์";
      for (var b = 0; b < data.emails.length; b++) {
        var mItem = data.emails[b];
        try {
          MailApp.sendEmail({
            to: mItem.to,
            subject: mItem.subject,
            body: mItem.body || "กรุณาเปิดอ่านเนื้อหาในรูปแบบ HTML",
            htmlBody: mItem.htmlBody || mItem.body,
            name: bulkSender
          });
          results.push({ to: mItem.to, success: true });
        } catch (bErr) {
          results.push({ to: mItem.to, success: false, error: bErr.toString() });
        }
      }
      return responseJSON({ success: true, count: results.length, details: results });
    }

    // =========================================================================
    // คำสั่งที่ 2.5: สร้าง/ตรวจสอบโฟลเดอร์ปีการศึกษาและเทอม และย้ายไฟล์เดิมเข้าโครงสร้างใหม่
    // =========================================================================
    if (data.action === "ensure_term_folder") {
      var ensureInfo = getOrCreateTermFolders(data.academicYear, data.semester);
      return responseJSON({
        success: true,
        folderPath: ensureInfo.folderPath,
        folderId: ensureInfo.termFolder.getId(),
        folderUrl: ensureInfo.termFolder.getUrl()
      });
    }

    if (data.action === "migrate_to_term_folders") {
      var destInfo = getOrCreateTermFolders(data.academicYear, data.semester);
      var destTermFolder = destInfo.termFolder;
      var destReviewedFolder = getOrCreateSubfolder(destTermFolder, "ตรวจแล้ว");
      var movedFilesCount = 0;
      var movedFoldersCount = 0;

      // ช่วยย้ายไฟล์ทั้งหมดจาก srcFolder ไปยัง destFolder (ไม่สร้างไฟล์ใหม่ ใช้ moveTo เพื่อรักษา URL เดิม)
      var moveAllFiles = function(srcFolder, dstFolder) {
        var fIter = srcFolder.getFiles();
        while (fIter.hasNext()) {
          var fItem = fIter.next();
          try {
            fItem.moveTo(dstFolder);
            movedFilesCount++;
          } catch (mvErr) {}
        }
        var subIter = srcFolder.getFolders();
        while (subIter.hasNext()) {
          var sFolder = subIter.next();
          var sName = sFolder.getName();
          if (sName.indexOf("จภ_กาฬสินธุ์_ปีการศึกษา_") === 0) continue;
          var targetSub = getOrCreateSubfolder(dstFolder, sName);
          movedFoldersCount++;
          moveAllFiles(sFolder, targetSub);
        }
      };

      // 1) ย้ายไฟล์/โฟลเดอร์จากโฟลเดอร์เก่า "PCSHS_KSN_งานวิชาการ" (หรือโฟลเดอร์ใน TARGET_FOLDER_ID)
      var baseFolderId = (TARGET_FOLDER_ID || "").trim();
      if (baseFolderId && baseFolderId !== "ใส่_FOLDER_ID_ของท่านที่นี่") {
        try {
          var configuredRoot = DriveApp.getFolderById(baseFolderId);
          var rootChildren = configuredRoot.getFolders();
          while (rootChildren.hasNext()) {
            var childF = rootChildren.next();
            var childName = childF.getName();
            if (childName.indexOf("จภ_กาฬสินธุ์_ปีการศึกษา_") === 0) continue;
            if (childName === "ตรวจแล้ว") {
              moveAllFiles(childF, destReviewedFolder);
            } else {
              var destTaskFolder = getOrCreateSubfolder(destTermFolder, childName);
              movedFoldersCount++;
              moveAllFiles(childF, destTaskFolder);
            }
          }
          var rootFiles = configuredRoot.getFiles();
          while (rootFiles.hasNext()) {
            var rf = rootFiles.next();
            try {
              rf.moveTo(destTermFolder);
              movedFilesCount++;
            } catch (rfErr) {}
          }
        } catch (cfgErr) {}
      } else {
        var oldLegacyIter = DriveApp.getFoldersByName("PCSHS_KSN_งานวิชาการ");
        while (oldLegacyIter.hasNext()) {
          var legacyFolder = oldLegacyIter.next();
          moveAllFiles(legacyFolder, destTermFolder);
        }
      }

      // 2) ย้ายไฟล์/โฟลเดอร์จากโฟลเดอร์ "ตรวจแล้ว" เก่าที่ระดับ Root (ถ้ามี)
      var oldRevIter = DriveApp.getFoldersByName("ตรวจแล้ว");
      while (oldRevIter.hasNext()) {
        var oldRevFolder = oldRevIter.next();
        if (oldRevFolder.getId() === destReviewedFolder.getId()) continue;
        moveAllFiles(oldRevFolder, destReviewedFolder);
      }

      return responseJSON({
        success: true,
        movedFilesCount: movedFilesCount,
        movedFoldersCount: movedFoldersCount,
        targetPath: destInfo.folderPath,
        folderUrl: destTermFolder.getUrl()
      });
    }

    // =========================================================================
    // คำสั่งที่ 3: ทำสำเนาไฟล์ที่ตรวจแล้วเข้าโฟลเดอร์ "จภ_กาฬสินธุ์_ปีการศึกษา_YYYY/เทอม_X/ตรวจแล้ว/ประเภทเอกสาร_สาขาวิชา"
    // =========================================================================
    if (data.action === "archive_reviewed_pdf") {
      if (data.probe === true) {
        return responseJSON({
          success: true,
          probe: true,
          supportsArchive: true,
          supportsSyncPermissions: true,
          supportsTermFolders: true,
          supportsSilentPermissions: true
        });
      }
      var revTermInfo = getOrCreateTermFolders(data.academicYear, data.semester);
      var rootFolderName = "ตรวจแล้ว";
      var rootFolder = getOrCreateSubfolder(revTermInfo.termFolder, rootFolderName);

      var docType = (data.docType || data.planType || "เอกสารทั่วไป").toString().trim();
      var branch = (data.branch || data.learningArea || "ทั่วไป").toString().trim();
      var subfolderName = (data.subfolderName || (docType + "_" + branch)).replace(/[\\/\\\\:*?"<>|]/g, "_");

      var targetSubfolder = getOrCreateSubfolder(rootFolder, subfolderName);

      var fileUrl = (data.fileUrl || "").toString().trim();
      var newFileName = (data.fileName || ("[ตรวจแล้ว]_" + (data.teacherName || "ครู") + "_" + docType + ".pdf")).replace(/[\\/\\\\:*?"<>|]/g, "_");
      if (!newFileName.toLowerCase().endsWith(".pdf")) {
        newFileName += ".pdf";
      }

      var copiedFile = null;

      // 3.1 ตรวจสอบกรณีเป็น Google Drive File ID หรือ URL
      var driveId = null;
      var dMatch = fileUrl.match(/\\/file\\/d\\/([-\\w]+)/);
      if (dMatch && dMatch[1]) driveId = dMatch[1];
      if (!driveId) {
        var idMatch = fileUrl.match(/[?&]id=([-\\w]+)/);
        if (idMatch && idMatch[1]) driveId = idMatch[1];
      }
      if (!driveId && /^[-\\w]{25,}$/.test(fileUrl)) {
        driveId = fileUrl;
      }

      if (driveId) {
        try {
          var srcDriveFile = DriveApp.getFileById(driveId);
          copiedFile = srcDriveFile.makeCopy(newFileName, targetSubfolder);
        } catch (copyErr) {
          try {
            var downloadUrl = "https://drive.google.com/uc?export=download&id=" + driveId;
            var fetchResp = UrlFetchApp.fetch(downloadUrl, { muteHttpExceptions: true });
            if (fetchResp.getResponseCode() === 200) {
              var blob = fetchResp.getBlob().setName(newFileName);
              copiedFile = targetSubfolder.createFile(blob);
            }
          } catch (dlErr) {}
        }
      }

      // 3.2 ตรวจสอบกรณีเป็นลิงก์ PDF ภายนอก (ดาวน์โหลดไฟล์จริงมาเก็บเป็นสำเนา)
      if (!copiedFile && fileUrl && (fileUrl.indexOf("http://") === 0 || fileUrl.indexOf("https://") === 0)) {
        try {
          var webResp = UrlFetchApp.fetch(fileUrl, { muteHttpExceptions: true, followRedirects: true });
          if (webResp.getResponseCode() === 200) {
            var blobWeb = webResp.getBlob().setName(newFileName);
            copiedFile = targetSubfolder.createFile(blobWeb);
          }
        } catch (fetchErr) {}
      }

      // 3.3 กรณีมี Base64 Payload ส่งมาด้วย
      if (!copiedFile && (data.base64Data || data.data)) {
        try {
          var decoded = Utilities.base64Decode(data.base64Data || data.data);
          var bBlob = Utilities.newBlob(decoded, "application/pdf", newFileName);
          copiedFile = targetSubfolder.createFile(bBlob);
        } catch (bErr) {}
      }

      if (copiedFile) {
        copiedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return responseJSON({
          success: true,
          message: "บันทึกไฟล์สำเนาลงในโฟลเดอร์ตรวจแล้วสำเร็จ",
          fileId: copiedFile.getId(),
          fileUrl: "https://drive.google.com/file/d/" + copiedFile.getId() + "/view",
          folderPath: revTermInfo.folderPath + "/" + rootFolderName + "/" + subfolderName,
          folderName: subfolderName,
          fileName: copiedFile.getName()
        });
      } else {
        return responseJSON({
          success: false,
          error: "ไม่สามารถคัดลอกไฟล์จากลิงก์: " + fileUrl + " ได้ กรุณาตรวจสอบลิงก์หรือสิทธิ์การเข้าถึง"
        });
      }
    }

    // =========================================================================
    // คำสั่งที่ 4: อัปเดตสิทธิ์แก้ไข (Editor) เฉพาะอีเมลผู้ส่งและผู้ตรวจเท่านั้น (Option B2)
    // =========================================================================
    if (data.action === "sync_permissions") {
      var rawFileIds = Array.isArray(data.fileIds) ? data.fileIds : [];
      if (data.fileId) rawFileIds.push(data.fileId);

      var allowedEmails = [];
      if (Array.isArray(data.editorEmails)) {
        for (var i = 0; i < data.editorEmails.length; i++) {
          var em = (data.editorEmails[i] || "").toString().trim().toLowerCase();
          if (em && em.indexOf("@") !== -1 && allowedEmails.indexOf(em) === -1) {
            allowedEmails.push(em);
          }
        }
      }

      var removeOthers = data.removeUnauthorizedEditors !== false;
      var updatedCount = 0;
      var syncDetails = [];

      for (var fIdx = 0; fIdx < rawFileIds.length; fIdx++) {
        var fid = (rawFileIds[fIdx] || "").toString().trim();
        if (!fid) continue;

        try {
          var targetFile = DriveApp.getFileById(fid);
          // Option B2: ทุกคนที่มีลิงก์เปิดดูได้อย่างเดียว (เพื่อพรีวิวในเว็บได้โดยไม่ติดบัญชี)
          targetFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

          var ownerEmail = "";
          try {
            var owner = targetFile.getOwner();
            if (owner) ownerEmail = (owner.getEmail() || "").toLowerCase();
          } catch (ownerErr) {}

          var currentEditors = [];
          try {
            var editors = targetFile.getEditors();
            for (var eIdx = 0; eIdx < editors.length; eIdx++) {
              var edEmail = (editors[eIdx].getEmail() || "").toLowerCase();
              if (edEmail) {
                currentEditors.push(edEmail);
                if (removeOthers && edEmail !== ownerEmail && allowedEmails.indexOf(edEmail) === -1) {
                  try {
                    targetFile.removeEditor(editors[eIdx]);
                  } catch (remErr) {}
                }
              }
            }
          } catch (listErr) {}

          var added = [];
          var skipped = [];
          for (var aIdx = 0; aIdx < allowedEmails.length; aIdx++) {
            var allowEm = allowedEmails[aIdx];
            if (allowEm === ownerEmail || currentEditors.indexOf(allowEm) !== -1) {
              added.push(allowEm);
              continue;
            }
            var silentRes = addEditorSilently(fid, allowEm);
            if (silentRes.ok) {
              added.push(allowEm);
            } else {
              skipped.push({ email: allowEm, error: silentRes.error });
            }
          }

          updatedCount++;
          syncDetails.push({ fileId: fid, added: added, skipped: skipped });
        } catch (fileErr) {
          syncDetails.push({ fileId: fid, error: fileErr.toString() });
        }
      }

      return responseJSON({
        success: true,
        updatedCount: updatedCount,
        details: syncDetails
      });
    }

    // =========================================================================
    // คำสั่งที่ 5: อัปโหลดไฟล์ PDF ใหม่เข้าสู่โฟลเดอร์ Google Drive (แยกตามประเภทงาน)
    // =========================================================================
    var base64Payload = data.base64Data || data.data;
    if (!base64Payload) {
      return responseJSON({
        success: false,
        error: "ไม่พบข้อมูลไฟล์ base64Data สำหรับการอัปโหลด (หรือคำสั่ง action: '" + (data.action || "upload") + "' ไม่ถูกต้อง)"
      });
    }

    var termInfo = getOrCreateTermFolders(data.academicYear, data.semester);
    var baseFolder = termInfo.termFolder;

    // 3.1 แยกโฟลเดอร์ตามประเภทงาน (ถ้ายังไม่มี ให้ระบบสร้างโฟลเดอร์ใหม่ให้อัตโนมัติทันที)
    var taskFolderName = (data.assignmentName || data.planType || "เอกสารทั่วไป").toString().trim();
    var cleanFolderName = taskFolderName.replace(/[\\/\\\\:*?"<>|]/g, "_") || "เอกสารทั่วไป";
    var targetFolder = getOrCreateSubfolder(baseFolder, cleanFolderName);

    // แปลง Base64 กลับเป็นไฟล์ PDF
    var contentType = data.mimeType || "application/pdf";
    var decodedBytes = Utilities.base64Decode(base64Payload);
    var blob = Utilities.newBlob(decodedBytes, contentType, data.fileName || "document.pdf");

    // 3.2 สร้างไฟล์ในโฟลเดอร์ประจำประเภทงาน
    var file = targetFolder.createFile(blob);

    // 3.3 กำหนดสิทธิ์ให้ทุกคนที่มีลิงก์สามารถดูได้อย่างเดียว (Viewer) สำหรับพรีวิวหน้าเว็บ (Option B2)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 3.4 มอบสิทธิ์แก้ไข (Editor) ให้เฉพาะอีเมลผู้ส่งและผู้ตรวจที่ส่งมาด้วยเท่านั้น
    var editorList = [];
    if (Array.isArray(data.editorEmails)) {
      for (var ei = 0; ei < data.editorEmails.length; ei++) {
        var emItem = (data.editorEmails[ei] || "").toString().trim().toLowerCase();
        if (emItem && emItem.indexOf("@") !== -1 && editorList.indexOf(emItem) === -1) {
          editorList.push(emItem);
        }
      }
    }
    if (data.submitterEmail) {
      var subEm = data.submitterEmail.toString().trim().toLowerCase();
      if (subEm && subEm.indexOf("@") !== -1 && editorList.indexOf(subEm) === -1) {
        editorList.push(subEm);
      }
    }
    if (data.reviewerEmail) {
      var revEm = data.reviewerEmail.toString().trim().toLowerCase();
      if (revEm && revEm.indexOf("@") !== -1 && editorList.indexOf(revEm) === -1) {
        editorList.push(revEm);
      }
    }

    var editorsAdded = [];
    var editorErrors = [];
    var fileOwnerEmail = "";
    try {
      var fOwner = file.getOwner();
      if (fOwner) fileOwnerEmail = (fOwner.getEmail() || "").toLowerCase();
    } catch (ownErr) {}

    var fileId = file.getId();
    for (var ek = 0; ek < editorList.length; ek++) {
      var targetEd = editorList[ek];
      if (fileOwnerEmail && targetEd === fileOwnerEmail) {
        editorsAdded.push(targetEd);
        continue;
      }
      var silentUpRes = addEditorSilently(fileId, targetEd);
      if (silentUpRes.ok) {
        editorsAdded.push(targetEd);
      } else {
        editorErrors.push({ email: targetEd, error: silentUpRes.error });
      }
    }

    // 3.5 สร้างลิงก์สำหรับเปิดดู
    var viewUrl = "https://drive.google.com/file/d/" + fileId + "/view";
    var directUrl = "https://drive.google.com/uc?export=view&id=" + fileId;

    return responseJSON({
      success: true,
      fileId: fileId,
      fileUrl: viewUrl,
      directUrl: directUrl,
      fileName: file.getName(),
      fileSize: file.getSize(),
      folderName: targetFolder.getName(),
      editorsAdded: editorsAdded,
      editorErrors: editorErrors
    });

  } catch (err) {
    return responseJSON({
      success: false,
      error: "เกิดข้อผิดพลาดในการประมวลผล: " + err.toString()
    });
  }
}

/**
 * เพิ่มสิทธิ์ Editor ให้ผู้ส่ง/ผู้ตรวจแบบเงียบ โดยไม่ส่งอีเมลแจ้งเตือนจาก Google Drive (sendNotificationEmails=false)
 */
function addEditorSilently(fileId, emailAddress) {
  var cleanEmail = (emailAddress || "").toString().trim().toLowerCase();
  if (!fileId || !cleanEmail || cleanEmail.indexOf("@") === -1) {
    return { ok: false, error: "ข้อมูลไฟล์หรืออีเมลไม่ถูกต้อง" };
  }
  try {
    var apiUrl = "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(fileId) + "/permissions?sendNotificationEmails=false&supportsAllDrives=true";
    var resp = UrlFetchApp.fetch(apiUrl, {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + ScriptApp.getOAuthToken()
      },
      payload: JSON.stringify({
        role: "writer",
        type: "user",
        emailAddress: cleanEmail
      }),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    if (code >= 200 && code < 300) {
      return { ok: true };
    }
    return { ok: false, error: "Drive API HTTP " + code + ": " + resp.getContentText() };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

/**
 * ดึงหรือสร้างโฟลเดอร์ย่อยภายในโฟลเดอร์แม่ (ข้ามโฟลเดอร์ที่อยู่ในถังขยะ)
 */
function getOrCreateSubfolder(parentFolder, folderName) {
  var cleanName = (folderName || "เอกสารทั่วไป").toString().replace(/[\\/\\\\:*?"<>|]/g, "_").trim();
  var baseParent = parentFolder || DriveApp.getRootFolder();
  var iter = baseParent.getFoldersByName(cleanName);
  while (iter.hasNext()) {
    var existing = iter.next();
    if (!existing.isTrashed()) {
      return existing;
    }
  }
  return baseParent.createFolder(cleanName);
}

/**
 * สร้าง/ดึงโครงสร้างโฟลเดอร์: จภ_กาฬสินธุ์_ปีการศึกษา_<YYYY> / เทอม_<X>
 */
function getOrCreateTermFolders(academicYear, semester) {
  var cleanYear = (academicYear || "2569").toString().replace(/[\\/\\\\:*?"<>|]/g, "").trim();
  var cleanSem = (semester || "2").toString().replace(/[\\/\\\\:*?"<>|]/g, "").trim();
  var yearFolderName = "จภ_กาฬสินธุ์_ปีการศึกษา_" + cleanYear;
  var termFolderName = "เทอม_" + cleanSem;

  var rootParent = null;
  var folderId = (TARGET_FOLDER_ID || "").trim();
  if (folderId && folderId !== "ใส่_FOLDER_ID_ของท่านที่นี่") {
    try {
      var candidate = DriveApp.getFolderById(folderId);
      if (candidate && !candidate.isTrashed()) {
        rootParent = candidate;
      }
    } catch (e) {
      rootParent = null;
    }
  }

  var yearFolder = getOrCreateSubfolder(rootParent, yearFolderName);
  var termFolder = getOrCreateSubfolder(yearFolder, termFolderName);

  return {
    yearFolder: yearFolder,
    termFolder: termFolder,
    yearFolderName: yearFolderName,
    termFolderName: termFolderName,
    folderPath: yearFolderName + "/" + termFolderName
  };
}

/**
 * ดึงโฟลเดอร์เป้าหมาย หรือสร้างให้อัตโนมัติหากยังไม่ได้ระบุ
 */
function getTargetFolder() {
  var folderId = (TARGET_FOLDER_ID || "").trim();
  if (folderId && folderId !== "ใส่_FOLDER_ID_ของท่านที่นี่") {
    try {
      var cfgFolder = DriveApp.getFolderById(folderId);
      if (cfgFolder && !cfgFolder.isTrashed()) return cfgFolder;
    } catch (e) {
      Logger.log("ไม่พบโฟลเดอร์จาก ID: " + folderId + ", กำลังใช้โฟลเดอร์เริ่มต้น");
    }
  }

  // หากไม่ได้ระบุ หรือหาโฟลเดอร์ไม่พบ ให้ใช้โฟลเดอร์กลางชื่อนี้ใน My Drive Root
  var defaultName = "PCSHS_KSN_งานวิชาการ";
  var folders = DriveApp.getRootFolder().getFoldersByName(defaultName);
  while (folders.hasNext()) {
    var f = folders.next();
    if (!f.isTrashed()) return f;
  }
  return DriveApp.getRootFolder().createFolder(defaultName);
}

/**
 * ทดสอบการเชื่อมต่อ (GET request)
 */
function doGet(e) {
  return responseJSON({
    status: "online",
    school: "โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์",
    service: "PCSHS KSN Google Drive Auto Uploader & Trash Service",
    timestamp: new Date().toISOString()
  });
}

/**
 * ส่งข้อมูลกลับเป็น JSON
 */
function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

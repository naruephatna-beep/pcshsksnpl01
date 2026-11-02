/**
 * Google Drive Automated Integration Service
 * โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์ (Princess Chulabhorn Science High School Kalasin)
 * 
 * ทำหน้าที่เชื่อมต่อกับ Google Apps Script Web App เพื่อนำไฟล์ PDF ขึ้น Google Drive กลางของโรงเรียน
 * และดึงลิงก์แชร์ (Shareable View Link) กลับมาบันทึกลงในฐานข้อมูลอัตโนมัติ
 */

import { fetchSystemSetting, saveSystemSetting } from './supabaseClient';

export const STORAGE_KEY_GDRIVE_WEBHOOK = 'pcshs_gdrive_webhook_url';
export const STORAGE_KEY_GDRIVE_FOLDER_NAME = 'pcshs_gdrive_folder_name';

/**
 * URL Webhook ถาวรของ Google Apps Script Web App สำหรับโรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
 * ไม่ว่าจะเปิดจากเครื่องไหน เบราว์เซอร์ใด ระบบจะเชื่อมต่อกับ URL นี้เป็นค่าเริ่มต้นอัตโนมัติ
 */
export const DEFAULT_GDRIVE_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbz90JWFomtPUKUjPth7GNixvljFDqEvE29vSpwc4PcBA9TfR8ipStdhr_yD298V7Zuw4w/exec';

// คืนค่า URL ที่บันทึกไว้ หรือคืนค่า URL เริ่มต้นถาวรของโรงเรียน
export function getSavedGoogleDriveWebhookUrl(): string {
  try {
    const val = localStorage.getItem(STORAGE_KEY_GDRIVE_WEBHOOK);
    if (val && val.trim() && val.trim().startsWith('https://script.google.com/')) {
      return val.trim();
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
      const cleanRemote = res.data.trim();
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
  const cleanUrl = (url || '').trim();
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

export interface GoogleDriveUploadOptions {
  teacherId: string;
  teacherName: string;
  assignmentName: string;
  learningArea?: string;
  semester?: string;
  academicYear?: string;
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
): Promise<{ success: boolean; message: string; details?: any }> {
  const targetUrl = (webhookUrl || getSavedGoogleDriveWebhookUrl()).trim();
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

    return {
      success: true,
      message: 'เชื่อมต่อกับ Google Apps Script สำเร็จพร้อมใช้งาน!',
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

    // สร้างชื่อไฟล์อัตโนมัติอย่างเป็นระเบียบใน Google Drive
    const cleanTeacherName = (meta.teacherName || 'ครูผู้สอน').replace(/[\/\\:*?"<>|]/g, '_');
    const cleanAssignName = (meta.assignmentName || 'เอกสาร').replace(/[\/\\:*?"<>|]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    const generatedFileName = `[${meta.teacherId}]_${cleanTeacherName}_${cleanAssignName}_${timestamp}.pdf`;

    const payload = {
      action: 'upload',
      fileName: generatedFileName,
      originalFileName: file.name,
      base64Data: base64Data,
      mimeType: file.type || 'application/pdf',
      teacherId: meta.teacherId,
      teacherName: meta.teacherName,
      assignmentName: meta.assignmentName,
      learningArea: meta.learningArea || '',
      semester: meta.semester || '',
      academicYear: meta.academicYear || '',
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
): Promise<{ success: boolean; message: string; fileId?: string; error?: string }> {
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
      throw new Error(`Google Apps Script ส่งสถานะ HTTP ${response.status}`);
    }

    const resText = await response.text();
    let resJson: any;
    try {
      resJson = JSON.parse(resText);
    } catch {
      throw new Error(`ข้อมูลตอบกลับจาก Google Drive ไม่ถูกต้อง: ${resText.slice(0, 80)}`);
    }

    if (!resJson.success) {
      throw new Error(resJson.error || 'Google Drive รายงานว่าไม่สามารถย้ายไฟล์ลงถังขยะได้');
    }

    return {
      success: true,
      message: resJson.message || 'ย้ายไฟล์ลงถังขยะของ Google Drive เรียบร้อยแล้ว (สามารถกู้คืนได้ใน 30 วัน)',
      fileId: fileId,
    };
  } catch (err: any) {
    console.warn('Could not trash Google Drive file:', err);
    return {
      success: false,
      message: `ไม่สามารถย้ายไฟล์ลงถังขยะใน Google Drive ได้: ${err?.message || 'ข้อผิดพลาดเครือข่าย'}`,
      error: err?.message,
    };
  }
}

/**
 * โค้ดแม่แบบ Google Apps Script ฉบับสมบูรณ์ที่พร้อมใช้งานทันที (รองรับทั้ง Upload และย้ายลง Trash)
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * =========================================================================
 * PCSHS KSN - GOOGLE DRIVE AUTO-UPLOADER & TRASH MANAGER (WEB APP SCRIPT)
 * โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
 * =========================================================================
 * 
 * ความสามารถของสคริปต์นี้:
 * 1. อัปโหลดไฟล์ PDF จากเว็บ เข้า Google Drive ของฝ่ายวิชาการอัตโนมัติ
 * 2. ตั้งสิทธิ์เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู (Viewer)" อัตโนมัติ
 * 3. เมื่อครูหรือแอดมินยกเลิก/ลบงานในเว็บ สคริปต์จะย้ายไฟล์ลง "ถังขยะ (Trash)" ให้อัตโนมัติ
 *    (กู้คืนได้ภายใน 30 วัน ป้องกันการลบข้อมูลผิดพลาด)
 * 
 * ขั้นตอนการติดตั้ง:
 * 1. เข้าไปที่ https://script.google.com ด้วยบัญชี Google ของฝ่ายวิชาการ
 * 2. กดปุ่ม "+ โครงการใหม่" (New Project) แล้วลบโค้ดเดิมออกทั้งหมด
 * 3. นำโค้ดด้านล่างนี้ทั้งหมดไปวางแทนที่
 * 4. แก้ไข TARGET_FOLDER_ID บรรทัดที่ 26 ให้เป็นไอดีโฟลเดอร์ Google Drive ของโรงเรียน
 * 5. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) -> "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. เลือกประเภทเป็น "เว็บแอป" (Web app)
 * 7. ตั้งค่า:
 *    - ปฏิบัติการในฐานะ (Execute as): "ฉัน" (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): "ทุกคน" (Anyone) **สำคัญมาก**
 * 8. กด "ทำให้ใช้งานได้" (Deploy) แล้วคัดลอก "URL ของเว็บแอป" มาวางในระบบของโรงเรียน
 */

// ใส่ ID ของโฟลเดอร์ Google Drive กลางของโรงเรียนตรงนี้
// (ดูได้จาก URL ของโฟลเดอร์ใน Google Drive เช่น https://drive.google.com/drive/folders/1ABCxyz...)
var TARGET_FOLDER_ID = "ใส่_FOLDER_ID_ของท่านที่นี่";

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
        return responseJSON({
          success: false,
          error: "ไม่สามารถย้ายไฟล์ลงถังขยะได้: " + trashErr.toString()
        });
      }
    }

    // =========================================================================
    // คำสั่งที่ 2: อัปโหลดไฟล์ PDF ใหม่เข้าสู่โฟลเดอร์ Google Drive (แยกตามประเภทงาน)
    // =========================================================================
    var folder;
    try {
      folder = DriveApp.getFolderById(TARGET_FOLDER_ID.trim());
    } catch (folderErr) {
      return responseJSON({ 
        success: false, 
        error: "ไม่พบโฟลเดอร์ Google Drive ตาม ID ที่ระบุ: " + folderErr.toString() 
      });
    }

    // 2.1 แยกโฟลเดอร์ตามประเภทงาน (ถ้ายังไม่มี ให้ระบบสร้างโฟลเดอร์ใหม่ให้อัตโนมัติทันที)
    var taskFolderName = (data.assignmentName || data.planType || "เอกสารทั่วไป").toString().trim();
    var cleanFolderName = taskFolderName.replace(/[\/\\:*?"<>|]/g, "_") || "เอกสารทั่วไป";
    var targetFolder = folder;

    try {
      var subfolders = folder.getFoldersByName(cleanFolderName);
      if (subfolders.hasNext()) {
        targetFolder = subfolders.next();
      } else {
        // หากเป็นงานประเภทใหม่ที่แอดมินเพิ่งสร้าง ระบบจะสร้างโฟลเดอร์ใหม่ใน Drive ให้อัตโนมัติทันที
        targetFolder = folder.createFolder(cleanFolderName);
      }
    } catch (subfolderErr) {
      // หากเกิดข้อผิดพลาดในการสร้างโฟลเดอร์ย่อย ให้บันทึกลงโฟลเดอร์หลักสำรอง
      targetFolder = folder;
    }

    // แปลง Base64 กลับเป็นไฟล์ PDF
    var contentType = data.mimeType || "application/pdf";
    var decodedBytes = Utilities.base64Decode(data.base64Data);
    var blob = Utilities.newBlob(decodedBytes, contentType, data.fileName || "document.pdf");

    // 2.2 สร้างไฟล์ในโฟลเดอร์ประจำประเภทงาน
    var file = targetFolder.createFile(blob);

    // 2.3 กำหนดสิทธิ์ให้ทุกคนที่มีลิงก์สามารถดูได้ (Viewer)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 2.4 สร้างลิงก์สำหรับเปิดดู
    var fileId = file.getId();
    var viewUrl = "https://drive.google.com/file/d/" + fileId + "/view";
    var directUrl = "https://drive.google.com/uc?export=view&id=" + fileId;

    return responseJSON({
      success: true,
      fileId: fileId,
      fileUrl: viewUrl,
      directUrl: directUrl,
      fileName: file.getName(),
      fileSize: file.getSize(),
      folderName: targetFolder.getName()
    });

  } catch (err) {
    return responseJSON({
      success: false,
      error: "เกิดข้อผิดพลาดในการประมวลผล: " + err.toString()
    });
  }
}

function doGet(e) {
  return responseJSON({
    status: "online",
    school: "โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์",
    service: "PCSHS KSN Google Drive Auto Uploader & Trash Service",
    timestamp: new Date().toISOString()
  });
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

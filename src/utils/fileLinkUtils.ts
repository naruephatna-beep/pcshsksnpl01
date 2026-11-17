import { LessonPlan } from '../types';

export interface ResolvedFileAttachment {
  file_name: string;
  file_url: string;
  file_size?: string;
}

/**
 * ตรวจสอบว่าเป็นลิงก์ว่าง, '#' หรือลิงก์หน้าหลักของ Google Drive (ไม่ใช่ลิงก์ไฟล์/โฟลเดอร์งานจริง)
 */
export function isHomeOrInvalidDriveUrl(rawUrl?: string | null): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return true;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === '#') return true;
  if (!/^https?:\/\//i.test(trimmed)) return true;

  const lower = trimmed.toLowerCase();
  if (
    /^https?:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?(home|my-drive|shared-with-me|recent|starred|trash)\/?(\?.*)?$/i.test(
      lower
    )
  ) {
    return true;
  }
  return false;
}

/**
 * ตรวจสอบว่าข้อความเป็น URL ที่เปิดได้จริง (ไม่ใช่ลิงก์หน้า Home)
 */
export function isValidHttpFileUrl(rawUrl?: unknown): rawUrl is string {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === '#') return false;
  return /^https?:\/\/[^\s]+/i.test(trimmed);
}

/**
 * ค้นหา URL แรกที่พบใน answers object (รองรับทั้งช่อง type=file, type=text, type=url และ array/object)
 */
export function findFirstHttpUrlInObject(obj?: Record<string, any> | null): string {
  if (!obj || typeof obj !== 'object') return '';

  if (Array.isArray(obj._attachments)) {
    for (const att of obj._attachments) {
      if (att && isValidHttpFileUrl(att.file_url)) {
        return att.file_url.trim();
      }
    }
  }

  for (const [key, val] of Object.entries(obj)) {
    if (key === '_attachments' || key === '_file_reviews') continue;
    if (isValidHttpFileUrl(val)) {
      return val.trim();
    }
    if (Array.isArray(val)) {
      for (const item of val) {
        if (isValidHttpFileUrl(item)) return item.trim();
        if (item && typeof item === 'object' && isValidHttpFileUrl(item.file_url)) {
          return item.file_url.trim();
        }
      }
    } else if (val && typeof val === 'object' && isValidHttpFileUrl((val as any).file_url)) {
      return String((val as any).file_url).trim();
    }
  }

  return '';
}

/**
 * ดึงไฟล์แนบและลิงก์เอกสารทั้งหมดของแผน/ภาระงาน (ทั้งจาก _attachments, fields ใน notes, file_url และ plan_title)
 */
export function extractAllFileLinksFromPlan(plan?: Partial<LessonPlan> | null): ResolvedFileAttachment[] {
  if (!plan) return [];
  const list: ResolvedFileAttachment[] = [];
  const seenUrls = new Set<string>();

  const addFile = (name: string, url?: string | null, size?: string) => {
    if (!isValidHttpFileUrl(url)) return;
    const cleanUrl = url.trim();
    if (seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);
    list.push({
      file_name: name || `ไฟล์แนบที่ ${list.length + 1}`,
      file_url: cleanUrl,
      file_size: size,
    });
  };

  let parsedFormFields: Record<string, any> | null = null;
  if (plan.notes && typeof plan.notes === 'string') {
    try {
      const parsed = JSON.parse(plan.notes);
      if (parsed && typeof parsed === 'object') {
        parsedFormFields = parsed;
      }
    } catch {
      // plain text notes - also extract any URL embedded in plain text
      const urlMatch = plan.notes.match(/https?:\/\/[^\s"'<>]+/i);
      if (urlMatch && urlMatch[0]) {
        addFile(plan.file_name || 'ลิงก์เอกสารแนบ', urlMatch[0]);
      }
    }
  }

  // 1. Check parsedFormFields._attachments
  if (parsedFormFields && Array.isArray(parsedFormFields._attachments)) {
    parsedFormFields._attachments.forEach((att: any, idx: number) => {
      if (att && isValidHttpFileUrl(att.file_url)) {
        addFile(att.file_name || `ไฟล์แนบที่ ${idx + 1}`, att.file_url, att.file_size);
      }
    });
  }

  // 2. Check all other fields in parsedFormFields (including text/link fields, 1drv.ms, docs.google.com, etc.)
  if (parsedFormFields) {
    Object.entries(parsedFormFields).forEach(([key, val]) => {
      if (key === '_attachments' || key === '_file_reviews') return;
      if (!val) return;

      if (Array.isArray(val)) {
        val.forEach((item: any, itemIdx: number) => {
          if (item && typeof item === 'object' && isValidHttpFileUrl(item.file_url)) {
            addFile(item.file_name || `ไฟล์แนบ (${itemIdx + 1})`, item.file_url, item.file_size);
          } else if (isValidHttpFileUrl(item)) {
            addFile(`ลิงก์เอกสาร (${itemIdx + 1})`, item);
          }
        });
      } else if (typeof val === 'object' && isValidHttpFileUrl((val as any).file_url)) {
        addFile((val as any).file_name || 'ไฟล์เอกสาร', (val as any).file_url, (val as any).file_size);
      } else if (isValidHttpFileUrl(val)) {
        addFile(plan.file_name && plan.file_name !== 'เอกสารภาระงาน' ? plan.file_name : 'ลิงก์เอกสารที่ส่ง', val);
      }
    });
  }

  // 3. Main plan.file_url
  if (isValidHttpFileUrl(plan.file_url)) {
    addFile(plan.file_name || 'ไฟล์เอกสารหลัก', plan.file_url, plan.file_size);
  }

  // 4. Fallback: if someone pasted URL inside plan_title
  if (list.length === 0 && isValidHttpFileUrl(plan.plan_title)) {
    addFile('ลิงก์เอกสารที่ส่ง', plan.plan_title);
  }

  return list;
}

/**
 * คืนค่า URL หลักที่เปิดดูได้จริงของแผน/ภาระงาน (ไม่คืนค่า '#' หากมีลิงก์จริงซ่อนอยู่ใน notes)
 */
export function resolvePrimaryPlanFileUrl(plan?: Partial<LessonPlan> | null): string {
  if (!plan) return '';
  if (isValidHttpFileUrl(plan.file_url) && !isHomeOrInvalidDriveUrl(plan.file_url)) {
    return plan.file_url.trim();
  }
  const extracted = extractAllFileLinksFromPlan(plan);
  const validNonHome = extracted.find((f) => !isHomeOrInvalidDriveUrl(f.file_url));
  if (validNonHome) return validNonHome.file_url;
  if (extracted[0]) return extracted[0].file_url;
  if (isValidHttpFileUrl(plan.file_url)) return plan.file_url.trim();
  return '';
}

/**
 * แปลงลิงก์ Google Drive / Google Docs / Google Sheets / Google Slides / PDF ให้เป็น URL สำหรับ iframe preview
 */
export function getEmbedPreviewUrl(rawUrl?: string | null): string | null {
  if (!isValidHttpFileUrl(rawUrl)) return null;
  if (isHomeOrInvalidDriveUrl(rawUrl)) return null;
  const url = rawUrl.trim();

  // Do not try to iframe-embed Google Drive folders (Google blocks folder iframe with X-Frame-Options)
  if (/drive\.google\.com\/.*\/folders\//i.test(url)) {
    return null;
  }

  // Google Drive file (/file/d/<id>)
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileMatch && fileMatch[1]) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }

  // Google Drive open?id=<id> or uc?id=<id>
  if (/drive\.google\.com\/(open|uc)\b/i.test(url)) {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
    }
  }

  // lh3.google.com/u/0/d/<id> or lh3.googleusercontent.com/d/<id>
  const lh3Match = url.match(/lh3\.google(?:usercontent)?\.com\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/i);
  if (lh3Match && lh3Match[1]) {
    return `https://drive.google.com/file/d/${lh3Match[1]}/preview`;
  }

  // Google Sheets / Docs / Slides
  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
  if (sheetsMatch && sheetsMatch[1]) {
    return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/preview`;
  }

  const docsMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (docsMatch && docsMatch[1]) {
    return `https://docs.google.com/document/d/${docsMatch[1]}/preview`;
  }

  const slidesMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i);
  if (slidesMatch && slidesMatch[1]) {
    return `https://docs.google.com/presentation/d/${slidesMatch[1]}/preview`;
  }

  if (url.toLowerCase().split('?')[0].endsWith('.pdf')) {
    return url;
  }

  return null;
}

/**
 * อธิบายประเภทลิงก์สำหรับแสดงคำแนะนำในกรณีที่ไม่สามารถพรีวิวในหน้าต่างได้
 */
export function getExternalLinkDescription(rawUrl?: string | null): {
  isInvalidHome: boolean;
  label: string;
} {
  if (!isValidHttpFileUrl(rawUrl)) {
    return { isInvalidHome: true, label: 'ไม่พบลิงก์ไฟล์เอกสาร' };
  }
  const lower = rawUrl.toLowerCase();
  if (isHomeOrInvalidDriveUrl(rawUrl)) {
    return {
      isInvalidHome: true,
      label: 'ครูวางลิงก์หน้าแรกของ Google Drive (drive/home) แทนลิงก์ไฟล์งาน',
    };
  }
  if (lower.includes('/folders/')) {
    return { isInvalidHome: false, label: 'ลิงก์โฟลเดอร์ Google Drive (เปิดในแท็บใหม่เพื่อดูไฟล์ทั้งหมด)' };
  }
  if (lower.includes('1drv.ms') || lower.includes('onedrive.live.com')) {
    return { isInvalidHome: false, label: 'ไฟล์บน OneDrive (เปิดในแท็บใหม่)' };
  }
  return { isInvalidHome: false, label: 'ลิงก์ภายนอก (เปิดดูในแท็บใหม่)' };
}

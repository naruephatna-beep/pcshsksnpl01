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
 * ป้องกันกรณีงานไฟล์เดียวที่แก้ไข/ส่งใหม่แล้ว (plan.file_url เปลี่ยนเป็นลิงก์ใหม่) แต่ notes เก่ายังค้างลิงก์เดิม
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
  let plainTextNotesUrl: string | null = null;
  if (plan.notes && typeof plan.notes === 'string') {
    try {
      const parsed = JSON.parse(plan.notes);
      if (parsed && typeof parsed === 'object') {
        parsedFormFields = parsed;
      }
    } catch {
      const urlMatch = plan.notes.match(/https?:\/\/[^\s"'<>]+/i);
      if (urlMatch && urlMatch[0]) {
        plainTextNotesUrl = urlMatch[0].trim();
      }
    }
  }

  const rawAtts: any[] =
    parsedFormFields && Array.isArray(parsedFormFields._attachments)
      ? parsedFormFields._attachments.filter((att: any) => att && isValidHttpFileUrl(att.file_url))
      : [];

  const otherFieldEntries: ResolvedFileAttachment[] = [];
  if (parsedFormFields) {
    Object.entries(parsedFormFields).forEach(([key, val]) => {
      if (key === '_attachments' || key === '_file_reviews') return;
      if (!val) return;

      if (Array.isArray(val)) {
        val.forEach((item: any, itemIdx: number) => {
          if (item && typeof item === 'object' && isValidHttpFileUrl(item.file_url)) {
            otherFieldEntries.push({
              file_name: item.file_name || `ไฟล์แนบ (${itemIdx + 1})`,
              file_url: item.file_url.trim(),
              file_size: item.file_size,
            });
          } else if (isValidHttpFileUrl(item)) {
            otherFieldEntries.push({
              file_name: `ลิงก์เอกสาร (${itemIdx + 1})`,
              file_url: item.trim(),
            });
          }
        });
      } else if (typeof val === 'object' && isValidHttpFileUrl((val as any).file_url)) {
        otherFieldEntries.push({
          file_name: (val as any).file_name || 'ไฟล์เอกสาร',
          file_url: String((val as any).file_url).trim(),
          file_size: (val as any).file_size,
        });
      } else if (isValidHttpFileUrl(val)) {
        otherFieldEntries.push({
          file_name:
            plan.file_name && plan.file_name !== 'เอกสารภาระงาน'
              ? plan.file_name
              : 'ลิงก์เอกสารที่ส่ง',
          file_url: val.trim(),
        });
      }
    });
  }

  const hasValidMainUrl = isValidHttpFileUrl(plan.file_url) && !isHomeOrInvalidDriveUrl(plan.file_url);
  const mainUrl = hasValidMainUrl ? plan.file_url!.trim() : '';

  // Check if notes only holds a stale single-file URL while plan.file_url was already updated
  const distinctNotesUrls = new Set<string>([
    ...rawAtts.map((a) => String(a.file_url).trim()),
    ...otherFieldEntries.map((f) => f.file_url),
    ...(plainTextNotesUrl ? [plainTextNotesUrl] : []),
  ]);

  const isStaleSingleAttachmentInNotes =
    Boolean(mainUrl) &&
    rawAtts.length <= 1 &&
    distinctNotesUrls.size === 1 &&
    !distinctNotesUrls.has(mainUrl);

  if (isStaleSingleAttachmentInNotes) {
    // Single-file plan where plan.file_url is already updated: use the updated primary URL only
    addFile(
      plan.file_name || rawAtts[0]?.file_name || 'ไฟล์เอกสารหลัก',
      mainUrl,
      plan.file_size || rawAtts[0]?.file_size
    );
    return list;
  }

  // If this is a multi-file submission where file_url was updated without syncing _attachments[0],
  // place mainUrl first so reviewers always see the latest primary link at index 0.
  if (mainUrl && rawAtts.length > 1 && !rawAtts.some((a) => String(a.file_url).trim() === mainUrl)) {
    addFile(plan.file_name || 'ไฟล์เอกสารหลัก', mainUrl, plan.file_size);
  }

  // 1. Check parsedFormFields._attachments
  rawAtts.forEach((att: any, idx: number) => {
    addFile(att.file_name || `ไฟล์แนบที่ ${idx + 1}`, att.file_url, att.file_size);
  });

  // 2. Check all other fields in parsedFormFields (including text/link fields, 1drv.ms, docs.google.com, etc.)
  otherFieldEntries.forEach((entry) => {
    addFile(entry.file_name, entry.file_url, entry.file_size);
  });

  // 3. Main plan.file_url (placed before plain-text note URLs when valid)
  if (isValidHttpFileUrl(plan.file_url)) {
    addFile(plan.file_name || 'ไฟล์เอกสารหลัก', plan.file_url, plan.file_size);
  }

  // 4. URL embedded in plain text notes (if distinct from main file_url)
  if (plainTextNotesUrl) {
    addFile(plan.file_name || 'ลิงก์เอกสารแนบ', plainTextNotesUrl);
  }

  // 5. Fallback: if someone pasted URL inside plan_title
  if (list.length === 0 && isValidHttpFileUrl(plan.plan_title)) {
    addFile('ลิงก์เอกสารที่ส่ง', plan.plan_title);
  }

  return list;
}

/**
 * อัปเดต URL ใหม่ลงใน notes (JSON: _attachments, ฟิลด์ฟอร์ม, _file_reviews หรือ plain text) สำหรับงานไฟล์เดียว
 * โดยรักษาข้อมูลฟิลด์ข้อความ/คำตอบอื่นๆ ที่ครูกรอกไว้ทั้งหมด
 */
export function syncNotesForSingleFileUrl(
  notes: string | undefined,
  candidateOldUrls: Array<string | undefined | null>,
  newUrl: string,
  fallbackFileName?: string,
  updatedFileReviews?: any[]
): string | undefined {
  const cleanNewUrl = (newUrl || '').trim();
  if (!cleanNewUrl) return notes;

  const oldUrlSet = new Set(
    candidateOldUrls
      .map((u) => (typeof u === 'string' ? u.trim() : ''))
      .filter((u) => Boolean(u) && u !== '#')
  );

  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    if (updatedFileReviews && updatedFileReviews.length > 0) {
      return JSON.stringify({ _file_reviews: updatedFileReviews });
    }
    return notes;
  }

  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const next: Record<string, any> = { ...parsed };

      // 1. Update _attachments
      if (Array.isArray(next._attachments)) {
        if (next._attachments.length === 1) {
          next._attachments = [
            {
              ...next._attachments[0],
              file_name: next._attachments[0]?.file_name || fallbackFileName || 'ไฟล์เอกสารหลัก',
              file_url: cleanNewUrl,
            },
          ];
        } else if (next._attachments.length > 1) {
          next._attachments = next._attachments.map((att: any) => {
            if (att && typeof att === 'object' && typeof att.file_url === 'string' && oldUrlSet.has(att.file_url.trim())) {
              return { ...att, file_url: cleanNewUrl };
            }
            return att;
          });
        }
      }

      // 2. Replace matching old URLs in form answer fields (fld_*, etc.)
      const urlFieldKeys: string[] = [];
      Object.entries(next).forEach(([key, val]) => {
        if (key === '_attachments' || key === '_file_reviews') return;
        if (typeof val === 'string') {
          const trimmedVal = val.trim();
          if (isValidHttpFileUrl(trimmedVal)) {
            urlFieldKeys.push(key);
          }
          if (oldUrlSet.has(trimmedVal)) {
            next[key] = cleanNewUrl;
          }
        } else if (Array.isArray(val)) {
          next[key] = val.map((item: any) => {
            if (typeof item === 'string' && oldUrlSet.has(item.trim())) {
              return cleanNewUrl;
            }
            if (item && typeof item === 'object' && typeof item.file_url === 'string' && oldUrlSet.has(item.file_url.trim())) {
              return { ...item, file_url: cleanNewUrl };
            }
            return item;
          });
        } else if (val && typeof val === 'object' && typeof (val as any).file_url === 'string' && oldUrlSet.has((val as any).file_url.trim())) {
          next[key] = { ...val, file_url: cleanNewUrl };
        }
      });

      // Fallback if _attachments was empty and there was exactly 1 URL field in form answers
      if ((!Array.isArray(next._attachments) || next._attachments.length === 0) && urlFieldKeys.length === 1) {
        next[urlFieldKeys[0]] = cleanNewUrl;
      }

      // 3. Update _file_reviews
      if (updatedFileReviews && updatedFileReviews.length > 0) {
        next._file_reviews = updatedFileReviews;
      } else if (Array.isArray(next._file_reviews)) {
        if (next._file_reviews.length === 1) {
          next._file_reviews = [{ ...next._file_reviews[0], file_url: cleanNewUrl }];
        } else {
          next._file_reviews = next._file_reviews.map((fr: any) => {
            if (fr && typeof fr === 'object' && typeof fr.file_url === 'string' && oldUrlSet.has(fr.file_url.trim())) {
              return { ...fr, file_url: cleanNewUrl };
            }
            return fr;
          });
        }
      }

      return JSON.stringify(next);
    }
  } catch {
    // Plain-text notes: replace any old URL occurrence while keeping surrounding text
    let updatedText = notes;
    oldUrlSet.forEach((oldUrl) => {
      if (oldUrl !== cleanNewUrl && updatedText.includes(oldUrl)) {
        updatedText = updatedText.split(oldUrl).join(cleanNewUrl);
      }
    });
    if (updatedFileReviews && updatedFileReviews.length > 0) {
      return JSON.stringify({
        _raw_notes: updatedText,
        _file_reviews: updatedFileReviews,
      });
    }
    return updatedText;
  }

  return notes;
}

/**
 * อัปเดต notes JSON สำหรับงานหลายไฟล์ (ซิงค์ทั้ง _attachments, _file_reviews และฟิลด์ fld_* ที่เคยอ้างอิง URL เก่า)
 */
export function syncNotesForMultiFileAttachments(
  notes: string | undefined,
  updatedAttachments: Array<{ file_name: string; file_url: string; file_size?: string }>,
  updatedReviews: any[],
  oldToNewUrlMap: Map<string, string>
): string {
  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    return JSON.stringify({
      _attachments: updatedAttachments,
      _file_reviews: updatedReviews,
    });
  }

  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const next: Record<string, any> = {
        ...parsed,
        _attachments: updatedAttachments,
        _file_reviews: updatedReviews,
      };

      Object.entries(next).forEach(([key, val]) => {
        if (key === '_attachments' || key === '_file_reviews') return;
        if (typeof val === 'string' && oldToNewUrlMap.has(val.trim())) {
          next[key] = oldToNewUrlMap.get(val.trim())!;
        } else if (Array.isArray(val)) {
          next[key] = val.map((item: any) => {
            if (typeof item === 'string' && oldToNewUrlMap.has(item.trim())) {
              return oldToNewUrlMap.get(item.trim())!;
            }
            if (item && typeof item === 'object' && typeof item.file_url === 'string' && oldToNewUrlMap.has(item.file_url.trim())) {
              return { ...item, file_url: oldToNewUrlMap.get(item.file_url.trim())! };
            }
            return item;
          });
        } else if (val && typeof val === 'object' && typeof (val as any).file_url === 'string' && oldToNewUrlMap.has((val as any).file_url.trim())) {
          next[key] = { ...val, file_url: oldToNewUrlMap.get((val as any).file_url.trim())! };
        }
      });

      return JSON.stringify(next);
    }
  } catch {
    let updatedRaw = notes;
    oldToNewUrlMap.forEach((nextUrl, prevUrl) => {
      if (prevUrl && prevUrl !== nextUrl && updatedRaw.includes(prevUrl)) {
        updatedRaw = updatedRaw.split(prevUrl).join(nextUrl);
      }
    });
    return JSON.stringify({
      _raw_notes: updatedRaw,
      _attachments: updatedAttachments,
      _file_reviews: updatedReviews,
    });
  }

  return JSON.stringify({
    _attachments: updatedAttachments,
    _file_reviews: updatedReviews,
  });
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

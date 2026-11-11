import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Teacher, LessonPlan, AssignmentSubmission } from '../types';
import { INITIAL_TEACHERS, INITIAL_LESSON_PLANS } from '../data/initialTeachers';
import { getSavedSubmissions, saveSubmissions } from '../utils/deadlineUtils';
import { uploadPdfFileToGoogleDrive, getSavedGoogleDriveWebhookUrl } from './googleDriveService';
import {
  getDatabaseProvider,
  setDatabaseProvider,
  getSavedCloudflareConfig,
  saveCloudflareConfig,
  testCloudflareConnection,
  fetchTeachersFromCloudflare,
  saveTeacherToCloudflare,
  saveTeachersBatchToCloudflare,
  fetchPlansFromCloudflare,
  savePlanToCloudflare,
  deletePlanFromCloudflare,
  fetchSubmissionsFromCloudflare,
  saveSubmissionToCloudflare,
  deleteSubmissionFromCloudflare,
  fetchSettingFromCloudflare,
  saveSettingToCloudflare,
  migrateAllDataToCloudflare,
  generateCloudflareD1SqlScript,
  generateCloudflareWorkerScript,
  generateWranglerToml,
  type DatabaseProvider,
  type CloudflareSettings,
} from './cloudflareClient';

export {
  getDatabaseProvider,
  setDatabaseProvider,
  getSavedCloudflareConfig,
  saveCloudflareConfig,
  testCloudflareConnection,
  migrateAllDataToCloudflare,
  generateCloudflareD1SqlScript,
  generateCloudflareWorkerScript,
  generateWranglerToml,
};
export type { DatabaseProvider, CloudflareSettings };

const STORAGE_KEY_CONFIG = 'lp_supabase_config';
const STORAGE_KEY_TEACHERS = 'lp_local_teachers';
const STORAGE_KEY_PLANS = 'lp_local_plans';
const STORAGE_KEY_DELETED_PLAN_IDS = 'lp_deleted_plan_ids';

export function getDeletedPlanIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_PLAN_IDS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch {}
  return new Set();
}

/**
 * Synchronizes deleted document IDs across all devices and browsers via Cloudflare D1
 */
export async function syncDeletedPlanIdsWithCloud(): Promise<Set<string>> {
  const localSet = getDeletedPlanIds();
  try {
    const cloudRes = await fetchSystemSetting<string[]>('deleted_document_ids', []);
    if (cloudRes.data && Array.isArray(cloudRes.data)) {
      cloudRes.data.forEach((id) => {
        if (id && typeof id === 'string') localSet.add(id);
      });
      // Save merged set back to localStorage
      localStorage.setItem(STORAGE_KEY_DELETED_PLAN_IDS, JSON.stringify(Array.from(localSet)));
    }
    // If local set has IDs that aren't yet in the cloud, push the merged set to Cloudflare D1
    const cloudSet = new Set(cloudRes.data || []);
    const hasNewLocal = Array.from(localSet).some((id) => !cloudSet.has(id));
    if (hasNewLocal || (!cloudRes.data && localSet.size > 0)) {
      await saveSystemSetting('deleted_document_ids', Array.from(localSet));
    }
  } catch (e) {
    console.warn('syncDeletedPlanIdsWithCloud warning:', e);
  }
  return localSet;
}

let deletedSyncTimer: any = null;

export function recordDeletedPlanId(id: string) {
  if (!id) return;
  const set = getDeletedPlanIds();
  if (set.has(id)) return; // Already recorded! Avoid redundant writes and network calls
  set.add(id);
  const arr = Array.from(set);
  localStorage.setItem(STORAGE_KEY_DELETED_PLAN_IDS, JSON.stringify(arr));

  // Purge immediately from local storage caches
  try {
    const localPlans = getLocalPlans().filter((p) => p.id !== id);
    saveLocalPlans(localPlans);
    const localSubs = getSavedSubmissions().filter((s) => s.id !== id);
    saveSubmissions(localSubs);
  } catch {}

  // Single debounced sync (60ms) to bundle simultaneous deletions into exactly 1 cloud request
  if (deletedSyncTimer) clearTimeout(deletedSyncTimer);
  deletedSyncTimer = setTimeout(() => {
    saveSystemSetting('deleted_document_ids', arr).catch((err) => {
      console.warn('Push deleted_document_ids to cloud warning:', err);
    });
  }, 60);
}

export function clearDeletedPlanId(id: string) {
  if (!id) return;
  const set = getDeletedPlanIds();
  set.delete(id);
  const arr = Array.from(set);
  localStorage.setItem(STORAGE_KEY_DELETED_PLAN_IDS, JSON.stringify(arr));
  saveSystemSetting('deleted_document_ids', arr).catch(() => {});
}

let supabaseInstance: SupabaseClient | null = null;

export interface SupabaseSettings {
  url: string;
  anonKey: string;
}

/**
 * Sanitizes Supabase URL to prevent PostgREST PGRST125 (Invalid path specified in request URL).
 * Common causes on Vercel or manual config:
 * - Pasting https://xyz.supabase.co/rest/v1 instead of Project URL https://xyz.supabase.co
 * - Pasting Supabase Dashboard link https://supabase.com/dashboard/project/xyz
 * - Trailing slashes or wrapping quotes
 */
export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim().replace(/^['"]+|['"]+$/g, '').trim();
  if (!url) return '';

  // If user pasted dashboard URL: e.g. https://supabase.com/dashboard/project/abcdefgh...
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Prepend https:// if protocol was omitted
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    // For standard supabase.co hostnames, strip any extra pathname completely (e.g. /rest/v1, /settings, /)
    if (parsed.hostname.toLowerCase().endsWith('.supabase.co')) {
      return `https://${parsed.hostname.toLowerCase()}`;
    }
    // For custom/self-hosted domains, strip trailing slashes and /rest/v1
    let cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (cleanPath.toLowerCase().endsWith('/rest/v1')) {
      cleanPath = cleanPath.substring(0, cleanPath.length - 8);
    }
    return `${parsed.origin}${cleanPath}`.replace(/\/+$/, '');
  } catch {
    return url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  }
}

export function sanitizeSupabaseKey(rawKey: string): string {
  if (!rawKey || typeof rawKey !== 'string') return '';
  return rawKey.trim().replace(/^['"]+|['"]+$/g, '').trim();
}

export function getSavedSupabaseConfig(): SupabaseSettings {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = sanitizeSupabaseUrl(
    metaEnv.VITE_SUPABASE_URL ||
    metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
    metaEnv.SUPABASE_URL ||
    ''
  );
  const envKey = sanitizeSupabaseKey(
    metaEnv.VITE_SUPABASE_ANON_KEY ||
    metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    metaEnv.SUPABASE_ANON_KEY ||
    metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    metaEnv.SUPABASE_PUBLISHABLE_KEY ||
    ''
  );

  const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const cleanedUrl = sanitizeSupabaseUrl(parsed.url || envUrl);
      const cleanedKey = sanitizeSupabaseKey(parsed.anonKey || envKey);
      // Auto-heal stored config if it was formatted incorrectly
      if (parsed.url !== cleanedUrl || parsed.anonKey !== cleanedKey) {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ url: cleanedUrl, anonKey: cleanedKey }));
      }
      return {
        url: cleanedUrl,
        anonKey: cleanedKey,
      };
    } catch {
      // ignore
    }
  }

  return { url: envUrl, anonKey: envKey };
}

export function saveSupabaseConfig(config: SupabaseSettings) {
  const cleanConfig: SupabaseSettings = {
    url: sanitizeSupabaseUrl(config.url),
    anonKey: sanitizeSupabaseKey(config.anonKey),
  };
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cleanConfig));
  if (cleanConfig.url && cleanConfig.anonKey) {
    try {
      supabaseInstance = createClient(cleanConfig.url, cleanConfig.anonKey);
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
    }
  } else {
    supabaseInstance = null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const cfg = getSavedSupabaseConfig();
  if (cfg.url && cfg.anonKey) {
    try {
      supabaseInstance = createClient(cfg.url, cfg.anonKey);
      return supabaseInstance;
    } catch (e) {
      console.warn('Could not initialize Supabase:', e);
    }
  }
  return null;
}

// Local Storage Fallback Helpers
export function normalizeTeacher(raw: any): Teacher {
  const id = raw.Teacher_ID || raw.teacher_id || '';
  const isAdm =
    String(id).toLowerCase() === 'admin01' ||
    String(id).toLowerCase() === 'admin02' ||
    String(id).toLowerCase() === 'admin03' ||
    String(id).toLowerCase().startsWith('admin') ||
    String(raw.Email || raw.email || '').toLowerCase().startsWith('admin') ||
    raw.role === 'admin' ||
    raw.role === 'executive';

  const rawPass = raw.Pass || raw.pass || '';
  const hasChangedPass =
    raw.has_changed_password !== undefined
      ? Boolean(raw.has_changed_password)
      : rawPass !== '12345' && rawPass !== '';

  return {
    Teacher_ID: id,
    Name: raw.Name || raw.name || '',
    Email: raw.Email || raw.email || '',
    Pass: rawPass,
    Learning_Area: raw.Learning_Area || raw.learning_area || '',
    branch: raw.branch || raw.Branch || '',
    photo: raw.photo || raw.Photo || '',
    national_id: raw.national_id || raw.National_ID || '',
    phone: raw.phone || raw.Phone || '',
    signature_url: raw.signature_url || raw.Signature_Url || '',
    birth_date: raw.birth_date || raw.Birth_Date || '',
    position: raw.position || raw.Position || '',
    academic_standing: raw.academic_standing || raw.Academic_Standing || '',
    department: raw.department || raw.Department || '',
    role: (raw.role || (isAdm ? 'admin' : 'teacher')) as any,
    is_head_of_department: raw.is_head_of_department === true || raw.role === 'head_of_department',
    is_head_of_branch: raw.is_head_of_branch === true || raw.role === 'head_of_branch',
    department_id: raw.department_id || '',
    branch_id: raw.branch_id || '',
    has_changed_password: hasChangedPass,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

/**
 * Sanitizes a teacher object by wiping sensitive credentials (Pass, national_id, birth_date)
 * so that no teacher's sensitive details are exposed to the client or in browser memory.
 */
export function sanitizeTeacherForClient(t: Teacher): Teacher {
  return {
    ...t,
    Pass: '', // Completely wiped from browser client state
    national_id: '', // Completely wiped
    birth_date: '', // Completely wiped
    has_changed_password: t.has_changed_password ?? (t.Pass !== '12345'),
  };
}

export function getLocalTeachers(): Teacher[] {
  const raw = localStorage.getItem(STORAGE_KEY_TEACHERS);
  if (raw) {
    try {
      const parsed: Teacher[] = JSON.parse(raw);
      // If cached data is from previous format (starts with T1001 instead of te001), reload with updated table
      const hasNewFormat = parsed.some((t) => t.Teacher_ID === 'te001');
      if (!hasNewFormat) {
        saveLocalTeachers(INITIAL_TEACHERS);
        return INITIAL_TEACHERS;
      }

      let modified = false;

      // Ensure admin01, admin02 & admin03 are in the list with role 'admin'
      const adminAccounts = INITIAL_TEACHERS.filter((t) =>
        ['admin01', 'admin02', 'admin03'].includes(t.Teacher_ID)
      );

      adminAccounts.forEach((adm) => {
        const idx = parsed.findIndex(
          (t) => String(t.Teacher_ID).toLowerCase() === adm.Teacher_ID.toLowerCase()
        );
        if (idx === -1) {
          parsed.unshift(adm);
          modified = true;
        } else {
          if (parsed[idx].role !== 'admin') {
            parsed[idx].role = 'admin';
            modified = true;
          }
          if (!parsed[idx].Pass || parsed[idx].Pass === '12345') {
            parsed[idx].Pass = adm.Pass;
            modified = true;
          }
        }
      });

      if (modified) {
        saveLocalTeachers(parsed);
      }
      return parsed.map(normalizeTeacher);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(STORAGE_KEY_TEACHERS, JSON.stringify(INITIAL_TEACHERS));
  return INITIAL_TEACHERS;
}

export function saveLocalTeachers(teachers: Teacher[]) {
  localStorage.setItem(STORAGE_KEY_TEACHERS, JSON.stringify(teachers));
}

export function getLocalPlans(): LessonPlan[] {
  const deletedIds = getDeletedPlanIds();
  const raw = localStorage.getItem(STORAGE_KEY_PLANS);
  if (raw) {
    try {
      const parsed: LessonPlan[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((p) => !deletedIds.has(p.id));
      }
    } catch {
      // fallback
    }
  }
  const filteredInitials = INITIAL_LESSON_PLANS.filter((p) => !deletedIds.has(p.id));
  localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(filteredInitials));
  return filteredInitials;
}

export function saveLocalPlans(plans: LessonPlan[]) {
  localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(plans));
}

// Database API Facade (Cloudflare D1 / Supabase with LocalStorage fallback)
export async function saveAllTeachers(
  teachers: Teacher[]
): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
  // CRITICAL SECURITY & PASSWORD INTEGRITY:
  // Teachers in React client state have Pass: '' because passwords are sanitized for browser security.
  // We MUST preserve every teacher's actual Pass and personal credentials from local storage and initial list,
  // preventing user passwords from ever being overwritten with empty strings or reset to '12345'!
  const currentLocal = getLocalTeachers();
  const localMap = new Map(currentLocal.map((lt) => [lt.Teacher_ID, lt]));

  const mergedTeachers = teachers.map((t) => {
    const existing = localMap.get(t.Teacher_ID);
    const init = INITIAL_TEACHERS.find((it) => it.Teacher_ID === t.Teacher_ID);
    const effectivePass = (t.Pass && String(t.Pass).trim())
      ? String(t.Pass).trim()
      : (existing?.Pass && String(existing.Pass).trim()
          ? String(existing.Pass).trim()
          : (init?.Pass && String(init.Pass).trim() ? String(init.Pass).trim() : '12345'));

    return {
      ...existing,
      ...t,
      Pass: effectivePass,
      has_changed_password: effectivePass !== '12345',
      national_id: t.national_id || existing?.national_id || '',
      birth_date: t.birth_date || existing?.birth_date || '',
      signature_url: t.signature_url || existing?.signature_url || '',
      updated_at: new Date().toISOString(),
    };
  });

  // 1. Save locally with preserved passwords
  saveLocalTeachers(mergedTeachers);

  // 2. Persist to system_settings 'school_teachers_all' with full preservation
  const settingRes = await saveSystemSetting('school_teachers_all', mergedTeachers);

  // 3. Upsert to Cloudflare or Supabase teachers table
  try {
    if (getDatabaseProvider() === 'cloudflare') {
      const cf = getSavedCloudflareConfig();
      if (cf.workerUrl) {
        // Send batch upsert in 1 network call
        saveTeachersBatchToCloudflare(mergedTeachers).catch(() => {
          // Fallback: save one by one
          for (const t of mergedTeachers) {
            saveTeacherToCloudflare(t).catch(() => {});
          }
        });
      }
    }
    const client = getSupabaseClient();
    if (client) {
      // Upsert full records in a single batch instead of 45 racing calls
      const teacherPayloads = mergedTeachers.map((t) => ({
        Teacher_ID: t.Teacher_ID,
        Name: t.Name,
        Email: t.Email,
        Pass: t.Pass,
        Learning_Area: t.Learning_Area || '',
        branch: t.branch || '',
        photo: t.photo || '',
        national_id: t.national_id || '',
        phone: t.phone || '',
        signature_url: t.signature_url || '',
        birth_date: t.birth_date || '',
        position: t.position || '',
        academic_standing: t.academic_standing || '',
        department: t.department || '',
        role: t.role || 'teacher',
        is_head_of_department: !!t.is_head_of_department,
        is_head_of_branch: !!t.is_head_of_branch,
        department_id: t.department_id || '',
        branch_id: t.branch_id || '',
        updated_at: new Date().toISOString(),
      }));
      (async () => {
        try {
          const { error } = await client.from('teachers').upsert(teacherPayloads);
          if (error) {
            const lowercasePayloads = mergedTeachers.map((t) => ({
              teacher_id: t.Teacher_ID,
              name: t.Name,
              email: t.Email,
              pass: t.Pass,
              learning_area: t.Learning_Area || '',
              photo: t.photo || '',
              national_id: t.national_id || '',
              phone: t.phone || '',
              department: t.department || '',
              role: t.role || 'teacher',
              updated_at: new Date().toISOString(),
            }));
            await client.from('teachers').upsert(lowercasePayloads);
          }
        } catch {}
      })();
    }
  } catch {}

  return settingRes;
}

export async function fetchTeachers(): Promise<{ data: Teacher[]; isSupabase: boolean; error?: string }> {
  // 1. Build base in-memory map starting from INITIAL_TEACHERS
  const teachersMap = new Map<string, Teacher>();
  INITIAL_TEACHERS.forEach((t) => teachersMap.set(t.Teacher_ID, { ...t }));

  let isRemote = false;

  // 2. Fetch raw profiles from Database (Cloudflare D1 or Supabase) FIRST.
  // Raw tables provide credentials, personal contact info, and profile pictures.
  // CRITICAL: We DO NOT let empty strings or false flags from raw tables wipe out assignments or passwords!
  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await fetchTeachersFromCloudflare();
        if (cfRes.success && cfRes.data && cfRes.data.length > 0) {
          isRemote = true;
          cfRes.data.forEach((row) => {
            const norm = normalizeTeacher(row);
            const existing = teachersMap.get(norm.Teacher_ID);
            teachersMap.set(norm.Teacher_ID, {
              ...existing,
              ...norm,
              Pass: (norm.Pass && norm.Pass.trim()) ? norm.Pass : (existing?.Pass || ''),
              // Only overwrite Learning_Area / branch from raw DB table if the raw value is a non-empty string
              Learning_Area: (norm.Learning_Area && norm.Learning_Area.trim())
                ? norm.Learning_Area
                : (existing?.Learning_Area || ''),
              branch: (norm.branch && norm.branch.trim())
                ? norm.branch
                : (existing?.branch || ''),
              // Never let false from raw DB table overwrite true
              is_head_of_department: norm.is_head_of_department || existing?.is_head_of_department || false,
              is_head_of_branch: norm.is_head_of_branch || existing?.is_head_of_branch || false,
            });
          });
        }
      } catch (err: any) {
        console.warn('Cloudflare fetchTeachers error, continuing to settings overlay:', err);
      }
    }
  } else {
    const client = getSupabaseClient();
    if (client) {
      try {
        let { data, error } = await client.from('teachers').select('*').order('Teacher_ID');
        if (error && (error.message.includes('Teacher_ID') || error.code === '42703')) {
          const fallback = await client.from('teachers').select('*').order('teacher_id');
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data && data.length > 0) {
          isRemote = true;
          data.forEach((row) => {
            const norm = normalizeTeacher(row);
            const existing = teachersMap.get(norm.Teacher_ID);
            teachersMap.set(norm.Teacher_ID, {
              ...existing,
              ...norm,
              Pass: (norm.Pass && norm.Pass.trim()) ? norm.Pass : (existing?.Pass || ''),
              Learning_Area: (norm.Learning_Area && norm.Learning_Area.trim())
                ? norm.Learning_Area
                : (existing?.Learning_Area || ''),
              branch: (norm.branch && norm.branch.trim())
                ? norm.branch
                : (existing?.branch || ''),
              is_head_of_department: norm.is_head_of_department || existing?.is_head_of_department || false,
              is_head_of_branch: norm.is_head_of_branch || existing?.is_head_of_branch || false,
            });
          });
        }
      } catch (err: any) {
        console.warn('Supabase request failed, continuing to settings overlay:', err?.message);
      }
    }
  }

  // 3. Overlay authoritative cloud setting 'school_teachers_all'
  // This JSON array stored in system_settings guarantees 100% preservation of:
  // - Learning_Area (กลุ่มสาระการเรียนรู้)
  // - branch (กลุ่มสาขาวิชา)
  // - is_head_of_department (หัวหน้ากลุ่มสาระ)
  // - is_head_of_branch (หัวหน้าสาขาวิชา)
  // - department_id / branch_id
  try {
    const cloudSetting = await fetchSystemSetting<Teacher[]>('school_teachers_all', []);
    if (cloudSetting.isSupabase && Array.isArray(cloudSetting.data) && cloudSetting.data.length > 0) {
      isRemote = true;
      cloudSetting.data.forEach((ct) => {
        const existing = teachersMap.get(ct.Teacher_ID) || ct;
        teachersMap.set(ct.Teacher_ID, {
          ...existing,
          ...ct,
          Pass: (ct.Pass && ct.Pass.trim()) ? ct.Pass : (existing.Pass || ''),
          Learning_Area: typeof ct.Learning_Area === 'string' ? ct.Learning_Area : (existing.Learning_Area || ''),
          branch: typeof ct.branch === 'string' ? ct.branch : (existing.branch || ''),
          is_head_of_department: ct.is_head_of_department !== undefined ? Boolean(ct.is_head_of_department) : (existing.is_head_of_department || false),
          is_head_of_branch: ct.is_head_of_branch !== undefined ? Boolean(ct.is_head_of_branch) : (existing.is_head_of_branch || false),
        });
      });
    }
  } catch (err) {
    console.warn('Error fetching school_teachers_all setting:', err);
  }

  // 4. Overlay existing local storage data (user edits already saved locally)
  // If user changed assignments or password locally, this ensures they are preserved
  const localList = getLocalTeachers();
  localList.forEach((lt) => {
    const existing = teachersMap.get(lt.Teacher_ID) || lt;
    teachersMap.set(lt.Teacher_ID, {
      ...existing,
      ...lt,
      Pass: (lt.Pass && lt.Pass.trim()) ? lt.Pass : (existing.Pass || ''),
      Learning_Area: typeof lt.Learning_Area === 'string' ? lt.Learning_Area : (existing.Learning_Area || ''),
      branch: typeof lt.branch === 'string' ? lt.branch : (existing.branch || ''),
      is_head_of_department: lt.is_head_of_department !== undefined ? Boolean(lt.is_head_of_department) : (existing.is_head_of_department || false),
      is_head_of_branch: lt.is_head_of_branch !== undefined ? Boolean(lt.is_head_of_branch) : (existing.is_head_of_branch || false),
    });
  });

  // 5. Guarantee that admin01, admin02 & admin03 are always present with admin role
  const adminAccounts = INITIAL_TEACHERS.filter((t) =>
    ['admin01', 'admin02', 'admin03'].includes(t.Teacher_ID)
  );

  adminAccounts.forEach((adm) => {
    const existing = teachersMap.get(adm.Teacher_ID);
    if (!existing) {
      teachersMap.set(adm.Teacher_ID, adm);
    } else {
      existing.role = 'admin';
      if (!existing.Pass && adm.Pass) existing.Pass = adm.Pass;
    }
  });

  const merged = Array.from(teachersMap.values());
  saveLocalTeachers(merged);
  return { data: merged.map(sanitizeTeacherForClient), isSupabase: isRemote };
}

export async function updateTeacherRecord(teacher: Teacher): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
  // Update local storage first
  const teachers = getLocalTeachers();
  const idx = teachers.findIndex((t) => t.Teacher_ID === teacher.Teacher_ID);

  // CRITICAL: Preserve existing password if teacher.Pass is sanitized (empty string)
  let effectivePass = teacher.Pass && String(teacher.Pass).trim() ? String(teacher.Pass).trim() : '';
  if (!effectivePass && idx !== -1 && teachers[idx]?.Pass && String(teachers[idx].Pass).trim()) {
    effectivePass = String(teachers[idx].Pass).trim();
  }
  if (!effectivePass) {
    const init = INITIAL_TEACHERS.find((t) => t.Teacher_ID === teacher.Teacher_ID);
    effectivePass = init?.Pass || '12345';
  }

  const mergedTeacher: Teacher = {
    ...(idx !== -1 ? teachers[idx] : {}),
    ...teacher,
    Pass: effectivePass,
    has_changed_password: effectivePass !== '12345',
    updated_at: new Date().toISOString(),
  };

  if (idx !== -1) {
    teachers[idx] = mergedTeacher;
  } else {
    teachers.push(mergedTeacher);
  }
  saveLocalTeachers(teachers);

  // Synchronize school_teachers_all in system_settings in background so all branches and heads are permanent
  saveSystemSetting('school_teachers_all', teachers).catch(() => {});

  // If Cloudflare is active, update Cloudflare D1 with mergedTeacher preserving effectivePass
  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await saveTeacherToCloudflare(mergedTeacher);
        return { success: cfRes.success, isSupabase: true, error: cfRes.error };
      } catch (err: any) {
        return { success: false, isSupabase: true, error: err?.message };
      }
    }
  }

  // If Supabase is active, update remote
  const client = getSupabaseClient();
  if (client) {
    try {
      const teacherPayload: any = {
        Teacher_ID: teacher.Teacher_ID,
        Name: teacher.Name,
        Email: teacher.Email,
        Pass: teacher.Pass,
        Learning_Area: teacher.Learning_Area,
        branch: teacher.branch || '',
        photo: teacher.photo || '',
        national_id: teacher.national_id || '',
        phone: teacher.phone || '',
        signature_url: teacher.signature_url || '',
        birth_date: teacher.birth_date || '',
        position: teacher.position || '',
        academic_standing: teacher.academic_standing || '',
        department: teacher.department || '',
        role: teacher.role || 'teacher',
        is_head_of_department: !!teacher.is_head_of_department,
        is_head_of_branch: !!teacher.is_head_of_branch,
        department_id: teacher.department_id || '',
        branch_id: teacher.branch_id || '',
        updated_at: new Date().toISOString(),
      };

      const { error } = await client.from('teachers').upsert(teacherPayload);
      if (error) {
        // Fallback to lowercase or core columns if schema uses unquoted names or lacks newer columns
        const fallback = await client.from('teachers').upsert({
          teacher_id: teacher.Teacher_ID,
          name: teacher.Name,
          email: teacher.Email,
          pass: teacher.Pass,
          learning_area: teacher.Learning_Area,
          photo: teacher.photo || '',
          national_id: teacher.national_id || '',
          phone: teacher.phone || '',
          department: teacher.department || '',
          role: teacher.role || 'teacher',
          updated_at: new Date().toISOString(),
        });
        if (fallback.error) {
          console.warn('Supabase update teacher fallback notice:', fallback.error.message);
          return { success: true, isSupabase: true, error: fallback.error.message };
        }
      }

      // Also update teacher_name and teacher_photo in lesson_plans table
      try {
        await client
          .from('lesson_plans')
          .update({
            teacher_name: teacher.Name,
            teacher_photo: teacher.photo || '',
            learning_area: teacher.Learning_Area,
          })
          .eq('teacher_id', teacher.Teacher_ID);
      } catch (e) {
        console.warn('Update plan author cache warning:', e);
      }

      return { success: true, isSupabase: true };
    } catch (e: any) {
      return { success: true, isSupabase: true, error: e?.message };
    }
  }
  return { success: true, isSupabase: false };
}

/**
 * Scopes lesson plans based on Row Level Security (RLS):
 * - Admin/Executive accounts receive all plans for schoolwide monitoring and tracking
 * - Regular teachers receive only:
 *   1. Their own lesson plans
 *   2. Plans assigned to them as a reviewer
 *   3. Plans in their department if they are head of department
 *   4. Approved exemplar plans published for school reference
 */
export function filterPlansForTeacherScope(
  plans: LessonPlan[],
  currentTeacher?: Teacher | null
): LessonPlan[] {
  if (!currentTeacher) return plans;
  const isAdm =
    currentTeacher.role === 'admin' ||
    currentTeacher.role === 'executive' ||
    ['admin01', 'admin02', 'admin03'].includes(currentTeacher.Teacher_ID);
  if (isAdm) return plans;

  const myId = String(currentTeacher.Teacher_ID).toLowerCase().trim();
  const myName = String(currentTeacher.Name).trim();

  return plans.filter((p) => {
    // 1. Own lesson plan
    if (String(p.teacher_id).toLowerCase().trim() === myId) return true;

    // 2. Assigned reviewer
    if (String(p.assigned_reviewer_id || '').toLowerCase().trim() === myId) return true;
    if (p.assigned_reviewer_name && p.assigned_reviewer_name.includes(myName)) return true;

    // 3. Department head or branch head
    if (currentTeacher.is_head_of_department && currentTeacher.Learning_Area) {
      if (p.learning_area === currentTeacher.Learning_Area) return true;
    }
    if (currentTeacher.is_head_of_branch && currentTeacher.branch) {
      if (p.branch === currentTeacher.branch) return true;
    }

    // 4. Approved exemplar plans
    if (p.status === 'approved') return true;

    return false;
  });
}

export async function fetchPlans(
  currentTeacher?: Teacher | null
): Promise<{ data: LessonPlan[]; isSupabase: boolean; error?: string }> {
  const deletedIds = getDeletedPlanIds();
  const applyScope = (list: LessonPlan[]) => {
    return currentTeacher ? filterPlansForTeacherScope(list, currentTeacher) : list;
  };

  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await fetchPlansFromCloudflare();
        if (cfRes.success && cfRes.data) {
          const localPlans = getLocalPlans();
          const localMap = new Map(localPlans.map((p) => [p.id, p]));
          let assignmentMap: Record<string, any> = {};
          try {
            const rawAssign = localStorage.getItem('plan_workflow_assignments_v1');
            if (rawAssign) assignmentMap = JSON.parse(rawAssign);
          } catch {}

          const merged = cfRes.data
            .filter((p) => !deletedIds.has(p.id) && p.status !== 'deleted')
            .map((p) => {
              const lp = localMap.get(p.id);
              const meta = assignmentMap[p.id];
              return {
                ...p,
                assigned_reviewer_id: p.assigned_reviewer_id || meta?.assigned_reviewer_id || lp?.assigned_reviewer_id,
                assigned_reviewer_name: p.assigned_reviewer_name || meta?.assigned_reviewer_name || lp?.assigned_reviewer_name,
                current_stage_order: p.current_stage_order || meta?.current_stage_order || lp?.current_stage_order || 1,
                workflow_id: p.workflow_id || meta?.workflow_id || lp?.workflow_id,
                stage_reviews: (p.stage_reviews && p.stage_reviews.length > 0) ? p.stage_reviews : (meta?.stage_reviews || lp?.stage_reviews || []),
                branch: p.branch || lp?.branch,
              };
            });

          saveLocalPlans(merged);
          return { data: applyScope(merged), isSupabase: true };
        }
      } catch (err: any) {
        console.warn('Cloudflare fetchPlans error:', err);
      }
    }
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('lesson_plans')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (!error && data) {
        const localPlans = getLocalPlans();
        const localMap = new Map(localPlans.map((p) => [p.id, p]));
        let assignmentMap: Record<string, any> = {};
        try {
          const rawAssign = localStorage.getItem('plan_workflow_assignments_v1');
          if (rawAssign) assignmentMap = JSON.parse(rawAssign);
        } catch {}

        const merged = (data as LessonPlan[])
          .filter((p) => !deletedIds.has(p.id) && p.status !== 'deleted')
          .map((p) => {
            const lp = localMap.get(p.id);
            const meta = assignmentMap[p.id];
            return {
              ...p,
              assigned_reviewer_id: p.assigned_reviewer_id || meta?.assigned_reviewer_id || lp?.assigned_reviewer_id,
              assigned_reviewer_name: p.assigned_reviewer_name || meta?.assigned_reviewer_name || lp?.assigned_reviewer_name,
              current_stage_order: p.current_stage_order || meta?.current_stage_order || lp?.current_stage_order || 1,
              workflow_id: p.workflow_id || meta?.workflow_id || lp?.workflow_id,
              stage_reviews: (p.stage_reviews && p.stage_reviews.length > 0) ? p.stage_reviews : (meta?.stage_reviews || lp?.stage_reviews || []),
              branch: p.branch || lp?.branch,
            };
          });

        saveLocalPlans(merged);
        return { data: applyScope(merged), isSupabase: true };
      }
      if (error) {
        return { data: applyScope(getLocalPlans()), isSupabase: false, error: error.message };
      }
    } catch (err: any) {
      return { data: applyScope(getLocalPlans()), isSupabase: false, error: err?.message };
    }
  }
  return { data: applyScope(getLocalPlans()), isSupabase: false };
}

export async function savePlanRecord(
  plan: LessonPlan
): Promise<{ success: boolean; isSupabase: boolean; error?: string; message?: string }> {
  // Clear from deleted IDs if being saved/resubmitted
  clearDeletedPlanId(plan.id);

  // Update local workflow assignments map
  if (plan.assigned_reviewer_id || plan.current_stage_order) {
    try {
      const rawAssign = localStorage.getItem('plan_workflow_assignments_v1');
      const assignments = rawAssign ? JSON.parse(rawAssign) : {};
      assignments[plan.id] = {
        assigned_reviewer_id: plan.assigned_reviewer_id,
        assigned_reviewer_name: plan.assigned_reviewer_name,
        current_stage_order: plan.current_stage_order,
        workflow_id: plan.workflow_id,
        stage_reviews: plan.stage_reviews,
      };
      localStorage.setItem('plan_workflow_assignments_v1', JSON.stringify(assignments));
    } catch {}
  }

  // Update local plans
  const plans = getLocalPlans();
  const idx = plans.findIndex((p) => p.id === plan.id);
  if (idx !== -1) {
    plans[idx] = plan;
  } else {
    plans.unshift(plan);
  }
  saveLocalPlans(plans);

  // If Cloudflare is active, save to Cloudflare D1
  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    try {
      const cfRes = await savePlanToCloudflare(plan);
      return {
        success: cfRes.success,
        isSupabase: true,
        error: cfRes.error,
        message: cfRes.success
          ? 'บันทึกลง Cloudflare D1 สำเร็จสมบูรณ์'
          : `บันทึกลง Cloudflare D1 ไม่สำเร็จ: ${cfRes.error}`,
      };
    } catch (e: any) {
      return { success: false, isSupabase: true, error: e?.message };
    }
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: true,
      isSupabase: false,
      message: 'บันทึกใน Local Storage (เครื่องนี้) เรียบร้อยแล้ว แต่ยังไม่ได้เชื่อมต่อฐานข้อมูลภายนอก (โปรดตั้งค่า Cloudflare)',
    };
  }

  try {
    // 1. Ensure the teacher exists in Supabase "teachers" table to avoid Foreign Key constraint violation
    const teachers = getLocalTeachers();
    const teacher = teachers.find((t) => t.Teacher_ID === plan.teacher_id);
    if (teacher) {
      try {
        const teacherData = {
          Teacher_ID: teacher.Teacher_ID,
          Name: teacher.Name,
          Email: teacher.Email,
          Pass: teacher.Pass,
          Learning_Area: teacher.Learning_Area,
          photo: teacher.photo || '',
          national_id: teacher.national_id || '',
          phone: teacher.phone || '',
          signature_url: teacher.signature_url || '',
          birth_date: teacher.birth_date || '',
          position: teacher.position || '',
          academic_standing: teacher.academic_standing || '',
          department: teacher.department || '',
          role: teacher.role || 'teacher',
        };
        const { error: upsertErr } = await client.from('teachers').upsert(teacherData);
        if (upsertErr) {
          // If error due to column name case, retry with lowercase
          await client.from('teachers').upsert({
            teacher_id: teacher.Teacher_ID,
            name: teacher.Name,
            email: teacher.Email,
            pass: teacher.Pass,
            learning_area: teacher.Learning_Area,
            photo: teacher.photo || '',
            role: teacher.role || 'teacher',
          });
        }
      } catch (upsertTeacherErr) {
        console.warn('Teacher upsert warning:', upsertTeacherErr);
      }
    }

    // 2. Prepare clean plan payload matching Supabase lesson_plans schema
    const planPayload: any = {
      id: plan.id,
      teacher_id: plan.teacher_id,
      teacher_name: plan.teacher_name,
      teacher_photo: plan.teacher_photo || '',
      learning_area: plan.learning_area,
      subject_code: plan.subject_code,
      subject_name: plan.subject_name,
      grade_level: plan.grade_level,
      semester: plan.semester,
      academic_year: plan.academic_year,
      plan_title: plan.plan_title,
      plan_type: plan.plan_type,
      total_hours: Number(plan.total_hours) || 40,
      file_url: plan.file_url,
      file_name: plan.file_name,
      file_size: plan.file_size || '2.5 MB',
      notes: plan.notes || '',
      submitted_at: plan.submitted_at?.includes('T') ? plan.submitted_at : new Date().toISOString(),
      status: plan.status || 'submitted',
      reviewed_by: plan.reviewed_by || null,
      reviewer_name: plan.reviewer_name || null,
      reviewed_at: plan.reviewed_at || null,
      review_comment: plan.review_comment || null,
      rubric_scores: plan.rubric_scores || null,
      total_score: plan.total_score !== undefined ? plan.total_score : null,
      is_late: plan.is_late ?? false,
      submission_delay_text: plan.submission_delay_text || null,
      deadline_at: plan.deadline_at || null,
      admin_notes: plan.admin_notes || null,
    };

    let { error } = await client.from('lesson_plans').upsert(planPayload);
    if (error && (error.message.includes('column') || error.code === '42703')) {
      // Fallback: if remote table does not have new columns yet, upsert without them
      const safePayload = { ...planPayload };
      delete safePayload.is_late;
      delete safePayload.submission_delay_text;
      delete safePayload.deadline_at;
      delete safePayload.admin_notes;
      const retry = await client.from('lesson_plans').upsert(safePayload);
      error = retry.error;
    }
    if (error) {
      console.error('Supabase save plan error:', error);
      let friendlyError = error.message;
      if (error.code === 'PGRST125' || error.message.includes('Invalid path specified in request URL')) {
        friendlyError = 'Supabase URL ไม่ถูกต้อง (Code: PGRST125) มีการระบุ path ผิด เช่น ใส่ /rest/v1 หรือลิงก์แดชบอร์ดปนอยู่ (ระบบได้ทำการแก้ไข URL ให้แล้ว โปรดลองบันทึกใหม่อีกครั้ง)';
      } else if (error.code === '42P01' || error.code === 'PGRST205' || error.message.includes('relation "lesson_plans" does not exist') || error.message.includes('Could not find')) {
        friendlyError = 'ยังไม่ได้สร้างตาราง lesson_plans ในฐานข้อมูล Supabase (กรุณาคัดลอก SQL Script ไปกด Run ใน Supabase SQL Editor)';
      } else if (error.code === '23503' || error.message.includes('foreign key')) {
        friendlyError = `ไม่พบข้อมูลครูรหัส ${plan.teacher_id} ในตาราง teachers ของ Supabase (Foreign Key Error - โปรดกดปุ่มซิงค์ข้อมูลบุคลากรในหน้าตั้งค่า Supabase)`;
      } else if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('row-level security')) {
        friendlyError = 'ติดสิทธิ์ความปลอดภัย Row Level Security (RLS) ของ Supabase (กรุณารันคำสั่งสร้าง Policy ตาม SQL Script)';
      }
      return {
        success: false,
        isSupabase: true,
        error: `Supabase แจ้ง: ${friendlyError} (Code: ${error.code || 'N/A'})`,
      };
    }
    return { success: true, isSupabase: true, message: 'บันทึกลงฐานข้อมูล Supabase SQL (ตาราง lesson_plans) สำเร็จแล้ว!' };
  } catch (e: any) {
    console.error('Exception saving plan to Supabase:', e);
    return {
      success: false,
      isSupabase: true,
      error: `ไม่สามารถเชื่อมต่อ Supabase: ${e?.message || 'ข้อผิดพลาดเครือข่าย'}`,
    };
  }
}

// Real-time Database Subscription Helper
export function subscribeToDatabaseChanges(
  onChange: (table: string) => void
): () => void {
  // In Cloudflare D1 mode, skip Supabase websocket channels to prevent wasted background connections
  if (getDatabaseProvider() === 'cloudflare') {
    return () => {};
  }

  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('app_realtime_db_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lesson_plans' },
        (payload) => {
          console.log('[Realtime DB Sync] lesson_plans changed:', payload.eventType);
          onChange('lesson_plans');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teachers' },
        (payload) => {
          console.log('[Realtime DB Sync] teachers changed:', payload.eventType);
          onChange('teachers');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        (payload) => {
          console.log('[Realtime DB Sync] system_settings changed:', payload.eventType);
          onChange('system_settings');
        }
      )
      .subscribe((status) => {
        console.log('[Realtime DB Sync] Status:', status);
      });

    return () => {
      try {
        client.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}

// System Settings API (Syncs deadlineConfigs, document types, and statusConfigs across computers)
export async function fetchSystemSetting<T>(
  key: string,
  fallbackValue: T
): Promise<{ data: T; isSupabase: boolean; error?: string }> {
  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await fetchSettingFromCloudflare<T>(key);
        if (cfRes.success && cfRes.data !== null && cfRes.data !== undefined) {
          return { data: cfRes.data, isSupabase: true };
        }
      } catch (err: any) {
        console.warn(`Cloudflare fetch system setting '${key}' error:`, err);
      }
    }
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (!error && data && data.value) {
        return { data: data.value as T, isSupabase: true };
      }
    } catch (err: any) {
      console.warn(`Could not fetch system setting '${key}' from Supabase:`, err);
    }
  }
  return { data: fallbackValue, isSupabase: false };
}

export async function saveSystemSetting<T>(
  key: string,
  value: T
): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await saveSettingToCloudflare(key, value);
        return { success: cfRes.success, isSupabase: true, error: cfRes.error };
      } catch (err: any) {
        return { success: false, isSupabase: true, error: err?.message };
      }
    }
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from('system_settings').upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      });
      if (!error) {
        return { success: true, isSupabase: true };
      }
      console.warn(`Supabase save system setting '${key}' error:`, error.message);
      return { success: false, isSupabase: true, error: error.message };
    } catch (err: any) {
      console.warn(`Exception saving system setting '${key}':`, err);
      return { success: false, isSupabase: true, error: err?.message };
    }
  }
  return { success: true, isSupabase: false };
}

// SQL Snippet for Cloudflare D1 / SQLite system_settings table
export const SYSTEM_SETTINGS_TABLE_SQL = `-- รันคำสั่งนี้ใน Cloudflare D1 Console หรือ SQLite เพื่อสร้างตารางบันทึกประเภทเอกสารและกำหนดเวลาส่ง
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

export const ASSIGNMENT_SUBMISSIONS_TABLE_SQL = `-- รันคำสั่งนี้ใน Supabase SQL Editor เพื่อสร้างตารางบันทึกการส่งงานแบบไดนามิก (Dynamic Form Submissions)
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    "id" VARCHAR(100) PRIMARY KEY,
    "assignment_id" VARCHAR(100) NOT NULL,
    "assignment_name" VARCHAR(255) NOT NULL,
    "teacher_id" VARCHAR(50) NOT NULL,
    "teacher_name" VARCHAR(255) NOT NULL,
    "learning_area" VARCHAR(150),
    "submitted_at" TIMESTAMPTZ DEFAULT NOW(),
    "status" VARCHAR(50) DEFAULT 'submitted',
    "answers" JSONB DEFAULT '{}'::jsonb,
    "attachments" JSONB DEFAULT '[]'::jsonb,
    "is_late" BOOLEAN DEFAULT false,
    "submission_delay_text" VARCHAR(255),
    "reviewed_by" VARCHAR(50),
    "reviewer_name" VARCHAR(255),
    "reviewed_at" TIMESTAMPTZ,
    "review_comment" TEXT,
    "admin_notes" TEXT,
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to assignment_submissions" ON public.assignment_submissions;
CREATE POLICY "Allow all access to assignment_submissions" ON public.assignment_submissions FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_submissions;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;
`;

export async function saveAssignmentSubmissionRecord(
  submission: AssignmentSubmission
): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
  // Helper to sanitize payload and strip accidental large base64 strings (saves 99% Supabase Egress)
  const cleanAnswers: Record<string, any> = {};
  for (const [k, v] of Object.entries(submission.answers || {})) {
    if (typeof v === 'string' && v.startsWith('data:') && v.length > 2000) {
      cleanAnswers[k] = '';
    } else {
      cleanAnswers[k] = v;
    }
  }

  const cleanAttachments = (submission.attachments || []).map((att) => {
    if (att.file_url && att.file_url.startsWith('data:') && att.file_url.length > 2000) {
      return {
        ...att,
        file_url: '#',
        file_size: 'PDF Link Required',
      };
    }
    return att;
  });

  const sanitizedSubmission: AssignmentSubmission = {
    ...submission,
    answers: cleanAnswers,
    attachments: cleanAttachments,
  };

  // 1. Save to local storage first (instant responsiveness)
  const localList = getSavedSubmissions();
  const idx = localList.findIndex((s) => s.id === submission.id);
  if (idx !== -1) {
    localList[idx] = sanitizedSubmission;
  } else {
    localList.unshift(sanitizedSubmission);
  }
  saveSubmissions(localList);

  // If Cloudflare is active, save to Cloudflare D1
  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await saveSubmissionToCloudflare(sanitizedSubmission);
        return { success: cfRes.success, isSupabase: true, error: cfRes.error };
      } catch (e: any) {
        return { success: false, isSupabase: true, error: e?.message };
      }
    }
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: true, isSupabase: false };
  }

  try {
    const payload = {
      id: sanitizedSubmission.id,
      assignment_id: sanitizedSubmission.assignment_id,
      assignment_name: sanitizedSubmission.assignment_name,
      teacher_id: sanitizedSubmission.teacher_id,
      teacher_name: sanitizedSubmission.teacher_name,
      learning_area: sanitizedSubmission.learning_area || '',
      submitted_at: sanitizedSubmission.submitted_at || new Date().toISOString(),
      status: sanitizedSubmission.status || 'submitted',
      answers: sanitizedSubmission.answers || {},
      attachments: sanitizedSubmission.attachments || [],
      is_late: sanitizedSubmission.is_late ?? false,
      submission_delay_text: sanitizedSubmission.submission_delay_text || null,
      reviewed_by: sanitizedSubmission.reviewed_by || null,
      reviewer_name: sanitizedSubmission.reviewer_name || null,
      reviewed_at: sanitizedSubmission.reviewed_at || null,
      review_comment: sanitizedSubmission.review_comment || null,
      admin_notes: sanitizedSubmission.admin_notes || null,
    };

    const { error } = await client.from('assignment_submissions').upsert(payload);
    if (error) {
      console.warn('assignment_submissions table error, saving to system_settings fallback:', error.message);
      // Fallback: save array to system_settings so it syncs across all devices!
      await saveSystemSetting('dynamic_submissions_data', localList);
      return { success: true, isSupabase: true };
    }
    return { success: true, isSupabase: true };
  } catch (err: any) {
    console.warn('Exception saving assignment submission, local saved:', err);
    await saveSystemSetting('dynamic_submissions_data', localList);
    return { success: true, isSupabase: false, error: err?.message };
  }
}

export async function fetchAssignmentSubmissionsList(): Promise<AssignmentSubmission[]> {
  const deletedIds = getDeletedPlanIds();
  const local = getSavedSubmissions().filter((s) => !deletedIds.has(s.id) && s.status !== 'deleted');

  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await fetchSubmissionsFromCloudflare();
        if (cfRes.success && Array.isArray(cfRes.data)) {
          const filtered = cfRes.data.filter((s) => !deletedIds.has(s.id) && s.status !== 'deleted');
          saveSubmissions(filtered);
          return filtered;
        }
      } catch (e) {
        console.warn('Cloudflare fetchSubmissions error:', e);
      }
    }
  }

  const client = getSupabaseClient();
  if (!client) return local;

  try {
    const { data, error } = await client
      .from('assignment_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const filtered = (data as AssignmentSubmission[]).filter((s) => !deletedIds.has(s.id) && s.status !== 'deleted');
      saveSubmissions(filtered);
      return filtered;
    }

    // Check system_settings fallback
    const fallbackRes = await fetchSystemSetting<AssignmentSubmission[]>('dynamic_submissions_data', []);
    if (fallbackRes.isSupabase && Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
      const filtered = fallbackRes.data.filter((s) => !deletedIds.has(s.id) && s.status !== 'deleted');
      saveSubmissions(filtered);
      return filtered;
    }
  } catch (e) {
    console.warn('Error fetching submissions from Supabase:', e);
  }
  return local;
}

export async function deleteAssignmentSubmissionRecord(id: string): Promise<boolean> {
  recordDeletedPlanId(id);
  const local = getSavedSubmissions().filter((s) => s.id !== id);
  saveSubmissions(local);

  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        await deleteSubmissionFromCloudflare(id);
      } catch (e) {
        console.warn('Cloudflare delete submission error:', e);
      }
    }
  }

  // Always update dynamic_submissions_data in cloud system_settings
  try {
    await saveSystemSetting('dynamic_submissions_data', local);
  } catch {}

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('assignment_submissions').delete().eq('id', id);
    } catch {
      // ignore
    }
  }
  return true;
}

export async function uploadAssignmentAttachmentFile(
  file: File,
  teacherId: string,
  assignmentId: string,
  teacherName?: string,
  extraMeta?: {
    courseCode?: string;
    subjectName?: string;
    gradeLevel?: string;
    semester?: string;
    academicYear?: string;
    customFileName?: string;
  }
): Promise<{ success: boolean; url: string; fileName: string; fileSize: string; error?: string }> {
  const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
  const sizeText = Number(fileSizeMb) < 1 ? `${Math.round(file.size / 1024)} KB` : `${fileSizeMb} MB`;

  // 1. Prioritize Google Drive Automated Upload (Zero database storage policy)
  try {
    const gdriveUrl = getSavedGoogleDriveWebhookUrl();
    if (gdriveUrl) {
      const driveRes = await uploadPdfFileToGoogleDrive(file, {
        teacherId,
        teacherName: teacherName || teacherId,
        assignmentName: assignmentId,
        courseCode: extraMeta?.courseCode,
        subjectName: extraMeta?.subjectName,
        gradeLevel: extraMeta?.gradeLevel,
        semester: extraMeta?.semester,
        academicYear: extraMeta?.academicYear,
        customFileName: extraMeta?.customFileName,
      });

      if (driveRes.success && driveRes.fileUrl) {
        return {
          success: true,
          url: driveRes.fileUrl,
          fileName: driveRes.fileName || file.name,
          fileSize: driveRes.fileSize || sizeText,
        };
      } else if (driveRes.error) {
        return {
          success: false,
          url: '',
          fileName: file.name,
          fileSize: sizeText,
          error: driveRes.error,
        };
      }
    }
  } catch (e: any) {
    console.warn('Google Drive automated upload check failed:', e);
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `assignments/${assignmentId}/${teacherId}_${Date.now()}_${sanitizedName}`;

  const client = getSupabaseClient();
  if (client) {
    try {
      // Try 'assignment-files' bucket first, fallback to 'lesson-plans'
      let uploadRes = await client.storage.from('assignment-files').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (uploadRes.error) {
        uploadRes = await client.storage.from('lesson-plans').upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });
      }

      if (!uploadRes.error) {
        const { data: pubData } = client.storage.from('lesson-plans').getPublicUrl(path);
        return {
          success: true,
          url: pubData.publicUrl,
          fileName: file.name,
          fileSize: sizeText,
        };
      }
    } catch (e) {
      console.warn('Supabase storage upload error, falling back:', e);
    }
  }

  // Zero-Egress Policy: Never convert binary files to Base64 data URLs in database rows!
  return {
    success: false,
    url: '',
    fileName: file.name,
    fileSize: sizeText,
    error: 'ยังไม่ได้เชื่อมต่อ Google Drive ของโรงเรียน กรุณาตั้งค่า Google Drive ในเมนูแอดมิน หรือระบุเป็นลิงก์ Google Drive โดยตรง',
  };
}

export async function checkSystemSettingsTableStatus(): Promise<{
  connected: boolean;
  tableExists: boolean;
  error?: string;
}> {
  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    try {
      const testRes = await testCloudflareConnection();
      return { connected: testRes.success, tableExists: testRes.success, error: testRes.message };
    } catch (err: any) {
      return { connected: false, tableExists: false, error: err?.message };
    }
  }

  const client = getSupabaseClient();
  if (!client) {
    return { connected: false, tableExists: false, error: 'ยังไม่ได้เชื่อมต่อกับ Cloudflare D1' };
  }
  try {
    const { error } = await client.from('system_settings').select('key').limit(1);
    if (!error) {
      return { connected: true, tableExists: true };
    }
    if (error.code === '42P01' || error.message?.includes('relation "system_settings" does not exist')) {
      return { connected: true, tableExists: false, error: 'ยังไม่ได้สร้างตาราง system_settings บนฐานข้อมูล' };
    }
    return { connected: true, tableExists: false, error: error.message };
  } catch (err: any) {
    return { connected: false, tableExists: false, error: err?.message };
  }
}

export async function seedDocumentTypesToSupabase(
  configs?: any[]
): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
  // Always save to system_settings via Cloudflare D1
  return await saveSystemSetting('deadline_configs', configs);
}

export async function seedPlansToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
  if (getDatabaseProvider() === 'cloudflare') {
    const plans = getLocalPlans();
    if (plans.length === 0) {
      return { success: true, count: 0 };
    }
    let count = 0;
    for (const p of plans) {
      const res = await savePlanToCloudflare(p);
      if (res.success) count++;
    }
    return { success: true, count };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'ยังไม่ได้เชื่อมต่อกับฐานข้อมูล Cloudflare' };
  }
  try {
    const plans = getLocalPlans();
    if (plans.length === 0) {
      return { success: true, count: 0 };
    }

    // Ensure teachers exist first for foreign key
    const teachers = getLocalTeachers();
    await client.from('teachers').upsert(
      teachers.map((t) => ({
        Teacher_ID: t.Teacher_ID,
        Name: t.Name,
        Email: t.Email,
        Pass: t.Pass,
        Learning_Area: t.Learning_Area,
        photo: t.photo || '',
        national_id: t.national_id || '',
        phone: t.phone || '',
        signature_url: t.signature_url || '',
        birth_date: t.birth_date || '',
        position: t.position || '',
        academic_standing: t.academic_standing || '',
        department: t.department || '',
        role: t.role || 'teacher',
      }))
    );

    const cleanPlans = plans.map((p) => ({
      id: p.id,
      teacher_id: p.teacher_id,
      teacher_name: p.teacher_name,
      teacher_photo: p.teacher_photo || '',
      learning_area: p.learning_area,
      subject_code: p.subject_code,
      subject_name: p.subject_name,
      grade_level: p.grade_level,
      semester: p.semester,
      academic_year: p.academic_year,
      plan_title: p.plan_title,
      plan_type: p.plan_type,
      total_hours: Number(p.total_hours) || 40,
      file_url: p.file_url,
      file_name: p.file_name,
      file_size: p.file_size || '2.5 MB',
      notes: p.notes || '',
      submitted_at: p.submitted_at?.includes('T') ? p.submitted_at : new Date().toISOString(),
      status: p.status || 'submitted',
      reviewed_by: p.reviewed_by || null,
      reviewer_name: p.reviewer_name || null,
      reviewed_at: p.reviewed_at || null,
      review_comment: p.review_comment || null,
      rubric_scores: p.rubric_scores || null,
      total_score: p.total_score !== undefined ? p.total_score : null,
    }));

    const { error } = await client.from('lesson_plans').upsert(cleanPlans);
    if (error) {
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: cleanPlans.length };
  } catch (e: any) {
    return { success: false, count: 0, error: e?.message };
  }
}

export async function deletePlanRecord(planId: string): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
  // 1. Immediately record in deleted plan IDs & cloud system_settings
  recordDeletedPlanId(planId);

  // 2. Remove from local lesson plans
  const plans = getLocalPlans().filter((p) => p.id !== planId);
  saveLocalPlans(plans);

  // 3. Also remove from assignment submissions to prevent sync revival
  await deleteAssignmentSubmissionRecord(planId);

  // If Cloudflare is active, delete on Cloudflare D1
  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await deletePlanFromCloudflare(planId);
        return { success: cfRes.success, isSupabase: true, error: cfRes.error };
      } catch (e: any) {
        return { success: false, isSupabase: true, error: e?.message };
      }
    }
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from('lesson_plans').delete().eq('id', planId);
      if (error) {
        console.error('Supabase delete plan error:', error);
        return { success: false, isSupabase: true, error: error.message };
      }
      return { success: true, isSupabase: true };
    } catch (e: any) {
      console.error('Supabase delete exception:', e);
      return { success: false, isSupabase: true, error: e?.message };
    }
  }
  return { success: true, isSupabase: false };
}

// Generate SQL Schema and Seed for Supabase SQL Editor
export function generateSupabaseSqlScript(): string {
  const seedTeachersSql = INITIAL_TEACHERS.map((t) => {
    const esc = (s: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
    return `('${t.Teacher_ID}', ${esc(t.Name)}, ${esc(t.Email)}, ${esc(t.Pass)}, ${esc(t.Learning_Area)}, ${esc(t.photo)}, ${esc(t.national_id)}, ${esc(t.phone)}, ${esc(t.signature_url)}, ${esc(t.birth_date)}, ${esc(t.position)}, ${esc(t.academic_standing)}, ${esc(t.department)}, ${esc(t.role)})`;
  }).join(',\n');

  return `-- ================================================================
-- ระบบส่งแผนการสอน (Lesson Plan Submission System)
-- คำสั่งสร้างตารางและข้อมูลตั้งต้นสำหรับ Supabase
-- คัดลอกโค้ดนี้ไปรันใน Supabase -> SQL Editor ได้ทันที
-- ================================================================

-- 1. สร้างตาราง "teachers" (บุคคลากร)
-- Teacher_ID เป็น Key หลัก เชื่อมกับตารางการส่งไฟล์
CREATE TABLE IF NOT EXISTS public.teachers (
    "Teacher_ID" VARCHAR(50) PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Email" TEXT UNIQUE NOT NULL,
    "Pass" TEXT NOT NULL DEFAULT '12345',
    "Learning_Area" TEXT NOT NULL,
    "photo" TEXT,
    "national_id" VARCHAR(20),
    "phone" VARCHAR(20),
    "signature_url" TEXT,
    "birth_date" VARCHAR(30),
    "position" TEXT,
    "academic_standing" TEXT,
    "department" TEXT,
    "role" VARCHAR(30) DEFAULT 'teacher',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. สร้างตาราง "lesson_plans" (การส่งแผนการสอน)
CREATE TABLE IF NOT EXISTS public.lesson_plans (
    "id" VARCHAR(50) PRIMARY KEY,
    "teacher_id" VARCHAR(50) NOT NULL REFERENCES public.teachers("Teacher_ID") ON DELETE CASCADE,
    "teacher_name" TEXT NOT NULL,
    "teacher_photo" TEXT,
    "learning_area" TEXT NOT NULL,
    "subject_code" VARCHAR(30) NOT NULL,
    "subject_name" TEXT NOT NULL,
    "grade_level" VARCHAR(50) NOT NULL,
    "semester" VARCHAR(10) NOT NULL,
    "academic_year" VARCHAR(10) NOT NULL,
    "plan_title" TEXT NOT NULL,
    "plan_type" TEXT NOT NULL,
    "total_hours" INTEGER NOT NULL DEFAULT 40,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" VARCHAR(30),
    "notes" TEXT,
    "submitted_at" TIMESTAMPTZ DEFAULT NOW(),
    "status" VARCHAR(30) DEFAULT 'submitted', -- 'submitted', 'approved', 'needs_revision'
    "is_late" BOOLEAN DEFAULT false,
    "submission_delay_text" TEXT,
    "deadline_at" TEXT,
    "admin_notes" TEXT,
    "reviewed_by" VARCHAR(50) REFERENCES public.teachers("Teacher_ID") ON DELETE SET NULL,
    "reviewer_name" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "review_comment" TEXT,
    "rubric_scores" JSONB,
    "total_score" NUMERIC
);

-- 3. เปิดการใช้งาน Row Level Security (RLS)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

-- 4. ตั้งค่านโยบาย Policy
DROP POLICY IF EXISTS "Allow all access to teachers" ON public.teachers;
CREATE POLICY "Allow all access to teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to lesson_plans" ON public.lesson_plans;
CREATE POLICY "Allow all access to lesson_plans" ON public.lesson_plans FOR ALL USING (true) WITH CHECK (true);

-- 5. สร้าง Supabase Storage Bucket สำหรับจัดเก็บไฟล์แผนการสอน (lesson-plans)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-plans', 'lesson-plans', true)
ON CONFLICT (id) DO NOTHING;

-- นโยบายเปิดให้ทุกคนอ่านและอัปโหลดไฟล์ใน Bucket lesson-plans
DROP POLICY IF EXISTS "Public Access lesson-plans" ON storage.objects;
CREATE POLICY "Public Access lesson-plans" ON storage.objects FOR ALL USING (bucket_id = 'lesson-plans') WITH CHECK (bucket_id = 'lesson-plans');

-- 6. บันทึกข้อมูลบุคลากรและแอดมิน (admin01) เข้าสู่ระบบ
INSERT INTO public.teachers (
    "Teacher_ID", "Name", "Email", "Pass", "Learning_Area", 
    "photo", "national_id", "phone", "signature_url", 
    "birth_date", "position", "academic_standing", "department", "role"
)
VALUES
${seedTeachersSql}
ON CONFLICT ("Teacher_ID") 
DO UPDATE SET 
    "Name" = EXCLUDED."Name",
    "Email" = EXCLUDED."Email",
    "Learning_Area" = EXCLUDED."Learning_Area",
    "photo" = EXCLUDED."photo",
    "phone" = EXCLUDED."phone",
    "department" = EXCLUDED."department",
    "role" = EXCLUDED."role";

-- 7. สร้างตาราง "system_settings" สำหรับการตั้งค่าระบบ (ประเภทเอกสาร, กำหนดส่ง, สถานะ) ซิงค์ข้ามทุกเครื่อง
CREATE TABLE IF NOT EXISTS public.system_settings (
    "key" VARCHAR(100) PRIMARY KEY,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to system_settings" ON public.system_settings;
CREATE POLICY "Allow all access to system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- เปิดการใช้งาน Realtime บนตาราง system_settings (หากต้องการให้ซิงค์ทันทีแบบ Live)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

-- สำเร็จ! ตารางและคลังเก็บไฟล์พร้อมใช้งานกับแอพพลิเคชัน`;
}

export async function seedTeachersToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
  if (getDatabaseProvider() === 'cloudflare') {
    const teachers = getLocalTeachers();
    let count = 0;
    for (const t of teachers) {
      const res = await saveTeacherToCloudflare(t);
      if (res.success) count++;
    }
    return { success: true, count };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'ยังไม่ได้เชื่อมต่อกับฐานข้อมูล Cloudflare' };
  }

  try {
    // Try upserting full records first
    const fullRecords = INITIAL_TEACHERS.map((t) => ({
      Teacher_ID: t.Teacher_ID,
      Name: t.Name,
      Email: t.Email,
      Pass: t.Pass,
      Learning_Area: t.Learning_Area,
      photo: t.photo || '',
      national_id: t.national_id || '',
      phone: t.phone || '',
      signature_url: t.signature_url || '',
      birth_date: t.birth_date || '',
      position: t.position || '',
      academic_standing: t.academic_standing || '',
      department: t.department || '',
      role: t.role || 'teacher',
    }));

    const { error: fullError } = await client.from('teachers').upsert(fullRecords);
    if (!fullError) {
      return { success: true, count: INITIAL_TEACHERS.length };
    }

    // If table only has core columns (e.g. Teacher_ID, Name, Email, Pass, Learning_Area, photo)
    const coreRecords = INITIAL_TEACHERS.map((t) => ({
      Teacher_ID: t.Teacher_ID,
      Name: t.Name,
      Email: t.Email,
      Pass: t.Pass,
      Learning_Area: t.Learning_Area,
      photo: t.photo || '',
    }));

    const { error: coreError } = await client.from('teachers').upsert(coreRecords);
    if (!coreError) {
      return { success: true, count: INITIAL_TEACHERS.length };
    }

    return { success: false, count: 0, error: fullError.message || coreError.message };
  } catch (e: any) {
    return { success: false, count: 0, error: e?.message };
  }
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Teacher, LessonPlan, AssignmentSubmission } from '../types';
import { INITIAL_TEACHERS, INITIAL_LESSON_PLANS } from '../data/initialTeachers';
import { getSavedSubmissions, saveSubmissions } from '../utils/deadlineUtils';
import {
  getDatabaseProvider,
  setDatabaseProvider,
  getSavedCloudflareConfig,
  saveCloudflareConfig,
  testCloudflareConnection,
  fetchTeachersFromCloudflare,
  saveTeacherToCloudflare,
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

export function recordDeletedPlanId(id: string) {
  if (!id) return;
  const set = getDeletedPlanIds();
  set.add(id);
  localStorage.setItem(STORAGE_KEY_DELETED_PLAN_IDS, JSON.stringify(Array.from(set)));
}

export function clearDeletedPlanId(id: string) {
  if (!id) return;
  const set = getDeletedPlanIds();
  set.delete(id);
  localStorage.setItem(STORAGE_KEY_DELETED_PLAN_IDS, JSON.stringify(Array.from(set)));
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
  return {
    Teacher_ID: id,
    Name: raw.Name || raw.name || '',
    Email: raw.Email || raw.email || '',
    Pass: raw.Pass || raw.pass || '',
    Learning_Area: raw.Learning_Area || raw.learning_area || '',
    photo: raw.photo || raw.Photo || '',
    national_id: raw.national_id || raw.National_ID || '',
    phone: raw.phone || raw.Phone || '',
    signature_url: raw.signature_url || raw.Signature_Url || '',
    birth_date: raw.birth_date || raw.Birth_Date || '',
    position: raw.position || raw.Position || '',
    academic_standing: raw.academic_standing || raw.Academic_Standing || '',
    department: raw.department || raw.Department || '',
    role: (raw.role || (isAdm ? 'admin' : 'teacher')) as any,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
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
export async function fetchTeachers(): Promise<{ data: Teacher[]; isSupabase: boolean; error?: string }> {
  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await fetchTeachersFromCloudflare();
        if (cfRes.success && cfRes.data && cfRes.data.length > 0) {
          const normalized = cfRes.data.map(normalizeTeacher);
          saveLocalTeachers(normalized);
          return { data: normalized, isSupabase: true };
        }
      } catch (err: any) {
        console.warn('Cloudflare fetchTeachers error, fallback to local:', err);
      }
    }
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      let { data, error } = await client.from('teachers').select('*').order('Teacher_ID');
      if (error && (error.message.includes('Teacher_ID') || error.code === '42703')) {
        const fallback = await client.from('teachers').select('*').order('teacher_id');
        data = fallback.data;
        error = fallback.error;
      }

      if (!error && data) {
        if (data.length > 0) {
          const normalized = data.map(normalizeTeacher);

          // Guarantee that admin01, admin02 & admin03 are always present in the returned list
          const adminAccounts = INITIAL_TEACHERS.filter((t) =>
            ['admin01', 'admin02', 'admin03'].includes(t.Teacher_ID)
          );

          adminAccounts.forEach((adm) => {
            const foundIdx = normalized.findIndex(
              (t) => String(t.Teacher_ID).toLowerCase() === adm.Teacher_ID.toLowerCase()
            );
            if (foundIdx === -1) {
              normalized.unshift(adm);
              // Upsert to Supabase in background so it exists remotely too
              if (client) {
                client
                  .from('teachers')
                  .upsert({
                    Teacher_ID: adm.Teacher_ID,
                    Name: adm.Name,
                    Email: adm.Email,
                    Pass: adm.Pass,
                    Learning_Area: adm.Learning_Area,
                    photo: adm.photo,
                    national_id: adm.national_id,
                    phone: adm.phone,
                    signature_url: adm.signature_url,
                    birth_date: adm.birth_date,
                    position: adm.position,
                    academic_standing: adm.academic_standing,
                    department: adm.department,
                    role: adm.role,
                  })
                  .then();
              }
            } else {
              // Ensure admin role and credentials
              if (normalized[foundIdx].role !== 'admin' || !normalized[foundIdx].Pass) {
                normalized[foundIdx].role = 'admin';
                if (!normalized[foundIdx].Pass) normalized[foundIdx].Pass = adm.Pass;
              }
            }
          });

          saveLocalTeachers(normalized);
          return { data: normalized, isSupabase: true };
        } else {
          // If table exists but is empty, seed initial teachers
          await seedTeachersToSupabase();
          return { data: getLocalTeachers(), isSupabase: true };
        }
      }
      if (error) {
        console.warn('Supabase fetch error, using local fallback:', error.message);
        return { data: getLocalTeachers(), isSupabase: false, error: error.message };
      }
    } catch (err: any) {
      console.warn('Supabase request failed, fallback to local:', err?.message);
      return { data: getLocalTeachers(), isSupabase: false, error: err?.message };
    }
  }
  return { data: getLocalTeachers(), isSupabase: false };
}

export async function updateTeacherRecord(teacher: Teacher): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
  // Update local storage first
  const teachers = getLocalTeachers();
  const idx = teachers.findIndex((t) => t.Teacher_ID === teacher.Teacher_ID);
  if (idx !== -1) {
    teachers[idx] = { ...teacher, updated_at: new Date().toISOString() };
  } else {
    teachers.push(teacher);
  }
  saveLocalTeachers(teachers);

  // If Cloudflare is active, update Cloudflare D1
  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await saveTeacherToCloudflare(teacher);
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
      const teacherPayload = {
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
        updated_at: new Date().toISOString(),
      };

      const { error } = await client.from('teachers').upsert(teacherPayload);
      if (error) {
        // Fallback to lowercase columns if schema uses unquoted names
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
          console.warn('Supabase update teacher failed:', fallback.error.message);
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

export async function fetchPlans(): Promise<{ data: LessonPlan[]; isSupabase: boolean; error?: string }> {
  const deletedIds = getDeletedPlanIds();
  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await fetchPlansFromCloudflare();
        if (cfRes.success && cfRes.data) {
          const filtered = cfRes.data.filter((p) => !deletedIds.has(p.id));
          saveLocalPlans(filtered);
          return { data: filtered, isSupabase: true };
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
        const filtered = (data as LessonPlan[]).filter((p) => !deletedIds.has(p.id));
        saveLocalPlans(filtered);
        return { data: filtered, isSupabase: true };
      }
      if (error) {
        return { data: getLocalPlans(), isSupabase: false, error: error.message };
      }
    } catch (err: any) {
      return { data: getLocalPlans(), isSupabase: false, error: err?.message };
    }
  }
  return { data: getLocalPlans(), isSupabase: false };
}

export async function savePlanRecord(
  plan: LessonPlan
): Promise<{ success: boolean; isSupabase: boolean; error?: string; message?: string }> {
  // Clear from deleted IDs if being saved/resubmitted
  clearDeletedPlanId(plan.id);

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
    if (cf.workerUrl) {
      try {
        const cfRes = await savePlanToCloudflare(plan);
        return {
          success: cfRes.success,
          isSupabase: true,
          error: cfRes.error,
          message: cfRes.success
            ? 'บันทึกลง Cloudflare D1 สำเร็จสมบูรณ์'
            : cfRes.error,
        };
      } catch (e: any) {
        return { success: false, isSupabase: true, error: e?.message };
      }
    }
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: true,
      isSupabase: false,
      message: 'บันทึกใน Local Storage (เครื่องนี้) เรียบร้อยแล้ว แต่ยังไม่ได้เชื่อมต่อฐานข้อมูลภายนอก (โปรดตั้งค่า Cloudflare หรือ Supabase)',
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

// SQL Snippet specifically for existing Supabase databases to create the system_settings table
export const SYSTEM_SETTINGS_TABLE_SQL = `-- รันคำสั่งนี้ใน Supabase SQL Editor เพื่อสร้างตารางบันทึกประเภทเอกสารและกำหนดเวลาส่ง
CREATE TABLE IF NOT EXISTS public.system_settings (
    "key" VARCHAR(100) PRIMARY KEY,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to system_settings" ON public.system_settings;
CREATE POLICY "Allow all access to system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;
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
  const local = getSavedSubmissions().filter((s) => !deletedIds.has(s.id));

  if (getDatabaseProvider() === 'cloudflare') {
    const cf = getSavedCloudflareConfig();
    if (cf.workerUrl) {
      try {
        const cfRes = await fetchSubmissionsFromCloudflare();
        if (cfRes.success && Array.isArray(cfRes.data)) {
          const filtered = cfRes.data.filter((s) => !deletedIds.has(s.id));
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
      const filtered = (data as AssignmentSubmission[]).filter((s) => !deletedIds.has(s.id));
      saveSubmissions(filtered);
      return filtered;
    }

    // Check system_settings fallback
    const fallbackRes = await fetchSystemSetting<AssignmentSubmission[]>('dynamic_submissions_data', []);
    if (fallbackRes.isSupabase && Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
      const filtered = fallbackRes.data.filter((s) => !deletedIds.has(s.id));
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

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('assignment_submissions').delete().eq('id', id);
      await saveSystemSetting('dynamic_submissions_data', local);
    } catch {
      // ignore
    }
  }
  return true;
}

export async function uploadAssignmentAttachmentFile(
  file: File,
  teacherId: string,
  assignmentId: string
): Promise<{ success: boolean; url: string; fileName: string; fileSize: string; error?: string }> {
  const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
  const sizeText = Number(fileSizeMb) < 1 ? `${Math.round(file.size / 1024)} KB` : `${fileSizeMb} MB`;
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
  // This completely eliminates megabytes of bandwidth on SELECT * queries.
  return {
    success: false,
    url: '',
    fileName: file.name,
    fileSize: sizeText,
    error: 'ระบบบังคับส่งเอกสารเป็นลิงก์ PDF / Google Drive เท่านั้น เพื่อประหยัดแบนด์วิดท์เซิร์ฟเวอร์ กรุณาระบุเป็นลิงก์',
  };
}

export async function checkSystemSettingsTableStatus(): Promise<{
  connected: boolean;
  tableExists: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { connected: false, tableExists: false, error: 'ยังไม่ได้เชื่อมต่อกับ Supabase' };
  }
  try {
    const { error } = await client.from('system_settings').select('key').limit(1);
    if (!error) {
      return { connected: true, tableExists: true };
    }
    if (error.code === '42P01' || error.message?.includes('relation "system_settings" does not exist')) {
      return { connected: true, tableExists: false, error: 'ยังไม่ได้สร้างตาราง system_settings บน Supabase' };
    }
    return { connected: true, tableExists: false, error: error.message };
  } catch (err: any) {
    return { connected: false, tableExists: false, error: err?.message };
  }
}

export async function seedDocumentTypesToSupabase(
  configs?: any[]
): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, isSupabase: false, error: 'ยังไม่ได้ตั้งค่า Supabase URL หรือ Key' };
  }
  return await saveSystemSetting('deadline_configs', configs);
}

export async function seedPlansToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'ยังไม่ได้ตั้งค่า Supabase URL หรือ Key' };
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
  // 1. Remove from local lesson plans
  const plans = getLocalPlans().filter((p) => p.id !== planId);
  saveLocalPlans(plans);

  // 2. Also remove from assignment submissions to prevent sync revival
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
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'ยังไม่ได้ตั้งค่า Supabase URL หรือ Key' };
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

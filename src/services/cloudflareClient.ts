import { Teacher, LessonPlan, AssignmentSubmission } from '../types';
import { INITIAL_TEACHERS } from '../data/initialTeachers';

const STORAGE_KEY_CF_CONFIG = 'lp_cloudflare_config';
const STORAGE_KEY_DB_PROVIDER = 'lp_database_provider'; // 'cloudflare' | 'supabase' | 'local'

export type DatabaseProvider = 'cloudflare' | 'local';

export interface CloudflareSettings {
  workerUrl: string; // e.g. https://pcshs-d1.your-account.workers.dev
  apiKey?: string;   // Optional Bearer token or x-api-key
  accountId?: string;
  databaseId?: string;
  apiToken?: string;
}

export function sanitizeCloudflareUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim().replace(/^['"]+|['"]+$/g, '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
}

export const DEFAULT_CLOUDFLARE_WORKER_URL = 'https://pcshs-eduplan-db.naruephat-na.workers.dev';

export function getDatabaseProvider(): DatabaseProvider {
  return 'cloudflare';
}

export function setDatabaseProvider(provider: DatabaseProvider) {
  localStorage.setItem(STORAGE_KEY_DB_PROVIDER, 'cloudflare');
}

export function getSavedCloudflareConfig(): CloudflareSettings {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = sanitizeCloudflareUrl(
    metaEnv.VITE_CLOUDFLARE_WORKER_URL ||
    metaEnv.CLOUDFLARE_WORKER_URL ||
    DEFAULT_CLOUDFLARE_WORKER_URL
  );
  const envKey = (metaEnv.VITE_CLOUDFLARE_API_KEY || metaEnv.CLOUDFLARE_API_KEY || '').trim();

  const saved = localStorage.getItem(STORAGE_KEY_CF_CONFIG);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const configuredUrl = sanitizeCloudflareUrl(parsed.workerUrl);
      return {
        workerUrl: configuredUrl || DEFAULT_CLOUDFLARE_WORKER_URL,
        apiKey: parsed.apiKey || envKey,
        accountId: parsed.accountId || '',
        databaseId: parsed.databaseId || '',
        apiToken: parsed.apiToken || '',
      };
    } catch {
      // fallback
    }
  }

  return {
    workerUrl: envUrl || DEFAULT_CLOUDFLARE_WORKER_URL,
    apiKey: envKey,
    accountId: '',
    databaseId: '',
    apiToken: '',
  };
}

export function saveCloudflareConfig(config: CloudflareSettings) {
  const clean: CloudflareSettings = {
    workerUrl: sanitizeCloudflareUrl(config.workerUrl),
    apiKey: config.apiKey?.trim() || '',
    accountId: config.accountId?.trim() || '',
    databaseId: config.databaseId?.trim() || '',
    apiToken: config.apiToken?.trim() || '',
  };
  localStorage.setItem(STORAGE_KEY_CF_CONFIG, JSON.stringify(clean));
}

/**
 * Cloudflare Worker Client Fetcher
 */
async function cfFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const config = getSavedCloudflareConfig();
  if (!config.workerUrl) {
    return { success: false, error: 'ยังไม่ได้ระบุ Cloudflare Worker URL' };
  }

  const url = `${config.workerUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    headers['x-api-key'] = config.apiKey;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      return {
        success: false,
        error: (body && body.error) || (typeof body === 'string' ? body : `HTTP Error ${res.status}`),
        status: res.status,
      };
    }

    return {
      success: true,
      data: body,
      status: res.status,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    return {
      success: false,
      error: isTimeout
        ? 'การเชื่อมต่อหมดเวลา (Timeout) โปรดตรวจสอบว่า Cloudflare Worker ทำงานอยู่หรือไม่'
        : (err?.message || 'ไม่สามารถเชื่อมต่อไปยัง Cloudflare Worker ได้ โปรดตรวจสอบ URL และ CORS'),
    };
  }
}

/**
 * Test Connection to Cloudflare Worker
 */
export async function testCloudflareConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  const config = getSavedCloudflareConfig();
  if (!config.workerUrl) {
    return { success: false, message: 'กรุณาระบุ Cloudflare Worker URL ก่อนทดสอบ' };
  }

  try {
    const res = await cfFetch('/api/health');
    if (res.success) {
      return {
        success: true,
        message: 'เชื่อมต่อกับ Cloudflare Worker & D1 สำเร็จสมบูรณ์!',
        details: res.data,
      };
    }

    // Try testing /api/teachers directly if /api/health was not defined
    const teachersRes = await cfFetch('/api/teachers');
    if (teachersRes.success) {
      return {
        success: true,
        message: 'เชื่อมต่อกับตาราง teachers บน Cloudflare D1 สำเร็จ!',
        details: teachersRes.data,
      };
    }

    return {
      success: false,
      message: `ไม่สามารถเชื่อมต่อได้: ${res.error || teachersRes.error || 'ตรวจสอบ URL หรือ CORS'}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `เชื่อมต่อไม่สำเร็จ: ${err.message}`,
    };
  }
}

/**
 * Cloudflare D1 API Operations
 */
export async function fetchTeachersFromCloudflare(): Promise<{ data: Teacher[]; success: boolean; error?: string }> {
  const res = await cfFetch<{ data: any[] }>('/api/teachers');
  if (res.success && res.data) {
    const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
    return { data: list, success: true };
  }
  return { data: [], success: false, error: res.error };
}

export async function saveTeacherToCloudflare(teacher: Teacher): Promise<{ success: boolean; error?: string }> {
  const res = await cfFetch('/api/teachers', {
    method: 'POST',
    body: JSON.stringify(teacher),
  });
  return { success: res.success, error: res.error };
}

export async function fetchPlansFromCloudflare(): Promise<{ data: LessonPlan[]; success: boolean; error?: string }> {
  const res = await cfFetch<{ data: any[] }>('/api/plans');
  if (res.success && res.data) {
    const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
    return { data: list, success: true };
  }
  return { data: [], success: false, error: res.error };
}

export async function savePlanToCloudflare(plan: LessonPlan): Promise<{ success: boolean; error?: string }> {
  const res = await cfFetch('/api/plans', {
    method: 'POST',
    body: JSON.stringify(plan),
  });
  return { success: res.success, error: res.error };
}

export async function deletePlanFromCloudflare(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await cfFetch(`/api/plans/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return { success: res.success, error: res.error };
}

export async function fetchSubmissionsFromCloudflare(): Promise<{ data: AssignmentSubmission[]; success: boolean; error?: string }> {
  const res = await cfFetch<{ data: any[] }>('/api/submissions');
  if (res.success && res.data) {
    const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
    return { data: list, success: true };
  }
  return { data: [], success: false, error: res.error };
}

export async function saveSubmissionToCloudflare(sub: AssignmentSubmission): Promise<{ success: boolean; error?: string }> {
  const res = await cfFetch('/api/submissions', {
    method: 'POST',
    body: JSON.stringify(sub),
  });
  return { success: res.success, error: res.error };
}

export async function deleteSubmissionFromCloudflare(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await cfFetch(`/api/submissions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return { success: res.success, error: res.error };
}

export async function fetchSettingFromCloudflare<T = any>(key: string): Promise<{ data: T | null; success: boolean; error?: string }> {
  const res = await cfFetch<{ data: T }>(`/api/settings?key=${encodeURIComponent(key)}`);
  if (res.success && res.data) {
    const val = (res.data as any).data !== undefined ? (res.data as any).data : res.data;
    return { data: val as T, success: true };
  }
  return { data: null, success: false, error: res.error };
}

export async function saveSettingToCloudflare(key: string, value: any): Promise<{ success: boolean; error?: string }> {
  const res = await cfFetch('/api/settings', {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  });
  return { success: res.success, error: res.error };
}

/**
 * Migrate all current teachers, lesson plans, submissions, and settings directly to Cloudflare
 */
export async function migrateAllDataToCloudflare(
  currentTeachers: Teacher[],
  currentPlans: LessonPlan[],
  currentSubmissions: AssignmentSubmission[],
  deadlineConfigs: any[],
  statusConfigs: any[]
): Promise<{
  success: boolean;
  message: string;
  teachersCount: number;
  plansCount: number;
  submissionsCount: number;
  error?: string;
}> {
  const testRes = await testCloudflareConnection();
  if (!testRes.success) {
    return {
      success: false,
      message: `ไม่สามารถเชื่อมต่อ Cloudflare Worker ได้: ${testRes.message}`,
      teachersCount: 0,
      plansCount: 0,
      submissionsCount: 0,
      error: testRes.message,
    };
  }

  let tCount = 0;
  let pCount = 0;
  let sCount = 0;

  try {
    // 1. Sync Teachers in batch or one-by-one
    const batchRes = await cfFetch('/api/teachers/batch', {
      method: 'POST',
      body: JSON.stringify(currentTeachers),
    });

    if (batchRes.success) {
      tCount = currentTeachers.length;
    } else {
      // Fallback: save one by one
      for (const t of currentTeachers) {
        const sRes = await saveTeacherToCloudflare(t);
        if (sRes.success) tCount++;
      }
    }

    // 2. Sync Plans
    for (const p of currentPlans) {
      const pRes = await savePlanToCloudflare(p);
      if (pRes.success) pCount++;
    }

    // 3. Sync Submissions
    for (const sub of currentSubmissions) {
      const subRes = await saveSubmissionToCloudflare(sub);
      if (subRes.success) sCount++;
    }

    // 4. Sync Settings
    if (deadlineConfigs && deadlineConfigs.length > 0) {
      await saveSettingToCloudflare('deadline_configs', deadlineConfigs);
    }
    if (statusConfigs && statusConfigs.length > 0) {
      await saveSettingToCloudflare('status_configs', statusConfigs);
    }

    // Set Cloudflare as active provider
    setDatabaseProvider('cloudflare');

    return {
      success: true,
      message: `ย้ายข้อมูลขึ้น Cloudflare D1 สำเร็จสมบูรณ์! (ครู ${tCount} ท่าน, แผน ${pCount} รายการ, ภาระงาน ${sCount} รายการ)`,
      teachersCount: tCount,
      plansCount: pCount,
      submissionsCount: sCount,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `เกิดข้อผิดพลาดระหว่างย้ายข้อมูล: ${err?.message}`,
      teachersCount: tCount,
      plansCount: pCount,
      submissionsCount: sCount,
      error: err?.message,
    };
  }
}

/**
 * Generate D1 SQLite Migration Script (schema-cloudflare-d1.sql)
 */
export function generateCloudflareD1SqlScript(
  teachers: Teacher[] = INITIAL_TEACHERS,
  plans: LessonPlan[] = [],
  deadlineConfigs: any[] = []
): string {
  const esc = (s: any) => {
    if (s === null || s === undefined) return 'NULL';
    return `'${String(s).replace(/'/g, "''")}'`;
  };

  const teachersSql = teachers.map((t) => {
    return `INSERT OR REPLACE INTO teachers (
  Teacher_ID, Name, Email, Pass, Learning_Area, photo, 
  national_id, phone, signature_url, birth_date, position, 
  academic_standing, department, role, updated_at
) VALUES (
  ${esc(t.Teacher_ID)}, ${esc(t.Name)}, ${esc(t.Email)}, ${esc(t.Pass || '12345')}, ${esc(t.Learning_Area)}, ${esc(t.photo || '')},
  ${esc(t.national_id || '')}, ${esc(t.phone || '')}, ${esc(t.signature_url || '')}, ${esc(t.birth_date || '')}, ${esc(t.position || '')},
  ${esc(t.academic_standing || '')}, ${esc(t.department || '')}, ${esc(t.role || 'teacher')}, CURRENT_TIMESTAMP
);`;
  }).join('\n');

  const plansSql = plans.length > 0 ? plans.map((p) => {
    const scores = p.rubric_scores ? JSON.stringify(p.rubric_scores) : null;
    return `INSERT OR REPLACE INTO lesson_plans (
  id, teacher_id, teacher_name, teacher_photo, learning_area,
  subject_code, subject_name, grade_level, semester, academic_year,
  plan_title, plan_type, total_hours, file_url, file_name, file_size,
  notes, submitted_at, status, is_late, submission_delay_text,
  deadline_at, admin_notes, reviewed_by, reviewer_name,
  reviewed_at, review_comment, rubric_scores, total_score
) VALUES (
  ${esc(p.id)}, ${esc(p.teacher_id)}, ${esc(p.teacher_name)}, ${esc(p.teacher_photo || '')}, ${esc(p.learning_area)},
  ${esc(p.subject_code)}, ${esc(p.subject_name)}, ${esc(p.grade_level)}, ${esc(p.semester)}, ${esc(p.academic_year)},
  ${esc(p.plan_title)}, ${esc(p.plan_type)}, ${Number(p.total_hours) || 40}, ${esc(p.file_url)}, ${esc(p.file_name)}, ${esc(p.file_size || '2.5 MB')},
  ${esc(p.notes || '')}, ${esc(p.submitted_at || new Date().toISOString())}, ${esc(p.status || 'submitted')}, ${p.is_late ? 1 : 0}, ${esc(p.submission_delay_text)},
  ${esc(p.deadline_at)}, ${esc(p.admin_notes)}, ${esc(p.reviewed_by)}, ${esc(p.reviewer_name)},
  ${esc(p.reviewed_at)}, ${esc(p.review_comment)}, ${esc(scores)}, ${p.total_score !== undefined ? p.total_score : 'NULL'}
);`;
  }).join('\n') : '-- ยังไม่มีข้อมูลแผนการสอนในขณะนี้';

  const configsVal = deadlineConfigs.length > 0 ? JSON.stringify(deadlineConfigs) : '[]';

  return `-- ================================================================
-- Cloudflare D1 SQL Schema & Initial Data Migration
-- โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์ (PCSHS KSN)
-- ================================================================

-- 1. สร้างตาราง teachers (ข้อมูลครูและบุคลากร)
CREATE TABLE IF NOT EXISTS teachers (
    Teacher_ID TEXT PRIMARY KEY,
    Name TEXT NOT NULL,
    Email TEXT UNIQUE NOT NULL,
    Pass TEXT NOT NULL DEFAULT '12345',
    Learning_Area TEXT NOT NULL,
    photo TEXT,
    national_id TEXT,
    phone TEXT,
    signature_url TEXT,
    birth_date TEXT,
    position TEXT,
    academic_standing TEXT,
    department TEXT,
    role TEXT DEFAULT 'teacher',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. สร้างตาราง lesson_plans (เอกสารและการส่งแผนการจัดการเรียนรู้)
CREATE TABLE IF NOT EXISTS lesson_plans (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(Teacher_ID) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    teacher_photo TEXT,
    learning_area TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    semester TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    plan_title TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    total_hours INTEGER NOT NULL DEFAULT 40,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size TEXT,
    notes TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'submitted',
    is_late INTEGER DEFAULT 0,
    submission_delay_text TEXT,
    deadline_at TEXT,
    admin_notes TEXT,
    reviewed_by TEXT,
    reviewer_name TEXT,
    reviewed_at TEXT,
    review_comment TEXT,
    rubric_scores TEXT,
    total_score REAL
);

-- 3. สร้างตาราง assignment_submissions (การส่งภาระงานและเอกสารแบบไดนามิก)
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT,
    assignment_name TEXT,
    teacher_id TEXT,
    teacher_name TEXT,
    learning_area TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'submitted',
    answers TEXT,
    attachments TEXT,
    is_late INTEGER DEFAULT 0,
    submission_delay_text TEXT,
    reviewed_by TEXT,
    reviewer_name TEXT,
    reviewed_at TEXT,
    review_comment TEXT,
    admin_notes TEXT
);

-- 4. สร้างตาราง system_settings (การตั้งค่าประเภทเอกสาร, วันกำหนดส่ง, และสถานะ)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. บันทึกข้อมูลบุคลากรและผู้ดูแลระบบ (admin01, admin02, admin03)
${teachersSql}

-- 6. บันทึกแผนการสอนปัจจุบัน
${plansSql}

-- 7. บันทึกการตั้งค่ากำหนดส่งและประเภทเอกสาร
INSERT OR REPLACE INTO system_settings (key, value, updated_at)
VALUES ('deadline_configs', ${esc(configsVal)}, CURRENT_TIMESTAMP);

-- สำเร็จ! ฐานข้อมูล Cloudflare D1 พร้อมใช้งานกับระบบส่งแผนการสอน`;
}

/**
 * Generate Ready-to-deploy Cloudflare Worker Code (worker.js)
 */
export function generateCloudflareWorkerScript(): string {
  return `/**
 * Cloudflare Worker API for PCSHS KSN Lesson Plan Portal & Cloudflare D1
 * Binding required in wrangler.toml or Cloudflare Dashboard:
 *   Variable name: DB
 *   D1 Database: (Your D1 database name)
 */

export default {
  async fetch(request, env, ctx) {
    // 1. CORS Headers for Cross-Origin Browser Access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Optional API Key Verification (if env.API_KEY is configured in Cloudflare)
    if (env.API_KEY) {
      const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key');
      const token = authHeader?.replace(/^Bearer\\s+/i, '');
      if (token !== env.API_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid API Key' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    try {
      // Health check endpoint
      if (path === '/' || path === '/api/health') {
        return new Response(
          JSON.stringify({
            status: 'online',
            service: 'PCSHS Kalasin EduPlan Cloudflare D1 API',
            version: '2.5.0',
            time: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Teachers API
      if (path === '/api/teachers') {
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM teachers ORDER BY Teacher_ID ASC').all();
          return new Response(JSON.stringify({ data: results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (request.method === 'POST') {
          const t = await request.json();
          await env.DB.prepare(\`
            INSERT INTO teachers (
              Teacher_ID, Name, Email, Pass, Learning_Area, photo, 
              national_id, phone, signature_url, birth_date, position, 
              academic_standing, department, role, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(Teacher_ID) DO UPDATE SET
              Name = excluded.Name,
              Email = excluded.Email,
              Pass = excluded.Pass,
              Learning_Area = excluded.Learning_Area,
              photo = excluded.photo,
              national_id = excluded.national_id,
              phone = excluded.phone,
              signature_url = excluded.signature_url,
              birth_date = excluded.birth_date,
              position = excluded.position,
              academic_standing = excluded.academic_standing,
              department = excluded.department,
              role = excluded.role,
              updated_at = CURRENT_TIMESTAMP
          \`).bind(
            t.Teacher_ID, t.Name, t.Email, t.Pass || '12345', t.Learning_Area, t.photo || '',
            t.national_id || '', t.phone || '', t.signature_url || '', t.birth_date || '',
            t.position || '', t.academic_standing || '', t.department || '', t.role || 'teacher'
          ).run();

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Teachers Batch Upsert (used during Migration)
      if (path === '/api/teachers/batch' && request.method === 'POST') {
        const list = await request.json();
        const stmts = list.map((t) =>
          env.DB.prepare(\`
            INSERT INTO teachers (
              Teacher_ID, Name, Email, Pass, Learning_Area, photo, 
              national_id, phone, signature_url, birth_date, position, 
              academic_standing, department, role, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(Teacher_ID) DO UPDATE SET
              Name = excluded.Name,
              Email = excluded.Email,
              Pass = excluded.Pass,
              Learning_Area = excluded.Learning_Area,
              photo = excluded.photo,
              national_id = excluded.national_id,
              phone = excluded.phone,
              signature_url = excluded.signature_url,
              birth_date = excluded.birth_date,
              position = excluded.position,
              academic_standing = excluded.academic_standing,
              department = excluded.department,
              role = excluded.role,
              updated_at = CURRENT_TIMESTAMP
          \`).bind(
            t.Teacher_ID, t.Name, t.Email, t.Pass || '12345', t.Learning_Area, t.photo || '',
            t.national_id || '', t.phone || '', t.signature_url || '', t.birth_date || '',
            t.position || '', t.academic_standing || '', t.department || '', t.role || 'teacher'
          )
        );
        await env.DB.batch(stmts);
        return new Response(JSON.stringify({ success: true, count: list.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Lesson Plans API
      if (path === '/api/plans') {
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM lesson_plans ORDER BY submitted_at DESC').all();
          const mapped = results.map((r) => ({
            ...r,
            is_late: Boolean(r.is_late),
            rubric_scores: typeof r.rubric_scores === 'string' ? JSON.parse(r.rubric_scores || '{}') : r.rubric_scores,
          }));
          return new Response(JSON.stringify({ data: mapped }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (request.method === 'POST') {
          const p = await request.json();
          await env.DB.prepare(\`
            INSERT INTO lesson_plans (
              id, teacher_id, teacher_name, teacher_photo, learning_area,
              subject_code, subject_name, grade_level, semester, academic_year,
              plan_title, plan_type, total_hours, file_url, file_name, file_size,
              notes, submitted_at, status, is_late, submission_delay_text,
              deadline_at, admin_notes, reviewed_by, reviewer_name,
              reviewed_at, review_comment, rubric_scores, total_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              teacher_id = excluded.teacher_id,
              teacher_name = excluded.teacher_name,
              teacher_photo = excluded.teacher_photo,
              learning_area = excluded.learning_area,
              subject_code = excluded.subject_code,
              subject_name = excluded.subject_name,
              grade_level = excluded.grade_level,
              semester = excluded.semester,
              academic_year = excluded.academic_year,
              plan_title = excluded.plan_title,
              plan_type = excluded.plan_type,
              total_hours = excluded.total_hours,
              file_url = excluded.file_url,
              file_name = excluded.file_name,
              file_size = excluded.file_size,
              notes = excluded.notes,
              submitted_at = excluded.submitted_at,
              status = excluded.status,
              is_late = excluded.is_late,
              submission_delay_text = excluded.submission_delay_text,
              deadline_at = excluded.deadline_at,
              admin_notes = excluded.admin_notes,
              reviewed_by = excluded.reviewed_by,
              reviewer_name = excluded.reviewer_name,
              reviewed_at = excluded.reviewed_at,
              review_comment = excluded.review_comment,
              rubric_scores = excluded.rubric_scores,
              total_score = excluded.total_score
          \`).bind(
            p.id, p.teacher_id, p.teacher_name, p.teacher_photo || '', p.learning_area,
            p.subject_code, p.subject_name, p.grade_level, p.semester, p.academic_year,
            p.plan_title, p.plan_type, p.total_hours || 40, p.file_url, p.file_name, p.file_size || '2.5 MB',
            p.notes || '', p.submitted_at || new Date().toISOString(), p.status || 'submitted',
            p.is_late ? 1 : 0, p.submission_delay_text || null, p.deadline_at || null, p.admin_notes || null,
            p.reviewed_by || null, p.reviewer_name || null, p.reviewed_at || null, p.review_comment || null,
            typeof p.rubric_scores === 'object' ? JSON.stringify(p.rubric_scores) : (p.rubric_scores || null),
            p.total_score ?? null
          ).run();

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (path.startsWith('/api/plans/') && request.method === 'DELETE') {
        const id = decodeURIComponent(path.replace('/api/plans/', ''));
        await env.DB.prepare('DELETE FROM lesson_plans WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Assignment Submissions API
      if (path === '/api/submissions') {
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM assignment_submissions ORDER BY submitted_at DESC').all();
          const mapped = results.map((r) => ({
            ...r,
            is_late: Boolean(r.is_late),
            answers: typeof r.answers === 'string' ? JSON.parse(r.answers || '{}') : r.answers,
            attachments: typeof r.attachments === 'string' ? JSON.parse(r.attachments || '[]') : r.attachments,
          }));
          return new Response(JSON.stringify({ data: mapped }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (request.method === 'POST') {
          const s = await request.json();
          await env.DB.prepare(\`
            INSERT INTO assignment_submissions (
              id, assignment_id, assignment_name, teacher_id, teacher_name,
              learning_area, submitted_at, status, answers, attachments,
              is_late, submission_delay_text, reviewed_by, reviewer_name,
              reviewed_at, review_comment, admin_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              assignment_id = excluded.assignment_id,
              assignment_name = excluded.assignment_name,
              teacher_id = excluded.teacher_id,
              teacher_name = excluded.teacher_name,
              learning_area = excluded.learning_area,
              submitted_at = excluded.submitted_at,
              status = excluded.status,
              answers = excluded.answers,
              attachments = excluded.attachments,
              is_late = excluded.is_late,
              submission_delay_text = excluded.submission_delay_text,
              reviewed_by = excluded.reviewed_by,
              reviewer_name = excluded.reviewer_name,
              reviewed_at = excluded.reviewed_at,
              review_comment = excluded.review_comment,
              admin_notes = excluded.admin_notes
          \`).bind(
            s.id, s.assignment_id, s.assignment_name, s.teacher_id, s.teacher_name,
            s.learning_area || '', s.submitted_at || new Date().toISOString(), s.status || 'submitted',
            typeof s.answers === 'object' ? JSON.stringify(s.answers) : (s.answers || '{}'),
            typeof s.attachments === 'object' ? JSON.stringify(s.attachments) : (s.attachments || '[]'),
            s.is_late ? 1 : 0, s.submission_delay_text || null, s.reviewed_by || null, s.reviewer_name || null,
            s.reviewed_at || null, s.review_comment || null, s.admin_notes || null
          ).run();

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (path.startsWith('/api/submissions/') && request.method === 'DELETE') {
        const id = decodeURIComponent(path.replace('/api/submissions/', ''));
        await env.DB.prepare('DELETE FROM assignment_submissions WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // System Settings API
      if (path.startsWith('/api/settings')) {
        if (request.method === 'GET') {
          const key = url.searchParams.get('key');
          if (!key) {
            const { results } = await env.DB.prepare('SELECT * FROM system_settings').all();
            return new Response(JSON.stringify({ data: results }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          const row = await env.DB.prepare('SELECT * FROM system_settings WHERE key = ?').bind(key).first();
          let parsed = null;
          if (row && row.value) {
            try { parsed = JSON.parse(row.value); } catch { parsed = row.value; }
          }
          return new Response(JSON.stringify({ data: parsed }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (request.method === 'POST') {
          const { key, value } = await request.json();
          const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
          await env.DB.prepare(\`
            INSERT INTO system_settings (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              updated_at = CURRENT_TIMESTAMP
          \`).bind(key, valStr).run();

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Endpoint Not Found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || String(err) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
`;
}

/**
 * Generate wrangler.toml for Cloudflare CLI deployment
 */
export function generateWranglerToml(): string {
  return `name = "pcshs-eduplan-d1"
main = "worker.js"
compatibility_date = "2024-01-01"

# ผูกฐานข้อมูล Cloudflare D1
# คำสั่งสร้าง D1: npx wrangler d1 create pcshs-eduplan-db
[[d1_databases]]
binding = "DB"
database_name = "pcshs-eduplan-db"
database_id = "YOUR_DATABASE_ID_HERE"
`;
}

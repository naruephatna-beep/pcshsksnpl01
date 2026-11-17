import { Teacher } from '../types';
import {
  fetchTeachersRaw,
  getLocalTeachers,
  saveLocalTeachers,
  updateTeacherRecord,
  normalizeTeacher,
} from './supabaseClient';
import { INITIAL_TEACHERS } from '../data/initialTeachers';

/**
 * Verifies teacher login credentials using email or teacher_id and password.
 * Always checks latest cloud records first so fresh devices and changed emails/passwords work seamlessly.
 */
export async function verifyTeacherCredentials(
  emailOrId: string,
  pass: string
): Promise<{ success: boolean; teacher?: Teacher; error?: string }> {
  const query = (emailOrId || '').trim().toLowerCase();
  const inputPass = (pass || '').trim();

  if (!query) {
    return { success: false, error: 'กรุณากรอกอีเมลหรือรหัสประจำตัว' };
  }
  if (!inputPass) {
    return { success: false, error: 'กรุณากรอกรหัสผ่าน' };
  }

  // 1. Fetch authoritative teacher list from Cloud D1 / Supabase (falls back to local when offline)
  let teacherPool: Teacher[] = [];
  try {
    const rawRes = await fetchTeachersRaw();
    if (rawRes.data && rawRes.data.length > 0) {
      teacherPool = rawRes.data;
    }
  } catch {
    // fallback below
  }
  if (teacherPool.length === 0) {
    teacherPool = getLocalTeachers();
  }

  const findInList = (list: Teacher[]) =>
    list.find((t) => {
      const tEmail = (t.Email || '').trim().toLowerCase();
      const tId = (t.Teacher_ID || '').trim().toLowerCase();
      const tPrefix = tEmail ? tEmail.split('@')[0] : '';
      return (tEmail && tEmail === query) || (tId && tId === query) || (tPrefix && tPrefix === query);
    });

  let found = findInList(teacherPool);

  // 2. Fallback to INITIAL_TEACHERS only if that Teacher_ID isn't already superseded in cloud pool
  if (!found) {
    const initCandidate = findInList(INITIAL_TEACHERS);
    if (initCandidate) {
      const existingCloudSameId = teacherPool.find(
        (t) => t.Teacher_ID.trim().toLowerCase() === initCandidate.Teacher_ID.trim().toLowerCase()
      );
      if (!existingCloudSameId) {
        found = initCandidate;
      }
    }
  }

  if (!found) {
    return { success: false, error: 'ไม่พบบัญชีผู้ใช้ในระบบ หรืออีเมลไม่ถูกต้อง' };
  }

  // Authoritative password check:
  // If teacher.Pass is empty, check INITIAL_TEACHERS or default '12345'
  let expectedPass = (found.Pass || '').trim();
  if (!expectedPass) {
    const init = INITIAL_TEACHERS.find(
      (t) => t.Teacher_ID.trim().toLowerCase() === found?.Teacher_ID.trim().toLowerCase()
    );
    expectedPass = (init?.Pass || '').trim() || '12345';
  }

  const isMatch = inputPass === expectedPass || (expectedPass === '12345' && inputPass === '12345');

  if (!isMatch) {
    return { success: false, error: 'รหัสผ่านไม่ถูกต้อง โปรดตรวจสอบอีกครั้ง' };
  }

  return {
    success: true,
    teacher: normalizeTeacher(found),
  };
}

/**
 * Updates a teacher's password on server / cloud database.
 */
export async function updateServerTeacherPassword(
  teacherId: string,
  newPass: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetId = String(teacherId || '').trim().toLowerCase();
    let teachers = getLocalTeachers();
    let idx = teachers.findIndex((t) => String(t.Teacher_ID || '').trim().toLowerCase() === targetId);
    if (idx === -1) {
      const rawRes = await fetchTeachersRaw().catch(() => ({ data: [] as Teacher[] }));
      if (rawRes.data.length > 0) {
        teachers = rawRes.data;
        idx = teachers.findIndex((t) => String(t.Teacher_ID || '').trim().toLowerCase() === targetId);
      }
    }
    if (idx === -1) {
      return { success: false, error: 'ไม่พบข้อมูลครู' };
    }

    const updated: Teacher = {
      ...teachers[idx],
      Pass: newPass,
      has_changed_password: newPass !== '12345',
    };

    teachers[idx] = updated;
    saveLocalTeachers(teachers);

    await updateTeacherRecord(updated);

    // Best-effort sync with dev/server endpoint if running
    fetch('/api/auth/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: updated.Teacher_ID, newPassword: newPass }),
    }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'ไม่สามารถอัปเดตรหัสผ่านได้' };
  }
}

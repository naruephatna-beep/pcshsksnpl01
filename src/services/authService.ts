import { Teacher } from '../types';
import { getLocalTeachers, saveLocalTeachers, updateTeacherRecord, normalizeTeacher } from './supabaseClient';
import { INITIAL_TEACHERS } from '../data/initialTeachers';

/**
 * Verifies teacher login credentials using email or teacher_id and password.
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

  // 1. Check local teachers first
  const localTeachers = getLocalTeachers();
  let found = localTeachers.find((t) => {
    const tEmail = (t.Email || '').toLowerCase();
    const tId = (t.Teacher_ID || '').toLowerCase();
    const tPrefix = tEmail.split('@')[0];
    return tEmail === query || tId === query || tPrefix === query;
  });

  // 2. Fallback to INITIAL_TEACHERS
  if (!found) {
    found = INITIAL_TEACHERS.find((t) => {
      const tEmail = (t.Email || '').toLowerCase();
      const tId = (t.Teacher_ID || '').toLowerCase();
      const tPrefix = tEmail.split('@')[0];
      return tEmail === query || tId === query || tPrefix === query;
    });
  }

  if (!found) {
    return { success: false, error: 'ไม่พบบัญชีผู้ใช้ในระบบ หรืออีเมลไม่ถูกต้อง' };
  }

  // Authoritative password check:
  // If teacher.Pass is empty, default password is '12345'
  let expectedPass = (found.Pass || '').trim();
  if (!expectedPass) {
    // Check initial teachers for this ID
    const init = INITIAL_TEACHERS.find((t) => t.Teacher_ID === found?.Teacher_ID);
    expectedPass = (init?.Pass || '').trim() || '12345';
  }

  // Master password fallback for admins or system defaults
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
    const teachers = getLocalTeachers();
    const idx = teachers.findIndex((t) => t.Teacher_ID === teacherId);
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

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'ไม่สามารถอัปเดตรหัสผ่านได้' };
  }
}

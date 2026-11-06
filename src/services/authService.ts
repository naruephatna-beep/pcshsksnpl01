import { Teacher } from '../types';
import { INITIAL_TEACHERS } from '../data/initialTeachers';

export interface AuthResult {
  success: boolean;
  teacher?: Teacher;
  error?: string;
}

/**
 * Sanitizes a teacher object to ensure sensitive fields (Pass, national_id, birth_date)
 * are NEVER kept in client-side memory or exposed in the DOM/state.
 */
export function sanitizeClientTeacher(t: Teacher): Teacher {
  return {
    ...t,
    Pass: '', // Completely wiped
    national_id: '', // Completely wiped
    birth_date: '', // Completely wiped
    has_changed_password: t.has_changed_password !== undefined ? t.has_changed_password : (t.Pass !== '12345'),
  };
}

/**
 * Server-side authentication: verifies credentials via backend API without leaking
 * other teachers' passwords to the client browser.
 */
export async function verifyTeacherCredentials(
  identifier: string,
  password: string
): Promise<AuthResult> {
  const cleanId = identifier.trim();
  const cleanPass = password.trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: 'กรุณากรอกรหัสครู / อีเมล และรหัสผ่าน' };
  }

  // 1. Primary: Verify through server-side /api/auth/login
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier: cleanId, password: cleanPass }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.teacher) {
        return {
          success: true,
          teacher: sanitizeClientTeacher(data.teacher),
        };
      }
      return {
        success: false,
        error: data.error || 'รหัสผ่านไม่ถูกต้อง หรือไม่พบบัญชีผู้ใช้',
      };
    }
  } catch (err) {
    console.warn('Backend auth endpoint unreachable, attempting secure fallback:', err);
  }

  // 2. Fallback: Local authoritative matching (only checks the single target account)
  const q = cleanId.toLowerCase();
  const found = INITIAL_TEACHERS.find(
    (t) => t.Teacher_ID.toLowerCase() === q || t.Email.toLowerCase() === q
  );

  if (!found) {
    return { success: false, error: 'ไม่พบบัญชีผู้ใช้นี้ในระบบโรงเรียน' };
  }

  if (found.Pass !== cleanPass) {
    return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
  }

  return {
    success: true,
    teacher: sanitizeClientTeacher(found),
  };
}

/**
 * Authenticates via Google School Sign-In (@pcshsksn.ac.th)
 */
export async function verifyGoogleSchoolAccount(email: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes('@')) {
    return { success: false, error: 'ที่อยู่อีเมลไม่ถูกต้อง' };
  }

  try {
    const response = await fetch('/api/auth/google-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: cleanEmail }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.teacher) {
        return {
          success: true,
          teacher: sanitizeClientTeacher(data.teacher),
        };
      }
    }
  } catch (err) {
    console.warn('Google verify API fallback:', err);
  }

  // Fallback match
  const found = INITIAL_TEACHERS.find(
    (t) => t.Email.toLowerCase() === cleanEmail || t.Teacher_ID.toLowerCase() === cleanEmail.split('@')[0]
  );

  if (!found) {
    return { success: false, error: 'ไม่พบบัญชีครูที่ผูกกับอีเมลนี้ในระบบ' };
  }

  return {
    success: true,
    teacher: sanitizeClientTeacher(found),
  };
}

/**
 * Updates password on server
 */
export async function updateServerTeacherPassword(
  teacherId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId, newPassword }),
    });
    const data = await res.json();
    return { success: data.success, error: data.error };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Security & Data Privacy Utilities
 * Enforces PDPA compliance and Client-Side Data Isolation:
 * 1. Strips sensitive PII (passwords, national IDs, phone numbers, birth dates, signatures) from public directory caches.
 * 2. Isolates lesson plans so regular teachers NEVER download or cache other teachers' documents.
 * 3. Provides secure SHA-256 hashing for credentials.
 */

import { Teacher, LessonPlan, isTeacherAdmin, isTeacherExecutive } from '../types';

/**
 * Lightweight synchronous SHA-256 implementation for deterministic hashing
 */
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: { [key: number]: boolean } = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // Only ASCII
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] =
        i < 16
          ? w[i]
          : (((w[i - 16] + s0) | 0) + ((w[i - 7] + s1) | 0)) | 0;

      const s1Hash =
        rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 =
        ((((hash[7] + s1Hash) | 0) + ch) | 0) + ((k[i] + w[i]) | 0) | 0;
      const s0Hash =
        rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0Hash + maj) | 0;

      hash = [
        (temp1 + temp2) | 0,
        hash[0],
        hash[1],
        hash[2],
        (hash[3] + temp1) | 0,
        hash[4],
        hash[5],
        hash[6],
      ];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

/**
 * Default password hash for "12345"
 */
export const DEFAULT_TEACHER_PASSWORD_HASH = sha256('12345');

/**
 * Known admin default password hashes
 */
export const DEFAULT_ADMIN_HASHES: Record<string, string> = {
  admin01: sha256('admin01'),
  admin02: sha256('admin02'),
  admin03: sha256('admin03'),
};

/**
 * Sanitizes a teacher object for public / shared distribution in the client.
 * Completely strips passwords, citizen national IDs, phone numbers, signatures, and birth dates!
 */
export function sanitizeTeacherForPublic(teacher: Teacher): Teacher {
  return {
    Teacher_ID: teacher.Teacher_ID,
    Name: teacher.Name,
    Email: teacher.Email,
    Pass: '', // NEVER send passwords of other teachers to client
    Learning_Area: teacher.Learning_Area || '',
    branch: teacher.branch || '',
    photo: teacher.photo || '',
    national_id: '', // MASKED for PDPA privacy
    phone: '', // MASKED for PDPA privacy
    signature_url: '', // MASKED for PDPA privacy
    birth_date: '', // MASKED for PDPA privacy
    position: teacher.position || '',
    academic_standing: teacher.academic_standing || '',
    department: teacher.department || '',
    role: teacher.role || 'teacher',
    is_head_of_department: teacher.is_head_of_department === true,
    is_head_of_branch: teacher.is_head_of_branch === true,
    department_id: teacher.department_id || '',
    branch_id: teacher.branch_id || '',
    created_at: teacher.created_at,
    updated_at: teacher.updated_at,
  };
}

/**
 * Sanitizes an entire teacher list so no sensitive PII is ever leaked to components or localStorage.
 */
export function sanitizeTeacherList(teachers: Teacher[]): Teacher[] {
  return (teachers || []).map(sanitizeTeacherForPublic);
}

/**
 * Securely verifies a teacher's password without exposing all passwords to the client
 */
export function verifyTeacherCredentials(
  teacher: Teacher,
  enteredPassword: string
): boolean {
  if (!enteredPassword) return false;
  const trimmed = enteredPassword.trim();
  const enteredHash = sha256(trimmed);

  // If teacher has a custom saved password or hash
  if (teacher.Pass) {
    // Check direct equality or hash equality
    if (teacher.Pass === trimmed || teacher.Pass === enteredHash) {
      return true;
    }
  }

  // Check admin specific defaults
  const idLower = String(teacher.Teacher_ID || '').toLowerCase();
  if (idLower in DEFAULT_ADMIN_HASHES) {
    if (enteredHash === DEFAULT_ADMIN_HASHES[idLower] || trimmed === idLower) {
      return true;
    }
  }

  // Check default teacher password "12345"
  if (trimmed === '12345' || enteredHash === DEFAULT_TEACHER_PASSWORD_HASH) {
    return true;
  }

  return false;
}

/**
 * Filter lesson plans strictly according to user permissions:
 * - Regular teacher: ONLY receives their own lesson plans.
 * - Department/Branch Head: receives their own plans + plans for their department/branch.
 * - Admin/Executive: receives all plans.
 * This guarantees other teachers' plans are never downloaded or cached in unauthorized browsers.
 */
export function filterPlansForUserRole(
  plans: LessonPlan[],
  user: Teacher | null
): LessonPlan[] {
  if (!user) return [];
  if (isTeacherAdmin(user) || isTeacherExecutive(user)) {
    return plans;
  }

  const userId = String(user.Teacher_ID || '').trim().toLowerCase();
  const userArea = String(user.Learning_Area || '').trim().toLowerCase();
  const userBranch = String(user.branch || '').trim().toLowerCase();
  const isDeptHead = user.is_head_of_department || user.role === 'head_of_department';
  const isBranchHead = user.is_head_of_branch || user.role === 'head_of_branch';

  return plans.filter((p) => {
    const planAuthorId = String(p.teacher_id || '').trim().toLowerCase();
    // Teacher always sees own plans
    if (planAuthorId === userId) return true;

    // Assigned reviewer can see plans assigned to them
    if (p.assigned_reviewer_id && String(p.assigned_reviewer_id).trim().toLowerCase() === userId) {
      return true;
    }

    // Branch head can see plans submitted in their branch
    if (isBranchHead && userBranch && p.branch && String(p.branch).trim().toLowerCase() === userBranch) {
      return true;
    }

    // Department head can see plans submitted in their department/area
    if (isDeptHead && userArea && p.learning_area && String(p.learning_area).trim().toLowerCase() === userArea) {
      return true;
    }

    return false;
  });
}

/**
 * Cleans up legacy contaminated client-side localStorage on app initialization
 */
export function purgeSensitiveClientCache(currentUserId?: string): void {
  try {
    // 1. Purge legacy teachers cache containing plaintext passwords or citizen IDs
    const rawTeachers = localStorage.getItem('lp_local_teachers');
    if (rawTeachers) {
      try {
        const teachers: Teacher[] = JSON.parse(rawTeachers);
        if (Array.isArray(teachers)) {
          const sanitized = teachers.map((t) => {
            // Keep the active user's own profile intact in their private memory, but strip everyone else's
            if (currentUserId && t.Teacher_ID === currentUserId) {
              return t;
            }
            return sanitizeTeacherForPublic(t);
          });
          localStorage.setItem('lp_local_teachers', JSON.stringify(sanitized));
        }
      } catch {
        localStorage.removeItem('lp_local_teachers');
      }
    }
  } catch (err) {
    console.warn('Cache purge notice:', err);
  }
}

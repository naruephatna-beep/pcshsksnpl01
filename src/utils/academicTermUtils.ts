import {
  ActiveTermConfig,
  DEFAULT_ACTIVE_TERM_CONFIG,
  LessonPlan,
  AssignmentSubmission,
  PlanTypeDeadlineConfig,
} from '../types';
import { fetchSystemSetting, saveSystemSetting } from '../services/supabaseClient';

export const STORAGE_KEY_ACTIVE_TERM = 'pcshs_active_term_config';

export { DEFAULT_ACTIVE_TERM_CONFIG };

/**
 * Reads active academic year and semester from localStorage (defaults to 2569 / 2)
 */
export function getLocalActiveTerm(): ActiveTermConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_TERM);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.academic_year && parsed.semester) {
        return {
          academic_year: String(parsed.academic_year).trim(),
          semester: String(parsed.semester).trim(),
          updated_at: parsed.updated_at,
          updated_by: parsed.updated_by,
        };
      }
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_ACTIVE_TERM_CONFIG };
}

export function saveLocalActiveTerm(term: ActiveTermConfig): void {
  try {
    localStorage.setItem(
      STORAGE_KEY_ACTIVE_TERM,
      JSON.stringify({
        academic_year: String(term.academic_year).trim(),
        semester: String(term.semester).trim(),
        updated_at: term.updated_at || new Date().toISOString(),
        updated_by: term.updated_by,
      })
    );
  } catch {
    // ignore
  }
}

export async function fetchActiveTerm(): Promise<{
  data: ActiveTermConfig;
  isSupabase: boolean;
}> {
  const local = getLocalActiveTerm();
  try {
    const res = await fetchSystemSetting<ActiveTermConfig>('school_active_term', local);
    if (res.isSupabase && res.data && res.data.academic_year && res.data.semester) {
      const clean: ActiveTermConfig = {
        academic_year: String(res.data.academic_year).trim(),
        semester: String(res.data.semester).trim(),
        updated_at: res.data.updated_at,
        updated_by: res.data.updated_by,
      };
      saveLocalActiveTerm(clean);
      return { data: clean, isSupabase: true };
    }
  } catch (err) {
    console.warn('Could not fetch school_active_term:', err);
  }
  return { data: local, isSupabase: false };
}

export async function saveActiveTerm(
  term: ActiveTermConfig
): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
  const clean: ActiveTermConfig = {
    academic_year: String(term.academic_year).trim() || DEFAULT_ACTIVE_TERM_CONFIG.academic_year,
    semester: String(term.semester).trim() || DEFAULT_ACTIVE_TERM_CONFIG.semester,
    updated_at: new Date().toISOString(),
    updated_by: term.updated_by,
  };
  saveLocalActiveTerm(clean);
  try {
    return await saveSystemSetting('school_active_term', clean);
  } catch (err: any) {
    return { success: false, isSupabase: false, error: err?.message };
  }
}

/**
 * Normalizes a plan's (semester, academic_year) to check if it matches the active term.
 * Handles formats like semester="1/2569" or semester="เทอม 2", academic_year="2569".
 */
export function extractPlanTerm(plan: {
  academic_year?: string | null;
  semester?: string | null;
}): { academic_year: string; semester: string } {
  let rawYear = String(plan.academic_year || '').trim();
  let rawSem = String(plan.semester || '').trim();

  // Handle combined format like "1/2569" or "2/2569" in semester field
  const slashMatch = rawSem.match(/^([12])\s*\/\s*(\d{4})$/);
  if (slashMatch) {
    rawSem = slashMatch[1];
    if (!rawYear) rawYear = slashMatch[2];
  } else {
    rawSem = rawSem.replace(/^(ภาคเรียนที่|ภาคเรียน|เทอม)\s*/i, '').trim();
  }

  rawYear = rawYear.replace(/^(ปีการศึกษา|พ\.ศ\.)\s*/i, '').trim();

  return {
    academic_year: rawYear,
    semester: rawSem,
  };
}

export function isPlanInActiveTerm(
  plan: Pick<LessonPlan, 'academic_year' | 'semester'>,
  activeTerm: ActiveTermConfig
): boolean {
  const planTerm = extractPlanTerm(plan);
  const targetYear = String(activeTerm.academic_year || '').trim();
  const targetSem = String(activeTerm.semester || '').trim();

  if (!planTerm.academic_year || !planTerm.semester) {
    return false;
  }
  return planTerm.academic_year === targetYear && planTerm.semester === targetSem;
}

export function isSubmissionInActiveTerm(
  sub: AssignmentSubmission,
  activeTerm: ActiveTermConfig,
  deadlineConfigs: PlanTypeDeadlineConfig[] = []
): boolean {
  const answers = sub.answers || {};
  const dlConfig = deadlineConfigs.find(
    (d) => d.id === sub.assignment_id || d.name === sub.assignment_name
  );
  const year = String(
    answers['fld_academic_year'] || dlConfig?.academic_year || ''
  ).trim();
  const sem = String(
    answers['fld_semester'] || dlConfig?.semester || ''
  ).trim();

  if (!year || !sem) return false;
  return (
    year === String(activeTerm.academic_year).trim() &&
    sem === String(activeTerm.semester).trim()
  );
}

/**
 * Formats Google Drive folder names for Option 1:
 * จภ_กาฬสินธุ์_ปีการศึกษา_2569 / เทอม_2
 */
export function getDriveTermFolderNames(term: ActiveTermConfig): {
  yearFolderName: string;
  termFolderName: string;
  fullPathLabel: string;
} {
  const cleanYear = String(term.academic_year || '2569').replace(/[\/\\:*?"<>|]/g, '').trim();
  const cleanSem = String(term.semester || '2').replace(/[\/\\:*?"<>|]/g, '').trim();
  const yearFolderName = `จภ_กาฬสินธุ์_ปีการศึกษา_${cleanYear}`;
  const termFolderName = `เทอม_${cleanSem}`;
  return {
    yearFolderName,
    termFolderName,
    fullPathLabel: `${yearFolderName} / ${termFolderName}`,
  };
}

export interface Teacher {
  Teacher_ID: string;
  Name: string;
  Email: string;
  Pass: string;
  Learning_Area: string;
  photo: string;
  national_id: string;
  phone: string;
  signature_url: string;
  birth_date: string;
  position: string;
  academic_standing: string;
  department: string;
  role: 'teacher' | 'head_of_department' | 'academic_director' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export type PlanStatus = 'submitted' | 'approved' | 'needs_revision' | 'late' | string;

export type PlanType =
  | 'แผนการจัดการเรียนรู้ฉบับย่อ'
  | 'แผนการจัดการเรียนรู้ฉบับสมบูรณ์'
  | string;

export type EvaluationType = 'rubric_score' | 'approval_only';

export type DynamicFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'user_profile';

export type SubmissionMode = 'both' | 'link_only' | 'file_only';

export interface DynamicFormField {
  id: string; // Unique permanent ID (e.g. 'fld_xxx')
  type: DynamicFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select, radio, checkbox
  profile_key?: 'name' | 'learning_area' | 'teacher_id' | 'email' | 'position'; // for user_profile
  file_config?: {
    max_files?: number;
    allowed_types?: string[]; // e.g. ['.pdf', '.docx', '.doc', '.png', '.jpg']
    max_size_mb?: number; // e.g. 25
    submission_mode?: SubmissionMode; // 'link_only' = บังคับส่งแค่ลิงก์ PDF, 'both' = ทั้งสองแบบ, 'file_only' = ไฟล์จากเครื่องเท่านั้น
    allow_link?: boolean;
    require_link_only?: boolean;
  };
  order: number;
}

export interface PlanTypeDeadlineConfig {
  id: string;
  name: string;
  description?: string;
  academic_year: string;
  semester: string;
  start_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_date: string; // YYYY-MM-DD
  end_time: string; // HH:mm
  allow_late: boolean;
  is_active: boolean;
  evaluation_type?: EvaluationType; // 'rubric_score' (ให้คะแนนรูบริก) หรือ 'approval_only' (ตรวจแค่อนุมัติ/ไม่อนุมัติ)
  notes?: string;
  fields?: DynamicFormField[]; // แบบฟอร์มข้อมูลที่กำหนดให้ผู้ส่งกรอก (Dynamic Form Fields)
  form_version?: number;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  assignment_name: string;
  teacher_id: string;
  teacher_name: string;
  learning_area: string;
  submitted_at: string;
  status: 'submitted' | 'approved' | 'needs_revision' | 'late' | string;
  answers: Record<string, any>; // field_id -> answer value
  attachments?: Array<{
    field_id: string;
    file_name: string;
    file_url: string;
    file_size?: string;
  }>;
  is_late?: boolean;
  submission_delay_text?: string;
  reviewed_by?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  review_comment?: string;
  admin_notes?: string;
}

export type StatusColor =
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'orange'
  | 'indigo'
  | 'sky'
  | 'purple'
  | 'slate';

export interface PlanStatusConfig {
  id: string;
  label: string;
  color: StatusColor;
  description?: string;
  is_system?: boolean;
}

export interface RubricScore {
  standards: number; // 1-5 มาตรฐานและตัวชี้วัด
  activities: number; // 1-5 กิจกรรมการเรียนรู้เชิงรุก
  media: number; // 1-5 สื่อ นวัตกรรม แหล่งเรียนรู้
  assessment: number; // 1-5 เครื่องมือวัดและประเมินผล
  recording: number; // 1-5 บันทึกหลังสอนและการสะท้อนคิด
}

export interface LessonPlan {
  id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_photo?: string;
  learning_area: string;
  subject_code: string;
  subject_name: string;
  grade_level: string;
  semester: string;
  academic_year: string;
  plan_title: string;
  plan_type: PlanType;
  total_hours: number;
  file_url: string;
  file_name: string;
  file_size?: string;
  notes?: string;
  submitted_at: string;
  status: PlanStatus;
  is_late?: boolean;
  submission_delay_text?: string;
  deadline_at?: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  review_comment?: string;
  rubric_scores?: RubricScore;
  total_score?: number;
  evaluation_type?: EvaluationType;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export function isTeacherAdmin(teacher: Teacher | null | undefined): boolean {
  if (!teacher) return false;
  const id = String(teacher.Teacher_ID || (teacher as any).teacher_id || '').toLowerCase().trim();
  const email = String(teacher.Email || (teacher as any).email || '').toLowerCase().trim();
  const role = String(teacher.role || '').toLowerCase().trim();
  return (
    role === 'admin' ||
    role === 'executive' ||
    id === 'admin01' ||
    id === 'admin02' ||
    id === 'admin03' ||
    id.startsWith('admin') ||
    email.startsWith('admin')
  );
}

export function isTeacherExecutive(teacher: Teacher | null | undefined): boolean {
  if (!teacher) return false;
  const id = String(teacher.Teacher_ID || (teacher as any).teacher_id || '').toLowerCase().trim();
  const role = String(teacher.role || '').toLowerCase().trim();
  return id === 'admin03' || role === 'executive';
}

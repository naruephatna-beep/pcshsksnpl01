export interface Teacher {
  Teacher_ID: string;
  Name: string;
  Email: string;
  Pass?: string; // Masked on client for security
  Learning_Area: string; // กลุ่มสาระการเรียนรู้ เช่น วิทยาศาสตร์และเทคโนโลยี, คณิตศาสตร์
  branch?: string; // สาขาวิชา / สาขา เช่น สาขาเทคโนโลยี, สาขาเคมี, สาขาฟิสิกส์, สาขาชีววิทยา
  photo: string;
  national_id?: string; // Masked on client for security
  phone: string;
  signature_url: string;
  birth_date?: string; // Masked on client for security
  position: string;
  academic_standing: string;
  department: string; // ฝ่ายบริหารงาน เช่น กลุ่มบริหารวิชาการ
  role: 'teacher' | 'head_of_department' | 'head_of_branch' | 'academic_director' | 'admin' | 'executive';
  is_head_of_department?: boolean; // หัวหน้ากลุ่มสาระ
  is_head_of_branch?: boolean; // หัวหน้ากลุ่มสาขา
  department_id?: string;
  branch_id?: string;
  has_changed_password?: boolean; // Indicates if password has been changed from default '12345'
  created_at?: string;
  updated_at?: string;
}

export interface DepartmentConfig {
  id: string;
  name: string; // ชื่อกลุ่มสาระการเรียนรู้
  code: string;
  color?: string;
  head_teacher_id?: string; // หัวหน้ากลุ่มสาระ
  head_teacher_name?: string;
  description?: string;
  created_at?: string;
}

export interface BranchConfig {
  id: string;
  name: string; // ชื่อกลุ่มสาขา / สาขาวิชา เช่น สาขาเทคโนโลยี, สาขาฟิสิกส์, สาขาเคมี
  code: string;
  learning_area_id?: string;
  learning_area_name: string; // สังกัดกลุ่มสาระ เช่น วิทยาศาสตร์และเทคโนโลยี
  color?: string;
  head_teacher_id?: string; // หัวหน้ากลุ่มสาขา
  head_teacher_name?: string;
  description?: string;
  created_at?: string;
}

export type ReviewerSelectionType = 'individual' | 'department' | 'branch' | 'role';

export type ReviewerRoleType =
  | 'submitter_branch_head' // หัวหน้ากลุ่มสาขาประจำวิชาของผู้ส่ง (เช่น หัวหน้าสาขาเทคโนโลยี)
  | 'submitter_department_head' // หัวหน้ากลุ่มสาระประจำวิชาของผู้ส่ง (เช่น หัวหน้ากลุ่มสาระวิทยาศาสตร์และเทคโนโลยี)
  | 'all_branch_heads' // หัวหน้ากลุ่มสาขาทุกคน
  | 'all_department_heads' // หัวหน้ากลุ่มสาระทุกคน
  | 'school_leadership' // ฝ่ายบริหารสถานศึกษา (ผู้อำนวยการ/รองฯ)
  | 'all_admins'; // ผู้ดูแลระบบทุกคน

export type ReviewScopeMode = 'own_group_only' | 'random_all' | 'random_cross_only';

export interface ReviewStageConfig {
  id: string;
  order: number; // 1, 2, 3...
  title: string;
  description?: string;
  evaluation_mode: 'approval_only' | 'rubric_score'; // 3. รูปแบบการตรวจ: อนุมัติ หรือ รูบริก
  reviewer_selection_type: ReviewerSelectionType; // 2. ดึงคนมาตรวจ: รายบุคคล, ทั้งกลุ่มสาระ, ทั้งสาขา, จากตำแหน่ง
  assigned_teacher_ids?: string[]; // กรณีระบุรายบุคคล
  assigned_departments?: string[]; // กรณีเลือกกลุ่มสาระ
  assigned_branches?: string[]; // กรณีเลือกกลุ่มสาขา
  assigned_role?: ReviewerRoleType; // กรณีเลือกจากตำแหน่ง
  scope_mode?: ReviewScopeMode; // แอดมินเลือก: 'own_group_only' ตรวจเฉพาะคนของตัวเอง, 'random_all' สุ่มตรวจของทุกคน, 'random_cross_only' สุ่มตรวจข้ามกลุ่ม
  auto_assign_enabled?: boolean; // ระบบกระจายงานอัตโนมัติเท่าๆ กัน
}

export interface ReviewWorkflowConfig {
  id: string;
  name: string;
  description?: string;
  plan_type?: string; // 'all' หรือชื่อประเภทเอกสารหลัก
  target_plan_types?: string[]; // รายการประเภทเอกสารที่ผูกกับสายงานนี้
  is_active: boolean;
  stages: ReviewStageConfig[];
  auto_assign_on_deadline?: boolean;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StageReviewRecord {
  stage_id: string;
  stage_order: number;
  stage_title: string;
  evaluation_mode: 'approval_only' | 'rubric_score';
  assigned_reviewer_id?: string;
  assigned_reviewer_name?: string;
  reviewer_id?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  status: 'pending' | 'approved' | 'needs_revision' | 'passed' | 'rejected';
  comment?: string;
  rubric_scores?: RubricScore;
  total_score?: number;
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
  | 'user_profile'
  | 'link_reference';

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
  example_url?: string; // ลิงก์ตัวอย่างเอกสาร/ไฟล์ต้นแบบสำหรับช่องนี้
  example_title?: string; // คำอธิบาย/ชื่อตัวอย่าง เช่น "ดูตัวอย่างแบบฟอร์ม PDF"
  example_links?: Array<{ title: string; url: string }>; // รายการลิงก์เอกสารตัวอย่าง/ไฟล์ต้นแบบ
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
  sample_url?: string; // ลิงก์เอกสารตัวอย่าง / Template ประจำประเภทงานนี้
  sample_title?: string; // ชื่อตัวอย่างเอกสาร เช่น "แบบฟอร์มวิจัยในชั้นเรียนหน้าเดียว (Google Docs)"
  example_documents?: Array<{ title: string; url: string }>; // รายการเอกสารตัวอย่างและแบบฟอร์มต้นแบบสำหรับประเภทนี้
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
  branch?: string; // สาขาวิชา เช่น สาขาเทคโนโลยี, สาขาฟิสิกส์, สาขาเคมี
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
  // Multi-stage workflow review tracking
  workflow_id?: string;
  current_stage_order?: number; // 1, 2, ... total_stages
  total_stages?: number;
  stage_reviews?: StageReviewRecord[];
  assigned_reviewer_id?: string;
  assigned_reviewer_name?: string;
  // Per-file individual rubric & review evaluation
  file_reviews?: FileReviewResult[];
}

export interface FileReviewResult {
  file_index: number;
  file_name: string;
  file_url: string;
  file_size?: string;
  status: 'approved' | 'needs_revision' | 'pending';
  rubric_scores?: RubricScore;
  total_score?: number; // 0 - 100%
  comment?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewer_name?: string;
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

/**
 * ตรวจสอบว่าเป็นหัวหน้ากลุ่มสาระการเรียนรู้ (Head of Learning Area / Department Head) หรือไม่
 */
export function isDepartmentHead(teacher: Teacher | null | undefined): boolean {
  if (!teacher) return false;
  const role = String(teacher.role || '').toLowerCase().trim();
  return role === 'head_of_department' || teacher.is_head_of_department === true;
}

/**
 * ตรวจสอบว่าเป็นหัวหน้ากลุ่มสาขา / หัวหน้าสาขาวิชา (Head of Discipline / Branch Head) หรือไม่
 */
export function isBranchHead(teacher: Teacher | null | undefined): boolean {
  if (!teacher) return false;
  const role = String(teacher.role || '').toLowerCase().trim();
  return role === 'head_of_branch' || teacher.is_head_of_branch === true;
}

/**
 * การตั้งค่าสิทธิ์การเข้าถึง "เอกสารทั้งหมดในระบบ"
 */
export interface AllDocumentsAccessConfig {
  allow_all_teachers: boolean; // default false (ปิดไม่ให้ครูทุกคนเห็น)
  allow_dept_heads: boolean; // อนุญาตให้หัวหน้ากลุ่มสาระเห็นเอกสารทั้งหมดหรือไม่
  allow_branch_heads: boolean; // อนุญาตให้หัวหน้ากลุ่มสาขาเห็นเอกสารทั้งหมดหรือไม่
  allowed_teacher_ids: string[]; // รายชื่อรหัสครูที่ได้รับอนุญาตเป็นรายบุคคล
}

export const DEFAULT_ALL_DOCS_ACCESS_CONFIG: AllDocumentsAccessConfig = {
  allow_all_teachers: false,
  allow_dept_heads: false,
  allow_branch_heads: false,
  allowed_teacher_ids: [],
};

/**
 * ตรวจสอบว่าครูท่านนี้ได้รับสิทธิ์ให้ดู "เอกสารทั้งหมดในระบบ" หรือไม่
 */
export function canTeacherViewAllDocuments(
  teacher: Teacher | null | undefined,
  config?: AllDocumentsAccessConfig | null
): boolean {
  if (!teacher) return false;
  // 1. แอดมินและผู้บริหารโรงเรียนมีสิทธิ์เสมอ
  if (isTeacherAdmin(teacher) || isTeacherExecutive(teacher)) return true;
  if (!config) return false;
  // 2. หากแอดมินเปิดให้ครูทุกคนดูได้
  if (config.allow_all_teachers) return true;
  // 3. หากแอดมินเปิดให้หัวหน้ากลุ่มสาระดูได้
  if (config.allow_dept_heads && isDepartmentHead(teacher)) return true;
  // 4. หากแอดมินเปิดให้หัวหน้ากลุ่มสาขาดูได้
  if (config.allow_branch_heads && isBranchHead(teacher)) return true;
  // 5. หากได้รับสิทธิ์เจาะจงเป็นรายบุคคล
  if (Array.isArray(config.allowed_teacher_ids) && config.allowed_teacher_ids.includes(teacher.Teacher_ID)) {
    return true;
  }
  return false;
}

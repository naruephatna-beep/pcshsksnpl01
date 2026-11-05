import {
  DepartmentConfig,
  BranchConfig,
  ReviewWorkflowConfig,
  ReviewStageConfig,
  StageReviewRecord,
  Teacher,
  LessonPlan,
  isTeacherAdmin,
  isTeacherExecutive,
  isDepartmentHead,
  isBranchHead,
} from '../types';
import {
  fetchSystemSetting,
  saveSystemSetting,
  updateTeacherRecord,
  saveLocalTeachers,
} from './supabaseClient';

const STORAGE_KEY_DEPARTMENTS = 'lp_school_departments';
const STORAGE_KEY_BRANCHES = 'lp_school_branches';
const STORAGE_KEY_WORKFLOWS = 'lp_review_workflows';

// Standard 10 Learning Areas (กลุ่มสาระการเรียนรู้) of PCSHS Kalasin
export const DEFAULT_DEPARTMENTS: DepartmentConfig[] = [
  {
    id: 'dept_sci',
    name: 'วิทยาศาสตร์และเทคโนโลยี',
    code: 'SCI',
    color: '#0284C7', // Sky blue
    head_teacher_id: 'te001',
    head_teacher_name: 'นางสาวธัญญรัศท์ สุภษร',
    description: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์ ดาราศาสตร์ และเทคโนโลยีคอมพิวเตอร์',
  },
  {
    id: 'dept_math',
    name: 'คณิตศาสตร์',
    code: 'MATH',
    color: '#D97706', // Amber
    head_teacher_id: 'te004',
    head_teacher_name: 'นายสิทธิพงษ์ ฉลวยศรี',
    description: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์และสถิติประยุกต์',
  },
  {
    id: 'dept_tha',
    name: 'ภาษาไทย',
    code: 'THA',
    color: '#EA580C', // Orange
    head_teacher_id: 'te021',
    head_teacher_name: 'นางสาวผกามาศ ขจรโมทย์',
    description: 'กลุ่มสาระการเรียนรู้ภาษาไทย วรรณคดี และการสื่อสาร',
  },
  {
    id: 'dept_eng',
    name: 'ภาษาต่างประเทศ',
    code: 'ENG',
    color: '#4F46E5', // Indigo
    head_teacher_id: 'te008',
    head_teacher_name: 'นายคฑาอินทร์ อารมณ์สวะ',
    description: 'กลุ่มสาระการเรียนรู้ภาษาอังกฤษ ภาษาญี่ปุ่น และภาษาที่สาม',
  },
  {
    id: 'dept_soc',
    name: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
    code: 'SOC',
    color: '#16A34A', // Green
    head_teacher_id: 'te011',
    head_teacher_name: 'นางภคนันท์ ศิริบุญ',
    description: 'กลุ่มสาระการเรียนรู้สังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง',
  },
  {
    id: 'dept_hpe',
    name: 'สุขศึกษาและพลศึกษา',
    code: 'HPE',
    color: '#DC2626', // Red
    head_teacher_id: 'te018',
    head_teacher_name: 'สิบเอกอุดมศักดิ์ ทิพย์กระโทก',
    description: 'กลุ่มสาระการเรียนรู้สุขศึกษา พลศึกษา และสุขภาพองค์รวม',
  },
  {
    id: 'dept_art',
    name: 'ศิลปะ',
    code: 'ART',
    color: '#9333EA', // Purple
    head_teacher_id: 'te007',
    head_teacher_name: 'นายปิยะวัฒน์ พิมพ์ประสงค์',
    description: 'กลุ่มสาระการเรียนรู้ทัศนศิลป์ ดนตรี และนาฏศิลป์',
  },
  {
    id: 'dept_occ',
    name: 'การงานอาชีพ',
    code: 'OCC',
    color: '#CA8A04', // Yellow gold
    head_teacher_id: 'te022',
    head_teacher_name: 'นายศิรชัช ชนะค้า',
    description: 'กลุ่มสาระการเรียนรู้การงานอาชีพ ทักษะชีวิต และเทคโนโลยีการเกษตร',
  },
  {
    id: 'dept_act',
    name: 'กิจกรรมพัฒนาผู้เรียน',
    code: 'ACT',
    color: '#0D9488', // Teal
    head_teacher_id: 'te023',
    head_teacher_name: 'นางสาวชนัญดา แกล้วกล้า',
    description: 'กิจกรรมแนะแนว ลูกเสือ-เนตรนารี ชุมนุม และกิจกรรมจิตอาสา',
  },
  {
    id: 'dept_acad',
    name: 'กลุ่มบริหารงานวิชาการและสารสนเทศ',
    code: 'ACAD',
    color: '#1E293B', // Slate Navy
    head_teacher_id: 'admin01',
    head_teacher_name: 'ผู้ดูแลระบบกลาง (System Administrator)',
    description: 'ฝ่ายบริหารวิชาการ งานหลักสูตร วัดผล และทะเบียนสารสนเทศ',
  },
];

// Standard Academic Branches / Disciplines (กลุ่มสาขาวิชา) of PCSHS Kalasin
export const DEFAULT_BRANCHES: BranchConfig[] = [
  // ภายใต้กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี
  {
    id: 'branch_tech',
    name: 'สาขาเทคโนโลยี',
    code: 'TECH',
    learning_area_id: 'dept_sci',
    learning_area_name: 'วิทยาศาสตร์และเทคโนโลยี',
    color: '#0EA5E9',
    head_teacher_id: 'te028',
    head_teacher_name: 'นายนฤพัทธ์ นามมงคุณ',
    description: 'สาขาวิชาเทคโนโลยี คอมพิวเตอร์ วิทยาการคำนวณ และนวัตกรรมดิจิทัล',
  },
  {
    id: 'branch_chem',
    name: 'สาขาเคมี',
    code: 'CHEM',
    learning_area_id: 'dept_sci',
    learning_area_name: 'วิทยาศาสตร์และเทคโนโลยี',
    color: '#0284C7',
    head_teacher_id: 'te001',
    head_teacher_name: 'นางสาวธัญญรัศท์ สุภษร',
    description: 'สาขาวิชาเคมีและเคมีประยุกต์',
  },
  {
    id: 'branch_phys',
    name: 'สาขาฟิสิกส์',
    code: 'PHYS',
    learning_area_id: 'dept_sci',
    learning_area_name: 'วิทยาศาสตร์และเทคโนโลยี',
    color: '#2563EB',
    head_teacher_id: 'te002',
    head_teacher_name: 'นายณัฐพล ไสยสาลี',
    description: 'สาขาวิชาฟิสิกส์และดาราศาสตร์ฟิสิกส์',
  },
  {
    id: 'branch_bio',
    name: 'สาขาชีววิทยา',
    code: 'BIO',
    learning_area_id: 'dept_sci',
    learning_area_name: 'วิทยาศาสตร์และเทคโนโลยี',
    color: '#059669',
    head_teacher_id: 'te005',
    head_teacher_name: 'นางสาวธนัญญา ทองด่านเหนือ',
    description: 'สาขาวิชาชีววิทยาและวิทยาศาสตร์ชีวภาพ',
  },
  {
    id: 'branch_astro',
    name: 'สาขาดาราศาสตร์และอวกาศ',
    code: 'ASTRO',
    learning_area_id: 'dept_sci',
    learning_area_name: 'วิทยาศาสตร์และเทคโนโลยี',
    color: '#6366F1',
    head_teacher_id: 'te014',
    head_teacher_name: 'นายอิสระพงษ์ ถิ่นวิมล',
    description: 'สาขาวิชาดาราศาสตร์ โลก และอวกาศ',
  },
  // ภายใต้กลุ่มสาระการเรียนรู้คณิตศาสตร์
  {
    id: 'branch_math',
    name: 'สาขาคณิตศาสตร์',
    code: 'MATH',
    learning_area_id: 'dept_math',
    learning_area_name: 'คณิตศาสตร์',
    color: '#D97706',
    head_teacher_id: 'te004',
    head_teacher_name: 'นายสิทธิพงษ์ ฉลวยศรี',
    description: 'สาขาวิชาคณิตศาสตร์และสถิติประยุกต์',
  },
  // ภายใต้กลุ่มสาระการเรียนรู้ภาษาไทย
  {
    id: 'branch_tha',
    name: 'สาขาภาษาไทย',
    code: 'THA',
    learning_area_id: 'dept_tha',
    learning_area_name: 'ภาษาไทย',
    color: '#EA580C',
    head_teacher_id: 'te021',
    head_teacher_name: 'นางสาวผกามาศ ขจรโมทย์',
    description: 'สาขาวิชาภาษาไทย วรรณคดี และการสื่อสาร',
  },
  // ภายใต้กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ
  {
    id: 'branch_eng',
    name: 'สาขาภาษาต่างประเทศ',
    code: 'ENG',
    learning_area_id: 'dept_eng',
    learning_area_name: 'ภาษาต่างประเทศ',
    color: '#4F46E5',
    head_teacher_id: 'te008',
    head_teacher_name: 'นายคฑาอินทร์ อารมณ์สวะ',
    description: 'สาขาวิชาภาษาอังกฤษและภาษาต่างประเทศที่สอง',
  },
  // ภายใต้กลุ่มสาระการเรียนรู้สังคมศึกษาฯ
  {
    id: 'branch_soc',
    name: 'สาขาสังคมศึกษา',
    code: 'SOC',
    learning_area_id: 'dept_soc',
    learning_area_name: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
    color: '#16A34A',
    head_teacher_id: 'te011',
    head_teacher_name: 'นางภคนันท์ ศิริบุญ',
    description: 'สาขาวิชาสังคมศึกษา ศาสนา วัฒนธรรม และประวัติศาสตร์',
  },
  // ภายใต้กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา
  {
    id: 'branch_hpe',
    name: 'สาขาสุขศึกษาและพลศึกษา',
    code: 'HPE',
    learning_area_id: 'dept_hpe',
    learning_area_name: 'สุขศึกษาและพลศึกษา',
    color: '#DC2626',
    head_teacher_id: 'te018',
    head_teacher_name: 'สิบเอกอุดมศักดิ์ ทิพย์กระโทก',
    description: 'สาขาวิชาสุขศึกษา พลศึกษา และสุขภาพองค์รวม',
  },
  // ภายใต้กลุ่มสาระการเรียนรู้ศิลปะ
  {
    id: 'branch_art',
    name: 'สาขาศิลปะ',
    code: 'ART',
    learning_area_id: 'dept_art',
    learning_area_name: 'ศิลปะ',
    color: '#9333EA',
    head_teacher_id: 'te007',
    head_teacher_name: 'นายปิยะวัฒน์ พิมพ์ประสงค์',
    description: 'สาขาวิชาทัศนศิลป์ ดนตรี และนาฏศิลป์',
  },
  // ภายใต้กลุ่มสาระการเรียนรู้การงานอาชีพ
  {
    id: 'branch_occ',
    name: 'สาขาการงานอาชีพ',
    code: 'OCC',
    learning_area_id: 'dept_occ',
    learning_area_name: 'การงานอาชีพ',
    color: '#CA8A04',
    head_teacher_id: 'te022',
    head_teacher_name: 'นายศิรชัช ชนะค้า',
    description: 'สาขาวิชาการงานอาชีพและทักษะชีวิต',
  },
  // ภายใต้กิจกรรมพัฒนาผู้เรียน
  {
    id: 'branch_act',
    name: 'สาขากิจกรรมพัฒนาผู้เรียน',
    code: 'ACT',
    learning_area_id: 'dept_act',
    learning_area_name: 'กิจกรรมพัฒนาผู้เรียน',
    color: '#0D9488',
    head_teacher_id: 'te023',
    head_teacher_name: 'นางสาวชนัญดา แกล้วกล้า',
    description: 'สาขาวิชาแนะแนวและกิจกรรมพัฒนาผู้เรียน',
  },
  // ภายใต้กลุ่มบริหารงานวิชาการ
  {
    id: 'branch_acad',
    name: 'สาขาวิชาการและสารสนเทศ',
    code: 'ACAD',
    learning_area_id: 'dept_acad',
    learning_area_name: 'กลุ่มบริหารงานวิชาการและสารสนเทศ',
    color: '#1E293B',
    head_teacher_id: 'admin01',
    head_teacher_name: 'ผู้ดูแลระบบกลาง (System Administrator)',
    description: 'สาขางานวิชาการ หลักสูตร วัดผล และสารสนเทศ',
  },
];

// Default Workflows mapped to document types (มีทั้งหัวหน้ากลุ่มสาขา และ หัวหน้ากลุ่มสาระ)
export const DEFAULT_WORKFLOWS: ReviewWorkflowConfig[] = [
  {
    id: 'wf_summary_plan',
    name: 'สายงานตรวจแผนการจัดการเรียนรู้ฉบับย่อ (1 ลำดับขั้น)',
    description: 'ตรวจ 1 ขั้นตอน: หัวหน้ากลุ่มสาขาตรวจทานความถูกต้องและอนุมัติทันที',
    plan_type: 'แผนการจัดการเรียนรู้ฉบับย่อ',
    target_plan_types: ['แผนการจัดการเรียนรู้ฉบับย่อ', 'แผนย่อ', 'summary'],
    is_active: true,
    auto_assign_on_deadline: false,
    stages: [
      {
        id: 'stage_sum_1',
        order: 1,
        title: 'ขั้นที่ 1: หัวหน้ากลุ่มสาขาตรวจทานและอนุมัติ',
        description: 'หัวหน้ากลุ่มสาขาประจำวิชาของผู้ส่ง (เช่น หัวหน้าสาขาเทคโนโลยี/เคมี/ฟิสิกส์) ตรวจสอบความถูกต้องและอนุมัติ',
        evaluation_mode: 'approval_only', // 1. แบบกดอนุมัติ (Approve/Reject)
        reviewer_selection_type: 'role', // 2. ดึงจากตำแหน่ง
        assigned_role: 'submitter_branch_head', // หัวหน้ากลุ่มสาขาของผู้ส่ง
        auto_assign_enabled: false,
      },
    ],
  },
  {
    id: 'wf_full_plan',
    name: 'สายงานตรวจแผนการจัดการเรียนรู้ฉบับสมบูรณ์ (4 ลำดับขั้น)',
    description: 'ตรวจ 4 ขั้นตอน: หัวหน้ากลุ่มสาขาตรวจทาน ➔ หัวหน้ากลุ่มสาระกลั่นกรอง ➔ คณะกรรมการประเมินรูบริก ➔ ผู้อำนวยการอนุมัติ',
    plan_type: 'แผนการจัดการเรียนรู้ฉบับสมบูรณ์',
    target_plan_types: ['แผนการจัดการเรียนรู้ฉบับสมบูรณ์', 'แผนสมบูรณ์', 'full'],
    is_active: true,
    auto_assign_on_deadline: true,
    stages: [
      {
        id: 'stage_full_1',
        order: 1,
        title: 'ขั้นที่ 1: หัวหน้ากลุ่มสาขาตรวจทานความถูกต้องเชิงลึก',
        description: 'หัวหน้ากลุ่มสาขาประจำวิชาของผู้ส่ง ตรวจสอบเนื้อหารายวิชา กิจกรรมการเรียนรู้ และสื่ออุปกรณ์เชิงลึก',
        evaluation_mode: 'approval_only',
        reviewer_selection_type: 'role',
        assigned_role: 'submitter_branch_head', // หัวหน้ากลุ่มสาขาของผู้ส่ง
        auto_assign_enabled: false,
      },
      {
        id: 'stage_full_2',
        order: 2,
        title: 'ขั้นที่ 2: หัวหน้ากลุ่มสาระการเรียนรู้กลั่นกรองและรับรอง',
        description: 'หัวหน้ากลุ่มสาระการเรียนรู้ ตรวจสอบโครงสร้างแผนการสอนและมาตรฐานตัวชี้วัดในภาพรวมกลุ่มสาระ',
        evaluation_mode: 'approval_only',
        reviewer_selection_type: 'role',
        assigned_role: 'submitter_department_head', // หัวหน้ากลุ่มสาระของผู้ส่ง
        auto_assign_enabled: false,
      },
      {
        id: 'stage_full_3',
        order: 3,
        title: 'ขั้นที่ 3: คณะกรรมการผู้ทรงคุณวุฒิประเมินเกณฑ์รูบริก',
        description: 'ผู้ตรวจประเมินให้คะแนนรูบริก 5 ด้านตามเกณฑ์วิชาการ ว.PA พร้อมให้ข้อเสนอแนะเชิงพัฒนา',
        evaluation_mode: 'rubric_score',
        reviewer_selection_type: 'role',
        assigned_role: 'all_department_heads',
        auto_assign_enabled: true, // ระบบกระจายงานอัตโนมัติหารแบ่งเท่าๆ กัน
      },
      {
        id: 'stage_full_4',
        order: 4,
        title: 'ขั้นที่ 4: ผู้อำนวยการสถานศึกษาอนุมัติการใช้แผน',
        description: 'ฝ่ายบริหาร/ผู้อำนวยการ พิจารณาอนุมัติให้ใช้แผนการจัดการเรียนรู้ในห้องเรียนอย่างเป็นทางการ',
        evaluation_mode: 'approval_only',
        reviewer_selection_type: 'role',
        assigned_role: 'school_leadership',
        auto_assign_enabled: false,
      },
    ],
  },
  {
    id: 'wf_research_plan',
    name: 'สายงานตรวจรายงานการวิจัยในชั้นเรียน (CAR) (2 ลำดับขั้น)',
    description: 'ตรวจ 2 ขั้นตอน: คณะกรรมการวิชาการประเมินรูบริกงานวิจัย ➔ ผู้อำนวยการอนุมัติรับรอง',
    plan_type: 'รายงานการวิจัยในชั้นเรียน (CAR)',
    target_plan_types: ['รายงานการวิจัยในชั้นเรียน (CAR)', 'งานวิจัยในชั้นเรียน', 'วิจัยในชั้นเรียน', 'research', 'classroom_research'],
    is_active: true,
    auto_assign_on_deadline: true,
    stages: [
      {
        id: 'stage_res_1',
        order: 1,
        title: 'ขั้นที่ 1: คณะกรรมการงานวิจัยประเมินเกณฑ์รูบริก',
        description: 'ผู้ทรงคุณวุฒิประเมินระเบียบวิธีวิจัย การวิเคราะห์ผล และเครื่องมือนวัตกรรม',
        evaluation_mode: 'rubric_score',
        reviewer_selection_type: 'role',
        assigned_role: 'all_department_heads',
        auto_assign_enabled: true,
      },
      {
        id: 'stage_res_2',
        order: 2,
        title: 'ขั้นที่ 2: ฝ่ายบริหาร/ผู้อำนวยการอนุมัติรับรองงานวิจัย',
        description: 'ผู้อำนวยการพิจารณาอนุมัติรับรองเพื่อใช้ในการพัฒนาการเรียนการสอนและประเมินผลงาน',
        evaluation_mode: 'approval_only',
        reviewer_selection_type: 'role',
        assigned_role: 'school_leadership',
        auto_assign_enabled: false,
      },
    ],
  },
  {
    id: 'wf_general_plan',
    name: 'สายงานตรวจเอกสารทั่วไป / รายงานโครงการ (1 ลำดับขั้น)',
    description: 'ตรวจ 1 ขั้นตอน: ผู้ดูแลระบบหรือหัวหน้างานตรวจสอบความเรียบร้อยและอนุมัติ',
    plan_type: 'เอกสารทั่วไป',
    target_plan_types: ['เอกสารทั่วไป', 'รายงานโครงการ', 'general', 'other'],
    is_active: true,
    auto_assign_on_deadline: false,
    stages: [
      {
        id: 'stage_gen_1',
        order: 1,
        title: 'ขั้นที่ 1: ผู้ดูแลระบบหรือหัวหน้างานตรวจสอบและลงนามรับรอง',
        description: 'ตรวจสอบความเรียบร้อยของเอกสารและอนุมัติรับรองผลงาน',
        evaluation_mode: 'approval_only',
        reviewer_selection_type: 'role',
        assigned_role: 'all_admins',
        auto_assign_enabled: false,
      },
    ],
  },
];

// ==========================================
// 1. Department Storage & Management Functions
// ==========================================

export function getLocalDepartments(): DepartmentConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DEPARTMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_DEPARTMENTS;
}

export function saveLocalDepartments(depts: DepartmentConfig[]): void {
  localStorage.setItem(STORAGE_KEY_DEPARTMENTS, JSON.stringify(depts));
}

export async function getSavedDepartments(): Promise<DepartmentConfig[]> {
  const local = getLocalDepartments();
  try {
    const res = await fetchSystemSetting<DepartmentConfig[]>('school_departments', local);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      saveLocalDepartments(res.data);
      return res.data;
    }
  } catch (e) {
    console.warn('Error fetching departments from cloud:', e);
  }
  return local;
}

export async function saveDepartments(
  depts: DepartmentConfig[]
): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
  saveLocalDepartments(depts);
  try {
    return await saveSystemSetting('school_departments', depts);
  } catch (err: any) {
    return { success: false, isSupabase: false, error: err?.message };
  }
}

/**
 * Appoints a teacher as Head of Department (แต่งตั้งหัวหน้าสาขา)
 */
export async function appointDepartmentHead(
  deptId: string,
  teacherId: string,
  allTeachers: Teacher[],
  departments: DepartmentConfig[]
): Promise<{ success: boolean; updatedDepartments: DepartmentConfig[]; updatedTeachers: Teacher[] }> {
  const deptIdx = departments.findIndex((d) => d.id === deptId);
  if (deptIdx === -1) return { success: false, updatedDepartments: departments, updatedTeachers: allTeachers };

  const targetTeacher = allTeachers.find((t) => t.Teacher_ID === teacherId);
  if (!targetTeacher) return { success: false, updatedDepartments: departments, updatedTeachers: allTeachers };

  // Previous head of this department (if any)
  const prevHeadId = departments[deptIdx].head_teacher_id;

  const updatedTeachers = allTeachers.map((t) => {
    if (t.Teacher_ID === teacherId) {
      return {
        ...t,
        role: (t.role === 'admin' ? 'admin' : 'head_of_department') as any,
        is_head_of_department: true,
        department: departments[deptIdx].name,
      };
    }
    // Revert old head if different
    if (prevHeadId && t.Teacher_ID === prevHeadId && prevHeadId !== teacherId && t.role === 'head_of_department') {
      return {
        ...t,
        role: 'teacher' as any,
        is_head_of_department: false,
      };
    }
    return t;
  });

  const updatedDepartments = [...departments];
  updatedDepartments[deptIdx] = {
    ...updatedDepartments[deptIdx],
    head_teacher_id: targetTeacher.Teacher_ID,
    head_teacher_name: targetTeacher.Name,
  };

  // Persist
  await saveDepartments(updatedDepartments);
  saveLocalTeachers(updatedTeachers);
  saveSystemSetting('school_teachers_all', updatedTeachers).catch(() => {});
  const updatedTeacherObj = updatedTeachers.find((t) => t.Teacher_ID === teacherId);
  if (updatedTeacherObj) {
    await updateTeacherRecord(updatedTeacherObj);
  }
  if (prevHeadId && prevHeadId !== teacherId) {
    const prevTeacherObj = updatedTeachers.find((t) => t.Teacher_ID === prevHeadId);
    if (prevTeacherObj) await updateTeacherRecord(prevTeacherObj);
  }

  return { success: true, updatedDepartments, updatedTeachers };
}

/**
 * Removes appointment of Head of Department
 */
export async function removeDepartmentHead(
  deptId: string,
  allTeachers: Teacher[],
  departments: DepartmentConfig[]
): Promise<{ success: boolean; updatedDepartments: DepartmentConfig[]; updatedTeachers: Teacher[] }> {
  const deptIdx = departments.findIndex((d) => d.id === deptId);
  if (deptIdx === -1) return { success: false, updatedDepartments: departments, updatedTeachers: allTeachers };

  const currentHeadId = departments[deptIdx].head_teacher_id;

  const updatedTeachers = allTeachers.map((t) => {
    if (currentHeadId && t.Teacher_ID === currentHeadId && t.role === 'head_of_department') {
      return {
        ...t,
        role: 'teacher' as any,
        is_head_of_department: false,
      };
    }
    return t;
  });

  const updatedDepartments = [...departments];
  updatedDepartments[deptIdx] = {
    ...updatedDepartments[deptIdx],
    head_teacher_id: undefined,
    head_teacher_name: undefined,
  };

  await saveDepartments(updatedDepartments);
  saveLocalTeachers(updatedTeachers);
  saveSystemSetting('school_teachers_all', updatedTeachers).catch(() => {});
  if (currentHeadId) {
    const updatedTeacherObj = updatedTeachers.find((t) => t.Teacher_ID === currentHeadId);
    if (updatedTeacherObj) await updateTeacherRecord(updatedTeacherObj);
  }

  return { success: true, updatedDepartments, updatedTeachers };
}

/**
 * Assigns or moves a teacher to a department (กลุ่มสาระการเรียนรู้)
 */
export async function assignTeacherToDepartment(
  teacherId: string,
  departmentName: string,
  allTeachers: Teacher[]
): Promise<{ success: boolean; updatedTeachers: Teacher[] }> {
  const teacher = allTeachers.find((t) => t.Teacher_ID === teacherId);
  if (!teacher) return { success: false, updatedTeachers: allTeachers };

  const updatedTeachers = allTeachers.map((t) =>
    t.Teacher_ID === teacherId
      ? {
          ...t,
          Learning_Area: departmentName,
          department: departmentName,
        }
      : t
  );

  saveLocalTeachers(updatedTeachers);
  saveSystemSetting('school_teachers_all', updatedTeachers).catch(() => {});

  const updatedObj = updatedTeachers.find((t) => t.Teacher_ID === teacherId);
  if (updatedObj) {
    await updateTeacherRecord(updatedObj);
  }

  return { success: true, updatedTeachers };
}

// ==========================================
// 2. Branch (สาขาวิชา / กลุ่มสาขา) Storage & Management Functions
// ==========================================

export function getLocalBranches(): BranchConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BRANCHES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_BRANCHES;
}

export function saveLocalBranches(branches: BranchConfig[]): void {
  localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(branches));
}

export async function getSavedBranches(): Promise<BranchConfig[]> {
  const local = getLocalBranches();
  try {
    const res = await fetchSystemSetting<BranchConfig[]>('school_branches', local);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      saveLocalBranches(res.data);
      return res.data;
    }
  } catch (e) {
    console.warn('Error fetching branches from cloud:', e);
  }
  return local;
}

export async function saveBranches(
  branches: BranchConfig[]
): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
  saveLocalBranches(branches);
  try {
    return await saveSystemSetting('school_branches', branches);
  } catch (err: any) {
    return { success: false, isSupabase: false, error: err?.message };
  }
}

/**
 * Appoints a teacher as Head of Branch (แต่งตั้งหัวหน้ากลุ่มสาขา / หัวหน้าสาขาวิชา)
 */
export async function appointBranchHead(
  branchId: string,
  teacherId: string,
  allTeachers: Teacher[],
  branches: BranchConfig[]
): Promise<{ success: boolean; updatedBranches: BranchConfig[]; updatedTeachers: Teacher[] }> {
  const branchIdx = branches.findIndex((b) => b.id === branchId);
  if (branchIdx === -1) return { success: false, updatedBranches: branches, updatedTeachers: allTeachers };

  const targetTeacher = allTeachers.find((t) => t.Teacher_ID === teacherId);
  if (!targetTeacher) return { success: false, updatedBranches: branches, updatedTeachers: allTeachers };

  const prevHeadId = branches[branchIdx].head_teacher_id;

  const updatedTeachers = allTeachers.map((t) => {
    if (t.Teacher_ID === teacherId) {
      return {
        ...t,
        role: (t.role === 'admin' ? 'admin' : t.role === 'head_of_department' ? 'head_of_department' : 'head_of_branch') as any,
        is_head_of_branch: true,
        branch: branches[branchIdx].name,
      };
    }
    // Revert old head if different and not department head
    if (prevHeadId && t.Teacher_ID === prevHeadId && prevHeadId !== teacherId && t.role === 'head_of_branch') {
      return {
        ...t,
        role: (t.is_head_of_department ? 'head_of_department' : 'teacher') as any,
        is_head_of_branch: false,
      };
    }
    return t;
  });

  const updatedBranches = [...branches];
  updatedBranches[branchIdx] = {
    ...updatedBranches[branchIdx],
    head_teacher_id: targetTeacher.Teacher_ID,
    head_teacher_name: targetTeacher.Name,
  };

  // Persist
  await saveBranches(updatedBranches);
  saveLocalTeachers(updatedTeachers);
  saveSystemSetting('school_teachers_all', updatedTeachers).catch(() => {});
  const updatedTeacherObj = updatedTeachers.find((t) => t.Teacher_ID === teacherId);
  if (updatedTeacherObj) {
    await updateTeacherRecord(updatedTeacherObj);
  }
  if (prevHeadId && prevHeadId !== teacherId) {
    const prevTeacherObj = updatedTeachers.find((t) => t.Teacher_ID === prevHeadId);
    if (prevTeacherObj) await updateTeacherRecord(prevTeacherObj);
  }

  return { success: true, updatedBranches, updatedTeachers };
}

/**
 * Removes appointment of Head of Branch (ถอดถอนหัวหน้ากลุ่มสาขา)
 */
export async function removeBranchHead(
  branchId: string,
  allTeachers: Teacher[],
  branches: BranchConfig[]
): Promise<{ success: boolean; updatedBranches: BranchConfig[]; updatedTeachers: Teacher[] }> {
  const branchIdx = branches.findIndex((b) => b.id === branchId);
  if (branchIdx === -1) return { success: false, updatedBranches: branches, updatedTeachers: allTeachers };

  const currentHeadId = branches[branchIdx].head_teacher_id;

  const updatedTeachers = allTeachers.map((t) => {
    if (currentHeadId && t.Teacher_ID === currentHeadId) {
      return {
        ...t,
        role: (t.is_head_of_department ? 'head_of_department' : t.role === 'admin' ? 'admin' : 'teacher') as any,
        is_head_of_branch: false,
      };
    }
    return t;
  });

  const updatedBranches = [...branches];
  updatedBranches[branchIdx] = {
    ...updatedBranches[branchIdx],
    head_teacher_id: undefined,
    head_teacher_name: undefined,
  };

  await saveBranches(updatedBranches);
  saveLocalTeachers(updatedTeachers);
  saveSystemSetting('school_teachers_all', updatedTeachers).catch(() => {});
  if (currentHeadId) {
    const updatedTeacherObj = updatedTeachers.find((t) => t.Teacher_ID === currentHeadId);
    if (updatedTeacherObj) await updateTeacherRecord(updatedTeacherObj);
  }

  return { success: true, updatedBranches, updatedTeachers };
}

/**
 * Assigns a teacher to a branch (สาขาวิชา)
 */
export async function assignTeacherToBranch(
  teacherId: string,
  branchName: string,
  allTeachers: Teacher[]
): Promise<{ success: boolean; updatedTeachers: Teacher[] }> {
  const teacher = allTeachers.find((t) => t.Teacher_ID === teacherId);
  if (!teacher) return { success: false, updatedTeachers: allTeachers };

  const updatedTeachers = allTeachers.map((t) =>
    t.Teacher_ID === teacherId
      ? {
          ...t,
          branch: branchName,
        }
      : t
  );

  saveLocalTeachers(updatedTeachers);
  saveSystemSetting('school_teachers_all', updatedTeachers).catch(() => {});

  const updatedObj = updatedTeachers.find((t) => t.Teacher_ID === teacherId);
  if (updatedObj) {
    await updateTeacherRecord(updatedObj);
  }

  return { success: true, updatedTeachers };
}

/**
 * Assigns a teacher to both department and branch
 */
export async function assignTeacherToDepartmentAndBranch(
  teacherId: string,
  departmentName: string,
  branchName: string,
  allTeachers: Teacher[]
): Promise<{ success: boolean; updatedTeachers: Teacher[] }> {
  const teacher = allTeachers.find((t) => t.Teacher_ID === teacherId);
  if (!teacher) return { success: false, updatedTeachers: allTeachers };

  const updatedTeachers = allTeachers.map((t) =>
    t.Teacher_ID === teacherId
      ? {
          ...t,
          Learning_Area: departmentName,
          branch: branchName,
        }
      : t
  );

  saveLocalTeachers(updatedTeachers);
  saveSystemSetting('school_teachers_all', updatedTeachers).catch(() => {});

  const updatedObj = updatedTeachers.find((t) => t.Teacher_ID === teacherId);
  if (updatedObj) {
    await updateTeacherRecord(updatedObj);
  }

  return { success: true, updatedTeachers };
}

/**
 * Removes a teacher from a department (Learning Area)
 */
export async function removeTeacherFromDepartment(
  teacherId: string,
  allTeachers: Teacher[],
  departments: DepartmentConfig[]
): Promise<{ success: boolean; updatedTeachers: Teacher[]; updatedDepartments: DepartmentConfig[] }> {
  const teacher = allTeachers.find((t) => t.Teacher_ID === teacherId);
  if (!teacher) return { success: false, updatedTeachers: allTeachers, updatedDepartments: departments };

  let updatedDepartments = [...departments];
  const isHeadOfAny = departments.some((d) => d.head_teacher_id === teacherId);
  if (isHeadOfAny) {
    updatedDepartments = updatedDepartments.map((d) =>
      d.head_teacher_id === teacherId
        ? { ...d, head_teacher_id: undefined, head_teacher_name: undefined }
        : d
    );
    await saveDepartments(updatedDepartments);
  }

  const updatedTeachers = allTeachers.map((t) =>
    t.Teacher_ID === teacherId
      ? {
          ...t,
          Learning_Area: '',
          department: '',
          is_head_of_department: false,
          role: (t.is_head_of_branch ? 'head_of_branch' : t.role === 'admin' ? 'admin' : 'teacher') as any,
        }
      : t
  );

  saveLocalTeachers(updatedTeachers);
  saveSystemSetting('school_teachers_all', updatedTeachers).catch(() => {});

  const updatedObj = updatedTeachers.find((t) => t.Teacher_ID === teacherId);
  if (updatedObj) {
    await updateTeacherRecord(updatedObj);
  }

  return { success: true, updatedTeachers, updatedDepartments };
}

/**
 * Removes a teacher from a branch (Discipline)
 */
export async function removeTeacherFromBranch(
  teacherId: string,
  allTeachers: Teacher[],
  branches: BranchConfig[]
): Promise<{ success: boolean; updatedTeachers: Teacher[]; updatedBranches: BranchConfig[] }> {
  const teacher = allTeachers.find((t) => t.Teacher_ID === teacherId);
  if (!teacher) return { success: false, updatedTeachers: allTeachers, updatedBranches: branches };

  let updatedBranches = [...branches];
  const isHeadOfAny = branches.some((b) => b.head_teacher_id === teacherId);
  if (isHeadOfAny) {
    updatedBranches = updatedBranches.map((b) =>
      b.head_teacher_id === teacherId
        ? { ...b, head_teacher_id: undefined, head_teacher_name: undefined }
        : b
    );
    await saveBranches(updatedBranches);
  }

  const updatedTeachers = allTeachers.map((t) =>
    t.Teacher_ID === teacherId
      ? {
          ...t,
          branch: '',
          is_head_of_branch: false,
          role: (t.is_head_of_department ? 'head_of_department' : t.role === 'admin' ? 'admin' : 'teacher') as any,
        }
      : t
  );

  saveLocalTeachers(updatedTeachers);
  saveSystemSetting('school_teachers_all', updatedTeachers).catch(() => {});

  const updatedObj = updatedTeachers.find((t) => t.Teacher_ID === teacherId);
  if (updatedObj) {
    await updateTeacherRecord(updatedObj);
  }

  return { success: true, updatedTeachers, updatedBranches };
}

// ==========================================
// 2. Workflow Storage & Engine Functions
// ==========================================

export function getLocalWorkflows(): ReviewWorkflowConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORKFLOWS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If parsed list contains only 1 legacy workflow, merge with new presets so document types are ready
        if (parsed.length === 1 && parsed[0].id === 'wf_standard_3stages') {
          return DEFAULT_WORKFLOWS;
        }
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_WORKFLOWS;
}

export function saveLocalWorkflows(workflows: ReviewWorkflowConfig[]): void {
  localStorage.setItem(STORAGE_KEY_WORKFLOWS, JSON.stringify(workflows));
}

export async function getSavedWorkflows(): Promise<ReviewWorkflowConfig[]> {
  const local = getLocalWorkflows();
  try {
    const res = await fetchSystemSetting<ReviewWorkflowConfig[]>('review_workflows', local);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      saveLocalWorkflows(res.data);
      return res.data;
    }
  } catch (e) {
    console.warn('Error fetching workflows from cloud:', e);
  }
  return local;
}

/**
 * Resolves the specific ReviewWorkflowConfig mapped to a plan based on:
 * 1. Plan's explicit workflow_id
 * 2. Document type exact match or target_plan_types inclusion
 * 3. Document title/type heuristic keyword matching (ย่อ, สมบูรณ์, วิจัย, etc.)
 * 4. Fallback to active or default workflow
 */
export function getWorkflowForPlan(
  plan?: { workflow_id?: string; plan_type?: string; plan_title?: string } | null,
  workflows: ReviewWorkflowConfig[] = getLocalWorkflows()
): ReviewWorkflowConfig {
  const currentWorkflows = workflows && workflows.length > 0 ? workflows : DEFAULT_WORKFLOWS;

  if (!plan) return currentWorkflows[0] || DEFAULT_WORKFLOWS[0];

  // 1. By explicit workflow_id
  if (plan.workflow_id) {
    const found = currentWorkflows.find((w) => w.id === plan.workflow_id);
    if (found) return found;
  }

  const pType = (plan.plan_type || plan.plan_title || '').trim().toLowerCase();

  // 2. Exact match in plan_type or target_plan_types
  for (const wf of currentWorkflows) {
    if (wf.plan_type && wf.plan_type !== 'all') {
      const wfType = wf.plan_type.trim().toLowerCase();
      if (pType === wfType || pType.includes(wfType) || wfType.includes(pType)) {
        return wf;
      }
    }
    if (Array.isArray(wf.target_plan_types)) {
      for (const t of wf.target_plan_types) {
        const lowerT = t.trim().toLowerCase();
        if (pType === lowerT || pType.includes(lowerT) || lowerT.includes(pType)) {
          return wf;
        }
      }
    }
  }

  // 3. Keyword heuristic matching for standard document categories
  if (pType.includes('ย่อ')) {
    const summary = currentWorkflows.find(
      (w) => w.id === 'wf_summary_plan' || (w.plan_type && w.plan_type.includes('ย่อ'))
    );
    if (summary) return summary;
  }
  if (pType.includes('สมบูรณ์')) {
    const full = currentWorkflows.find(
      (w) => w.id === 'wf_full_plan' || (w.plan_type && w.plan_type.includes('สมบูรณ์'))
    );
    if (full) return full;
  }
  if (pType.includes('วิจัย') || pType.includes('car')) {
    const res = currentWorkflows.find(
      (w) =>
        w.id === 'wf_research_plan' ||
        (w.plan_type && (w.plan_type.includes('วิจัย') || w.plan_type.includes('car')))
    );
    if (res) return res;
  }

  // 4. Fallback to active workflow or first available
  return currentWorkflows.find((w) => w.is_active) || currentWorkflows[0] || DEFAULT_WORKFLOWS[0];
}

/**
 * Attaches the appropriate workflow metadata (workflow_id, total_stages, current_stage_order)
 * to a plan before submission or saving.
 */
export function assignWorkflowToPlan(
  plan: LessonPlan,
  workflows: ReviewWorkflowConfig[] = getLocalWorkflows()
): LessonPlan {
  const targetWf = getWorkflowForPlan(plan, workflows);
  const totalStages = targetWf?.stages?.length || 1;
  const currentStageOrder =
    plan.current_stage_order && plan.current_stage_order >= 1
      ? Math.min(plan.current_stage_order, totalStages)
      : 1;

  return {
    ...plan,
    workflow_id: targetWf.id,
    total_stages: totalStages,
    current_stage_order: currentStageOrder,
    stage_reviews: plan.stage_reviews || [],
  };
}

export async function saveWorkflows(
  workflows: ReviewWorkflowConfig[]
): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
  saveLocalWorkflows(workflows);
  try {
    return await saveSystemSetting('review_workflows', workflows);
  } catch (err: any) {
    return { success: false, isSupabase: false, error: err?.message };
  }
}

/**
 * Resolves the eligible reviewer list for a specific plan at a specific stage
 */
export function resolveReviewersForStage(
  stage: ReviewStageConfig,
  plan: LessonPlan,
  allTeachers: Teacher[],
  departments: DepartmentConfig[],
  branches: BranchConfig[] = getLocalBranches()
): Teacher[] {
  if (!stage) return [];

  const submitterTeacher = allTeachers.find((t) => t.Teacher_ID === plan.teacher_id);
  const planBranch = (plan.branch || submitterTeacher?.branch || '').trim();
  const planLearningArea = (plan.learning_area || submitterTeacher?.Learning_Area || '').trim();

  // 1. ระบุชื่อรายบุคคล (Specific Teachers)
  if (stage.reviewer_selection_type === 'individual') {
    if (!stage.assigned_teacher_ids || stage.assigned_teacher_ids.length === 0) {
      return [];
    }
    const idSet = new Set(stage.assigned_teacher_ids);
    return allTeachers.filter((t) => idSet.has(t.Teacher_ID));
  }

  // 2. เลือกยกทั้งกลุ่มสาระการเรียนรู้ (Entire Learning Area)
  if (stage.reviewer_selection_type === 'department') {
    if (!stage.assigned_departments || stage.assigned_departments.length === 0) {
      return [];
    }
    const targetDepts = new Set(stage.assigned_departments);
    const isSubmitterDept = targetDepts.has('submitter_department');

    return allTeachers.filter((t) => {
      if (isSubmitterDept && t.Learning_Area.trim().toLowerCase() === planLearningArea.toLowerCase()) {
        return true;
      }
      return targetDepts.has(t.Learning_Area.trim());
    });
  }

  // 3. เลือกยกทั้งสาขาวิชา (Entire Branch)
  if (stage.reviewer_selection_type === 'branch') {
    const assignedBranches = stage.assigned_branches || [];
    if (assignedBranches.length === 0) {
      return [];
    }
    const targetBranches = new Set(assignedBranches);
    const isSubmitterBranch = targetBranches.has('submitter_branch');

    return allTeachers.filter((t) => {
      const teacherBranch = (t.branch || '').trim();
      if (isSubmitterBranch && planBranch && teacherBranch.toLowerCase() === planBranch.toLowerCase()) {
        return true;
      }
      return targetBranches.has(teacherBranch);
    });
  }

  // 4. เลือกจากตำแหน่ง (Role / Position)
  if (stage.reviewer_selection_type === 'role') {
    const role = stage.assigned_role;

    // A. หัวหน้ากลุ่มสาขาประจำวิชาของผู้ส่ง (Submitter's Branch Head - เช่น หัวหน้าสาขาเทคโนโลยี, หัวหน้าสาขาฟิสิกส์, หัวหน้าสาขาเคมี)
    if (role === 'submitter_branch_head') {
      if (planBranch) {
        const branchMatch = branches.find(
          (b) =>
            b.name.trim().toLowerCase() === planBranch.toLowerCase() ||
            planBranch.toLowerCase().includes(b.name.trim().toLowerCase()) ||
            b.name.trim().toLowerCase().includes(planBranch.toLowerCase())
        );

        if (branchMatch && branchMatch.head_teacher_id) {
          const head = allTeachers.find((t) => t.Teacher_ID === branchMatch.head_teacher_id);
          if (head) return [head];
        }

        // Fallback: look for teacher in same branch with role or flag
        const fallbackBranchHead = allTeachers.find(
          (t) =>
            (t.branch || '').trim().toLowerCase() === planBranch.toLowerCase() &&
            (isBranchHead(t) || t.role === 'head_of_branch')
        );
        if (fallbackBranchHead) return [fallbackBranchHead];
      }

      // If branch head not found, fallback to department head
      const planDept = departments.find(
        (d) =>
          d.name.trim().toLowerCase() === planLearningArea.toLowerCase() ||
          planLearningArea.toLowerCase().includes(d.name.trim().toLowerCase()) ||
          d.name.trim().toLowerCase().includes(planLearningArea.toLowerCase())
      );
      if (planDept && planDept.head_teacher_id) {
        const deptHead = allTeachers.find((t) => t.Teacher_ID === planDept.head_teacher_id);
        if (deptHead) return [deptHead];
      }

      return allTeachers.filter((t) => isTeacherAdmin(t));
    }

    // B. หัวหน้ากลุ่มสาระประจำวิชาของผู้ส่ง (Submitter's Department Head - เช่น หัวหน้ากลุ่มสาระวิทยาศาสตร์และเทคโนโลยี)
    if (role === 'submitter_department_head') {
      const planDept = departments.find(
        (d) =>
          d.name.trim().toLowerCase() === planLearningArea.toLowerCase() ||
          planLearningArea.toLowerCase().includes(d.name.trim().toLowerCase()) ||
          d.name.trim().toLowerCase().includes(planLearningArea.toLowerCase())
      );

      if (planDept && planDept.head_teacher_id) {
        const head = allTeachers.find((t) => t.Teacher_ID === planDept.head_teacher_id);
        if (head) return [head];
      }

      // Fallback: look for teacher in same area with role head_of_department
      const fallbackHead = allTeachers.find(
        (t) =>
          t.Learning_Area.trim().toLowerCase() === planLearningArea.toLowerCase() &&
          isDepartmentHead(t)
      );
      if (fallbackHead) return [fallbackHead];

      // Fallback to academic admins if department head is not yet appointed
      return allTeachers.filter((t) => isTeacherAdmin(t));
    }

    // C. หัวหน้ากลุ่มสาขาทุกคน (All Branch Heads)
    if (role === 'all_branch_heads') {
      const headIds = new Set(
        branches.map((b) => b.head_teacher_id).filter(Boolean) as string[]
      );
      const heads = allTeachers.filter(
        (t) => headIds.has(t.Teacher_ID) || isBranchHead(t)
      );
      if (heads.length > 0) return heads;
      return allTeachers.filter((t) => isTeacherAdmin(t));
    }

    // D. หัวหน้ากลุ่มสาระทุกคน (All Department Heads)
    if (role === 'all_department_heads') {
      const headIds = new Set(
        departments.map((d) => d.head_teacher_id).filter(Boolean) as string[]
      );
      const heads = allTeachers.filter(
        (t) => headIds.has(t.Teacher_ID) || isDepartmentHead(t)
      );
      if (heads.length > 0) return heads;
      return allTeachers.filter((t) => isTeacherAdmin(t));
    }

    // E. ฝ่ายบริหารสถานศึกษา (School Leadership / Director)
    if (role === 'school_leadership') {
      const leaders = allTeachers.filter(
        (t) =>
          isTeacherExecutive(t) ||
          t.Teacher_ID === 'admin03' ||
          t.position?.includes('ผู้อำนวยการ') ||
          t.role === 'academic_director'
      );
      if (leaders.length > 0) return leaders;
      return allTeachers.filter((t) => isTeacherAdmin(t));
    }

    // F. ผู้ดูแลระบบทุกคน (All Admins)
    if (role === 'all_admins') {
      return allTeachers.filter((t) => isTeacherAdmin(t));
    }
  }

  // Default fallback
  return allTeachers.filter((t) => isTeacherAdmin(t));
}

/**
 * 4. ระบบกระจายงานอัตโนมัติ (Auto-assign / Workload Balancer)
 * Distributes plans in the specified stage evenly among eligible reviewers.
 */
export function autoAssignPlansForStage(
  plans: LessonPlan[],
  stage: ReviewStageConfig,
  allTeachers: Teacher[],
  departments: DepartmentConfig[],
  branches: BranchConfig[] = getLocalBranches()
): {
  updatedPlans: LessonPlan[];
  assignedCount: number;
  reviewerWorkload: Record<string, { teacher: Teacher; count: number }>;
} {
  const currentStageOrder = stage.order;

  // Find plans that are currently waiting in this stage
  const eligiblePlans = plans.filter((p) => {
    const planStage = p.current_stage_order || 1;
    return planStage === currentStageOrder && p.status !== 'approved' && p.status !== 'deleted';
  });

  if (eligiblePlans.length === 0) {
    return { updatedPlans: plans, assignedCount: 0, reviewerWorkload: {} };
  }

  // Track distribution per reviewer
  const workload: Record<string, { teacher: Teacher; count: number }> = {};

  // For each plan, find who is eligible
  const updatedPlans = plans.map((p) => {
    const planStage = p.current_stage_order || 1;
    if (planStage !== currentStageOrder || p.status === 'approved' || p.status === 'deleted') {
      return p;
    }

    // Resolve candidates
    const candidates = resolveReviewersForStage(stage, p, allTeachers, departments, branches);
    if (candidates.length === 0) return p;

    // Initialize workload tracking for newly discovered candidates
    candidates.forEach((c) => {
      if (!workload[c.Teacher_ID]) {
        workload[c.Teacher_ID] = { teacher: c, count: 0 };
      }
    });

    // Select candidate with the MINIMUM currently assigned workload (balanced distribution)
    const sortedCandidates = [...candidates].sort((a, b) => {
      const countA = workload[a.Teacher_ID]?.count || 0;
      const countB = workload[b.Teacher_ID]?.count || 0;
      return countA - countB;
    });

    const chosen = sortedCandidates[0];
    workload[chosen.Teacher_ID].count += 1;

    return {
      ...p,
      assigned_reviewer_id: chosen.Teacher_ID,
      assigned_reviewer_name: chosen.Name,
    };
  });

  return {
    updatedPlans,
    assignedCount: eligiblePlans.length,
    reviewerWorkload: workload,
  };
}

/**
 * Helper to advance a plan to next stage upon approval or handle revision
 */
export function advancePlanStage(
  plan: LessonPlan,
  workflow: ReviewWorkflowConfig,
  reviewRecord: StageReviewRecord,
  reviewer: Teacher
): LessonPlan {
  const currentReviews = plan.stage_reviews || [];
  const updatedReviews = [
    ...currentReviews.filter((r) => r.stage_id !== reviewRecord.stage_id),
    reviewRecord,
  ];

  const totalStages = workflow.stages.length;
  const currentStageOrder = plan.current_stage_order || 1;

  // Case 1: Revision requested or rejected
  if (reviewRecord.status === 'needs_revision' || reviewRecord.status === 'rejected') {
    return {
      ...plan,
      status: 'needs_revision',
      reviewed_by: reviewer.Teacher_ID,
      reviewer_name: reviewer.Name,
      reviewed_at: reviewRecord.reviewed_at || new Date().toISOString(),
      review_comment: reviewRecord.comment || plan.review_comment,
      rubric_scores: reviewRecord.rubric_scores || plan.rubric_scores,
      total_score: reviewRecord.total_score ?? plan.total_score,
      stage_reviews: updatedReviews,
    };
  }

  // Case 2: Approved / Passed
  const hasNextStage = currentStageOrder < totalStages;

  if (hasNextStage) {
    const nextStage = workflow.stages.find((s) => s.order === currentStageOrder + 1);
    return {
      ...plan,
      status: 'submitted', // Still pending in next stage
      current_stage_order: currentStageOrder + 1,
      total_stages: totalStages,
      stage_reviews: updatedReviews,
      admin_notes: `ผ่านขั้นที่ ${currentStageOrder} (${reviewRecord.stage_title}) เรียบร้อยแล้ว กำลังรอ ${nextStage?.title || 'ขั้นถัดไป'}`,
    };
  }

  // Case 3: Final stage approved!
  return {
    ...plan,
    status: 'approved',
    current_stage_order: totalStages,
    total_stages: totalStages,
    reviewed_by: reviewer.Teacher_ID,
    reviewer_name: reviewer.Name,
    reviewed_at: reviewRecord.reviewed_at || new Date().toISOString(),
    review_comment: reviewRecord.comment || plan.review_comment,
    rubric_scores: reviewRecord.rubric_scores || plan.rubric_scores,
    total_score: reviewRecord.total_score ?? plan.total_score,
    stage_reviews: updatedReviews,
  };
}

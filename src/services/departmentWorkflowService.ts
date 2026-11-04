import {
  DepartmentConfig,
  ReviewWorkflowConfig,
  ReviewStageConfig,
  StageReviewRecord,
  Teacher,
  LessonPlan,
  isTeacherAdmin,
  isTeacherExecutive,
} from '../types';
import {
  fetchSystemSetting,
  saveSystemSetting,
  updateTeacherRecord,
} from './supabaseClient';

const STORAGE_KEY_DEPARTMENTS = 'lp_school_departments';
const STORAGE_KEY_WORKFLOWS = 'lp_review_workflows';

// Standard 10 Learning Areas (สาขา/กลุ่มสาระ) of PCSHS Kalasin
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
    head_teacher_id: 'te008',
    head_teacher_name: 'นายอดุลย์ พลทะยาน',
    description: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์และสถิติประยุกต์',
  },
  {
    id: 'dept_tha',
    name: 'ภาษาไทย',
    code: 'THA',
    color: '#EA580C', // Orange
    head_teacher_id: 'te013',
    head_teacher_name: 'นางสาวทิพาพร มุงคุณศรี',
    description: 'กลุ่มสาระการเรียนรู้ภาษาไทย วรรณคดี และการสื่อสาร',
  },
  {
    id: 'dept_eng',
    name: 'ภาษาต่างประเทศ',
    code: 'ENG',
    color: '#4F46E5', // Indigo
    head_teacher_id: 'te015',
    head_teacher_name: 'นางสาววิภาพร สารธิยากุล',
    description: 'กลุ่มสาระการเรียนรู้ภาษาอังกฤษ ภาษาญี่ปุ่น และภาษาที่สาม',
  },
  {
    id: 'dept_soc',
    name: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
    code: 'SOC',
    color: '#16A34A', // Green
    head_teacher_id: 'te018',
    head_teacher_name: 'นายอัครเดช บัวระภา',
    description: 'กลุ่มสาระการเรียนรู้สังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง',
  },
  {
    id: 'dept_hpe',
    name: 'สุขศึกษาและพลศึกษา',
    code: 'HPE',
    color: '#DC2626', // Red
    head_teacher_id: 'te020',
    head_teacher_name: 'นายกิตติศักดิ์ คำพวง',
    description: 'กลุ่มสาระการเรียนรู้สุขศึกษา พลศึกษา และสุขภาพองค์รวม',
  },
  {
    id: 'dept_art',
    name: 'ศิลปะ',
    code: 'ART',
    color: '#9333EA', // Purple
    head_teacher_id: 'te021',
    head_teacher_name: 'นายจตุพร โสมดี',
    description: 'กลุ่มสาระการเรียนรู้ทัศนศิลป์ ดนตรี และนาฏศิลป์',
  },
  {
    id: 'dept_occ',
    name: 'การงานอาชีพ',
    code: 'OCC',
    color: '#CA8A04', // Yellow gold
    head_teacher_id: 'te022',
    head_teacher_name: 'นางลัดดาวัลย์ สุระโคตร',
    description: 'กลุ่มสาระการเรียนรู้การงานอาชีพ ทักษะชีวิต และเทคโนโลยีการเกษตร',
  },
  {
    id: 'dept_act',
    name: 'กิจกรรมพัฒนาผู้เรียน',
    code: 'ACT',
    color: '#0D9488', // Teal
    head_teacher_id: 'te023',
    head_teacher_name: 'นางสาววิชุดา ภูสอดสี',
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

// Default Workflows mapped to document types (รูปแบบที่ 1: ผูกสายงานและจำนวนขั้นตามประเภทเอกสาร)
export const DEFAULT_WORKFLOWS: ReviewWorkflowConfig[] = [
  {
    id: 'wf_summary_plan',
    name: 'สายงานตรวจแผนการจัดการเรียนรู้ฉบับย่อ (1 ลำดับขั้น)',
    description: 'ตรวจ 1 ขั้นตอน: หัวหน้ากลุ่มสาระตรวจทานความถูกต้องและอนุมัติทันที',
    plan_type: 'แผนการจัดการเรียนรู้ฉบับย่อ',
    target_plan_types: ['แผนการจัดการเรียนรู้ฉบับย่อ', 'แผนย่อ', 'summary'],
    is_active: true,
    auto_assign_on_deadline: false,
    stages: [
      {
        id: 'stage_sum_1',
        order: 1,
        title: 'ขั้นที่ 1: หัวหน้ากลุ่มสาระตรวจทานและอนุมัติ',
        description: 'หัวหน้าสาขา/กลุ่มสาระประจำวิชาของผู้ส่ง ตรวจสอบความถูกต้องและอนุมัติการใช้งาน',
        evaluation_mode: 'approval_only', // 1. แบบกดอนุมัติ (Approve/Reject)
        reviewer_selection_type: 'role', // 2. ดึงจากตำแหน่ง
        assigned_role: 'submitter_department_head', // หัวหน้ากลุ่มสาระของผู้ส่ง
        auto_assign_enabled: false,
      },
    ],
  },
  {
    id: 'wf_full_plan',
    name: 'สายงานตรวจแผนการจัดการเรียนรู้ฉบับสมบูรณ์ (3 ลำดับขั้น)',
    description: 'ตรวจ 3 ขั้นตอน: หัวหน้ากลุ่มสาระตรวจทาน ➔ คณะกรรมการประเมินรูบริก ➔ ผู้อำนวยการอนุมัติ',
    plan_type: 'แผนการจัดการเรียนรู้ฉบับสมบูรณ์',
    target_plan_types: ['แผนการจัดการเรียนรู้ฉบับสมบูรณ์', 'แผนสมบูรณ์', 'full'],
    is_active: true,
    auto_assign_on_deadline: true,
    stages: [
      {
        id: 'stage_full_1',
        order: 1,
        title: 'ขั้นที่ 1: หัวหน้ากลุ่มสาระตรวจทานความสมบูรณ์',
        description: 'หัวหน้าสาขา/กลุ่มสาระประจำวิชาของผู้ส่ง ตรวจสอบโครงสร้างแผนการสอนและมาตรฐานตัวชี้วัด',
        evaluation_mode: 'approval_only',
        reviewer_selection_type: 'role',
        assigned_role: 'submitter_department_head',
        auto_assign_enabled: false,
      },
      {
        id: 'stage_full_2',
        order: 2,
        title: 'ขั้นที่ 2: คณะกรรมการผู้ทรงคุณวุฒิประเมินเกณฑ์รูบริก',
        description: 'ผู้ตรวจประเมินให้คะแนนรูบริก 5 ด้านตามเกณฑ์วิชาการ ว.PA พร้อมให้ข้อเสนอแนะเชิงพัฒนา',
        evaluation_mode: 'rubric_score',
        reviewer_selection_type: 'role',
        assigned_role: 'all_department_heads',
        auto_assign_enabled: true, // ระบบกระจายงานอัตโนมัติหารแบ่งเท่าๆ กัน
      },
      {
        id: 'stage_full_3',
        order: 3,
        title: 'ขั้นที่ 3: ผู้อำนวยการสถานศึกษาอนุมัติการใช้แผน',
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
  if (currentHeadId) {
    const updatedTeacherObj = updatedTeachers.find((t) => t.Teacher_ID === currentHeadId);
    if (updatedTeacherObj) await updateTeacherRecord(updatedTeacherObj);
  }

  return { success: true, updatedDepartments, updatedTeachers };
}

/**
 * Assigns or moves a teacher to a department
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

  const updatedObj = updatedTeachers.find((t) => t.Teacher_ID === teacherId);
  if (updatedObj) {
    await updateTeacherRecord(updatedObj);
  }

  return { success: true, updatedTeachers };
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
  departments: DepartmentConfig[]
): Teacher[] {
  if (!stage) return [];

  // 1. ระบุชื่อรายบุคคล (Specific Teachers)
  if (stage.reviewer_selection_type === 'individual') {
    if (!stage.assigned_teacher_ids || stage.assigned_teacher_ids.length === 0) {
      return [];
    }
    const idSet = new Set(stage.assigned_teacher_ids);
    return allTeachers.filter((t) => idSet.has(t.Teacher_ID));
  }

  // 2. เลือกยกทั้งกลุ่มสาระ (Entire Department)
  if (stage.reviewer_selection_type === 'department') {
    if (!stage.assigned_departments || stage.assigned_departments.length === 0) {
      return [];
    }
    const targetDepts = new Set(stage.assigned_departments);
    const isSubmitterDept = targetDepts.has('submitter_department');

    return allTeachers.filter((t) => {
      if (isSubmitterDept && t.Learning_Area.trim() === plan.learning_area.trim()) {
        return true;
      }
      return targetDepts.has(t.Learning_Area.trim());
    });
  }

  // 3. เลือกจากตำแหน่ง (Role / Position)
  if (stage.reviewer_selection_type === 'role') {
    const role = stage.assigned_role;

    // หัวหน้ากลุ่มสาระประจำวิชาของผู้ส่ง (Submitter's Department Head)
    if (role === 'submitter_department_head') {
      const planDept = departments.find(
        (d) =>
          d.name.trim().toLowerCase() === plan.learning_area.trim().toLowerCase() ||
          plan.learning_area.trim().toLowerCase().includes(d.name.trim().toLowerCase()) ||
          d.name.trim().toLowerCase().includes(plan.learning_area.trim().toLowerCase())
      );

      if (planDept && planDept.head_teacher_id) {
        const head = allTeachers.find((t) => t.Teacher_ID === planDept.head_teacher_id);
        if (head) return [head];
      }

      // Fallback: look for teacher in same area with role head_of_department
      const fallbackHead = allTeachers.find(
        (t) =>
          t.Learning_Area.trim() === plan.learning_area.trim() &&
          (t.role === 'head_of_department' || t.is_head_of_department)
      );
      if (fallbackHead) return [fallbackHead];

      // Fallback to academic admins if department head is not yet appointed
      return allTeachers.filter((t) => isTeacherAdmin(t));
    }

    // หัวหน้าสาขาทุกคน (All Department Heads)
    if (role === 'all_department_heads') {
      const headIds = new Set(
        departments.map((d) => d.head_teacher_id).filter(Boolean) as string[]
      );
      const heads = allTeachers.filter(
        (t) =>
          headIds.has(t.Teacher_ID) ||
          t.role === 'head_of_department' ||
          t.is_head_of_department === true
      );
      if (heads.length > 0) return heads;
      // If none appointed yet, fallback to admins
      return allTeachers.filter((t) => isTeacherAdmin(t));
    }

    // ฝ่ายบริหารสถานศึกษา (School Leadership / Director)
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

    // ผู้ดูแลระบบทุกคน (All Admins)
    if (role === 'all_admins') {
      return allTeachers.filter((t) => isTeacherAdmin(t));
    }
  }

  // Default fallback
  return allTeachers.filter((t) => isTeacherAdmin(t));
}

/**
 * 3. ระบบกระจายงานอัตโนมัติ (Auto-assign / Workload Balancer)
 * Distributes plans in the specified stage evenly among eligible reviewers.
 */
export function autoAssignPlansForStage(
  plans: LessonPlan[],
  stage: ReviewStageConfig,
  allTeachers: Teacher[],
  departments: DepartmentConfig[]
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
    const candidates = resolveReviewersForStage(stage, p, allTeachers, departments);
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

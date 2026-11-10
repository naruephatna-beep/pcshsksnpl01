import React, { useState, useMemo } from 'react';
import {
  ReviewWorkflowConfig,
  ReviewStageConfig,
  ReviewerSelectionType,
  ReviewerRoleType,
  ReviewScopeMode,
  Teacher,
  LessonPlan,
  DepartmentConfig,
  BranchConfig,
  PlanTypeDeadlineConfig,
} from '../types';
import {
  DEFAULT_WORKFLOWS,
  DEFAULT_BRANCHES,
  saveWorkflows,
  autoAssignPlansForStage,
  resolveReviewersForStage,
} from '../services/departmentWorkflowService';
import { savePlanRecord } from '../services/supabaseClient';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  X,
  Workflow,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  UserCheck,
  Building2,
  Crown,
  Users,
  ShieldCheck,
  Sparkles,
  Zap,
  Info,
  Layers,
  Award,
  CheckCircle2,
  FileCheck2,
  AlertCircle,
  RotateCcw,
  BookOpen,
  FileText,
  Tag,
  GitFork,
  Shuffle,
  Target,
  Play,
  Settings,
} from 'lucide-react';

interface WorkflowManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflows: ReviewWorkflowConfig[];
  onUpdateWorkflows: (workflows: ReviewWorkflowConfig[]) => void;
  teachers: Teacher[];
  departments: DepartmentConfig[];
  branches?: BranchConfig[];
  plans: LessonPlan[];
  onUpdatePlans: (plans: LessonPlan[]) => void;
  deadlineConfigs?: PlanTypeDeadlineConfig[];
}

export const WorkflowManagerModal: React.FC<WorkflowManagerModalProps> = ({
  isOpen,
  onClose,
  workflows,
  onUpdateWorkflows,
  teachers,
  departments,
  branches = DEFAULT_BRANCHES,
  plans,
  onUpdatePlans,
  deadlineConfigs,
}) => {
  // 1. Gather all ACTUAL document types registered in the school system
  const actualDocumentTypes = useMemo(() => {
    const list: string[] = [];
    const addIfNew = (name?: string) => {
      const clean = name?.trim();
      if (!clean) return;
      // Do not include generic placeholder 'เอกสารทั่วไป' (ไม่ใช่ประเภทเอกสารจริงของโรงเรียน)
      if (clean === 'เอกสารทั่วไป' || clean.toLowerCase() === 'general') return;
      if (!list.includes(clean)) {
        list.push(clean);
      }
    };

    // 1. Prioritize active tasks from school deadline configurations (ภาระงานจริงที่โรงเรียนตั้งค่าไว้)
    if (deadlineConfigs && deadlineConfigs.length > 0) {
      deadlineConfigs
        .filter((d) => d.is_active !== false)
        .forEach((d) => addIfNew(d.name));
    }

    // 2. Ensure core academic categories exist only if not already represented in active deadlines
    const hasSummary = list.some((t) => t.includes('ย่อ'));
    if (!hasSummary) addIfNew('แผนการจัดการเรียนรู้ฉบับย่อ');

    const hasFull = list.some((t) => t.includes('สมบูรณ์'));
    if (!hasFull) addIfNew('แผนการจัดการเรียนรู้ฉบับสมบูรณ์');

    const hasResearch = list.some((t) => t.includes('วิจัย') || t.includes('CAR'));
    if (!hasResearch) addIfNew('รายงานการวิจัยในชั้นเรียน (CAR)');

    // 3. Add any other custom document types with actual teacher submissions
    if (plans && plans.length > 0) {
      plans.forEach((p) => {
        if (p.plan_type && p.plan_type !== 'เอกสารทั่วไป' && p.plan_type.toLowerCase() !== 'general') {
          addIfNew(p.plan_type);
        }
      });
    }

    return list;
  }, [deadlineConfigs, plans]);

  // 2. Initialize workflows guaranteeing that EVERY actual document type has a dedicated workflow
  const initialWorkflows = useMemo(() => {
    const rawList: ReviewWorkflowConfig[] =
      workflows && workflows.length > 0 ? [...workflows] : [...DEFAULT_WORKFLOWS];

    // Filter out dummy 'wf_general_plan' and 'เอกสารทั่วไป'
    const baseList = rawList.filter(
      (w) => w.id !== 'wf_general_plan' && w.plan_type !== 'เอกสารทั่วไป'
    );

    actualDocumentTypes.forEach((docType) => {
      const exists = baseList.some(
        (w) =>
          w.plan_type?.toLowerCase() === docType.toLowerCase() ||
          w.target_plan_types?.some((t) => t.toLowerCase() === docType.toLowerCase()) ||
          (docType.includes('ย่อ') && (w.id === 'wf_summary_plan' || w.plan_type?.includes('ย่อ'))) ||
          (docType.includes('สมบูรณ์') && (w.id === 'wf_full_plan' || w.plan_type?.includes('สมบูรณ์'))) ||
          ((docType.includes('วิจัย') || docType.includes('CAR')) && (w.id === 'wf_research_plan' || w.plan_type?.includes('วิจัย')))
      );

      if (!exists) {
        // Auto-provision a dedicated workflow for this actual document type
        const newId = `wf_doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        baseList.push({
          id: newId,
          name: `สายงานตรวจ${docType}`,
          description: `กำหนดขั้นตอนการอนุมัติสำหรับเอกสารประเภท: ${docType}`,
          plan_type: docType,
          target_plan_types: [docType],
          is_active: true,
          auto_assign_on_deadline: false,
          stages: [
            {
              id: `stage_${Date.now()}_1`,
              order: 1,
              title: 'ขั้นที่ 1: หัวหน้ากลุ่มสาขาวิชาตรวจทาน',
              description: 'หัวหน้ากลุ่มสาขาประจำวิชาของผู้ส่งตรวจสอบความถูกต้อง',
              evaluation_mode: 'approval_only',
              reviewer_selection_type: 'role',
              assigned_role: 'submitter_branch_head',
              scope_mode: 'own_group_only',
              auto_assign_enabled: false,
            },
            {
              id: `stage_${Date.now()}_2`,
              order: 2,
              title: 'ขั้นที่ 2: หัวหน้ากลุ่มสาระการเรียนรู้กลั่นกรองและอนุมัติ',
              description: 'หัวหน้ากลุ่มสาระการเรียนรู้ตรวจสอบและอนุมัติ',
              evaluation_mode: 'approval_only',
              reviewer_selection_type: 'role',
              assigned_role: 'submitter_department_head',
              scope_mode: 'own_group_only',
              auto_assign_enabled: false,
            },
          ],
        });
      }
    });

    return baseList;
  }, [workflows, actualDocumentTypes]);

  const [allWorkflows, setAllWorkflows] = useState<ReviewWorkflowConfig[]>(initialWorkflows);

  // Active document type selected by user
  const [selectedDocType, setSelectedDocType] = useState<string>(
    actualDocumentTypes[0] || 'แผนการจัดการเรียนรู้ฉบับย่อ'
  );

  // Current active workflow mapped to the selected actual document type
  const currentWorkflow = useMemo(() => {
    // 1. Exact match
    const found = allWorkflows.find(
      (w) =>
        w.plan_type?.toLowerCase() === selectedDocType.toLowerCase() ||
        w.target_plan_types?.some((t) => t.toLowerCase() === selectedDocType.toLowerCase())
    );
    if (found) return found;

    // 2. Keyword matching
    if (selectedDocType.includes('ย่อ')) {
      const summary = allWorkflows.find((w) => w.id === 'wf_summary_plan' || w.plan_type?.includes('ย่อ'));
      if (summary) return summary;
    }
    if (selectedDocType.includes('สมบูรณ์')) {
      const full = allWorkflows.find((w) => w.id === 'wf_full_plan' || w.plan_type?.includes('สมบูรณ์'));
      if (full) return full;
    }
    if (selectedDocType.includes('วิจัย') || selectedDocType.includes('CAR')) {
      const res = allWorkflows.find((w) => w.id === 'wf_research_plan' || w.plan_type?.includes('วิจัย'));
      if (res) return res;
    }

    return allWorkflows[0] || DEFAULT_WORKFLOWS[0];
  }, [allWorkflows, selectedDocType]);

  const stages = currentWorkflow?.stages || [];

  // Active stage being edited or expanded
  const [expandedStageId, setExpandedStageId] = useState<string | null>(stages[0]?.id || null);

  // New document type inline modal
  const [isAddDocTypeModalOpen, setIsAddDocTypeModalOpen] = useState(false);
  const [newDocTypeName, setNewDocTypeName] = useState('');

  // Simulation test: sample submitter & collapsible toggle
  const [sampleSubmitterId, setSampleSubmitterId] = useState<string>(
    teachers[0]?.Teacher_ID || 'te028'
  );
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);

  // Auto-assign simulation / execution notice
  const [autoAssignResult, setAutoAssignResult] = useState<{
    stageTitle: string;
    assignedCount: number;
    distribution: Record<string, { name: string; count: number }>;
  } | null>(null);

  const [toastNotice, setToastNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastNotice({ message, type });
    setTimeout(() => setToastNotice(null), 3500);
  };

  // Helper to update current workflow
  const updateCurrentWorkflow = (patch: Partial<ReviewWorkflowConfig>) => {
    setAllWorkflows((prev) =>
      prev.map((w) => (w.id === currentWorkflow.id ? { ...w, ...patch } : w))
    );
  };

  // Add new stage
  const handleAddStage = () => {
    const newOrder = stages.length + 1;
    const newStage: ReviewStageConfig = {
      id: `stage_${Date.now()}`,
      order: newOrder,
      title: `ขั้นที่ ${newOrder}: ตรวจประเมินขั้นตอนที่ ${newOrder}`,
      description: `การตรวจประเมินลำดับขั้นที่ ${newOrder}`,
      evaluation_mode: 'approval_only', // Default: approval
      reviewer_selection_type: 'role', // Default: role
      assigned_role: 'submitter_department_head',
      scope_mode: 'own_group_only',
      auto_assign_enabled: false,
    };
    const updatedStages = [...stages, newStage];
    updateCurrentWorkflow({ stages: updatedStages });
    setExpandedStageId(newStage.id);
    showToast(`เพิ่มขั้นตอนที่ ${newOrder} ให้กับประเภทเอกสาร "${selectedDocType}" เรียบร้อยแล้ว`);
  };

  // Remove a stage
  const handleRemoveStage = (stageId: string) => {
    if (stages.length <= 1) {
      showToast('ต้องมีสายงานการอนุมัติอย่างน้อย 1 ขั้นตอน', 'error');
      return;
    }
    const updatedStages = stages
      .filter((s) => s.id !== stageId)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    updateCurrentWorkflow({ stages: updatedStages });
    if (expandedStageId === stageId && updatedStages.length > 0) {
      setExpandedStageId(updatedStages[0].id);
    }
    showToast('ลบขั้นตอนเรียบร้อยแล้ว');
  };

  // Move stage order Up or Down
  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;

    const list = [...stages];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const reordered = list.map((s, idx) => ({ ...s, order: idx + 1 }));
    updateCurrentWorkflow({ stages: reordered });
  };

  // Update specific fields of a stage
  const handleUpdateStage = (stageId: string, patch: Partial<ReviewStageConfig>) => {
    const updatedStages = stages.map((s) => (s.id === stageId ? { ...s, ...patch } : s));
    updateCurrentWorkflow({ stages: updatedStages });
  };

  // Add a brand new actual document type and its dedicated workflow
  const handleCreateNewDocType = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newDocTypeName.trim();
    if (!cleanName) return;

    if (actualDocumentTypes.includes(cleanName)) {
      showToast(`มีประเภทเอกสาร "${cleanName}" อยู่แล้ว`, 'error');
      setSelectedDocType(cleanName);
      setIsAddDocTypeModalOpen(false);
      return;
    }

    const newId = `wf_custom_${Date.now()}`;
    const newWf: ReviewWorkflowConfig = {
      id: newId,
      name: `สายงานตรวจ${cleanName}`,
      description: `กำหนดขั้นตอนการอนุมัติสำหรับ: ${cleanName}`,
      plan_type: cleanName,
      target_plan_types: [cleanName],
      is_active: true,
      auto_assign_on_deadline: false,
      stages: [
        {
          id: `stage_init_${Date.now()}`,
          order: 1,
          title: 'ขั้นที่ 1: หัวหน้ากลุ่มสาขาตรวจทาน',
          description: 'หัวหน้ากลุ่มสาขาประจำวิชาของผู้ส่งตรวจสอบความถูกต้อง',
          evaluation_mode: 'approval_only',
          reviewer_selection_type: 'role',
          assigned_role: 'submitter_branch_head',
          scope_mode: 'own_group_only',
          auto_assign_enabled: false,
        },
        {
          id: `stage_init2_${Date.now()}`,
          order: 2,
          title: 'ขั้นที่ 2: หัวหน้ากลุ่มสาระการเรียนรู้กลั่นกรองและอนุมัติ',
          description: 'หัวหน้ากลุ่มสาระการเรียนรู้ตรวจสอบและอนุมัติ',
          evaluation_mode: 'approval_only',
          reviewer_selection_type: 'role',
          assigned_role: 'submitter_department_head',
          scope_mode: 'own_group_only',
          auto_assign_enabled: false,
        },
      ],
    };

    const updatedList = [...allWorkflows, newWf];
    setAllWorkflows(updatedList);
    setSelectedDocType(cleanName);
    setExpandedStageId(newWf.stages[0].id);
    setNewDocTypeName('');
    setIsAddDocTypeModalOpen(false);
    showToast(`เพิ่มประเภทเอกสาร "${cleanName}" พร้อมสร้างสายงานอนุมัติเรียบร้อยแล้ว`);
  };

  // Reset to default presets
  const handleResetToDefaults = () => {
    setAllWorkflows(DEFAULT_WORKFLOWS);
    setSelectedDocType('แผนการจัดการเรียนรู้ฉบับย่อ');
    setExpandedStageId(DEFAULT_WORKFLOWS[0].stages[0].id);
    showToast('รีเซ็ตสายงานเป็นค่ามาตรฐานเรียบร้อยแล้ว');
  };

  // Save all workflow changes to state and database
  const handleSaveAll = async () => {
    onUpdateWorkflows(allWorkflows);
    await saveWorkflows(allWorkflows);
    showToast('บันทึกการตั้งค่าสายงานและผู้ตรวจของทุกประเภทเอกสารสำเร็จแล้ว!');
  };

  // Run Auto-assign for a specific stage
  const handleExecuteAutoAssign = async (stage: ReviewStageConfig) => {
    const candidatePlans = plans.filter((p) => {
      if (p.workflow_id === currentWorkflow.id) return true;
      const type = (p.plan_type || '').toLowerCase();
      if (currentWorkflow.target_plan_types?.some((t) => type.includes(t.toLowerCase()))) return true;
      if (currentWorkflow.plan_type && type.includes(currentWorkflow.plan_type.toLowerCase())) return true;
      return false;
    });

    const targetPlans = candidatePlans.length > 0 ? candidatePlans : plans;
    const res = autoAssignPlansForStage(targetPlans, stage, teachers, departments);
    if (res.assignedCount === 0) {
      showToast(
        `ไม่พบเอกสารใน "${stage.title}" ของประเภทเอกสารนี้ที่รอตรวจ`,
        'error'
      );
      return;
    }

    // 1. Merge updated plans back into full plans array
    const updatedMap = new Map<string, LessonPlan>();
    res.updatedPlans.forEach((p) => updatedMap.set(p.id, p));
    const allUpdatedPlans = plans.map((p) => updatedMap.get(p.id) || p);

    // 2. Update React state in App.tsx
    onUpdatePlans(allUpdatedPlans);

    // 3. Persist modified plans to database and local storage
    const modifiedList = res.updatedPlans.filter((p) => {
      const original = plans.find((orig) => orig.id === p.id);
      return original?.assigned_reviewer_id !== p.assigned_reviewer_id;
    });

    if (modifiedList.length > 0) {
      Promise.all(modifiedList.map((p) => savePlanRecord(p))).catch((err) => {
        console.warn('Error persisting auto-assigned plans to cloud:', err);
      });
    }

    const dist: Record<string, { name: string; count: number }> = {};
    if (res.reviewerWorkload) {
      Object.entries(res.reviewerWorkload).forEach(([tId, info]) => {
        dist[tId] = { name: info.teacher?.Name || tId, count: info.count };
      });
    }

    setAutoAssignResult({
      stageTitle: stage.title,
      assignedCount: res.assignedCount,
      distribution: dist,
    });

    showToast(`สุ่มกระจายงานสำเร็จ! แบ่งเอกสาร ${res.assignedCount} รายการให้ผู้ตรวจเท่าๆ กันเรียบร้อย`);
  };

  // Simulate routing for sample submitter teacher
  const sampleTeacher = teachers.find((t) => t.Teacher_ID === sampleSubmitterId) || teachers[0];
  const simulatedRoute = useMemo(() => {
    if (!sampleTeacher) return [];
    const mockPlan: LessonPlan = {
      id: 'mock_sim',
      teacher_id: sampleTeacher.Teacher_ID,
      teacher_name: sampleTeacher.Name,
      learning_area: sampleTeacher.Learning_Area,
      branch: sampleTeacher.branch || '',
      subject_name: 'วิชาตัวอย่าง',
      subject_code: 'ว30000',
      grade_level: 'ม.4',
      semester: '1/2569',
      academic_year: '2569',
      total_hours: 40,
      file_name: 'sample_document.pdf',
      plan_type: selectedDocType,
      plan_title: `เอกสารตัวอย่าง (${selectedDocType})`,
      file_url: '#',
      submitted_at: new Date().toISOString(),
      status: 'submitted',
      workflow_id: currentWorkflow.id,
    };

    return stages.map((s) => {
      const candidates = resolveReviewersForStage(s, mockPlan, teachers, departments, branches);
      return {
        stageOrder: s.order,
        stageTitle: s.title,
        evaluationMode: s.evaluation_mode,
        candidates,
      };
    });
  }, [sampleTeacher, selectedDocType, currentWorkflow.id, stages, teachers, departments, branches]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0B1329] text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-400/20 shrink-0">
              <Workflow className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
                  Document-Driven Approval Workflows
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-300">จ.ภ. กาฬสินธุ์</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                การตั้งค่าสายงานอนุมัติ ผู้ตรวจ & ลำดับการประเมินแยกตามประเภทเอกสาร
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice toast */}
        {toastNotice && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 shrink-0 ${
              toastNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-b border-rose-200'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastNotice.message}</span>
          </div>
        )}

        {/* Primary Actual Document Types Dropdown Bar (เลือกประเภทเอกสารแบบ Dropdown คลีน สบายตา) */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
          <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-xl">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <FileCheck2 className="w-4 h-4 text-amber-600" />
              <span>ประเภทเอกสาร:</span>
            </span>

            {/* Dropdown Select */}
            <div className="relative flex-1 min-w-0">
              <select
                value={selectedDocType}
                onChange={(e) => {
                  const docType = e.target.value;
                  setSelectedDocType(docType);
                  const matchingWf = allWorkflows.find(
                    (w) =>
                      w.plan_type === docType ||
                      w.target_plan_types?.includes(docType) ||
                      (docType.includes('ย่อ') && (w.id === 'wf_summary_plan' || w.plan_type?.includes('ย่อ'))) ||
                      (docType.includes('สมบูรณ์') && (w.id === 'wf_full_plan' || w.plan_type?.includes('สมบูรณ์'))) ||
                      ((docType.includes('วิจัย') || docType.includes('CAR')) && (w.id === 'wf_research_plan' || w.plan_type?.includes('วิจัย')))
                  );
                  setExpandedStageId(matchingWf?.stages?.[0]?.id || null);
                }}
                className="w-full pl-3.5 pr-9 py-2 bg-white border-2 border-slate-300 hover:border-amber-500 focus:border-amber-500 rounded-xl text-xs sm:text-sm font-extrabold text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer appearance-none transition-colors truncate"
              >
                {actualDocumentTypes.map((docType) => {
                  const matchingWf = allWorkflows.find(
                    (w) =>
                      w.plan_type === docType ||
                      w.target_plan_types?.includes(docType) ||
                      (docType.includes('ย่อ') && (w.id === 'wf_summary_plan' || w.plan_type?.includes('ย่อ'))) ||
                      (docType.includes('สมบูรณ์') && (w.id === 'wf_full_plan' || w.plan_type?.includes('สมบูรณ์'))) ||
                      ((docType.includes('วิจัย') || docType.includes('CAR')) && (w.id === 'wf_research_plan' || w.plan_type?.includes('วิจัย')))
                  );
                  const stageCount = matchingWf?.stages?.length || 2;
                  const docPlansCount = plans.filter((p) => (p.plan_type || '').trim() === docType).length;
                  const icon = docType.includes('ย่อ')
                    ? '📘'
                    : docType.includes('สมบูรณ์')
                    ? '📗'
                    : docType.includes('วิจัย') || docType.includes('CAR')
                    ? '🔬'
                    : '📄';

                  return (
                    <option key={docType} value={docType} className="py-1 text-slate-900">
                      {icon} {docType} ({stageCount} ลำดับขั้น{docPlansCount > 0 ? ` • ส่งแล้ว ${docPlansCount} รายการ` : ''})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddDocTypeModalOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-200 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="เพิ่มประเภทเอกสารใหม่ของโรงเรียน"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มประเภทเอกสาร</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefaults}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 px-2.5 py-2 rounded-xl hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
              title="รีเซ็ตสายงานเป็นค่ามาตรฐาน"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">รีเซ็ตค่ามาตรฐาน</span>
            </button>
          </div>
        </div>

        {/* Active Document Type Overview Header (กระชับ คลีน ไม่ซ้ำซ้อน) */}
        <div className="px-5 sm:px-6 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-500 shrink-0">ชื่อสายงาน:</span>
            <div className="flex-1 min-w-[200px] max-w-md">
              <input
                type="text"
                value={currentWorkflow.name}
                onChange={(e) => updateCurrentWorkflow({ name: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 w-full"
                placeholder="ชื่อสายงานอนุมัติ"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
                {stages.length} ลำดับขั้น
              </span>
              {plans.filter((p) => (p.plan_type || '').trim() === selectedDocType).length > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                  เอกสารจริง {plans.filter((p) => (p.plan_type || '').trim() === selectedDocType).length} ฉบับ
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAddStage}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>เพิ่มลำดับขั้นใหม่</span>
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-5">
          {/* 1. Visual Pipeline Diagram (ผังเส้นทางการอนุมัติจริง) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>เส้นทางการประเมินของเอกสารนี้ ({stages.length} ขั้นตอน)</span>
              </h4>
              <span className="text-[11px] text-slate-500">
                เมื่อครูส่งเอกสาร ระบบจะส่งตามลำดับขั้น 1 ➔ 2 ➔ 3 อัตโนมัติ
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <div className="px-3 py-2 bg-slate-100 rounded-xl border border-slate-200 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                <span className="font-semibold text-slate-800">1. คุณครูผู้สอนส่งงาน</span>
              </div>

              {stages.map((stage, idx) => {
                const isSelected = expandedStageId === stage.id;
                const isApproval = stage.evaluation_mode === 'approval_only';
                return (
                  <React.Fragment key={`pipe-${stage.id}`}>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    <button
                      type="button"
                      onClick={() => setExpandedStageId(stage.id)}
                      className={`px-3 py-2 rounded-xl text-xs border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-2xs ring-1 ring-amber-400/40'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-md bg-[#0B1329] text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0">
                        {stage.order}
                      </span>
                      <div className="truncate max-w-[160px]">
                        <span className="font-bold">{stage.title.split(':')[1]?.trim() || stage.title}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                          isApproval ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {isApproval ? 'อนุมัติ' : 'เกณฑ์รูบริก'}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}

              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-300 text-xs flex items-center gap-2 text-emerald-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>อนุมัติเสร็จสมบูรณ์ & สำเนาไฟล์เข้าไดรฟ์</span>
              </div>
            </div>
          </div>

          {/* 2. Collapsible Live Routing Simulator (พับเก็บได้ ไม่เกะกะสายตา) */}
          <div className="bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 rounded-2xl border border-amber-200/90 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
              className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-amber-100/40 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    🧪 ทดสอบจำลองเส้นทางตรวจจริง (Live Route Simulator)
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    คลิกเพื่อดูตัวอย่างว่าครูส่งงานแล้วจะถูกส่งไปยังผู้ตรวจท่านใด
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg hidden sm:inline">
                  {isSimulatorOpen ? '▲ ซ่อนการทดสอบ' : '▼ คลิกเพื่อทดสอบผู้ตรวจ'}
                </span>
                {isSimulatorOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-600 sm:hidden" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-600 sm:hidden" />
                )}
              </div>
            </button>

            {isSimulatorOpen && (
              <div className="p-4 sm:p-5 border-t border-amber-200/80 bg-white/80 space-y-3 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    เลือกจำลองครูผู้ส่งงานเพื่อดูเส้นทางผู้ตรวจ:
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600">สมมติครูผู้ส่งงาน:</label>
                    <select
                      value={sampleSubmitterId}
                      onChange={(e) => setSampleSubmitterId(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {teachers.map((t) => (
                        <option key={t.Teacher_ID} value={t.Teacher_ID}>
                          {t.Name} ({t.branch || t.Learning_Area || 'ไม่ระบุสาขา'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {simulatedRoute.map((sim) => (
                    <div
                      key={`sim-${sim.stageOrder}`}
                      className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-[#0B1329] text-amber-400 text-[10px] font-black flex items-center justify-center">
                            {sim.stageOrder}
                          </span>
                          <span>ขั้นที่ {sim.stageOrder}</span>
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                            sim.evaluationMode === 'approval_only'
                              ? 'bg-sky-50 text-sky-800 border border-sky-200'
                              : 'bg-purple-50 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {sim.evaluationMode === 'approval_only' ? 'แบบกดอนุมัติ' : 'แบบเกณฑ์รูบริก'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 font-medium">
                        {sim.candidates.length === 0 ? (
                          <span className="text-rose-600 text-[11px] font-bold">
                            ⚠️ ไม่พบผู้ตรวจที่ตรงเงื่อนไข (กรุณาตรวจสอบการแต่งตั้งหัวหน้า)
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-500 block">ผู้รับเอกสารไปตรวจ:</span>
                            {sim.candidates.map((c) => (
                              <div
                                key={c.Teacher_ID}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-950 font-bold text-[11px] mr-1.5 mb-1 border border-amber-200/80"
                              >
                                <UserCheck className="w-3 h-3 text-amber-600" />
                                <span>{c.Name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Auto-assign distribution notification */}
          {autoAssignResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-950">
                    ผลการกระจายงานอัตโนมัติ: {autoAssignResult.stageTitle}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoAssignResult(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-emerald-800">
                ระบบได้แบ่งภาระงานเอกสารให้ผู้ตรวจแต่ละคนในปริมาณที่เท่ากันเรียบร้อยแล้ว:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                {Object.entries(autoAssignResult.distribution).map(([tId, info]) => (
                  <div
                    key={tId}
                    className="p-2 bg-white/80 rounded-xl border border-emerald-200 text-xs flex items-center justify-between"
                  >
                    <span className="font-medium text-slate-800 truncate mr-2">{info.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] shrink-0">
                      {info.count} เล่ม
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Stages List & Detailed Editors */}
          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const isExpanded = expandedStageId === stage.id;
              const isApproval = stage.evaluation_mode === 'approval_only';
              const selectionType = stage.reviewer_selection_type;

              // Compute candidate reviewers for live preview
              const mockPlan: any = {
                id: 'preview',
                learning_area: departments[0]?.name || 'วิทยาศาสตร์และเทคโนโลยี',
              };
              const eligibleReviewers = resolveReviewersForStage(stage, mockPlan, teachers, departments, branches);

              return (
                <div
                  key={stage.id}
                  className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'border-amber-400 shadow-md ring-1 ring-amber-400/20'
                      : 'border-slate-200 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  {/* Stage Card Header */}
                  <div
                    onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer bg-white hover:bg-slate-50/60 select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#0B1329] text-amber-400 flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                        {stage.order}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {stage.title}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isApproval
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : 'bg-purple-50 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {isApproval ? 'แบบกดอนุมัติ (Approve)' : 'แบบให้คะแนนรูบริก (Rubric)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {stage.description || 'ไม่มีคำอธิบาย'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 mr-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveStage(idx, 'up');
                          }}
                          className={`p-1 rounded-lg border border-slate-200 transition-colors ${
                            idx === 0
                              ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
                          }`}
                          title="เลื่อนขึ้น"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          disabled={idx === stages.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveStage(idx, 'down');
                          }}
                          className={`p-1 rounded-lg border border-slate-200 transition-colors ${
                            idx === stages.length - 1
                              ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
                          }`}
                          title="เลื่อนลง"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {stages.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveStage(stage.id);
                          }}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                          title="ลบขั้นตอนนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="p-1 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Stage Detailed Config Form (When Expanded) */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/60 space-y-6">
                      {/* 1. Basic Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            ชื่อลำดับขั้นตอน <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={stage.title}
                            onChange={(e) => handleUpdateStage(stage.id, { title: e.target.value })}
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="เช่น ขั้นที่ 1: หัวหน้ากลุ่มสาระตรวจทาน"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            คำอธิบายขั้นตอน
                          </label>
                          <input
                            type="text"
                            value={stage.description || ''}
                            onChange={(e) => handleUpdateStage(stage.id, { description: e.target.value })}
                            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-normal text-slate-900 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="เช่น ตรวจสอบความถูกต้องของมาตรฐานตัวชี้วัด"
                          />
                        </div>
                      </div>

                      {/* 2. รูปแบบการประเมินในขั้นนี้ (Evaluation Mode) */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-600" />
                          <span>รูปแบบการประเมินในขั้นนี้ (Evaluation Mode)</span>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Option A: แบบกดอนุมัติ (Approve) */}
                          <div
                            onClick={() => handleUpdateStage(stage.id, { evaluation_mode: 'approval_only' })}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                              isApproval
                                ? 'bg-sky-50/80 border-sky-600 shadow-xs ring-1 ring-sky-600/20'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                      isApproval ? 'border-sky-600 bg-sky-600' : 'border-slate-300'
                                    }`}
                                  >
                                    {isApproval && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                  </div>
                                  <span className="text-xs font-bold text-slate-900">
                                    แบบกดอนุมัติ (Approve / Reject)
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                                  ผู้ตรวจตรวจสอบความเรียบร้อย แล้วกด อนุมัติ / ไม่อนุมัติ หรือ ส่งกลับแก้ไข พร้อมระบุข้อเสนอแนะ
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold shrink-0">
                                รวดเร็ว
                              </span>
                            </div>
                          </div>

                          {/* Option B: แบบให้คะแนน (Rubric) */}
                          <div
                            onClick={() => handleUpdateStage(stage.id, { evaluation_mode: 'rubric_score' })}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                              !isApproval
                                ? 'bg-purple-50/80 border-purple-600 shadow-xs ring-1 ring-purple-600/20'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                      !isApproval ? 'border-purple-600 bg-purple-600' : 'border-slate-300'
                                    }`}
                                  >
                                    {!isApproval && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                  </div>
                                  <span className="text-xs font-bold text-slate-900">
                                    แบบให้คะแนนรูบริก (Rubric Scoring)
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                                  ผู้ตรวจประเมินและให้คะแนนตามเกณฑ์รูบริก 5 ด้านตามเกณฑ์วิชาการ ว.PA พร้อมคำนวณระดับคุณภาพ
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold shrink-0">
                                ละเอียด
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. การเลือกผู้ตรวจในแต่ละขั้น (Reviewer Selection) */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-indigo-600" />
                            <span>ผู้ตรวจในขั้นนี้ (Reviewer Selection)</span>
                          </label>

                          <span className="text-[11px] text-indigo-900 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                            ผู้ตรวจที่มีสิทธิ์ในขั้นนี้: {eligibleReviewers.length} ท่าน
                          </span>
                        </div>

                        {/* Four Mode Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {/* Mode 1: เลือกจากตำแหน่ง */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStage(stage.id, { reviewer_selection_type: 'role' })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              selectionType === 'role'
                                ? 'bg-emerald-50/80 border-emerald-600 shadow-2xs font-bold text-emerald-950 ring-1 ring-emerald-600/20'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-emerald-600" />
                              <span className="text-xs">1. เลือกจากตำแหน่ง</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              หัวหน้าสาขา, หัวหน้ากลุ่มสาระ, ผอ.
                            </p>
                          </button>

                          {/* Mode 2: ระบุชื่อรายบุคคล */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStage(stage.id, { reviewer_selection_type: 'individual' })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              selectionType === 'individual'
                                ? 'bg-indigo-50/80 border-indigo-600 shadow-2xs font-bold text-indigo-950 ring-1 ring-indigo-600/20'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-indigo-600" />
                              <span className="text-xs">2. ระบุรายบุคคล</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              ติ๊กเลือกครูรายคนที่มอบหมาย
                            </p>
                          </button>

                          {/* Mode 3: เลือกยกทั้งกลุ่มสาระ */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStage(stage.id, { reviewer_selection_type: 'department' })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              selectionType === 'department'
                                ? 'bg-amber-50/80 border-amber-600 shadow-2xs font-bold text-amber-950 ring-1 ring-amber-600/20'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-amber-600" />
                              <span className="text-xs">3. ยกกลุ่มสาระ</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              ครูทั้งกลุ่มสาระของผู้ส่ง
                            </p>
                          </button>

                          {/* Mode 4: เลือกยกทั้งกลุ่มสาขาวิชา */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStage(stage.id, { reviewer_selection_type: 'branch' })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              selectionType === 'branch'
                                ? 'bg-sky-50/80 border-sky-600 shadow-2xs font-bold text-sky-950 ring-1 ring-sky-600/20'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <GitFork className="w-4 h-4 text-sky-600" />
                              <span className="text-xs">4. ยกกลุ่มสาขา</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              ครูในสาขาวิชาเดียวกัน
                            </p>
                          </button>
                        </div>

                        {/* Sub-form 1: เลือกจากตำแหน่ง (Role) */}
                        {selectionType === 'role' && (
                          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                            <span className="text-xs font-bold text-slate-800 block">
                              เลือกบทบาทตำแหน่งผู้ตรวจในขั้นนี้:
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                              {[
                                {
                                  role: 'submitter_branch_head' as ReviewerRoleType,
                                  title: 'หัวหน้ากลุ่มสาขาวิชา',
                                  badge: 'สาขาวิชา',
                                  desc: 'หัวหน้าสาขาวิชาประจำวิชาของผู้ส่ง (เช่น ฟิสิกส์, เคมี, ชีวะ, เทคโนโลยี)',
                                },
                                {
                                  role: 'submitter_department_head' as ReviewerRoleType,
                                  title: 'หัวหน้ากลุ่มสาระฯ',
                                  badge: 'กลุ่มสาระ',
                                  desc: 'หัวหน้ากลุ่มสาระการเรียนรู้ของผู้ส่ง (เช่น วิทย์ฯ, คณิต, ภาษาไทย)',
                                },
                                {
                                  role: 'school_leadership' as ReviewerRoleType,
                                  title: 'ฝ่ายบริหารสถานศึกษา',
                                  badge: 'ผู้บริหาร',
                                  desc: 'ผู้อำนวยการสถานศึกษา, รองผู้อำนวยการ, และคณะผู้บริหาร',
                                },
                                {
                                  role: 'all_admins' as ReviewerRoleType,
                                  title: 'แอดมินวิชาการ / ระบบกลาง',
                                  badge: 'แอดมิน',
                                  desc: 'ผู้ดูแลระบบกลางและคณะทำงานวิชาการของโรงเรียน',
                                },
                              ].map((item) => {
                                const isChecked =
                                  stage.assigned_role === item.role ||
                                  (item.role === 'all_admins' && (stage.assigned_role as string) === 'admin');
                                return (
                                  <div
                                    key={item.role}
                                    onClick={() => handleUpdateStage(stage.id, { assigned_role: item.role })}
                                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                      isChecked
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-xs'
                                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-slate-900">{item.title}</span>
                                      {isChecked ? (
                                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                      ) : (
                                        <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                          {item.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-normal leading-relaxed">
                                      {item.desc}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Sub-form 2: ระบุชื่อรายบุคคล */}
                        {selectionType === 'individual' && (
                          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800">
                                ติ๊กเลือกครูผู้ตรวจรายบุคคล ({stage.assigned_teacher_ids?.length || 0} คนที่เลือก):
                              </span>
                              <span className="text-slate-400 text-[11px]">ติ๊กถูกเพื่อเลือกหรือยกเลิก</span>
                            </div>

                            <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-1">
                              {teachers.map((t) => {
                                const isChecked = (stage.assigned_teacher_ids || []).includes(t.Teacher_ID);
                                return (
                                  <label
                                    key={t.Teacher_ID}
                                    className={`p-2 rounded-xl border text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                                      isChecked
                                        ? 'bg-indigo-50/60 border-indigo-300 text-indigo-950 font-bold'
                                        : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const currentIds = stage.assigned_teacher_ids || [];
                                        const nextIds = e.target.checked
                                          ? [...currentIds, t.Teacher_ID]
                                          : currentIds.filter((id) => id !== t.Teacher_ID);
                                        handleUpdateStage(stage.id, { assigned_teacher_ids: nextIds });
                                      }}
                                      className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="truncate">{t.Name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Sub-form 3: เลือกยกทั้งกลุ่มสาระ */}
                        {selectionType === 'department' && (
                          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                            <span className="text-xs font-bold text-slate-800 block">
                              เลือกกลุ่มสาระการเรียนรู้ที่รับผิดชอบการตรวจในขั้นนี้:
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {departments.map((dept) => {
                                const isChecked = (stage.assigned_departments || []).includes(dept.id);
                                return (
                                  <label
                                    key={dept.id}
                                    className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                                      isChecked
                                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const currentDepts = stage.assigned_departments || [];
                                        const nextDepts = e.target.checked
                                          ? [...currentDepts, dept.id]
                                          : currentDepts.filter((id) => id !== dept.id);
                                        handleUpdateStage(stage.id, { assigned_departments: nextDepts });
                                      }}
                                      className="rounded text-amber-600 focus:ring-amber-500"
                                    />
                                    <span className="truncate">{dept.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Sub-form 4: เลือกยกทั้งกลุ่มสาขา */}
                        {selectionType === 'branch' && (
                          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                            <span className="text-xs font-bold text-slate-800 block">
                              เลือกกลุ่มสาขาวิชาที่รับผิดชอบการตรวจในขั้นนี้:
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {branches.map((b) => {
                                const isChecked = (stage.assigned_branches || []).includes(b.id);
                                return (
                                  <label
                                    key={b.id}
                                    className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                                      isChecked
                                        ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold'
                                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const currentBranches = stage.assigned_branches || [];
                                        const nextBranches = e.target.checked
                                          ? [...currentBranches, b.id]
                                          : currentBranches.filter((id) => id !== b.id);
                                        handleUpdateStage(stage.id, { assigned_branches: nextBranches });
                                      }}
                                      className="rounded text-sky-600 focus:ring-sky-500"
                                    />
                                    <span className="truncate">{b.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 4. ขอบเขตการตรวจ (Review Scope) */}
                      <div className="space-y-2 pt-2 border-t border-slate-200/80">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Target className="w-4 h-4 text-emerald-600" />
                            <span>ขอบเขตการตรวจ (Review Scope)</span>
                          </label>
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            ⚙️ แอดมินตั้งค่า: ตรวจเฉพาะคนของตัวเอง หรือ สุ่มตรวจทุกคน
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            {
                              mode: 'own_group_only' as ReviewScopeMode,
                              title: '1. ตรวจเฉพาะคนของตัวเอง',
                              badge: 'สายตรงในสังกัด',
                              desc:
                                stage.assigned_role === 'submitter_branch_head'
                                  ? 'หัวหน้าสาขาตรวจเฉพาะครูในสาขาของตนเอง (เช่น หัวหน้าสาขาฟิสิกส์ตรวจเฉพาะครูฟิสิกส์)'
                                  : stage.assigned_role === 'submitter_department_head'
                                  ? 'หัวหน้ากลุ่มสาระตรวจเฉพาะครูในกลุ่มสาระของตนเอง (เช่น หัวหน้าวิทย์ฯ ตรวจเฉพาะครูวิทย์ฯ)'
                                  : 'ผู้ตรวจจะได้รับเอกสารเฉพาะคุณครูที่อยู่ในสาขาหรือกลุ่มสาระของตนเองเท่านั้น',
                            },
                            {
                              mode: 'random_all' as ReviewScopeMode,
                              title: '2. ตรวจของทุกคนแบบสุ่ม',
                              badge: 'เกลี่ยงานเท่ากัน',
                              desc:
                                stage.assigned_role === 'submitter_branch_head'
                                  ? 'หัวหน้าสาขาทุกคนช่วยกันตรวจทั้งโรงเรียน ระบบจะสุ่มและแบ่งจำนวนเล่มให้ทุกคนเท่าๆ กัน'
                                  : stage.assigned_role === 'submitter_department_head'
                                  ? 'หัวหน้ากลุ่มสาระทุกคนช่วยกันตรวจเอกสารทั้งโรงเรียน ระบบจะสุ่มกระจายงานให้เท่าๆ กัน'
                                  : 'ผู้ตรวจทุกคนในขั้นนี้มีสิทธิ์ตรวจเอกสารของทุกคน ระบบจะสุ่มกระจายภาระงานให้อย่างสมดุล',
                            },
                            {
                              mode: 'random_cross_only' as ReviewScopeMode,
                              title: '3. สุ่มตรวจข้ามกลุ่มเท่านั้น',
                              badge: 'Cross-Check',
                              desc:
                                stage.assigned_role === 'submitter_branch_head'
                                  ? 'สุ่มให้หัวหน้าสาขาอื่นเป็นผู้ตรวจ โดยไม่ให้ตรวจครูในสาขาของตนเอง เพื่อความเป็นกลาง'
                                  : stage.assigned_role === 'submitter_department_head'
                                  ? 'สุ่มให้หัวหน้ากลุ่มสาระอื่นตรวจข้ามกลุ่มสาระ โดยไม่ตรวจคนในกลุ่มสาระของตนเอง'
                                  : 'สุ่มตรวจข้ามกลุ่มสาระหรือข้ามสาขาวิชา เพื่อการประเมินเทียบเคียงที่โปร่งใส',
                            },
                          ].map((item) => {
                            const isChecked = (stage.scope_mode || 'own_group_only') === item.mode;
                            return (
                              <div
                                key={item.mode}
                                onClick={() => handleUpdateStage(stage.id, { scope_mode: item.mode })}
                                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                                  isChecked
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-bold text-slate-900">{item.title}</span>
                                    {isChecked ? (
                                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    ) : (
                                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                                    {item.desc}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 5. Auto-assign trigger */}
                      {(() => {
                        const stageWaitingPlans = plans.filter((p) => {
                          const planStage = p.current_stage_order || 1;
                          const isMatch = planStage === stage.order && p.status !== 'approved' && p.status !== 'deleted';
                          if (!isMatch) return false;
                          if (p.workflow_id === currentWorkflow.id) return true;
                          const type = (p.plan_type || '').toLowerCase();
                          if (currentWorkflow.target_plan_types?.some((t) => type.includes(t.toLowerCase()))) return true;
                          if (currentWorkflow.plan_type && type.includes(currentWorkflow.plan_type.toLowerCase())) return true;
                          return false;
                        });

                        return (
                          <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/40 border border-indigo-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <h5 className="text-xs font-bold text-indigo-950">
                                  ระบบกระจายงานอัตโนมัติ (Auto-assign Balanced Workload)
                                </h5>
                                <span className="px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-900 text-[10px] font-black">
                                  รอตรวจในขั้นนี้: {stageWaitingPlans.length} รายการ
                                </span>
                              </div>
                              <p className="text-[11px] text-indigo-900/80 max-w-2xl leading-relaxed">
                                เมื่อถึงวันครบกำหนดส่ง หรือแอดมินกดปุ่มสั่งกระจายงาน ระบบจะนำไฟล์เอกสารทั้งหมดในขั้นนี้มาจัดสรรให้ผู้ตรวจตามโหมด{' '}
                                <strong className="text-indigo-950 font-bold">
                                  {stage.scope_mode === 'random_all'
                                    ? 'สุ่มตรวจทุกคนแบบกระจายงานเท่ากัน'
                                    : stage.scope_mode === 'random_cross_only'
                                    ? 'สุ่มตรวจข้ามกลุ่ม'
                                    : 'ตรวจเฉพาะคนของตัวเอง'}
                                </strong>{' '}
                                โดยอัตโนมัติ
                              </p>

                              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={stage.auto_assign_enabled ?? false}
                                  onChange={(e) =>
                                    handleUpdateStage(stage.id, { auto_assign_enabled: e.target.checked })
                                  }
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-semibold text-indigo-950">
                                  เปิดใช้งานระบบกระจายงานอัตโนมัติสำหรับขั้นนี้เมื่อถึงกำหนดส่ง
                                </span>
                              </label>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleExecuteAutoAssign(stage)}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                <Shuffle className="w-3.5 h-3.5 text-amber-300" />
                                <span>
                                  {stage.scope_mode === 'random_all' || stage.scope_mode === 'random_cross_only'
                                    ? 'สุ่มจัดสรรผู้ตรวจเดี๋ยวนี้'
                                    : 'จัดสรรผู้ตรวจตามสายงานเดี๋ยวนี้'}
                                </span>
                                {stageWaitingPlans.length > 0 && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black">
                                    {stageWaitingPlans.length}
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              สายงานที่กำหนดจะถูกผูกเข้ากับเอกสารประเภท <strong>{selectedDocType}</strong> โดยอัตโนมัติทันทีเมื่อบันทึก
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-6 py-2 bg-[#0B1329] hover:bg-slate-900 text-amber-400 font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95"
            >
              บันทึกสายงานทั้งหมด
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Add New Actual Document Type */}
      {isAddDocTypeModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">เพิ่มประเภทเอกสารใหม่</h3>
                  <p className="text-[11px] text-slate-500">สร้างประเภทเอกสารจริงพร้อมสายงานอนุมัติ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDocTypeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewDocType} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อประเภทเอกสารจริง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newDocTypeName}
                  onChange={(e) => setNewDocTypeName(e.target.value)}
                  placeholder="เช่น แผนบูรณาการ, บันทึกหลังสอน, วิจัยชั้นเรียน"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDocTypeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#0B1329] hover:bg-slate-900 text-amber-400 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  สร้างประเภทเอกสาร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

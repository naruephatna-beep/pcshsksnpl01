import React, { useState, useMemo } from 'react';
import {
  ReviewWorkflowConfig,
  ReviewStageConfig,
  ReviewerSelectionType,
  ReviewerRoleType,
  Teacher,
  LessonPlan,
  DepartmentConfig,
  PlanTypeDeadlineConfig,
} from '../types';
import {
  DEFAULT_WORKFLOWS,
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
  HelpCircle,
  RotateCcw,
  BookOpen,
  FileText,
  Tag,
} from 'lucide-react';

interface WorkflowManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflows: ReviewWorkflowConfig[];
  onUpdateWorkflows: (workflows: ReviewWorkflowConfig[]) => void;
  teachers: Teacher[];
  departments: DepartmentConfig[];
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
  plans,
  onUpdatePlans,
  deadlineConfigs,
}) => {
  // Ensure we have all document-specific workflows initialized
  const initialWorkflows = useMemo(() => {
    if (workflows && workflows.length > 0) {
      // If legacy 1 workflow was passed, merge with document-specific defaults
      if (workflows.length === 1 && workflows[0].id === 'wf_standard_3stages') {
        return DEFAULT_WORKFLOWS;
      }
      return workflows;
    }
    return DEFAULT_WORKFLOWS;
  }, [workflows]);

  const [allWorkflows, setAllWorkflows] = useState<ReviewWorkflowConfig[]>(initialWorkflows);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(
    initialWorkflows[0]?.id || 'wf_summary_plan'
  );

  // Active workflow being edited
  const currentWorkflow = useMemo(() => {
    return allWorkflows.find((w) => w.id === selectedWorkflowId) || allWorkflows[0] || DEFAULT_WORKFLOWS[0];
  }, [allWorkflows, selectedWorkflowId]);

  const stages = currentWorkflow?.stages || [];

  // Active stage being edited or expanded
  const [expandedStageId, setExpandedStageId] = useState<string | null>(stages[0]?.id || null);

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

  // Add new stage (สร้างกี่ขั้นก็ได้ 1..X)
  const handleAddStage = () => {
    const newOrder = stages.length + 1;
    const newStage: ReviewStageConfig = {
      id: `stage_${Date.now()}`,
      order: newOrder,
      title: `ขั้นที่ ${newOrder}: ตรวจประเมินขั้นตอนที่ ${newOrder}`,
      description: `การตรวจประเมินลำดับขั้นที่ ${newOrder}`,
      evaluation_mode: 'approval_only', // ค่าเริ่มต้น: แบบกดอนุมัติ
      reviewer_selection_type: 'role', // ค่าเริ่มต้น: เลือกจากตำแหน่ง
      assigned_role: 'submitter_department_head',
      auto_assign_enabled: false,
    };
    const updatedStages = [...stages, newStage];
    updateCurrentWorkflow({ stages: updatedStages });
    setExpandedStageId(newStage.id);
    showToast(`เพิ่มขั้นตอนที่ ${newOrder} ให้กับสายงานเรียบร้อยแล้ว`);
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

  // Add a brand new workflow for custom document type
  const handleCreateNewWorkflow = () => {
    const newId = `wf_custom_${Date.now()}`;
    const newWf: ReviewWorkflowConfig = {
      id: newId,
      name: `สายงานตรวจเอกสารใหม่ (${allWorkflows.length + 1})`,
      description: 'กำหนดขั้นตอนการอนุมัติสำหรับประเภทเอกสารนี้',
      plan_type: 'เอกสารอื่นๆ',
      target_plan_types: [],
      is_active: true,
      auto_assign_on_deadline: false,
      stages: [
        {
          id: `stage_init_${Date.now()}`,
          order: 1,
          title: 'ขั้นที่ 1: ตรวจสอบและอนุมัติความถูกต้อง',
          description: 'ตรวจสอบความถูกต้องของเอกสารและอนุมัติผลงาน',
          evaluation_mode: 'approval_only',
          reviewer_selection_type: 'role',
          assigned_role: 'submitter_department_head',
          auto_assign_enabled: false,
        },
      ],
    };
    const updatedList = [...allWorkflows, newWf];
    setAllWorkflows(updatedList);
    setSelectedWorkflowId(newId);
    setExpandedStageId(newWf.stages[0].id);
    showToast('สร้างสายงานตรวจเอกสารใหม่เรียบร้อยแล้ว');
  };

  // Delete a custom workflow
  const handleDeleteWorkflow = (wfId: string) => {
    if (allWorkflows.length <= 1) {
      showToast('ต้องมีสายงานอย่างน้อย 1 รายการ', 'error');
      return;
    }
    const updatedList = allWorkflows.filter((w) => w.id !== wfId);
    setAllWorkflows(updatedList);
    setSelectedWorkflowId(updatedList[0].id);
    showToast('ลบสายงานเรียบร้อยแล้ว');
  };

  // Reset to default presets
  const handleResetToDefaults = () => {
    setAllWorkflows(DEFAULT_WORKFLOWS);
    setSelectedWorkflowId(DEFAULT_WORKFLOWS[0].id);
    setExpandedStageId(DEFAULT_WORKFLOWS[0].stages[0].id);
    showToast('รีเซ็ตสายงานเป็นค่ามาตรฐาน 4 ประเภทเอกสารเรียบร้อยแล้ว');
  };

  // Save all workflow changes to state and database
  const handleSaveAll = async () => {
    onUpdateWorkflows(allWorkflows);
    await saveWorkflows(allWorkflows);
    showToast('บันทึกการตั้งค่าสายงานและผู้ตรวจของทุกประเภทเอกสารสำเร็จแล้ว!');
  };

  // Run Auto-assign for a specific stage
  const handleExecuteAutoAssign = async (stage: ReviewStageConfig) => {
    // Filter plans that belong to this workflow or document type
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
        `ไม่พบเอกสารใน "${stage.title}" ของสายงานนี้ที่รอการกระจายงาน หรือเอกสารถูกตรวจครบแล้ว`,
        'error'
      );
      return;
    }

    onUpdatePlans(res.updatedPlans);

    // Save plans to cloud
    for (const p of res.updatedPlans) {
      if (p.assigned_reviewer_id) {
        await savePlanRecord(p);
      }
    }

    const dist: Record<string, { name: string; count: number }> = {};
    for (const [tId, data] of Object.entries(res.reviewerWorkload)) {
      dist[tId] = { name: data.teacher.Name, count: data.count };
    }

    setAutoAssignResult({
      stageTitle: stage.title,
      assignedCount: res.assignedCount,
      distribution: dist,
    });

    showToast(`กระจายงานสำเร็จ! แบ่งเอกสาร ${res.assignedCount} รายการให้ผู้ตรวจเท่าๆ กันเรียบร้อย`);
  };

  // Available document types list from deadlines
  const availableDocTypes = useMemo(() => {
    const list = [
      'แผนการจัดการเรียนรู้ฉบับย่อ',
      'แผนการจัดการเรียนรู้ฉบับสมบูรณ์',
      'รายงานการวิจัยในชั้นเรียน (CAR)',
      'เอกสารทั่วไป',
    ];
    if (deadlineConfigs && deadlineConfigs.length > 0) {
      deadlineConfigs.forEach((d) => {
        if (d.name && !list.includes(d.name)) {
          list.push(d.name);
        }
      });
    }
    return list;
  }, [deadlineConfigs]);

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
                  Document-Specific Approval Workflows
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
            className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${
              toastNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-b border-rose-200'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastNotice.message}</span>
          </div>
        )}

        {/* Document Type Selector Bar (รูปแบบที่ 1: ผูกสายงานและจำนวนขั้นตามประเภทเอกสาร) */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5 min-w-max">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <FileCheck2 className="w-3.5 h-3.5 text-slate-600" />
              <span>เลือกประเภทเอกสาร:</span>
            </span>

            {allWorkflows.map((wf) => {
              const isSelected = wf.id === currentWorkflow.id;
              const stageCount = wf.stages?.length || 0;
              const isSummary = (wf.plan_type || wf.name).includes('ย่อ');
              const isFull = (wf.plan_type || wf.name).includes('สมบูรณ์');
              const isResearch = (wf.plan_type || wf.name).includes('วิจัย');

              return (
                <button
                  key={wf.id}
                  onClick={() => {
                    setSelectedWorkflowId(wf.id);
                    setExpandedStageId(wf.stages?.[0]?.id || null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'bg-[#0B1329] text-white shadow-sm ring-2 ring-amber-400/30'
                      : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  <span className="text-sm">
                    {isSummary ? '📘' : isFull ? '📗' : isResearch ? '🔬' : '📄'}
                  </span>
                  <span>{wf.name.split(' (')[0]}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                      isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {stageCount} ขั้น
                  </span>
                </button>
              );
            })}

            <button
              onClick={handleCreateNewWorkflow}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-200 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition-all cursor-pointer"
              title="สร้างสายงานสำหรับเอกสารประเภทใหม่"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มสายงานใหม่</span>
            </button>
          </div>

          <button
            onClick={handleResetToDefaults}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
            title="รีเซ็ตสายงานเป็น 4 ประเภทมาตรฐานของโรงเรียน"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span className="hidden sm:inline">รีเซ็ตเป็นค่าเริ่มต้น</span>
          </button>
        </div>

        {/* Quick Workflow Overview Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-bold text-slate-700 shrink-0">ชื่อสายงาน:</span>
              <input
                type="text"
                value={currentWorkflow.name}
                onChange={(e) => updateCurrentWorkflow({ name: e.target.value })}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 w-full max-w-md"
              />
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              (กำหนดตรวจ <strong>{stages.length}</strong> ลำดับขั้น)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {allWorkflows.length > 1 && (
              <button
                onClick={() => handleDeleteWorkflow(currentWorkflow.id)}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="ลบสายงานนี้"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ลบสายงาน</span>
              </button>
            )}

            <button
              onClick={handleAddStage}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>เพิ่มลำดับขั้นใหม่</span>
            </button>

            <button
              onClick={handleSaveAll}
              className="px-4 py-1.5 bg-[#0B1329] hover:bg-slate-900 text-amber-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 space-y-6">
          {/* Target Document Types Mapping Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  ประเภทเอกสารที่ผูกกับสายงานนี้ (Document Mapping)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                เมื่อครูส่งเอกสารประเภทนี้ ระบบจะตรวจตามจำนวนขั้นด้านล่างอัตโนมัติ
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {availableDocTypes.map((type) => {
                const isSelected =
                  currentWorkflow.plan_type === type ||
                  currentWorkflow.target_plan_types?.includes(type);

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const curTargets = currentWorkflow.target_plan_types || [];
                      let nextTargets: string[];
                      if (curTargets.includes(type)) {
                        nextTargets = curTargets.filter((t) => t !== type);
                      } else {
                        nextTargets = [...curTargets, type];
                      }
                      updateCurrentWorkflow({
                        plan_type: type,
                        target_plan_types: nextTargets,
                      });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-2xs ring-1 ring-amber-400/40'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-amber-500 text-slate-950 font-black' : 'border border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span>{type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Breadcrumb Graphic (Multi-stage Pipeline) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>ลำดับสายงานตรวจเอกสารนี้ ({stages.length} ขั้นตอน)</span>
              </h4>
              <span className="text-xs text-slate-400">
                คลิกที่ขั้นตอนเพื่อแก้ไขรายละเอียดและผู้ตรวจ
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {stages.map((stage, idx) => {
                const isSelected = expandedStageId === stage.id;
                const isApproval = stage.evaluation_mode === 'approval_only';

                return (
                  <React.Fragment key={stage.id}>
                    <div
                      onClick={() => setExpandedStageId(stage.id)}
                      className={`px-3.5 py-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0B1329] text-white border-amber-400 shadow-md ring-2 ring-amber-400/20'
                          : 'bg-slate-50 hover:bg-white text-slate-800 border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                          isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {stage.order}
                      </div>
                      <div className="text-left">
                        <p
                          className={`text-xs font-bold truncate max-w-[170px] ${
                            isSelected ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {stage.title}
                        </p>
                        <p
                          className={`text-[10px] ${
                            isSelected ? 'text-amber-300' : 'text-slate-500'
                          }`}
                        >
                          {isApproval ? 'แบบกดอนุมัติ (Approve)' : 'แบบให้คะแนนรูบริก'}
                        </p>
                      </div>
                    </div>

                    {idx < stages.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Auto-assign distribution result modal/alert */}
          {autoAssignResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    ผลการกระจายงานอัตโนมัติ: {autoAssignResult.stageTitle} (รวม {autoAssignResult.assignedCount} เอกสาร)
                  </span>
                </div>
                <button
                  onClick={() => setAutoAssignResult(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
                >
                  ปิด
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

          {/* Stages List & Detailed Editors */}
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
              const eligibleReviewers = resolveReviewersForStage(stage, mockPlan, teachers, departments);

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

                      {/* 2. รูปแบบการตรวจงานในแต่ละขั้น (ตามข้อ 3: แบบกดอนุมัติ vs แบบให้คะแนนรูบริก) */}
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
                                    แบบให้คะแนน (Rubric Scoring)
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                                  ผู้ตรวจต้องประเมินและให้คะแนนตามเกณฑ์รูบริก 5 ด้านตามเกณฑ์วิชาการ ว.PA พร้อมคำนวณระดับคุณภาพ
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold shrink-0">
                                ละเอียด
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. การเลือกผู้ตรวจในแต่ละขั้น (ตามข้อ 2: 3 รูปแบบ) */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-indigo-600" />
                            <span>รูปแบบการเลือกผู้ตรวจในขั้นนี้ (Reviewer Selection)</span>
                          </label>

                          <span className="text-[11px] text-indigo-900 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                            ผู้ตรวจที่มีสิทธิ์ในขั้นนี้: {eligibleReviewers.length} ท่าน
                          </span>
                        </div>

                        {/* Three Mode Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* Mode 1: ระบุชื่อรายบุคคล */}
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
                              <span className="text-xs">1. ระบุชื่อรายบุคคล</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              ติ๊กเลือกคุณครูรายคนที่ต้องการมอบหมาย
                            </p>
                          </button>

                          {/* Mode 2: เลือกยกทั้งกลุ่มสาระ */}
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
                              <span className="text-xs">2. เลือกยกทั้งกลุ่มสาระ</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              เลือกครูทั้งกลุ่มสาระของผู้ส่ง หรือสาขาที่กำหนด
                            </p>
                          </button>

                          {/* Mode 3: เลือกจากตำแหน่ง */}
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
                              <span className="text-xs">3. เลือกจากตำแหน่ง</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              หัวหน้ากลุ่มสาระของผู้ส่ง, หัวหน้าสาขาทุกคน, หรือ ผอ.
                            </p>
                          </button>
                        </div>

                        {/* Sub-form 1: ระบุชื่อรายบุคคล */}
                        {selectionType === 'individual' && (
                          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800">
                                เลือกครูผู้ตรวจรายบุคคล ({stage.assigned_teacher_ids?.length || 0} คนที่เลือก):
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

                        {/* Sub-form 2: เลือกยกทั้งกลุ่มสาระ */}
                        {selectionType === 'department' && (
                          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                            <span className="text-xs font-bold text-slate-800 block">
                              เลือกกลุ่มสาระที่รับผิดชอบการตรวจในขั้นนี้:
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {/* Dynamic: กลุ่มสาระของผู้ส่งแผนการสอน */}
                              <label
                                className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                                  (stage.assigned_departments || []).includes('submitter_department')
                                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-2xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={(stage.assigned_departments || []).includes('submitter_department')}
                                  onChange={(e) => {
                                    const currentDepts = stage.assigned_departments || [];
                                    const nextDepts = e.target.checked
                                      ? [...currentDepts, 'submitter_department']
                                      : currentDepts.filter((d) => d !== 'submitter_department');
                                    handleUpdateStage(stage.id, { assigned_departments: nextDepts });
                                  }}
                                  className="rounded text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                  <p className="text-xs font-bold">กลุ่มสาระของผู้ส่ง (ตรงสาขาวิชา)</p>
                                  <p className="text-[10px] text-slate-500">ดึงครูในกลุ่มสาระเดียวกันมาตรวจ</p>
                                </div>
                              </label>

                              {/* Fixed Departments */}
                              {departments.map((dept) => {
                                const isChecked = (stage.assigned_departments || []).includes(dept.name);
                                return (
                                  <label
                                    key={dept.id}
                                    className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
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
                                          ? [...currentDepts, dept.name]
                                          : currentDepts.filter((d) => d !== dept.name);
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

                        {/* Sub-form 3: เลือกจากตำแหน่ง */}
                        {selectionType === 'role' && (
                          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                            <span className="text-xs font-bold text-slate-800 block">
                              เลือกบทบาท/ตำแหน่งของผู้ตรวจในขั้นนี้:
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Role A: หัวหน้ากลุ่มสาระของผู้ส่ง */}
                              <label
                                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all cursor-pointer ${
                                  stage.assigned_role === 'submitter_department_head'
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`role_${stage.id}`}
                                  checked={stage.assigned_role === 'submitter_department_head'}
                                  onChange={() =>
                                    handleUpdateStage(stage.id, {
                                      assigned_role: 'submitter_department_head',
                                    })
                                  }
                                  className="mt-0.5 text-emerald-600"
                                />
                                <div>
                                  <p className="text-xs font-bold text-slate-900">
                                    หัวหน้ากลุ่มสาระของผู้ส่ง (Submitter's Department Head)
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    ระบบจะค้นหาหัวหน้าสาขาที่ตรงกับกลุ่มสาระของแผนการสอนนั้นๆ โดยอัตโนมัติ
                                  </p>
                                </div>
                              </label>

                              {/* Role B: หัวหน้าสาขาทุกคน */}
                              <label
                                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all cursor-pointer ${
                                  stage.assigned_role === 'all_department_heads'
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`role_${stage.id}`}
                                  checked={stage.assigned_role === 'all_department_heads'}
                                  onChange={() =>
                                    handleUpdateStage(stage.id, {
                                      assigned_role: 'all_department_heads',
                                    })
                                  }
                                  className="mt-0.5 text-emerald-600"
                                />
                                <div>
                                  <p className="text-xs font-bold text-slate-900">
                                    หัวหน้าสาขาทุกคน (All Department Heads)
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    ดึงหัวหน้าสาขาทั้งหมดของโรงเรียนมาร่วมเป็นคณะกรรมการตรวจรูบริก
                                  </p>
                                </div>
                              </label>

                              {/* Role C: ฝ่ายบริหาร/ผู้อำนวยการ */}
                              <label
                                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all cursor-pointer ${
                                  stage.assigned_role === 'school_leadership'
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`role_${stage.id}`}
                                  checked={stage.assigned_role === 'school_leadership'}
                                  onChange={() =>
                                    handleUpdateStage(stage.id, {
                                      assigned_role: 'school_leadership',
                                    })
                                  }
                                  className="mt-0.5 text-emerald-600"
                                />
                                <div>
                                  <p className="text-xs font-bold text-slate-900">
                                    ฝ่ายบริหาร / ผู้อำนวยการสถานศึกษา (Leadership)
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    ผู้อำนวยการหรือผู้บริหารลงนามอนุมัติในขั้นตอนสุดท้าย
                                  </p>
                                </div>
                              </label>

                              {/* Role D: แอดมินทุกคน */}
                              <label
                                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all cursor-pointer ${
                                  stage.assigned_role === 'all_admins'
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`role_${stage.id}`}
                                  checked={stage.assigned_role === 'all_admins'}
                                  onChange={() =>
                                    handleUpdateStage(stage.id, {
                                      assigned_role: 'all_admins',
                                    })
                                  }
                                  className="mt-0.5 text-emerald-600"
                                />
                                <div>
                                  <p className="text-xs font-bold text-slate-900">
                                    ผู้ดูแลระบบทุกคน (All Administrators)
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    คณะแอดมินฝ่ายวิชาการสามารถตรวจและอนุมัติได้ทุกคน
                                  </p>
                                </div>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 4. ระบบกระจายงานอัตโนมัติ (Auto-assign Workload Balancer) */}
                      <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/40 border border-indigo-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <h5 className="text-xs font-bold text-indigo-950">
                              ระบบกระจายงานอัตโนมัติ (Auto-assign Balanced Workload)
                            </h5>
                          </div>
                          <p className="text-[11px] text-indigo-900/80 max-w-xl leading-relaxed">
                            เมื่อถึงวันครบกำหนดส่ง หรือกดปุ่มสั่งกระจายงาน ระบบจะนำไฟล์เอกสารทั้งหมดในขั้นนี้มาหารเฉลี่ยแบ่งให้ผู้ตรวจแต่ละคนในปริมาณที่เท่าๆ กัน (Round-robin)
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleExecuteAutoAssign(stage)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            <span>กระจายงานอัตโนมัติทันที</span>
                          </button>
                        </div>
                      </div>
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
              สายงานที่กำหนดจะถูกผูกเข้ากับเอกสารที่ระบุโดยอัตโนมัติทันทีเมื่อบันทึก
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ปิดหน้าต่าง
            </button>
            <button
              onClick={handleSaveAll}
              className="px-6 py-2 bg-[#0B1329] hover:bg-slate-900 text-amber-400 font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95"
            >
              บันทึกสายงานทั้งหมด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

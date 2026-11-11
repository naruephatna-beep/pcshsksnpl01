import React, { useState, useMemo } from 'react';
import {
  Teacher,
  LessonPlan,
  ReviewWorkflowConfig,
  DepartmentConfig,
  BranchConfig,
} from '../types';
import {
  X,
  UserCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  BarChart3,
  Building2,
  GitFork,
  ArrowRight,
  Eye,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  isSameTeacherIdOrName,
  getWorkflowForPlan,
  resolveReviewersForStage,
  hasTeacherReviewedPlan,
} from '../services/departmentWorkflowService';

interface ReviewerWorkloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  plans: LessonPlan[];
  workflows: ReviewWorkflowConfig[];
  departments: DepartmentConfig[];
  branches?: BranchConfig[];
  onOpenPlan?: (plan: LessonPlan) => void;
  onOpenReview?: (plan: LessonPlan) => void;
}

export const ReviewerWorkloadModal: React.FC<ReviewerWorkloadModalProps> = ({
  isOpen,
  onClose,
  teachers,
  plans,
  workflows,
  departments,
  branches = [],
  onOpenPlan,
  onOpenReview,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'has_pending' | 'all_reviewed' | 'has_workload'>('all');
  const [selectedReviewerId, setSelectedReviewerId] = useState<string | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<'pending' | 'reviewed' | 'all'>('pending');

  // Compute workload statistics per teacher
  const statsByReviewer = useMemo(() => {
    const map = new Map<
      string,
      {
        teacher: Teacher;
        assignedPlans: LessonPlan[];
        reviewedPlans: LessonPlan[];
        pendingPlans: LessonPlan[];
      }
    >();

    teachers.forEach((t) => {
      map.set(t.Teacher_ID, {
        teacher: t,
        assignedPlans: [],
        reviewedPlans: [],
        pendingPlans: [],
      });
    });

    plans.forEach((p) => {
      if (p.status === 'deleted') return;

      // 1. Direct assigned reviewer (matches via isSameTeacherIdOrName)
      let directlyAssignedTeacher: Teacher | null = null;
      if (p.assigned_reviewer_id || p.assigned_reviewer_name) {
        directlyAssignedTeacher =
          teachers.find((t) =>
            isSameTeacherIdOrName(p.assigned_reviewer_id, p.assigned_reviewer_name, t)
          ) || null;
      }

      if (directlyAssignedTeacher) {
        const entry = map.get(directlyAssignedTeacher.Teacher_ID);
        if (entry) {
          if (!entry.assignedPlans.some((x) => x.id === p.id)) {
            entry.assignedPlans.push(p);
          }
          if (hasTeacherReviewedPlan(p, directlyAssignedTeacher) || p.status === 'approved') {
            if (!entry.reviewedPlans.some((x) => x.id === p.id)) {
              entry.reviewedPlans.push(p);
            }
          } else {
            if (!entry.pendingPlans.some((x) => x.id === p.id)) {
              entry.pendingPlans.push(p);
            }
          }
        }
      } else {
        // 2. No direct reviewer assigned yet; resolve who is responsible based on the workflow stage!
        const wf = getWorkflowForPlan(p, workflows);
        const currentStageOrder = p.current_stage_order || 1;
        const stage = wf?.stages?.find((s) => s.order === currentStageOrder);

        if (stage) {
          const candidates = resolveReviewersForStage(stage, p, teachers, departments, branches);
          if (stage.scope_mode === 'random_all' || stage.scope_mode === 'random_cross_only') {
            // Deterministic hash selection matches App.tsx
            if (candidates.length > 0) {
              let hash = 0;
              const seed = p.id || p.plan_title || 'plan_seed';
              for (let i = 0; i < seed.length; i++) {
                hash = (hash << 5) - hash + seed.charCodeAt(i);
                hash |= 0;
              }
              const picked = candidates[Math.abs(hash) % candidates.length];
              const entry = map.get(picked.Teacher_ID);
              if (entry) {
                if (!entry.assignedPlans.some((x) => x.id === p.id)) {
                  entry.assignedPlans.push(p);
                }
                if (hasTeacherReviewedPlan(p, picked) || p.status === 'approved') {
                  if (!entry.reviewedPlans.some((x) => x.id === p.id)) {
                    entry.reviewedPlans.push(p);
                  }
                } else {
                  if (!entry.pendingPlans.some((x) => x.id === p.id)) {
                    entry.pendingPlans.push(p);
                  }
                }
              }
            }
          } else {
            // Role / own group: each candidate is responsible for plans in their group
            candidates.forEach((c) => {
              const entry = map.get(c.Teacher_ID);
              if (entry) {
                if (!entry.assignedPlans.some((x) => x.id === p.id)) {
                  entry.assignedPlans.push(p);
                }
                if (hasTeacherReviewedPlan(p, c) || p.status === 'approved') {
                  if (!entry.reviewedPlans.some((x) => x.id === p.id)) {
                    entry.reviewedPlans.push(p);
                  }
                } else {
                  if (!entry.pendingPlans.some((x) => x.id === p.id)) {
                    entry.pendingPlans.push(p);
                  }
                }
              }
            });
          }
        }
      }

      // 3. Completed reviews check: Ensure anyone who submitted a review is credited in reviewedPlans
      teachers.forEach((t) => {
        if (hasTeacherReviewedPlan(p, t)) {
          const entry = map.get(t.Teacher_ID);
          if (entry) {
            if (!entry.reviewedPlans.some((x) => x.id === p.id)) {
              entry.reviewedPlans.push(p);
            }
            if (!entry.assignedPlans.some((x) => x.id === p.id)) {
              entry.assignedPlans.push(p);
            }
            entry.pendingPlans = entry.pendingPlans.filter((x) => x.id !== p.id);
          }
        }
      });
    });

    return Array.from(map.values());
  }, [teachers, plans, workflows, departments, branches]);

  // Filter reviewers who have any role or assignments or match search
  const filteredReviewers = useMemo(() => {
    return statsByReviewer.filter((entry) => {
      const t = entry.teacher;
      const hasWorkload = entry.assignedPlans.length > 0 || entry.reviewedPlans.length > 0;
      const isRoleEligible =
        t.role === 'admin' ||
        t.role === 'head_of_department' ||
        t.role === 'head_of_branch' ||
        t.is_head_of_department ||
        t.is_head_of_branch ||
        hasWorkload;

      if (!isRoleEligible) return false;

      // Status quick filter
      if (statusFilter === 'has_pending' && entry.pendingPlans.length === 0) {
        return false;
      }
      if (statusFilter === 'all_reviewed' && (entry.reviewedPlans.length === 0 || entry.pendingPlans.length > 0)) {
        return false;
      }
      if (statusFilter === 'has_workload' && !hasWorkload) {
        return false;
      }

      if (selectedDeptFilter !== 'all' && t.Learning_Area !== selectedDeptFilter) {
        return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.Name.toLowerCase().includes(q) ||
          t.Teacher_ID.toLowerCase().includes(q) ||
          (t.branch && t.branch.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [statsByReviewer, selectedDeptFilter, searchQuery, statusFilter]);

  if (!isOpen) return null;

  const activeReviewerData = selectedReviewerId
    ? statsByReviewer.find((r) => r.teacher.Teacher_ID === selectedReviewerId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0B1329] text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 shrink-0">
              <UserCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
                  Reviewer Workload & Audit
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-300">จ.ภ. กาฬสินธุ์</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                ภาระงานผู้ตรวจ & ยอดตรวจจริงของคณะกรรมการ
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อผู้ตรวจ, รหัสครู, หรือสาขาวิชา..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 shrink-0">กลุ่มสาระ:</span>
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="all">ทุกกลุ่มสาระการเรียนรู้</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick status filters */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" /> สถานะ:
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              กรรมการทั้งหมด ({filteredReviewers.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('has_pending')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'has_pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>มีงานค้างตรวจ ({statsByReviewer.filter((x) => x.pendingPlans.length > 0).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('all_reviewed')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'all_reviewed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>ตรวจครบแล้ว ({statsByReviewer.filter((x) => x.reviewedPlans.length > 0 && x.pendingPlans.length === 0).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('has_workload')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'has_workload'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              เฉพาะผู้ที่มีภาระงาน ({statsByReviewer.filter((x) => x.assignedPlans.length > 0 || x.reviewedPlans.length > 0).length})
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredReviewers.map(({ teacher, assignedPlans, reviewedPlans, pendingPlans }) => {
              const isSelected = selectedReviewerId === teacher.Teacher_ID;
              const photo = formatGoogleDriveImageUrl(teacher.photo);

              return (
                <div
                  key={teacher.Teacher_ID}
                  onClick={() =>
                    setSelectedReviewerId(isSelected ? null : teacher.Teacher_ID)
                  }
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 overflow-hidden border border-slate-200">
                      {photo ? (
                        <img
                          src={photo}
                          alt={teacher.Name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(teacher.Name)
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {teacher.Name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {teacher.Teacher_ID} · {teacher.Learning_Area || 'ไม่ระบุกลุ่มสาระ'}
                      </p>
                      {teacher.branch && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold mt-1">
                          {teacher.branch}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">มอบหมาย</span>
                      <strong className="text-xs font-bold text-slate-800">
                        {assignedPlans.length}
                      </strong>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-xl">
                      <span className="text-[10px] text-emerald-700 block">ตรวจแล้ว</span>
                      <strong className="text-xs font-bold text-emerald-900">
                        {reviewedPlans.length}
                      </strong>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-xl">
                      <span className="text-[10px] text-amber-700 block">รอตรวจ</span>
                      <strong className="text-xs font-bold text-amber-900">
                        {pendingPlans.length}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed plans inspection for selected reviewer */}
          {activeReviewerData && (() => {
            const listToShow =
              detailSubTab === 'pending'
                ? activeReviewerData.pendingPlans
                : detailSubTab === 'reviewed'
                ? activeReviewerData.reviewedPlans
                : activeReviewerData.assignedPlans;

            return (
              <div className="mt-6 bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-sm animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        ภาระงานและเอกสารของ {activeReviewerData.teacher.Name}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {activeReviewerData.teacher.Teacher_ID} · {activeReviewerData.teacher.Learning_Area}
                      </p>
                    </div>
                  </div>

                  {/* Sub-tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setDetailSubTab('pending')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        detailSubTab === 'pending'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      รอตรวจ ({activeReviewerData.pendingPlans.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailSubTab('reviewed')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        detailSubTab === 'reviewed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ตรวจแล้ว ({activeReviewerData.reviewedPlans.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailSubTab('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        detailSubTab === 'all'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ทั้งหมด ({activeReviewerData.assignedPlans.length})
                    </button>

                    <button
                      onClick={() => setSelectedReviewerId(null)}
                      className="ml-2 text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
                    >
                      ปิดแผง
                    </button>
                  </div>
                </div>

                {listToShow.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-60" />
                    <p className="text-xs font-medium text-slate-600">
                      {detailSubTab === 'pending'
                        ? 'ไม่มีงานค้างตรวจ (ผู้ตรวจท่านนี้ตรวจครบเรียบร้อย)'
                        : detailSubTab === 'reviewed'
                        ? 'ยังไม่มียอดที่ตรวจเสร็จแล้ว'
                        : 'ยังไม่มีเอกสารที่มอบหมายให้ผู้ตรวจท่านนี้'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                    {listToShow.map((p) => {
                      const isApproved = p.status === 'approved';
                      const isReviewedByThisTeacher = hasTeacherReviewedPlan(p, activeReviewerData.teacher);

                      return (
                        <div
                          key={p.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 truncate">
                                {p.plan_title || p.subject_name} ({p.subject_code})
                              </p>
                              {p.plan_type && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px] shrink-0">
                                  {p.plan_type}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              ผู้ส่ง: <strong className="text-slate-700">{p.teacher_name}</strong> · กลุ่มสาระ: {p.learning_area} {p.grade_level ? `· ${p.grade_level}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isReviewedByThisTeacher
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isApproved
                                ? 'อนุมัติแล้ว'
                                : isReviewedByThisTeacher
                                ? 'ท่านนี้ตรวจแล้ว'
                                : 'รอตรวจ'}
                            </span>

                            {onOpenReview && !isApproved && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenReview(p);
                                  onClose();
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                title="เปิดหน้าต่างตรวจเอกสาร"
                              >
                                <FileCheck2 className="w-3.5 h-3.5" />
                                <span>ตรวจทันที</span>
                              </button>
                            )}

                            {onOpenPlan && (
                              <button
                                type="button"
                                onClick={() => onOpenPlan(p)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="ดูไฟล์เอกสาร"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#0B1329] hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

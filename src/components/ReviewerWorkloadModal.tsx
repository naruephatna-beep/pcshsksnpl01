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
} from 'lucide-react';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';

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
  const [selectedReviewerId, setSelectedReviewerId] = useState<string | null>(null);

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

      // 1. Direct assigned reviewer
      if (p.assigned_reviewer_id && map.has(p.assigned_reviewer_id)) {
        const entry = map.get(p.assigned_reviewer_id)!;
        entry.assignedPlans.push(p);
        if (p.status === 'approved' || p.reviewed_at) {
          entry.reviewedPlans.push(p);
        } else {
          entry.pendingPlans.push(p);
        }
      }

      // 2. Completed reviews record
      if (p.stage_reviews && p.stage_reviews.length > 0) {
        p.stage_reviews.forEach((sr) => {
          if (sr.reviewer_id && map.has(sr.reviewer_id)) {
            const entry = map.get(sr.reviewer_id)!;
            if (!entry.reviewedPlans.some((x) => x.id === p.id)) {
              entry.reviewedPlans.push(p);
            }
          }
        });
      } else if (p.reviewed_by && map.has(p.reviewed_by)) {
        const entry = map.get(p.reviewed_by)!;
        if (!entry.reviewedPlans.some((x) => x.id === p.id)) {
          entry.reviewedPlans.push(p);
        }
      }
    });

    return Array.from(map.values());
  }, [teachers, plans]);

  // Filter reviewers who have any role or assignments or match search
  const filteredReviewers = useMemo(() => {
    return statsByReviewer.filter((entry) => {
      const t = entry.teacher;
      const isRoleEligible =
        t.role === 'admin' ||
        t.role === 'head_of_department' ||
        t.role === 'head_of_branch' ||
        t.is_head_of_department ||
        t.is_head_of_branch ||
        entry.assignedPlans.length > 0 ||
        entry.reviewedPlans.length > 0;

      if (!isRoleEligible) return false;

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
  }, [statsByReviewer, selectedDeptFilter, searchQuery]);

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
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อผู้ตรวจ, รหัส, หรือสาขาวิชา..."
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
          {activeReviewerData && (
            <div className="mt-6 bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    รายการเอกสารที่เกี่ยวข้องกับ {activeReviewerData.teacher.Name} (
                    {activeReviewerData.assignedPlans.length} ฉบับ)
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedReviewerId(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ปิดแผงรายละเอียด
                </button>
              </div>

              {activeReviewerData.assignedPlans.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  ยังไม่มีเอกสารที่มอบหมายให้ผู้ตรวจท่านนี้
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {activeReviewerData.assignedPlans.map((p) => (
                    <div
                      key={p.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">
                          {p.plan_title || p.subject_name} ({p.subject_code})
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          ผู้ส่ง: {p.teacher_name} · กลุ่มสาระ: {p.learning_area}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจ'}
                        </span>

                        {onOpenPlan && (
                          <button
                            type="button"
                            onClick={() => onOpenPlan(p)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="ดูเอกสาร"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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

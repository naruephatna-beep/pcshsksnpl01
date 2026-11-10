import React, { useState, useMemo } from 'react';
import {
  Teacher,
  LessonPlan,
  ReviewWorkflowConfig,
  DepartmentConfig,
  BranchConfig,
  isTeacherAdmin,
  isTeacherExecutive,
} from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  X,
  Search,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  Award,
  Layers,
  Filter,
  Users,
  Eye,
  Check,
  BarChart3,
  Calendar,
} from 'lucide-react';

interface ReviewerWorkloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  plans: LessonPlan[];
  workflows?: ReviewWorkflowConfig[];
  departments?: DepartmentConfig[];
  branches?: BranchConfig[];
  onOpenPlan?: (plan: LessonPlan) => void;
  onOpenReview?: (plan: LessonPlan) => void;
}

export interface ReviewerWorkloadStats {
  teacher: Teacher;
  titleBadge: string;
  roleType: 'admin' | 'executive' | 'dept_head' | 'branch_head' | 'reviewer';
  approvedCount: number;
  needsRevisionCount: number;
  totalReviewed: number;
  pendingCount: number;
  totalWorkload: number;
  completionRate: number;
  lastReviewedAt: string | null;
  reviewedPlans: LessonPlan[];
  pendingPlans: LessonPlan[];
}

export const ReviewerWorkloadModal: React.FC<ReviewerWorkloadModalProps> = ({
  isOpen,
  onClose,
  teachers,
  plans,
  workflows = [],
  departments = [],
  branches = [],
  onOpenPlan,
  onOpenReview,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'heads' | 'admin' | 'pending_only'>('all');
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<'reviewed' | 'pending'>('reviewed');

  // Normalize string for safe ID/name matching
  const norm = (s?: string) => String(s || '').trim().toLowerCase();

  const isSameTeacher = (tId?: string, tName?: string, teacher?: Teacher | null) => {
    if (!teacher) return false;
    const tid = norm(tId);
    const tnm = norm(tName);
    const myId = norm(teacher.Teacher_ID);
    const myName = norm(teacher.Name);
    const myEmail = norm(teacher.Email);

    if (tid && myId && tid === myId) return true;
    if (tid && myEmail && (tid === myEmail || tid.includes(myEmail))) return true;
    if (tnm && myName && (tnm === myName || tnm.includes(myName) || myName.includes(tnm))) return true;
    return false;
  };

  // Compile reviewer workload stats for every relevant reviewer
  const reviewerStatsList = useMemo(() => {
    const list: ReviewerWorkloadStats[] = [];

    // Find all appointed heads and admins
    const deptHeadIds = new Set(departments.map((d) => d.head_teacher_id).filter(Boolean) as string[]);
    const branchHeadIds = new Set(branches.map((b) => b.head_teacher_id).filter(Boolean) as string[]);

    // Find any teacher who has ever reviewed any plan
    const activeReviewerIds = new Set<string>();
    plans.forEach((p) => {
      if (p.reviewed_by) activeReviewerIds.add(norm(p.reviewed_by));
      if (p.assigned_reviewer_id) activeReviewerIds.add(norm(p.assigned_reviewer_id));
      if (p.stage_reviews) {
        p.stage_reviews.forEach((r) => {
          if (r.reviewer_id) activeReviewerIds.add(norm(r.reviewer_id));
        });
      }
    });

    teachers.forEach((t) => {
      const tId = norm(t.Teacher_ID);
      const isAdm = isTeacherAdmin(t);
      const isExec = isTeacherExecutive(t);
      const isDeptH = deptHeadIds.has(t.Teacher_ID) || t.is_head_of_department === true || t.role === 'head_of_department';
      const isBranchH = branchHeadIds.has(t.Teacher_ID) || t.is_head_of_branch === true || t.role === 'head_of_branch';
      const hasReviewed = activeReviewerIds.has(tId);

      // Only include teachers with review responsibilities or review history
      if (!isAdm && !isExec && !isDeptH && !isBranchH && !hasReviewed) {
        return;
      }

      // Determine primary title badge
      let titleBadge = 'ผู้ตรวจการสอน';
      let roleType: ReviewerWorkloadStats['roleType'] = 'reviewer';

      if (isAdm) {
        titleBadge = 'ผู้ดูแลระบบ (Admin)';
        roleType = 'admin';
      } else if (isExec) {
        titleBadge = t.position || 'ฝ่ายบริหารสถานศึกษา';
        roleType = 'executive';
      } else if (isDeptH) {
        titleBadge = `หัวหน้ากลุ่มสาระฯ (${t.Learning_Area || 'ไม่ระบุ'})`;
        roleType = 'dept_head';
      } else if (isBranchH) {
        titleBadge = `หัวหน้ากลุ่มสาขา (${t.branch || 'ไม่ระบุ'})`;
        roleType = 'branch_head';
      }

      // Compute plans reviewed by this teacher
      const reviewedPlans: LessonPlan[] = [];
      let approvedCount = 0;
      let needsRevisionCount = 0;
      let latestReviewedDate: string | null = null;

      plans.forEach((p) => {
        if (p.status === 'deleted') return;

        const isDirectReviewer = isSameTeacher(p.reviewed_by, p.reviewer_name, t);
        const hasStageReview = p.stage_reviews?.some((r) => isSameTeacher(r.reviewer_id, r.reviewer_name, t));

        if (isDirectReviewer || hasStageReview) {
          reviewedPlans.push(p);

          // Find date
          const myReview = p.stage_reviews?.find((r) => isSameTeacher(r.reviewer_id, r.reviewer_name, t));
          const reviewDate = myReview?.reviewed_at || p.reviewed_at;
          if (reviewDate) {
            if (!latestReviewedDate || new Date(reviewDate).getTime() > new Date(latestReviewedDate).getTime()) {
              latestReviewedDate = reviewDate;
            }
          }

          const myStatus = myReview?.status || p.status;
          if (myStatus === 'approved' || myStatus === 'passed') {
            approvedCount++;
          } else if (myStatus === 'needs_revision' || myStatus === 'rejected') {
            needsRevisionCount++;
          } else {
            approvedCount++;
          }
        }
      });

      // Compute plans currently pending for this teacher
      const pendingPlans: LessonPlan[] = [];
      plans.forEach((p) => {
        if (p.status === 'deleted') return;
        if (p.status === 'approved' || p.status === 'passed') return;

        // Has already reviewed?
        const alreadyReviewed = reviewedPlans.some((rp) => rp.id === p.id);
        if (alreadyReviewed) return;

        // Direct assignment check
        if (p.assigned_reviewer_id && isSameTeacher(p.assigned_reviewer_id, p.assigned_reviewer_name, t)) {
          pendingPlans.push(p);
          return;
        }

        // Branch head check
        if (isBranchH && t.branch && p.branch && norm(p.branch) === norm(t.branch)) {
          if (!p.assigned_reviewer_id) {
            pendingPlans.push(p);
            return;
          }
        }

        // Department head check
        if (isDeptH && t.Learning_Area && p.learning_area && norm(p.learning_area) === norm(t.Learning_Area)) {
          if (!p.assigned_reviewer_id) {
            pendingPlans.push(p);
            return;
          }
        }
      });

      const totalReviewed = reviewedPlans.length;
      const pendingCount = pendingPlans.length;
      const totalWorkload = totalReviewed + pendingCount;
      const completionRate = totalWorkload > 0 ? Math.round((totalReviewed / totalWorkload) * 100) : 100;

      list.push({
        teacher: t,
        titleBadge,
        roleType,
        approvedCount,
        needsRevisionCount,
        totalReviewed,
        pendingCount,
        totalWorkload,
        completionRate,
        lastReviewedAt: latestReviewedDate,
        reviewedPlans,
        pendingPlans,
      });
    });

    // Sort by: most reviewed first, then by pending workload
    return list.sort((a, b) => {
      if (b.totalReviewed !== a.totalReviewed) return b.totalReviewed - a.totalReviewed;
      return b.pendingCount - a.pendingCount;
    });
  }, [teachers, plans, departments, branches]);

  // Overall totals
  const overallStats = useMemo(() => {
    let totalReviewed = 0;
    let totalApproved = 0;
    let totalRevision = 0;
    let totalPending = 0;

    reviewerStatsList.forEach((r) => {
      totalReviewed += r.totalReviewed;
      totalApproved += r.approvedCount;
      totalRevision += r.needsRevisionCount;
      totalPending += r.pendingCount;
    });

    return {
      activeReviewersCount: reviewerStatsList.filter((r) => r.totalReviewed > 0).length,
      totalReviewers: reviewerStatsList.length,
      totalReviewed,
      totalApproved,
      totalRevision,
      totalPending,
    };
  }, [reviewerStatsList]);

  // Filtered rows by search and role filter
  const filteredList = useMemo(() => {
    return reviewerStatsList.filter((r) => {
      if (filterRole === 'heads') {
        if (r.roleType !== 'dept_head' && r.roleType !== 'branch_head') return false;
      } else if (filterRole === 'admin') {
        if (r.roleType !== 'admin' && r.roleType !== 'executive') return false;
      } else if (filterRole === 'pending_only') {
        if (r.pendingCount === 0) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.teacher.Name.toLowerCase().includes(q);
        const matchId = r.teacher.Teacher_ID.toLowerCase().includes(q);
        const matchDept = (r.teacher.Learning_Area || '').toLowerCase().includes(q);
        const matchBranch = (r.teacher.branch || '').toLowerCase().includes(q);
        const matchTitle = r.titleBadge.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDept && !matchBranch && !matchTitle) {
          return false;
        }
      }

      return true;
    });
  }, [reviewerStatsList, filterRole, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] transition-all">
        {/* Header Bar */}
        <div className="bg-[#0B1329] text-white p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-md">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  สถิติภาระงานผู้ตรวจ (Reviewer Workload Tracker)
                </h3>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold px-2 py-0.5 rounded-full">
                  ผู้ดูแลระบบ & ผู้บริหาร
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                ติดตามตรวจสอบว่าหัวหน้าสาขา หัวหน้ากลุ่มสาระ และผู้บริหาร แต่ละท่านตรวจงานไปกี่อัน และมีงานค้างตรวจกี่อัน
              </p>
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

        {/* Overview KPI Cards */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
          {/* Card 1: Total Reviewed */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">ตรวจเสร็จแล้วทั้งหมด</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {overallStats.totalReviewed}
              </span>
              <span className="text-xs text-slate-400 font-medium">ครั้ง</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-bold mt-1">
              อนุมัติ {overallStats.totalApproved} · ส่งแก้ {overallStats.totalRevision}
            </div>
          </div>

          {/* Card 2: Pending in Review Queues */}
          <div className="bg-white p-3 rounded-2xl border border-amber-200 shadow-2xs bg-gradient-to-br from-white to-amber-50/30">
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-xs font-semibold">งานค้างรอตรวจรวม</span>
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-700 font-mono">
                {overallStats.totalPending}
              </span>
              <span className="text-xs text-amber-600 font-medium">รายการ</span>
            </div>
            <div className="text-[10px] text-amber-700 font-semibold mt-1">
              อยู่ในคิวของผู้ตรวจตามสายงาน
            </div>
          </div>

          {/* Card 3: Active Reviewers */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">ผู้ตรวจที่มีการลงตรวจแล้ว</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-indigo-700 font-mono">
                {overallStats.activeReviewersCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ {overallStats.totalReviewers} ท่าน</span>
            </div>
            <div className="text-[10px] text-indigo-600 font-semibold mt-1">
              คิดเป็น {overallStats.totalReviewers > 0 ? Math.round((overallStats.activeReviewersCount / overallStats.totalReviewers) * 100) : 0}% ของผู้ตรวจ
            </div>
          </div>

          {/* Card 4: Document pool */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">เอกสารทั้งหมดในระบบ</span>
              <FileText className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {plans.filter((p) => p.status !== 'deleted').length}
              </span>
              <span className="text-xs text-slate-400 font-medium">ฉบับ</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-1">
              แผนการสอนและภาระงานครู
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อผู้ตรวจ, รหัส, ตำแหน่ง, สาขา, หรือกลุ่มสาระ..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto w-full sm:w-auto shrink-0">
            <button
              onClick={() => setFilterRole('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterRole === 'all'
                  ? 'bg-white text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ผู้ตรวจทุกคน ({reviewerStatsList.length})
            </button>
            <button
              onClick={() => setFilterRole('heads')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterRole === 'heads'
                  ? 'bg-white text-indigo-900 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              หัวหน้าสาระ & สาขา
            </button>
            <button
              onClick={() => setFilterRole('pending_only')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterRole === 'pending_only'
                  ? 'bg-amber-500 text-slate-950 shadow-2xs font-extrabold'
                  : 'text-amber-800 hover:bg-white/50'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>มีงานค้างตรวจ</span>
            </button>
            <button
              onClick={() => setFilterRole('admin')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                filterRole === 'admin'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แอดมิน & ผู้บริหาร
            </button>
          </div>
        </div>

        {/* Reviewer Table & List */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 p-3 sm:p-4">
          {filteredList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-700">ไม่พบรายชื่อผู้ตรวจตามเงื่อนไข</p>
              <p className="text-xs text-slate-400">ลองล้างคำค้นหาหรือเปลี่ยนตัวกรองกลุ่มผู้ตรวจ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredList.map((stat, idx) => {
                const photoUrl = formatGoogleDriveImageUrl(stat.teacher.photo);
                const isExpanded = expandedTeacherId === stat.teacher.Teacher_ID;

                return (
                  <div
                    key={`reviewer-stat-${stat.teacher.Teacher_ID}`}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      isExpanded
                        ? 'border-indigo-400 shadow-md ring-2 ring-indigo-50'
                        : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                    }`}
                  >
                    {/* Main Reviewer Row */}
                    <div
                      onClick={() => setExpandedTeacherId(isExpanded ? null : stat.teacher.Teacher_ID)}
                      className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Left: Teacher Profile & Title */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs font-bold text-slate-400 w-6 text-center shrink-0">
                          {idx + 1}
                        </span>

                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={stat.teacher.Name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-indigo-700 font-mono">
                              {getInitials(stat.teacher.Name)}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm truncate">
                              {stat.teacher.Name}
                            </h4>
                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold border border-slate-200">
                              {stat.teacher.Teacher_ID}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                stat.roleType === 'dept_head'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : stat.roleType === 'branch_head'
                                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                                  : stat.roleType === 'admin'
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              }`}
                            >
                              {stat.titleBadge}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            <span>กลุ่มสาระ{stat.teacher.Learning_Area || '-'}</span>
                            {stat.teacher.branch && (
                              <span className="text-sky-700 font-medium">· สาขา{stat.teacher.branch}</span>
                            )}
                            {stat.lastReviewedAt && (
                              <span className="text-[11px] text-slate-400">
                                ตรวจล่าสุด: {new Date(stat.lastReviewedAt).toLocaleDateString('th-TH')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Metrics & Badges */}
                      <div className="flex items-center gap-2 sm:gap-4 flex-wrap self-end md:self-center shrink-0">
                        {/* 1. ตรวจแล้ว */}
                        <div className="text-center px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl min-w-[70px]">
                          <span className="text-[10px] text-emerald-700 font-semibold block">ตรวจแล้ว</span>
                          <span className="text-base font-black text-emerald-800 font-mono">
                            {stat.totalReviewed}
                          </span>
                        </div>

                        {/* 2. ส่งกลับแก้ไข */}
                        {stat.needsRevisionCount > 0 && (
                          <div className="text-center px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-xl min-w-[65px]">
                            <span className="text-[10px] text-rose-700 font-semibold block">ส่งกลับแก้</span>
                            <span className="text-base font-black text-rose-700 font-mono">
                              {stat.needsRevisionCount}
                            </span>
                          </div>
                        )}

                        {/* 3. ค้างตรวจ */}
                        <div
                          className={`text-center px-3 py-1.5 rounded-xl border min-w-[70px] ${
                            stat.pendingCount > 0
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <span className="text-[10px] font-semibold block">
                            {stat.pendingCount > 0 ? '⚠️ ค้างตรวจ' : 'ไม่มีค้าง'}
                          </span>
                          <span className="text-base font-black font-mono">
                            {stat.pendingCount}
                          </span>
                        </div>

                        {/* 4. Expand Toggle Button */}
                        <button
                          type="button"
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            isExpanded ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title="ดูรายละเอียดเอกสารที่ตรวจและค้างตรวจ"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/90 p-4 space-y-3 animate-in fade-in duration-150">
                        {/* Sub-tab selection: Reviewed Plans vs Pending Plans */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailSubTab('reviewed');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                detailSubTab === 'reviewed'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>เอกสารที่ตรวจแล้ว ({stat.reviewedPlans.length})</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailSubTab('pending');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                detailSubTab === 'pending'
                                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>เอกสารที่ค้างรอตรวจ ({stat.pendingPlans.length})</span>
                            </button>
                          </div>

                          <span className="text-[11px] text-slate-500">
                            ภาระงานรวม: {stat.totalWorkload} รายการ (สำเร็จ {stat.completionRate}%)
                          </span>
                        </div>

                        {/* Sub-tab Content: Reviewed Plans */}
                        {detailSubTab === 'reviewed' && (
                          <div>
                            {stat.reviewedPlans.length === 0 ? (
                              <div className="py-6 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                                ยังไม่มีรายการที่ตรวจเสร็จสิ้น
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {stat.reviewedPlans.map((p) => (
                                  <div
                                    key={`reviewed-${p.id}`}
                                    className="bg-white p-3 rounded-xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-indigo-300 transition-colors"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-xs text-slate-900 truncate">
                                          {p.subject_code ? `${p.subject_code} ` : ''}{p.subject_name || p.plan_title}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-100 text-slate-700 font-semibold">
                                          {p.grade_level || 'ทุกระดับชั้น'}
                                        </span>
                                        <span
                                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                            p.status === 'approved' || p.status === 'passed'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : p.status === 'needs_revision'
                                              ? 'bg-rose-100 text-rose-800'
                                              : 'bg-amber-100 text-amber-800'
                                          }`}
                                        >
                                          {p.status === 'approved' || p.status === 'passed'
                                            ? 'อนุมัติแล้ว'
                                            : p.status === 'needs_revision'
                                            ? 'ส่งกลับแก้ไข'
                                            : p.status}
                                        </span>
                                        {p.total_score !== undefined && p.total_score !== null && (
                                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                            {p.total_score} คะแนน
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                                        <span>ครูผู้ส่ง: <strong className="text-slate-700">{p.teacher_name}</strong></span>
                                        <span>· ตรวจเมื่อ: {p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString('th-TH') : '-'}</span>
                                      </div>
                                      {p.review_comment && (
                                        <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100 mt-1 italic">
                                          &ldquo;{p.review_comment}&rdquo;
                                        </div>
                                      )}
                                    </div>

                                    {/* Action links */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                      {p.file_url && p.file_url !== '#' && (
                                        <a
                                          href={p.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                          title="เปิดดูไฟล์ต้นฉบับ"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                      )}
                                      {onOpenReview && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onClose();
                                            onOpenReview(p);
                                          }}
                                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                        >
                                          ดูผลประเมิน
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sub-tab Content: Pending Plans */}
                        {detailSubTab === 'pending' && (
                          <div>
                            {stat.pendingPlans.length === 0 ? (
                              <div className="py-6 text-center text-emerald-600 text-xs bg-emerald-50/50 rounded-xl border border-emerald-200 font-bold flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>ยอดเยี่ยม! ครูท่านนี้ไม่มีงานค้างตรวจในขณะนี้</span>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {stat.pendingPlans.map((p) => (
                                  <div
                                    key={`pending-${p.id}`}
                                    className="bg-white p-3 rounded-xl border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-amber-400 transition-colors"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-xs text-slate-900 truncate">
                                          {p.subject_code ? `${p.subject_code} ` : ''}{p.subject_name || p.plan_title}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-100 text-slate-700 font-semibold">
                                          {p.grade_level || 'ทุกระดับชั้น'}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                                          รอตรวจ
                                        </span>
                                        {p.is_late && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800">
                                            ส่งช้า
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-0.5">
                                        ครูผู้ส่ง: <strong className="text-slate-700">{p.teacher_name}</strong> ({p.learning_area || '-'})
                                      </div>
                                    </div>

                                    {/* Action link */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                      {p.file_url && p.file_url !== '#' && (
                                        <a
                                          href={p.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                          title="เปิดดูไฟล์ต้นฉบับ"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                      )}
                                      {onOpenReview && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onClose();
                                            onOpenReview(p);
                                          }}
                                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                                        >
                                          เปิดตรวจ
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              ข้อมูลสถิติประมวลผลแบบเรียลไทม์จากฐานข้อมูลระบบตรวจประเมินแผนการจัดการเรียนรู้
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

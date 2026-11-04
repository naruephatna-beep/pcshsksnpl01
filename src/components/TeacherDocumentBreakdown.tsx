import React, { useState, useMemo } from 'react';
import {
  Teacher,
  LessonPlan,
  PlanTypeDeadlineConfig,
  PlanStatusConfig,
  isTeacherAdmin,
} from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import { formatThaiDateTime } from '../utils/deadlineUtils';
import {
  FileText,
  Search,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Filter,
  Check,
  Edit,
  Trash2,
  UserCheck,
  Award,
  Layers,
  ArrowUpDown,
  X,
  Send,
  Zap,
  Mail,
} from 'lucide-react';

export interface TeacherDocumentBreakdownProps {
  teachers: Teacher[];
  plans: LessonPlan[];
  deadlineConfigs?: PlanTypeDeadlineConfig[];
  statusConfigs?: PlanStatusConfig[];
  onOpenReview?: (plan: LessonPlan) => void;
  onEditPlan?: (plan: LessonPlan) => void;
  onDeletePlan?: (planId: string) => void;
  onSendReminder?: (teacher: Teacher, missingTypes?: string[]) => void;
  onOpenCertificate?: (plan: LessonPlan) => void;
  embedded?: boolean;
}

export interface TeacherBreakdownRow {
  teacher: Teacher;
  submittedPlans: LessonPlan[];
  countsByType: Record<string, number>;
  totalSubmitted: number;
  approvedCount: number;
  pendingCount: number;
  needsRevisionCount: number;
  latestSubmissionDate: string | null;
}

export const TeacherDocumentBreakdown: React.FC<TeacherDocumentBreakdownProps> = ({
  teachers,
  plans,
  deadlineConfigs = [],
  statusConfigs = [],
  onOpenReview,
  onEditPlan,
  onDeletePlan,
  onSendReminder,
  onOpenCertificate,
  embedded = false,
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('ทั้งหมด');
  const [submissionFilter, setSubmissionFilter] = useState<
    'all' | 'has_submissions' | 'no_submissions' | 'high_volume'
  >('all');
  const [selectedDocTypeFilter, setSelectedDocTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<
    'total_desc' | 'total_asc' | 'name_asc' | 'area_asc'
  >('total_desc');

  // Expanded rows state
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Set<string>>(
    new Set()
  );
  const [activeTabPerTeacher, setActiveTabPerTeacher] = useState<
    Record<string, string>
  >({});

  // Print modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Normalize string helper
  const norm = (s?: string) => String(s || '').trim().toLowerCase();

  // 1. Filter out administrators so this report focuses on teaching staff
  const teachingStaff = useMemo(() => {
    return teachers.filter((t) => !isTeacherAdmin(t));
  }, [teachers]);

  // 2. Discover all document types dynamically
  // Priority: 1. แผนย่อ, 2. แผนสมบูรณ์, 3. Configured deadlines, 4. Any other plan_type in plans
  const documentTypes = useMemo(() => {
    const typeSet = new Set<string>();

    // Standard types
    const standardPriority = [
      'แผนการจัดการเรียนรู้ฉบับย่อ',
      'แผนการจัดการเรียนรู้ฉบับสมบูรณ์',
    ];

    // Configured active assignments
    const configuredTypes = deadlineConfigs
      .filter((c) => c.is_active !== false)
      .map((c) => c.name.trim());

    // Types found in submitted plans
    const submittedTypes = plans
      .map((p) => p.plan_type?.trim())
      .filter(Boolean);

    // Combine all
    configuredTypes.forEach((t) => typeSet.add(t));
    submittedTypes.forEach((t) => typeSet.add(t));

    // Sort with standard priority first
    const list = Array.from(typeSet);
    list.sort((a, b) => {
      const idxA = standardPriority.indexOf(a);
      const idxB = standardPriority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, 'th');
    });

    return list;
  }, [deadlineConfigs, plans]);

  // 3. Extract unique Learning Areas
  const learningAreas = useMemo(() => {
    const set = new Set<string>();
    teachingStaff.forEach((t) => {
      const area = (t.Learning_Area || '').trim();
      if (
        area &&
        area !== '-' &&
        !area.includes('กลุ่มบริหาร') &&
        !area.includes('ฝ่ายบริหาร')
      ) {
        set.add(area);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [teachingStaff]);

  // 4. Map each teacher with their submitted plans and per-type counts
  const teacherRows: TeacherBreakdownRow[] = useMemo(() => {
    return teachingStaff.map((teacher) => {
      const teacherIdNorm = norm(teacher.Teacher_ID);
      const teacherNameNorm = norm(teacher.Name);
      const teacherEmailNorm = norm(teacher.Email);

      // Find all plans belonging to this teacher
      const teacherPlans = plans.filter((p) => {
        const pId = norm(p.teacher_id);
        const pName = norm(p.teacher_name);
        return (
          (teacherIdNorm && pId === teacherIdNorm) ||
          (teacherNameNorm && pName === teacherNameNorm) ||
          (teacherEmailNorm && norm(p.teacher_name).includes(teacherEmailNorm))
        );
      });

      // Count plans per document type
      const counts: Record<string, number> = {};
      documentTypes.forEach((t) => {
        counts[t] = 0;
      });

      teacherPlans.forEach((p) => {
        const pType = (p.plan_type || '').trim();
        // Match directly or find closest match in documentTypes
        const matchedType =
          documentTypes.find(
            (t) => norm(t) === norm(pType) || pType.includes(t) || t.includes(pType)
          ) || pType;

        counts[matchedType] = (counts[matchedType] || 0) + 1;
      });

      // Status counters
      const approvedCount = teacherPlans.filter(
        (p) => p.status === 'approved' || p.status === 'passed'
      ).length;
      const needsRevisionCount = teacherPlans.filter(
        (p) => p.status === 'needs_revision'
      ).length;
      const pendingCount = teacherPlans.length - approvedCount - needsRevisionCount;

      // Find latest submission date
      let latestSubmissionDate: string | null = null;
      if (teacherPlans.length > 0) {
        const sorted = [...teacherPlans].sort(
          (a, b) =>
            new Date(b.submitted_at || 0).getTime() -
            new Date(a.submitted_at || 0).getTime()
        );
        latestSubmissionDate = sorted[0].submitted_at;
      }

      return {
        teacher,
        submittedPlans: teacherPlans,
        countsByType: counts,
        totalSubmitted: teacherPlans.length,
        approvedCount,
        pendingCount,
        needsRevisionCount,
        latestSubmissionDate,
      };
    });
  }, [teachingStaff, plans, documentTypes]);

  // 5. Total statistics
  const overallStats = useMemo(() => {
    const totalTeachers = teacherRows.length;
    const teachersWithSubmissions = teacherRows.filter(
      (r) => r.totalSubmitted > 0
    ).length;
    const teachersWithoutSubmissions = totalTeachers - teachersWithSubmissions;
    const totalDocuments = teacherRows.reduce(
      (sum, r) => sum + r.totalSubmitted,
      0
    );
    const totalApproved = teacherRows.reduce(
      (sum, r) => sum + r.approvedCount,
      0
    );

    // Sum per type across all teachers
    const typeTotals: Record<string, number> = {};
    documentTypes.forEach((t) => {
      typeTotals[t] = teacherRows.reduce(
        (sum, r) => sum + (r.countsByType[t] || 0),
        0
      );
    });

    const averagePerTeacher =
      totalTeachers > 0 ? (totalDocuments / totalTeachers).toFixed(1) : '0';

    return {
      totalTeachers,
      teachersWithSubmissions,
      teachersWithoutSubmissions,
      totalDocuments,
      totalApproved,
      typeTotals,
      averagePerTeacher,
    };
  }, [teacherRows, documentTypes]);

  // 6. Filter & Sort rows
  const filteredRows = useMemo(() => {
    return teacherRows
      .filter((row) => {
        // Search query
        if (searchQuery.trim()) {
          const q = norm(searchQuery);
          const nameMatch = norm(row.teacher.Name).includes(q);
          const idMatch = norm(row.teacher.Teacher_ID).includes(q);
          const areaMatch = norm(row.teacher.Learning_Area).includes(q);
          const planMatch = row.submittedPlans.some(
            (p) =>
              norm(p.plan_title).includes(q) ||
              norm(p.subject_code).includes(q) ||
              norm(p.subject_name).includes(q)
          );
          if (!nameMatch && !idMatch && !areaMatch && !planMatch) return false;
        }

        // Learning Area filter
        if (selectedArea !== 'ทั้งหมด') {
          if ((row.teacher.Learning_Area || '').trim() !== selectedArea) {
            return false;
          }
        }

        // Submission Volume Filter
        if (submissionFilter === 'has_submissions' && row.totalSubmitted === 0) {
          return false;
        }
        if (submissionFilter === 'no_submissions' && row.totalSubmitted > 0) {
          return false;
        }
        if (submissionFilter === 'high_volume' && row.totalSubmitted < 3) {
          return false;
        }

        // Specific Document Type Filter
        if (selectedDocTypeFilter !== 'all') {
          const count = row.countsByType[selectedDocTypeFilter] || 0;
          if (count === 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'total_desc') {
          return b.totalSubmitted - a.totalSubmitted;
        }
        if (sortBy === 'total_asc') {
          return a.totalSubmitted - b.totalSubmitted;
        }
        if (sortBy === 'name_asc') {
          return a.teacher.Name.localeCompare(b.teacher.Name, 'th');
        }
        if (sortBy === 'area_asc') {
          return (a.teacher.Learning_Area || '').localeCompare(
            b.teacher.Learning_Area || '',
            'th'
          );
        }
        return 0;
      });
  }, [
    teacherRows,
    searchQuery,
    selectedArea,
    submissionFilter,
    selectedDocTypeFilter,
    sortBy,
  ]);

  // Toggle single row expand
  const toggleExpandTeacher = (teacherId: string) => {
    setExpandedTeacherIds((prev) => {
      const next = new Set(prev);
      if (next.has(teacherId)) {
        next.delete(teacherId);
      } else {
        next.add(teacherId);
      }
      return next;
    });
  };

  // Expand all / Collapse all
  const toggleExpandAll = () => {
    if (expandedTeacherIds.size === filteredRows.length) {
      setExpandedTeacherIds(new Set());
    } else {
      setExpandedTeacherIds(
        new Set(filteredRows.map((r) => r.teacher.Teacher_ID))
      );
    }
  };

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const header = [
      'ลำดับ',
      'รหัสประจำตัว',
      'ชื่อ-สกุล',
      'กลุ่มสาระการเรียนรู้',
      'อีเมล',
      ...documentTypes.map((t) => `"${t} (ฉบับ)"`),
      'รวมเอกสารทั้งหมด (ฉบับ)',
      'อนุมัติแล้ว',
      'รอตรวจ',
      'ส่งกลับแก้ไข',
      'ส่งล่าสุดเมื่อ',
    ];

    const rows = filteredRows.map((row, index) => {
      return [
        index + 1,
        `"${row.teacher.Teacher_ID}"`,
        `"${row.teacher.Name}"`,
        `"${row.teacher.Learning_Area || '-'}"`,
        `"${row.teacher.Email || '-'}"`,
        ...documentTypes.map((t) => row.countsByType[t] || 0),
        row.totalSubmitted,
        row.approvedCount,
        row.pendingCount,
        row.needsRevisionCount,
        `"${row.latestSubmissionDate ? row.latestSubmissionDate.split('T')[0] : 'ยังไม่มีการส่ง'}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `รายงานสรุปประเภทเอกสารรายบุคคล_${timestamp}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Metrics Strip (Domain: SaaS & Academic Admin) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            เอกสารที่ส่งทั้งหมด
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums">
              {overallStats.totalDocuments}
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              อนุมัติ {overallStats.totalApproved}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            เฉลี่ย {overallStats.averagePerTeacher} ฉบับ / ท่าน
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            ครูที่ส่งเอกสารแล้ว
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono tabular-nums">
              {overallStats.teachersWithSubmissions}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              /{overallStats.totalTeachers} ท่าน
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            คิดเป็น{' '}
            {overallStats.totalTeachers > 0
              ? Math.round(
                  (overallStats.teachersWithSubmissions /
                    overallStats.totalTeachers) *
                    100
                )
              : 0}
            % ของครูทั้งหมด
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            ยังไม่มีการส่งเอกสาร
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono tabular-nums">
              {overallStats.teachersWithoutSubmissions}
            </span>
            <span className="text-xs text-slate-500">ท่าน</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            รอการติดตามจากฝ่ายวิชาการ
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            หมวดหมู่ประเภทเอกสาร
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono tabular-nums">
              {documentTypes.length}
            </span>
            <span className="text-xs text-slate-500">ประเภท</span>
          </div>
          <div
            className="text-[10px] text-slate-400 mt-0.5 truncate"
            title={documentTypes.join(', ')}
          >
            {documentTypes[0] || '-'} ฯลฯ
          </div>
        </div>
      </div>

      {/* 2. Filter & Actions Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-2.5">
          {/* Search input */}
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อครู, รหัส, กลุ่มสาระ หรือชื่อเอกสารที่ส่ง..."
              className="w-full h-8 pl-9 pr-3 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Document Type Highlight Filter */}
          <div className="flex items-center gap-1.5 w-full lg:w-auto shrink-0">
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">
              ประเภท:
            </span>
            <select
              value={selectedDocTypeFilter}
              onChange={(e) => setSelectedDocTypeFilter(e.target.value)}
              className="w-full sm:w-auto h-8 px-2.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
            >
              <option value="all">ทุกประเภทเอกสาร ({documentTypes.length})</option>
              {documentTypes.map((t) => (
                <option key={t} value={t}>
                  {t} ({overallStats.typeTotals[t] || 0} ฉบับ)
                </option>
              ))}
            </select>
          </div>

          {/* Submission Filter Segmented Tabs */}
          <div className="flex h-8 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold shrink-0 overflow-x-auto max-w-full touch-scroll w-full lg:w-auto">
            <button
              onClick={() => setSubmissionFilter('all')}
              className={`px-2.5 rounded-md transition-all shrink-0 cursor-pointer ${
                submissionFilter === 'all'
                  ? 'bg-white shadow-2xs text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({teacherRows.length})
            </button>
            <button
              onClick={() => setSubmissionFilter('has_submissions')}
              className={`px-2.5 rounded-md transition-all shrink-0 cursor-pointer ${
                submissionFilter === 'has_submissions'
                  ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                  : 'text-emerald-700 hover:bg-white/50'
              }`}
            >
              ส่งแล้ว ({overallStats.teachersWithSubmissions})
            </button>
            <button
              onClick={() => setSubmissionFilter('no_submissions')}
              className={`px-2.5 rounded-md transition-all shrink-0 cursor-pointer ${
                submissionFilter === 'no_submissions'
                  ? 'bg-rose-600 text-white font-bold shadow-2xs'
                  : 'text-rose-700 hover:bg-white/50'
              }`}
            >
              ยังไม่ส่ง ({overallStats.teachersWithoutSubmissions})
            </button>
            <button
              onClick={() => setSubmissionFilter('high_volume')}
              className={`px-2.5 rounded-md transition-all shrink-0 cursor-pointer ${
                submissionFilter === 'high_volume'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                  : 'text-amber-800 hover:bg-white/50'
              }`}
            >
              ≥ 3 ฉบับ
            </button>
          </div>
        </div>

        {/* Second Row: Learning Area Filters + Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
          {/* Learning Area Scrollable Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs touch-scroll w-full sm:w-auto">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">
              กลุ่มสาระ:
            </span>
            <button
              onClick={() => setSelectedArea('ทั้งหมด')}
              className={`h-6.5 px-2 rounded-md shrink-0 font-medium transition-all cursor-pointer text-[11px] ${
                selectedArea === 'ทั้งหมด'
                  ? 'bg-[#0B1329] text-amber-400 font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              ทั้งหมด
            </button>
            {learningAreas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`h-6.5 px-2 rounded-md shrink-0 font-medium transition-all cursor-pointer text-[11px] whitespace-nowrap ${
                  selectedArea === area
                    ? 'bg-[#0B1329] text-amber-400 font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {area}
              </button>
            ))}
          </div>

          {/* Action Tools: Sort, Expand/Collapse, Export CSV, Print */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-7 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-700 cursor-pointer"
              title="เรียงลำดับ"
            >
              <option value="total_desc">ส่งมากสุด → น้อยสุด</option>
              <option value="total_asc">ส่งน้อยสุด → มากสุด</option>
              <option value="name_asc">ชื่อ ก-ฮ</option>
              <option value="area_asc">กลุ่มสาระ</option>
            </select>

            {/* Expand / Collapse All */}
            <button
              onClick={toggleExpandAll}
              className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="ขยาย/ยุบรายละเอียดเอกสารของทุกคน"
            >
              {expandedTeacherIds.size === filteredRows.length ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>ยุบทั้งหมด</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>ขยายทั้งหมด</span>
                </>
              )}
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="h-7 px-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
              title="ส่งออกตารางสรุปเป็นไฟล์ Excel/CSV (UTF-8 BOM รองรับภาษาไทยสมบูรณ์)"
            >
              <Download className="w-3 h-3" />
              <span>ส่งออก Excel</span>
            </button>

            {/* Print Summary */}
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="h-7 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
              title="พิมพ์หน้ารายงานสรุปจำแนกประเภทเอกสารรายบุคคล"
            >
              <Printer className="w-3 h-3" />
              <span>พิมพ์สรุป</span>
            </button>

            {/* Bulk Reminder to Teachers with 0 submissions via academics@pcshsksn.ac.th */}
            {onSendReminder && overallStats.teachersWithoutSubmissions > 0 && (
              <button
                onClick={() => {
                  const zeroSubTeachers = filteredRows
                    .filter((r) => r.totalSubmitted === 0)
                    .map((r) => r.teacher);
                  if (zeroSubTeachers.length > 0) {
                    zeroSubTeachers.forEach((t) => onSendReminder(t, []));
                  }
                }}
                className="h-7 px-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                title={`คลิกเดียวส่งอีเมลแจ้งเตือนคุณครูที่ยังไม่ได้ส่งเอกสารทั้งหมด ${overallStats.teachersWithoutSubmissions} ท่าน จาก academics@pcshsksn.ac.th`}
              >
                <Mail className="w-3 h-3" />
                <span>เตือนเมล ({overallStats.teachersWithoutSubmissions} ท่าน)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Breakdown Matrix Table */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs bg-white">
        <table className="w-full text-left text-xs border-collapse min-w-[840px]">
          <thead className="bg-[#0B1329] text-slate-200 font-bold sticky top-0 z-20 shadow-md">
            <tr>
              <th className="py-2.5 px-2 w-10 text-center border-b border-slate-800 text-slate-400">
                #
              </th>
              <th className="py-2.5 px-3 min-w-[210px] border-b border-slate-800 sticky left-0 z-30 bg-[#0B1329] shadow-[2px_0_5px_rgba(0,0,0,0.15)]">
                <div className="text-white font-extrabold text-xs">ครูผู้สอน</div>
                <div className="text-[10px] text-amber-300 font-normal">
                  รหัส / กลุ่มสาระการเรียนรู้
                </div>
              </th>

              {/* Dynamic Columns for each Document Type */}
              {documentTypes.map((type) => {
                const totalInType = overallStats.typeTotals[type] || 0;
                const isSelected = selectedDocTypeFilter === type;
                return (
                  <th
                    key={type}
                    className={`py-2.5 px-2 text-center border-b border-slate-800 min-w-[125px] ${
                      isSelected ? 'bg-indigo-950/90 text-amber-300' : ''
                    }`}
                  >
                    <div
                      className="font-bold text-xs truncate max-w-[140px] mx-auto text-slate-100"
                      title={type}
                    >
                      {type}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 font-normal">
                      รวม {totalInType} ฉบับ
                    </div>
                  </th>
                );
              })}

              {/* Total Submissions Column */}
              <th className="py-2.5 px-2.5 text-center min-w-[95px] border-b border-slate-800 bg-[#0B1329] font-bold text-amber-300">
                <div>รวมส่ง</div>
                <div className="text-[10px] text-slate-400 font-normal">ทั้งหมด</div>
              </th>

              {/* Review Status Summary Column */}
              <th className="py-2.5 px-2.5 text-center min-w-[120px] border-b border-slate-800 text-slate-300">
                <div>สถานะการตรวจ</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  อนุมัติ / รอ / แก้ไข
                </div>
              </th>

              {/* Expand / Action Column */}
              <th className="py-2.5 px-3 text-right min-w-[110px] border-b border-slate-800 text-slate-300">
                รายการเอกสาร
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={documentTypes.length + 5}
                  className="py-12 text-center text-slate-400"
                >
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-sm text-slate-600">
                    ไม่พบข้อมูลคุณครูตามเงื่อนไขที่เลือก
                  </p>
                  <p className="text-xs text-slate-400">
                    ลองเปลี่ยนตัวกรองกลุ่มสาระ หรือล้างคำค้นหา
                  </p>
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const {
                  teacher,
                  submittedPlans,
                  countsByType,
                  totalSubmitted,
                  approvedCount,
                  pendingCount,
                  needsRevisionCount,
                  latestSubmissionDate,
                } = row;

                const isExpanded = expandedTeacherIds.has(teacher.Teacher_ID);
                const photoUrl = formatGoogleDriveImageUrl(teacher.photo);
                const activeTab = activeTabPerTeacher[teacher.Teacher_ID] || 'all';

                // Filter plans inside expanded view if a sub-tab is chosen
                const plansToDisplay =
                  activeTab === 'all'
                    ? submittedPlans
                    : submittedPlans.filter((p) => {
                        const pType = (p.plan_type || '').trim();
                        return (
                          norm(pType) === norm(activeTab) ||
                          pType.includes(activeTab) ||
                          activeTab.includes(pType)
                        );
                      });

                return (
                  <React.Fragment key={teacher.Teacher_ID}>
                    <tr
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        isExpanded ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Row # */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-400 text-xs font-semibold">
                        {idx + 1}
                      </td>

                      {/* Teacher Profile (Sticky left) */}
                      <td className="py-2.5 px-3 bg-white group-hover:bg-slate-50/80 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] border-r border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={teacher.Name}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[11px] font-bold text-indigo-700">
                                {getInitials(teacher.Name)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div
                              className="font-bold text-slate-900 text-xs truncate max-w-[150px]"
                              title={teacher.Name}
                            >
                              {teacher.Name}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono mt-0.5 truncate max-w-[150px]">
                              <span className="font-semibold text-slate-600">
                                {teacher.Teacher_ID}
                              </span>
                              <span>·</span>
                              <span className="truncate">{teacher.Learning_Area || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dynamic Columns for each Document Type Count */}
                      {documentTypes.map((type) => {
                        const count = countsByType[type] || 0;
                        const isHighlight =
                          selectedDocTypeFilter === type && count > 0;

                        return (
                          <td
                            key={type}
                            className={`py-2.5 px-2 text-center align-middle font-mono tabular-nums ${
                              selectedDocTypeFilter === type
                                ? 'bg-indigo-50/30'
                                : ''
                            }`}
                          >
                            {count > 0 ? (
                              <button
                                onClick={() => {
                                  // Open expand and switch to this type tab
                                  if (!isExpanded) {
                                    toggleExpandTeacher(teacher.Teacher_ID);
                                  }
                                  setActiveTabPerTeacher((prev) => ({
                                    ...prev,
                                    [teacher.Teacher_ID]: type,
                                  }));
                                }}
                                className={`inline-flex items-center justify-center min-w-[32px] h-6 px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                  isHighlight
                                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}
                                title={`คลิกเพื่อดูเอกสารประเภท "${type}" ทั้งหมด ${count} ฉบับของคุณครู ${teacher.Name}`}
                              >
                                {count}
                              </button>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Count */}
                      <td className="py-2.5 px-2.5 text-center font-mono tabular-nums">
                        {totalSubmitted > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-900 border border-indigo-200">
                            {totalSubmitted}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            0 ฉบับ
                          </span>
                        )}
                      </td>

                      {/* Review Status Summary */}
                      <td className="py-2.5 px-2.5 text-center">
                        {totalSubmitted === 0 ? (
                          <span className="text-[10px] text-slate-400">
                            ยังไม่มีส่ง
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-[10px] font-mono tabular-nums">
                            {approvedCount > 0 && (
                              <span
                                className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                                title={`อนุมัติแล้ว ${approvedCount} ฉบับ`}
                              >
                                ✓ {approvedCount}
                              </span>
                            )}
                            {pendingCount > 0 && (
                              <span
                                className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-800 font-bold border border-sky-200"
                                title={`รอตรวจ ${pendingCount} ฉบับ`}
                              >
                                ⏳ {pendingCount}
                              </span>
                            )}
                            {needsRevisionCount > 0 && (
                              <span
                                className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 font-bold border border-rose-200"
                                title={`ส่งกลับแก้ไข ${needsRevisionCount} ฉบับ`}
                              >
                                ⚠️ {needsRevisionCount}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action: Expand & View Details */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {totalSubmitted > 0 ? (
                            <button
                              onClick={() =>
                                toggleExpandTeacher(teacher.Teacher_ID)
                              }
                              className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                                isExpanded
                                  ? 'bg-[#0B1329] text-amber-400 shadow-2xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                              }`}
                              title={
                                isExpanded
                                  ? 'ยุบหน้ารายการเอกสาร'
                                  : `คลิกเพื่อดูรายละเอียดเอกสารทั้ง ${totalSubmitted} ฉบับ`
                              }
                            >
                              <span>
                                {isExpanded
                                  ? 'ซ่อน'
                                  : `ดูเอกสาร (${totalSubmitted})`}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            onSendReminder && (
                              <button
                                onClick={() => onSendReminder(teacher)}
                                className="h-7 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-semibold border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                                title="ส่งอีเมลแจ้งเตือนคุณครูท่านนี้"
                              >
                                <Zap className="w-3 h-3 text-rose-600" />
                                <span>เตือน</span>
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* 4. EXPANDABLE SUB-ROW: DETAILED LIST OF DOCUMENTS SUBMITTED BY THIS TEACHER */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 border-b border-slate-200">
                        <td
                          colSpan={documentTypes.length + 5}
                          className="p-3 sm:p-4 animate-in fade-in duration-150"
                        >
                          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3">
                            {/* Sub-header inside expansion */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-amber-500" />
                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                                  เอกสารที่ส่งโดยคุณครู {teacher.Name} (รวม{' '}
                                  {totalSubmitted} ฉบับ)
                                </h4>
                                {latestSubmissionDate && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    · ส่งล่าสุด:{' '}
                                    {latestSubmissionDate.split('T')[0]}
                                  </span>
                                )}
                              </div>

                              {/* Document Type Filter Tabs inside expansion */}
                              <div className="flex items-center gap-1 overflow-x-auto touch-scroll text-xs">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase mr-1">
                                  แสดง:
                                </span>
                                <button
                                  onClick={() =>
                                    setActiveTabPerTeacher((prev) => ({
                                      ...prev,
                                      [teacher.Teacher_ID]: 'all',
                                    }))
                                  }
                                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                    activeTab === 'all'
                                      ? 'bg-[#0B1329] text-amber-400 font-bold'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  ทั้งหมด ({totalSubmitted})
                                </button>
                                {documentTypes.map((type) => {
                                  const count = countsByType[type] || 0;
                                  if (count === 0) return null;
                                  return (
                                    <button
                                      key={type}
                                      onClick={() =>
                                        setActiveTabPerTeacher((prev) => ({
                                          ...prev,
                                          [teacher.Teacher_ID]: type,
                                        }))
                                      }
                                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                                        activeTab === type
                                          ? 'bg-[#0B1329] text-amber-400 font-bold'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                      }`}
                                    >
                                      {type} ({count})
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Documents Cards / Rows */}
                            {plansToDisplay.length === 0 ? (
                              <div className="py-6 text-center text-slate-400 text-xs">
                                ไม่พบเอกสารในหมวดหมู่นี้
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {plansToDisplay.map((plan) => {
                                  const isLate = !!plan.is_late;
                                  const isApproved =
                                    plan.status === 'approved' ||
                                    plan.status === 'passed';
                                  const isRevision =
                                    plan.status === 'needs_revision';

                                  return (
                                    <div
                                      key={plan.id}
                                      className="border border-slate-200 hover:border-slate-300 rounded-xl p-3 bg-white hover:bg-slate-50/50 transition-all flex flex-col justify-between shadow-2xs"
                                    >
                                      {/* Top: Subject Code & Doc Type Tag */}
                                      <div>
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 truncate max-w-[160px]">
                                            {plan.plan_type}
                                          </span>
                                          {isLate ? (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                                              <AlertTriangle className="w-2.5 h-2.5" />
                                              <span>ส่งช้า</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                              <CheckCircle2 className="w-2.5 h-2.5" />
                                              <span>ตรงเวลา</span>
                                            </span>
                                          )}
                                        </div>

                                        {/* Plan Title */}
                                        <h5
                                          className="font-bold text-slate-900 text-xs line-clamp-2 mt-1 leading-snug"
                                          title={plan.plan_title}
                                        >
                                          {plan.plan_title}
                                        </h5>

                                        {/* Subject & Grade Level */}
                                        <div className="text-[11px] text-slate-600 font-medium mt-1">
                                          <span>{plan.subject_code}</span>
                                          {plan.subject_name && (
                                            <span> {plan.subject_name}</span>
                                          )}
                                        </div>

                                        {/* Metadata Strip */}
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-mono">
                                          <span>
                                            {plan.grade_level || 'ทุกระดับชั้น'}
                                          </span>
                                          <span>·</span>
                                          <span>
                                            ภาค {plan.semester}/{plan.academic_year}
                                          </span>
                                          {plan.total_hours > 0 && (
                                            <>
                                              <span>·</span>
                                              <span>{plan.total_hours} ชม.</span>
                                            </>
                                          )}
                                        </div>

                                        {/* Submitted Date & Score */}
                                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                          <span className="text-slate-500 font-mono">
                                            {formatThaiDateTime(plan.submitted_at)}
                                          </span>
                                          {plan.total_score !== undefined &&
                                            plan.total_score !== null && (
                                              <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">
                                                {plan.total_score} คะแนน
                                              </span>
                                            )}
                                        </div>

                                        {/* Status Evaluation Notice */}
                                        <div className="mt-1 text-[10px]">
                                          {isApproved ? (
                                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                              <span>อนุมัติแล้ว</span>
                                            </span>
                                          ) : isRevision ? (
                                            <span className="text-rose-600 font-bold flex items-center gap-1">
                                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                                              <span>ส่งกลับแก้ไข</span>
                                            </span>
                                          ) : (
                                            <span className="text-sky-700 font-bold flex items-center gap-1">
                                              <Clock className="w-3 h-3 text-sky-600" />
                                              <span>รอการตรวจประเมิน</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                                        {/* View File Button */}
                                        {plan.file_url && plan.file_url !== '#' ? (
                                          <a
                                            href={plan.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="h-7 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                                            title="เปิดดูเอกสาร / ไฟล์แนบ Google Drive"
                                          >
                                            <Eye className="w-3 h-3 text-amber-400" />
                                            <span>เปิดดูเอกสาร</span>
                                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                                          </a>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 italic">
                                            ไม่มีไฟล์แนบ
                                          </span>
                                        )}

                                        <div className="flex items-center gap-1">
                                          {/* Certificate Button for Approved Plans */}
                                          {isApproved && onOpenCertificate && (
                                            <button
                                              onClick={() => onOpenCertificate(plan)}
                                              className="h-7 px-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-lg text-[11px] transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                                              title="เปิดดูและพิมพ์วุฒิบัตร / เกียรติบัตร ว.PA"
                                            >
                                              <Award className="w-3 h-3 text-slate-950" />
                                              <span>วุฒิบัตร ว.PA</span>
                                            </button>
                                          )}

                                          {/* Review Button */}
                                          {onOpenReview && (
                                            <button
                                              onClick={() => onOpenReview(plan)}
                                              className="h-7 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                              title="ประเมินผล / ให้คะแนนรูบริก"
                                            >
                                              ตรวจ
                                            </button>
                                          )}

                                          {/* Edit Plan */}
                                          {onEditPlan && (
                                            <button
                                              onClick={() => onEditPlan(plan)}
                                              className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                                              title="แก้ไขข้อมูลแผนนี้"
                                            >
                                              <Edit className="w-3 h-3" />
                                            </button>
                                          )}

                                          {/* Delete Plan */}
                                          {onDeletePlan && (
                                            <button
                                              onClick={() => onDeletePlan(plan.id)}
                                              className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                                              title="ลบเอกสารนี้"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. PRINT MODAL: Official Academic Report (พร้อมแบบพิมพ์รายงาน) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-[#0B1329] p-3.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">
                  พิมพ์รายงานสรุปการส่งเอกสารวิชาการจำแนกตามประเภทและรายบุคคล
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ทันที</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Body */}
            <div className="p-6 overflow-y-auto flex-1 font-sans text-slate-900 text-xs space-y-4 print:p-0">
              {/* Document Letterhead */}
              <div className="text-center space-y-1 border-b border-slate-300 pb-4">
                <div className="font-extrabold text-base text-slate-900">
                  โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
                </div>
                <div className="font-bold text-sm text-slate-800">
                  รายงานสรุปการส่งเอกสารวิชาการจำแนกตามประเภท (รายบุคคล)
                </div>
                <div className="text-xs text-slate-500">
                  ข้อมูล ณ วันที่{' '}
                  {new Date().toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {/* Summary Stats Strip for Print */}
              <div className="grid grid-cols-4 gap-2 text-center border border-slate-300 rounded-lg p-2 bg-slate-50 text-[11px]">
                <div>
                  <div className="text-slate-500">ครูทั้งหมด</div>
                  <div className="font-bold text-slate-900 font-mono">
                    {overallStats.totalTeachers} ท่าน
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">ส่งแล้ว</div>
                  <div className="font-bold text-emerald-700 font-mono">
                    {overallStats.teachersWithSubmissions} ท่าน
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">ยังไม่ส่ง</div>
                  <div className="font-bold text-rose-600 font-mono">
                    {overallStats.teachersWithoutSubmissions} ท่าน
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">เอกสารรวมทั้งหมด</div>
                  <div className="font-bold text-indigo-700 font-mono">
                    {overallStats.totalDocuments} ฉบับ
                  </div>
                </div>
              </div>

              {/* Printable Table */}
              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800">
                    <th className="border border-slate-300 p-1 text-center w-8">
                      #
                    </th>
                    <th className="border border-slate-300 p-1 text-left">
                      รหัส
                    </th>
                    <th className="border border-slate-300 p-1 text-left min-w-[120px]">
                      ชื่อ-สกุลครู
                    </th>
                    <th className="border border-slate-300 p-1 text-left">
                      กลุ่มสาระฯ
                    </th>
                    {documentTypes.map((type) => (
                      <th
                        key={type}
                        className="border border-slate-300 p-1 text-center"
                      >
                        {type}
                      </th>
                    ))}
                    <th className="border border-slate-300 p-1 text-center font-bold">
                      รวม
                    </th>
                    <th className="border border-slate-300 p-1 text-center">
                      สถานะ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr
                      key={row.teacher.Teacher_ID}
                      className="border-b border-slate-200"
                    >
                      <td className="border border-slate-300 p-1 text-center font-mono">
                        {index + 1}
                      </td>
                      <td className="border border-slate-300 p-1 font-mono">
                        {row.teacher.Teacher_ID}
                      </td>
                      <td className="border border-slate-300 p-1 font-medium">
                        {row.teacher.Name}
                      </td>
                      <td className="border border-slate-300 p-1">
                        {row.teacher.Learning_Area || '-'}
                      </td>
                      {documentTypes.map((t) => (
                        <td
                          key={t}
                          className="border border-slate-300 p-1 text-center font-mono"
                        >
                          {row.countsByType[t] > 0
                            ? row.countsByType[t]
                            : '-'}
                        </td>
                      ))}
                      <td className="border border-slate-300 p-1 text-center font-bold font-mono">
                        {row.totalSubmitted}
                      </td>
                      <td className="border border-slate-300 p-1 text-center">
                        {row.totalSubmitted > 0 ? 'ส่งแล้ว' : 'ยังไม่ส่ง'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures for Print */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="mb-12">
                    ลงชื่อ......................................................
                  </div>
                  <div className="font-bold">
                    (ผู้จัดทำรายงาน / เจ้าหน้าที่ฝ่ายวิชาการ)
                  </div>
                  <div className="text-slate-500">
                    วันที่............/............/............
                  </div>
                </div>
                <div>
                  <div className="mb-12">
                    ลงชื่อ......................................................
                  </div>
                  <div className="font-bold">
                    (หัวหน้าฝ่ายบริหารวิชาการ / ผู้อำนวยการ)
                  </div>
                  <div className="text-slate-500">
                    วันที่............/............/............
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Teacher, LessonPlan, isTeacherAdmin } from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  X,
  ShieldCheck,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Edit,
  Printer,
  BookOpen,
  Filter,
  Trash2,
  Eye,
  Check,
  Send,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface AdminTrackerModalProps {
  teachers: Teacher[];
  plans: LessonPlan[];
  isOpen: boolean;
  onClose: () => void;
  onEditTeacher: (teacher: Teacher) => void;
  onEditPlan: (plan: LessonPlan) => void;
  onDeletePlan: (planId: string) => void;
  onOpenDeadlineManager?: () => void;
}

export const AdminTrackerModal: React.FC<AdminTrackerModalProps> = ({
  teachers,
  plans,
  isOpen,
  onClose,
  onEditTeacher,
  onEditPlan,
  onDeletePlan,
  onOpenDeadlineManager,
}) => {
  const [filterArea, setFilterArea] = useState<string>('ทั้งหมด');
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'not_submitted' | 'late'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherForPlans, setSelectedTeacherForPlans] = useState<Teacher | null>(null);

  if (!isOpen) return null;

  // Filter non-admin teaching staff for submission tracking
  const teachingStaff = teachers.filter((t) => !isTeacherAdmin(t));

  const areas = [
    'ทั้งหมด',
    'วิทยาศาสตร์และเทคโนโลยี',
    'คณิตศาสตร์',
    'ภาษาต่างประเทศ',
    'ภาษาไทย',
    'สังคมศึกษา ศาสนา และวัฒนธรรม',
    'ศิลปะ',
    'สุขศึกษาและพลศึกษา',
    'กลุ่มบริหารวิชาการ',
  ];

  // Calculate statistics
  const teachersWithSubmissions = teachingStaff.filter((t) =>
    plans.some((p) => p.teacher_id === t.Teacher_ID)
  );
  const teachersWithoutSubmissions = teachingStaff.filter(
    (t) => !plans.some((p) => p.teacher_id === t.Teacher_ID)
  );
  const teachersWithLateSubmissions = teachingStaff.filter((t) =>
    plans.some((p) => p.teacher_id === t.Teacher_ID && p.is_late)
  );

  const submissionRate =
    teachingStaff.length > 0
      ? Math.round((teachersWithSubmissions.length / teachingStaff.length) * 100)
      : 0;

  // Filtered teachers list
  const filteredTeachers = teachingStaff.filter((teacher) => {
    // Area filter
    if (filterArea !== 'ทั้งหมด' && teacher.Learning_Area !== filterArea) {
      return false;
    }

    const teacherPlans = plans.filter((p) => p.teacher_id === teacher.Teacher_ID);
    const hasSubmitted = teacherPlans.length > 0;

    // Status filter
    if (filterStatus === 'submitted' && !hasSubmitted) return false;
    if (filterStatus === 'not_submitted' && hasSubmitted) return false;
    if (filterStatus === 'late' && !teacherPlans.some((p) => p.is_late)) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = teacher.Name.toLowerCase().includes(q);
      const matchId = teacher.Teacher_ID.toLowerCase().includes(q);
      const matchArea = teacher.Learning_Area.toLowerCase().includes(q);
      const matchEmail = teacher.Email.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchArea && !matchEmail) return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-6 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-4 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs uppercase font-bold text-amber-300 tracking-wider">
                  Admin Hub
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  สิทธิ์แก้ไขทุกอย่าง
                </span>
              </div>
              <h2 className="text-base sm:text-2xl font-bold tracking-tight truncate">
                ติดตามการส่งแผนรายบุคคล
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onOpenDeadlineManager && (
              <button
                onClick={onOpenDeadlineManager}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="กำหนดช่วงเวลาส่งงานของแต่ละประเภทและจัดการสถานะทั้งหมด"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>กำหนดส่ง & สถานะ</span>
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์รายงาน
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors active:scale-95 cursor-pointer"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top KPI Cards: 2x2 on mobile, 4-col on desktop */}
        <div className="bg-slate-50 p-3 sm:p-5 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold block">ครูผู้สอนทั้งหมด</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{teachingStaff.length}</span>
              <span className="text-xs text-slate-400">ท่าน</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
            <span className="text-xs text-emerald-700 font-semibold block">ส่งแผนแล้ว</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-emerald-600">{teachersWithSubmissions.length}</span>
              <span className="text-xs text-emerald-700 font-semibold">({submissionRate}%)</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs">
            <span className="text-xs text-rose-700 font-semibold block">ยังไม่ส่งแผน</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-rose-600">{teachersWithoutSubmissions.length}</span>
              <span className="text-xs text-rose-600">ท่าน</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs">
            <span className="text-xs text-indigo-700 font-semibold block">แผนการสอนรวมในระบบ</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-indigo-600">{plans.length}</span>
              <span className="text-xs text-indigo-600">ฉบับ</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3.5 sm:p-6 pb-2 border-b border-slate-100 space-y-2.5 sm:space-y-3 shrink-0">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อครู, รหัสครู (Teacher_ID), อีเมล..."
                className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0 overflow-x-auto max-w-full touch-scroll w-full md:w-auto">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                  filterStatus === 'all' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'
                }`}
              >
                ทั้งหมด ({teachingStaff.length})
              </button>
              <button
                onClick={() => setFilterStatus('submitted')}
                className={`px-3 py-1.5 rounded-lg transition-all text-emerald-700 shrink-0 cursor-pointer ${
                  filterStatus === 'submitted' ? 'bg-white shadow-xs font-bold' : ''
                }`}
              >
                ส่งแล้ว ({teachersWithSubmissions.length})
              </button>
              <button
                onClick={() => setFilterStatus('late')}
                className={`px-3 py-1.5 rounded-lg transition-all text-orange-700 shrink-0 cursor-pointer ${
                  filterStatus === 'late' ? 'bg-white shadow-xs font-bold' : ''
                }`}
              >
                ⚠️ ส่งช้า ({teachersWithLateSubmissions.length})
              </button>
              <button
                onClick={() => setFilterStatus('not_submitted')}
                className={`px-3 py-1.5 rounded-lg transition-all text-rose-700 shrink-0 cursor-pointer ${
                  filterStatus === 'not_submitted' ? 'bg-white shadow-xs font-bold' : ''
                }`}
              >
                ยังไม่ส่ง ({teachersWithoutSubmissions.length})
              </button>
            </div>
          </div>

          {/* Learning Area Badges */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs touch-scroll">
            {areas.map((a) => (
              <button
                key={a}
                onClick={() => setFilterArea(a)}
                className={`px-3 py-1 rounded-lg shrink-0 font-medium transition-colors cursor-pointer ${
                  filterArea === a
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Content: Mobile Cards (< md) + Desktop Table (>= md) */}
        <div className="p-3 sm:p-6 flex-1 overflow-y-auto touch-scroll">
          {/* Mobile Cards List (< md) */}
          <div className="md:hidden space-y-2.5">
            {filteredTeachers.map((teacher) => {
              const teacherPlans = plans.filter((p) => p.teacher_id === teacher.Teacher_ID);
              const hasSubmitted = teacherPlans.length > 0;
              const approvedCount = teacherPlans.filter((p) => p.status === 'approved').length;
              const pendingCount = teacherPlans.filter((p) => p.status === 'submitted').length;
              const photoUrl = formatGoogleDriveImageUrl(teacher.photo);

              return (
                <div
                  key={`mobile-${teacher.Teacher_ID}`}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
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
                          <span className="text-xs font-bold text-indigo-700">
                            {getInitials(teacher.Name)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">{teacher.Name}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                          <span className="bg-slate-100 px-1 rounded text-slate-700 font-bold">{teacher.Teacher_ID}</span>
                          <span className="truncate max-w-[140px]">{teacher.Learning_Area}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {hasSubmitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ส่งแล้ว</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>ยังไม่ส่ง</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Plan stats summary on mobile card */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <div className="text-slate-600">
                      {hasSubmitted ? (
                        <span>
                          ส่งแล้ว <strong className="text-indigo-700 font-bold">{teacherPlans.length}</strong> ฉบับ
                          <span className="text-[10px] text-slate-400 ml-1.5">(ผ่าน {approvedCount} · รอ {pendingCount})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">ยังไม่มีประวัติการส่งแผน</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasSubmitted && (
                        <button
                          onClick={() => setSelectedTeacherForPlans(teacher)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ดูแผน</span>
                        </button>
                      )}
                      <button
                        onClick={() => onEditTeacher(teacher)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors active:scale-95"
                        title="แก้ไขข้อมูลครู"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (>= md) with horizontal scroll support */}
          <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">ครูผู้สอน</th>
                    <th className="py-3 px-3">รหัส / กลุ่มสาระ</th>
                    <th className="py-3 px-3 text-center">สถานะการส่งแผน</th>
                    <th className="py-3 px-3 text-center">จำนวนแผน</th>
                    <th className="py-3 px-4 text-right">การจัดการ (Admin)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeachers.map((teacher) => {
                    const teacherPlans = plans.filter((p) => p.teacher_id === teacher.Teacher_ID);
                    const hasSubmitted = teacherPlans.length > 0;
                    const approvedCount = teacherPlans.filter((p) => p.status === 'approved').length;
                    const pendingCount = teacherPlans.filter((p) => p.status === 'submitted').length;
                    const photoUrl = formatGoogleDriveImageUrl(teacher.photo);

                    return (
                      <tr key={teacher.Teacher_ID} className="hover:bg-slate-50/70 transition-colors">
                        {/* Teacher Profile */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
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
                                <span className="text-xs font-bold text-indigo-700">
                                  {getInitials(teacher.Name)}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{teacher.Name}</div>
                              <div className="text-[11px] text-slate-400">{teacher.Email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Area & ID */}
                        <td className="py-3 px-3">
                          <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            {teacher.Teacher_ID}
                          </span>
                          <div className="text-slate-600 mt-0.5 font-medium">{teacher.Learning_Area}</div>
                        </td>

                        {/* Submission Status Badge */}
                        <td className="py-3 px-3 text-center">
                          {hasSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              ส่งแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3.5 h-3.5" />
                              ยังไม่ส่งแผน
                            </span>
                          )}
                        </td>

                        {/* Plan counts */}
                        <td className="py-3 px-3 text-center">
                          {hasSubmitted ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-indigo-700 text-sm">
                                {teacherPlans.length} ฉบับ
                              </span>
                              <div className="text-[10px] text-slate-400">
                                ผ่าน {approvedCount} • รอตรวจ {pendingCount}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Admin Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasSubmitted && (
                              <button
                                onClick={() => setSelectedTeacherForPlans(teacher)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                                title="ดูและแก้ไขแผนที่ส่งแล้ว"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>ดูแผน ({teacherPlans.length})</span>
                              </button>
                            )}
                            <button
                              onClick={() => onEditTeacher(teacher)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                              title="แก้ไขข้อมูลครูท่านนี้"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal for viewing all plans of selected teacher with Admin Edit / Delete capabilities */}
        {selectedTeacherForPlans && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="bg-indigo-900 text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">
                    แผนการสอนของ {selectedTeacherForPlans.Name} ({selectedTeacherForPlans.Teacher_ID})
                  </h3>
                  <p className="text-xs text-indigo-200">
                    กลุ่มสาระ: {selectedTeacherForPlans.Learning_Area}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTeacherForPlans(null)}
                  className="p-1 text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
                {plans
                  .filter((p) => p.teacher_id === selectedTeacherForPlans.Teacher_ID)
                  .map((plan) => (
                    <div
                      key={plan.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-sm">
                          {plan.subject_code} - {plan.subject_name}
                        </div>
                        <div className="text-slate-600 mt-0.5">{plan.plan_title}</div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span>ส่งเมื่อ {plan.submitted_at}</span>
                          <span>•</span>
                          <span>สถานะ: <strong className="text-indigo-700">{plan.status}</strong></span>
                          {plan.is_late && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
                              ⚠️ ส่งช้า {plan.submission_delay_text ? `(${plan.submission_delay_text})` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedTeacherForPlans(null);
                            onEditPlan(plan);
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-1 shadow-xs"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          แก้ไขแผน
                        </button>
                        <button
                          onClick={() => {
                            onDeletePlan(plan.id);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="ลบแผน"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>สิทธิ์แอดมิน: สามารถแก้ไขข้อมูลครู, ข้อมูลแผน และสถานะการตรวจได้ทุกรายการ</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

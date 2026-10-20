import React from 'react';
import { LessonPlan, Teacher, isTeacherAdmin } from '../types';
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  Lock,
} from 'lucide-react';

interface DashboardStatsProps {
  plans: LessonPlan[];
  teachers: Teacher[];
  currentTeacher: Teacher;
  selectedArea?: string;
  onSelectArea: (area: string) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  plans,
  teachers,
  currentTeacher,
  selectedArea,
  onSelectArea,
}) => {
  const isAdmin = isTeacherAdmin(currentTeacher);

  // Relevant plans based on role (admins see filtered or all, teachers see only their own)
  const relevantPlans = isAdmin
    ? plans
    : plans.filter((p) => p.teacher_id === currentTeacher.Teacher_ID);

  const totalPlans = relevantPlans.length;
  const approvedPlans = relevantPlans.filter((p) => p.status === 'approved').length;
  const pendingPlans = relevantPlans.filter((p) => p.status === 'submitted').length;
  const revisionPlans = relevantPlans.filter((p) => p.status === 'needs_revision').length;
  const latePlans = relevantPlans.filter((p) => p.is_late).length;

  const approvalRate = totalPlans > 0 ? Math.round((approvedPlans / totalPlans) * 100) : 0;

  // Extract unique learning areas
  const learningAreas = Array.from(
    new Set(
      teachers
        .filter((t) => !isTeacherAdmin(t))
        .map((t) => t.Learning_Area)
        .filter(
          (a) =>
            a &&
            a !== '-' &&
            !a.includes('กลุ่มบริหาร') &&
            !a.includes('ฝ่ายบริหาร')
        )
    )
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top 4 KPI Cards: Compact 2x2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Card 1: Total Plans */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500">
              {isAdmin ? 'แผนการสอนทั้งหมด' : 'แผนการสอนของฉัน'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
              {totalPlans}
            </span>
            <span className="text-xs text-slate-400 font-medium">ฉบับ</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
            {isAdmin
              ? `จากครูผู้สอน ${teachers.length} ท่าน`
              : `${currentTeacher.Name}`}
          </p>
        </div>

        {/* Card 2: Approved Plans */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-emerald-200/90 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-800">
              อนุมัติแล้ว
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tabular-nums tracking-tight">
              {approvedPlans}
            </span>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
              {approvalRate}%
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-emerald-600/90 mt-1 font-medium">
            ผ่านเกณฑ์การประเมิน
          </p>
        </div>

        {/* Card 3: Pending Review */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-amber-200/90 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-amber-800">
              รอตรวจสอบ
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 tabular-nums tracking-tight">
              {pendingPlans}
            </span>
            <span className="text-xs text-amber-600 font-medium">ฉบับ</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-amber-600/90 mt-1 font-medium">
            {isAdmin ? 'รอฝ่ายวิชาการตรวจ' : 'อยู่ระหว่างรอการตรวจ'}
          </p>
        </div>

        {/* Card 4: Needs Revision */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-rose-200/90 shadow-2xs hover:shadow-xs hover:border-rose-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-rose-800">
              ส่งกลับแก้ไข
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-700 tabular-nums tracking-tight">
              {revisionPlans}
            </span>
            <span className="text-xs text-rose-600 font-medium">ฉบับ</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-rose-600/90 mt-1 font-medium">
            {isAdmin ? 'รอครูผู้สอนส่งใหม่' : 'มีข้อเสนอแนะให้ปรับปรุง'}
          </p>
        </div>
      </div>

      {/* Late submissions notification pill */}
      {latePlans > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 sm:px-4 flex items-center justify-between gap-2.5 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            <span className="font-bold">
              {isAdmin ? 'ตรวจพบแผนการสอนที่ส่งช้ากว่ากำหนด:' : 'แผนของท่านที่ส่งช้ากว่ากำหนด:'}
            </span>
            <span className="tabular-nums font-semibold">
              {latePlans} ฉบับ
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-md shrink-0">
            ส่งช้า (Late)
          </span>
        </div>
      )}

      {/* Breakdown per Learning Area (Admin Only) or Privacy Note for Teachers */}
      {isAdmin ? (
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                สถิติการส่งแผนแยกตามกลุ่มสาระการเรียนรู้
              </h3>
            </div>
            {selectedArea && (
              <button
                onClick={() => onSelectArea('')}
                className="text-xs text-amber-700 hover:text-amber-900 font-bold underline self-start sm:self-auto"
              >
                แสดงทุกกลุ่มสาระ
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {learningAreas.map((area) => {
              const countTeachers = teachers.filter((t) => t.Learning_Area === area).length;
              const areaPlans = plans.filter((p) => p.learning_area === area);
              const isSelected = selectedArea === area;

              return (
                <button
                  key={area}
                  onClick={() => onSelectArea(isSelected ? '' : area)}
                  className={`p-2.5 sm:p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`} title={area}>
                    {area}
                  </div>
                  <div className={`mt-1.5 flex items-center justify-between text-[11px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    <span>ครู {countTeachers} คน</span>
                    <span className={`font-bold tabular-nums ${isSelected ? 'text-amber-300' : 'text-slate-700'}`}>
                      {areaPlans.length} ฉบับ
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900">
                โหมดความปลอดภัยส่วนบุคคล:
              </span>{' '}
              <span>แสดงเฉพาะแผนการสอนของท่าน (รหัส {currentTeacher.Teacher_ID})</span>
            </div>
          </div>
          <div className="shrink-0 self-end sm:self-auto">
            <span className="inline-block bg-white px-2.5 py-0.5 rounded-md border border-slate-200 font-semibold text-slate-700 text-[11px]">
              {currentTeacher.Learning_Area}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

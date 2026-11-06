import React, { useState, useMemo } from 'react';
import { Teacher, isTeacherAdmin, isDepartmentHead, isBranchHead, BranchConfig, DepartmentConfig } from '../types';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  X,
  Users,
  Search,
  BookOpen,
  Phone,
  Mail,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Lock,
  Crown,
  Award,
  GitFork,
} from 'lucide-react';

import { AcademicEmailModal } from './AcademicEmailModal';

interface TeacherDirectoryModalProps {
  teachers: Teacher[];
  currentTeacher: Teacher;
  departments?: DepartmentConfig[];
  branches?: BranchConfig[];
  isOpen: boolean;
  onClose: () => void;
  onSwitchUser?: (teacher: Teacher) => void;
  onEditTeacher: (teacher: Teacher) => void;
}

export const TeacherDirectoryModal: React.FC<TeacherDirectoryModalProps> = ({
  teachers,
  currentTeacher,
  departments,
  branches,
  isOpen,
  onClose,
  onEditTeacher,
}) => {
  const [query, setQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('ทั้งหมด');
  const [selectedBranch, setSelectedBranch] = useState('ทั้งหมด');
  const [selectedTeacherForEmail, setSelectedTeacherForEmail] = useState<Teacher | null>(null);

  const isAdmin = isTeacherAdmin(currentTeacher);

  // If not admin, teacher can ONLY see their own profile
  const visibleTeachers = useMemo(() => {
    return isAdmin
      ? teachers
      : teachers.filter((t) => t.Teacher_ID === currentTeacher.Teacher_ID);
  }, [isAdmin, teachers, currentTeacher]);

  const areas = useMemo(() => {
    const list = Array.from(new Set(visibleTeachers.map((t) => t.Learning_Area).filter(Boolean)));
    return ['ทั้งหมด', ...list];
  }, [visibleTeachers]);

  const branchList = useMemo(() => {
    const list = Array.from(new Set(visibleTeachers.map((t) => t.branch).filter(Boolean)));
    return ['ทั้งหมด', ...list];
  }, [visibleTeachers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleTeachers.filter((t) => {
      const matchArea = selectedArea === 'ทั้งหมด' || t.Learning_Area === selectedArea;
      const matchBranch = selectedBranch === 'ทั้งหมด' || t.branch === selectedBranch;
      const matchQuery =
        !q ||
        t.Name.toLowerCase().includes(q) ||
        t.Email.toLowerCase().includes(q) ||
        t.Teacher_ID.toLowerCase().includes(q) ||
        (t.Learning_Area && t.Learning_Area.toLowerCase().includes(q)) ||
        (t.branch && t.branch.toLowerCase().includes(q));

      return matchArea && matchBranch && matchQuery;
    });
  }, [visibleTeachers, selectedArea, selectedBranch, query]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto sm:my-6 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-800 via-indigo-700 to-blue-700 p-4 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/25 shrink-0">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-indigo-200 block truncate">
                Staff Database · PCSHS Kalasin
              </span>
              <h2 className="text-base sm:text-xl font-bold truncate">
                ทำเนียบบุคลากร ({teachers.length} ท่าน)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors active:scale-95 cursor-pointer shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-3.5 sm:p-5 pb-2 border-b border-slate-100 space-y-2.5 shrink-0 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="relative sm:col-span-6">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, รหัสครู, อีเมล, กลุ่มสาระ, สาขาวิชา..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              />
            </div>

            {/* Filter by Learning Area */}
            <div className="sm:col-span-3">
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-800"
                title="กรองตามกลุ่มสาระ"
              >
                <option value="ทั้งหมด">กลุ่มสาระ: ทั้งหมด</option>
                {areas.filter((a) => a !== 'ทั้งหมด').map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Branch */}
            <div className="sm:col-span-3">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-800"
                title="กรองตามกลุ่มสาขาวิชา"
              >
                <option value="ทั้งหมด">สาขาวิชา: ทั้งหมด</option>
                {branchList.filter((b) => b !== 'ทั้งหมด').map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Teachers Grid */}
        <div className="p-3.5 sm:p-6 flex-1 overflow-y-auto touch-scroll grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/30">
          {filtered.map((t) => {
            const photoUrl = formatGoogleDriveImageUrl(t.photo);
            const isMe = t.Teacher_ID === currentTeacher.Teacher_ID;
            const hasDefaultPass = t.has_changed_password === false || t.Pass === '12345';
            const isDeptH = isDepartmentHead(t);
            const isBranchH = isBranchHead(t);

            return (
              <div
                key={t.Teacher_ID}
                className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  isMe
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-400'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={t.Name}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-indigo-700">
                        {getInitials(t.Name)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{t.Name}</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-semibold">
                        {t.Teacher_ID}
                      </span>
                      {isMe && (
                        <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-semibold">
                          คุณ
                        </span>
                      )}
                      {isTeacherAdmin(t) && (
                        <span className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full font-bold shadow-xs">
                          {t.Teacher_ID === 'admin01' ? 'Super Admin' : 'Admin'}
                        </span>
                      )}
                      {isDeptH && (
                        <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-bold shadow-2xs">
                          👑 หัวหน้ากลุ่มสาระ
                        </span>
                      )}
                      {isBranchH && (
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold shadow-2xs">
                          🎖️ หัวหน้าสาขา
                        </span>
                      )}
                    </div>

                    {/* Department and Branch Row */}
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="text-indigo-700 font-semibold truncate">
                        {t.Learning_Area}
                      </span>
                      {t.branch && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md font-semibold text-[11px] border border-amber-200">
                            {t.branch}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {t.position} {t.academic_standing !== 'ยังไม่มีวิทยฐานะ' ? `(${t.academic_standing})` : ''} • {t.department}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span className="truncate flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {t.Email}
                      </span>
                      {t.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {t.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {hasDefaultPass ? (
                    <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      รหัส 12345
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      เปลี่ยนรหัสแล้ว
                    </span>
                  )}

                  <div className="flex items-center gap-1 mt-1">
                    {isAdmin && t.Email && (
                      <button
                        type="button"
                        onClick={() => setSelectedTeacherForEmail(t)}
                        className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="ส่งอีเมลจากฝ่ายวิชาการ (1 คลิก)"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEditTeacher(t)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="แก้ไขข้อมูลส่วนตัว"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>รวมบุคลากรครูที่ตรงตามตัวกรอง {filtered.length} จาก {teachers.length} ท่าน</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
          >
            ปิดหน้านี้
          </button>
        </div>
      </div>

      {/* Academic Email Composer Modal */}
      {selectedTeacherForEmail && (
        <AcademicEmailModal
          isOpen={!!selectedTeacherForEmail}
          onClose={() => setSelectedTeacherForEmail(null)}
          defaultRecipient={{
            email: selectedTeacherForEmail.Email,
            name: selectedTeacherForEmail.Name,
            teacherId: selectedTeacherForEmail.Teacher_ID,
          }}
          defaultSubject={`[ฝ่ายบริหารวิชาการ จภ.กาฬสินธุ์] แจ้งข่าวสารงานวิชาการ`}
          defaultPlainText={`เรียน คุณครู${selectedTeacherForEmail.Name} (${selectedTeacherForEmail.Teacher_ID})\n\nฝ่ายบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์ ขอแจ้งประชาสัมพันธ์ข้อมูลดังนี้:\n\n\nกลุ่มบริหารวิชาการ โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์`}
          categoryTitle={`ส่งอีเมลถึงคุณครู ${selectedTeacherForEmail.Name} (1 คลิก)`}
        />
      )}
    </div>
  );
};

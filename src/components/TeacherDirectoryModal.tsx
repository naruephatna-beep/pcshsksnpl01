import React, { useState } from 'react';
import { Teacher, isTeacherAdmin } from '../types';
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
} from 'lucide-react';

interface TeacherDirectoryModalProps {
  teachers: Teacher[];
  currentTeacher: Teacher;
  isOpen: boolean;
  onClose: () => void;
  onSwitchUser?: (teacher: Teacher) => void;
  onEditTeacher: (teacher: Teacher) => void;
}

export const TeacherDirectoryModal: React.FC<TeacherDirectoryModalProps> = ({
  teachers,
  currentTeacher,
  isOpen,
  onClose,
  onEditTeacher,
}) => {
  const [query, setQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('ทั้งหมด');

  if (!isOpen) return null;

  const isAdmin = isTeacherAdmin(currentTeacher);

  // If not admin, teacher can ONLY see their own profile
  const visibleTeachers = isAdmin
    ? teachers
    : teachers.filter((t) => t.Teacher_ID === currentTeacher.Teacher_ID);

  const areas = ['ทั้งหมด', ...Array.from(new Set(visibleTeachers.map((t) => t.Learning_Area).filter(Boolean)))];

  const filtered = visibleTeachers.filter((t) => {
    const matchArea = selectedArea === 'ทั้งหมด' || t.Learning_Area === selectedArea;
    const matchQuery =
      t.Name.toLowerCase().includes(query.toLowerCase()) ||
      t.Email.toLowerCase().includes(query.toLowerCase()) ||
      t.Teacher_ID.toLowerCase().includes(query.toLowerCase()) ||
      t.Learning_Area.toLowerCase().includes(query.toLowerCase());
    return matchArea && matchQuery;
  });

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
                Staff Database
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
        <div className="p-3.5 sm:p-6 pb-2 border-b border-slate-100 space-y-2.5 sm:space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, รหัสครู (Teacher_ID), อีเมล..."
                className="w-full pl-10 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="px-3 py-2.5 sm:py-2 border border-slate-200 rounded-xl text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
            >
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Teachers Grid */}
        <div className="p-3.5 sm:p-6 flex-1 overflow-y-auto touch-scroll grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((t) => {
            const photoUrl = formatGoogleDriveImageUrl(t.photo);
            const isMe = t.Teacher_ID === currentTeacher.Teacher_ID;
            const hasDefaultPass = t.Pass === '12345';

            return (
              <div
                key={t.Teacher_ID}
                className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  isMe
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-400'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
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
                    </div>
                    <p className="text-xs text-indigo-600 font-medium truncate mt-0.5">
                      {t.Learning_Area}
                    </p>
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
          <span>รวมบุคลากรครูทั้งหมด {teachers.length} ท่าน</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
          >
            ปิดหน้านี้
          </button>
        </div>
      </div>
    </div>
  );
};

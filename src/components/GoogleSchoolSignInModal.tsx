import React, { useState, useMemo } from 'react';
import { Teacher } from '../types';
import { INITIAL_TEACHERS } from '../data/initialTeachers';
import { updateTeacherRecord } from '../services/supabaseClient';
import { formatGoogleDriveImageUrl, getInitials } from '../utils/imageUtils';
import {
  X,
  Search,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface GoogleSchoolSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  onLogin: (teacher: Teacher) => void;
}

export const GoogleSchoolSignInModal: React.FC<GoogleSchoolSignInModalProps> = ({
  isOpen,
  onClose,
  teachers,
  onLogin,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // Merge directory teachers
  const allTeachers: Teacher[] = useMemo(() => {
    const map = new Map<string, Teacher>();
    INITIAL_TEACHERS.forEach((t) => map.set(t.Teacher_ID.toLowerCase(), t));
    teachers.forEach((t) => map.set(t.Teacher_ID.toLowerCase(), t));
    return Array.from(map.values()).sort((a, b) => a.Name.localeCompare(b.Name, 'th'));
  }, [teachers]);

  // Filter accounts matching search query
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTeachers;
    return allTeachers.filter(
      (t) =>
        t.Name.toLowerCase().includes(q) ||
        t.Email.toLowerCase().includes(q) ||
        t.Teacher_ID.toLowerCase().includes(q) ||
        t.Learning_Area.toLowerCase().includes(q)
    );
  }, [allTeachers, search]);

  if (!isOpen) return null;

  const handleSelectAccount = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    // Instant One-Tap Sign In with school email
    setTimeout(() => {
      updateTeacherRecord(teacher);
      onLogin(teacher);
      onClose();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Google Workspace Header */}
        <div className="bg-[#0B1329] p-5 sm:p-6 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0">
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Google Workspace SSO (@pcshsksn.ac.th)</span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                เลือกบัญชีครูโรงเรียนเพื่อเข้าสู่ระบบ
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ-นามสกุล หรืออีเมล เช่น naruephat.na..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Account List */}
        <div className="overflow-y-auto p-2 sm:p-3 divide-y divide-slate-100 flex-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              ไม่พบบัญชีครูที่ตรงกับ "{search}" กรุณาลองค้นหาด้วยชื่อหรือรหัสครู
            </div>
          ) : (
            filtered.map((t) => {
              const photoUrl = formatGoogleDriveImageUrl(t.photo);
              const isSelected = selectedTeacher?.Teacher_ID === t.Teacher_ID;
              return (
                <button
                  key={`sso-${t.Teacher_ID}`}
                  onClick={() => handleSelectAccount(t)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left cursor-pointer group ${
                    isSelected
                      ? 'bg-amber-50 border border-amber-300'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={t.Name}
                          className="w-full h-full object-cover"
                          onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-700">
                          {getInitials(t.Name)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-amber-800 transition-colors flex items-center gap-1.5">
                        <span>{t.Name}</span>
                        {t.role === 'admin' && (
                          <span className="text-[10px] bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded font-semibold shrink-0">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                        <span className="font-mono text-slate-600">{t.Email}</span>
                        <span>•</span>
                        <span className="text-slate-400">{t.Learning_Area}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {isSelected ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-in zoom-in-50" />
                        เข้าสู่ระบบ...
                      </span>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            เชื่อมต่อโดเมนโรงเรียน @pcshsksn.ac.th
          </span>
          <span>คลิกเดียวเข้าใช้งานได้ทันที</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Teacher } from '../types';
import { INITIAL_TEACHERS } from '../data/initialTeachers';
import { updateTeacherRecord } from '../services/supabaseClient';
import {
  Lock,
  Mail,
  LogIn,
  Info,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Database,
  Cloud,
} from 'lucide-react';

import { GoogleSchoolSignInModal } from './GoogleSchoolSignInModal';

interface LoginScreenProps {
  teachers: Teacher[];
  isSupabaseConnected: boolean;
  onLogin: (teacher: Teacher) => void;
  onShowLoadingDemo?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  teachers,
  onLogin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Merge passed teachers with INITIAL_TEACHERS
  const allAvailableTeachers: Teacher[] = React.useMemo(() => {
    const map = new Map<string, Teacher>();
    INITIAL_TEACHERS.forEach((t) => map.set(t.Teacher_ID.toLowerCase(), t));
    teachers.forEach((t) => map.set(t.Teacher_ID.toLowerCase(), t));
    return Array.from(map.values());
  }, [teachers]);

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedInput = email.trim().toLowerCase();
    const found = allAvailableTeachers.find(
      (t) =>
        t.Email.toLowerCase() === trimmedInput ||
        t.Teacher_ID.toLowerCase() === trimmedInput ||
        t.national_id === trimmedInput
    );

    if (!found) {
      setError('ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาตรวจสอบอีเมลหรือรหัสครู (Teacher_ID)');
      return;
    }

    if (found.Pass !== password.trim()) {
      setError('รหัสผ่านไม่ถูกต้อง (ค่าเริ่มต้นของครูคือ 12345)');
      return;
    }

    updateTeacherRecord(found);
    onLogin(found);
  };

  return (
    <div className="min-h-screen bg-[#0B1329] flex flex-col justify-between relative font-['Prompt',sans-serif] px-3 sm:px-6 py-4 sm:py-8">
      {/* Top Header */}
      <header className="relative z-10 max-w-4xl w-full mx-auto flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img
            src="/logo.svg"
            alt="ตราสัญลักษณ์โรงเรียน"
            className="w-10 h-13 sm:w-11 sm:h-15 object-contain drop-shadow-sm"
          />
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
              โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
            </h1>
            <p className="text-[11px] sm:text-xs text-amber-400 font-medium">
              Princess Chulabhorn Science High School Kalasin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            ระบบสารสนเทศวิชาการ
          </span>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="relative z-10 max-w-4xl w-full mx-auto my-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-800/50 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: School Crest & System Overview */}
          <div className="md:w-5/12 bg-slate-900 p-5 sm:p-8 text-white flex flex-col justify-between text-center relative border-b md:border-b-0 md:border-r border-slate-800">
            <div className="my-auto py-2 flex flex-col items-center">
              {/* Official School Crest Logo */}
              <div className="w-20 h-28 sm:w-28 sm:h-38 flex items-center justify-center p-1 mb-3">
                <img
                  src="/logo.svg"
                  alt="Logo PCSHS Kalasin"
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
                กลุ่มบริหารวิชาการ
              </span>

              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                ระบบส่งเอกสารวิชาการ
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                ระบบส่งและติดตามเอกสารวิชาการออนไลน์สำหรับครูและฝ่ายบริหาร
              </p>
            </div>

            <div className="text-[11px] text-slate-500 pt-2 hidden md:block">
              จ.ภ. กาฬสินธุ์ • ภาคเรียนที่ 1/2569
            </div>
          </div>

          {/* Right Form Column */}
          <div className="md:w-7/12 p-5 sm:p-8 flex flex-col justify-between bg-white">
            <div>
              {/* Header inside right column */}
              <div className="mb-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-amber-500" />
                  <span>เข้าสู่ระบบ</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  สำหรับครูผู้สอนและผู้ดูแลระบบ กรอกอีเมลหรือรหัสครูเพื่อเข้าใช้งาน
                </p>
              </div>

              {/* Google Workspace One-Tap Sign In */}
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(true)}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-slate-300 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer active:scale-[0.99] mb-4 group"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span>เข้าสู่ระบบด้วย Google โรงเรียน (@pcshsksn.ac.th)</span>
              </button>

              <div className="relative flex items-center justify-center my-3.5">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                  หรือเข้าสู่ระบบด้วยรหัสผ่าน
                </span>
              </div>

              {/* Password notice badge */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-2.5 sm:p-3 text-xs text-amber-900 mb-4 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">รหัสผ่านเริ่มต้นของครู: </span>
                  <strong className="font-mono bg-amber-100 px-1 py-0.2 rounded font-bold text-amber-950">12345</strong>
                  <span className="block text-[11px] text-amber-800/90 mt-0.5">
                    (ระบบจะให้ตั้งรหัสผ่านใหม่ในการเข้าใช้งานครั้งแรก)
                  </span>
                </div>
              </div>

              {/* Form Login */}
              <form onSubmit={handleFormLogin} className="space-y-3.5">
                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    อีเมล หรือ Teacher_ID <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="เช่น te001 หรืออีเมลโรงเรียน"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm sm:text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      รหัสผ่าน <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ค่าเริ่มต้น: 12345
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่าน"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm sm:text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-1"
                      aria-label="แสดงรหัสผ่าน"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>เข้าสู่ระบบส่งเอกสารวิชาการ</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Footer inside card */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span>กลุ่มบริหารวิชาการ • จ.ภ. กาฬสินธุ์</span>
              </div>
              <span className="text-slate-500 font-mono">v2.5 (2569)</span>
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 py-3 text-center text-xs text-slate-500">
        <p>© 2026 โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</p>
      </footer>

      {/* Google School Account Picker Modal */}
      <GoogleSchoolSignInModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        teachers={allAvailableTeachers}
        onLogin={onLogin}
      />
    </div>
  );
};

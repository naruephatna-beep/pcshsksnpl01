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

interface LoginScreenProps {
  teachers: Teacher[];
  isSupabaseConnected: boolean;
  onLogin: (teacher: Teacher) => void;
  onShowLoadingDemo?: () => void;
  onOpenDatabaseModal?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  teachers,
  onLogin,
  onOpenDatabaseModal,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

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
          {onOpenDatabaseModal && (
            <button
              type="button"
              onClick={onOpenDatabaseModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors cursor-pointer"
              title="ตั้งค่าและย้ายฐานข้อมูล Cloudflare D1 / Supabase"
            >
              <Cloud className="w-3.5 h-3.5 text-orange-400" />
              <span>ฐานข้อมูล</span>
            </button>
          )}
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
                ระบบส่งแผนการสอน
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                ระบบส่งและติดตามแผนการจัดการเรียนรู้ออนไลน์สำหรับครูและฝ่ายบริหาร
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
                    <span>เข้าสู่ระบบส่งแผนการสอน</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Footer inside card */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span>กลุ่มบริหารวิชาการ • จ.ภ. กาฬสินธุ์</span>
                {onOpenDatabaseModal && (
                  <button
                    type="button"
                    onClick={onOpenDatabaseModal}
                    className="text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Cloud className="w-3 h-3 text-orange-500" />
                    <span>Cloudflare D1</span>
                  </button>
                )}
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
    </div>
  );
};

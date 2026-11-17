import React, { useMemo, useRef, useState } from 'react';
import { Teacher } from '../types';
import { verifyTeacherCredentials } from '../services/authService';
import { INITIAL_TEACHERS } from '../data/initialTeachers';
import {
  Lock,
  Mail,
  LogIn,
  Info,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

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
  const [isVerifying, setIsVerifying] = useState(false);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const matchedTeacher = useMemo(() => {
    const query = email.trim().toLowerCase();
    if (query.length < 3) return null;

    const pool = teachers && teachers.length > 0 ? teachers : INITIAL_TEACHERS;
    const found = pool.find((t) => {
      const tEmail = (t.Email || '').trim().toLowerCase();
      const tId = (t.Teacher_ID || '').trim().toLowerCase();
      const tPrefix = tEmail ? tEmail.split('@')[0] : '';
      return (
        (tEmail && tEmail === query) ||
        (tId && tId === query) ||
        (tPrefix && tPrefix === query)
      );
    });
    return found || null;
  }, [email, teachers]);

  const handlePanelMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = leftPanelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--spot-x', `${x}px`);
    el.style.setProperty('--spot-y', `${y}px`);
  };

  const handlePanelMouseLeave = () => {
    const el = leftPanelRef.current;
    if (!el) return;
    el.style.setProperty('--spot-x', '50%');
    el.style.setProperty('--spot-y', '38%');
  };

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const res = await verifyTeacherCredentials(email, password);
      if (res.success && res.teacher) {
        onLogin(res.teacher);
      } else {
        setError(res.error || 'รหัสผ่านไม่ถูกต้อง หรือไม่พบบัญชีผู้ใช้');
      }
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์การเข้าสู่ระบบ');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060A16] flex flex-col justify-center gap-5 sm:gap-6 relative overflow-hidden font-['Prompt',sans-serif] px-3 sm:px-6 py-5 sm:py-8">
      {/* Architectural Grid Stage Matching LoadingScreen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_75%_75%_at_50%_45%,#000_25%,transparent_100%)]"
      />

      {/* Focused Amber Stage Halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_48%,rgba(251,191,36,0.1)_0%,rgba(251,191,36,0.02)_36%,transparent_65%)]"
      />

      {/* Corner Precision Reticles */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-4 sm:inset-7 z-0">
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-amber-400/25" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-amber-400/25" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-amber-400/25" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-amber-400/25" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 max-w-[880px] w-full mx-auto flex items-center justify-between animate-fade-up">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0B1329] ring-1 ring-amber-400/30 p-1.5 flex items-center justify-center shrink-0">
            <img
              src="/logo.svg"
              alt="ตราสัญลักษณ์โรงเรียน"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
              โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์
            </h1>
            <p className="text-[11px] sm:text-xs text-amber-400/95 font-medium">
              Princess Chulabhorn Science High School Kalasin
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>ระบบสารสนเทศวิชาการ</span>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="relative z-10 max-w-[880px] w-full mx-auto animate-panel-enter">
        <div className="bg-white rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.55)] ring-1 ring-white/15 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Interactive Scientific Orbital Crest Panel */}
          <div
            ref={leftPanelRef}
            onMouseMove={handlePanelMouseMove}
            onMouseLeave={handlePanelMouseLeave}
            className="group/panel md:w-[46%] bg-[#0B1329] p-6 sm:p-8 text-white flex flex-col items-center justify-center text-center relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-800"
          >
            {/* Cursor-Tracking Amber Spotlight */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 login-spotlight opacity-85 group-hover/panel:opacity-100"
            />

            {/* Subtle Panel Inner Grid */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(circle_at_50%_40%,#000_20%,transparent_85%)]"
            />

            <div className="relative z-10 flex flex-col items-center">
              {/* Scaled Scientific Orbital Astrolabe */}
              <div className="relative w-48 h-48 sm:w-54 sm:h-54 flex items-center justify-center mb-4">
                {/* Outer Slow Degree Ring */}
                <svg
                  viewBox="0 0 216 216"
                  className="absolute inset-0 w-full h-full animate-orbit-slow text-amber-400/35"
                  aria-hidden="true"
                >
                  <circle
                    cx="108"
                    cy="108"
                    r="103"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.75"
                    strokeDasharray="2 6"
                  />
                  <polygon points="108,1 111,6 108,11 105,6" fill="#FBBF24" fillOpacity="0.85" />
                  <polygon points="108,205 111,210 108,215 105,210" fill="#FBBF24" fillOpacity="0.85" />
                  <polygon points="1,108 6,105 11,108 6,111" fill="#FBBF24" fillOpacity="0.85" />
                  <polygon points="205,108 210,105 215,108 210,111" fill="#FBBF24" fillOpacity="0.85" />
                </svg>

                {/* Counter-Rotating Dashed Orbit + Satellite Dot */}
                <svg
                  viewBox="0 0 172 172"
                  className="absolute w-38 h-38 sm:w-44 sm:h-44 animate-orbit-reverse"
                  aria-hidden="true"
                >
                  <circle
                    cx="86"
                    cy="86"
                    r="81"
                    fill="none"
                    stroke="#FBBF24"
                    strokeOpacity="0.28"
                    strokeWidth="1"
                    strokeDasharray="16 8 4 8"
                  />
                  <circle cx="86" cy="5" r="3" fill="#FDE68A" />
                  <circle cx="86" cy="5" r="6" fill="#FBBF24" fillOpacity="0.22" />
                </svg>

                {/* Center Emblem Pedestal */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#070D1F]/95 border border-amber-400/45 flex items-center justify-center p-3.5 transition-transform duration-300 group-hover/panel:scale-105 animate-crest-breathe">
                  <div className="absolute inset-1 rounded-full border border-white/10 pointer-events-none" />
                  <img
                    src="/logo.svg"
                    alt="Logo PCSHS Kalasin"
                    className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(251,191,36,0.22)] pointer-events-none"
                  />
                </div>
              </div>

              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-amber-400 mb-1.5">
                กลุ่มบริหารวิชาการ
              </span>

              {/* Gold Diamond Ornament Rule */}
              <div className="relative flex items-center justify-center w-36 mb-2.5 animate-line-expand">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
                <div className="absolute w-1.5 h-1.5 rotate-45 bg-amber-300" />
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                ระบบส่งเอกสารวิชาการ
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-[230px] leading-relaxed">
                ระบบส่งและติดตามเอกสารวิชาการออนไลน์สำหรับครูและฝ่ายบริหาร
              </p>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="md:w-[54%] p-5 sm:p-7 flex flex-col justify-between bg-white">
            <div>
              {/* Header inside right column */}
              <div className="mb-3.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                    <LogIn className="w-4 h-4" />
                  </span>
                  <span>เข้าสู่ระบบ</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  สำหรับครูผู้สอนและผู้ดูแลระบบ กรอกอีเมลหรือรหัสครูเพื่อเข้าใช้งาน
                </p>
              </div>

              {/* Password notice badge */}
              <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-2.5 text-xs text-amber-900 mb-3.5 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">รหัสผ่านเริ่มต้นของครู: </span>
                  <strong className="font-mono bg-amber-100 px-1.5 py-0.5 rounded font-bold text-amber-950">
                    12345
                  </strong>
                  <span className="block text-[11px] text-amber-800/90 mt-0.5">
                    (ระบบจะให้ตั้งรหัสผ่านใหม่ในการเข้าใช้งานครั้งแรก)
                  </span>
                </div>
              </div>

              {/* Form Login */}
              <form onSubmit={handleFormLogin} className="space-y-3">
                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-up">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    อีเมล หรือ Teacher_ID <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-amber-600 transition-colors absolute left-3 top-3.5" />
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="เช่น te028 หรือ naruephat.na@pcshsksn.ac.th"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Smart Instant Teacher Recognition Pill */}
                  {matchedTeacher && (
                    <div className="mt-2 px-3 py-2 rounded-xl bg-emerald-50/90 border border-emerald-200/90 flex items-center justify-between gap-2 text-xs animate-fade-up">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0 truncate">
                          <span className="font-bold text-emerald-950">{matchedTeacher.Name}</span>
                          {matchedTeacher.Learning_Area && (
                            <span className="text-emerald-700 ml-1.5">
                              · {matchedTeacher.Learning_Area}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold bg-white text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                        {matchedTeacher.Teacher_ID}
                      </span>
                    </div>
                  )}
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
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-amber-600 transition-colors absolute left-3 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="กรอกรหัสผ่าน (ค่าเริ่มต้น 12345)"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 focus:bg-white transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                      aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="relative overflow-hidden btn-gold-sheen w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-70 text-slate-950 font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm cursor-pointer"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>กำลังตรวจสอบข้อมูล...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>เข้าสู่ระบบส่งเอกสารวิชาการ</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Footer inside card */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span>กลุ่มบริหารวิชาการ · จ.ภ. กาฬสินธุ์</span>
              </div>
              <span className="text-slate-500 font-mono">v2.5 (2569)</span>
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-500">
        <p>© 2026 โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์</p>
      </footer>
    </div>
  );
};

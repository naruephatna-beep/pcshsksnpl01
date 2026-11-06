import React, { useState } from 'react';
import { Teacher } from '../types';
import { verifyTeacherCredentials } from '../services/authService';
import {
  Lock,
  Mail,
  LogIn,
  Sparkles,
  Info,
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { GoogleSchoolSignInModal } from './GoogleSchoolSignInModal';

interface LoginModalProps {
  teachers: Teacher[];
  isOpen: boolean;
  onLogin: (teacher: Teacher) => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  teachers,
  isOpen,
  onLogin,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  if (!isOpen) return null;

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
      setError(err?.message || 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Banner */}
        <div className="relative bg-[#0B1329] p-6 text-white border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="ตราสัญลักษณ์โรงเรียน"
                className="w-10 h-14 object-contain drop-shadow-md"
              />
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-amber-300 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  จ.ภ. กาฬสินธุ์
                </div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  เข้าสู่ระบบส่งเอกสารวิชาการ
                </h1>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Notice Info */}
        <div className="bg-amber-50/80 border-b border-amber-200/60 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            รหัสผ่านเริ่มต้นคือ <strong className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-bold">12345</strong> หากยังไม่เคยเปลี่ยน ระบบจะบังคับให้เปลี่ยนรหัสทันที
          </span>
        </div>

        <div className="p-6">
          {/* Google Workspace Button */}
          <button
            type="button"
            onClick={() => setIsGoogleModalOpen(true)}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-slate-300 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer active:scale-[0.99] mb-4"
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

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              หรือระบุรหัสผ่าน
            </span>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleFormLogin} className="space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                อีเมล หรือ Teacher_ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="เช่น thanyarat.su@pcshsksn.ac.th หรือ te001"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                รหัสผ่าน (Pass) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 bg-[#F59E0B] hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 text-slate-950 font-black rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm cursor-pointer disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>กำลังตรวจสอบสิทธิ์...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-slate-950" />
                    <span>เข้าสู่ระบบ</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <GoogleSchoolSignInModal
          isOpen={isGoogleModalOpen}
          onClose={() => setIsGoogleModalOpen(false)}
          teachers={teachers}
          onLogin={onLogin}
        />
      </div>
    </div>
  );
};

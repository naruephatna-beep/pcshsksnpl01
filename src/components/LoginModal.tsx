import React, { useState } from 'react';
import { Teacher } from '../types';
import { INITIAL_TEACHERS } from '../data/initialTeachers';
import { updateTeacherRecord } from '../services/supabaseClient';
import {
  Lock,
  Mail,
  LogIn,
  Sparkles,
  Info,
  X,
} from 'lucide-react';

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

  if (!isOpen) return null;

  const allAvailableTeachers: Teacher[] = React.useMemo(() => {
    const map = new Map<string, Teacher>();
    INITIAL_TEACHERS.forEach((t) => map.set(t.Teacher_ID.toLowerCase(), t));
    teachers.forEach((t) => map.set(t.Teacher_ID.toLowerCase(), t));
    return Array.from(map.values());
  }, [teachers]);

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const found = allAvailableTeachers.find(
      (t) =>
        t.Email.toLowerCase() === trimmedEmail ||
        t.Teacher_ID.toLowerCase() === trimmedEmail ||
        t.national_id === trimmedEmail
    );

    if (!found) {
      setError('ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาตรวจสอบอีเมลหรือรหัสครู');
      return;
    }

    if (found.Pass !== password.trim()) {
      setError('รหัสผ่านไม่ถูกต้อง');
      return;
    }

    updateTeacherRecord(found);
    onLogin(found);
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
                  เข้าสู่ระบบส่งแผนการสอน
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

        {/* Credentials Form */}
        <form onSubmit={handleFormLogin} className="p-6 space-y-4">
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
              className="w-full py-2.5 bg-[#F59E0B] hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-slate-950" />
              <span>เข้าสู่ระบบ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

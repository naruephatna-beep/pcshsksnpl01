import React, { useState } from 'react';
import { Teacher } from '../types';
import { Lock, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ForcePasswordModalProps {
  teacher: Teacher;
  onPasswordChanged: (updatedTeacher: Teacher) => void;
}

export const ForcePasswordModal: React.FC<ForcePasswordModalProps> = ({
  teacher,
  onPasswordChanged,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.trim().length < 6) {
      setError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (newPassword.trim() === '12345') {
      setError('ไม่สามารถใช้รหัสผ่านเริ่มต้น "12345" ได้ กรุณาตั้งรหัสผ่านใหม่ที่ปลอดภัย');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const updated: Teacher = {
        ...teacher,
        Pass: newPassword.trim(),
        updated_at: new Date().toISOString(),
      };

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      setIsSubmitting(false);
      onPasswordChanged(updated);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">แจ้งเตือนเปลี่ยนรหัสผ่าน</h2>
          <p className="text-amber-100 text-sm mt-1">
            เพื่อความปลอดภัยของข้อมูลในระบบส่งแผนการสอน
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold block mb-1">
              สวัสดี {teacher.Name} (รหัส {teacher.Teacher_ID})
            </span>
            เนื่องจากบัญชีของท่านยังใช้รหัสผ่านเริ่มต้น <strong className="font-mono bg-amber-100 px-1 py-0.5 rounded">12345</strong> ระบบจำเป็นต้องให้ท่านตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานระบบ
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              รหัสผ่านปัจจุบัน
            </label>
            <input
              type="text"
              disabled
              value="12345"
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านใหม่ของท่าน"
                className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              ยืนยันรหัสผ่านใหม่อีกครั้ง <span className="text-rose-500">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  กำลังบันทึกรหัสผ่าน...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  บันทึกรหัสผ่านใหม่และเข้าสู่ระบบ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

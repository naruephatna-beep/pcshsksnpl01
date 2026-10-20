import React from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'กำลังโหลดข้อมูลระบบ...',
  subMessage = 'โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white font-['Prompt',sans-serif] px-4 overflow-hidden select-none">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full mx-auto">
        
        {/* Dancing Dinosaur Character Wrapper */}
        <div className="relative flex flex-col items-center mb-6">
          {/* Dino Wrapper with the Jump & Tilt Dance Animation Class */}
          <div className="animate-dino-jump-tilt transform-gpu">
            <img
              src="/dinosaur.svg"
              alt="มาสคอตไดโนเสาร์กำลังเต้น"
              className="w-36 h-36 sm:w-44 sm:h-44 object-contain filter drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)] select-none pointer-events-none"
            />
          </div>

          {/* Synchronized Ground Shadow */}
          <div className="w-24 sm:w-28 h-3.5 bg-black/40 rounded-full blur-[3px] animate-dino-shadow mx-auto -mt-2"></div>
        </div>

        {/* School Crest / Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur-md text-amber-200 border border-amber-300/30 mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
          <span>PCSHS Kalasin • แดนไดโนเสาร์</span>
        </div>

        {/* Main Status Text */}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1.5 drop-shadow-sm flex items-center justify-center gap-2">
          <span>{message}</span>
        </h2>

        {/* Subtitle / School Name */}
        <p className="text-xs sm:text-sm text-slate-300 font-light mb-6">
          {subMessage}
        </p>

        {/* Animated Progress Bar */}
        <div className="w-48 sm:w-56 h-1.5 bg-white/15 rounded-full overflow-hidden relative shadow-inner">
          <div className="h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400 rounded-full animate-[shimmer_1.5s_infinite] w-full"
               style={{
                 backgroundImage: 'linear-gradient(90deg, #10b981 0%, #facc15 50%, #10b981 100%)',
                 backgroundSize: '200% 100%',
                 animation: 'dino-bar 1.5s linear infinite'
               }}>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-3 font-light">
          น้องไดโนเสาร์กำลังเตรียมข้อมูลให้คุณครูสักครู่...
        </p>
      </div>
    </div>
  );
};

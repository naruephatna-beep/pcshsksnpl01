import React, { useState } from 'react';
import {
  X,
  Database,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Server,
  Key,
  ShieldCheck,
  AlertCircle,
  Upload,
  Cloud,
  Layers,
  FileCode2,
  Download,
  Terminal,
  Zap,
  ArrowRight,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Teacher, LessonPlan } from '../types';
import {
  getSavedSupabaseConfig,
  saveSupabaseConfig,
  generateSupabaseSqlScript,
  seedTeachersToSupabase,
  seedPlansToSupabase,
  seedDocumentTypesToSupabase,
  SYSTEM_SETTINGS_TABLE_SQL,
  getSupabaseClient,
  getLocalTeachers,
  getLocalPlans,
} from '../services/supabaseClient';
import {
  getDatabaseProvider,
  setDatabaseProvider,
  getSavedCloudflareConfig,
  saveCloudflareConfig,
  testCloudflareConnection,
  migrateAllDataToCloudflare,
  generateCloudflareD1SqlScript,
  generateCloudflareWorkerScript,
  generateWranglerToml,
  DatabaseProvider,
} from '../services/cloudflareClient';
import { getSavedDeadlineConfigs, getSavedStatusConfigs, getSavedSubmissions } from '../utils/deadlineUtils';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
  teachers?: Teacher[];
  plans?: LessonPlan[];
}

export const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
  teachers = [],
  plans = [],
}) => {
  const currentProvider = getDatabaseProvider();
  const [activeTab, setActiveTab] = useState<'cloudflare' | 'supabase' | 'export'>(
    currentProvider === 'cloudflare' ? 'cloudflare' : 'cloudflare' // Default to Cloudflare as user requested
  );

  // Cloudflare States
  const cfConfig = getSavedCloudflareConfig();
  const [cfWorkerUrl, setCfWorkerUrl] = useState(cfConfig.workerUrl);
  const [cfApiKey, setCfApiKey] = useState(cfConfig.apiKey || '');
  const [cfTestStatus, setCfTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [cfTestMessage, setCfTestMessage] = useState('');
  const [isMigratingToCf, setIsMigratingToCf] = useState(false);
  const [cfMigrateMessage, setCfMigrateMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Sub-tabs in Cloudflare section
  const [cfSubTab, setCfSubTab] = useState<'config' | 'd1_sql' | 'worker_code' | 'guide'>('config');
  const [copiedCfSql, setCopiedCfSql] = useState(false);
  const [copiedCfWorker, setCopiedCfWorker] = useState(false);
  const [copiedWrangler, setCopiedWrangler] = useState(false);

  // Supabase States
  const currentSbConfig = getSavedSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(currentSbConfig.url);
  const [sbAnonKey, setSbAnonKey] = useState(currentSbConfig.anonKey);
  const [isCopiedSbSql, setIsCopiedSbSql] = useState(false);
  const [sbTestStatus, setSbTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [sbTestMessage, setSbTestMessage] = useState('');
  const [isSeedingSb, setIsSeedingSb] = useState(false);
  const [seedSbMessage, setSeedSbMessage] = useState('');
  const [isSyncingSbPlans, setIsSyncingSbPlans] = useState(false);
  const [syncSbPlansMessage, setSyncSbPlansMessage] = useState('');

  if (!isOpen) return null;

  const effectiveTeachers = teachers.length > 0 ? teachers : getLocalTeachers();
  const effectivePlans = plans.length > 0 ? plans : getLocalPlans();
  const deadlineConfigs = getSavedDeadlineConfigs();
  const statusConfigs = getSavedStatusConfigs();
  const submissions = getSavedSubmissions();

  // Cloudflare Handlers
  const handleSaveCloudflare = () => {
    saveCloudflareConfig({
      workerUrl: cfWorkerUrl.trim(),
      apiKey: cfApiKey.trim(),
    });
    setDatabaseProvider('cloudflare');
    onConfigSaved();
    setCfTestStatus('success');
    setCfTestMessage('บันทึกการตั้งค่า Cloudflare D1 เรียบร้อยแล้ว (ตั้งเป็นฐานข้อมูลหลัก)');
  };

  const handleTestCloudflare = async () => {
    if (!cfWorkerUrl.trim()) {
      setCfTestStatus('error');
      setCfTestMessage('กรุณากรอก Cloudflare Worker URL ก่อนทดสอบ');
      return;
    }

    setCfTestStatus('testing');
    setCfTestMessage('กำลังเชื่อมต่อไปยัง Cloudflare Worker...');
    saveCloudflareConfig({
      workerUrl: cfWorkerUrl.trim(),
      apiKey: cfApiKey.trim(),
    });

    const res = await testCloudflareConnection();
    if (res.success) {
      setCfTestStatus('success');
      setCfTestMessage(res.message);
    } else {
      setCfTestStatus('error');
      setCfTestMessage(res.message);
    }
  };

  const handleMigrateToCloudflare = async () => {
    if (!cfWorkerUrl.trim()) {
      setCfMigrateMessage({
        type: 'error',
        text: 'กรุณากรอก Cloudflare Worker URL และทดสอบการเชื่อมต่อให้สำเร็จก่อนทำการย้ายข้อมูล',
      });
      return;
    }

    setIsMigratingToCf(true);
    setCfMigrateMessage(null);
    saveCloudflareConfig({
      workerUrl: cfWorkerUrl.trim(),
      apiKey: cfApiKey.trim(),
    });

    const res = await migrateAllDataToCloudflare(
      effectiveTeachers,
      effectivePlans,
      submissions,
      deadlineConfigs,
      statusConfigs
    );

    if (res.success) {
      setCfMigrateMessage({
        type: 'success',
        text: res.message,
      });
      setDatabaseProvider('cloudflare');
      onConfigSaved();
    } else {
      setCfMigrateMessage({
        type: 'error',
        text: res.message,
      });
    }
    setIsMigratingToCf(false);
  };

  const handleCopyCfSql = () => {
    const sql = generateCloudflareD1SqlScript(effectiveTeachers, effectivePlans, deadlineConfigs);
    navigator.clipboard.writeText(sql);
    setCopiedCfSql(true);
    setTimeout(() => setCopiedCfSql(false), 2000);
  };

  const handleDownloadCfSql = () => {
    const sql = generateCloudflareD1SqlScript(effectiveTeachers, effectivePlans, deadlineConfigs);
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema-cloudflare-d1-export-${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCfWorker = () => {
    const code = generateCloudflareWorkerScript();
    navigator.clipboard.writeText(code);
    setCopiedCfWorker(true);
    setTimeout(() => setCopiedCfWorker(false), 2000);
  };

  const handleCopyWrangler = () => {
    const toml = generateWranglerToml();
    navigator.clipboard.writeText(toml);
    setCopiedWrangler(true);
    setTimeout(() => setCopiedWrangler(false), 2000);
  };

  // Supabase Handlers
  const handleSaveSupabase = () => {
    saveSupabaseConfig({ url: sbUrl.trim(), anonKey: sbAnonKey.trim() });
    setDatabaseProvider('supabase');
    onConfigSaved();
    setSbTestMessage('บันทึกการตั้งค่าแล้ว (ตั้งเป็นฐานข้อมูลหลัก)');
  };

  const handleTestSupabase = async () => {
    if (!sbUrl.trim() || !sbAnonKey.trim()) {
      setSbTestStatus('error');
      setSbTestMessage('กรุณากรอกทั้ง Supabase URL และ Anon Key ก่อนทดสอบ');
      return;
    }

    setSbTestStatus('testing');
    setSbTestMessage('กำลังทดสอบการเชื่อมต่อไปยัง Supabase...');

    try {
      saveSupabaseConfig({ url: sbUrl.trim(), anonKey: sbAnonKey.trim() });
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('ไม่สามารถสร้าง Supabase Client ได้');
      }

      const { error } = await client.from('teachers').select('count', { count: 'exact', head: true });
      if (error) {
        if (error.code === 'PGRST125' || error.message.includes('Invalid path specified in request URL')) {
          setSbTestStatus('error');
          setSbTestMessage('Supabase URL ไม่ถูกต้อง: ใช้ Project URL เช่น https://xxxx.supabase.co');
        } else if (error.code === '42P01' || error.message.includes('relation "teachers" does not exist')) {
          setSbTestStatus('success');
          setSbTestMessage('เชื่อมต่อ Supabase สำเร็จ! (แต่ยังไม่ได้สร้างตาราง กรุณาคัดลอก SQL ไปรัน)');
        } else {
          setSbTestStatus('error');
          setSbTestMessage(`ข้อผิดพลาดจาก Supabase: ${error.message}`);
        }
      } else {
        setSbTestStatus('success');
        setSbTestMessage('เชื่อมต่อกับตาราง teachers บน Supabase สำเร็จสมบูรณ์!');
      }
    } catch (err: any) {
      setSbTestStatus('error');
      setSbTestMessage(`เชื่อมต่อไม่สำเร็จ: ${err?.message || 'โปรดตรวจสอบ URL และ Key'}`);
    }
  };

  const handleCopySbSql = () => {
    const sql = generateSupabaseSqlScript();
    navigator.clipboard.writeText(sql);
    setIsCopiedSbSql(true);
    setTimeout(() => setIsCopiedSbSql(false), 2000);
  };

  const handleSeedToSupabase = async () => {
    setIsSeedingSb(true);
    setSeedSbMessage('');
    saveSupabaseConfig({ url: sbUrl.trim(), anonKey: sbAnonKey.trim() });
    const res = await seedTeachersToSupabase();
    if (res.success) {
      setSeedSbMessage(`ซิงค์ข้อมูลบุคลากร ${res.count} ท่านขึ้น Supabase สำเร็จเรียบร้อย!`);
    } else {
      setSeedSbMessage(`เกิดข้อผิดพลาด: ${res.error}`);
    }
    setIsSeedingSb(false);
  };

  const handleSyncPlansToSupabase = async () => {
    setIsSyncingSbPlans(true);
    setSyncSbPlansMessage('');
    saveSupabaseConfig({ url: sbUrl.trim(), anonKey: sbAnonKey.trim() });
    const res = await seedPlansToSupabase();
    if (res.success) {
      setSyncSbPlansMessage(`ซิงค์แผนการสอน ${res.count} รายการขึ้น Supabase SQL สำเร็จสมบูรณ์!`);
      onConfigSaved();
    } else {
      setSyncSbPlansMessage(`เกิดข้อผิดพลาด: ${res.error}`);
    }
    setIsSyncingSbPlans(false);
  };

  // Export JSON
  const handleExportFullJson = () => {
    const fullBackup = {
      system: 'PCSHS Kalasin EduPlan Portal',
      version: '2.5.0',
      export_date: new Date().toISOString(),
      teachers: effectiveTeachers,
      lesson_plans: effectivePlans,
      assignment_submissions: submissions,
      deadline_configs: deadlineConfigs,
      status_configs: statusConfigs,
    };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pcshs-eduplan-complete-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-indigo-700 p-5 sm:p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/25 shadow-inner">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-amber-200">
                    Database Manager & Migration
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
                    {currentProvider === 'cloudflare' ? '☁️ Cloudflare D1' : '⚡ Supabase'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  ตั้งค่าและย้ายฐานข้อมูล (Cloudflare D1 / Supabase)
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 bg-black/20 p-1 rounded-2xl text-xs font-semibold overflow-x-auto touch-scroll">
            <button
              onClick={() => setActiveTab('cloudflare')}
              className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'cloudflare'
                  ? 'bg-white text-orange-950 font-bold shadow-md'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <Cloud className="w-4 h-4 text-orange-500" />
              <span>Cloudflare D1 (แนะนำ)</span>
              {currentProvider === 'cloudflare' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('supabase')}
              className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'supabase'
                  ? 'bg-white text-emerald-950 font-bold shadow-md'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Supabase</span>
              {currentProvider === 'supabase' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-white text-indigo-950 font-bold shadow-md'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>ส่งออก & สำรองข้อมูล</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 touch-scroll text-slate-800">
          {/* TAB 1: CLOUDFLARE D1 */}
          {activeTab === 'cloudflare' && (
            <div className="space-y-5">
              {/* Cloudflare Overview Banner */}
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 bg-orange-500 text-white rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Cloud className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-orange-950">
                      ย้ายฐานข้อมูลไป Cloudflare D1 (Serverless Edge SQL)
                    </strong>
                    <span className="bg-orange-200/80 text-orange-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                      Zero-Egress Free
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Cloudflare D1 ให้บริการฐานข้อมูล SQL ไร้เซิร์ฟเวอร์ความเร็วสูงที่ edge ทั่วโลก ใช้งานฟรี 5GB, อ่านข้อมูลได้ 5 ล้านครั้ง/วัน และ<strong>ไม่มีค่าธรรมเนียมแบนด์วิดท์ (Zero Egress Fees)</strong>
                  </p>
                </div>
              </div>

              {/* Cloudflare Sub Tabs */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 text-xs font-semibold overflow-x-auto touch-scroll">
                <button
                  onClick={() => setCfSubTab('config')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    cfSubTab === 'config'
                      ? 'bg-orange-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  ⚙️ ตั้งค่าเชื่อมต่อ & ย้ายข้อมูล
                </button>
                <button
                  onClick={() => setCfSubTab('d1_sql')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    cfSubTab === 'd1_sql'
                      ? 'bg-orange-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>สคริปต์ D1 SQL (schema.sql)</span>
                </button>
                <button
                  onClick={() => setCfSubTab('worker_code')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    cfSubTab === 'worker_code'
                      ? 'bg-orange-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>โค้ด Worker (worker.js)</span>
                </button>
                <button
                  onClick={() => setCfSubTab('guide')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    cfSubTab === 'guide'
                      ? 'bg-orange-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>คู่มือ 3 ขั้นตอน</span>
                </button>
              </div>

              {/* Sub-tab 1: Configuration & Migration */}
              {cfSubTab === 'config' && (
                <div className="space-y-4">
                  {/* Form fields */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Server className="w-4 h-4 text-orange-600" />
                          Cloudflare Worker API URL (ผูกกับ D1)
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal lowercase font-sans">
                          (เช่น https://pcshs-d1.xxx.workers.dev)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={cfWorkerUrl}
                        onChange={(e) => setCfWorkerUrl(e.target.value)}
                        placeholder="https://pcshs-d1.your-account.workers.dev"
                        className="w-full px-3.5 py-2.5 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        URL ของ Cloudflare Worker ที่ท่านนำโค้ดจากแท็บ <strong>"โค้ด Worker"</strong> ไป Deploy ไว้
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-orange-600" />
                        API Token / Key (ไม่บังคับ - ปล่อยว่างได้ถ้าไม่ได้ตั้งค่า env.API_KEY)
                      </label>
                      <input
                        type="password"
                        value={cfApiKey}
                        onChange={(e) => setCfApiKey(e.target.value)}
                        placeholder="Optional Secret Token"
                        className="w-full px-3.5 py-2.5 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                      />
                    </div>

                    {/* Test status banner */}
                    {cfTestMessage && (
                      <div
                        className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                          cfTestStatus === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : cfTestStatus === 'error'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {cfTestStatus === 'testing' && (
                          <RefreshCw className="w-4 h-4 animate-spin text-orange-600 shrink-0" />
                        )}
                        {cfTestStatus === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {cfTestStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        <span>{cfTestMessage}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTestCloudflare}
                        disabled={cfTestStatus === 'testing'}
                        className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${cfTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                        ทดสอบการเชื่อมต่อ
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCloudflare}
                        className="flex-1 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        บันทึก & ใช้งาน Cloudflare D1
                      </button>
                    </div>
                  </div>

                  {/* 1-Click Migration Card */}
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                          <Upload className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">
                            ย้ายข้อมูลทั้งหมดไป Cloudflare D1 ทันที (One-Click Migration)
                          </h4>
                          <p className="text-xs text-slate-300">
                            ส่งข้อมูลครู {effectiveTeachers.length} ท่าน, แผน {effectivePlans.length} รายการ และการตั้งค่าระบบทั้งหมดขึ้น D1
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-orange-300 border border-white/15">
                        Auto-Sync
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      กดปุ่มนี้เพื่อให้อินเตอร์เฟซระบบย้ายข้อมูลปัจจุบัน (ทั้งบัญชีผู้ใช้, แผนการสอน, ภาระงานมอบหมาย, วันกำหนดส่ง) ขึ้นไปบันทึกบน Cloudflare D1 โดยอัตโนมัติ
                    </p>

                    {cfMigrateMessage && (
                      <div
                        className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                          cfMigrateMessage.type === 'success'
                            ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/40'
                            : 'bg-rose-950/80 text-rose-200 border border-rose-500/40'
                        }`}
                      >
                        {cfMigrateMessage.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span>{cfMigrateMessage.text}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleMigrateToCloudflare}
                      disabled={isMigratingToCf || !cfWorkerUrl.trim()}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer"
                    >
                      {isMigratingToCf ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                          <span>กำลังย้ายข้อมูลขึ้น Cloudflare D1...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-slate-950" />
                          <span>เริ่มการย้ายข้อมูลขึ้น Cloudflare D1 ทันที</span>
                          <ArrowRight className="w-4 h-4 text-slate-950" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: D1 SQL Schema Script */}
              {cfSubTab === 'd1_sql' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        คำสั่ง SQL สร้างตาราง & ข้อมูลสำหรับ Cloudflare D1
                      </h4>
                      <p className="text-xs text-slate-500">
                        ไวยากรณ์ SQLite ที่ปรับแต่งเฉพาะสำหรับ Cloudflare D1 พร้อมข้อมูลครู {effectiveTeachers.length} คน
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadCfSql}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
                        title="ดาวน์โหลดเป็นไฟล์ .sql"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลด .sql</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyCfSql}
                        className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        {copiedCfSql ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>คัดลอกแล้ว!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>คัดลอก SQL ทั้งหมด</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-amber-200 rounded-2xl p-4 font-mono text-xs overflow-x-auto max-h-64 border border-slate-800 select-all">
                    <pre>{generateCloudflareD1SqlScript(effectiveTeachers, effectivePlans, deadlineConfigs)}</pre>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>วิธีรัน SQL บน Cloudflare:</strong> เข้า Cloudflare Dashboard &gt; <strong>Storage & Databases</strong> &gt; <strong>D1</strong> &gt; คลิกที่ชื่อฐานข้อมูล &gt; ไปที่แท็บ <strong>Console</strong> &gt; วางโค้ด SQL ด้านบนแล้วกด <strong>Execute</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Worker Script */}
              {cfSubTab === 'worker_code' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        โค้ด Cloudflare Worker API (worker.js)
                      </h4>
                      <p className="text-xs text-slate-500">
                        เชื่อมต่อระหว่างเว็บแอปกับ Cloudflare D1 พร้อม CORS และ REST endpoints ครบถ้วน
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyWrangler}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
                        title="คัดลอก wrangler.toml สำหรับรัน CLI"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{copiedWrangler ? 'คัดลอกแล้ว' : 'wrangler.toml'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyCfWorker}
                        className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        {copiedCfWorker ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>คัดลอกแล้ว!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>คัดลอกโค้ด worker.js</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-emerald-300 rounded-2xl p-4 font-mono text-xs overflow-x-auto max-h-64 border border-slate-800 select-all">
                    <pre>{generateCloudflareWorkerScript()}</pre>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-blue-600" />
                      <span>ขั้นตอนการ Deploy Worker:</span>
                    </div>
                    <ol className="list-decimal pl-4 space-y-0.5 text-blue-900">
                      <li>เข้า Cloudflare Dashboard &gt; <strong>Workers & Pages</strong> &gt; <strong>Create application</strong> &gt; <strong>Create Worker</strong></li>
                      <li>กด <strong>Edit code</strong> นำโค้ดด้านบนไปวางแทนที่ แล้วกด <strong>Deploy</strong></li>
                      <li>ไปที่ <strong>Settings</strong> &gt; <strong>Variables & Secrets</strong> &gt; เลื่อนลงไปที่ <strong>D1 Database Bindings</strong> &gt; กด <strong>Add binding</strong>:
                        <ul className="list-disc pl-4 mt-0.5 font-mono text-[11px]">
                          <li>Variable name: <strong className="text-orange-700">DB</strong></li>
                          <li>D1 database: เลือกฐานข้อมูล D1 ของท่าน</li>
                        </ul>
                      </li>
                      <li>คัดลอก Worker URL (เช่น <code className="bg-blue-100 px-1 rounded">https://xxx.workers.dev</code>) มาวางในช่อง URL ในแอปนี้</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Sub-tab 4: Guide */}
              {cfSubTab === 'guide' && (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                      สร้างฐานข้อมูล Cloudflare D1
                    </h4>
                    <p className="text-slate-600">
                      ไปที่ <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-orange-600 font-bold underline inline-flex items-center gap-1">Cloudflare Dashboard <ExternalLink className="w-3 h-3" /></a> &gt; เมนูด้านซ้ายเลือก <strong>Storage & Databases</strong> &gt; <strong>D1</strong> &gt; กด <strong>Create database</strong> &gt; ตั้งชื่อฐานข้อมูล เช่น <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">pcshs-eduplan-db</code>
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                      รันคำสั่ง SQL สร้างตาราง
                    </h4>
                    <p className="text-slate-600">
                      คลิกเข้าไปที่ฐานข้อมูล D1 ที่เพิ่งสร้าง &gt; ไปที่แท็บ <strong>Console</strong> &gt; คัดลอก SQL จากแท็บ <strong>"สคริปต์ D1 SQL"</strong> ด้านบนไปวางแล้วกด <strong>Execute</strong>
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                      สร้าง Worker และผูกฐานข้อมูล D1
                    </h4>
                    <p className="text-slate-600">
                      ไปที่ <strong>Workers & Pages</strong> &gt; สร้าง Worker ใหม่ วางโค้ดจากแท็บ <strong>"โค้ด Worker"</strong> แล้วผูกตัวแปร <strong>DB</strong> กับฐานข้อมูล D1 ใน Settings จากนั้นนำ Worker URL มาใส่ในหน้านี้ แล้วกด <strong>"ย้ายข้อมูลทั้งหมดไป Cloudflare ทันที"</strong> เป็นอันเสร็จสิ้น!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUPABASE */}
          {activeTab === 'supabase' && (
            <div className="space-y-5">
              {/* Status info */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-emerald-800 mb-1">
                    การเชื่อมต่อฐานข้อมูล Supabase (PostgreSQL)
                  </strong>
                  ท่านสามารถใส่ค่า <strong>Project URL</strong> และ <strong>Anon Key</strong> จากแดชบอร์ด Supabase ของท่าน เพื่อเชื่อมต่อตาราง <strong>teachers</strong> และ <strong>lesson_plans</strong>
                </div>
              </div>

              {/* Form Credentials */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-emerald-600" />
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={sbUrl}
                    onChange={(e) => setSbUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3.5 py-2.5 font-mono text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    ตัวอย่าง: <span className="font-mono text-slate-600">https://xyzcompany.supabase.co</span> (ห้ามใส่ /rest/v1 ต่อท้าย)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-emerald-600" />
                    Supabase Anon (Public) Key
                  </label>
                  <input
                    type="password"
                    value={sbAnonKey}
                    onChange={(e) => setSbAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3.5 py-2.5 font-mono text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                {sbTestMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      sbTestStatus === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : sbTestStatus === 'error'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {sbTestStatus === 'testing' && (
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                    )}
                    {sbTestStatus === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {sbTestStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{sbTestMessage}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={sbTestStatus === 'testing'}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${sbTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                    ทดสอบการเชื่อมต่อ
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSupabase}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    บันทึก & ใช้งาน Supabase
                  </button>
                </div>
              </div>

              {/* Supabase SQL Migration */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      SQL Schema & Seed สำหรับสร้างตารางบน Supabase
                    </h3>
                    <p className="text-xs text-slate-500">
                      คำสั่ง PostgreSQL สร้างตาราง teachers, lesson_plans, assignment_submissions
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySbSql}
                    className="shrink-0 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-indigo-200 cursor-pointer"
                  >
                    {isCopiedSbSql ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        คัดลอกเรียบร้อย!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        คัดลอก SQL Supabase
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 font-mono text-xs overflow-x-auto max-h-40 border border-slate-800 select-all">
                  <pre>{generateSupabaseSqlScript()}</pre>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-600">
                      ซิงค์ข้อมูลบุคลากร 27 ท่าน + แอดมิน เข้า Supabase:
                    </span>
                    <button
                      type="button"
                      onClick={handleSeedToSupabase}
                      disabled={isSeedingSb || !sbUrl || !sbAnonKey}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {isSeedingSb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      อัปโหลดครู 27 คน
                    </button>
                  </div>
                  {seedSbMessage && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                      {seedSbMessage}
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 text-xs">
                    <span className="text-indigo-900 font-medium">
                      ซิงค์แผนการสอนทั้งหมดเข้าตาราง lesson_plans:
                    </span>
                    <button
                      type="button"
                      onClick={handleSyncPlansToSupabase}
                      disabled={isSyncingSbPlans || !sbUrl || !sbAnonKey}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {isSyncingSbPlans ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      ซิงค์แผนการสอน
                    </button>
                  </div>
                  {syncSbPlansMessage && (
                    <div className="text-xs p-2.5 rounded-lg border text-emerald-700 bg-emerald-50 border-emerald-200">
                      {syncSbPlansMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXPORT & BACKUP */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-950 flex items-start gap-3">
                <Download className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm font-bold text-indigo-900 mb-1">
                    ศูนย์สำรองและส่งออกข้อมูล (Data Backup & Migration Hub)
                  </strong>
                  ท่านสามารถดาวน์โหลดข้อมูลทั้งหมดของระบบเก็บไว้เป็นไฟล์ หรือนำไป import เข้าฐานข้อมูลอื่นได้ตลอดเวลา
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Full JSON Backup */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      Complete JSON Backup
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      สำรองข้อมูลทั้งระบบ (.json)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      รวมข้อมูลบุคลากร 27 ท่าน, แผนการสอนทั้งหมด, ภาระงานมอบหมาย, และการตั้งค่าระบบ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportFullJson}
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดไฟล์ JSON ทั้งระบบ</span>
                  </button>
                </div>

                {/* Option 2: Cloudflare D1 SQL Dump */}
                <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50/40 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                      Cloudflare D1 SQL
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      ส่งออก SQL สำหรับ Cloudflare D1
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      ไฟล์สคริปต์ SQLite พร้อม CREATE TABLE และ INSERT ข้อมูลปัจจุบันครบถ้วน
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadCfSql}
                    className="w-full py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>ดาวน์โหลด D1 SQL Script</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>ฐานข้อมูลที่เปิดใช้งาน:</span>
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              {currentProvider === 'cloudflare' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-orange-500" />
                  <span>Cloudflare D1</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Supabase</span>
                </>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

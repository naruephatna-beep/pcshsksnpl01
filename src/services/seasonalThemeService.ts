export type SeasonalThemeId =
  | 'default'
  | 'new_year'
  | 'childrens_day'
  | 'teachers_day'
  | 'chinese_new_year'
  | 'valentine'
  | 'songkran'
  | 'mothers_day'
  | 'national_science_day'
  | 'chulalongkorn_day'
  | 'halloween'
  | 'loy_krathong'
  | 'fathers_day'
  | 'christmas'
  | 'mourning';

export type SeasonalParticleMode =
  | 'none'
  | 'sparkles'
  | 'petals'
  | 'hearts'
  | 'water'
  | 'atoms'
  | 'halloween'
  | 'lanterns'
  | 'snow';

export interface SeasonalThemeMeta {
  id: SeasonalThemeId;
  name: string;
  shortLabel: string;
  greeting: string;
  subGreeting: string;
  dateDescription: string;
  iconType:
    | 'school'
    | 'sparkles'
    | 'star'
    | 'book'
    | 'lantern'
    | 'heart'
    | 'droplet'
    | 'flower'
    | 'atom'
    | 'crown'
    | 'pumpkin'
    | 'flame'
    | 'tree'
    | 'ribbon';
  sidebarTopClass: string;
  bannerBgClass: string;
  bannerBorderClass: string;
  bannerTextClass: string;
  accentBadgeClass: string;
  headerBorderClass: string;
  previewSwatchClass: string;
  loginBgClass: string;
  loginHaloRgb: string;
  accentHex: string;
  particleMode: SeasonalParticleMode;
  grayscaleRoot?: boolean;
}

export interface SeasonalThemeConfig {
  mode: 'auto' | 'manual' | 'off';
  manual_theme_id: SeasonalThemeId;
  show_banner: boolean;
  show_particles: boolean;
  custom_message?: string;
  updated_at?: string;
}

export const STORAGE_KEY_SEASONAL_THEME = 'pcshs_seasonal_theme_config_v1';
export const STORAGE_KEY_SEASONAL_MUTED = 'pcshs_seasonal_effects_muted_v1';

export const DEFAULT_SEASONAL_THEME_CONFIG: SeasonalThemeConfig = {
  mode: 'auto',
  manual_theme_id: 'default',
  show_banner: true,
  show_particles: true,
  custom_message: '',
};

export const SEASONAL_THEMES: Record<SeasonalThemeId, SeasonalThemeMeta> = {
  default: {
    id: 'default',
    name: 'ธีมมาตรฐานโรงเรียน (Classic Navy & Gold)',
    shortLabel: 'มาตรฐานโรงเรียน',
    greeting: 'ระบบส่งและติดตามเอกสารวิชาการ จ.ภ. กาฬสินธุ์',
    subGreeting: 'ธีมทางการสีกรมท่า-ทอง',
    dateDescription: 'ค่าเริ่มต้นตลอดปี',
    iconType: 'school',
    sidebarTopClass: '',
    bannerBgClass: 'bg-slate-900',
    bannerBorderClass: 'border-slate-800',
    bannerTextClass: 'text-white',
    accentBadgeClass: 'bg-amber-400 text-slate-950',
    headerBorderClass: 'border-slate-200/80',
    previewSwatchClass: 'from-[#0B1329] to-amber-500',
    loginBgClass: 'bg-[#060A16]',
    loginHaloRgb: '251, 191, 36',
    accentHex: '#FBBF24',
    particleMode: 'none',
  },
  new_year: {
    id: 'new_year',
    name: 'เทศกาลปีใหม่ (Happy New Year)',
    shortLabel: 'สวัสดีปีใหม่',
    greeting: 'สวัสดีปีใหม่ ขอให้คณะครูและบุคลากรทุกท่านมีความสุข สุขภาพแข็งแรง ตลอดปี',
    subGreeting: 'ช่วงเทศกาลส่งท้ายปีเก่า ต้อนรับปีใหม่',
    dateDescription: '28 ธันวาคม – 5 มกราคม ของทุกปี',
    iconType: 'sparkles',
    sidebarTopClass: 'bg-gradient-to-br from-[#0B1329] via-indigo-950 to-amber-950/60',
    bannerBgClass: 'bg-gradient-to-r from-[#0B1329] via-indigo-950 to-slate-900',
    bannerBorderClass: 'border-amber-400/50',
    bannerTextClass: 'text-amber-50',
    accentBadgeClass: 'bg-amber-400 text-slate-950',
    headerBorderClass: 'border-amber-300/70',
    previewSwatchClass: 'from-indigo-950 to-amber-400',
    loginBgClass: 'bg-gradient-to-br from-[#070B1E] via-[#0F1738] to-[#1E1608]',
    loginHaloRgb: '251, 191, 36',
    accentHex: '#FCD34D',
    particleMode: 'sparkles',
  },
  childrens_day: {
    id: 'childrens_day',
    name: 'วันเด็กแห่งชาติ (Children’s Day)',
    shortLabel: 'วันเด็กแห่งชาติ',
    greeting: 'สุขสันต์วันเด็กแห่งชาติ ร่วมสร้างแรงบันดาลใจและอนาคตที่สดใสให้เยาวชนไทย',
    subGreeting: 'วันเสาร์ที่ 2 ของเดือนมกราคม',
    dateDescription: 'เสาร์ที่ 2 ของเดือนมกราคม ของทุกปี',
    iconType: 'star',
    sidebarTopClass: 'bg-gradient-to-br from-[#0B1329] via-sky-950 to-cyan-900/50',
    bannerBgClass: 'bg-gradient-to-r from-sky-900 via-indigo-900 to-sky-950',
    bannerBorderClass: 'border-sky-400/50',
    bannerTextClass: 'text-sky-50',
    accentBadgeClass: 'bg-amber-300 text-slate-950',
    headerBorderClass: 'border-sky-300/70',
    previewSwatchClass: 'from-sky-700 to-amber-300',
    loginBgClass: 'bg-gradient-to-br from-[#051426] via-[#09203A] to-[#081229]',
    loginHaloRgb: '56, 189, 248',
    accentHex: '#38BDF8',
    particleMode: 'sparkles',
  },
  teachers_day: {
    id: 'teachers_day',
    name: 'วันครูแห่งชาติ (Teachers’ Day)',
    shortLabel: 'วันครูแห่งชาติ',
    greeting: 'น้อมรำลึกพระคุณครู สดุดีเกียรติคุณผู้สร้างคนเนื่องในวันครูแห่งชาติ 16 มกราคม',
    subGreeting: 'ยกย่องเชิดชูเกียรติครูผู้สอน',
    dateDescription: '14 – 17 มกราคม ของทุกปี',
    iconType: 'book',
    sidebarTopClass: 'bg-gradient-to-br from-[#0B1329] via-emerald-950 to-amber-950/40',
    bannerBgClass: 'bg-gradient-to-r from-emerald-950 via-[#0B1329] to-amber-950',
    bannerBorderClass: 'border-amber-400/50',
    bannerTextClass: 'text-amber-50',
    accentBadgeClass: 'bg-amber-400 text-slate-950',
    headerBorderClass: 'border-amber-300/70',
    previewSwatchClass: 'from-emerald-900 to-amber-400',
    loginBgClass: 'bg-gradient-to-br from-[#051814] via-[#091C1F] to-[#171206]',
    loginHaloRgb: '52, 211, 153',
    accentHex: '#FBBF24',
    particleMode: 'petals',
  },
  chinese_new_year: {
    id: 'chinese_new_year',
    name: 'เทศกาลตรุษจีน (Chinese New Year)',
    shortLabel: 'สุขสันต์วันตรุษจีน',
    greeting: 'ซินเจียยู่อี่ ซินนี้ฮวดไช้ ขอให้ทุกท่านมั่งคั่ง สุขภาพแข็งแรง ตลอดปีใหม่จีน',
    subGreeting: 'เทศกาลตรุษจีน (คำนวณตามปฏิทินจันทรคติ)',
    dateDescription: 'ช่วงวันตรุษจีนของทุกปี (ตามจันทรคติ)',
    iconType: 'lantern',
    sidebarTopClass: 'bg-gradient-to-br from-[#2B090D] via-[#4C0D16] to-[#0B1329]',
    bannerBgClass: 'bg-gradient-to-r from-red-950 via-rose-900 to-red-950',
    bannerBorderClass: 'border-amber-400/60',
    bannerTextClass: 'text-amber-50',
    accentBadgeClass: 'bg-amber-400 text-red-950',
    headerBorderClass: 'border-rose-300/70',
    previewSwatchClass: 'from-red-800 to-amber-400',
    loginBgClass: 'bg-gradient-to-br from-[#1C0508] via-[#2B080D] to-[#120710]',
    loginHaloRgb: '248, 113, 113',
    accentHex: '#FBBF24',
    particleMode: 'lanterns',
  },
  valentine: {
    id: 'valentine',
    name: 'วันวาเลนไทน์ (Valentine’s Day)',
    shortLabel: 'วันแห่งความรัก',
    greeting: 'Happy Valentine’s Day ส่งมอบความปรารถนาดีและความห่วงใยให้เพื่อนร่วมงานทุกท่าน',
    subGreeting: 'เทศกาลแห่งความรักและมิตรภาพ',
    dateDescription: '13 – 14 กุมภาพันธ์ ของทุกปี',
    iconType: 'heart',
    sidebarTopClass: 'bg-gradient-to-br from-[#2A0A1B] via-rose-950 to-[#0B1329]',
    bannerBgClass: 'bg-gradient-to-r from-rose-900 via-pink-900 to-rose-950',
    bannerBorderClass: 'border-pink-400/50',
    bannerTextClass: 'text-rose-50',
    accentBadgeClass: 'bg-pink-300 text-rose-950',
    headerBorderClass: 'border-pink-300/70',
    previewSwatchClass: 'from-rose-700 to-pink-300',
    loginBgClass: 'bg-gradient-to-br from-[#1B0613] via-[#29091C] to-[#11081C]',
    loginHaloRgb: '244, 114, 182',
    accentHex: '#F472B6',
    particleMode: 'hearts',
  },
  songkran: {
    id: 'songkran',
    name: 'เทศกาลสงกรานต์ (ปีใหม่ไทย)',
    shortLabel: 'สุขสันต์วันสงกรานต์',
    greeting: 'สุขสันต์วันสงกรานต์ สืบสานประเพณีปีใหม่ไทย เดินทางปลอดภัย เย็นฉ่ำทั่วกัน',
    subGreeting: 'เทศกาลมหาสงกรานต์ ปีใหม่ไทย',
    dateDescription: '12 – 16 เมษายน ของทุกปี',
    iconType: 'droplet',
    sidebarTopClass: 'bg-gradient-to-br from-[#092238] via-cyan-950 to-[#0B1329]',
    bannerBgClass: 'bg-gradient-to-r from-cyan-900 via-sky-900 to-teal-900',
    bannerBorderClass: 'border-cyan-400/50',
    bannerTextClass: 'text-cyan-50',
    accentBadgeClass: 'bg-cyan-300 text-slate-950',
    headerBorderClass: 'border-cyan-300/70',
    previewSwatchClass: 'from-cyan-700 to-sky-300',
    loginBgClass: 'bg-gradient-to-br from-[#041724] via-[#072233] to-[#061829]',
    loginHaloRgb: '34, 211, 238',
    accentHex: '#22D3EE',
    particleMode: 'water',
  },
  mothers_day: {
    id: 'mothers_day',
    name: 'วันแม่แห่งชาติ (12 สิงหาคม)',
    shortLabel: 'วันแม่แห่งชาติ',
    greeting: 'น้อมสำนึกในพระคุณแม่ เนื่องในวันแม่แห่งชาติ 12 สิงหาคม',
    subGreeting: 'วันเฉลิมพระชนมพรรษาและวันแม่แห่งชาติ',
    dateDescription: '11 – 13 สิงหาคม ของทุกปี',
    iconType: 'flower',
    sidebarTopClass: 'bg-gradient-to-br from-[#0A2247] via-blue-950 to-[#0B1329]',
    bannerBgClass: 'bg-gradient-to-r from-blue-900 via-sky-900 to-blue-950',
    bannerBorderClass: 'border-sky-300/50',
    bannerTextClass: 'text-sky-50',
    accentBadgeClass: 'bg-sky-200 text-blue-950',
    headerBorderClass: 'border-sky-300/70',
    previewSwatchClass: 'from-blue-800 to-sky-300',
    loginBgClass: 'bg-gradient-to-br from-[#051530] via-[#092045] to-[#061229]',
    loginHaloRgb: '125, 211, 252',
    accentHex: '#7DD3FC',
    particleMode: 'petals',
  },
  national_science_day: {
    id: 'national_science_day',
    name: 'วันวิทยาศาสตร์แห่งชาติ (18 สิงหาคม)',
    shortLabel: 'วันวิทยาศาสตร์แห่งชาติ',
    greeting: 'สัปดาห์วิทยาศาสตร์แห่งชาติ เทิดพระเกียรติพระบิดาแห่งวิทยาศาสตร์ไทย จุดประกายความคิดสร้างสรรค์',
    subGreeting: 'วันวิทยาศาสตร์แห่งชาติ (โรงเรียนวิทยาศาสตร์จุฬาภรณฯ)',
    dateDescription: '17 – 19 สิงหาคม ของทุกปี',
    iconType: 'atom',
    sidebarTopClass: 'bg-gradient-to-br from-[#091836] via-indigo-950 to-cyan-950/60',
    bannerBgClass: 'bg-gradient-to-r from-indigo-950 via-blue-900 to-cyan-950',
    bannerBorderClass: 'border-cyan-400/50',
    bannerTextClass: 'text-cyan-50',
    accentBadgeClass: 'bg-cyan-400 text-slate-950',
    headerBorderClass: 'border-indigo-300/70',
    previewSwatchClass: 'from-indigo-800 to-cyan-400',
    loginBgClass: 'bg-gradient-to-br from-[#050E24] via-[#0B183D] to-[#061D2E]',
    loginHaloRgb: '34, 211, 238',
    accentHex: '#38BDF8',
    particleMode: 'atoms',
  },
  chulalongkorn_day: {
    id: 'chulalongkorn_day',
    name: 'วันปิยมหาราช (23 ตุลาคม)',
    shortLabel: 'วันปิยมหาราช',
    greeting: 'น้อมรำลึกในพระมหากรุณาธิคุณ พระบาทสมเด็จพระจุลจอมเกล้าเจ้าอยู่หัว รัชกาลที่ 5',
    subGreeting: 'วันคล้ายวันสวรรคตรัชกาลที่ 5',
    dateDescription: '23 ตุลาคม ของทุกปี',
    iconType: 'crown',
    sidebarTopClass: 'bg-gradient-to-br from-[#1C1226] via-[#0B1329] to-rose-950/30',
    bannerBgClass: 'bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900',
    bannerBorderClass: 'border-rose-300/40',
    bannerTextClass: 'text-rose-50',
    accentBadgeClass: 'bg-rose-200 text-slate-950',
    headerBorderClass: 'border-rose-200/70',
    previewSwatchClass: 'from-slate-800 to-rose-300',
    loginBgClass: 'bg-gradient-to-br from-[#120B1A] via-[#131024] to-[#1C0E18]',
    loginHaloRgb: '253, 164, 175',
    accentHex: '#FDA4AF',
    particleMode: 'none',
  },
  halloween: {
    id: 'halloween',
    name: 'วันฮาโลวีน (Halloween)',
    shortLabel: 'Happy Halloween',
    greeting: 'Happy Halloween! ส่งแผนการสอนให้ทันเวลา ก่อนผีฟักทองจะมาทวงงาน',
    subGreeting: 'เทศกาลฮาโลวีน 31 ตุลาคม',
    dateDescription: '29 – 31 ตุลาคม ของทุกปี',
    iconType: 'pumpkin',
    sidebarTopClass: 'bg-gradient-to-br from-[#1B0E2E] via-purple-950 to-[#0B1329]',
    bannerBgClass: 'bg-gradient-to-r from-[#1A0D2E] via-purple-950 to-orange-950',
    bannerBorderClass: 'border-orange-500/50',
    bannerTextClass: 'text-orange-50',
    accentBadgeClass: 'bg-orange-400 text-slate-950',
    headerBorderClass: 'border-orange-300/70',
    previewSwatchClass: 'from-purple-900 to-orange-500',
    loginBgClass: 'bg-gradient-to-br from-[#120721] via-[#1D0D33] to-[#210E08]',
    loginHaloRgb: '251, 146, 60',
    accentHex: '#FB923C',
    particleMode: 'halloween',
  },
  loy_krathong: {
    id: 'loy_krathong',
    name: 'ประเพณีลอยกระทง (Loy Krathong)',
    shortLabel: 'สืบสานลอยกระทง',
    greeting: 'สุขสันต์วันลอยกระทง ขอขมาพระแม่คงคาและสืบสานวัฒนธรรมไทยอันงดงาม',
    subGreeting: 'วันเพ็ญเดือนสิบสอง (คำนวณตามปฏิทินจันทรคติ)',
    dateDescription: 'วันเพ็ญขึ้น 15 ค่ำ เดือน 12 ของทุกปี',
    iconType: 'flame',
    sidebarTopClass: 'bg-gradient-to-br from-[#0A1433] via-indigo-950 to-amber-950/50',
    bannerBgClass: 'bg-gradient-to-r from-[#0B1329] via-indigo-950 to-amber-950',
    bannerBorderClass: 'border-amber-400/50',
    bannerTextClass: 'text-amber-50',
    accentBadgeClass: 'bg-amber-400 text-slate-950',
    headerBorderClass: 'border-amber-300/70',
    previewSwatchClass: 'from-indigo-950 to-amber-400',
    loginBgClass: 'bg-gradient-to-br from-[#060B21] via-[#0D173D] to-[#1A1308]',
    loginHaloRgb: '251, 191, 36',
    accentHex: '#FBBF24',
    particleMode: 'lanterns',
  },
  fathers_day: {
    id: 'fathers_day',
    name: 'วันพ่อแห่งชาติ (5 ธันวาคม)',
    shortLabel: 'วันพ่อแห่งชาติ',
    greeting: 'น้อมรำลึกในพระมหากรุณาธิคุณ และส่งมอบความรักความกตัญญูเนื่องในวันพ่อแห่งชาติ 5 ธันวาคม',
    subGreeting: 'วันคล้ายวันพระบรมราชสมภพ ร.9 และวันชาติไทย',
    dateDescription: '4 – 6 ธันวาคม ของทุกปี',
    iconType: 'crown',
    sidebarTopClass: 'bg-gradient-to-br from-[#1E1907] via-amber-950/80 to-[#0B1329]',
    bannerBgClass: 'bg-gradient-to-r from-amber-900 via-yellow-900 to-slate-900',
    bannerBorderClass: 'border-amber-400/60',
    bannerTextClass: 'text-amber-50',
    accentBadgeClass: 'bg-amber-300 text-slate-950',
    headerBorderClass: 'border-amber-300/80',
    previewSwatchClass: 'from-amber-700 to-yellow-300',
    loginBgClass: 'bg-gradient-to-br from-[#141004] via-[#211A07] to-[#0B1329]',
    loginHaloRgb: '253, 224, 71',
    accentHex: '#FDE047',
    particleMode: 'petals',
  },
  christmas: {
    id: 'christmas',
    name: 'เทศกาลคริสต์มาส (Merry Christmas)',
    shortLabel: 'Merry Christmas',
    greeting: 'Merry Christmas! ขอให้ทุกท่านเต็มเปี่ยมด้วยความสุข ความอบอุ่น และรอยยิ้มส่งท้ายปี',
    subGreeting: 'เทศกาลคริสต์มาส 25 ธันวาคม',
    dateDescription: '23 – 27 ธันวาคม ของทุกปี',
    iconType: 'tree',
    sidebarTopClass: 'bg-gradient-to-br from-[#0A261B] via-emerald-950 to-[#0B1329]',
    bannerBgClass: 'bg-gradient-to-r from-emerald-950 via-green-900 to-red-950',
    bannerBorderClass: 'border-emerald-400/50',
    bannerTextClass: 'text-emerald-50',
    accentBadgeClass: 'bg-red-500 text-white',
    headerBorderClass: 'border-emerald-300/70',
    previewSwatchClass: 'from-emerald-800 to-red-500',
    loginBgClass: 'bg-gradient-to-br from-[#051811] via-[#08241A] to-[#1F090B]',
    loginHaloRgb: '52, 211, 153',
    accentHex: '#34D399',
    particleMode: 'snow',
  },
  mourning: {
    id: 'mourning',
    name: 'โหมดสำรวม / ไว้อาลัย (Monochrome)',
    shortLabel: 'โหมดสำรวม',
    greeting: 'น้อมถวายความอาลัย / โหมดสำรวมทางการ',
    subGreeting: 'ปรับโทนสีขาว-ดำสำรวมทั้งหน้าเว็บ (เปิด-ปิดโดยแอดมิน)',
    dateDescription: 'เปิดใช้งานตามประกาศราชการหรือโรงเรียน',
    iconType: 'ribbon',
    sidebarTopClass: 'bg-slate-950',
    bannerBgClass: 'bg-slate-900',
    bannerBorderClass: 'border-slate-600',
    bannerTextClass: 'text-slate-100',
    accentBadgeClass: 'bg-slate-200 text-slate-950',
    headerBorderClass: 'border-slate-300',
    previewSwatchClass: 'from-slate-900 to-slate-400',
    loginBgClass: 'bg-slate-950',
    loginHaloRgb: '148, 163, 184',
    accentHex: '#CBD5E1',
    particleMode: 'none',
    grayscaleRoot: true,
  },
};

// Lunar calendar windows for Chinese New Year (exact dates 2025-2032, [month, startDay, endDay])
const CHINESE_NEW_YEAR_WINDOWS: Record<number, { month: number; startDay: number; endDay: number }> = {
  2025: { month: 1, startDay: 28, endDay: 30 },
  2026: { month: 2, startDay: 16, endDay: 18 },
  2027: { month: 2, startDay: 5, endDay: 7 },
  2028: { month: 1, startDay: 25, endDay: 27 },
  2029: { month: 2, startDay: 12, endDay: 14 },
  2030: { month: 2, startDay: 2, endDay: 4 },
  2031: { month: 1, startDay: 22, endDay: 24 },
  2032: { month: 2, startDay: 10, endDay: 12 },
};

// Lunar calendar windows for Loy Krathong (Full moon of 12th Thai lunar month, 2025-2032)
const LOY_KRATHONG_WINDOWS: Record<number, { month: number; startDay: number; endDay: number }> = {
  2025: { month: 11, startDay: 4, endDay: 6 },
  2026: { month: 11, startDay: 24, endDay: 25 },
  2027: { month: 11, startDay: 13, endDay: 14 },
  2028: { month: 11, startDay: 1, endDay: 2 },
  2029: { month: 11, startDay: 20, endDay: 21 },
  2030: { month: 11, startDay: 9, endDay: 10 },
  2031: { month: 11, startDay: 28, endDay: 29 },
  2032: { month: 11, startDay: 17, endDay: 18 },
};

function isChildrensDay(date: Date): boolean {
  if (date.getMonth() !== 0) return false; // January = 0
  if (date.getDay() !== 6) return false; // Saturday = 6
  const day = date.getDate();
  return day >= 8 && day <= 14; // 2nd Saturday of January
}

export function resolveFestivalIdForDate(date: Date = new Date()): SeasonalThemeId {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1..12
  const day = date.getDate();

  // 1. New Year (Dec 28 - Jan 5)
  if ((month === 12 && day >= 28) || (month === 1 && day <= 5)) {
    return 'new_year';
  }

  // 2. National Children's Day (2nd Saturday of Jan)
  if (isChildrensDay(date)) {
    return 'childrens_day';
  }

  // 3. Teachers' Day (Jan 14 - Jan 17)
  if (month === 1 && day >= 14 && day <= 17) {
    return 'teachers_day';
  }

  // 4. Chinese New Year (Lunar table)
  const cny = CHINESE_NEW_YEAR_WINDOWS[year];
  if (cny && month === cny.month && day >= cny.startDay && day <= cny.endDay) {
    return 'chinese_new_year';
  }

  // 5. Valentine's Day (Feb 13 - Feb 14)
  if (month === 2 && day >= 13 && day <= 14) {
    return 'valentine';
  }

  // 6. Songkran (Apr 12 - Apr 16)
  if (month === 4 && day >= 12 && day <= 16) {
    return 'songkran';
  }

  // 7. Mother's Day (Aug 11 - Aug 13)
  if (month === 8 && day >= 11 && day <= 13) {
    return 'mothers_day';
  }

  // 8. National Science Day (Aug 17 - Aug 19)
  if (month === 8 && day >= 17 && day <= 19) {
    return 'national_science_day';
  }

  // 9. Chulalongkorn Day (Oct 23)
  if (month === 10 && day === 23) {
    return 'chulalongkorn_day';
  }

  // 10. Halloween (Oct 29 - Oct 31)
  if (month === 10 && day >= 29 && day <= 31) {
    return 'halloween';
  }

  // 11. Loy Krathong (Lunar table)
  const lk = LOY_KRATHONG_WINDOWS[year];
  if (lk && month === lk.month && day >= lk.startDay && day <= lk.endDay) {
    return 'loy_krathong';
  }

  // 12. Father's Day (Dec 4 - Dec 6)
  if (month === 12 && day >= 4 && day <= 6) {
    return 'fathers_day';
  }

  // 13. Christmas (Dec 23 - Dec 27)
  if (month === 12 && day >= 23 && day <= 27) {
    return 'christmas';
  }

  return 'default';
}

export function resolveActiveSeasonalTheme(
  config: SeasonalThemeConfig = DEFAULT_SEASONAL_THEME_CONFIG,
  date: Date = new Date()
): SeasonalThemeMeta {
  if (!config || config.mode === 'off') {
    return SEASONAL_THEMES.default;
  }

  if (config.mode === 'manual') {
    return SEASONAL_THEMES[config.manual_theme_id] || SEASONAL_THEMES.default;
  }

  const autoId = resolveFestivalIdForDate(date);
  return SEASONAL_THEMES[autoId] || SEASONAL_THEMES.default;
}

export function findNextUpcomingFestival(
  fromDate: Date = new Date()
): { theme: SeasonalThemeMeta; dateLabel: string; daysAway: number } | null {
  const probe = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  for (let offset = 0; offset <= 366; offset++) {
    const d = new Date(probe);
    d.setDate(probe.getDate() + offset);
    const id = resolveFestivalIdForDate(d);
    if (id !== 'default') {
      const theme = SEASONAL_THEMES[id];
      const dateLabel = d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return { theme, dateLabel, daysAway: offset };
    }
  }
  return null;
}

export function getLocalSeasonalThemeConfig(): SeasonalThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SEASONAL_THEME);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          mode: parsed.mode === 'manual' || parsed.mode === 'off' ? parsed.mode : 'auto',
          manual_theme_id:
            parsed.manual_theme_id && SEASONAL_THEMES[parsed.manual_theme_id as SeasonalThemeId]
              ? (parsed.manual_theme_id as SeasonalThemeId)
              : 'default',
          show_banner: parsed.show_banner !== false,
          show_particles: parsed.show_particles !== false,
          custom_message: typeof parsed.custom_message === 'string' ? parsed.custom_message : '',
          updated_at: parsed.updated_at,
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_SEASONAL_THEME_CONFIG;
}

export function saveLocalSeasonalThemeConfig(config: SeasonalThemeConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_SEASONAL_THEME, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}

export function getUserSeasonalMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_SEASONAL_MUTED) === 'true';
  } catch {
    return false;
  }
}

export function setUserSeasonalMuted(muted: boolean): void {
  try {
    if (muted) {
      localStorage.setItem(STORAGE_KEY_SEASONAL_MUTED, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_SEASONAL_MUTED);
    }
  } catch {
    // ignore
  }
}

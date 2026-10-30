/**
 * Utility for generating high-fidelity AI Infographic Prompts based on real academic submission data
 * Customized for Princess Chulabhorn Science High School Kalasin (โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์)
 */

export interface AreaStatPromptData {
  name: string;
  totalTeachers: number;
  submittedTeachers: number;
  submissionRate: number;
  onTimeTeachersCount?: number;
  lateTeachersCount?: number;
  onTimePlans?: number;
  latePlans?: number;
  isCompleted?: boolean;
}

export interface InfographicPromptPayload {
  schoolNameTh?: string;
  schoolNameEn?: string;
  academicYear?: string;
  selectedDocTypes: string[];
  areaStats: AreaStatPromptData[];
  totalTeachers: number;
  totalSubmittedTeachers: number;
  overallSubmissionRate: number;
  onTimeRate: number;
  lateRate: number;
  pendingTeachersCount: number;
  aspectRatio?: '4:5' | '9:16' | '16:9' | '1:1';
  style?: 'official_science' | 'minimalist' | '3d_poster';
}

/**
 * Generate an English prompt optimized for Midjourney v6, DALL-E 3, Canva Magic Media, and Gemini Imagen
 */
export function generateEnglishInfographicPrompt(data: InfographicPromptPayload): string {
  const schoolNameTh = data.schoolNameTh || 'โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์';
  const schoolNameEn = data.schoolNameEn || 'Princess Chulabhorn Science High School Kalasin';
  const ratio = data.aspectRatio || '4:5';
  const docTypeDesc = data.selectedDocTypes.includes('ทั้งหมด') || data.selectedDocTypes.length === 0
    ? 'All Academic Teaching Documents (Lesson Plans, Teaching Records, Classroom Action Research)'
    : data.selectedDocTypes.join(', ');

  const areaRankings = [...data.areaStats]
    .sort((a, b) => b.submissionRate - a.submissionRate)
    .map((stat, idx) => {
      return `${idx + 1}. ${stat.name}: ${stat.submissionRate}% submission rate (${stat.submittedTeachers}/${stat.totalTeachers} teachers submitted)`;
    })
    .join('\n');

  return `Award-winning aesthetic academic infographic poster and modern scientific data dashboard for "${schoolNameTh}" (${schoolNameEn}).

[TOP HEADER & OFFICIAL EMBLEM]:
- Top-Center Emblem: The official Royal Thai Princess Chulabhorn Science High School Kalasin crest featuring an intricate golden Phra Kiao (Thai royal tiered crown) at the top, a stylized vermilion-orange and gold Thai royal monogram "จภ" with elegant golden flame Kanok flourishes, and an arched royal navy blue ribbon banner at the bottom with gold Thai inscription "${schoolNameTh}".
- Header Typography: Large clean bold typography: "ACADEMIC DOCUMENT SUBMISSION REPORT - 8 LEARNING DEPARTMENTS"
- Sub-header: "Semester Progress & Departmental Submission Rate Comparison"
- Filtered Scope: ${docTypeDesc}

[KEY PERFORMANCE METRICS (3 Minimalist Cards)]:
- Total Teaching Staff: ${data.totalTeachers} teachers
- Overall Submission Rate: ${data.overallSubmissionRate}% (${data.totalSubmittedTeachers}/${data.totalTeachers} teachers completed)
- On-Time Submission: ${data.onTimeRate}% | Late Submissions: ${data.lateRate}% | Pending: ${data.pendingTeachersCount} teachers

[CENTRAL DATA VISUALIZATION (Comparative Bar Chart)]:
Crisp, high-contrast horizontal data bars ranking all learning departments with exact percentages and teacher ratios:
${areaRankings}

[VISUAL STYLE & ROYAL SCIENCE ACADEMY IDENTITY]:
- Theme: Prestigious Thai Science Academy identity — modern, clean, sleek, scientific, authoritative.
- Color Palette: Deep Royal Navy Blue (#0F172A, #1E3A8A) background and structural cards, radiant Royal Gold (#D97706, #F59E0B) highlights and rank badges, clean white readable typography, vibrant emerald green, sapphire blue, violet, and coral data bars.
- Background & Grid: Subtle scientific gridlines, faint molecular / geometry telemetry watermark motifs, high readability.
- CRITICAL LAYOUT RULE: NO signatures, NO signature lines, NO bureaucratic sign-off boxes, NO rubber stamps. Pristine, modern, clutter-free graphic poster layout.
- Composition: Vector 2D graphic design, perfect typographic hierarchy, high-contrast data visualization, balanced margins, 8k resolution editorial infographic --ar ${ratio}`;
}

/**
 * Generate a Thai prompt optimized for ChatGPT, Claude, and Gemini text-to-infographic pipelines
 */
export function generateThaiInfographicPrompt(data: InfographicPromptPayload): string {
  const schoolName = data.schoolNameTh || 'โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์';
  const ratio = data.aspectRatio || '4:5';
  const docTypeDesc = data.selectedDocTypes.includes('ทั้งหมด') || data.selectedDocTypes.length === 0
    ? 'เอกสารวิชาการทุกประเภท (แผนการจัดการเรียนรู้, กำหนดการสอน, บันทึกหลังสอน, วิจัยในชั้นเรียน)'
    : data.selectedDocTypes.join(', ');

  const areaRankings = [...data.areaStats]
    .sort((a, b) => b.submissionRate - a.submissionRate)
    .map((stat, idx) => {
      const medal = idx === 0 ? '🏆 อันดับ 1' : idx === 1 ? '🥈 อันดับ 2' : idx === 2 ? '🥉 อันดับ 3' : `อันดับ ${idx + 1}`;
      return `• ${medal} กลุ่มสาระการเรียนรู้${stat.name}: ส่งแล้ว ${stat.submissionRate}% (${stat.submittedTeachers}/${stat.totalTeachers} คน)`;
    })
    .join('\n');

  return `สร้างภาพโปสเตอร์อินโฟกราฟิกเชิงวิชาการ (Academic Data Infographic Poster) สวยงาม ทันสมัย คุณภาพสูง สำหรับ:
โรงเรียน-โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์

[ตราสัญลักษณ์โรงเรียน (ด้านบนตรงกลาง)]:
- ตราสัญลักษณ์ประจำโรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์: ยอดด้านบนเป็นพระเกี้ยวสีทองอร่าม ตรงกลางเป็นอักษรพระนามย่อ "จภ" ลายเส้นไทยประยุกต์สีส้มแสดขอบทอง ล้อมด้วยลายกนกเปลวเพลิงสีทอง และด้านล่างเป็นแถบริบบิ้นโบว์สีน้ำเงินเข้มขอบทองจารึกอักษรไทยสีทองชัดเจนว่า "โรงเรียนวิทยาศาสตร์จุฬาภรณราชวิทยาลัย กาฬสินธุ์"

[หัวข้อและขอบเขตเอกสาร]:
- หัวข้อหลัก: "รายงานสรุปและเปรียบเทียบอัตราการส่งเอกสารทางวิชาการ 8 กลุ่มสาระการเรียนรู้"
- ประเภทเอกสารที่ตรวจสอบ: ${docTypeDesc}

[การ์ดตัวเลขสรุปภาพรวม (Key Metrics)]:
- จำนวนครูผู้สอนทั้งหมด: ${data.totalTeachers} ท่าน
- อัตราการส่งงานภาพรวม: ${data.overallSubmissionRate}% (ส่งแล้ว ${data.totalSubmittedTeachers} จาก ${data.totalTeachers} ท่าน)
- สัดส่วนส่งตรงเวลา: ${data.onTimeRate}% | ส่งล่าช้า: ${data.lateRate}% | ยังไม่ส่ง: ${data.pendingTeachersCount} ท่าน

[กราฟแท่งเปรียบเทียบ 8 กลุ่มสาระการเรียนรู้]:
${areaRankings}

[สไตล์และความงาม]:
- สไตล์: อินโฟกราฟิกทางการ สวยงามระดับมืออาชีพ สะอาดตา ลายเส้นคมชัด โมเดิร์น
- ชุดสี: สีกรมท่า-น้ำเงินเข้ม (Royal Navy Blue) สีทองอร่าม (Royal Gold) พื้นหลังสีขาว-เทาอ่อนสะอาดตา และแท่งกราฟหลากสีสดใส
- ข้อกำหนดสำคัญ: **ไม่ต้องมีลายเซ็น ไม่ต้องมีช่องลงนาม และไม่ต้องมีตรายางใดๆ ทั้งสิ้น** ให้เป็นโปสเตอร์นำเสนอข้อมูลและสถิติล้วนๆ ที่สวยงาม สัดส่วนภาพ ${ratio}`;
}

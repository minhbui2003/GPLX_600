import type { Question } from '../types';

/**
 * Tạo đề thi thử chuẩn hạng B (áp dụng cho kỳ thi tháng 12/2026):
 * 30 câu, 20 phút, đạt >= 27/30, KHÔNG ĐƯỢC SAI CÂU ĐIỂM LIỆT.
 *
 * Cơ cấu 30 câu theo Công văn 2262/CSGT-P5:
 * - 8 câu: Quy tắc giao thông đường bộ (Chương 1, không gồm câu điểm liệt)
 * - 1 câu: Câu điểm liệt (ngẫu nhiên từ tập 60 câu điểm liệt)
 * - 1 câu: Văn hóa & đạo đức (Chương 2, không gồm câu điểm liệt)
 * - 1 câu: Kỹ thuật lái xe (Chương 3, không gồm câu điểm liệt)
 * - 1 câu: Cấu tạo & sửa chữa (Chương 4)
 * - 9 câu: Biển báo hiệu đường bộ (Chương 5)
 * - 9 câu: Sa hình & xử lý tình huống (Chương 6)
 */
export function generateExam(allQuestions: Question[]): Question[] {
  function sample(arr: Question[], n: number): Question[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  }

  // 1. Tách tập 60 câu điểm liệt
  const criticalQuestions = allQuestions.filter(q => q.isCritical);
  const nonCriticalQuestions = allQuestions.filter(q => !q.isCritical);

  // 2. Tách theo chương không có điểm liệt
  const ch1 = nonCriticalQuestions.filter(q => q.chapter === 1);
  const ch2 = nonCriticalQuestions.filter(q => q.chapter === 2);
  const ch3 = nonCriticalQuestions.filter(q => q.chapter === 3);
  const ch4 = nonCriticalQuestions.filter(q => q.chapter === 4);
  const ch5 = nonCriticalQuestions.filter(q => q.chapter === 5);
  const ch6 = nonCriticalQuestions.filter(q => q.chapter === 6);

  const selectedCritical = sample(criticalQuestions, 1);
  const selectedCh1 = sample(ch1, 8);
  const selectedCh2 = sample(ch2, 1);
  const selectedCh3 = sample(ch3, 1);
  const selectedCh4 = sample(ch4, 1);
  const selectedCh5 = sample(ch5, 9);
  const selectedCh6 = sample(ch6, 9);

  const examQuestions = [
    ...selectedCh1,
    ...selectedCritical,
    ...selectedCh2,
    ...selectedCh3,
    ...selectedCh4,
    ...selectedCh5,
    ...selectedCh6
  ];

  // Xáo trộn vị trí câu hỏi trong đề thi (Fisher-Yates)
  for (let i = examQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [examQuestions[i], examQuestions[j]] = [examQuestions[j], examQuestions[i]];
  }

  return examQuestions;
}

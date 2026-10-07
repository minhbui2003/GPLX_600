export interface QuestionTip {
  title: string;
  shortTip: string;
  explanation: string;
  ruleTag?: string;
}

export function getTipForQuestion(q: {
  id: number;
  chapter: number;
  question: string;
  isCritical: boolean;
  options: string[];
  correctAnswer: number;
}): QuestionTip {
  const text = q.question.toLowerCase();
  const correctOpt = q.options[q.correctAnswer - 1]?.toLowerCase() || '';

  // 1. Critical questions
  if (q.isCritical) {
    if (text.includes('rượu') || text.includes('bia') || text.includes('cồn') || text.includes('ma túy')) {
      return {
        title: 'Mẹo câu điểm liệt: Rượu bia & Ma túy',
        shortTip: 'Tuyệt đối bị nghiêm cấm',
        explanation: 'Pháp luật nghiêm cấm 100% người điều khiển phương tiện trong máu hoặc hơi thở có nồng độ cồn, ma túy hay chất kích thích. Cứ thấy "Bị nghiêm cấm" là chọn ngay.',
        ruleTag: 'Luật TTATGTĐB 2024'
      };
    }
    if (correctOpt.includes('bị nghiêm cấm') || correctOpt.includes('không được')) {
      return {
        title: 'Mẹo câu điểm liệt: Từ khóa cấm',
        shortTip: 'Chọn đáp án chứa "Bị nghiêm cấm" hoặc "Không được phép"',
        explanation: 'Trong các câu hỏi về hành vi đạo đức, an toàn và câu điểm liệt, phương án bắt đầu bằng "Bị nghiêm cấm" hoặc "Không được..." luôn là đáp án đúng.',
        ruleTag: 'Từ khóa cấm'
      };
    }
    return {
      title: 'Mẹo câu điểm liệt',
      shortTip: 'Ưu tiên phương án an toàn nhất',
      explanation: 'Đây là câu hỏi điểm liệt! Luôn chọn phương án giảm tốc độ, dừng lại quan sát, nhường đường hoặc giữ khoảng cách an toàn.',
      ruleTag: 'Điểm liệt'
    };
  }

  // 2. Speed and distance
  if (text.includes('tốc độ') || text.includes('khoảng cách')) {
    if (text.includes('trong khu đông dân cư')) {
      return {
        title: 'Mẹo tốc độ trong khu đông dân cư',
        shortTip: 'Có dải phân cách: 60 km/h | Không có dải phân cách: 50 km/h',
        explanation: 'Đường đôi (có dải phân cách giữa): Tối đa 60 km/h. Đường 2 chiều hoặc 1 chiều 1 làn (không có dải phân cách): Tối đa 50 km/h.',
        ruleTag: 'Thông tư 38/2024'
      };
    }
    if (text.includes('ngoài khu đông dân cư')) {
      return {
        title: 'Mẹo tốc độ ngoài khu đông dân cư',
        shortTip: 'Nhớ từ khóa đuôi: "xi-téc" hoặc "bê tông"',
        explanation: 'Nếu câu hỏi có đáp án chứa từ "xi-téc" hoặc "bê tông" ở cuối thì chọn phương án đó. Nếu không có thì chọn đáp án bắt đầu bằng "Ô tô con".',
        ruleTag: 'Mẹo tốc độ'
      };
    }
    if (text.includes('khoảng cách an toàn')) {
      return {
        title: 'Mẹo cự ly khoảng cách an toàn',
        shortTip: 'Lấy vận tốc lớn nhất trừ 30m',
        explanation: 'Vận tốc 60 km/h: 35m; 60-80 km/h: 55m (80-30=50 ~ 55); 80-100 km/h: 70m (100-30=70); 100-120 km/h: 100m.',
        ruleTag: 'Quy tắc cự ly'
      };
    }
  }

  // 3. Ages and vehicle terms
  if (text.includes('tuổi')) {
    return {
      title: 'Mẹo độ tuổi lái xe',
      shortTip: '16 tuổi: xe < 50cc | 18 tuổi: B1, B, B2 | Mỗi hạng tăng 3 tuổi',
      explanation: 'Đủ 16 tuổi: xe máy dưới 50cc. Đủ 18 tuổi: xe máy A1, mô tô và ô tô hạng B (B1, B2). Hạng C: 21 tuổi. Hạng D: 24 tuổi. Hạng E: 27 tuổi. Tuổi tối đa hạng E nam 55, nữ 50.',
      ruleTag: 'Độ tuổi'
    };
  }

  if (text.includes('niên hạn')) {
    return {
      title: 'Mẹo niên hạn sử dụng xe',
      shortTip: 'Tải 25 năm - Khách 20 năm',
      explanation: 'Xe ô tô tải: Niên hạn sử dụng tối đa là 25 năm. Xe ô tô chở người trên 9 chỗ: Niên hạn tối đa là 20 năm.',
      ruleTag: 'Niên hạn'
    };
  }

  // 4. Chapter 3: Manual Transmission & Technique
  if (q.chapter === 3) {
    if (text.includes('dốc') || text.includes('xuống dốc')) {
      return {
        title: 'Mẹo số sàn: Xuống dốc cao',
        shortTip: 'Về số thấp (số 1 hoặc số 2), tuyệt đối không về số 0 hay tắt máy',
        explanation: 'Khi xuống dốc cao bằng xe số sàn, luôn phải về số thấp để dùng lực cản của động cơ hãm tốc độ, kết hợp phanh chân. Nghiêm cấm về số Mo (N) hoặc tắt khóa điện.',
        ruleTag: 'Kỹ thuật số sàn'
      };
    }
    if (text.includes('côn') || text.includes('ly hợp')) {
      return {
        title: 'Mẹo số sàn: Sử dụng bàn đạp côn',
        shortTip: 'Đạp côn dứt khoát hết hành trình, nhả côn từ từ',
        explanation: 'Khi sang số xe số sàn: đạp côn dứt khoát sát sàn để ngắt hoàn toàn lực truyền, sau đó nhả côn theo nguyên tắc "1/3 đầu nhanh, 1/3 giữa dừng nhẹ, 1/3 cuối nhả hết".',
        ruleTag: 'Kỹ thuật số sàn'
      };
    }
    if (text.includes('phanh') || text.includes('abs')) {
      return {
        title: 'Mẹo hệ thống phanh',
        shortTip: 'Phanh ABS chống bó cứng bánh xe, giữ vững lái',
        explanation: 'Hệ thống phanh ABS giúp bánh xe không bị khóa cứng khi phanh khẩn cấp, duy trì độ bám đường và khả năng đánh lái tránh chướng ngại vật.',
        ruleTag: 'Cấu tạo & Phanh'
      };
    }
  }

  // 5. Chapter 5: Traffic Signs
  if (q.chapter === 5) {
    if (text.includes('cấm')) {
      return {
        title: 'Mẹo biển cấm',
        shortTip: 'Cấm nhỏ thì cấm lớn, cấm lớn không cấm nhỏ',
        explanation: 'Thứ tự từ nhỏ đến lớn: Ô tô con < Xe khách < Xe tải < Máy kéo < Rơ-moóc. Cấm xe con là cấm tất cả loại sau. Nhưng cấm xe tải thì xe con và xe khách vẫn được đi bình thường.',
        ruleTag: 'Biển báo'
      };
    }
    if (text.includes('quay đầu') || text.includes('rẽ trái')) {
      return {
        title: 'Mẹo rẽ trái & quay đầu',
        shortTip: 'Cấm rẽ trái KHÔNG cấm quay đầu (trừ khi có biển cấm riêng)',
        explanation: 'Theo Quy chuẩn QCVN 41 hiện hành: Biển cấm rẽ trái không có giá trị cấm quay đầu xe (xe vẫn được phép quay đầu). Biển cấm quay đầu thì vẫn được rẽ trái bình thường.',
        ruleTag: 'QCVN 41'
      };
    }
    return {
      title: 'Mẹo nhận diện biển báo',
      shortTip: 'Tròn đỏ: Cấm | Tam giác vàng: Nguy hiểm | Tròn xanh: Hiệu lệnh | Vuông xanh: Chỉ dẫn',
      explanation: 'Biển tròn viền đỏ nền trắng: cấm; Tam giác viền đỏ nền vàng: cảnh báo nguy hiểm; Tròn nền xanh: hiệu lệnh bắt buộc thi hành; Chữ nhật hoặc vuông nền xanh: hướng dẫn thông tin.',
      ruleTag: 'Biển báo'
    };
  }

  // 6. Chapter 6: Situations & Sa hinh
  if (q.chapter === 6) {
    return {
      title: 'Mẹo giải Sa hình: 5 Bước thần tốc',
      shortTip: '1. Chớm -> 2. Ưu -> 3. Đường -> 4. Phải trống -> 5. Hướng rẽ',
      explanation: 'Bước 1: Xe đã vào giao lộ đi trước. Bước 2: Xe ưu tiên (Hỏa - Quân - Công - Thương). Bước 3: Xe trên đường ưu tiên (biển hình thoi / tam giác thuận). Bước 4: Bên phải không vướng đi trước. Bước 5: Rẽ phải -> Đi thẳng -> Rẽ trái.',
      ruleTag: '5 Bước Sa hình'
    };
  }

  // Default fallback tip
  return {
    title: 'Gợi ý cốt lõi',
    shortTip: 'Chọn đáp án văn minh, đầy đủ và an toàn nhất',
    explanation: 'Khi phân vân giữa các phương án, hãy chọn phương án thể hiện văn hóa nhường đường, tuân thủ biển báo hiệu và quan sát kỹ lưỡng trước khi thao tác.',
    ruleTag: 'Quy tắc vàng'
  };
}

export const HANDBOOK_TIPS = [
  {
    category: 'Mẹo 5 Bước giải mọi bài Sa hình',
    color: '#3b82f6',
    items: [
      {
        rule: 'Bước 1: Nhất chớm',
        detail: 'Xe nào đã tiến vào trong giao lộ (vượt qua vạch người đi bộ) thì được quyền đi trước tất cả các xe khác.'
      },
      {
        rule: 'Bước 2: Nhị ưu',
        detail: 'Thứ tự ưu tiên xe công vụ: Hỏa (Cứu hỏa) ➔ Quân (Quân sự) ➔ Công (Công an) ➔ Thương (Cứu thương).'
      },
      {
        rule: 'Bước 3: Tam đường',
        detail: 'Xe nào ở trên đường ưu tiên (nhận biết qua biển hình thoi vàng hoặc biển tam giác viền đỏ mũi tên) được đi trước xe ở đường không ưu tiên (biển tam giác lộn ngược đỉnh chỉ xuống).'
      },
      {
        rule: 'Bước 4: Tứ hướng (Phải không vướng)',
        detail: 'Tại ngã tư đường cùng cấp, ngã ba không có biển: xe nào có phía tay phải trống không có xe thì được đi trước.'
      },
      {
        rule: 'Bước 5: Ngũ rẽ',
        detail: 'Thứ tự ưu tiên theo hướng đi: Xe Rẽ Phải ➔ Đi Thẳng ➔ Xe Rẽ Trái.'
      }
    ]
  },
  {
    category: 'Mẹo Nhớ biển báo cấm',
    color: '#ef4444',
    items: [
      {
        rule: 'Cấm nhỏ thì cấm lớn, cấm lớn không cấm nhỏ',
        detail: 'Cỡ xe: Con (nhỏ nhất) ➔ Khách ➔ Tải ➔ Máy kéo ➔ Kéo rơ-moóc (lớn nhất). Cấm ô tô con là cấm sạch các xe sau. Nhưng cấm xe tải thì ô tô con và xe khách VẪN ĐƯỢC ĐI.'
      },
      {
        rule: 'Cấm rẽ trái & Quay đầu',
        detail: 'Theo chuẩn mới QCVN 41: Cấm rẽ trái vẫn ĐƯỢC quay đầu xe. Biển cấm quay đầu xe vẫn ĐƯỢC rẽ trái.'
      },
      {
        rule: 'Biển Cấm dừng và Cấm đỗ',
        detail: '1 vạch chéo đỏ: Cấm đỗ xe (vẫn được dừng trả khách chốc lát). 2 vạch chéo đỏ (dấu X): Cấm cả dừng xe và đỗ xe.'
      }
    ]
  },
  {
    category: 'Mẹo Kỹ thuật lái xe số sàn (Hạng B)',
    color: '#10b981',
    items: [
      {
        rule: 'Thao tác côn - số - ga',
        detail: 'Côn ra ga vào; đạp côn phải dứt khoát sát sàn, nhả côn từ từ để không bị giật hoặc chết máy.'
      },
      {
        rule: 'Khởi hành ngang dốc (Đề-pa lên dốc)',
        detail: 'Sử dụng phanh tay (phanh đỗ) để giữ xe không trôi về sau. Nhả côn đến khi rung đầu xe (điểm tiếp xúc côn), giữ nguyên chân côn, đạp nhẹ ga rồi hạ phanh tay từ từ để xe bò lên dốc.'
      },
      {
        rule: 'Xuống dốc cao, dốc dài',
        detail: 'Phải về số thấp (số 1 hoặc số 2), dùng phanh động cơ kết hợp phanh chân ngắt quãng. TUYỆT ĐỐI không về số Mo (N), không đạp hết côn và không tắt khóa điện.'
      }
    ]
  },
  {
    category: 'Mẹo Con số & Niên hạn & Tuổi',
    color: '#f59e0b',
    items: [
      {
        rule: 'Tuổi lái xe',
        detail: '16 tuổi: xe máy dưới 50cc. 18 tuổi: bằng lái xe máy A1, mô tô và ô tô hạng B. Hạng C: 21 tuổi. Mỗi hạng cách nhau 3 tuổi.'
      },
      {
        rule: 'Niên hạn ô tô',
        detail: 'Ô tô tải: tối đa 25 năm. Ô tô chở người trên 9 chỗ ngồi: tối đa 20 năm. Ô tô con không kinh doanh: không giới hạn niên hạn.'
      },
      {
        rule: 'Cự ly khoảng cách an toàn',
        detail: 'Lấy vận tốc lớn nhất trừ khoảng 25-30m: 60km/h ➔ 35m; 80km/h ➔ 55m; 100km/h ➔ 70m; 120km/h ➔ 100m.'
      }
    ]
  }
];

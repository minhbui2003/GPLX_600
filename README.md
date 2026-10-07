# 600 Câu Lý Thuyết Ô Tô

Ứng dụng ôn trọn bộ 600 câu lý thuyết ô tô, luyện câu điểm liệt, ôn câu sai theo lịch và thi thử 30 câu.

## Chạy trên máy

Yêu cầu Node.js 20 trở lên.

```bash
npm install
npm run dev
```

Kiểm tra bản production:

```bash
npm run build
npm run preview
```

## Deploy lên Vercel

1. Push repository lên GitHub.
2. Trong Vercel, chọn **Add New → Project** và import repository.
3. Vercel sẽ tự nhận diện Vite. Không cần khai báo biến môi trường.
4. Nhấn **Deploy**.

Thiết lập đã được cố định trong `vercel.json`:

- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite

Tiến độ học được lưu trong `localStorage` của từng trình duyệt, không cần database.

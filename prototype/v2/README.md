# Mock nâng cấp UI — v2 (chờ duyệt)

Bản đề xuất cho đợt nâng cấp sau Phase 6. **Chưa phải sản phẩm, chưa có dòng nào
trong `app/` thay đổi.** Mở `index.html` để duyệt từng màn.

```
cd prototype && python serve.py 4320      # rồi mở http://127.0.0.1:4320/v2/
```

Mở thẳng `index.html` bằng trình duyệt cũng được (font, ảnh, icon đều nằm trong
thư mục này).

| Thứ | Ở đâu |
|---|---|
| Bảng duyệt (khung 390 + 1280, nút Duyệt/Sửa/Bỏ, sao chép kết quả) | `index.html` |
| CSS hệ — chép nguyên từ `app/styles/` ngày 20/09/2026 | `sys/` |
| Phần đề xuất mới | `v2.css`, `v2.js` |
| Token dạng CSS thường (bản sao của `@theme` trong `globals.css`) | `tokens.css` |
| Font tự chứa (từ `.next/static/media`) | `fonts/`, `fonts.css` |
| Icon Iconsax (snapshot `components/icon/paths.ts`) | `icons.js` |
| Ảnh mượn tạm, tải qua `/_next/image` | `img/` |
| Ảnh chụp bản ĐANG CHẠY để so | `before/` |

Đồng hồ trong mock đóng băng ở **18:50 · 20/09/2026** và chạy tiếp từ lúc mở
trang; mọi con số suy từ fixture (`data/`, `lib/`) qua vitest, không gõ tay.

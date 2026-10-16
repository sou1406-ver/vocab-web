# VocaNetwork — 600 Essential Words for the TOEIC

Web học từ vựng theo **chủ đề** và **trường từ** (tiền tố + gốc + hậu tố, biến đổi từ loại, đồng nghĩa / trái nghĩa),
dữ liệu lấy từ sách _600 Essential Words for the TOEIC Test_.

## Chạy

Mở `index.html` bằng trình duyệt là xong — không cần cài đặt.
(Font chữ tải từ Google Fonts; không có mạng thì dùng font hệ thống, mọi chức năng vẫn chạy.)

## Chức năng

| Tab              | Nội dung                                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tổng quan        | Trang chính theo hồ sơ: mục tiêu hôm nay, chuỗi ngày học, lộ trình theo điểm TOEIC mục tiêu, lịch hoạt động 12 tuần, tiến độ 10 phần, từ hay làm sai, bài tập gần đây                                                        |
| Chủ đề           | Mục lục 10 phần × 5 bài theo sách, tiến độ từng bài, ô “Học tiếp” gợi ý bài đang học dở                                                                                                                                      |
| Trường từ        | Sơ đồ mỗi từ: phiên âm IPA, cấu tạo tiền tố/gốc/hậu tố, họ từ theo 4 từ loại (kèm câu ví dụ _Word Families_ trong sách), đồng nghĩa / trái nghĩa. Lọc theo trạng thái, từ loại, phụ tố; sắp xếp                              |
| Flashcard 3D     | Lật thẻ, tự đánh giá Chưa nhớ / Đang học / Đã thuộc (phím `Space`, `1` `2` `3`, `←` `→`)                                                                                                                                     |
| Bài tập          | **Bài tập trong sách**: Words in Context (50 đoạn), Part 5 (300 câu), Part 6 (50 đoạn), Word Review (10 bài × 19 câu) — chấm điểm, giải thích, lưu điểm cao nhất. **Tự luyện**: biến đổi từ loại, đồng nghĩa, nghĩa, ghép từ |
| Tiền tố · Hậu tố | 92 phụ tố, bấm vào để xem mọi từ dùng phụ tố đó                                                                                                                                                                              |

Ô tìm kiếm trên thanh tiêu đề (phím `/`) tìm được từ gốc, họ từ, đồng nghĩa và nghĩa tiếng Việt (gõ không dấu cũng được).
**Hồ sơ học tập** (nút avatar góc phải): mỗi người một hồ sơ với tên, mục tiêu điểm TOEIC (450 / 600 / 750 / 900+) và số câu mỗi ngày;
tiến độ, điểm bài tập, từ tự thêm được tách riêng theo hồ sơ. Menu hồ sơ có: chuyển / thêm / sửa hồ sơ, giao diện Sáng / Tối / Theo máy,
_Từ của tôi & sao lưu_ (thêm trường từ riêng, xuất / nhập JSON).

Hồ sơ lưu trong trình duyệt (localStorage), chưa có máy chủ — dùng **Xuất JSON** để chuyển sang máy khác.
Có thể bật **đăng nhập Google** để đồng bộ đám mây — xem mục bên dưới.

## Đăng nhập Google (tuỳ chọn)

Mặc định web dùng hồ sơ lưu trên trình duyệt. Bật đăng nhập Google để **lưu tiến độ lên đám mây và học tiếp trên mọi thiết bị**
(dữ liệu từ nhiều máy được gộp lại, không ghi đè mất tiến độ). Cần một dự án Firebase miễn phí:

1. Vào <https://console.firebase.google.com> → **Add project** (tắt Google Analytics cũng được).
2. **Project settings → General → Your apps → biểu tượng `</>` (Web)** → đặt tên → **Register app** →
   chép đối tượng `firebaseConfig` và dán vào `js/firebase-config.js` (thay cho `null`).
3. **Authentication → Get started → Sign-in method → Google → Enable**.
   **Authentication → Settings → Authorized domains** → thêm `sou1406-ver.github.io` (`localhost` có sẵn).
4. **Firestore Database → Create database** (production mode) → tab **Rules** → dán rồi **Publish**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

5. Đăng nhập Google **không chạy khi mở file trực tiếp** (`file://`). Mở qua GitHub Pages, hoặc chạy máy chủ cục bộ:

   ```
   python -m http.server 8000
   ```

   rồi vào <http://localhost:8000>.

Các khoá trong `firebase-config.js` là khoá công khai phía trình duyệt — an toàn khi đưa lên GitHub; bảo mật nằm ở Rules (mỗi người chỉ đọc/ghi được dữ liệu của chính mình).
Đăng xuất sẽ xoá bản lưu tạm của tài khoản trên máy (an toàn cho máy dùng chung); dữ liệu vẫn còn trên tài khoản Google.

## Cấu trúc dữ liệu

```
data/source/book.json                 ← 600 từ, định nghĩa, ví dụ (OCR từ PDF)
data/source/families.json             ← bảng WORD FAMILIES của từng bài (OCR)
data/source/ipa.json                  ← phiên âm IPA (tools/make_ipa.py, từ CMU Pronouncing Dictionary)
data/source/exercises.json            ← bài tập trong sách (tools/parse_exercises.py)
data/source/exercises_overrides.json  ← sửa tay chỗ OCR sai (đã đối chiếu ảnh trang) + bảng sửa chính tả
data/enrich/*.txt                     ← nghĩa tiếng Việt, đồng nghĩa, trái nghĩa, cấu tạo từ (sửa ở đây)
tools/build_data.py                   ← ghép tất cả thành js/data.js và js/exercises.js
```

Sửa / bổ sung từ: chỉnh file trong `data/enrich/` rồi chạy `python tools/build_data.py`.

Định dạng `data/enrich/*.txt`:

```
# 1                                   ← số bài
agreement | sự thoả thuận | contract, deal | disagreement      ← từ gốc | nghĩa | đồng nghĩa | trái nghĩa
  agree | v | agree | đồng ý                                    ← (thụt 2 dấu cách) từ | từ loại | cấu tạo | nghĩa | ghi chú
  disagreement | n | dis-+agree+-ment | sự bất đồng
```

Tiền tố viết `un-`, hậu tố viết `-ment`; phụ tố mới cần khai báo trong `AFFIXES` ở `tools/build_data.py`.
Từ mới cần phiên âm: chạy `python tools/make_ipa.py` (lần đầu tải CMU dict) rồi build lại.

## Cách trích bài tập từ sách (PDF scan)

1. Render trang PDF thành ảnh 200 dpi, OCR bằng Windows OCR có toạ độ từng chữ (`tools/ocr.ps1`).
2. `tools/parse_exercises.py` dựng lại hàng chữ theo toạ độ, tách 2 cột, **dò đường gạch dưới trên ảnh** để biết vị trí chỗ trống,
   tự bù chữ OCR bỏ sót ở cuối dòng (cắt dòng, phóng to, OCR lại) và đọc đáp án ở Answer Key.
3. Những chỗ OCR thiếu phương án / đáp án được sửa tay trong `exercises_overrides.json`.

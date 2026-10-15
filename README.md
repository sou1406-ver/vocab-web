# VocaNetwork — 600 Essential Words for the TOEIC

Web học từ vựng theo **chủ đề** và **trường từ** (tiền tố + gốc + hậu tố, biến đổi từ loại, đồng nghĩa / trái nghĩa),
dữ liệu lấy từ sách *600 Essential Words for the TOEIC Test*.

## Chạy

Mở `index.html` bằng trình duyệt là xong — không cần cài đặt.
(Font chữ tải từ Google Fonts; không có mạng thì dùng font hệ thống, mọi chức năng vẫn chạy.)

## Chức năng

| Tab | Nội dung |
|---|---|
| Chủ đề | 10 chủ đề × 5 bài theo sách, tiến độ từng bài |
| Mạng lưới Trường từ | Sơ đồ mỗi từ: công thức ghép phụ tố, 4 cột từ loại (kèm câu ví dụ trong mục *Word Families* của sách), đồng nghĩa / trái nghĩa |
| Flashcard 3D | Lật thẻ, tự đánh giá Chưa nhớ / Đang học / Đã thuộc (phím `Space`, `1` `2` `3`, `←` `→`) |
| Bài tập | Biến đổi từ loại (câu gốc trong sách), đồng nghĩa – trái nghĩa, nghĩa của từ, ghép từ, tổng hợp |
| Tiền tố · Hậu tố | Bảng phụ tố, bấm vào để xem mọi từ dùng phụ tố đó |
| Tự thêm | Thêm trường từ riêng, xuất / nhập JSON để sao lưu |

Tiến độ học lưu trong trình duyệt (localStorage) — dùng **Xuất JSON** để sao lưu hoặc chuyển máy.

## Cấu trúc dữ liệu

```
data/source/book.json       ← 600 từ, định nghĩa, ví dụ (OCR từ PDF)
data/source/families.json   ← bảng WORD FAMILIES của từng bài (OCR)
data/enrich/*.txt           ← nghĩa tiếng Việt, đồng nghĩa, trái nghĩa, cấu tạo từ (sửa ở đây)
tools/build_data.py         ← ghép tất cả thành js/data.js
```

Sửa / bổ sung từ: chỉnh file trong `data/enrich/` rồi chạy

```
python tools/build_data.py
```

Định dạng `data/enrich/*.txt`:

```
# 1                                   ← số bài
agreement | sự thoả thuận | contract, deal | disagreement      ← từ gốc | nghĩa | đồng nghĩa | trái nghĩa
  agree | v | agree | đồng ý                                    ← (thụt 2 dấu cách) từ | từ loại | cấu tạo | nghĩa | ghi chú
  disagreement | n | dis-+agree+-ment | sự bất đồng
```

Tiền tố viết `un-`, hậu tố viết `-ment`; phụ tố mới cần khai báo trong `AFFIXES` ở `tools/build_data.py`.

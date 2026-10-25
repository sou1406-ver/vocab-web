# Luồng và bố cục V2

> Bố cục dưới đây là baseline trước khi thêm Kiến thức. Bản Next.js bổ sung điều hướng Kiến thức; trên mobile giữ Hôm nay/Bài học/Thư viện/Kiến thức, còn Tiến độ có trên sidebar hoặc liên kết cuối trang. Xem [NEXT-M0](NEXT-M0.md) để biết phạm vi đã chạy.

## Luồng đọc ở M0

Kiến thức → bài đọc công khai → bấm từ/cụm đã gắn ID → dialog nghĩa và nút lưu → đóng trả focus tại từ vừa tra → Xem từ đã lưu → học → kết quả → Quay lại bài đang đọc. Vị trí đọc được lưu theo tab/phiên bản bài; câu trả lời và link trở về theo snapshot lượt. Lưu từ không tạo tiến độ; nếu có lượt chưa xong thì tiếp tục lượt đó trước. Khi IndexedDB lỗi vẫn đọc/tra được, nút lưu báo chưa sẵn sàng.

## Bố cục desktop

```text
Điều hướng       Thanh ngày học / trạng thái lưu / hồ sơ
                 H1 và lời dẫn ngắn
Hôm nay          Việc tiếp theo và một nút chính
Bài học          Từ mới hôm nay | Đến hạn | Đã học
Thư viện         Bài đang học                Mục tiêu ngày
Tiến độ          Từ tiếp theo trong hành trình
Cài đặt
```

## Bố cục mobile

```text
Thanh trạng thái và hồ sơ
H1 / lời dẫn
Việc tiếp theo + nút bắt đầu
Các số đếm
Bài đang học
Mục tiêu ngày
Điều hướng dưới, có khoảng chừa safe area
```

Ẩn hình thẻ trang trí khi màn hẹp để giữ độ rộng nội dung. Màn học có tạm dừng, câu hiện tại, phản hồi và kết thúc sớm; không có điều hướng dưới gây phân tâm.

## Luồng chính

1. Hôm nay → Bắt đầu → từ mới → thử nhớ → phản hồi → từ tiếp → kết quả.
2. Đang học → tạm dừng → Hôm nay → tiếp tục cùng lượt/câu.
3. Câu hỏi → xem lại từ → dialog → Escape/đóng → đúng câu, đã ghi nhận xem gợi ý.
4. Bài học → chi tiết bài → từ chưa kiểm tra → lượt tối đa 5 từ.
5. Cài đặt → chọn file → preview số đếm/cảnh báo → nhập → kiểm tra thư viện/tiến độ.

## Trạng thái

- Loading: chỉ báo đang mở; không cho ghi khi dữ liệu chưa đọc được.
- Trống: nói rõ chưa học/chưa có từ riêng/không tìm thấy và hành động phù hợp.
- Lỗi lưu: hiện thông báo, không báo thành công và không bỏ dữ liệu đang có.
- Mất mạng: báo vẫn lưu máy; không tuyên bố đã đồng bộ.
- Nội dung thay version: giữ câu đã trả lời, yêu cầu kết thúc lượt cũ trước khi dùng nội dung mới.

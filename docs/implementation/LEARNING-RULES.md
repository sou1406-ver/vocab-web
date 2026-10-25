# Chính sách học local — phiên bản 1

## Lượt học

- Bắt đầu chốt danh sách từ/câu, nội dung có version; không thay do bộ lọc bên ngoài.
- Mỗi từ mới được giới thiệu rồi trả lời một câu. Chỉ khi thực sự đến từ đó mới tạo tiến độ.
- Mục tiêu ngày là gợi ý, không chặn lượt bổ sung.
- Kết quả trong lượt khác bài kiểm tra qua bài. Mốc này chưa có khái niệm đỗ bài.
- Gần đúng chưa bật. Chấm sau khi chuẩn hoá chữ hoa/thường và khoảng trắng; người học được biết đáp án chuẩn.
- Cloze chỉ sinh khi cụm chính xác có trong ví dụ. Không tự suy biến thể hình thái từ.

## Lịch ôn

Ngày theo Asia/Ho_Chi_Minh mặc định; lưu timestamp UTC. Không dùng timezone của hệ điều hành để quyết định lịch.

| Thao tác                               | Kết quả                                            |
| -------------------------------------- | -------------------------------------------------- |
| Xem từ mới                             | Đang học, chưa có lịch ôn                          |
| Kiểm tra lần đầu trong lượt học        | Bậc 1, ôn ngày sau, giữ đúng/sai thực tế           |
| Ôn chính đúng khi đến hạn              | Tăng một bậc, mốc 1/3/7/14/30/60 ngày              |
| Ôn chính sai hoặc xem gợi ý            | Bậc 1, ngày sau                                    |
| Ôn lại cùng ngày sau lượt đủ điều kiện | Không tăng/giảm tiếp lịch; chỉ thống kê luyện thêm |
| Luyện thêm                             | Không đổi lịch; không tạo tiến độ cho từ chưa học  |
| Tra từ rồi trả lời trong câu hiện tại  | Đánh dấu có trợ giúp, không tính tự nhớ đúng       |
| Đến bậc 5 trở lên                      | Nhãn nhớ ổn định, vẫn có lịch ôn                   |

Một lượt chính có một câu/từ. Khi bổ sung nhiều câu/từ trong tương lai phải tổng hợp thành một kết quả/từ trước khi cập nhật lịch.

## Lưu và nhiều tab

IndexedDB có database `vocab-learn-v2`, bản lưu `guest`. Transaction đọc-sửa-ghi nguyên snapshot. Câu trả lời có ID `sessionId:index`, chống gửi lại. Hành động mang sessionId/index đã nhìn thấy; từ chối nếu tab khác đã đổi vị trí. BroadcastChannel thông báo revision mới.

## Ví dụ

- 24/10 học một từ rồi làm đúng: bậc 1, đến hạn 00:00 ngày 25/10 giờ Việt Nam.
- 25/10 ôn đúng: bậc 2, đến hạn sau 3 ngày. Luyện thêm ngay rồi sai không thay đổi lịch đã chốt của ngày đó.
- Reload sau trả lời: vẫn thấy feedback; không tạo thêm event.
- Còn 43 từ đến hạn: thấy 43, lượt đầu tối đa 20; không giấu 23 từ còn lại.

## Trước khi làm cloud

Phải chốt chính sách sự kiện offline, hai thiết bị cùng ôn một từ, thứ tự sự kiện, reset/xoá và đổi timezone. Bản local chưa tuyên bố hỗ trợ merge nhiều thiết bị.

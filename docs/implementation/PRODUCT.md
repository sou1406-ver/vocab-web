# Vocab Learn V2 — đặc tả bản đầu

> Đây là brief nền của mốc local Vite, giữ làm tham chiếu cho lõi học. Kế hoạch sản phẩm hiện tại là [BUILD-FROM-SCRATCH](../BUILD-FROM-SCRATCH.md); luồng kiến thức/tra/lưu và trạng thái Next.js hiện có ở [NEXT-M0](NEXT-M0.md).

## Mục tiêu

Người Việt học 600 từ TOEIC trong các lượt ngắn, biết rõ việc tiếp theo và giữ được kết quả khi quay lại. Bốn mục chính: Hôm nay, Bài học, Thư viện, Tiến độ. Cài đặt/sao lưu nằm trong hồ sơ.

## Phạm vi đang triển khai

- 600 từ, 50 bài, nội dung thật chuyển sang schema riêng có ID ổn định.
- Một lượt học mới gồm giới thiệu từ rồi kiểm tra ngay, thường 5 từ.
- Ôn đến hạn theo lượt tối đa 20 từ; tổng tồn vẫn nhìn thấy.
- Chọn nghĩa, điền câu và gõ lại từ; tra cứu, ví dụ và họ từ cơ bản.
- Lưu local sau mỗi thao tác học, tiếp tục, thống kê, nhập/xuất có xem trước.
- Giao diện sáng/tối, mobile/desktop, bàn phím và phản hồi lỗi.

## Phân biệt hai loại kiểm tra

1. **Kiểm tra trong lượt học/ôn:** xác định từ cần củng cố, cập nhật lịch theo điều kiện. Điểm số chỉ phản ánh lượt đó.
2. **Kiểm tra qua bài:** một bài đánh giá riêng, có đề và điều kiện đạt riêng; chưa có trong mốc local đầu tiên. Không đánh dấu qua bài từ điểm quiz học từ.

## Chưa có trong mốc local

Auth/cloud sync, cấu hình Firebase staging thật, kiểm tra qua bài, bài sách nâng cao và đồ thị từ. Chỉ phát hành thay bản cũ sau khi sync và migration được kiểm tra đầy đủ.

## Tiêu chí nghiệm thu mốc local

- Hôm nay bắt đầu học trong hai thao tác.
- Học một bài thật, trả lời, reload giữa feedback, tiếp tục và xem kết quả.
- Retry/click lặp không nhân đôi kết quả; lượt luyện lại không tăng bậc lịch ôn.
- Tra từ khi đang trả lời được đánh dấu đã xem gợi ý, không tính như tự nhớ độc lập.
- Vùng lưu mới không đọc/ghi khoá hồ sơ hay Firestore cũ.
- Import legacy giữ nguồn gốc và mục chưa ánh xạ; khôi phục V2 giữ bản trước khôi phục.
- Typecheck, lint, build, test logic và các E2E trọng yếu đạt.

# Bước 3 — chọn nghĩa / chọn từ

Data V1 hiện có. Giữ Meaning (Anh → nghĩa Việt), thêm word-choice (nghĩa Việt → từ Anh); kind riêng để giữ hướng hỏi trong event. Không đổi session cũ hay lịch ôn. Màn luyện tại mỗi bài dùng tối đa sáu từ, hai hướng cho mỗi từ, chạy practice. Nếu thiếu distractor thì báo không đủ dữ liệu, không đưa câu chỉ có một đáp án.

- [x] RED unit hai hướng/đáp án duy nhất/deterministic; loại từ trùng, nghĩa chồng, synonym hoặc family đã biết; giữ practice không tạo tiến độ mới.
- [x] Union/validator/generator recognition và startExercises nhận câu practice chung.
- [x] UI nút luyện, heading/ngôn ngữ đúng, feedback/retry giữ hướng; không thêm ô nhập cho câu chọn.
- [x] E2E hai hướng/reload/feedback/retry, checks và screenshot.

Danh sách distractor từ catalog có kiểm tra cấu trúc và loại các quan hệ đã biết; đây không phải bảo đảm ngữ nghĩa tuyệt đối cho mọi nghĩa đa nghĩa của bộ dữ liệu tạm. Không thay câu biên soạn Cloze bằng distractor tự sinh.

Nhóm sáu từ luân phiên theo các lượt đã kết thúc của bài để không bỏ sót nửa sau. Test mobile đã RED khi server còn bản chỉ lấy sáu từ đầu, rồi GREEN với batch luân phiên. Retry giữ hướng và returnTo. Kiểm tra hai hướng trên toàn bộ 600 từ được 1200 câu cấu trúc hợp lệ.

Kết quả cuối: build, lint/typecheck/format, 39 unit tests và 36 E2E production desktop/mobile đều qua. Bộ skill giữ local, bỏ tracking trong commit v2 của đợt này.

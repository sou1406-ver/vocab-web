# Bước 2 — Cloze chọn đáp án

Tiếp tục thứ tự đã chốt, data tạm từ V1. Dùng câu Part 5 có options/answer biên soạn sẵn trong `data/generated/exercises.json`; không tự sinh distractor. Chỉ nhận câu có đáp án liên kết duy nhất với một từ chính/family trong đúng bài: hiện 223/300 câu; 76 câu không tự suy diễn biến thể và một câu không đạt kiểm tra lựa chọn. Báo cáo rõ câu bị bỏ qua.

Tách 50 gói theo bài, manifest nhỏ, hash nội dung riêng. Chỉ fetch khi người dùng bấm Luyện điền chỗ trống ở trang bài. Gói lỗi phải báo và cho thử lại; không tạo session rỗng. Không import toàn bộ exercises vào bundle giao diện.

Kind mới `cloze-choice` riêng với cloze nhập chữ cũ; sourceId ổn định từ số bài/số câu, sourceVersion theo gói. Session chạy practice, ghi event/source nhưng không tăng bậc hoặc tạo tiến độ mới. Không đổi fingerprint catalog hay rewrite session cũ. Mở lại session cũ không cần tải gói vì câu đã nằm trong session. Chưa migrate hai skill.

- [x] RED unit: bộ chuyển đổi giữ options đúng, bỏ liên kết mơ hồ/không có và báo cáo; validator không nhận gói/câu lỗi.
- [x] GREEN pipeline gói + manifest và loader theo bài.
- [x] RED/GREEN domain: bắt đầu practice câu biên soạn, event có source, không đổi lịch ôn hoặc tính trùng; đọc session/backup cũ.
- [x] UI: nút luyện ở bài, loading/error/retry, resume session; câu khuyết/4 lựa chọn/feedback đúng ngôn ngữ, keyboard/focus.
- [x] E2E reload/nhiều tab/nguồn lỗi; full checks và screenshot. Dùng checkout v2 hiện tại; giữ thay đổi local cho review.

Lưu ý tương thích: kind mới được code mới đọc/validate. Tab chạy code cũ có thể không hiểu kind này; không tuyên bố hỗ trợ downgrade về bản cũ cho session mới.

Bổ sung theo review: tách CSS LetterSlotsInput khỏi wrapper, hỗ trợ revealed/khóa chữ và lưu assisted trước khi hiện gợi ý; bỏ preventDefault/programmatic focus trên pointerdown, dùng input native nhận chạm. Test unit chỉnh sửa/paste với chữ khóa và E2E hint/assisted đã qua; người dùng đã bỏ kiểm tra iPhone thật khỏi phạm vi.

Theo xác nhận người dùng: 195 file skill .agents đã bỏ khỏi Git index, giữ local; .agents/.claude được ignore. Root AGENTS.md vẫn giữ vì là hướng dẫn của Next, không thuộc bộ skill.

Đã kiểm tra 50 gói và các trường hợp phiên bản/liên kết sai; E2E tải lỗi/thử lại/reload/nhiều tab/retry nguồn qua. Tự rà soát, không có reviewer độc lập mới.

Kết quả cuối: build, lint/typecheck/format, 39 unit tests và 36 E2E production desktop/mobile đều qua. Bộ skill giữ local, bỏ tracking trong commit v2 của đợt này.

# Learning contracts implementation plan

**Goal:** Giữ đủ ngữ cảnh của đáp án mới và tách Question theo kind mà không làm mất session/backup hiện có.

**Architecture:** Thay đổi tương thích trong snapshot schema 2. Question chỉ gồm ba dạng đang có renderer/scorer. Event mới có metadata; event cũ thiếu metadata được giữ nguyên, không suy diễn. Giữ policy lịch ôn hiện tại.

**Tech stack:** TypeScript, Vitest, IndexedDB, Next.js hiện tại.

Người dùng yêu cầu làm ngay phần có thể làm, rồi để đọc lại. Làm tại checkout `v2` hiện có theo yêu cầu trước đó chỉ giữ một thư mục/app. Không tạo worktree hoặc tự thay đổi quy tắc học.

- [x] RED: event từng kind có questionId/kind/contentVersion/skill/scoringVersion; duplicate không tạo thêm event.
- [x] RED: validator đọc backup/session trước thay đổi; nhận câu nhập chữ không có options; từ chối metadata/kind/options sai.
- [x] GREEN: union ba kind; validator nhận thiếu options hoặc options rỗng ở câu nhập chữ, writer tiếp tục ghi options rỗng để tab schema 2 cũ đọc được. Không đổi database/schemaVersion.
- [x] GREEN: thêm metadata từ câu hỏi/session vào event mới, giữ nguyên event lịch sử.
- [x] Viết báo cáo dễ đọc: đã làm, chưa làm, quyết định đề xuất cho kỹ năng/nội dung/sync và giới hạn dữ liệu cũ.
- [x] Lint/typecheck/unit/build và E2E học/reload/import/nhiều tab; cập nhật bằng chứng.

Review focus: backup chứa metadata sai; session cũ đang feedback; event cũ sau khi session đã thay; retry nhiều tab; không đổi box/dueAt chỉ vì đổi kiểu dữ liệu.

Kết quả: 29 unit tests, 28 E2E production, lint/typecheck/format/build đều qua; tự rà soát thay đổi, chưa có review độc lập mới. Đợt này giữ local trên nhánh v2 để người dùng đọc lại.

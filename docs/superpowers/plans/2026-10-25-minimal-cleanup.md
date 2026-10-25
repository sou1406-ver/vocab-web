# Minimal UX và dọn V1

**Spec/authorization:** Người dùng yêu cầu tiếp tục, giữ file V1 còn cần và xóa phần thừa; UX minimal, đơn giản nhất có thể.
**Execution:** writing-plans → executing-plans inline, không mở lại quyết định stack. Giữ nhánh hiện tại vì baseline Next chưa commit. Không đổi IndexedDB, ID, schema, import hoặc chính sách học; không thao tác cloud.

## Hướng thiết kế đã chọn

Giao diện công cụ học: một nền sáng/tối, một màu xanh hành động, sans cho UI, chữ >=16px/nhãn >=14px. Bỏ minh họa hero, slogan, khối mục tiêu lặp và biểu đồ trang trí. Hôm nay có một hành động chính, 3 số đếm và bài đang học. Kiến thức là danh sách bài; Tiến độ giữ số liệu/từ sai/lịch sử. Điều hướng và luồng đọc/tra/lưu/học vẫn đủ.

UI UX Pro Max: kết quả tìm design-system chung thiên về trẻ em/landing nên không áp dụng; truy vấn style rõ hơn khớp Minimalism & Swiss Style. Áp dụng khoảng trống, thứ bậc chữ, không gradient/shadow, giữ tương phản và bàn phím.

## Task 1 — Tách dữ liệu và xóa app V1

- [x] Snapshot Git HEAD vào archive local bị ignore; kiểm kê consumer trước khi xóa.
- [x] Chuyển `src/data` → `data/generated`, sửa cả pipeline Python và builder Next, kiểm tra fingerprint giữ nguyên `54681aa41d1b`, 600 từ/50 bài.
- [x] Giữ dữ liệu nguồn/tools, rules và cấu hình Firebase cần tra cứu; chuyển cấu hình Hosting/client cũ vào `docs/legacy`. Giữ favicon dùng ở Next.
- [x] Xóa UI React/Vite cũ, E2E/config/build cũ. Root chỉ điều phối app Next và tooling; bỏ React18/router/motion/Vite plugin khỏi dependency trực tiếp. Giữ SDK Firebase trong app; gỡ CLI Hosting cũ không dùng ở M0. Khi G6 cần CLI sẽ dùng phiên bản hiện hành.
- [x] Đơn giản CI thành một luồng Next, lệnh dev/build/test mặc định trỏ bản mới; giữ alias :v2 cho tương thích.

## Task 2 — Minimal UI

- [x] Test browser RED: Hôm nay có một CTA học chính và không còn minh họa/slogan/khối mục tiêu trùng; Kiến thức dạng danh sách; Tiến độ không biểu đồ trang trí; font và mobile vẫn đọc được.
- [x] Rút gọn Shell/Today/Progress/Knowledge, copy tiêu đề trực tiếp, bỏ component/style chết. Giữ các thao tác và selector tiến độ cần cho regression.
- [x] GREEN: chạy các test mới cùng regression học/reload/import/nhiều tab/đọc→lưu→học→quay lại.

## Task 3 — Nghiệm thu

- [x] Python pipeline + Next build/typecheck/lint/format/unit + E2E production desktop/mobile; screenshot tối thiểu.
- [x] Một fresh review theo executing-plans; sửa finding quan trọng rồi chạy lại kiểm tra cần thiết.
- [x] Báo cáo file giữ/xóa, hướng minimal, giới hạn Auth/sync/deploy còn lại. Không commit/push/merge hay sửa cloud/dữ liệu thật.

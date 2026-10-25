# Một app, lấy V2 làm gốc

Cập nhật 25/10/2026. Báo cáo này thay trạng thái cấu trúc/UI trong các báo cáo M0 và minimal trước đó.

- App Next.js ở root: một `src`, package, lockfile, bộ lệnh và CI. Không còn thư mục app `v2/`.
- Giữ giao diện V2 với hero xanh, thẻ từ, sidebar, mục tiêu và biểu đồ. Giữ font tiếng Việt, chữ lớn, thẻ tự giãn và các sửa lỗi dialog/MDX/scroll.
- Logo/icon lấy từ `vocablearn-logo-kit.zip` do người dùng cung cấp: lockup SVG sáng/tối, symbol khi sidebar hẹp, favicon/app icon và 28 icon UI với nét 1.75 (1.5 ở cỡ nhỏ). Dùng hình học gốc, không đổi tỷ lệ hay cắt logo; giữ palette xanh của app. Xem `docs/reference/BRAND-KIT.md`.
- Tận dụng nguồn từ, enrichment, bản dịch, bài tập, pipeline Python, adapter import và rules Firebase từ V1. Bỏ UI/router/build Vite và cấu hình chạy app cũ. Cấu hình client Firebase còn ở `docs/reference/` để tham chiếu.
- Catalog giữ 600 từ, 50 bài, fingerprint `54681aa41d1b`. Kho IndexedDB vẫn tên `vocab-learn-v2` để tương thích; không đổi schema/ID hoặc xóa dữ liệu trình duyệt.
- Các báo cáo cũ giữ bằng chứng lịch sử; dùng lệnh và đường dẫn trong README hiện tại để chạy.

## Kiểm tra

Đã xác minh clean `npm ci`, 20 unit tests, lint/typecheck/format, production build và 28/28 E2E trên Edge desktop/mobile. Pipeline Python → catalog chạy đủ 600 từ/50 bài, không cảnh báo và không đổi fingerprint. Đã xem screenshot logo sáng/tối và mobile.

Hai lỗi phát hiện trong quá trình kiểm tra đã sửa: caption `.art-bottom` thiếu tương phản (đổi màu); bài công khai bị loading/Suspense ở root che nội dung khi tắt JavaScript (bỏ loading chung, chỉ giữ Suspense tại Library dùng query). Test no-JS đã qua trên cả hai project. Các luồng học/reload/retry/nhiều tab/import/đọc-tra-lưu-quay lại vẫn qua.

Ruling: tự rà soát thay cho lượt review độc lập cuối vì reviewer không chạy được do giới hạn sử dụng tài khoản. Không coi đó là một lượt review đã hoàn tất.

## Còn lại

Firebase Auth/cloud sync, kiểm chứng rules bằng Emulator và deploy Vercel là bước tiếp theo; chưa triển khai trên cloud. Người dùng đã yêu cầu đẩy bản hiện tại lên nhánh Git `v2`; không merge vào main. Bản phục hồi V1 nằm trong Git và archive local bị ignore.

# Một app duy nhất, lấy V2 làm gốc

Người dùng sửa lại yêu cầu: giữ giao diện V2 trước đợt minimal, lấy V2 làm nền duy nhất; tận dụng phần V1 có ích, xóa phần không dùng. Đây là gộp cấu trúc/mã, không tự merge Git main.

## Quyết định

- Đưa Next app từ `v2/` ra root: một `src`, `content`, `public`, package/lockfile, CI và bộ lệnh. Giữ data/tools/import/rules cần thiết từ V1. Không đổi origin5174, database/schema/ID/fingerprint54681aa41d1b.
- Khôi phục bố cục V2: hero xanh, thẻ từ, sidebar, mục tiêu, biểu đồ và danh sách kiến thức như trước. Giữ font Noto đầy đủ tiếng Việt, chữ lớn, card tự giãn, dialog/save/scroll và các sửa lỗi nhiều tab/retry/MDX.
- Có bản source map V2 cũ giữ được Today/Shell/Knowledge/Logo/Card. Chỉ khôi phục phần UI; không chép đè store/domain/repository đã sửa lỗi.

## Thực hiện inline

- [x] Test RED UI V2 có hero/thẻ/sidebar/goal trở lại; card không chồng chữ ở1440/1024; giữ đọc/lưu/học/resume.
- [x] Lưu source gốc từ map trước khi dọn cache, backup source/config hiện tại vào vùng ignore.
- [x] Khôi phục UI, bỏ minimal override và tests chỉ áp cho minimal; thêm lại style cần thiết, không đổi engine.
- [x] Dùng package app V2 làm gốc, hợp tooling dev vào cùng package, đổi tên config script không còn :v2; cập nhật script đường dẫn, CI, doc. Cài một lock/dependency graph.
- [x] Chuyển source/content/tests/public/config ra root, xóa `v2/` và bản build/cache/node_modules dư sau xác minh đường dẫn. Git/archive vẫn giữ khả năng phục hồi V1.
- [x] Build/typecheck/lint/format/data, 20 unit và 28 E2E production + screenshot. Review độc lập bị giới hạn sử dụng; đã tự rà soát và ghi rõ giới hạn. Không cloud/deploy/merge Git; push nhánh `v2` được người dùng yêu cầu sau đó.

## Bổ sung theo yêu cầu mới

- Dùng bộ `vocablearn-logo-kit.zip`: SVG sáng/tối, symbol 48px cho sidebar hẹp, favicon/app icon và 28 icon UI. Giữ UI xanh của V2.
- Đã thấy test logo RED với ảnh cũ; test tương phản RED chỉ ra caption 3.95:1.
- Ruling: chuyển Suspense chung vào trang Library (nơi dùng useSearchParams). HTML production cho bài đọc trước đó chứa nội dung trong vùng hidden, phụ thuộc script để hiện ra; bài công khai cần đọc được khi tắt JavaScript. Test no-JS phát hiện lỗi trên cả desktop/mobile.
- Ruling: lượt reviewer cuối bị giới hạn sử dụng tài khoản, không có kết quả review; tự rà soát và dùng toàn bộ kiểm tra production thay thế, không tuyên bố review độc lập đã qua.
- Lỗi no-JS còn một boundary tự sinh từ `src/app/loading.tsx`; bỏ loading ở root để bài công khai xuất hiện trong HTML ban đầu. Kết quả cuối: 28/28 E2E qua.

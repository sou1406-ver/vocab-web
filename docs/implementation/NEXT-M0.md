# Next.js M0 — trạng thái ở mốc đầu

> Báo cáo mốc 24/10 trước đợt minimal/dọn V1 ngày 25/10; thẻ minh họa và app V1 ở root đã được bỏ theo yêu cầu mới. Trạng thái hiện tại ở [MINIMAL-CLEANUP](MINIMAL-CLEANUP.md).

Ngày 24/10/2026. Đây là mốc local G2–G4, chưa là bản V1 có đồng bộ hoặc bản phát hành thay web cũ.

## Đã có

- Next.js App Router trong `v2/`, routes riêng, server layout và provider client theo từng cây React. Không dùng React Router hoặc Vite để chạy app mới.
- Tailwind CSS và các component shadcn/ui thực: Button, Card, Input, Badge, Dialog/Radix. Giữ hệ màu sáng/tối và các màn học đã có.
- Font Noto Serif tự host có đủ tiếng Việt; nội dung nền 16px, nhãn/chú thích CSS ứng dụng tối thiểu 14px theo phản hồi người dùng. Thẻ từ minh họa tự giãn chiều cao, footer nằm trong luồng để không chồng lên nghĩa từ.
- Kiến thức có danh mục và bài MDX tự biên soạn: 7 từ/cụm, biến thể `resolved → resolve`, `established → establish`, cụm `abide by`. Liên kết tới ID catalog đã có, không có bộ suy nghĩa tự động.
- HTML/metadata của bài được dựng ở server; bài vẫn đọc và tra được khi IndexedDB lỗi, còn nút lưu bị vô hiệu hóa với thông báo rõ. Không biên dịch nội dung tải lên như MDX.
- Lưu/bỏ lưu từ không thay tiến độ, Library lọc Đã lưu và học nhóm tối đa 5 từ; ưu tiên lượt đang dở, không ghi đè.
- Link trở lại bài đọc giữ trong session/backup. Vị trí đọc lưu theo tab và version bài; không bị scroll của route khác ghi đè.
- Giữ nguyên database, schemaVersion, ID và fingerprint catalog để snapshot/lượt đang dở của bản Vite tiếp tục được đọc. Trường mới tùy chọn, backup cũ vẫn hợp lệ.
- Validator build kiểm tra manifest collection, số lượng 600 mục/50 bài, metadata/slug và liên kết từ trong MDX.
- Vercel config/README/CI cho Next.js; Root Directory `v2`. App/Firebase Hosting cũ ở root được giữ riêng. Canonical/sitemap chỉ dùng origin thật từ `SITE_URL` nếu đã cấu hình.

## Bằng chứng kiểm tra

- Dev Next.js chạy ở `http://127.0.0.1:5174`, giữ đúng origin kho local cũ.
- Build Next.js có trang `/knowledge/reading-at-work` được prerender thành HTML; validator báo không có ID hỏng.
- Kiểm tra cuối: **20/20 test logic đạt**, gồm chính sách học, import/backup, lưu từ, store theo request và chống tab cũ kết thúc nhầm lượt mới.
- Kiểm tra cuối trên **bản production Next.js: 26/26 E2E đạt với Edge**, desktop 1440px, mobile 360px, kiểm tra sidebar 768px và thẻ minh họa 1024px. Có học/reload/nhiều tab/ôn >20 từ/import, HTML khi tắt JS, local lỗi rồi retry, tra/lưu/học/quay lại, font và kiểm tra Axe.
- Regression lỗi thẻ minh họa: tái hiện thất bại trước sửa, đạt sau sửa ở 1440px và 1024px.
- App cũ: 44 test logic và build Vite đạt trong phiên này.
- Dependency V2 đã được kiểm tra sau cập nhật gRPC gián tiếp của Firebase: npm báo 0 vulnerabilities ở lần install/audit đó; không sửa package của app cũ.

Typecheck, lint V2, lint toàn repo, format V2 và build Next.js đều đạt trong phiên. Kiểm tra format toàn repo còn nợ ở mã cũ theo báo cáo baseline; không định dạng lại app cũ. CI được cấu hình nhưng chưa chạy trên GitHub. Không dùng báo cáo Vite cũ như bằng chứng cho Next.js.

## Review và sửa lỗi

Đã có một lượt review độc lập chỉ đọc. Hai lỗi quan trọng được tái hiện bằng test thất bại trước khi sửa: tab cũ kết thúc nhầm session mới (đã thêm kiểm tra ID trong transaction), và MDX multiline tạo 17 đoạn trong 3 câu ví dụ (đã đổi sang đoạn Markdown với từ inline; E2E xác nhận 3 đoạn và không có `button p`).

Lỗi cache promise mở IndexedDB bị từ chối được nâng mức ưu tiên vì nút “Thử lại” không thể phục hồi dù lỗi tạm thời đã hết. Đã sửa reset cache khi thất bại, đóng kết nối đến muộn và kiểm tra retry đạt. Sau các sửa này, suite 20 unit + 26 production E2E đều xanh; không còn finding review bị bỏ lại.

Các quyết định khi triển khai: giữ checkout trên nhánh `codex/next-app-router` vì baseline local chưa commit; không tạo worktree bỏ mất baseline. Mốc này giới hạn ở M0 và chuẩn bị Vercel, nên Auth/sync cần làm tiếp ở G6. Chi phí tương ứng: thay đổi cùng working tree và chưa có đồng bộ tài khoản; app cũ và dữ liệu thật được giữ riêng.

Chưa commit/push/merge; giữ thay đổi để người dùng xem xét tại workspace hiện tại.

## Chưa có ở mốc này

- Firebase Auth, project staging thật, cloud sync/merge hai thiết bị, phân quyền cloud và Emulator tests; đây là G6.
- Vercel project/domain/deploy thật; chưa dùng quyền tài khoản cloud.
- API từ điển, bài kiến thức bổ sung, CMS, tách canonical senses đầy đủ hoặc engine tiếng Trung.
- Nhập hồ sơ thật, xóa/reset IndexedDB hoặc thay dữ liệu Firebase cũ.
- Khởi động lại hoàn toàn offline; hiện chỉ cam kết lưu local và tiếp tục dữ liệu đang có trong app đang mở.
- Nghiệm thu nội dung/quyền phát hành toàn bộ catalog và dùng thử nhiều ngày trước khi phát hành V1.

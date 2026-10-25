# Dọn V1 và minimal UX

> Báo cáo lịch sử. Người dùng đã hủy hướng minimal quá mức; trạng thái hiện tại nằm trong [SINGLE-APP.md](SINGLE-APP.md). Đường dẫn/lệnh trong báo cáo này có thể đã thay đổi.

Ngày 25/10/2026. Người dùng cho phép giữ file V1 cần thiết, xóa phần thừa và làm UX đơn giản nhất có thể.

## Giữ

- Toàn bộ dữ liệu nguồn, enrichment, bản dịch, bài tập, ETS, cụm từ và công cụ Python/OCR/IPA/tần suất.
- Output V1 chuyển từ `src/data/` sang `data/generated/`; sửa cả builder Python, script tần suất và builder catalog Next.
- Firebase rules và cấu hình client/project/Hosting tham chiếu trong `docs/legacy/`. Không còn deploy Hosting hay project production mặc định ở root.
- Favicon/apple icon dùng ở Next; logic học, import cũ, snapshot/schema và database trình duyệt giữ nguyên.
- Lịch sử Git và snapshot local trước dọn ở `.superpowers/cleanup/v1-before-cleanup.zip` (bị ignore).

## Xóa/thay thế

- Giao diện/root `src` V1 sau khi tách dữ liệu; E2E V1, public assets không còn dùng, Vite/index/tsconfig cũ và build output `dist`, `dist-v2`.
- Dependency runtime React18, React Router, Firebase10, animation cũ và Vite plugin khỏi package root; npm đã dọn 741 package không còn cần qua hai đợt; gỡ cả Firebase CLI Hosting cũ. Firebase SDK vẫn ở package Next; khi làm G6 sẽ dùng CLI hiện hành.
- Hai pipeline CI song song thay bằng một pipeline Next. Lệnh mặc định dev/build/test/preview/typecheck trỏ Next, alias `:v2` còn dùng được.
- Thẻ minh họa, slogan/sidebar note, vòng mục tiêu, khối từ ngẫu nhiên, biểu đồ rỗng và hơn100 rule CSS không còn consumer. Component Card và Logo không còn dùng đã bỏ.

## Minimal

Hôm nay có một CTA, ba số đếm và danh sách bài. Kiến thức là danh sách bài. Tiến độ giữ số liệu cần thiết/từ sai/lịch sử. UI sans, chữ lớn như yêu cầu trước, ít màu/radius/shadow. Không thay cơ chế học hoặc ghi tiến độ.

## Kiểm tra

Pipeline Python và catalog sau khi di chuyển vẫn có 600 mục, 50 bài, không cảnh báo; fingerprint giữ nguyên `54681aa41d1b`. 20 test logic đã đạt; build Next, typecheck, lint và format toàn repo đạt. Đã có review độc lập xác nhận 59 file dữ liệu được chuyển nguyên nội dung (chuẩn hóa LF). Các chỗ CSS ở sidebar hẹp, màn hình 1920px và blockquote đã được sửa và kiểm tra responsive. **30/30 E2E production đạt với Edge**, desktop/mobile, gồm 1920px và sidebar768px. Không có thay đổi tài khoản/cloud, không sửa database hoặc fingerprint nội dung.

Các lựa chọn khi dọn: giữ app Next tại `v2/` và tooling ở root (vẫn cần hai bước npm ci); giữ data/tools và cấu hình tham chiếu thay vì xóa đầu vào; gỡ CLI Hosting cũ vì chưa dùng, G6 sẽ dùng CLI hiện hành. Giữ thay đổi trên nhánh hiện tại, chưa commit/push/merge.

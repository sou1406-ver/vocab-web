# Báo cáo mốc local đầu tiên (Vite — lưu lịch sử)

Báo cáo này ghi bằng chứng của mốc Vite trước khi chuyển stack; các lệnh/build/deploy preview bên dưới mô tả mốc cũ, không còn là hướng dẫn chạy bản hiện tại. Xem [báo cáo Next.js M0](NEXT-M0.md) và [README hiện tại](../../README.md).

Ngày 24/10/2026. Đây là bản thử nghiệm local; chưa đạt toàn bộ V1 trong kế hoạch.

## Đã thực hiện

- Ứng dụng mới trong `v2/`, port 5174, build `dist-v2`; entry point, config Firebase và kho tiến độ web cũ không đổi.
- Brief, quy tắc học, luồng/bố cục và quy tắc giao diện nằm trong `docs/implementation/` và `v2/design-system/`.
- Pipeline chuyển dữ liệu: 600 từ, 50 bài; validator báo 0 cảnh báo thiếu ví dụ/bản dịch ở dữ liệu đầu vào hiện tại. Đây là kiểm tra cấu trúc, không thay việc đọc duyệt nội dung.
- Hôm nay, danh sách/chi tiết bài, thư viện, chi tiết từ, lượt học, kết quả, thống kê và cài đặt/sao lưu.
- Ba dạng câu hỏi, phản hồi đúng/sai, tra từ có ghi nhận đã xem gợi ý, luyện lại từ sai.
- Lịch ôn local, hàng đợi đầy đủ, batch 20 từ, mục tiêu ngày và giới hạn nâng bậc theo ngày.
- IndexedDB riêng, transaction lưu sau thao tác, tiếp tục lượt, revision và thông báo giữa các tab.
- Preview và nhập backup cũ/V2; khử trùng import, giữ mục không ánh xạ và nguồn gốc trong bản sao xuất.
- Firebase Hosting config V2, SPA rewrite và helper preview yêu cầu project staging rõ ràng. Helper từ chối production hiện tại.
- CI V2 là job riêng, có lint/format/build/unit/E2E; chưa chạy trên GitHub trong phiên này.

## Kết quả kiểm tra

| Kiểm tra                         | Kết quả                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run build:v2`               | Đạt; bao gồm kiểm tra kiểu cho source, test và config V2                                      |
| `npm run lint:v2`                | Đạt                                                                                           |
| `npm run format:check:v2`        | Đạt                                                                                           |
| `npm run test:v2`                | 13 test đạt                                                                                   |
| E2E V2 với Edge                  | 14 test đạt: desktop 1440px và mobile 360px; thêm kiểm tra sidebar 768px                      |
| Axe WCAG 2 A/AA                  | Đạt các route/trạng thái được bao phủ trong E2E, cả sáng và tối; không phải chứng nhận đầy đủ |
| Nhiều tab                        | Cùng thấy feedback, bước tiếp và kết quả; chỉ một câu trả lời được ghi                        |
| Hàng đợi ôn                      | 43 từ đến hạn → lượt tối đa 20 → trả lời một từ → còn 42                                      |
| Web cũ: `npm test`               | 44 test đạt                                                                                   |
| Web cũ: `npm run build`          | Đạt                                                                                           |
| `npm run lint` toàn repo         | Đạt ở lần kiểm tra trong phiên                                                                |
| `npm run format:check` toàn repo | Còn lỗi định dạng ở mã cũ; các file V2 đã qua check riêng. Không định dạng lại toàn bộ mã cũ  |
| `git diff --check`               | Đạt cho các thay đổi được theo dõi                                                            |

## Chưa thực hiện

- Firebase staging project thật, Google Auth, cloud sync và kiểm tra xung đột hai thiết bị.
- Deploy online. Bản hiện tại chỉ lưu local, giao diện thể hiện rõ điều này.
- CLI kiểm tra project trả lỗi `Failed to authenticate, have you run firebase login?`; cần đăng nhập lại trước khi xác minh/tạo staging. Không suy rằng đã có quyền truy cập cloud từ cấu hình công khai trong repo.
- Nhập dữ liệu thật hoặc thay dữ liệu Firestore cũ. Chỉ dùng fixture test trong các browser context tách biệt.
- Bài kiểm tra qua bài, bài tập sách và nội dung mở rộng thuộc V1.1.
- Dùng thử qua nhiều ngày lịch và kiểm tra thủ công toàn bộ nội dung.

## Mốc tiếp theo

1. Dùng thử luồng local và chốt các điều chỉnh cần thiết.
2. Xác định Firebase staging riêng; cấu hình môi trường, auth và chiến lược sync có revision/khử trùng.
3. Kiểm tra import từ hồ sơ thật qua preview; đối chiếu số đếm và giữ snapshot.
4. Chỉ chuyển sang production khi sync/migration và tiêu chí phát hành đạt.

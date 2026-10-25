# Vocab Learn

Một app Next.js duy nhất ở thư mục gốc, lấy V2 làm nền. Giữ giao diện V2 (hero xanh, thẻ từ, sidebar và tiến độ), font tiếng Việt/chữ lớn và các sửa lỗi lưu/học. Không còn app hoặc package riêng trong thư mục v1/v2.

## Chạy

Node.js24, chỉ cài dependency một lần:

```powershell
npm ci
npm run dev
```

Mở [bản local](http://127.0.0.1:5174/). Không đổi host/port nếu muốn tiếp tục kho dữ liệu hiện có.

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run start
```

`dev` và `start` cùng port5174; dừng server đang chạy trước khi đổi. `preview` là alias của `start`, không là app thứ hai.

E2E dùng Chromium hoặc Edge sẵn trên máy:

```powershell
$env:PW_CHANNEL='msedge'
npm run e2e -- --workers=1
```

Đặt `E2E_PRODUCTION=1` để test dùng server production đã build. CI cũng dùng một package, một lockfile và cùng bộ lệnh.

## Cấu trúc

- `src/`: App Router, UI, domain, local repository và tests logic.
- `content/knowledge/`: MDX đã duyệt và manifest bài đọc.
- `e2e/`: Playwright test các luồng học/đọc/import và UI.
- `public/`: logo SVG sáng/tối, favicon và app icon từ bộ logo người dùng cung cấp.
- `data/`: dữ liệu V1 được tận dụng, gồm nguồn/enrichment/bản dịch/bài tập và `generated/`.
- `tools/`, `scripts/`: pipeline Python và validator/builder catalog.
- `design-system/`: quy tắc giao diện V2 hiện tại.
- `docs/reference/`: cấu hình Firebase client công khai để tham chiếu khi làm Auth/sync.

Đã bỏ UI/router/build Vite của V1, cấu hình/package/cache cũ và bản minimal bị hủy. Git và archive local bị ignore còn khả năng phục hồi; chỉ có một source app hoạt động.

## Nội dung và tiến độ

Sửa nguồn ở `data/source`, `data/enrich`, `data/translations`, chạy `npm run data`. Python sinh `data/generated`, builder sinh `src/content/catalog.json`. Không sửa tay output. Bài sách/ETS/cụm từ chưa có UI được giữ làm dữ liệu nguồn.

Lưu/đọc/backup vẫn dùng database `vocab-learn-v2`, store `snapshots`, schemaVersion2, ID và fingerprint cũ. Đây là tên kho dữ liệu tương thích, không phải một app V2 riêng. Import V1/backup có preview; không xóa dữ liệu trình duyệt/cloud khi gộp mã.

## Deploy và phần tiếp theo

Vercel dùng repo root (Root Directory mặc định), Next.js, Node24, `npm ci`, `npm run build`. `vercel.json` ở root. `SITE_URL` tùy chọn cho canonical/sitemap; không điền domain giả.

Firebase SDK và rules còn giữ, chưa có Auth/cloudsync trong app local. G6 sẽ dùng staging/Emulator và CLI hiện hành. Chưa deploy hoặc thay web Firebase cũ trên cloud. Cần rà nguồn/quyền dùng catalog trước khi phát hành công khai.

Xem [kết quả gộp app](docs/implementation/SINGLE-APP.md) và [kế hoạch sản phẩm](docs/BUILD-FROM-SCRATCH.md). Các báo cáo mốc cũ chỉ là lịch sử, không dùng đường dẫn/lệnh cũ để chạy app hiện tại.

Phần review lõi học, các thay đổi tương thích và đề xuất trước khi mở rộng bài tập nằm trong [Learning contracts](docs/implementation/LEARNING-CONTRACTS.md).

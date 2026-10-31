# Vocab Learn

Web học từ vựng TOEIC (600 Essential Words) cho người Việt: học theo bài, ôn lặp lại ngắt quãng, 8 dạng bài tập, đồng bộ tiến độ qua tài khoản Google.

Bản chạy: <https://vocab-web-beta.vercel.app/> · Next.js 16 · React 19 · Firebase Auth + Firestore.

## Tính năng

**Học và ôn**

- 600 từ / 50 bài / 10 chủ đề; mỗi từ có IPA, nghĩa, ví dụ kèm bản dịch, family, đồng nghĩa, trái nghĩa.
- Ôn lặp lại ngắt quãng: 6 hộp, khoảng cách 1 → 3 → 7 → 14 → 30 → 60 ngày. Ngày học tính theo giờ Việt Nam.
- Luyện thêm (practice) không làm đổi lịch ôn.

**8 dạng bài tập**

| Dạng                             | Kiểu trả lời     |
| -------------------------------- | ---------------- |
| Gõ từ theo ô chữ                 | gõ, có gợi ý chữ |
| Điền chỗ trống                   | chọn 1/4         |
| Chọn nghĩa / chọn từ             | chọn 1/4         |
| Dạng từ (Part 5)                 | chọn 1/4 hoặc gõ |
| Ghép từ (gốc + phụ tố)           | bấm mảnh ghép    |
| Đồng nghĩa / gần nghĩa trong câu | chọn 1/4         |
| Nối từ theo chủ đề               | nối 6 cặp        |
| Nghe                             | chọn 1/4 hoặc gõ |

- Gợi ý ô chữ: được lộ tối đa `floor(số chữ cái × 0.3)` chữ mà vẫn tính đúng; vượt mức thì tính là có hỗ trợ.
- Đáp án nhiễu chỉ lấy từ trong bài đang học, từ đã học hoặc family của chúng — không có từ lạ để đoán bằng loại trừ.

**Phân tích từ**

- Mức 1 (luôn hiện): tách tiền tố / hậu tố, ví dụ `agree` · `-ment`.
- Mức 2 (tuỳ chọn, bật trong Cài đặt → _Học sâu: gốc từ_): gốc Latin, ví dụ `inter-` + `rupt` → "phá vỡ ngay giữa chừng". Có trang `/roots` cho từng gốc, gồm cả từ mở rộng ngoài sách.

**Tài khoản**

- Học không cần tài khoản (lưu trên trình duyệt).
- Đăng nhập Google để đồng bộ nhiều thiết bị; lần đầu đăng nhập phải tạo username (duy nhất, `a-z 0-9 _`, 3–20 ký tự).
- Bảng xếp hạng theo số từ đã học, hiển thị username; có thể ẩn trong Cài đặt.
- Sao lưu / khôi phục file JSON; nhập được dữ liệu từ web cũ (có xem trước).

## Chạy local

Cần Node.js 24 (tối thiểu 20.9).

```bash
npm ci
npm run dev        # http://127.0.0.1:5174
```

Giữ nguyên host/port `127.0.0.1:5174`: dữ liệu trình duyệt gắn với địa chỉ này.

| Lệnh                                          | Việc                                     |
| --------------------------------------------- | ---------------------------------------- |
| `npm run build`                               | sinh catalog + kiểm tra nội dung + build |
| `npm run start`                               | chạy bản build (cùng port 5174)          |
| `npm test`                                    | unit test                                |
| `npm run typecheck` · `lint` · `format:check` | kiểm tra code                            |
| `npm run e2e`                                 | test trình duyệt (Playwright)            |

E2E bằng Edge có sẵn trên máy: đặt `PW_CHANNEL=msedge`. Đặt `E2E_PRODUCTION=1` để test trên bản build.

Test rules Firestore cần Java 21:

```bash
FIREBASE_SYNC_EMULATOR_TEST=1 npx firebase-tools emulators:exec --only auth,firestore --project demo-vocab-sync \
  "npx vitest run src/data/sync-emulator.test.ts src/data/usernames-emulator.test.ts"
```

## Cấu trúc

| Thư mục                    | Nội dung                                                 |
| -------------------------- | -------------------------------------------------------- |
| `src/app/`                 | route Next.js                                            |
| `src/features/`            | màn hình (Hôm nay, Bài học, Học, Tiến độ, Cài đặt, BXH…) |
| `src/domain/`              | logic học, chấm điểm, sinh câu hỏi, đáp án nhiễu         |
| `src/data/`                | lưu trữ IndexedDB, validator, đồng bộ Firestore          |
| `content/books/<bookId>/`  | khai báo từng quyển sách                                 |
| `content/roots/roots.json` | dữ liệu gốc từ (mức 2)                                   |
| `content/knowledge/`       | bài đọc MDX                                              |
| `data/`                    | dữ liệu nguồn và bản sinh từ pipeline Python             |
| `scripts/`                 | builder catalog, gói bài tập, validator                  |
| `e2e/`                     | test Playwright                                          |

## Nội dung

Không sửa tay file sinh ra trong `src/content/` và `public/exercises/`.

1. Sửa nguồn ở `data/source`, `data/enrich`, `data/translations`.
2. `npm run data` — Python sinh `data/generated/`, builder sinh `src/content/books/<bookId>/` và `public/exercises/<bookId>/`.

**Thêm một quyển sách**

1. Tạo `content/books/<bookId>/book.json` (`id` trùng tên thư mục, `title`, `shortTitle`, `builder`, `expectedEntries`, `expectedLessons`).
2. Viết builder `scripts/books/<bookId>.mjs` trả về `{ payload: { lessons, topics, words }, warnings, part5 }`, đăng ký trong `scripts/build-content.mjs`.
3. ID từ phải có tiền tố `<bookId>:` (riêng `toeic-600` giữ ID cũ). URL bài: `/books/<bookId>/lessons/<n>`.
4. `npm run data:catalog`.

**Gốc từ**: sửa `content/roots/roots.json`. Mọi phụ tố trong `parts` phải có trong bảng `affixes`; `book.wordId` phải tồn tại trong catalog — build sẽ báo lỗi nếu sai.

## Dữ liệu người học

- Trình duyệt: IndexedDB `vocab-learn-v2`, store `snapshots`, `schemaVersion: 2`. Không đổi tên/ID để giữ tiến độ cũ.
- Cloud (Firestore, project `vocab-web-next`): `users/{uid}/…` (nhật ký đồng bộ, chỉ chủ tài khoản), `profiles/{uid}`, `usernames/{name}`, `leaderboard/{uid}`. Quy tắc ở `firestore.rules`.
- Hợp đồng dữ liệu và luật chấm điểm: [LEARNING-CONTRACTS.md](docs/implementation/LEARNING-CONTRACTS.md).

## Deploy

- **Web**: Vercel, nhánh `main`, cấu hình sẵn trong `vercel.json`. Biến môi trường `SITE_URL` tuỳ chọn (domain thật cho sitemap).
- **Firebase**: thêm domain Vercel vào Authentication → Authorized domains. Đổi `firestore.rules` thì đợi CI (job `firebase-emulator`) xanh rồi mới deploy:

  ```bash
  npx firebase-tools deploy --only firestore:rules --project vocab-web-next
  ```

## Lưu ý

Nội dung 600 Essential Words có bản quyền; app dùng cho mục đích cá nhân. Cần xem lại quyền sử dụng trước khi phát hành công khai.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Quy tắc làm việc

### Phạm vi

- Chỉ làm đúng mục được giao. Không refactor, đổi tên hoặc format file ngoài phạm vi.
- Chỉ đọc file liên quan. Dùng `rg` để tìm, không đọc cả thư mục.
- Không đọc: `node_modules/` (trừ docs Next khi cần), `public/exercises/`, `src/content/*.json`, `data/generated/`, `package-lock.json`.
- Yêu cầu mơ hồ hoặc đụng schema/migration: dừng lại và hỏi, không tự đoán.

### Kiểm tra

- Trong lúc sửa: chỉ chạy test liên quan (`npx vitest run <file>`) và `npm run typecheck`.
- Lint, format, build chạy một lần ở cuối, trước commit.
- Chỉ chạy E2E khi có đổi UI, và chỉ chạy spec liên quan.
- Test fail: sửa tối đa 2 lần, vẫn fail thì dừng và báo lỗi.

### Báo cáo

- Báo cáo cuối tối đa 10 dòng: file đã đổi, lệnh đã chạy và kết quả, việc còn lại. Không dán lại code hay diff.
- Không tạo file mới trong `docs/superpowers/`. Chỉ cập nhật `docs/implementation/LEARNING-CONTRACTS.md` khi đổi hợp đồng dữ liệu.

### Hợp đồng dữ liệu (không tự ý đổi)

- Giữ nguyên: tên IndexedDB `vocab-learn-v2`, `schemaVersion` của snapshot, ID từ, fingerprint catalog, ID event `sessionId:index`.
- Thêm field vào event/question: để optional, validator phải đọc được dữ liệu cũ, kèm test tương thích. Đổi cách chấm thì tăng `scoringVersion`.
- Practice và Match không tăng box, không đổi `dueAt`/`reviewedDay`.
- Gợi ý ô chữ: `hintLimit = floor(số chữ cái × 0.3)`. Vượt hạn mức thì `assisted`.
- Builder nội dung: dọn thư mục output trước khi ghi, không để lại file sinh thừa.

### Git

- Làm trên nhánh `v2`, không merge vào `main`.
- Mỗi mục một commit, message tiếng Anh ngắn.
- Không commit `.agents/`, `.claude/`, `test-results/`, `playwright-report/`.

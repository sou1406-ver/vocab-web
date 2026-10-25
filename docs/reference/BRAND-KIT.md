# Vocab Learn — logo kit

Ý tưởng: 4 chấm lớn dần, khoảng cách giãn dần (8 → 12 → 16), nghiêng 30° — lặp lại ngắt quãng.

## Màu

| Token          | Sáng      | Tối       |
| -------------- | --------- | --------- |
| Brand (chấm)   | `#E04A2F` | `#FF6A4D` |
| Chữ logo       | `#15171C` | `#F4F4F5` |
| Nền tham chiếu | `#FFFFFF` | `#0F1115` |

Contrast: `#E04A2F` trên trắng 4.05:1, `#FF6A4D` trên `#0F1115` 6.68:1 (đạt ≥ 3:1 cho đồ họa). Không dùng `#FF6A4D` trên nền trắng (2.83:1).

## File

- `svg/vocablearn-horizontal-light|dark.svg` — lockup ngang (header web)
- `svg/vocablearn-stacked-light|dark.svg` — lockup dọc (màn hình login, splash)
- `svg/vocablearn-symbol(-dark).svg` — 4 chấm, dùng từ 48px trở lên
- `svg/vocablearn-symbol-small(-dark).svg` — 3 chấm, dùng ≤ 32px
- `svg/*-black.svg`, `*-white.svg` — bản 1 màu
- `web/` — favicon.ico/svg, apple-touch-icon, icon-192/512, maskable-512, site.webmanifest, head-snippet.html
- `png/` — PNG 1200px (lockup), 512px (symbol)

## Quy tắc

- Khoảng trống quanh logo ≥ đường kính chấm lớn nhất.
- Lockup ngang: cao tối thiểu 24px. Symbol 4 chấm: tối thiểu 48px; nhỏ hơn dùng bản 3 chấm.
- Không xoay, không đổi tỉ lệ chấm, không thêm gradient/bóng, không đổi màu chấm ngoài 2 mã trên.
- Font: Inter Bold (OFL), đã chuyển thành path — không cần cài font.

## Dùng trong React (sáng/tối)

```css
:root {
  --brand: #e04a2f;
  --logo-ink: #15171c;
}
[data-theme="dark"] {
  --brand: #ff6a4d;
  --logo-ink: #f4f4f5;
}
```

Hoặc đổi file: `<img src={dark ? logoDark : logoLight} alt="Vocab Learn" />`.
Copy toàn bộ `web/` vào `public/`, dán `head-snippet.html` vào `index.html`.

## Icon UI (28 icon)

- `icons/svg/*.svg` — 24×24, nét 1.75, đầu nét tròn, màu `currentColor` (tự theo theme sáng/tối)
- `icons/Icon.jsx` — component React: `<Icon name="review" size={20} />`
- Điểm nhấn chung với logo: chấm tròn đặc (home, library, calendar, flashcards, quiz, new-word, progress)
- Map theo app: Hôm nay → `home`, Bài học → `lessons`, Thư viện → `library`, Kiến thức → `knowledge`, Tiến độ → `progress`, Từ mới hôm nay → `new-word`, Đến hạn ôn → `review`, Đã ghi nhớ → `memorized`, Lưu trên máy → `device`, đổi theme → `sun`/`moon`
- Kích thước dùng: 20px trong nav/nút, 16px trong text (nét 1.5), 24px cho tiêu đề

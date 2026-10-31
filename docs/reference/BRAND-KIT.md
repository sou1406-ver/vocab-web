# Vocab Learn — logo hiện tại

Logo đang dùng là biểu tượng chiếc túi từ bộ logo người dùng cung cấp, thay cho logo bốn chấm cũ.

- `public/brand/logo-light.svg`: chữ tối cho nền sáng.
- `public/brand/logo-dark.svg`: chữ sáng cho nền tối.
- Hai lockup có kích thước nội tại 760 × 256; giữ nguyên tỷ lệ khi hiển thị.
- Biểu tượng dùng cam `#E65324` và nắp túi `#FFA766`; chữ sáng/tối theo file gốc.
- Favicon và icon ứng dụng trong `public/` đã dùng biểu tượng túi; metadata dùng phiên bản `pocket` để làm mới cache.
- Chữ logo đã chuyển thành path. Giấy phép font ở `public/brand/FONT-LICENSE.txt`.

Không đổi màu hoặc bóp méo logo. Token giao diện trong `src/shared/styles.css` độc lập với màu minh họa của logo; dùng màu chữ đủ tương phản trên nền tương ứng.

Avatar là 20 ảnh Notionists SVG tĩnh trong `public/avatars/notionists/`, không phải một phần của logo. Ứng dụng tải ảnh tại chỗ, không gọi API sinh avatar.

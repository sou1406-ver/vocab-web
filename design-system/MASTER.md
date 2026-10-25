# Vocab Learn — lấy giao diện V2 làm gốc

Ngày25/10/2026: người dùng xác nhận V2 trước đó đã khá ổn; hủy đợt minimal quá mức. Chỉ có một app ở repo root.

- Khôi phục bố cục V2: nền giấy xanh nhạt, hero xanh, thẻ từ, sidebar, mục tiêu ngày và tiến độ. Không tiếp tục hướng trang trắng phẳng quá mức.
- Giữ font Noto Serif tự host hỗ trợ tiếng Việt cho tiêu đề/mục từ, system sans cho nội dung/điều khiển. Nội dung>=16px, nhãn>=14px.
- Thẻ minh họa tự giãn theo nội dung; caption nằm trong luồng, không dùng chiều cao cố định gây chồng chữ.
- Giữ tương phản sáng/tối, focus, Escape/trả focus, mobile360px/compact768px/desktop1440px và giảm chuyển động.
- Logo và icon theo bộ `vocablearn-logo-kit.zip`: logo ngang SVG sáng/tối trên desktop/mobile, symbol 48px ở sidebar hẹp, icon dùng currentColor. Không đặt logo tối lên nền sáng hoặc cắt méo lockup. Giữ palette xanh của UI, màu cam dùng trong dấu thương hiệu.
- Không khôi phục lỗi store/IDB/import hoặc bộ mã V1. Giữ engine, schema/ID/dữ liệu, client/server và luồng đọc-tra-lưu-học của Next.

Nguồn UI cũ Today/Shell/Knowledge/Logo/Card được lấy từ source map cache đã giữ; chỉ UI được phục hồi. CSS bố cục liên quan được khôi phục trong `src/shared/v2-layout.css`, dùng chung với styles UI/learning hiện tại.

# LetterSlotsInput

Phạm vi: bước 1 trong bảng tám dạng đã chốt. Dùng data V1 hiện tại, chưa mở thêm bộ nội dung hoặc thay luật SRS.

Thiết kế: một input native giữ bàn phím, paste, chọn/xóa và form submit; các ô chữ là lớp hiển thị, không phải một input cho mỗi chữ. Ô rỗng chỉ cho biết độ dài/cấu trúc từ, không lộ chữ đáp án. Hiển thị cả phần nhập dư để người học sửa được; không cắt đáp án theo số ô. Có focus rõ và xuống dòng ở mobile. Dùng lại label/ref và điểm chấm hiện tại, không ghi nội dung đang gõ vào IndexedDB trước khi submit.

- [x] RED E2E: có ô chữ trong câu nhập; paste/sửa/backspace/Enter; từ có khoảng trắng; không cuộn ngang ở 360px; feedback/reload không tính trùng.
- [x] Tạo component chung `src/components/LetterSlotsInput.tsx`, tích hợp Study và CSS theo giao diện V2.
- [x] Build/lint/typecheck/unit và E2E production; xem screenshot desktop/mobile.
- [x] Ghi trạng thái bước 1 trong tài liệu, giữ phần chưa triển khai rõ ràng.

Làm trong checkout hiện tại theo yêu cầu giữ một thư mục/app. Không tự migrate sang hai skill trong bước nhập liệu này. Những sửa event/Question đang có ở local được giữ và kiểm tra cùng.

Kết quả: test ô chữ RED trên bản cũ; test hàng ô mobile RED trước chỉnh kích thước. Sau sửa: 29 unit tests, 30 E2E desktop/mobile, build/lint/typecheck/format đều qua. Đã xem screenshot; agreement nằm một hàng ở 360px, cụm có khoảng trắng và phần nhập dư sửa được. Tự rà soát; chưa có reviewer độc lập mới.

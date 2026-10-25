# Kế hoạch tổ chức lại Vocab Learn

> Kế hoạch cũ, được thay thế bởi [kế hoạch xây mới từ đầu](BUILD-FROM-SCRATCH.md) theo hướng mới ngày 24/10/2026.

Trạng thái: đề xuất để triển khai từng giai đoạn, chưa thay đổi ứng dụng.
Ngày: 24/10/2026.

## 1. Mục tiêu sản phẩm

Giả định làm việc: ưu tiên học 600 từ TOEIC theo sách hiện có; cụm từ đời thường và kiến thức mở rộng là nội dung phụ. Tiếp tục dùng React, TypeScript, Vite, Zustand và Firebase hiện tại.

Người học mở web phải biết hôm nay nên làm gì, bắt đầu nhanh, và thấy rõ kết quả sau buổi học.

Luồng chính được đề xuất:

**Hôm nay → ôn từ đến hạn → học nhóm từ mới → kiểm tra ngắn → xem kết quả và lịch ôn.**

Có thể vào riêng từng phần; kết thúc lượt ôn là một điểm dừng hợp lệ, người học có thể tiếp tục học từ mới hoặc kết thúc buổi. Buổi học giữ nguyên bộ nội dung và phạm vi đã chọn.

## 2. Những điểm cần xử lý trong bản hiện tại

Nhận định dựa trên README và code; chưa phải kết quả kiểm tra giao diện trực tiếp hoặc nghiên cứu người dùng.

| Hiện tại                                                                                          | Vấn đề cần giải quyết                                     | Hướng xử lý                                                                      |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `Topics.tsx` và `CoursePath.tsx` cùng có danh sách bài và hành động học                           | Hai lối vào cùng một nội dung, khó xác định nơi học chính | Một mục Bài học; chủ đề là cách nhóm, lộ trình là cách hiển thị tiến độ          |
| `Practice.tsx` gom trường từ, flashcard, bài tập và tiếng Anh đời thường                          | Trộn việc tra cứu, phương thức học và bộ nội dung         | Đặt tra cứu vào Thư viện; dùng flashcard và câu hỏi trong buổi học               |
| `Review.tsx` gom từ đang học/hay sai; Dashboard có hàng đợi đến hạn riêng                         | Nhãn “cần ôn” có hai nghĩa                                | Phân biệt Đến hạn, Hay sai và Đang học; mỗi nhóm có số đếm đúng phạm vi          |
| Dashboard có ôn tập, từ mới, chặng học, bài tiếp theo, mục tiêu, lịch hoạt động và nhiều thống kê | Nhiều hành động cạnh tranh trên trang vào                 | Hôm nay ưu tiên một hành động; chuyển thống kê chi tiết sang Tiến độ             |
| Trường từ, từ loại, họ từ, quiz và bài sách đã có nhiều nội dung                                  | Dễ mở rộng thêm trước khi luồng học đủ rõ                 | Ưu tiên tổ chức và tái sử dụng nội dung; bổ sung sau khi luồng chính đạt yêu cầu |

## 3. Phạm vi bản tổ chức lại đầu tiên

| Nhóm                                         | Quyết định đề xuất                                            |
| -------------------------------------------- | ------------------------------------------------------------- |
| 600 từ, nghĩa, IPA, phát âm, ví dụ, bản dịch | Giữ, đặt làm nội dung cốt lõi                                 |
| Họ từ, cấu tạo, đồng nghĩa, trái nghĩa       | Giữ; hiển thị phần cơ bản trước, chi tiết mở khi cần          |
| Chủ đề và lộ trình                           | Gộp vào Bài học                                               |
| Flashcard và quiz tự động                    | Tái sử dụng trong buổi học; cho phép luyện riêng từ trang bài |
| Ôn đến hạn, từ hay sai                       | Giữ, đặt nhãn và cách tính riêng                              |
| Bài tập trong sách                           | Giữ trong trang chi tiết bài học                              |
| Đăng nhập, hồ sơ, đồng bộ, sao lưu           | Giữ; kiểm tra tương thích dữ liệu trước khi đổi mô hình       |
| Cụm từ đời thường, gốc từ, kiến thức nền     | Giữ truy cập trong Thư viện; chưa mở rộng trong giai đoạn đầu |
| Hiệu ứng và thống kê nâng cao                | Hoàn thiện sau luồng học chính                                |

Các giới hạn hiện tại như 10 từ mới/ngày, 20 từ ôn/ngày, lịch 1–60 ngày, xác nhận thuộc và kiểm tra mở bài phải được ghi thành quy tắc. Giai đoạn đầu giữ hành vi hiện có; mọi thay đổi cần nêu rõ tác động lên tiến độ và lịch ôn. Đặc biệt, khi đạt giới hạn ngày, giao diện cần phân biệt “hết lượt hôm nay” với “không còn từ đến hạn”.

## 4. Cấu trúc màn hình đề xuất

Thanh điều hướng chính gồm bốn mục. Tìm kiếm luôn dễ truy cập; hồ sơ và cài đặt ở menu tài khoản.

| Mục      | Trả lời câu hỏi               | Nội dung chính                                                                       |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| Hôm nay  | Bây giờ nên học gì?           | Hành động ưu tiên theo trạng thái, từ đến hạn, từ mới còn lại, tiếp tục buổi dang dở |
| Bài học  | Tôi đang học đến đâu?         | 50 bài nhóm theo chủ đề, bài hiện tại, chi tiết bài, bài tập sách                    |
| Thư viện | Tôi muốn tìm hiểu từ gì?      | Tìm từ, chi tiết từ, họ từ, gốc từ, nội dung đời thường và kiến thức nền             |
| Tiến độ  | Việc học có tiến triển không? | Tiến độ từ/bài, độ chính xác, lịch hoạt động, nhóm hay sai                           |

Hôm nay chọn hành động chính theo thứ tự: tiếp tục buổi dang dở → ôn đến hạn còn trong lượt hôm nay → học từ mới → thông báo đã xong và gợi ý luyện thêm. Xử lý riêng người chưa học, hết từ mới, chạm giới hạn và lỗi tải dữ liệu.

Trang chi tiết từ hiển thị trước: từ, từ loại, phát âm, nghĩa, một ví dụ có dịch. Họ từ, đồng/trái nghĩa và cấu tạo được mở theo nhu cầu. Tra cứu từ một câu hỏi phải quay về đúng câu đang làm.

## 5. Quy trình triển khai và điều kiện qua từng giai đoạn

### Giai đoạn 1 — Kiểm kê và chốt luật học

- Lập danh sách route, tính năng, dữ liệu nguồn, dữ liệu sinh và nơi ghi tiến độ.
- Ghi sơ đồ luồng hiện tại; xác định lối vào trùng và hành vi cần giữ.
- Chốt nghĩa của trạng thái từ, hoàn thành bài, điểm kiểm tra và mục tiêu ngày.
- Xác định dữ liệu cần bảo toàn và cách kiểm tra sao lưu/khôi phục trước migration.

**Đầu ra:** phạm vi, ma trận giữ/gộp/chuyển vị trí và bảng quy tắc học.

**Qua giai đoạn khi:** một từ và một bài có định nghĩa tiến độ thống nhất ở mọi màn hình; các thay đổi hành vi được ghi riêng với thay đổi giao diện.

### Giai đoạn 2 — Vẽ luồng và wireframe

- Vẽ Hôm nay, Bài học, chi tiết bài, chi tiết từ, màn học, kết quả và Tiến độ.
- Vẽ luồng người mới, người quay lại có từ đến hạn và người quay lại buổi dang dở.
- Bao phủ trạng thái trống, tải, lỗi, hết lượt và kết thúc buổi sớm.
- Làm wireframe điện thoại trước, sau đó desktop; chỉ rõ nút chính và bước quay lại.

**Đầu ra:** sơ đồ điều hướng và prototype đủ để đi qua một buổi học.

**Qua giai đoạn khi:** từ Hôm nay bắt đầu học trong tối đa hai thao tác; mỗi bước biết mình đang làm gì và làm gì tiếp; tra từ rồi quay lại không mất câu đang làm. Đây là mục tiêu kiểm chứng, chưa phải kết quả đo hiện tại.

### Giai đoạn 3 — Chốt giao diện dùng chung

- Chốt màu, chữ, khoảng cách, độ rộng nội dung và quy tắc responsive.
- Chuẩn hoá nút, ô nhập, thẻ từ, tiến độ, thông báo và trạng thái đáp án.
- Dùng một hệ thống nhãn cho trạng thái học trên tất cả các trang.
- Kiểm tra khả năng đọc, focus bàn phím, thao tác chạm, sáng/tối và giảm chuyển động.

**Đầu ra:** quy tắc giao diện và các thành phần dùng chung, áp dụng vào prototype.

**Qua giai đoạn khi:** màn học dễ đọc và dùng được trên điện thoại; nội dung và hành động chính rõ hơn phần trang trí.

### Giai đoạn 4 — Làm một buổi học hoàn chỉnh

- Chọn một bài hiện có và làm luồng xem từ → tự nhớ → câu hỏi ngắn → kết quả → lịch ôn.
- Tái sử dụng dữ liệu, phát âm, trình sinh câu hỏi và lịch ôn hiện tại sau khi kiểm tra phù hợp.
- Tách cấu hình buổi học, trạng thái câu hiện tại và kết quả lưu bền.
- Phân biệt hoạt động học, điểm bài tập và sự kiện đủ điều kiện cập nhật SRS; trả lời lại trong cùng lượt không tự động được tính thành một lần ôn cách quãng mới.
- Lưu điểm tiếp tục và kiểm tra reload, thoát sớm, quay lại, nhấn nút nhanh để tránh ghi kết quả lặp.

**Đầu ra:** một luồng chạy thật từ đầu đến cuối trên dữ liệu thật.

**Qua giai đoạn khi:** kết quả và lịch ôn được ghi đúng một lần; tiếp tục đúng vị trí; bài, từ và phạm vi không đổi ngoài ý muốn.

### Giai đoạn 5 — Mở rộng và chuyển dần màn hình cũ

- Áp dụng luồng vào 50 bài; nối hàng đợi ôn đến hạn và nhóm hay sai.
- Gộp mục lục/lộ trình; đưa bài sách vào chi tiết bài, nội dung mở rộng vào Thư viện.
- Dùng chung cách tính trạng thái và số đếm giữa Hôm nay, Bài học và Tiến độ.
- Nếu đổi cấu trúc lưu trữ, bổ sung phiên bản dữ liệu, migration có thể chạy lại an toàn và phương án phục hồi.
- Duy trì hoặc chuyển hướng link cũ tới đúng nội dung tương ứng.

**Đầu ra:** cấu trúc điều hướng mới bao phủ nội dung đã có.

**Qua giai đoạn khi:** hồ sơ cũ giữ tiến độ; link từ/bài cũ còn dùng được; đồng bộ nhiều thiết bị không làm mất kết quả.

### Giai đoạn 6 — Kiểm tra trên bản thử nghiệm

- Chạy typecheck, lint, test logic hiện có và build; cập nhật kiểm tra có ý nghĩa cho hành vi thay đổi.
- Kiểm tra các luồng: người mới, có từ đến hạn, hết lượt ngày, tiếp tục buổi, mở đáp án, mất mạng và đăng nhập/đăng xuất.
- Kiểm tra dữ liệu cũ, import/export, đồng bộ xung đột và qua ngày ở múi giờ sử dụng.
- Kiểm tra điện thoại, desktop, bàn phím, tương phản và không tràn ngang.
- Dùng thử vài buổi học; ghi các chỗ phải đoán nút hoặc chọn lại phạm vi.

**Đầu ra:** bản preview và danh sách lỗi đã xử lý hoặc giới hạn còn lại.

**Qua giai đoạn khi:** luồng chính hoàn tất, dữ liệu được bảo toàn, số đếm nhất quán và không còn lỗi chặn học.

### Giai đoạn 7 — Phát hành và cải tiến

- Chốt phiên bản, kế hoạch quay lại và kiểm tra tương thích dữ liệu khi rollback.
- Triển khai sau khi bản preview đạt điều kiện; kiểm tra lại học, lưu và đồng bộ sau phát hành.
- Theo dõi lỗi và phản hồi; ưu tiên trở ngại trong buổi học trước tính năng mới.

**Đầu ra:** bản chạy thật và backlog có thứ tự ưu tiên.

## 6. Ranh giới trách nhiệm trong code

Ưu tiên tái cấu trúc theo trách nhiệm khi đi qua từng luồng; giữ stack hiện có.

- **Nội dung:** bài, từ, ví dụ, họ từ và bài tập; giữ nguyên ID ổn định.
- **Buổi học:** chọn từ/câu, thứ tự, câu hiện tại, trả lời, kết quả và tiếp tục.
- **Tiến độ và lịch ôn:** quy tắc trạng thái, sự kiện học đủ điều kiện, thời điểm ôn và số đếm dùng chung.
- **Lưu trữ và tài khoản:** hồ sơ, lưu máy, cloud, merge, phiên bản dữ liệu và migration.
- **Giao diện:** điều hướng, thành phần trình bày và tương tác; đọc kết quả từ các phần trên.

## 7. Thứ tự ưu tiên thực hiện

1. Kiểm kê và chốt quy tắc học.
2. Wireframe Hôm nay và một buổi học.
3. Giao diện dùng chung đủ cho luồng đó.
4. Một bài chạy hoàn chỉnh và lưu đúng tiến độ.
5. Ôn đến hạn, danh sách bài và chuyển tiếp dữ liệu cũ.
6. Thư viện, tiến độ, nội dung phụ và hoàn thiện trình bày.
7. Kiểm tra bản preview rồi phát hành.

Kế hoạch này chưa thực hiện thay đổi code, thay đổi dữ liệu học hoặc triển khai website.

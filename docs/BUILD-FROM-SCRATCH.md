# Vocab Learn — kế hoạch nền tảng học ngôn ngữ

Cập nhật: 25/10/2026. App Next.js App Router, Tailwind/shadcn và MDX hiện ở thư mục gốc. Luồng M0 đọc/tra/lưu/học/kết quả đã có; xem [báo cáo hiện tại](implementation/SINGLE-APP.md). Chưa triển khai Firebase Auth/cloud sync hay deploy Vercel.

**Quyết định mới nhất:** lấy V2 làm gốc và khôi phục giao diện trước đợt minimal: hero xanh, thẻ từ, sidebar và biểu đồ. Gộp về một app ở root; tận dụng dữ liệu/pipeline V1, xóa source app cũ. Logo dùng ảnh người dùng cung cấp. Báo cáo minimal chỉ còn là lịch sử, đã bị thay thế bởi quyết định này.

Quyết định hiện tại: Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui; Firebase Auth/Firestore; IndexedDB; Vercel. Bộ TOEIC là nội dung đầu tiên, không phải giới hạn của sản phẩm.

Tài liệu này là kế hoạch sản phẩm đích, thay kế hoạch tổ chức lại giao diện. Tái sử dụng phần logic/dữ liệu local đã kiểm tra khi phù hợp; chuyển giao diện và routing sang stack đã chọn, bổ sung luồng kiến thức/tra/lưu và chuyển tiến độ cũ qua bước riêng. Không coi nội dung kế hoạch là tính năng đã triển khai.

## 1. Mục tiêu và giả định

Xây nền tảng kết hợp kiến thức nền tảng, đọc và tra từ trong ngữ cảnh, lưu từ và luyện ôn. Giúp người học biết hôm nay nên học gì, hiểu nội dung, tự nhớ lại và quay lại ôn theo lịch.

Ba phần liên kết: Kiến thức · Tra cứu · Luyện tập. Bắt đầu bằng tiếng Anh cho người Việt; mô hình nội dung sẵn sàng cho nhiều bộ học và tiếng Trung về sau.

Luồng chính: mở web → tiếp tục buổi dang dở hoặc ôn đến hạn → học từ mới → kiểm tra → kết quả → ôn lại vào ngày sau.

Luồng nội dung: mở bài kiến thức → bấm từ/cụm → xem nghĩa hoặc mở nguồn tra ngoài → lưu từ → học/ôn → quay lại đúng vị trí đọc.

Kiểm tra trong lượt học khác với kiểm tra cuối bài để xác nhận qua bài. M0/V1 có câu hỏi trong lượt; bài kiểm tra cuối bài riêng thuộc V1.1.

Mỗi lượt học/ôn là một đơn vị độc lập. Có thể dừng sau một lượt; không cần đi hết mọi phần mới được tính kết quả.

**Giả định làm việc:**

- Người dùng V1: người Việt học tiếng Anh; dùng cả điện thoại và máy tính. TOEIC 50 bài/600 từ là bộ nội dung đầu tiên, không hardcode số lượng vào logic.
- Phân biệt ngôn ngữ đang học, ngôn ngữ giải thích và ngôn ngữ giao diện. Tiếng Trung được kiểm chứng ở V2 bằng bộ nhỏ, chưa phát hành ngay trong V1.
- V1 phục vụ cá nhân và nhóm nhỏ, chưa có lớp học, giáo viên, thanh toán hoặc nhiều tổ chức.
- Một tài khoản là một người học; nhiều hồ sơ dùng chung một tài khoản để sau.
- Học thử không cần đăng nhập; tài khoản dùng để đồng bộ nhiều thiết bị.
- Dữ liệu cũ là nguyên liệu đầu vào, phải kiểm tra trước khi dùng.
- Xây bản mới bằng Next.js App Router + React + TypeScript, Tailwind CSS + shadcn/ui; giữ Firebase Authentication và Firestore; lưu local bằng IndexedDB; deploy Vercel. Chọn và khóa phiên bản tương thích khi khởi tạo.
- Next.js được chọn cho các trang kiến thức công khai và ứng dụng học trong cùng sản phẩm; không vì tăng số từ hoặc vì giả định AI viết Next ít lỗi hơn.
- Các bài công khai hướng tới SEO; dữ liệu cá nhân và kết quả học không đưa vào nội dung được index. noindex/robots.txt chỉ điều khiển lập chỉ mục, không thay xác thực hoặc phân quyền truy cập.
- Các ngưỡng học dưới đây là đề xuất, cần chốt bằng đặc tả và dùng thử; không coi quy tắc cũ là yêu cầu bắt buộc.

| Mục tiêu                  | Cách kiểm tra ở bản mới                                                         |
| ------------------------- | ------------------------------------------------------------------------------- |
| Bắt đầu nhanh             | Từ Hôm nay vào lượt học trong tối đa hai thao tác, không tính đăng nhập lần đầu |
| Luồng dễ hiểu             | Mỗi bước học có một hành động chính và chỉ rõ vị trí trong lượt                 |
| Kết quả đáng tin          | Reload, nhấn lặp, retry và đồng bộ không tính trùng                             |
| Dùng được trên điện thoại | Không cuộn ngang ở 360px, không phụ thuộc hover                                 |
| Tiến độ rõ nghĩa          | Phân biệt đã học, đến hạn, nhớ ổn định và điểm bài tập                          |
| Đọc và tra liên tục       | Đóng bảng tra vẫn ở đúng đoạn/câu; mở tra cứu không tự tăng tiến độ             |
| Mở rộng nội dung          | Thêm bộ học bằng dữ liệu và cấu hình, không sửa engine học                      |
| Giữ dữ liệu cũ            | Import có xem trước, báo cáo và không âm thầm bỏ mục không khớp                 |

Đã có kiểm tra cho một số hành vi ở bản local Vite; bằng chứng và giới hạn nằm trong [báo cáo local](implementation/IMPLEMENTATION.md). Chưa nghiệm thu các chỉ tiêu cho bản Next.js và luồng đọc/tra/lưu mới; không dùng kết quả của bản Vite để khẳng định bản Next đã đạt.

## 2. Phạm vi theo phiên bản

### M0 — bản học thử nội bộ

Một bài TOEIC thật và một bài kiến thức ngắn, với 5–10 từ/cụm được liên kết tới mục từ đã kiểm tra. Có Hôm nay, chi tiết bài, bài kiến thức, bảng tra từ, màn học, câu hỏi và kết quả. Luồng M0: đọc → tra → lưu vào bộ cá nhân → học → kết quả → reload/tiếp tục. Lưu trên máy; chưa bắt buộc đăng nhập, API từ điển, đồng bộ, CMS hoặc ngôn ngữ thứ hai. Dữ liệu mẫu có ít nhất một cụm từ và một biến thể như worked → work. M0 chạy local trước, có thể chia sẻ preview sau khi đạt kiểm tra cơ bản.

### V1 — dùng học hằng ngày

| Nhóm          | Bao gồm                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Nội dung      | Bộ TOEIC đầu tiên 50 bài/600 từ, từ loại, nghĩa, IPA nếu có, ví dụ có dịch, họ từ cơ bản; bộ/bài được lấy từ dữ liệu    |
| Kiến thức     | Nhóm bài nền tảng tiếng Anh về từ loại, cấu trúc câu, thì hoặc phát âm; chốt danh sách nhỏ ở G0; mỗi bài có URL ổn định |
| Tra trong bài | Bảng nghĩa cho từ/cụm đã gắn ID; từ chưa có dữ liệu có nút tra ngoài; giữ vị trí đọc và cho lưu mục đủ dữ liệu          |
| Bộ cá nhân    | Lưu từ từ bài đọc/tra cứu; từ tự nhập thiếu nghĩa được giữ ở nháp và bổ sung trước khi sinh câu hỏi                     |
| Học mới       | Chọn bài, học nhóm từ, phát âm nếu thiết bị hỗ trợ, kiểm tra và xem kết quả                                             |
| Ôn            | Hàng đợi đến hạn, lượt ngắn, luyện lại từ sai, lịch ôn được lưu                                                         |
| Câu hỏi       | Chọn nghĩa, điền từ trong câu, tự gõ; chỉ bật khi dữ liệu đủ và đáp án rõ                                               |
| Thư viện      | Tìm từ/biến thể/nghĩa Việt; chi tiết từ; quay lại đúng vị trí trước đó                                                  |
| Tiến độ       | Tiến độ từ/bài, kết quả lượt, hoạt động theo ngày, nhóm hay sai                                                         |
| Lưu trữ       | Lưu máy, export/import, tiếp tục lượt, chuyển tiến độ cũ                                                                |
| Tài khoản     | Google, trạng thái đồng bộ, dữ liệu riêng theo người, chuyển dữ liệu học thử rõ ràng                                    |
| Giao diện     | Mobile/desktop, sáng/tối, bàn phím, loading/empty/error, giảm chuyển động                                               |

M0 chạy local trước. Chỉ phát hành V1 thay web cũ khi đồng bộ và chuyển dữ liệu đạt yêu cầu.

### V1.1 — mở rộng sau khi lõi ổn định

- Mở rộng bộ tiếng Anh: giao tiếp, chủ đề hoặc trình độ; không phụ thuộc cấu trúc cố định của TOEIC.
- Biên tập/import nội dung hàng loạt; tra cứu qua API hoặc bộ dữ liệu có quyền sử dụng nếu đã kiểm chứng chất lượng/chi phí.
- Bài tập sách: Words in Context, Part 5, Part 6, Word Review; chỉ dùng nội dung có quyền phát hành.
- Họ từ nâng cao, đồng/trái nghĩa trong ngữ cảnh, cấu tạo và gốc từ.
- Tự chọn dạng luyện, nghe rồi gõ, kiểm tra cuối bài và kiểm tra định kỳ.
- Công cụ thêm/sửa từ đầy đủ. V1 vẫn cần nhập, giữ và tra cứu được từ tự thêm từ web cũ.

### V2 — chỉ làm khi có nhu cầu

Thử một bộ tiếng Trung nhỏ trước khi phát triển đầy đủ: pinyin, thanh điệu, giản/phồn thể, quy tắc chấm riêng. Sau đó mới mở rộng kỹ năng nghe/viết và ngôn ngữ khác. CMS, sơ đồ quan hệ từ, nhiều hồ sơ trên máy, AI hỗ trợ biên soạn, game, bảng xếp hạng và lớp học chỉ làm khi có nhu cầu. AI tạo bản nháp; nội dung học phát hành cần được kiểm tra.

Không cần đưa toàn bộ tính năng cũ trở lại V1. Dữ liệu lịch sử thuộc tính năng chưa có giao diện vẫn phải được giữ trong phần tương thích hoặc bản lưu có thể khôi phục.

## 3. Màn hình và luồng sử dụng

Điều hướng chính: Hôm nay · Bộ học · Kiến thức · Thư viện · Tiến độ. Trên mobile thử bottom navigation cho Hôm nay/Bộ học/Kiến thức/Thư viện; Tiến độ vào menu nếu cần, chốt ở prototype. Hồ sơ/cài đặt nằm trong menu tài khoản. Màn học có bố cục tập trung và cách thoát giữ tiến độ.

| Màn               | Nội dung và hành động chính                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Hôm nay           | Lượt dang dở, từ đến hạn, mục tiêu từ mới; chọn Tiếp tục / Ôn ngay / Học mới                 |
| Bộ học / Bài học  | Chọn bộ/ngôn ngữ; danh sách bài từ dữ liệu, bài gần nhất, tiến độ; V1 chỉ bật tiếng Anh      |
| Kiến thức         | Danh mục bài công khai, chủ đề và trình tự gợi ý                                             |
| Bài kiến thức     | Nội dung, ví dụ, từ/cụm có thể tra, vị trí đọc; bài tập ngắn nếu có                          |
| Bảng tra          | Nghĩa trong ngữ cảnh, phát âm nếu có, nguồn và nút lưu/tra ngoài; đóng trả focus đúng vị trí |
| Bộ cá nhân        | Các từ đã lưu, trạng thái nháp/đủ dữ liệu, học hoặc bổ sung nghĩa                            |
| Chi tiết bài      | Danh sách từ và các số đếm; học tiếp hoặc ôn bài                                             |
| Thư viện          | Tìm kiếm, bộ lọc tối thiểu, danh sách từ                                                     |
| Chi tiết từ       | Từ, từ loại, nghĩa, phát âm, ví dụ, họ từ; nghe/luyện/quay lại                               |
| Màn học           | Một từ hoặc một câu hỏi, tiến độ lượt, phản hồi                                              |
| Kết quả           | Số đúng, từ cần luyện lại, trạng thái lưu, lịch ôn tiếp                                      |
| Tiến độ           | Tiến độ từ/bài, hoạt động, nhóm hay sai                                                      |
| Tài khoản/cài đặt | Đăng nhập, đồng bộ, mục tiêu, múi giờ, theme, sao lưu                                        |

Thứ tự gợi ý trên Hôm nay: tiếp tục lượt hợp lệ → ôn đến hạn → học mới → đã đạt mục tiêu và có thể luyện thêm. Luôn hiển thị tổng tồn đến hạn và số từ của lượt kế tiếp. Người dùng vẫn có thể chọn học mới khi có từ cần ôn.

Các luồng phải có prototype trước khi code:

1. Người mới → học thử → kết quả → đặt mục tiêu/đăng nhập.
2. Người quay lại → ôn đến hạn → kết thúc hoặc học thêm.
3. Đang trả lời → tra từ → trở lại đúng câu.
4. Reload/thoát → tiếp tục đúng lượt, câu và phản hồi đã lưu.
5. Mất mạng → lưu máy → báo chờ đồng bộ → mạng trở lại.
6. Import dữ liệu cũ → xem trước → nhập → đối chiếu.
7. Đăng xuất/đổi tài khoản → dữ liệu từng người tách đúng.
8. Đọc bài → tra từ/cụm → lưu từ → học → trở lại vị trí đọc.
9. Không tìm được nghĩa → mở nguồn ngoài hoặc lưu nháp → quay lại không mất bài.
10. Chuyển bộ học → chỉ đổi phạm vi hiển thị; không trộn tiến độ giữa các ngôn ngữ.

## 4. Quy tắc học đề xuất

Viết thành đặc tả có ví dụ trước khi triển khai. Mọi thay đổi so với bản cũ có phiên bản chính sách riêng.

### Từ mới và lượt học

- Mục tiêu gợi ý 10 từ mới/ngày, một lượt 5–10 từ; đây là giá trị ban đầu để dùng thử.
- Tính từ mới khi thực sự bắt đầu học; mở trang tra cứu không tiêu mục tiêu.
- Một mục học theo nghĩa/kỹ năng chỉ được ghi nhận lần bắt đầu đầu tiên; học lại vào ngày khác không biến nó thành từ mới. Mục tiêu ngày đếm các mục bắt đầu trong ngày đó. Khi đồng bộ nhiều thiết bị, khử trùng sự kiện bắt đầu để không tính hai lần.
- Bộ từ/câu được chốt khi bắt đầu; thay bộ lọc bên ngoài không đổi câu đang làm.
- Xem nội dung, tự nhớ và trả lời kiểm tra là hoạt động khác nhau; không tính lượt xem như nhớ đúng.
- Kết thúc sớm vẫn giữ phần đã hoàn thành.

### Trạng thái và tiến độ

| Trạng thái  | Ý nghĩa                                             |
| ----------- | --------------------------------------------------- |
| Chưa học    | Chưa có hoạt động học hợp lệ                        |
| Đang học    | Đã bắt đầu, còn cần củng cố                         |
| Đang ôn     | Đã có kết quả kiểm tra và theo lịch                 |
| Nhớ ổn định | Đạt điều kiện chính sách ôn; vẫn được lên lịch tiếp |

- Đến hạn và Hay sai là nhóm lọc; một từ nhớ ổn định vẫn có thể đến hạn.
- Tiến độ bài hiển thị số từ đã bắt đầu/tổng và số từ nhớ ổn định/tổng.
- Đã đi qua bài: mọi từ đã hoàn thành lượt giới thiệu và ít nhất một bước kiểm tra; không đồng nghĩa nhớ hết.
- Điểm bài tập/mini test tách khỏi trạng thái từ.
- V1 đề xuất mở mọi bài; bài tiếp theo là gợi ý. Dữ liệu mở khoá/checkpoint cũ vẫn được bảo toàn như lịch sử.

### Câu hỏi và chấm

- Ba dạng chính: nhận diện nghĩa, điền câu, tự nhớ; không bắt chọn nhiều chế độ trước khi học.
- Mỗi câu khai báo đáp án và biến thể hợp lệ; chuẩn hoá chữ hoa/thường và khoảng trắng.
- Gần đúng có phản hồi riêng, không tự nâng lịch như đúng. Chỉ bật khi có ngưỡng, ví dụ và test rõ.
- Câu đã lộ đáp án chỉ tính luyện lại, không tính một lần tự nhớ thành công độc lập.
- Thiếu dữ liệu hoặc nhiều đáp án hợp lý: đổi dạng hoặc bỏ câu, không cố sinh đủ số lượng.
- Phát âm không hỗ trợ/lỗi vẫn cho tiếp tục bằng chữ.

### Tra từ, nội dung và ngôn ngữ

- Tra nghĩa chỉ là hoạt động tra cứu, không tự tính từ mới hoặc nhớ đúng. Lưu vào bộ cá nhân không đồng nghĩa đã học.
- Trong câu hỏi đang chấm, mở nghĩa có thể lộ đáp án: ghi trạng thái được hỗ trợ; sau đó không tính như lần tự nhớ độc lập.
- Bài tự biên soạn gắn từ/cụm với itemId/senseId và phiên bản nội dung; không suy nghĩa chỉ từ chuỗi chữ. Phân biệt từ đơn, cụm như look up và biến thể từ. Ở M0, tác giả gắn tường minh worked → work trong bài mẫu; chưa cần xây bộ phân tích hình thái tự động.
- Thiếu dữ liệu: dùng liên kết tra ngoài có cấu hình nhà cung cấp; không scrape website hoặc nhúng iframe mặc định. Giữ nguyên câu trả lời/vị trí khi mở tab ngoài.
- V1 chấm tiếng Anh theo quy tắc đã đặc tả. Chọn chính sách theo ngôn ngữ và kỹ năng; không mặc định bỏ dấu thanh pinyin hoặc đồng nhất giản/phồn thể.
- Một mục từ canonical dùng trong nhiều bộ chia sẻ tiến độ theo nghĩa/kỹ năng đã chốt; từ cá nhân chưa đối chiếu được giữ ID riêng, không tự gộp theo chữ.
- M0/V1 chỉ triển khai kỹ năng hiện có. Khóa tiến độ ổn định gồm người học, nghĩa chuẩn đã xác định (senseId, hoặc itemId khi mục đó chỉ có một nghĩa) và skill; ngôn ngữ được xác định từ mục từ. Lưu policyVersion trong bản ghi/sự kiện, không mặc định đưa vào khóa: đổi chính sách cần migration có quy tắc, không tạo tiến độ trắng. Bổ sung nghe/viết dùng skill riêng; đổi từ itemId sang senseId phải có ánh xạ giữ tiến độ.

### Ôn ngắt quãng

- Dùng lịch đơn giản để khởi đầu: 1, 3, 7, 14, 30, 60 ngày; chưa đổi thuật toán trong V1.
- Đúng trong lượt ôn đủ điều kiện: tăng một bậc; sai: về bậc đầu và đưa vào luyện lại.
- Nhớ ổn định đề xuất là đạt bậc ứng với mốc 30 ngày bằng kiểm tra hợp lệ. Nhãn diễn tả chính sách ứng dụng, không bảo đảm không quên.
- Sau bước kiểm tra của lượt học mới, lên lịch ngày sau; đúng thêm trong cùng lượt không tăng nhiều bậc.
- Mỗi từ tối đa một lần cập nhật lịch từ lượt ôn chính trong một ngày học; các lần sau là luyện thêm. Nếu một lượt có nhiều câu cho một từ, tổng hợp thành một kết quả; đề xuất có câu sai thì kết quả ôn từ đó là cần củng cố.
- Từ sai có thể luyện lại ngay; đúng lại không xoá lịch sử sai hoặc tăng tiếp bậc trong ngày.
- Mỗi lượt ôn tối đa 20 từ, vẫn thấy toàn bộ tồn và có thể mở lượt tiếp theo. Độ dài lượt không phải giới hạn giấu hàng đợi.
- Ngày học theo múi giờ hồ sơ, mặc định Asia/Ho_Chi_Minh; sự kiện lưu thời điểm UTC.
- Chốt thêm: ranh giới ngày, đổi múi giờ, ưu tiên quá hạn, sự kiện offline và hai thiết bị cùng ôn một từ. Các trường hợp này phải có ví dụ trước bước đồng bộ.

## 5. Mô hình và pipeline dữ liệu

| Thực thể                             | Vai trò / trường chính                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Language / LearningProfile           | Ngôn ngữ học, ngôn ngữ giải thích, ngôn ngữ UI; một tài khoản có tiến độ tách theo ngôn ngữ, không phải nhiều người chung hồ sơ |
| Course / Collection / Topic / Lesson | ID ổn định, ngôn ngữ, chủ sở hữu, thứ tự, tiêu đề; quan hệ bài/mục học; bộ TOEIC và bộ cá nhân cùng nền dữ liệu                 |
| VocabularyItem                       | ID, languageCode, loại word/phrase, dạng viết, từ loại, liên kết nghĩa; metadata phát âm có kiểu theo ngôn ngữ                  |
| Sense / Example / Translation        | ID nghĩa, nội dung gắn languageCode; ví dụ và bản dịch theo ngôn ngữ, biến thể hợp lệ; không cố định meaningVi                  |
| Article / ContentLink                | Slug, chủ đề, locale, phiên bản, draft/published; liên kết đoạn/từ/cụm tới itemId/senseId                                       |
| Source / License                     | Nguồn, tác giả/nhà cung cấp, quyền sử dụng, attribution và giới hạn cache/phân phối nếu có                                      |
| PersonalItem / ReadingPosition       | Mục đã lưu, câu nguồn, trạng thái draft/ready; vị trí đọc theo người và phiên bản bài                                           |
| Relation                             | Mục nguồn/đích, loại quan hệ, ngữ cảnh khi cần                                                                                  |
| LearnerSettings                      | Mục tiêu, múi giờ, theme, phiên bản                                                                                             |
| WordProgress                         | Người học, item/sense, ngôn ngữ, kỹ năng, trạng thái, bậc, dueAt, lần học gần nhất, phiên bản chính sách                        |
| StudySession                         | ID, loại, câu/từ đã chọn, vị trí, phản hồi, phiên bản nội dung                                                                  |
| AnswerEvent                          | ID duy nhất, sessionId, questionId, itemId, kết quả, thời điểm, thiết bị                                                        |
| DailySummary                         | Ngày/múi giờ, từ mới, lượt ôn, câu đúng/sai; có thể dựng lại                                                                    |
| ImportRecord                         | ID import, schema nguồn/đích, kết quả, mục chưa ánh xạ                                                                          |

Nội dung và tiến độ tách riêng. Không dùng chữ của từ làm khoá chính; cùng chữ nhưng khác nghĩa/mục có thể có ID khác nhau.

**Pipeline:**

1. Kiểm kê data/, tools/, src/data/ cũ; phân biệt nguồn và output sinh.
2. Chuyển sang schema mới, giữ ánh xạ ID cũ → mới.
3. Validator: trường bắt buộc, ID trùng, liên kết hỏng, bài/từ thiếu, đáp án không hợp lệ.
4. Đọc tay bài mẫu có từ đa nghĩa, họ từ và dữ liệu thiếu; sửa ở nguồn.
5. Chạy toàn bộ bộ TOEIC ban đầu; đối chiếu mục tiêu 50 bài/600 mục nội dung, xuất báo cáo thay vì âm thầm bỏ dữ liệu. Số mục thuộc bộ học có thể khác số nghĩa canonical duy nhất; báo riêng hai số nếu có gộp ID. Bộ khác khai báo manifest riêng; engine không giả định số lượng.
6. Gắn phiên bản nội dung; định nghĩa xử lý lượt dang dở khi nội dung đổi.
7. Bài kiến thức dùng Markdown/MDX do dự án kiểm soát; validator kiểm tra slug, metadata, liên kết mục từ, nguồn và trạng thái xuất bản. Nội dung không tin cậy không được thực thi như MDX.
8. Nguồn PDF chỉ nhập sau khi xác minh quyền sử dụng; trích xuất/OCR vào staging → chuẩn hóa → duyệt tay → kiểm tra → xuất bản. Không tra trực tiếp từ PDF mỗi request; có PDF không đồng nghĩa được phân phối lại.
9. Bản đầu dùng dữ liệu đã biên soạn và link tra ngoài. Adapter API từ điển chỉ thêm khi chốt nhà cung cấp, quyền dùng/cache, quota và hành vi khi lỗi; lưu nguồn cùng kết quả.

## 6. Kiến trúc đề xuất

### Công nghệ và ranh giới chạy

- Next.js App Router + React + TypeScript. Dùng routing theo thư mục, URL ổn định; không dùng hash router làm mặc định.
- Tailwind CSS + shadcn/ui cho design tokens và thành phần; chỉ thêm component cần dùng. Flashcard, câu hỏi và bài đọc có component chuyên biệt.
- Trang kiến thức/danh mục công khai ưu tiên HTML dựng sẵn hoặc render server khi cần; metadata theo trang, sitemap và canonical. Chỉ index nội dung đã duyệt; không tự tạo hàng nghìn trang rỗng để SEO.
- Buổi học, bảng tra, âm thanh, IndexedDB và tương tác là Client Components. Chia ranh giới nhỏ; tránh biến toàn bộ app thành client chỉ vì một widget.
- Nội dung kiến thức ban đầu dùng Markdown/MDX trong repo; từ/bộ học dùng dữ liệu chuẩn hóa có manifest. Chưa cần CMS. MDX hỗ trợ Server Components nhưng có thể thực thi mã; chỉ biên dịch nguồn đã tin cậy, như [hướng dẫn MDX của Next.js](https://nextjs.org/docs/app/guides/mdx).
- Zustand chỉ khi cần phối hợp trạng thái client; không tạo store dùng chung giữa các request server. Logic học là module độc lập.
- IndexedDB cho lượt/tiến độ/sự kiện. Bản local hiện dùng API IndexedDB trực tiếp và transaction; giữ cách này nếu đáp ứng migration/lỗi lưu, chỉ thêm thư viện bọc khi có nhu cầu rõ. localStorage chỉ dùng tùy chọn nhỏ nếu cần, không giữ một bản tiến độ thứ hai.
- Firebase Authentication + Firestore cho tài khoản/đồng bộ. Next.js không thay database. Dữ liệu bản mới dùng namespace V2 và schemaVersion riêng.
- Route Handlers chỉ thêm khi cần gọi dịch vụ có secret hoặc xử lý có thẩm quyền. Credential của Firebase Admin và secret dịch vụ chỉ ở server; endpoint phải xác thực, kiểm tra quyền và giới hạn đầu vào. Firebase Admin SDK bỏ qua Firestore Security Rules: server phải tự kiểm tra quyền; Rules bảo vệ truy cập qua client SDK ([Firebase: Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)). Firebase Web API key là cấu hình công khai, không phải bằng chứng có quyền đọc/ghi dữ liệu.
- Dữ liệu cá nhân không cache công khai hoặc chia sẻ giữa người dùng. Biến NEXT*PUBLIC*\* được xem là công khai; không đặt secret vào đó.
- Vitest cho logic; Playwright và kiểm tra truy cập cho các hành vi đã chốt. Dev/typecheck/lint/test/build/preview có lệnh riêng theo phiên bản đã khóa.

Chưa thêm backend riêng, SQL, hàng đợi hoặc search service chỉ vì dự định mở rộng. Nếu yêu cầu truy vấn, sync hay tác vụ nền cần chúng, viết quyết định kỹ thuật dựa trên nhu cầu và đo đạc. Firestore không phải lựa chọn bất biến cho mọi giai đoạn.

Mô hình thực thể ở mục 5 và cây thư mục dưới đây là kiến trúc đích, chưa phải cấu trúc code hiện tại. M0 chỉ triển khai phần cần cho một luồng hoàn chỉnh, không dựng trước toàn bộ entity/module hay abstraction đa ngôn ngữ. Ứng dụng Next đặt trong `v2/`; app V1 local đã được dọn theo yêu cầu mới, dữ liệu cần dùng chuyển sang `data/generated/` và cấu hình cũ lưu trong `docs/legacy/`. Web cũ đang deploy trên cloud chưa thay đổi.

Các đường dẫn trong cây sau tính từ `v2/`:

```text
src/
  app/                 App Router: layout, page, loading, error, route handlers
  features/            today, courses, knowledge, dictionary, library, study, progress, account
  domain/
    content/           ngôn ngữ, mục từ, nghĩa và liên kết nội dung
    learning/          chọn mục và điều kiện tiến độ
    review/            lịch ôn, chính sách có phiên bản
    assessment/        dạng câu, chấm theo ngôn ngữ/kỹ năng
  data/
    content/           đọc nội dung đã dựng
    local/             IndexedDB, chỉ dùng phía client
    cloud/             Firebase client, auth và sync
    migrations/        nâng schema, nhập dữ liệu cũ
  server/              secret, Firebase Admin và adapter dịch vụ khi cần
  components/ui/       thành phần shadcn/ui
  shared/              lib, styles, thành phần chung khác
content/
  courses/             nguồn từ/bộ học đã chuẩn hóa
  knowledge/           bài Markdown/MDX đã duyệt
scripts/               chuyển đổi và kiểm tra
tests/                 fixture, test xuyên phần
docs/                  đặc tả, wireframe, quyết định kỹ thuật
```

### Deploy và môi trường

- Bản Next.js mới deploy Vercel; giữ Firebase Hosting cũ trong giai đoạn chuyển đổi. Không mặc định nâng cấp/chuyển deployment cũ.
- Local dùng Emulator khi kiểm tra Firebase. Preview/staging dùng Firebase project thử riêng; production dùng cấu hình riêng. Preview frontend không tự tách database; namespace V2 cũng không tự tạo ranh giới phân quyền. Rules và cấu hình môi trường phải kiểm tra riêng.
- Thiết lập domain đăng nhập/OAuth được phép cho môi trường thử và production; kiểm tra luồng đăng nhập trên URL triển khai thực tế.
- PR chạy các kiểm tra bắt buộc và có preview; chỉ cấu hình tự deploy production sau khi chốt nhánh/quy trình phát hành.
- Chốt gói Vercel theo mục đích sử dụng; không mặc định gói Hobby phù hợp khi thương mại hóa. Theo dõi usage cả Vercel và Firebase; cảnh báo ngân sách không phải giới hạn chi tiêu cứng.
- Rollback deployment không hoàn tác dữ liệu: snapshot/export và tương thích schema phải được kiểm tra riêng.

Logic chấm/lịch ôn nhận dữ liệu và trả kết quả; không gọi Firebase hoặc điều khiển giao diện trực tiếp. Số đếm dùng chung selector/query, không tự tính khác nhau ở từng màn.

### Lưu và đồng bộ

- Ghi bền kết quả cùng vị trí trên máy trước khi báo đã lưu trên máy; báo trạng thái cloud riêng.
- Mỗi lần trả lời có ID ổn định theo session/câu/lần thử; retry cùng thao tác giữ nguyên ID. Một lần luyện lại có chủ đích có ID mới và vẫn chịu quy tắc không nâng lịch nhiều lần trong ngày.
- Tiến độ có thể đối chiếu với sự kiện; không cộng số đếm hai thiết bị mù quáng.
- Đặc tả merge phải chốt thứ tự áp dụng, revision, khử trùng, reset và xoá. Đồng hồ thiết bị không là bảo đảm duy nhất cho thứ tự đúng.
- Tách dữ liệu theo tài khoản và hồ sơ học thử; chuyển học thử vào tài khoản có xem trước.
- IndexedDB gắn với origin (giao thức, host và port) và hồ sơ trình duyệt; dữ liệu trên `127.0.0.1:5174` không tự xuất hiện ở URL Vercel hoặc domain khác. Khi đổi origin phải export/import hoặc đồng bộ sau đăng nhập; không coi deploy là thao tác chuyển dữ liệu. Khi chuyển framework trên cùng origin, giữ tên database và migration tương thích.
- Rules giới hạn dữ liệu cho đúng người; kiểm tra người khác đọc/ghi phải bị từ chối.
- Trạng thái rõ: Đã lưu trên máy / Đang đồng bộ / Đã đồng bộ / Cần thử lại.
- Offline V1: khi app đang mở và mạng mất, vẫn học tiếp trên dữ liệu đã cache và ghi trả lời local. Reload/khởi động lại khi không có mạng chưa được cam kết nếu chưa có app-shell/service worker cache. Resume sau reload được kiểm tra khi online; mọi trường hợp offline đầy đủ cần đặc tả/test riêng. PWA và khởi động offline làm sau.

## 7. Chuyển từ bản cũ

1. Tạo fixture cho schema cũ; dữ liệu thật qua export/import hoặc tài khoản được cấp quyền.
2. Giữ snapshot gốc, schemaVersion và bảng ánh xạ ID.
3. Preview số từ khớp, từ tự thêm, trạng thái, lịch ôn và mục chưa ánh xạ.
4. Không gán tiến độ import thành lần kiểm tra mới. confirming/mastered cũ được ánh xạ có giải thích và giữ metadata gốc.
5. Nhập namespace V2; cùng importId chạy lại không nhân đôi.
6. Đối chiếu tổng số, lấy mẫu một số từ/bài.
7. Giữ điểm sách/checkpoint và phần chưa hỗ trợ trong lịch sử tương thích hoặc bản lưu kèm.
8. Trong thời gian dùng thử giữ web cũ; hai bản không tự ghi đè cùng schema.

Rollback: quay về code/dữ liệu cũ được, nhưng tiến độ mới không tự chuyển ngược. Trước rollback phải export V2 và giữ phần phát sinh. Chưa xoá adapter/dữ liệu cũ trong kế hoạch này.

## 8. Lộ trình triển khai

Triển khai theo mốc, chưa cam kết thời gian sau thay đổi phạm vi. Ước lượng cũ không còn là baseline vì thêm Next.js, bài kiến thức, tra/lưu từ và mô hình nhiều bộ học. Ước lượng lại sau M0 theo dữ liệu, sync và vòng sửa UX.

| Mốc                         | Việc cụ thể                                                                      | Đầu ra và điều kiện hoàn thành                                                 |
| --------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| G0: Sản phẩm                | Rà kế hoạch, chốt M0, luật học, danh sách bài kiến thức V1, nguồn nội dung       | Brief, đặc tả, backlog; phân biệt đã chốt và còn mở                            |
| G1: UX                      | Wireframe/prototype mobile và desktop; đọc/tra/lưu/học/quay lại                  | Các luồng chính dùng được, không mất vị trí hoặc lộ đáp án mà vẫn chấm độc lập |
| G2: UI và nền               | Next App Router, Tailwind/shadcn, tokens, ranh giới client/server, lệnh kiểm tra | App shell 360px/desktop; trang công khai và màn học đúng vai trò               |
| G3: Dữ liệu                 | Schema có ngôn ngữ/bộ học, ID map, importer, validator, MDX, local có phiên bản  | Bài TOEIC mẫu và bài kiến thức đã duyệt; không có liên kết hỏng                |
| G4: M0 hoàn chỉnh           | Đọc → tra → lưu → học/chấm → kết quả, resume                                     | Luồng chạy với bài thật; reload/nhấn lặp không mất hoặc tính trùng             |
| G5: Lõi V1                  | Ôn, bộ TOEIC đầy đủ, bộ cá nhân, kiến thức V1, tìm và tiến độ                    | Local dùng hằng ngày; thêm bộ qua dữ liệu; số đếm/lịch đúng                    |
| G6: Tài khoản và chuyển đổi | Merge, auth, sync, import, rules và tách môi trường                              | Hai thiết bị/offline/retry/đổi tài khoản/import lặp đúng                       |
| G7: Phát hành               | SEO trang công khai, QA, dùng thử, preview Vercel, domain, rollback              | Checklist đạt trước khi thay web cũ                                            |

**Phụ thuộc:**

- Chốt G0 trước thiết kế chi tiết; G1 trước hoàn thiện UI.
- G3 trước G4; dùng dữ liệu thật từ bài mẫu.
- Đặc tả ID/sự kiện/phiên bản lưu có từ G3 dù sync làm ở G6.
- Sau G4 dùng thử, sửa chỗ vướng rồi mới mở rộng G5.
- Sau G6 thử import/sync trên preview trước bản chính.
- Mỗi mốc kết thúc bằng tài liệu hoặc bản chạy được cùng tiêu chí; tính năng mới vào backlog, không chen liên tục vào mốc đang làm.

## 9. Backlog ban đầu

| ID  | Việc                 | Tiêu chí chính                                                                             |
| --- | -------------------- | ------------------------------------------------------------------------------------------ |
| P01 | Product brief        | V1/V1.1/V2 rõ, có danh sách hoãn                                                           |
| P02 | Đặc tả học           | Đúng/sai/gần đúng/lộ đáp án/qua ngày có kết quả xác định                                   |
| P03 | Sitemap và prototype | Đi được các luồng, có trạng thái trống/lỗi                                                 |
| P04 | UI dùng chung        | Nút, form, thẻ, câu hỏi và phản hồi thống nhất                                             |
| P05 | Khởi tạo Next.js     | App Router, ranh giới server/client; dev, typecheck, lint, build, preview chạy             |
| P06 | Schema/importer      | ID ổn định, báo số lượng và lỗi                                                            |
| P07 | Local repository     | Lưu/đọc/nâng schema; xử lý dữ liệu hỏng và hết dung lượng                                  |
| P08 | Session engine       | Chốt câu, trạng thái, tiếp tục đúng vị trí                                                 |
| P09 | Question/scoring     | Đáp án hợp lệ; không sinh câu mơ hồ                                                        |
| P10 | Màn học/kết quả      | Hoàn tất lượt trên dữ liệu thật                                                            |
| P11 | Review engine        | Lịch đúng; luyện lại không tăng bậc giả                                                    |
| P12 | Hôm nay/Bài học      | Gợi ý đúng; số đếm thống nhất                                                              |
| P13 | Thư viện/chi tiết    | Tìm có/không dấu; tra rồi trở lại lượt                                                     |
| P14 | Tiến độ              | Đối chiếu được; tách điểm quiz và trạng thái từ                                            |
| P15 | Auth/sync/rules      | Tách người dùng, retry/merge có quy tắc                                                    |
| P16 | Legacy import/export | Preview, nhập lại an toàn, giữ mục chưa ánh xạ                                             |
| P17 | Dùng thử/sửa lỗi     | Hoàn thành lượt mà không cần giải thích từng nút                                           |
| P18 | Release/rollback     | Vercel preview, môi trường Firebase riêng, snapshot và cách quay lại                       |
| P19 | Kiến thức            | MDX đã duyệt, URL/metadata ổn định; danh sách bài V1 được chốt                             |
| P20 | Tra từ trong bài     | Đúng nghĩa/cụm đã gắn ID, fallback ngoài; giữ vị trí/focus, đánh dấu hỗ trợ trong câu hỏi  |
| P21 | Bộ cá nhân           | Lưu không trùng theo ID; nháp thiếu dữ liệu không sinh câu hỏi                             |
| P22 | Nền đa ngôn ngữ      | Schema ngôn ngữ học/giải thích, kỹ năng và policy; fixture schema tiếng Trung, chưa bật UI |
| P23 | Pipeline/nguồn       | Import, kiểm tra nguồn/quyền dùng, trạng thái duyệt và phiên bản                           |
| P24 | Thiết lập skill      | Cài đúng coding agent; kiểm tra khả năng nhận skill, ghi phiên bản/phạm vi                 |

## 10. Kiểm tra và nghiệm thu

### Kiểm tra logic/dữ liệu

- Đáp án/biến thể/gần đúng/lộ đáp án; dữ liệu thiếu và nhiều nghĩa.
- Từ mới, lượt ôn chính, luyện thêm, ngưỡng trạng thái và phiên bản chính sách.
- Qua ngày/múi giờ, quá hạn dài, trên 20 từ đến hạn, nhiều câu cho một từ.
- Event retry, hai thiết bị cùng học, sự kiện đến khác thứ tự.
- Migration nhiều schema, import lặp, ID không khớp, file hỏng.
- Cùng từ trong nhiều bộ không nhân đôi tiến độ; từ khác nghĩa/ngôn ngữ không tự gộp.
- Lưu từ không tính học mới; mục thiếu nghĩa ở nháp; từ/cụm và biến thể liên kết đúng.
- MDX/link/metadata hợp lệ, chỉ nội dung đã duyệt xuất bản; schema có fixture mở rộng tiếng Trung, chưa đánh giá engine tiếng Trung trong V1.

### Kiểm tra trình duyệt

- Người mới xong lượt đầu; ngày sau có từ đến hạn.
- Chọn bài → học → kết quả → tiến độ khớp; luyện lại từ sai không tăng bậc giả.
- Reload/thoát/quay lại; tra từ giữa lượt; nội dung đổi khi có lượt dang dở.
- Mất mạng khi app đang mở, mạng trở lại, lỗi lưu máy được báo đúng; không hứa reload offline nếu chưa triển khai cache app shell.
- Đọc/tra/lưu/học/quay lại giữ vị trí và focus; tra từ trong câu hỏi đánh dấu hỗ trợ; fallback nguồn ngoài không mất lượt.
- URL bài công khai mở trực tiếp có nội dung/metadata; bài nháp và dữ liệu cá nhân không bị xuất bản/cache chung.
- Preview không ghi production; OAuth hoạt động trên domain cho phép; server endpoint chặn truy cập sai quyền.
- Học thử → đăng nhập → gộp; đổi tài khoản không thấy dữ liệu người trước.
- Export/import đối chiếu; tiến độ cũ và phần chưa hỗ trợ được giữ.
- Bàn phím, focus, screen reader cơ bản, sáng/tối, giảm chuyển động, 360px/desktop.

### Checklist phát hành V1

- Bộ TOEIC đầu tiên đối chiếu mục tiêu 50 bài/600 từ; mọi mục có ID hợp lệ và đủ dữ liệu cho dạng học bật. Số lượng do manifest quản lý; phần thiếu có báo cáo.
- Bài kiến thức V1 đã chốt và duyệt; tra/lưu từ, bộ cá nhân và fallback ngoài hoạt động.
- Có thể thêm bộ tiếng Anh bằng dữ liệu; nền schema có ngôn ngữ nhưng V1 chưa hứa hỗ trợ đầy đủ tiếng Trung.
- Luồng học, ôn, tiếp tục, tìm và tiến độ chạy bằng dữ liệu thật.
- Typecheck, lint, build, logic và E2E trọng yếu đạt.
- Hai thiết bị, offline/retry, đổi tài khoản và rules đã kiểm tra.
- Có báo cáo import cũ, export và snapshot khôi phục.
- Không còn lỗi chặn học, mất kết quả, tính trùng hoặc lộ dữ liệu giữa tài khoản.
- Dùng thử qua vài ngày, sửa các chỗ vướng chính trước khi mở rộng.
- Vercel preview, domain/OAuth, theo dõi lỗi/usage, cấu hình môi trường và rollback sẵn sàng; web Firebase cũ được giữ đến khi đối chiếu xong.
- Việc giảm phạm vi/giới hạn còn lại được ghi trong release notes.

## 11. Skill và quy trình làm việc

Đã cài 22 skill cấp dự án tại `.agents/skills/` theo yêu cầu người dùng; UI UX Pro Max đã có ở cấp người dùng. Đây là các file skill để agent đọc/áp dụng, chưa xác nhận cơ chế tự nhận diện ở mọi coding agent và không đồng nghĩa đã cài/activate toàn bộ plugin Superpowers. Skill hỗ trợ quy trình, không thay thế đặc tả hoặc test. Không có file `STACK-AND-SKILLS.md` trong repo ở thời điểm rà soát; mục này ghi bộ skill thực tế thay cho liên kết chưa tồn tại.

| Giai đoạn            | Skill / nguồn                                                                                                                                | Phạm vi                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Chốt yêu cầu         | brainstorming — obra/superpowers                                                                                                             | Đọc kế hoạch trước, chỉ làm rõ các điểm còn mở                                                                    |
| Chia việc            | writing-plans — obra/superpowers                                                                                                             | Chia riêng M0 thành việc có đầu ra/kiểm tra                                                                       |
| Thực hiện            | executing-plans hoặc subagent-driven-development — obra/superpowers                                                                          | Chọn cách chạy phù hợp coding agent và yêu cầu                                                                    |
| Thiết kế chính       | UI UX Pro Max — bản người dùng đã có                                                                                                         | Chốt tokens, bố cục, responsive và trạng thái                                                                     |
| Thiết kế tùy chọn    | frontend-design — anthropics/skills                                                                                                          | Khám phá hướng khác khi cần; không cùng chỉ đạo một màn với skill thiết kế chính                                  |
| Chất lượng code      | vercel-react-best-practices — vercel-labs/agent-skills                                                                                       | React/Next; dùng hướng dẫn phù hợp phiên bản                                                                      |
| Component, tùy chọn  | vercel-composition-patterns — vercel-labs/agent-skills                                                                                       | Khi component chung trở nên phức tạp                                                                              |
| Rà UI                | web-design-guidelines — vercel-labs/agent-skills                                                                                             | Responsive, form, focus, keyboard và UX                                                                           |
| Kiểm thử trình duyệt | webapp-testing — anthropics/skills                                                                                                           | Luồng học, tra/lưu, reload và mobile                                                                              |
| Firebase             | firebase-basics, firebase-auth-basics, firebase-firestore, firebase-security-rules-auditor, firestore-rules-creation — firebase/agent-skills | Bộ đã cài để hỗ trợ môi trường, đăng nhập, Firestore và rules; tên khác một số tên trong tài liệu đề xuất ban đầu |
| Sửa lỗi/review       | systematic-debugging, requesting-code-review, verification-before-completion — obra/superpowers                                              | Tìm nguyên nhân, rà thay đổi và có bằng chứng trước khi báo xong                                                  |

firebase-hosting-basics chỉ cần khi quản lý web Firebase cũ. Chưa cần NVIDIA skills cho phạm vi hiện tại. Cài framework Superpowers theo hướng dẫn đúng agent để có bootstrap/hook phù hợp; không mặc định copy SKILL.md là đã cài đầy đủ.

**Nguồn cài chính thức:**

- [Superpowers](https://github.com/obra/superpowers)
- [Anthropic Skills](https://github.com/anthropics/skills)
- [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills)
- [Firebase Agent Skills](https://firebase.google.com/docs/ai-assistance/agent-skills)

Không cần chạy lại lệnh cài cả bộ. `frontend-design` và `composition-patterns` cũng đã cài; chỉ áp dụng khi phù hợp. Tên thư mục có thể khác tên khai báo: `react-best-practices` khai báo `vercel-react-best-practices`, `composition-patterns` khai báo `vercel-composition-patterns`.

Danh sách 22 thư mục đã cài: `brainstorming`, `composition-patterns`, `executing-plans`, `finishing-a-development-branch`, `firebase-auth-basics`, `firebase-basics`, `firebase-firestore`, `firebase-security-rules-auditor`, `firestore-rules-creation`, `frontend-design`, `react-best-practices`, `receiving-code-review`, `requesting-code-review`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `web-design-guidelines`, `webapp-testing`, `writing-plans`.

Cần ghi thêm commit/tag nguồn để tái tạo đúng bộ đã cài; không tự nhận đã khóa phiên bản chỉ từ tên thư mục. Kiểm tra khả năng agent nhận skill ở phiên tiếp theo; có thể đọc trực tiếp khi cần. Không tự kích hoạt deploy, thay đổi production hoặc chạy nhiều agent chỉ vì đã cài skill; việc áp dụng phải theo yêu cầu và quyền đã có.

## 12. Bước bắt đầu và điểm còn chốt

1. Đã có kiểm kê và bản local làm nền; đối chiếu lại các thay đổi mới với repo, xác minh thực trạng dữ liệu/cấu hình thay vì coi tài liệu là đã kiểm chứng code.
2. Chốt G0/P01–P03: luật học M0, bài TOEIC mẫu, bài kiến thức mẫu, ngôn ngữ mặc định, hành vi tra từ và danh sách nội dung V1. Chưa chọn nguồn/API/PDF từ điển cụ thể.
3. Bộ 22 skill đã cài trong repo; kiểm tra cách agent nhận và chỉ dùng các skill liên quan.
4. Đã chuyển `v2/` sang Next.js trên nhánh `codex/next-app-router` hiện có; không khởi tạo đè lại bản local hoặc kho IndexedDB. Giữ deployment cũ và snapshot dữ liệu. Routing, client/server, Tailwind/shadcn và bài MDX mẫu đã chạy; tiếp tục dùng thử M0 trước khi mở rộng G5/G6.
5. Làm M0: một bài kiến thức + một bài TOEIC thật; tra/lưu/học/kết quả/resume chạy hết bằng local. Chưa làm tất cả ngôn ngữ, CMS hoặc API từ điển.
6. Dùng thử, cập nhật đặc tả/ước lượng rồi mở rộng V1, auth/sync/import. Preview dùng môi trường Firebase thử riêng.
7. Chỉ thay web cũ sau checklist V1 và đối chiếu dữ liệu; có đường quay lại và giữ tiến độ phát sinh.

Điểm đã chốt: hướng sản phẩm, stack Next/Tailwind/shadcn, Firebase backend, Vercel deployment và bộ skill theo vai trò. `v2/package.json` và lockfile đã có các phiên bản khởi tạo; chỉ coi stack tương thích sau khi typecheck/build/test đạt. Điểm cần chốt trước phần liên quan: nguồn từ điển/quyền dùng, danh sách bài kiến thức, luật ngày học/merge, domain và gói dịch vụ. Tiếp tục phần local đã được cho phép; không cần mở lại quyết định stack hoặc cài lại skill.

Sau lần rà tài liệu, người dùng đã cho phép tiếp tục triển khai. Bản local hiện chạy Next.js và có luồng M0; 22 skill vẫn nằm trong repo. Chưa tạo cloud resource, deploy Vercel hoặc chuyển dữ liệu học thật.

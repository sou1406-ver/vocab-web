# Lõi học: phần đã sửa và phần cần chốt

Ngày 25/10/2026. Đọc tài liệu này để phân biệt thay đổi đã chạy với đề xuất cho bước tiếp theo. Đây là phần bổ sung cho [SINGLE-APP.md](SINGLE-APP.md).

## 1. Đã làm: Question tách theo kind

`src/domain/types.ts` dùng union cho các kind đang hoạt động:

| Dạng         | Dữ liệu riêng                              | Hành vi hiện có                          |
| ------------ | ------------------------------------------ | ---------------------------------------- |
| meaning      | options bắt buộc                           | Chọn một nghĩa                           |
| cloze        | Không có danh sách đáp án chọn             | Nhập từ còn thiếu                        |
| recall       | Không có danh sách đáp án chọn             | Nhập từ từ gợi ý nghĩa                   |
| cloze-choice | options và sourceId/sourceVersion bắt buộc | Chọn đáp án cho câu khuyết biên soạn sẵn |

Các kind cùng có wordId, prompt và answer. Không thêm type Listening/Match/Build giả khi chưa có renderer, scorer và dữ liệu kiểm chứng. Khi triển khai một dạng, thêm nhánh union riêng và validator tương ứng; không nhét pairs/audio/tokens vào prompt.

Để tương thích tab đang chạy bản schema 2, generator vẫn ghi `options: []` cho câu nhập chữ. Type chỉ cho phép mảng rỗng ở hai nhánh này; validator nhận cả mảng rỗng và trường bị lược bỏ. Options có nội dung ở cloze/recall hoặc kind chưa hỗ trợ bị từ chối. Đây là trường tương thích, không phải danh sách lựa chọn của câu nhập chữ.

Đã thêm `word-choice`: nghĩa Việt → chọn từ Anh, dùng options như meaning nhưng lưu kind riêng. Tại mỗi bài có lượt “Luyện chọn nghĩa / chọn từ” cho tối đa sáu từ, hai hướng mỗi từ; lượt kế tiếp luân phiên nhóm từ để phủ cả bài. Dùng data V1, loại distractor trùng hoặc có quan hệ synonym/family/nghĩa chồng đã biết; chưa coi đó là bảo đảm ngữ nghĩa tuyệt đối cho mọi nghĩa đa nghĩa. Lượt chạy practice và không tăng bậc ôn.

## 2. Đã làm: event mới giữ ngữ cảnh câu hỏi

Ngoài kết quả/assisted/mode đã có, đáp án mới lưu:

| Field            | Ý nghĩa                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| questionKind     | meaning, word-choice, cloze, recall hoặc cloze-choice                  |
| questionId       | sessionId:index; định danh lần xuất hiện câu hỏi trong lượt            |
| contentVersion   | Phiên bản catalog của session; cloze-choice dùng phiên bản gói câu hỏi |
| skill            | vocabulary cho các dạng đang triển khai                                |
| scoringVersion   | 1 cho quy tắc chấm hiện tại                                            |
| sourceQuestionId | ID câu nguồn cho cloze-choice, dạng v1:part5:bài:số-câu                |

questionId định danh lần xuất hiện trong session; sourceQuestionId liên kết câu nguồn xuyên session cho cloze-choice. Chưa lưu toàn bộ câu hỏi hoặc câu trả lời người dùng trong event; do đó chưa đủ để phân tích cụ thể từng distractor sau khi session cũ được thay.

Các field mới optional trong type lưu trữ để đọc event cũ; đường ghi mới luôn điền đầy đủ. Validator kiểm tra giá trị khi field có mặt. Không tự đoán kind/skill của event lịch sử từ từ vựng hoặc mode. Nếu thống kê theo dạng về sau, event thiếu kind nằm trong nhóm “không xác định”.

Giữ ID event cũ và quy tắc chống tính trùng. Không đổi lịch ôn, box/dueAt, fingerprint catalog, database IndexedDB hoặc snapshot schemaVersion. Backup cũ/session đang học tiếp tục đọc được; dữ liệu cũ không bị ghi lại chỉ để điền metadata.

## 3. Đã chốt thiết kế: hai kỹ năng và Match practice

**Chưa đổi tiến độ trong code.** Hiện một từ vẫn có một box; event mới vẫn ghi skill `vocabulary`. Thiết kế đích chỉ có hai kỹ năng, không tách skill theo từng dạng bài:

- **Nhận biết:** chọn đáp án, gồm chọn nghĩa/chọn từ và điền chỗ trống chọn đáp án.
- **Tự nhớ:** gõ đáp án bằng ô chữ.

Word form và nghe cũng phân theo cách trả lời: chọn thuộc nhận biết, gõ thuộc tự nhớ. Hai kỹ năng dùng khóa tiến độ itemId + skill, có box/dueAt/policyVersion riêng.

Dạng bài và kênh nghe vẫn được ghi riêng để thống kê; không tạo thêm skill listening hoặc word-form trong thiết kế này. Có gợi ý/lộ đáp án thì giữ cờ assisted, không tính như tự nhớ độc lập.

**Match theo chủ đề thuộc practice:** chỉ ghi kết quả từng cặp, không tăng box, không đổi dueAt/reviewedDay và không đánh dấu từ đã thuộc. Một lượt Match không được làm biến mất từ đang đến hạn ôn. Không quy điểm cả sáu cặp thành một câu trả lời của một từ.

Khi triển khai hai kỹ năng, cần migration có version và test backup/two-tab. Tiến độ cũ đang trộn nhiều dạng nên không thể suy ra hai box riêng: giữ dữ liệu gốc làm mốc tương thích, không sao chép box cũ sang cả hai kỹ năng và không đoán skill của event thiếu thông tin.

Còn cần chốt khi viết migration: cách hiển thị “nhớ ổn định” khi hai kỹ năng khác nhau, cách kế thừa mốc tiến độ cũ và giới hạn ôn/ngày theo kỹ năng. Luật ôn một lần/ngày sẽ xét theo từ + kỹ năng, không theo kind. Chưa thay hành vi học trong bản hiện tại.

### Các dạng bài đã chốt

| Số  | Dạng giữ lại         | Phạm vi                                                                     |
| --- | -------------------- | --------------------------------------------------------------------------- |
| 1   | Gõ ô chữ             | Gộp Hint/Recall; đề là nghĩa Việt hoặc câu có chỗ trống                     |
| 2   | Điền chỗ trống       | Chọn đáp án trong ngữ cảnh (Cloze)                                          |
| 3   | Chọn nghĩa / chọn từ | Gộp Meaning/Choice; lưu hướng hỏi                                           |
| 4   | Dạng từ              | Gộp Formation/FormationChoice/FormFix; mức chọn và gõ, phân biệt đề sửa lỗi |
| 5   | Build                | Ghép gốc + phụ tố, dùng cả word family                                      |
| 6   | Đồng nghĩa           | Gộp Synonym/SynonymSentence; kiểm tra nghĩa trong ngữ cảnh                  |
| 7   | Match                | Ghép theo chủ đề, practice không tăng box                                   |
| 8   | Nghe                 | Nghe rồi chọn hoặc gõ; làm lại phần phát âm trước                           |

**Thứ tự triển khai:** theo số thứ tự trong bảng, 1 → 8.

`LetterSlotsInput` đã được tạo ở `src/components/LetterSlotsInput.tsx` và dùng cho recall/cloze nhập chữ hiện có. Dùng một input native với các ô hiển thị để hỗ trợ dán văn bản, chọn/xóa, phím mũi tên, Enter, bấm ô để sửa và cụm có khoảng trắng; giữ label/focus và bố cục mobile. Phần nhập dư vẫn hiện để sửa, không bị cắt theo độ dài đáp án. Các ô không hiện sẵn chữ đáp án.

Component này dùng lại cho dạng từ và nghe khi triển khai hai dạng đó; hiện chưa có hai màn bài tập đó. Đây là component nhập đáp án, không phải một skill riêng. Các dạng trong bảng chưa được triển khai đầy đủ; mục 1 mô tả code đang chạy. `cloze` vẫn là nhập chữ, còn `cloze-choice` là dạng chọn mới. Chưa migrate lịch ôn sang hai skill.

Đã thêm prop `revealed` và nút “Gợi ý một chữ”: chữ được lộ có đánh dấu, không xóa/ghi đè được. Session được lưu `peeked: true` trước khi hiện chữ; đáp án sau đó ghi assisted và không nhận điểm tự nhớ. Reload có thể bỏ các ô gợi ý đang hiển thị nhưng không xóa dấu hỗ trợ. CSS input native dùng selector `.letter-slots .letter-slots-input`, không phụ thuộc form cha. Chạm trực tiếp vào input native, không preventDefault ở pointerdown; đã thử touch trên mobile Edge giả lập, kiểm tra iPhone thật được người dùng bỏ khỏi phạm vi đợt này.

Dữ liệu tạm dùng nguồn V1 hiện có theo yêu cầu người dùng, chờ bổ sung nguồn mới. Bước 1 không tạo hoặc tải thêm dữ liệu bên ngoài. Nội dung đang gõ chưa submit vẫn là state giao diện, không phải kết quả được lưu khi reload.

## 4. Đề xuất: nội dung bài tập tải theo bài

Builder hiện chỉ đưa words/lessons/topics vào catalog lõi. Examples/synonyms/antonyms vẫn có; family mới giữ `{text, pos, meaning}`, đã bỏ mất `parts` ở từng mục mà Build V1 sử dụng.

**Điều kiện trước khi làm Build:** thêm lại `parts` vào từng mục family trong `scripts/build-content.mjs`, type Word và validator; tiếp tục đọc được custom word/backup cũ chưa có trường này. Nguồn `data/generated/word-details` vẫn giữ parts của family, nên cần khôi phục từ nguồn thay vì tự đoán. Hiện chỉ 166/600 từ chính có parts từ hai mảnh trở lên; nguồn family có 982 mục tách được từ hai mảnh trở lên (không phải 982 từ duy nhất). `affixes.json` có 92 phụ tố làm nguồn xây đáp án nhiễu, cần kiểm tra không tạo thêm đáp án đúng. Chưa sửa builder trong đợt cập nhật tài liệu này.

Kiểm tra dữ liệu nguồn hiện tại:

| File           | Dung lượng thô hiện tại | Trạng thái                             |
| -------------- | ----------------------- | -------------------------------------- |
| exercises.json | 288.743 byte            | Có lessons và reviews                  |
| everyday.json  | 54.592 byte             | 150 mục                                |
| affixes.json   | 12.362 byte             | Từ điển phụ tố                         |
| ets.json       | 3 byte                  | Mảng rỗng; chưa có bộ ETS để phát hành |

Hướng nạp đề xuất: manifest nhỏ gồm ID bộ/bài, phiên bản/hash và đường dẫn gói; exercises tách theo lesson/review, everyday chia theo nhóm, affixes là nguồn tra riêng. Chỉ tải gói khi mở dạng bài liên quan. Catalog lõi không import tất cả gói. ID câu nguồn cần ổn định khi sửa lỗi chính tả; phiên bản nội dung thay đổi độc lập với ID.

**Đã thêm loader và màn cloze-choice:** 223 câu từ Part 5 V1, chia 50 gói theo bài, chỉ tải khi bấm “Luyện điền chỗ trống”. Giữ options/answer có sẵn; liên kết bằng đáp án trùng duy nhất từ chính/family trong bài. Bỏ qua 76 câu chưa liên kết chắc chắn và một câu dữ liệu lựa chọn không hợp lệ; báo cáo tại `src/content/exercise-report.json`. Không tự sinh distractor hoặc đoán biến thể từ. Một số câu nguồn hỏi dạng từ, chưa thay thế nhóm Word form chuyên biệt trong kế hoạch.

Session cloze-choice chạy practice: ghi kết quả, không tăng box/dueAt hoặc tạo tiến độ từ mới. Lỗi tải có thể thử lại; reload/resume dùng câu đã lưu trong session, không cần tải lại gói; luyện lại giữ câu nguồn sai. Validator kiểm tra phiên bản, options và liên kết từ. Loader/manifest cho everyday/affixes/ETS chưa triển khai; ETS vẫn rỗng.

## 5. Đề xuất: hợp đồng đồng bộ trước khi chọn collection

**Chưa triển khai Auth/Firestore hoặc thay rules.** Trước khi sync cần quyết định:

- Mỗi tài khoản có namespace dữ liệu riêng; tách guest và có bước xác nhận nhập dữ liệu guest.
- Event có ID ổn định để retry không tạo thêm kết quả. Session hiện đã dùng UUID và event sessionId:index; deviceId còn cần bổ sung khi triển khai sync.
- Không giải quyết hai thiết bị bằng ghi đè toàn bộ snapshot hoặc lấy box lớn nhất. Hai thiết bị có thể trả lời cùng một từ; phải có luật xác định câu nào được tính vào lịch ôn.
- Xác định nguồn có thẩm quyền cho thứ tự thời gian, timezone/ngày ôn và policyVersion; không giả định timestamp từ hai máy luôn chính xác.
- Giữ lịch sử nhập/điểm xuất phát từ V1. Không dựng lại tiến độ chỉ từ event vì dữ liệu import có tiến độ nhưng không có lịch sử event đầy đủ.
- Quy tắc reset/xóa/khôi phục và đổi tài khoản cần ngăn dữ liệu cũ được đồng bộ quay lại ngoài ý muốn.

Có thể lưu events, progress, settings và session thành các phần riêng khi làm adapter cloud. Đường collection, quyền ghi và cách hợp nhất chưa được coi là chốt hoặc đã nghiệm thu. Phải kiểm chứng bằng Emulator và hai thiết bị/offline trước khi bật đồng bộ.

## Kiểm chứng

Các test mới đã chạy RED trước sửa: thiếu metadata, nhận metadata sai, không nhận câu nhập chữ thiếu options. Test tương thích wire format cũng phát hiện việc bỏ options rỗng; generator đã giữ lại trường đó cho schema 2.

Đợt này đã kiểm tra cloze-choice, recognition hai hướng và gợi ý chữ khóa; 39 unit tests, 36 E2E desktop/mobile, build/lint/typecheck/format đều qua. Catalog vẫn 600 từ/50 bài, fingerprint `54681aa41d1b`. Chưa có kiểm chứng độc lập từ reviewer khác trong đợt này; kiểm tra iPhone thật không nằm trong phạm vi theo yêu cầu người dùng.

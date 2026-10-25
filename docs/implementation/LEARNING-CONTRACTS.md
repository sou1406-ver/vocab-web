# Lõi học: phần đã sửa và phần cần chốt

Ngày 25/10/2026. Đọc tài liệu này để phân biệt thay đổi đã chạy với đề xuất cho bước tiếp theo. Đây là phần bổ sung cho [SINGLE-APP.md](SINGLE-APP.md).

## 1. Đã làm: Question tách theo kind

`src/domain/types.ts` dùng union cho các kind đang hoạt động:

| Dạng             | Dữ liệu riêng                              | Hành vi hiện có                                   |
| ---------------- | ------------------------------------------ | ------------------------------------------------- |
| meaning          | options bắt buộc                           | Chọn một nghĩa                                    |
| cloze            | Không có danh sách đáp án chọn             | Nhập từ còn thiếu                                 |
| recall           | Không có danh sách đáp án chọn             | Nhập từ từ gợi ý nghĩa                            |
| cloze-choice     | options và sourceId/sourceVersion bắt buộc | Chọn đáp án cho câu khuyết biên soạn sẵn          |
| word-form-choice | options và sourceId/sourceVersion bắt buộc | Chọn dạng từ; ít nhất ba lựa chọn cùng gốc/family |

Các kind cùng có wordId, prompt và answer. Không thêm type Listening/Match/Build giả khi chưa có renderer, scorer và dữ liệu kiểm chứng. Khi triển khai một dạng, thêm nhánh union riêng và validator tương ứng; không nhét pairs/audio/tokens vào prompt.

Để tương thích tab đang chạy bản schema 2, generator vẫn ghi `options: []` cho câu nhập chữ. Type chỉ cho phép mảng rỗng ở hai nhánh này; validator nhận cả mảng rỗng và trường bị lược bỏ. Options có nội dung ở cloze/recall hoặc kind chưa hỗ trợ bị từ chối. Đây là trường tương thích, không phải danh sách lựa chọn của câu nhập chữ.

Đã thêm `word-choice`: nghĩa Việt → chọn từ Anh, dùng options như meaning nhưng lưu kind riêng. Tại mỗi bài có lượt “Luyện chọn nghĩa / chọn từ” cho tối đa sáu từ, hai hướng mỗi từ; lượt kế tiếp luân phiên nhóm từ để phủ cả bài. Dùng data V1, loại distractor trùng hoặc có quan hệ synonym/family/nghĩa chồng đã biết; chưa coi đó là bảo đảm ngữ nghĩa tuyệt đối cho mọi nghĩa đa nghĩa. Lượt chạy practice và không tăng bậc ôn.

## 2. Đã làm: event mới giữ ngữ cảnh câu hỏi

Ngoài kết quả/assisted/mode đã có, đáp án mới lưu:

| Field            | Ý nghĩa                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| questionKind     | meaning, word-choice, cloze, recall, cloze-choice hoặc word-form-choice |
| questionId       | sessionId:index; định danh lần xuất hiện câu hỏi trong lượt             |
| contentVersion   | Luôn là phiên bản catalog của session cho mọi kind                      |
| skill            | vocabulary cho các dạng đang triển khai                                 |
| scoringVersion   | 2 cho event mới; vẫn đọc event scoringVersion 1                         |
| sourceQuestionId | ID câu nguồn cho hai dạng biên soạn, dạng v1:part5:bài:số-câu           |
| sourceVersion    | Phiên bản gói câu biên soạn, tách khỏi contentVersion                   |
| hintCount        | Số chữ đã lộ trong câu, lưu cùng event scoringVersion 2                 |
| hintLimit        | floor(số chữ cái của đáp án × 0.3), không có mức tối thiểu              |

questionId định danh lần xuất hiện trong session; sourceQuestionId liên kết câu nguồn xuyên session cho cloze-choice/word-form-choice. Chưa lưu toàn bộ câu hỏi hoặc câu trả lời người dùng trong event; do đó chưa đủ để phân tích cụ thể từng distractor sau khi session cũ được thay.

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

Component này dùng lại cho mức gõ dạng từ và nghe khi triển khai; hiện dạng từ đã có mức chọn, chưa có mức gõ và chưa có bài nghe. Đây là component nhập đáp án, không phải một skill riêng. Các dạng trong bảng chưa được triển khai đầy đủ; mục 1 mô tả code đang chạy. `cloze` vẫn là nhập chữ, còn `cloze-choice` là dạng chọn mới. Chưa migrate lịch ôn sang hai skill.

`LetterSlotsInput` nhận prop `revealed` để khóa chữ gợi ý. Vị trí chữ đã lộ được lưu ngay trong session, đồng bộ tab và giữ khi reload; sang câu mới mới reset. Hạn mức là `floor(số chữ cái × 0.3)`, không tính dấu cách/dấu câu và không đặt mức tối thiểu: 3 chữ → 0, 5 chữ → 1, 10 chữ → 3. Bấm gợi ý vẫn được lộ thêm chữ sau hạn mức; đây là ngưỡng chấm, không phải số lần tối đa có thể bấm.

Nếu số chữ lộ ≤ hạn mức và đáp án đúng thì chấm đúng, review tăng box như thường. Chỉ khi vượt hạn mới đặt peeked/assisted và không tính đúng. Riêng xem lại từ/xem đáp án vẫn đánh dấu hỗ trợ ngay; luật mới không gỡ dấu hỗ trợ đã có. Event mới scoringVersion 2 ghi hintCount/hintLimit; validator nhận cả version 1 và 2. Event lịch sử giữ nguyên, không suy diễn lại số gợi ý hoặc ghi lại version catalog cho event cũ đã mất ngữ cảnh.

CSS input native dùng `.letter-slots .letter-slots-input`, không phụ thuộc form cha. Chạm trực tiếp vào input native; kiểm tra iPhone thật đã được người dùng loại khỏi phạm vi.

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

**Part 5 đã phân loại lại:** builder nhận 299 câu hợp lệ trong 50 gói. Ít nhất ba trong bốn options cùng family/gốc của từ liên kết (kể cả biến tố và biến đổi hình thái có luật) thì là dạng từ; dưới ngưỡng đó thì giữ cloze. UI có hai nút “Luyện dạng từ” và “Luyện điền chỗ trống”, chỉ mở các câu đúng nhãn, event giữ đúng questionKind.

Đáp án được đối chiếu với từ chính/family trong đúng bài, có quy tắc số nhiều, chia động từ, trường hợp bất quy tắc và gốc cụm động từ. Nếu khớp từ hai wordId trở lên vẫn bỏ qua, kể cả một trong hai là khớp chính xác. Không chọn wordId chỉ bằng tiền tố giống nhau. Phân loại family có thêm quy tắc tạo từ và danh sách biến đổi chính tả không đều trong `scripts/lib/word-forms.mjs`; các mở rộng phân loại không được dùng tùy tiện để đoán liên kết đáp án.

**Cloze từ catalog:** mỗi từ có tối đa một câu, lấy ví dụ đầu tiên chứa đúng một lần từ chính (không phân biệt hoa/thường, khớp nguyên từ/cụm từ), thay bằng chỗ trống. Chỉ tạo khi có đủ ba đáp án nhiễu khác nhau trong cùng bài và cùng từ loại; loại synonym và family/gốc ở cả hai chiều. Không đủ đáp án thì bỏ qua, không lấy từ bài hoặc từ loại khác để bù. ID mới `catalog:example:<wordId>:<index>` dùng chỉ số ví dụ gốc, bắt đầu từ 0; chỉ dành cho `cloze-choice`. Loader tiếp tục nhận ID Part 5 cũ; session và event cũ không bị viết lại. Không thêm field vào question/event và không đổi schemaVersion hoặc cách chấm.

Đã lấy lại 76 câu trước đây bị `unlinked-answer` trong dữ liệu commit 82c1cff (khác số 75 nêu khi review). Một câu còn bị bỏ vì lựa chọn không hợp lệ. Báo cáo `src/content/exercise-report.json` có sourceQuestions/count/byKind, recovered, skipped và linked để truy từng câu. Giữ nguyên câu/options/đáp án V1; không tự sinh distractor cho Part 5. Các số phân loại mới tính trên toàn bộ 299 câu sau khi khôi phục và bổ sung biến thể, không dùng số 205/223 làm quota.

Gói được tải theo bài, có sourceVersion độc lập; contentVersion của event mới luôn là catalog. Lỗi tải được thử lại; reload/resume dùng câu đã lưu, không cần tải lại gói. Session/event cũ vẫn đọc được và không tự đổi nhãn lịch sử. Builder dọn toàn bộ file trong thư mục output trước khi ghi gói mới; chỉ giữ các gói hiện hành mà manifest trỏ tới. Tab/cache còn manifest cũ cần tải lại trang nếu chưa tải gói trước đó.

Hai dạng biên soạn vẫn chạy practice: ghi kết quả, không tăng box/dueAt hoặc tạo tiến độ từ mới. Loader/manifest cho everyday/affixes/ETS chưa triển khai; ETS vẫn rỗng.

**Xáo đáp án nhận biết:** Fisher–Yates dùng seed từ đúng session ID, wordId và hướng câu hỏi. Options được lưu trong session nên reload không đổi thứ tự; lượt/retry mới có seed mới. Không còn xoay theo độ dài từ. Vì chỉ có bốn vị trí, hai seed khác nhau vẫn có thể tình cờ đặt đáp án đúng cùng vị trí; không dựa vào đó để nhận diện session hoặc suy đoán điểm.

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

Đợt này đã kiểm tra cloze-choice, recognition hai hướng và gợi ý chữ khóa; đợt sửa scoringVersion 2 đã qua 58 unit tests và 40 E2E desktop/mobile; lint/typecheck/format/build đều qua. Catalog vẫn 600 từ/50 bài, fingerprint `54681aa41d1b`. Chưa có kiểm chứng độc lập từ reviewer khác trong đợt này; kiểm tra iPhone thật không nằm trong phạm vi theo yêu cầu người dùng.

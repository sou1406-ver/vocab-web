# Lõi học: phần đã sửa và phần cần chốt

Ngày 25/10/2026. Đọc tài liệu này để phân biệt thay đổi đã chạy với đề xuất cho bước tiếp theo. Đây là phần bổ sung cho [SINGLE-APP.md](SINGLE-APP.md).

## 1. Đã làm: Question tách theo kind

`src/domain/types.ts` dùng union cho các kind đang hoạt động:

| Dạng             | Dữ liệu riêng                                            | Hành vi hiện có                                       |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| meaning          | options bắt buộc                                         | Chọn một nghĩa                                        |
| cloze            | Không có danh sách đáp án chọn                           | Nhập từ còn thiếu                                     |
| recall           | Không có danh sách đáp án chọn                           | Nhập từ từ gợi ý nghĩa                                |
| cloze-choice     | options và sourceId/sourceVersion bắt buộc               | Chọn đáp án cho câu khuyết biên soạn sẵn              |
| word-form-choice | options và sourceId/sourceVersion bắt buộc               | Chọn dạng từ; ít nhất ba lựa chọn cùng gốc/family     |
| word-form        | Không có đáp án chọn; sourceId/sourceVersion optional    | Gõ dạng từ trong câu khuyết kèm từ gợi ý              |
| build            | answer là mảng mảnh đúng thứ tự; tiles là ngân hàng mảnh | Ghép gốc + phụ tố theo nghĩa Việt và từ loại          |
| synonym-choice   | options bắt buộc; direction optional                     | Chọn đồng nghĩa hoặc trái nghĩa có nhãn rõ ràng       |
| synonym-context  | options bắt buộc; target/direction optional              | Chọn gần nghĩa trong câu giữ nguyên, gạch chân từ gốc |

Các kind cùng có wordId, prompt và answer. Answer của Build là mảng chuỗi; các dạng khác giữ chuỗi như cũ. Không thêm type Listening/Match giả khi chưa có renderer, scorer và dữ liệu kiểm chứng. Khi triển khai một dạng, thêm nhánh union riêng và validator tương ứng; không nhét pairs/audio/tokens vào prompt.

Để tương thích tab đang chạy bản schema 2, generator vẫn ghi `options: []` cho câu nhập chữ. Type chỉ cho phép mảng rỗng ở hai nhánh này; validator nhận cả mảng rỗng và trường bị lược bỏ. Options có nội dung ở cloze/recall hoặc kind chưa hỗ trợ bị từ chối. Đây là trường tương thích, không phải danh sách lựa chọn của câu nhập chữ.

Đã thêm `word-choice`: nghĩa Việt → chọn từ Anh, dùng options như meaning nhưng lưu kind riêng. Tại mỗi bài có lượt “Luyện chọn nghĩa / chọn từ” cho tối đa sáu từ, hai hướng mỗi từ; lượt kế tiếp luân phiên nhóm từ để phủ cả bài. Dùng data V1, loại distractor trùng hoặc có quan hệ synonym/family/nghĩa chồng đã biết; chưa coi đó là bảo đảm ngữ nghĩa tuyệt đối cho mọi nghĩa đa nghĩa. Lượt chạy practice và không tăng bậc ôn.

## 2. Đã làm: event mới giữ ngữ cảnh câu hỏi

Ngoài kết quả/assisted/mode đã có, đáp án mới lưu:

| Field            | Ý nghĩa                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| questionKind     | meaning, word-choice, cloze, recall, cloze-choice, word-form-choice, word-form, build, synonym-choice hoặc synonym-context |
| questionId       | sessionId:index; định danh lần xuất hiện câu hỏi trong lượt                                                                |
| contentVersion   | Luôn là phiên bản catalog của session cho mọi kind                                                                         |
| skill            | vocabulary cho các dạng đang triển khai                                                                                    |
| scoringVersion   | 3 cho Build theo thứ tự mảnh; các dạng cũ tiếp tục ghi 2; vẫn đọc version 1                                                |
| sourceQuestionId | ID câu nguồn cho hai dạng biên soạn, dạng v1:part5:bài:số-câu                                                              |
| sourceVersion    | Phiên bản gói câu biên soạn, tách khỏi contentVersion                                                                      |
| hintCount        | Số chữ đã lộ trong câu, lưu cùng event scoringVersion 2                                                                    |
| hintLimit        | floor(số chữ cái của đáp án × 0.3), không có mức tối thiểu                                                                 |

questionId định danh lần xuất hiện trong session; sourceQuestionId liên kết câu nguồn xuyên session cho cloze-choice/word-form-choice/word-form/build. Chưa lưu toàn bộ câu hỏi hoặc câu trả lời người dùng trong event; do đó chưa đủ để phân tích cụ thể từng distractor sau khi session cũ được thay.

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

Component này đã dùng cho mức gõ dạng từ; phần nghe chưa triển khai. Đây là component nhập đáp án, không phải một skill riêng. Các dạng trong bảng chưa được triển khai đầy đủ; mục 1 mô tả code đang chạy. `cloze` vẫn là nhập chữ, còn `cloze-choice` là dạng chọn mới. Chưa migrate lịch ôn sang hai skill.

`LetterSlotsInput` nhận prop `revealed` để khóa chữ gợi ý. Vị trí chữ đã lộ được lưu ngay trong session, đồng bộ tab và giữ khi reload; sang câu mới mới reset. Hạn mức là `floor(số chữ cái × 0.3)`, không tính dấu cách/dấu câu và không đặt mức tối thiểu: 3 chữ → 0, 5 chữ → 1, 10 chữ → 3. Bấm gợi ý vẫn được lộ thêm chữ sau hạn mức; đây là ngưỡng chấm, không phải số lần tối đa có thể bấm.

Nếu số chữ lộ ≤ hạn mức và đáp án đúng thì chấm đúng, review tăng box như thường. Chỉ khi vượt hạn mới đặt peeked/assisted và không tính đúng. Riêng xem lại từ/xem đáp án vẫn đánh dấu hỗ trợ ngay; luật mới không gỡ dấu hỗ trợ đã có. Event mới scoringVersion 2 ghi hintCount/hintLimit; validator nhận cả version 1 và 2. Event lịch sử giữ nguyên, không suy diễn lại số gợi ý hoặc ghi lại version catalog cho event cũ đã mất ngữ cảnh.

CSS input native dùng `.letter-slots .letter-slots-input`, không phụ thuộc form cha. Chạm trực tiếp vào input native; kiểm tra iPhone thật đã được người dùng loại khỏi phạm vi.

Dữ liệu tạm dùng nguồn V1 hiện có theo yêu cầu người dùng, chờ bổ sung nguồn mới. Bước 1 không tạo hoặc tải thêm dữ liệu bên ngoài. Nội dung đang gõ chưa submit vẫn là state giao diện, không phải kết quả được lưu khi reload.

## 4. Đề xuất: nội dung bài tập tải theo bài

Builder đưa words/lessons/topics vào catalog lõi. Examples/synonyms/antonyms vẫn có; mỗi mục family hiện giữ `{text, pos, meaning, parts}` lấy từ `data/generated/word-details`, bao gồm thứ tự các mảnh gốc. Khi nguồn thiếu parts, builder ghi mảng rỗng, không tự tách hoặc đoán phụ tố.

**Bước dữ liệu trước Build đã triển khai:** `Word.family[].parts` là field optional kiểu `string[]`. Validator đọc được custom word/backup cũ không có field này, không tự thêm field vào dữ liệu cũ; nếu có thì phải là mảng chỉ gồm chuỗi. Snapshot vẫn schemaVersion 2, giữ ID từ/event và lịch ôn. Riêng việc khôi phục nội dung family.parts được phép đổi fingerprint catalog; không ghi lại contentVersion của session/event cũ. Catalog sinh lại có 982 mục family gồm từ hai mảnh trở lên (không phải 982 từ duy nhất); 166/600 từ chính có parts từ hai mảnh trở lên.

**Build đã triển khai từ catalog:** mỗi mục family có ít nhất hai mảnh khác nhau và đủ text/meaning/pos tạo một câu `build`. Câu có prompt là nghĩa Việt kèm từ loại của chính dạng từ, answer là mảng parts đúng thứ tự, tiles là parts cộng đúng một prefix và hai suffix nhiễu từ `data/generated/affixes.json`. `AFFIX_GROUPS` và `RARE_AFFIXES` được port từ `main:src/lib/data.ts` theo bộ lọc `main:src/lib/quiz.ts`: loại mảnh đáp án, mọi biến thể cùng nhóm và phụ tố hiếm khỏi pool nhiễu. Tiles luôn khác nhau; câu có parts trùng hoặc dữ liệu không đủ bị bỏ. ID nguồn là `build:<wordId>:<form>` với form chuẩn hóa chữ thường; chỉ giữ một câu cho mỗi ID.

Build được sinh khi mở lượt practice qua nút “Ghép từ” ở trang bài; ẩn nút nếu không có câu. Xáo tiles và chọn nhiễu bằng seed session ID + sourceId. Lưu tiles trong câu nên reload giữ thứ tự; retry giữ câu/parts và xáo tiles theo session mới. Thêm dạng này không đổi catalog/fingerprint hoặc sinh gói bài mới.

`form`, `sourceId`, `sourceVersion` của Build là metadata optional; generator mới luôn ghi, sourceVersion bằng phiên bản catalog. Feedback giữ input dạng chuỗi để đọc dữ liệu cũ, thêm `selectedParts?: string[]` lưu các mảnh đã chọn sau khi trả lời. Lựa chọn chưa submit là state giao diện. Chấm bằng so sánh mảng đúng thứ tự, không chỉ nối ra cùng chữ; feedback hiện từ hoàn chỉnh theo form. Build dùng scoringVersion 3, hintCount/hintLimit đều 0, không có gợi ý chữ và chỉ chạy practice; các dạng trước giữ scorer/version cũ. Validator tiếp tục nhận snapshot schema 2 và feedback cũ thiếu selectedParts. Giữ nguyên database, ID từ/event và lịch ôn.

Kiểm tra dữ liệu nguồn hiện tại:

| File           | Dung lượng thô hiện tại | Trạng thái                             |
| -------------- | ----------------------- | -------------------------------------- |
| exercises.json | 288.743 byte            | Có lessons và reviews                  |
| everyday.json  | 54.592 byte             | 150 mục                                |
| affixes.json   | 12.362 byte             | Từ điển phụ tố                         |
| ets.json       | 3 byte                  | Mảng rỗng; chưa có bộ ETS để phát hành |

Hướng nạp đề xuất: manifest nhỏ gồm ID bộ/bài, phiên bản/hash và đường dẫn gói; exercises tách theo lesson/review, everyday chia theo nhóm, affixes là nguồn tra riêng. Chỉ tải gói khi mở dạng bài liên quan. Catalog lõi không import tất cả gói. ID câu nguồn cần ổn định khi sửa lỗi chính tả; phiên bản nội dung thay đổi độc lập với ID.

**Part 5 đã phân loại lại:** builder nhận 299 câu hợp lệ trong 50 gói. Ít nhất ba trong bốn options cùng family/gốc của từ liên kết (kể cả biến tố và biến đổi hình thái có luật) thì là dạng từ; dưới ngưỡng đó thì giữ cloze. UI có hai nút “Luyện dạng từ” và “Luyện điền chỗ trống”, chỉ mở các câu đúng nhãn, event giữ đúng questionKind.

**Mức gõ dạng từ:** nút “Luyện dạng từ — gõ” dùng lại các câu `word-form-choice` đã tải, chuyển thành `word-form` khi bắt đầu lượt. Đề là câu khuyết kèm `(từ gợi ý)` ở cuối; từ gợi ý lấy từ option ngắn nhất khác đáp án đúng và thuộc family đã ghi trong catalog (`word.text` + `word.family`), so sánh không phân biệt hoa/thường và khoảng trắng ngoài. Nếu bằng độ dài thì giữ thứ tự options nguồn. Không dùng suy diễn hình thái để coi một distractor khác gốc là từ gợi ý. Nếu không có option phù hợp thì dùng `word.text` khi khác đáp án; nếu vẫn không có thì bỏ câu. Vì vậy số câu mức gõ hiển thị là giới hạn trên theo gói nguồn. Đáp án nguồn giữ nguyên, kể cả biến tố và cụm nhiều từ; options của câu gõ được ghi `[]` và validator cũng nhận trường bị lược bỏ. Câu hoàn chỉnh trong feedback bỏ đuôi `(từ gợi ý)`; prompt lưu trong session giữ nguyên cho reload/retry.

Câu mới luôn giữ `sourceId` và `sourceVersion` của Part 5. Hai field này optional trong type `word-form`; validator chấp nhận cùng thiếu hoặc cùng có giá trị hợp lệ. Event mới ghi `questionKind: word-form`, `sourceQuestionId`/`sourceVersion` khi có metadata nguồn, contentVersion của catalog và scoringVersion 2. Không thêm field cue vào snapshot: phần gợi ý nằm trong prompt đã lưu, nên reload/retry giữ nguyên đề. Validator tiếp tục đọc câu/event cũ; giữ schemaVersion 2, ID event sessionId:index, fingerprint catalog và tên IndexedDB.

Mức gõ chạy practice, dùng `LetterSlotsInput` và cùng luật gợi ý `floor(số chữ cái × 0.3)` của recall/cloze: trong hạn mức vẫn được chấm đúng, vượt hạn thì assisted. Không tăng box, đổi dueAt/reviewedDay hoặc tạo tiến độ từ mới. Gợi ý đã lộ được lưu trong session, đồng bộ tab và reset khi sang câu mới.

Đáp án được đối chiếu với từ chính/family trong đúng bài, có quy tắc số nhiều, chia động từ, trường hợp bất quy tắc và gốc cụm động từ. Nếu khớp từ hai wordId trở lên vẫn bỏ qua, kể cả một trong hai là khớp chính xác. Không chọn wordId chỉ bằng tiền tố giống nhau. Phân loại family có thêm quy tắc tạo từ và danh sách biến đổi chính tả không đều trong `scripts/lib/word-forms.mjs`; các mở rộng phân loại không được dùng tùy tiện để đoán liên kết đáp án.

**Cloze từ catalog:** mỗi từ có tối đa một câu, lấy ví dụ đầu tiên chứa đúng một lần từ chính (không phân biệt hoa/thường, khớp nguyên từ/cụm từ), thay bằng chỗ trống. Chỉ tạo khi có đủ ba đáp án nhiễu khác nhau trong cùng bài và cùng từ loại; loại synonym và family/gốc ở cả hai chiều. Không đủ đáp án thì bỏ qua, không lấy từ bài hoặc từ loại khác để bù. ID mới `catalog:example:<wordId>:<index>` dùng chỉ số ví dụ gốc, bắt đầu từ 0; chỉ dành cho `cloze-choice`. Loader tiếp tục nhận ID Part 5 cũ; session và event cũ không bị viết lại. Không thêm field vào question/event và không đổi schemaVersion hoặc cách chấm.

Đã lấy lại 76 câu trước đây bị `unlinked-answer` trong dữ liệu commit 82c1cff (khác số 75 nêu khi review). Một câu còn bị bỏ vì lựa chọn không hợp lệ. Báo cáo `src/content/exercise-report.json` có sourceQuestions/count/byKind, recovered, skipped và linked để truy từng câu. Giữ nguyên câu/options/đáp án V1; không tự sinh distractor cho Part 5. Các số phân loại mới tính trên toàn bộ 299 câu sau khi khôi phục và bổ sung biến thể, không dùng số 205/223 làm quota.

Gói được tải theo bài, có sourceVersion độc lập; contentVersion của event mới luôn là catalog. Lỗi tải được thử lại; reload/resume dùng câu đã lưu, không cần tải lại gói. Session/event cũ vẫn đọc được và không tự đổi nhãn lịch sử. Builder dọn toàn bộ file trong thư mục output trước khi ghi gói mới; chỉ giữ các gói hiện hành mà manifest trỏ tới. Tab/cache còn manifest cũ cần tải lại trang nếu chưa tải gói trước đó.

Hai dạng biên soạn vẫn chạy practice: ghi kết quả, không tăng box/dueAt hoặc tạo tiến độ từ mới. Loader/manifest cho everyday/affixes/ETS chưa triển khai; ETS vẫn rỗng.

**Xáo đáp án nhận biết:** Fisher–Yates dùng seed từ đúng session ID, wordId và hướng câu hỏi. Options được lưu trong session nên reload không đổi thứ tự; lượt/retry mới có seed mới. Không còn xoay theo độ dài từ. Vì chỉ có bốn vị trí, hai seed khác nhau vẫn có thể tình cờ đặt đáp án đúng cùng vị trí; không dựa vào đó để nhận diện session hoặc suy đoán điểm.

### Đồng nghĩa: hai mức practice

`synonym-choice` hỏi từ gốc, chọn một synonym theo seed session. Nếu từ có antonym hợp lệ, khoảng một phần ba lượt hỏi trái nghĩa. Prompt mới chỉ là `word.text` ở cả hai hướng; tiêu đề và nhãn `ĐỒNG NGHĨA`/`TRÁI NGHĨA` trên UI đọc từ direction. Validator vẫn nhận session cũ có tiền tố `TRÁI NGHĨA:` khi direction là antonym, UI bỏ tiền tố khi hiển thị từ. Synonym/antonym trùng từ gốc hoặc mâu thuẫn giữa hai danh sách không được dùng làm đáp án. Tách các mục ngăn bằng dấu phẩy/chấm phẩy, normalize hoa/thường/khoảng trắng và giữ cách viết đầu tiên khi trùng.

`synonym-context` chọn ví dụ đầu tiên chứa từ/cụm gốc đúng một lần, khớp nguyên từ và không phân biệt hoa/thường. Bỏ ví dụ chứa chỗ trống có sẵn hoặc không khớp; không có ví dụ hợp lệ thì bỏ từ. Prompt giữ nguyên câu, target ghi từ cần gạch chân; không khoét trống và không thay synonym vào câu, kể cả trong feedback. Hướng của mức này luôn là synonym.

Ba nhiễu lấy từ text và synonyms của từ khác cùng từ loại, ưu tiên pool gộp cùng bài + các bài cùng chủ đề; chỉ lấy từ toàn catalog để bù số còn thiếu. Thu thập và normalize pool gần trước để alias trùng ở chủ đề khác không làm mất ưu tiên. Loại từ gốc, toàn bộ synonyms/antonyms/family đã biết, quan hệ synonym chiều ngược, giao synonyms và family chiều ngược đã biết. Cả các alias của nguồn liên quan cũng bị loại trên toàn catalog để không lọt trở lại qua synonyms của một nguồn khác, kể cả khi chỉ dùng pool gần. Nếu không đủ ba nhiễu khác nhau sau normalize thì bỏ câu. Đáp án và options xáo theo seed session/wordId/kind; retry giữ nguyên câu/đáp án/hướng và xáo lại options. Nút “Đồng nghĩa”/“Gần nghĩa trong câu” ẩn khi không có câu.

Các field direction/target/sourceId/sourceVersion trong hai nhánh mới là optional để đọc dữ liệu cũ; generator luôn ghi direction, source metadata và target cho ngữ cảnh. Khi thiếu direction thì đọc là synonym, không diễn giải prompt trái nghĩa thiếu direction thành dữ liệu hợp lệ. ID nguồn là `synonym-choice:<wordId>:<direction>` hoặc `synonym-context:<wordId>:<exampleIndex>`, sourceVersion bằng catalog. Event mới lưu direction optional, questionKind riêng và scorer chuỗi hiện có scoringVersion 2, hintCount/hintLimit 0. Không suy diễn direction cho event lịch sử. Hai mức chỉ chạy practice, giữ schemaVersion 2, ID event, lịch ôn và catalog/fingerprint.

Avatar Boring Avatars lưu seed trong `settings.avatarSeed` optional (chuỗi không rỗng, tối đa 200 ký tự). Bản sao cũ không có field này vẫn đọc được với schemaVersion 2; avatar mặc định sinh theo tên hoặc seed khách. Chọn avatar không đổi tên, tiến độ hay catalog/fingerprint. Bản sao lưu giữ nguyên lựa chọn.

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

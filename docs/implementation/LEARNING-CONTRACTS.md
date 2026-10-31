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
| match            | groupId/sourceId/sourceVersion optional                  | Sáu question riêng hiện chung một bảng nối từ         |
| listen-choice    | options; sourceId/sourceVersion optional                 | Nghe phát âm rồi chọn từ                              |
| listen-type      | sourceId/sourceVersion optional                          | Nghe phát âm rồi gõ bằng ô chữ                        |

Các kind cùng có wordId, prompt và answer. Answer của Build là mảng chuỗi; các dạng khác giữ chuỗi như cũ. Hai kind nghe `listen-choice`/`listen-type` dùng prompt tiếng Việt cố định, answer là từ tiếng Anh, metadata nguồn optional. Khi triển khai một dạng, thêm nhánh union riêng và validator tương ứng; không nhét pairs/audio/tokens vào prompt.

Để tương thích tab đang chạy bản schema 2, generator vẫn ghi `options: []` cho câu nhập chữ. Type chỉ cho phép mảng rỗng ở hai nhánh này; validator nhận cả mảng rỗng và trường bị lược bỏ. Options có nội dung ở cloze/recall hoặc kind chưa hỗ trợ bị từ chối. Đây là trường tương thích, không phải danh sách lựa chọn của câu nhập chữ.

Đã thêm `word-choice`: nghĩa Việt → chọn từ Anh, dùng options như meaning nhưng lưu kind riêng. Tại mỗi bài có lượt “Luyện chọn nghĩa / chọn từ” cho tối đa sáu từ, hai hướng mỗi từ; lượt kế tiếp luân phiên nhóm từ để phủ cả bài. Dùng data V1, loại distractor trùng hoặc có quan hệ synonym/family/nghĩa chồng đã biết; chưa coi đó là bảo đảm ngữ nghĩa tuyệt đối cho mọi nghĩa đa nghĩa. Lượt chạy practice và không tăng bậc ôn.

## 2. Đã làm: event mới giữ ngữ cảnh câu hỏi

Ngoài kết quả/assisted/mode đã có, đáp án mới lưu:

| Field            | Ý nghĩa                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| questionKind     | meaning, word-choice, cloze, recall, cloze-choice, word-form-choice, word-form, build, synonym-choice, synonym-context, match, listen-choice hoặc listen-type |
| questionId       | sessionId:index; định danh lần xuất hiện câu hỏi trong lượt                                                                                                   |
| contentVersion   | Luôn là phiên bản catalog của session cho mọi kind                                                                                                            |
| skill            | vocabulary cho các dạng đang triển khai                                                                                                                       |
| scoringVersion   | 4 cho Match theo từng cặp; 3 cho Build; các dạng cũ tiếp tục ghi 2; vẫn đọc version 1                                                                         |
| sourceQuestionId | ID câu nguồn cho hai dạng biên soạn, dạng v1:part5:bài:số-câu                                                                                                 |
| sourceVersion    | Phiên bản gói câu biên soạn, tách khỏi contentVersion                                                                                                         |
| hintCount        | Số chữ đã lộ trong câu, lưu cùng event scoringVersion 2                                                                                                       |
| hintLimit        | floor(số chữ cái của đáp án × 0.3), không có mức tối thiểu                                                                                                    |

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

Component này đã dùng cho mức gõ dạng từ; đã dùng thêm cho nghe gõ từ. Đây là component nhập đáp án, không phải một skill riêng. Các dạng trong bảng chưa được triển khai đầy đủ; mục 1 mô tả code đang chạy. `cloze` vẫn là nhập chữ, còn `cloze-choice` là dạng chọn mới. Chưa migrate lịch ôn sang hai skill.

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

**Cloze từ catalog:** builder chỉ ghi câu nguồn với `options: []`, lấy ví dụ đầu tiên chứa đúng một lần từ chính, thay bằng chỗ trống. ID `catalog:example:<wordId>:<index>` giữ nguyên. Khi bắt đầu lượt, chọn ba nhiễu từ pool theo tiến độ hiện tại, loại family/synonym hai chiều, chuẩn hóa chống trùng, rồi xáo bằng seed session. Thiếu ba nhiễu an toàn thì bỏ câu; tránh lặp bộ bốn khi đủ pool. Loader nhận cả gói nguồn mới và gói cũ có bốn options. Session vẫn bắt buộc bốn options và giữ nguyên lựa chọn đã lưu; validator snapshot không nới lỏng. Part 5 giữ options biên soạn sẵn. Thay gói bài tập không đổi catalog/fingerprint, schemaVersion hoặc cách chấm.

Đã lấy lại 76 câu trước đây bị `unlinked-answer` trong dữ liệu commit 82c1cff (khác số 75 nêu khi review). Một câu còn bị bỏ vì lựa chọn không hợp lệ. Báo cáo `src/content/exercise-report.json` có sourceQuestions/count/byKind, recovered, skipped và linked để truy từng câu. Giữ nguyên câu/options/đáp án V1; không tự sinh distractor cho Part 5. Các số phân loại mới tính trên toàn bộ 299 câu sau khi khôi phục và bổ sung biến thể, không dùng số 205/223 làm quota.

Gói được tải theo bài, có sourceVersion độc lập; contentVersion của event mới luôn là catalog. Lỗi tải được thử lại; reload/resume dùng câu đã lưu, không cần tải lại gói. Session/event cũ vẫn đọc được và không tự đổi nhãn lịch sử. Builder dọn toàn bộ file trong thư mục output trước khi ghi gói mới; chỉ giữ các gói hiện hành mà manifest trỏ tới. Tab/cache còn manifest cũ cần tải lại trang nếu chưa tải gói trước đó.

Hai dạng biên soạn vẫn chạy practice: ghi kết quả, không tăng box/dueAt hoặc tạo tiến độ từ mới. Loader/manifest cho everyday/affixes/ETS chưa triển khai; ETS vẫn rỗng.

**Xáo đáp án nhận biết:** Fisher–Yates dùng seed từ đúng session ID, wordId và hướng câu hỏi. Options được lưu trong session nên reload không đổi thứ tự; lượt/retry mới có seed mới. Không còn xoay theo độ dài từ. Vì chỉ có bốn vị trí, hai seed khác nhau vẫn có thể tình cờ đặt đáp án đúng cùng vị trí; không dựa vào đó để nhận diện session hoặc suy đoán điểm.

### Đồng nghĩa: hai mức practice

`synonym-choice` hỏi từ gốc, chọn một synonym theo seed session. Nếu từ có antonym hợp lệ, khoảng một phần ba lượt hỏi trái nghĩa. Prompt mới chỉ là `word.text` ở cả hai hướng; tiêu đề và nhãn `ĐỒNG NGHĨA`/`TRÁI NGHĨA` trên UI đọc từ direction. Validator vẫn nhận session cũ có tiền tố `TRÁI NGHĨA:` khi direction là antonym, UI bỏ tiền tố khi hiển thị từ. Synonym/antonym trùng từ gốc hoặc mâu thuẫn giữa hai danh sách không được dùng làm đáp án. Tách các mục ngăn bằng dấu phẩy/chấm phẩy, normalize hoa/thường/khoảng trắng và giữ cách viết đầu tiên khi trùng.

`synonym-context` chọn ví dụ đầu tiên chứa từ/cụm gốc đúng một lần, khớp nguyên từ và không phân biệt hoa/thường. Bỏ ví dụ chứa chỗ trống có sẵn hoặc không khớp; không có ví dụ hợp lệ thì bỏ từ. Prompt giữ nguyên câu, target ghi từ cần gạch chân; không khoét trống và không thay synonym vào câu, kể cả trong feedback. Hướng của mức này luôn là synonym.

Ba nhiễu dùng pool chung: từ cùng bài và từ cùng từ loại đã `progress.tested` ở bài khác; khi thiếu mới lấy từ cùng bài khác từ loại, rồi family của từ trong bài. Không lấy từ chưa học ở bài khác, kể cả cùng chủ đề, và không lấy aliases synonym làm nhiễu. Giữ toàn bộ bộ lọc unsafe hiện có: synonyms/antonyms/family, quan hệ ngược, giao synonym, chuẩn hóa chống trùng. Thiếu ba nhiễu thì bỏ câu. Áp dụng cùng ranh giới pool cho recognition/meaning, synonym và nghe chọn; callback `startExercises(sessionId, snapshot)` dùng progress mới nhất trong transaction. Đáp án/options xáo theo seed và lưu trong session.

Các field direction/target/sourceId/sourceVersion trong hai nhánh mới là optional để đọc dữ liệu cũ; generator luôn ghi direction, source metadata và target cho ngữ cảnh. Khi thiếu direction thì đọc là synonym, không diễn giải prompt trái nghĩa thiếu direction thành dữ liệu hợp lệ. ID nguồn là `synonym-choice:<wordId>:<direction>` hoặc `synonym-context:<wordId>:<exampleIndex>`, sourceVersion bằng catalog. Event mới lưu direction optional, questionKind riêng và scorer chuỗi hiện có scoringVersion 2, hintCount/hintLimit 0. Không suy diễn direction cho event lịch sử. Hai mức chỉ chạy practice, giữ schemaVersion 2, ID event, lịch ôn và catalog/fingerprint.

### Nghe trên Edge/Chrome desktop

`listen-choice` và `listen-type` chỉ chạy practice, giữ schemaVersion 2. Prompt lần lượt là “Nghe và chọn từ.” và “Nghe và gõ từ.”, không chứa từ đích. Answer lấy word.text; sourceId `<kind>:<wordId>`, sourceVersion bằng catalog; hai field nguồn optional để đọc bản sao không có metadata. Bản sao cũ và scorer 1–4 vẫn đọc được; hai dạng nghe dùng scorer chuỗi hiện có, scoringVersion 2, ID event vẫn sessionId:index. Practice không tăng box hoặc đổi dueAt/reviewedDay.

Nghe chọn có đúng bốn từ khác nhau sau normalize, dùng pool cùng bài/từ đã tested nêu trên. Trong từng tier từ gốc, ưu tiên cùng chữ đầu hoặc độ dài chênh không quá hai chữ cái; family chỉ bù sau từ gốc cùng bài khác từ loại. Nghe gõ dùng LetterSlotsInput, hintLimit = floor(số chữ cái × 0.3), vượt hạn mới assisted. Nghe lại/nghe chậm không tính hỗ trợ.

Câu tự đọc khi mở và khi sang câu mới; có nút Nghe lại không chứa đáp án trong nhãn. Hủy phát âm khi rời câu. Nếu chưa có giọng tiếng Anh, ẩn nút vào bài nghe; lượt đã lưu vẫn mở được nhưng khóa nhập/chọn cho tới khi có giọng, cho phép kết thúc lượt hoặc mở Cài đặt. Giọng/tốc độ chỉ lưu trong localStorage `vocab-speech-settings`, không nằm trong snapshot. Chỉ kiểm chứng Edge/Chrome desktop; không thêm xử lý iOS/Safari.

### Match theo chủ đề

Mỗi bảng có 6 question `match` liên tiếp, chỉ trong session practice; `prompt` là từ tiếng Anh, `answer` là nghĩa Việt, mỗi cặp có wordId riêng. Generator ghi chung groupId `<sessionId>:match:<topicId>`, sourceId `match:<topicId>:<wordId>` và sourceVersion catalog. Metadata optional; khi không có groupId, sáu question liên tiếp vẫn tạo một bảng. Validator giữ schemaVersion 2 và đọc các loại câu/session/event cũ như trước.

Chọn từ trong các bài cùng chủ đề, xáo nhóm `progress.tested` trước rồi bù từ chưa học. Loại từ tiếng Anh trùng sau normalize và các nghĩa có gloss trùng/chứa nhau theo cả hai chiều; tách gloss bằng dấu phẩy/chấm phẩy như recognition. Không đủ 6 cặp thì không sinh bảng dở. Hai cột có thứ tự ổn định theo session; mỗi lần mở bảng mới dùng session seed mới.

Session.index giữ ở question đầu của bảng cho tới khi cả 6 cặp được nối đúng. Nối sai đánh dấu index từ bên trái trong `session.matchMistakes?: number[]`, lưu ngay và giữ qua reload/đồng bộ tab; không chấm sai từ không được chọn bên trái. Nối đúng khóa cả hai ô và ghi đúng một event `sessionId:index` cho cặp đó, theo index question gốc, kể cả nối không theo thứ tự. Event `correct` chỉ true nếu cặp chưa có lần nối sai; `assisted` false, hintCount/hintLimit 0, scoringVersion 4. Không dùng scorer chuỗi thông thường để chấm Match và không thay đổi progress, box, dueAt hoặc reviewedDay.

Sau 6 event mới sang feedback của bảng; advance nhảy 6 question hoặc kết thúc lượt. Kết thúc sớm giữ các event đã hoàn tất, không tạo event giả cho cặp chưa nối xong. Từ màn kết quả, “Nối bảng mới” mở lại đủ 6 cặp của chủ đề với seed mới, không dùng bộ retry chỉ gồm vài cặp sai. Catalog/fingerprint và ID event giữ nguyên.

Avatar dùng 20 ảnh Notionists SVG tĩnh lưu trong public, không có thư viện/API sinh ảnh lúc chạy. `settings.avatarSeed` vẫn optional, chuỗi không rỗng tối đa 200 ký tự, schemaVersion 2. Seed cũ và tên được ánh xạ ổn định sang một ảnh; không tự viết lại dữ liệu cũ. Chọn ảnh mới lưu seed preset; backup giữ nguyên lựa chọn. Không đổi tiến độ hoặc catalog/fingerprint.

## 5. Hợp đồng đăng nhập và đồng bộ (28/10/2026)

Người dùng chốt Firebase project mới `vocab-web-next`, Google Auth và đồng bộ. Không kết nối project V1. Snapshot vẫn schemaVersion 2, database `vocab-learn-v2`, event ID `sessionId:index`, scoringVersion và fingerprint không đổi.

Thiết kế và kế hoạch triển khai:

- [x] Nhật ký bất biến dưới `users/{uid}/changes/{operationId}`; transaction cấp `order` tăng dần và thời gian server, retry theo operationId không tạo thêm thay đổi. Payload lớn chia chunk trong cùng transaction. Không ghi đè snapshot của máy khác.
- [x] IndexedDB giữ nguyên key `guest`; tài khoản dùng `user:<uid>`, với snapshot, nhật ký đã nhận và outbox trong cùng transaction. Session đang làm giữ riêng mỗi máy. Đổi user chặn thao tác cho tới khi đọc đúng namespace; callback cũ không được cập nhật user mới.
- [x] Tiến độ trước sync/import là seed theo từng từ, giữ cả import V1 không có event. Seed đến đầu tiên thắng khi trùng từ; event đã nằm trong seed không tính lại. Event mới được tính lại theo policy 1 và thứ tự server, dùng thời gian server khi xác định lịch ôn; practice/Match không đổi lịch. Không lấy box lớn nhất.
- [x] Cài đặt cập nhật theo field; từ riêng/yêu thích theo ID; lịch sử theo sessionId; import và archive giữ lại. Hỏi rõ nhập guest vào tài khoản, không tự nhập khi đổi user. Guest gốc được giữ nguyên; lựa chọn nhớ riêng từng tài khoản trên máy.
- [x] Khôi phục backup là thao tác thay thế có generation mới. Thay đổi offline dựa trên generation cũ bị chặn, giữ outbox và cho xuất backup trước khi chọn dùng dữ liệu mới, không tự phục hồi dữ liệu đã bị thay.
- [x] Google popup, quan sát auth state, lỗi tiếng Việt; config công khai chỉ cho project mới; SSR không gọi API trình duyệt. Rules chỉ cho chủ UID đọc/ghi, kiểm tra cấu trúc, nhật ký/chunk bất biến, counter liên kết transaction.
- [x] Kiểm chứng RED/GREEN cho replay, retry, seed cũ, hai thiết bị, practice, namespace và callback trễ; Emulator cho Auth/Firestore/rules; E2E Settings/đổi user/offline và accessibility; lint/format/build cuối đợt.

Giới hạn: chưa có backend chống người dùng tự sửa điểm của chính họ; thứ tự commit server là thẩm quyền khi gộp lịch, không suy ra giờ thực tế của thao tác offline. Chỉ tải nhật ký thuộc UID hiện tại; tối ưu checkpoint/phân trang có thể bổ sung khi nhật ký lớn. Không thay đổi giọng/tốc độ phát âm theo tài khoản.

### Cấu hình và vận hành

- Firebase project `vocab-web-next`, database `(default)`, Standard, `asia-southeast1`. Web config là cấu hình công khai trong `src/lib/firebase.ts`; không cần service-account/private key trên Vercel. `NEXT_PUBLIC_FIREBASE_API_KEY` chỉ là override tùy chọn; để trống dùng config đã được cung cấp. Analytics không khởi tạo.
- Bật Google provider và cho phép domain `vocab-web-beta.vercel.app`, `localhost`, `127.0.0.1` trong Authentication. Không đổi `authDomain` sang domain Vercel khi chưa proxy Firebase auth handler.
- Publish rules: `npx -y firebase-tools@latest deploy --only firestore:rules --project vocab-web-next`. Không deploy Hosting/rules vào project V1.
- Kiểm thử local: `npx -y firebase-tools@latest emulators:start --only auth,firestore --project demo-vocab-sync`; đặt `NEXT_PUBLIC_FIREBASE_EMULATORS=1` khi chạy Next dev. Chạy `FIREBASE_SYNC_EMULATOR_TEST=1 npx vitest run src/data/sync-emulator.test.ts` và `E2E_FIREBASE_EMULATOR=1 PW_CHANNEL=msedge npx playwright test e2e/auth-sync.spec.ts`. Biến môi trường ví dụ theo cú pháp shell POSIX; trong PowerShell dùng `$env:TEN_BIEN = '1'`.
- Không đặt `NEXT_PUBLIC_FIREBASE_EMULATORS` trên Vercel. Emulator dùng riêng project demo; production luôn dùng project mới. Mỗi operation giới hạn 6 MB, chia chunk không cắt đôi emoji; vượt giới hạn báo rõ và giữ dữ liệu local, không cắt archive âm thầm.
- Rules là bản đầu đã kiểm thử Emulator: owner-only cho từng UID, kiểm tra key/type/counter và nhật ký bất biến. Cần review lại khi mở rộng schema hoặc phát hành rộng; không bảo đảm chống chủ tài khoản tự sửa điểm của chính họ.

Kiểm chứng cuối: 190/190 unit và Emulator tests; 4/4 E2E Auth/sync desktop/mobile; các spec trạng thái lưu và theme qua sau khi chặn nút theme lúc chưa ready. Typecheck, format và build production qua; lint 0 lỗi, 1 cảnh báo ref dùng để vô hiệu hóa callback cũ. Review đã sửa session sau restore, kết nối lại listener và form nhận settings từ cloud.

## Kiểm chứng

Các test mới đã chạy RED trước sửa: thiếu metadata, nhận metadata sai, không nhận câu nhập chữ thiếu options. Test tương thích wire format cũng phát hiện việc bỏ options rỗng; generator đã giữ lại trường đó cho schema 2.

Đợt này đã kiểm tra cloze-choice, recognition hai hướng và gợi ý chữ khóa; đợt sửa scoringVersion 2 đã qua 58 unit tests và 40 E2E desktop/mobile; lint/typecheck/format/build đều qua. Catalog vẫn 600 từ/50 bài, fingerprint `54681aa41d1b`. Chưa có kiểm chứng độc lập từ reviewer khác trong đợt này; kiểm tra iPhone thật không nằm trong phạm vi theo yêu cầu người dùng.

## 6. Đã làm: nhiều quyển sách

Ngày 26/10/2026. Nội dung tách theo quyển để thêm sách mà không đụng tiến độ đã lưu.

- **Nguồn và output:** mỗi quyển khai báo ở `content/books/<bookId>/book.json`; `scripts/build-content.mjs` gọi builder của quyển, kiểm tra chung rồi ghi `src/content/books/<bookId>/` (book, catalog, report, exercise-manifest, exercise-report), `public/exercises/<bookId>/cloze/` và `src/content/books/registry.ts`. Builder xóa cả hai thư mục output trước khi ghi.
- **ID từ:** progress/event vẫn khóa theo wordId toàn cục. Quyển mới bắt buộc tiền tố `<bookId>:`; trùng ID giữa các quyển làm build lỗi. `toeic-600` có `legacyWordIds: true`, giữ nguyên 600 ID cũ nên không cần migration.
- **Fingerprint:** chỉ băm `{lessons, topics, words}` của từng quyển, không gồm metadata sách. Catalog TOEIC sau khi tách vẫn là `cbd94fa970e5`; gói bài tập giữ nguyên version, chỉ đổi URL sang `/exercises/toeic-600/cloze/`. Tab còn manifest cũ cần tải lại trang nếu chưa tải gói.
- **Quyển đang học:** `settings.bookId?` là field optional, schemaVersion vẫn 2. Validator chỉ kiểm tra dạng slug, không bắt buộc quyển còn tồn tại; ID không còn trong thư viện thì dùng quyển mặc định (quyển legacy, luôn đứng đầu registry). Hôm nay/Bộ học/Tiến độ theo quyển đang học; Thư viện và màn học tra từ của mọi quyển.
- **Session:** catalog của lượt (distractor, contentVersion) lấy từ quyển chứa từ đầu tiên có chủ; lượt chỉ có từ tự thêm dùng quyển đang học. Màn học coi lượt là cũ khi `contentVersion` không khớp version catalog của quyển nào.
- **Generator:** synonym/build tra chủ đề và sourceVersion theo quyển của từng từ; cloze tải và kiểm tra gói theo quyển (`loadClozeLesson(book, lessonId)`, `validateClozePack(pack, entry, catalog)`).
- **URL:** `/books/<bookId>/lessons/<n>`, sinh tĩnh cho mọi bài; `/lessons/<n>` chuyển hướng 308 về `toeic-600`.

Chưa làm: builder chung cho quyển mới (mỗi quyển tự viết builder), lọc theo quyển trong Thư viện, tách tiến độ hiển thị theo quyển trong lịch sử phiên.

export type EverydayKind = "phrase" | "phrasal" | "idiom" | "slang";

export interface EverydayEntry {
  id: string;
  text: string;
  kind: EverydayKind;
  meaning: string;
  definition: string;
  example: string;
  exampleVi: string;
  usage?: string;
}

/** Bộ nội dung mở rộng, tách khỏi 600 từ TOEIC để không làm lệch tiến độ sách. */
const EVERYDAY_BASE: Omit<EverydayEntry, "definition">[] = [
  { id: "ev-make-a-decision", text: "make a decision", kind: "phrase", meaning: "đưa ra quyết định", example: "We need to make a decision by Friday.", exampleVi: "Chúng ta cần quyết định trước thứ Sáu.", usage: "Cụm động từ + danh từ thường gặp trong công việc." },
  { id: "ev-meet-a-deadline", text: "meet a deadline", kind: "phrase", meaning: "hoàn thành đúng hạn", example: "The team worked late to meet the deadline.", exampleVi: "Cả nhóm làm đến muộn để kịp hạn chót." },
  { id: "ev-take-responsibility", text: "take responsibility for", kind: "phrase", meaning: "chịu trách nhiệm về", example: "She takes responsibility for the training program.", exampleVi: "Cô ấy phụ trách chương trình đào tạo." },
  { id: "ev-keep-in-touch", text: "keep in touch", kind: "phrase", meaning: "giữ liên lạc", example: "Let's keep in touch after the conference.", exampleVi: "Hội nghị xong mình vẫn giữ liên lạc nhé." },
  { id: "ev-raise-a-concern", text: "raise a concern", kind: "phrase", meaning: "nêu điều băn khoăn", example: "Several employees raised concerns about the new schedule.", exampleVi: "Một số nhân viên bày tỏ lo ngại về lịch làm việc mới." },
  { id: "ev-in-advance", text: "in advance", kind: "phrase", meaning: "trước, từ trước", example: "Please book your seat in advance.", exampleVi: "Bạn nhớ đặt chỗ trước nhé." },
  { id: "ev-look-into", text: "look into", kind: "phrasal", meaning: "xem xét, tìm hiểu kỹ", example: "The manager will look into the billing issue.", exampleVi: "Quản lý sẽ kiểm tra kỹ vấn đề thanh toán." },
  { id: "ev-put-off", text: "put off", kind: "phrasal", meaning: "hoãn lại", example: "They put off the meeting until next week.", exampleVi: "Họ dời cuộc họp sang tuần sau." },
  { id: "ev-find-out", text: "find out", kind: "phrasal", meaning: "tìm hiểu, phát hiện ra", example: "I found out that the store closes at six.", exampleVi: "Tôi mới biết cửa hàng đóng cửa lúc sáu giờ." },
  { id: "ev-carry-out", text: "carry out", kind: "phrasal", meaning: "thực hiện", example: "The company carried out a customer survey.", exampleVi: "Công ty đã thực hiện một cuộc khảo sát khách hàng." },
  { id: "ev-set-up", text: "set up", kind: "phrasal", meaning: "sắp xếp, thiết lập", example: "We set up a call with the supplier.", exampleVi: "Chúng tôi đã hẹn một cuộc gọi với nhà cung cấp." },
  { id: "ev-come-across", text: "come across", kind: "phrasal", meaning: "tình cờ bắt gặp", example: "I came across an interesting article this morning.", exampleVi: "Sáng nay tôi tình cờ đọc được một bài báo thú vị." },
  { id: "ev-run-out-of", text: "run out of", kind: "phrasal", meaning: "dùng hết, không còn", example: "We've run out of printer paper.", exampleVi: "Chúng ta hết giấy in rồi." },
  { id: "ev-follow-up", text: "follow up on", kind: "phrasal", meaning: "theo dõi, xử lý tiếp", example: "I'll follow up on your request tomorrow.", exampleVi: "Ngày mai tôi sẽ tiếp tục xử lý yêu cầu của bạn." },
  { id: "ev-get-ball-rolling", text: "get the ball rolling", kind: "idiom", meaning: "bắt đầu khởi động một việc", example: "Let's get the ball rolling with a short introduction.", exampleVi: "Mình bắt đầu bằng phần giới thiệu ngắn nhé." },
  { id: "ev-on-same-page", text: "be on the same page", kind: "idiom", meaning: "hiểu thống nhất với nhau", example: "Let's review the plan so we're on the same page.", exampleVi: "Cùng xem lại kế hoạch để mọi người hiểu giống nhau nhé." },
  { id: "ev-piece-of-cake", text: "a piece of cake", kind: "idiom", meaning: "dễ như chơi", example: "The setup was a piece of cake.", exampleVi: "Cài đặt cái này dễ như chơi." },
  { id: "ev-long-run", text: "in the long run", kind: "idiom", meaning: "về lâu dài", example: "The upgrade will save us time in the long run.", exampleVi: "Về lâu dài, bản nâng cấp này sẽ giúp ta tiết kiệm thời gian." },
  { id: "ev-back-square-one", text: "back to square one", kind: "idiom", meaning: "quay về vạch xuất phát", example: "The deal fell through, so we're back to square one.", exampleVi: "Thỏa thuận đổ bể, vậy là mọi thứ lại quay về vạch xuất phát." },
  { id: "ev-touch-base", text: "touch base", kind: "idiom", meaning: "liên hệ, trao đổi nhanh", example: "I'll touch base with you after the client meeting.", exampleVi: "Họp với khách xong tôi sẽ trao đổi nhanh với bạn nhé.", usage: "Thân mật vừa phải; thường dùng để cập nhật tình hình công việc." },
  { id: "ev-under-weather", text: "under the weather", kind: "idiom", meaning: "hơi mệt, không được khỏe", example: "I'm feeling a little under the weather today.", exampleVi: "Hôm nay tôi thấy hơi mệt, không được khỏe lắm." },
  { id: "ev-no-big-deal", text: "no big deal", kind: "slang", meaning: "chuyện nhỏ thôi; không sao đâu", example: "Thanks for covering my shift. — No big deal!", exampleVi: "Cảm ơn bạn đã làm thay ca cho mình. — Có gì đâu!", usage: "Thân mật; dùng để nói việc gì đó không đáng lo hay không có gì to tát." },
  { id: "ev-my-bad", text: "my bad", kind: "slang", meaning: "lỗi mình rồi", example: "My bad—I sent you the old version.", exampleVi: "Lỗi mình rồi — mình gửi bạn bản cũ mất rồi.", usage: "Rất thân mật; dùng để nhận lỗi nhỏ trong hội thoại." },
  { id: "ev-hang-out", text: "hang out", kind: "phrasal", meaning: "đi chơi, tụ tập", example: "Do you want to hang out after class?", exampleVi: "Tan học đi chơi với mình không?", usage: "Thân mật; nói về việc dành thời gian thư giãn cùng ai đó." },
  { id: "ev-hit-me-up", text: "hit me up", kind: "slang", meaning: "ngỏ lời xin hoặc nhờ ai điều gì", example: "She hit me up for $20.", exampleVi: "Cô ấy ngỏ lời xin tôi 20 đô.", usage: "Tiếng lóng Mỹ, rất thân mật. Cambridge ghi nhận nghĩa xin/nhờ ai điều gì; đôi khi cách nói này còn được dùng với nghĩa liên hệ với ai." },
  { id: "ev-no-biggie", text: "no biggie", kind: "slang", meaning: "không sao đâu; chuyện nhỏ ấy mà", example: "It's no biggie if you're a few minutes late.", exampleVi: "Bạn đến muộn vài phút cũng không sao đâu.", usage: "Thân mật, gần nghĩa với “no big deal”." },
  { id: "ev-chill-out", text: "chill out", kind: "phrasal", meaning: "thư giãn; bình tĩnh lại", example: "Let's chill out at home this evening.", exampleVi: "Tối nay ở nhà thư giãn đi.", usage: "Thân mật; có thể nói về nghỉ ngơi hoặc bình tĩnh lại, tùy ngữ cảnh." },
];

/** Định nghĩa tiếng Anh được biên soạn ngắn gọn theo nghĩa từ điển, không chép nguyên văn. */
const ENGLISH_DEFINITIONS: Record<string, string> = {
  "ev-make-a-decision": "to choose what to do after thinking about the options",
  "ev-meet-a-deadline": "to finish something by the time it must be finished",
  "ev-take-responsibility": "to accept that you are accountable for something",
  "ev-keep-in-touch": "to continue communicating with someone",
  "ev-raise-a-concern": "to tell people about a worry or problem",
  "ev-in-advance": "before a particular time or event",
  "ev-look-into": "to examine a situation or problem to learn more about it",
  "ev-put-off": "to delay something until a later time",
  "ev-find-out": "to discover information or learn something you did not know",
  "ev-carry-out": "to do or complete a task, plan, or instruction",
  "ev-set-up": "to arrange or prepare something so it is ready to be used",
  "ev-come-across": "to find or meet something by chance",
  "ev-run-out-of": "to use all of something so that none is left",
  "ev-follow-up": "to take further action about something already discussed or requested",
  "ev-get-ball-rolling": "to start an activity, often so that others will join in",
  "ev-on-same-page": "to have the same understanding or opinion as other people",
  "ev-piece-of-cake": "something that is very easy to do",
  "ev-long-run": "over a long period of time, especially when future effects matter",
  "ev-back-square-one": "to return to the beginning after an attempt has failed",
  "ev-touch-base": "to make brief contact with someone, usually to exchange information",
  "ev-under-weather": "to feel slightly ill",
  "ev-no-big-deal": "something that is not serious, important, or worth worrying about",
  "ev-my-bad": "an informal way to admit that something was your fault",
  "ev-hang-out": "to spend relaxed time with someone or in a place",
  "ev-hit-me-up": "US informal: to ask someone for something",
  "ev-no-biggie": "something small or unimportant that is not a problem",
  "ev-chill-out": "to relax or to become calm instead of upset or angry",
};

export const EVERYDAY_ENTRIES: EverydayEntry[] = EVERYDAY_BASE.map((entry) => ({
  ...entry,
  definition: ENGLISH_DEFINITIONS[entry.id],
}));

export const EVERYDAY_KIND_LABEL: Record<EverydayKind, string> = {
  phrase: "Cụm từ",
  phrasal: "Phrasal verb",
  idiom: "Thành ngữ",
  slang: "Từ lóng",
};

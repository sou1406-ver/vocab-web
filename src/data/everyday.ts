export type EverydayKind = "phrase" | "phrasal" | "idiom" | "slang";

export interface EverydayEntry {
  id: string;
  text: string;
  kind: EverydayKind;
  meaning: string;
  example: string;
  exampleVi: string;
  usage?: string;
}

/** Bộ nội dung mở rộng, tách khỏi 600 từ TOEIC để không làm lệch tiến độ sách. */
export const EVERYDAY_ENTRIES: EverydayEntry[] = [
  { id: "ev-make-a-decision", text: "make a decision", kind: "phrase", meaning: "đưa ra quyết định", example: "We need to make a decision by Friday.", exampleVi: "Chúng ta cần đưa ra quyết định trước thứ Sáu.", usage: "Cụm động từ + danh từ thường gặp trong công việc." },
  { id: "ev-meet-a-deadline", text: "meet a deadline", kind: "phrase", meaning: "kịp / đáp ứng hạn chót", example: "The team worked late to meet the deadline.", exampleVi: "Cả nhóm làm muộn để kịp hạn chót." },
  { id: "ev-take-responsibility", text: "take responsibility for", kind: "phrase", meaning: "chịu trách nhiệm về", example: "She takes responsibility for the training program.", exampleVi: "Cô ấy chịu trách nhiệm về chương trình đào tạo." },
  { id: "ev-keep-in-touch", text: "keep in touch", kind: "phrase", meaning: "giữ liên lạc", example: "Let's keep in touch after the conference.", exampleVi: "Hãy giữ liên lạc sau hội nghị nhé." },
  { id: "ev-raise-a-concern", text: "raise a concern", kind: "phrase", meaning: "nêu lên một mối lo ngại", example: "Several employees raised concerns about the new schedule.", exampleVi: "Một số nhân viên nêu lo ngại về lịch trình mới." },
  { id: "ev-in-advance", text: "in advance", kind: "phrase", meaning: "trước, từ trước", example: "Please book your seat in advance.", exampleVi: "Vui lòng đặt chỗ trước." },
  { id: "ev-look-into", text: "look into", kind: "phrasal", meaning: "điều tra, xem xét kỹ", example: "The manager will look into the billing issue.", exampleVi: "Quản lý sẽ xem xét vấn đề thanh toán." },
  { id: "ev-put-off", text: "put off", kind: "phrasal", meaning: "trì hoãn", example: "They put off the meeting until next week.", exampleVi: "Họ hoãn cuộc họp đến tuần sau." },
  { id: "ev-find-out", text: "find out", kind: "phrasal", meaning: "tìm ra, biết được", example: "I found out that the store closes at six.", exampleVi: "Tôi biết được cửa hàng đóng cửa lúc sáu giờ." },
  { id: "ev-carry-out", text: "carry out", kind: "phrasal", meaning: "tiến hành, thực hiện", example: "The company carried out a customer survey.", exampleVi: "Công ty đã tiến hành khảo sát khách hàng." },
  { id: "ev-set-up", text: "set up", kind: "phrasal", meaning: "thành lập; sắp xếp, thiết lập", example: "We set up a call with the supplier.", exampleVi: "Chúng tôi sắp xếp một cuộc gọi với nhà cung cấp." },
  { id: "ev-come-across", text: "come across", kind: "phrasal", meaning: "tình cờ gặp / bắt gặp", example: "I came across an interesting article this morning.", exampleVi: "Sáng nay tôi tình cờ đọc được một bài viết thú vị." },
  { id: "ev-run-out-of", text: "run out of", kind: "phrasal", meaning: "dùng hết, cạn kiệt", example: "We've run out of printer paper.", exampleVi: "Chúng ta đã dùng hết giấy in." },
  { id: "ev-follow-up", text: "follow up on", kind: "phrasal", meaning: "tiếp tục xử lý / hỏi thêm về", example: "I'll follow up on your request tomorrow.", exampleVi: "Ngày mai tôi sẽ tiếp tục xử lý yêu cầu của bạn." },
  { id: "ev-get-ball-rolling", text: "get the ball rolling", kind: "idiom", meaning: "bắt đầu khởi động một việc", example: "Let's get the ball rolling with a short introduction.", exampleVi: "Hãy bắt đầu bằng phần giới thiệu ngắn." },
  { id: "ev-on-same-page", text: "be on the same page", kind: "idiom", meaning: "cùng hiểu / thống nhất với nhau", example: "Let's review the plan so we're on the same page.", exampleVi: "Hãy xem lại kế hoạch để mọi người hiểu thống nhất." },
  { id: "ev-piece-of-cake", text: "a piece of cake", kind: "idiom", meaning: "việc rất dễ dàng", example: "The setup was a piece of cake.", exampleVi: "Việc cài đặt dễ như ăn bánh." },
  { id: "ev-long-run", text: "in the long run", kind: "idiom", meaning: "về lâu dài", example: "The upgrade will save us time in the long run.", exampleVi: "Về lâu dài, việc nâng cấp sẽ giúp chúng ta tiết kiệm thời gian." },
  { id: "ev-back-square-one", text: "back to square one", kind: "idiom", meaning: "quay lại điểm xuất phát", example: "The deal fell through, so we're back to square one.", exampleVi: "Thỏa thuận đổ bể nên chúng tôi phải quay lại điểm xuất phát." },
  { id: "ev-touch-base", text: "touch base", kind: "idiom", meaning: "liên hệ / trao đổi nhanh để cập nhật", example: "I'll touch base with you after the client meeting.", exampleVi: "Tôi sẽ trao đổi nhanh với bạn sau cuộc họp với khách hàng.", usage: "Thân mật vừa phải, thường dùng trong môi trường công việc." },
  { id: "ev-under-weather", text: "under the weather", kind: "idiom", meaning: "hơi mệt hoặc không khỏe", example: "I'm feeling a little under the weather today.", exampleVi: "Hôm nay tôi thấy hơi không khỏe." },
  { id: "ev-no-big-deal", text: "no big deal", kind: "slang", meaning: "không có gì to tát; không sao đâu", example: "Thanks for covering my shift. — No big deal!", exampleVi: "Cảm ơn đã làm thay ca cho mình. — Không có gì đâu!", usage: "Thân mật; hợp với hội thoại đời thường." },
  { id: "ev-my-bad", text: "my bad", kind: "slang", meaning: "lỗi của mình / mình nhầm rồi", example: "My bad—I sent you the old version.", exampleVi: "Lỗi của mình — mình gửi bạn bản cũ rồi.", usage: "Thân mật, dùng để nhận lỗi nhẹ trong hội thoại." },
  { id: "ev-hang-out", text: "hang out", kind: "slang", meaning: "đi chơi / dành thời gian cùng nhau", example: "Do you want to hang out after class?", exampleVi: "Học xong bạn muốn đi chơi không?", usage: "Thân mật, rất phổ biến trong giao tiếp hằng ngày." },
  { id: "ev-hit-me-up", text: "hit me up", kind: "slang", meaning: "liên hệ với mình nhé", example: "Hit me up when you get to the station.", exampleVi: "Đến ga thì nhắn mình nhé.", usage: "Rất thân mật; thường dùng trong tin nhắn và lời nói." },
  { id: "ev-no-biggie", text: "no biggie", kind: "slang", meaning: "không vấn đề gì / chuyện nhỏ thôi", example: "It's no biggie if you're a few minutes late.", exampleVi: "Bạn trễ vài phút cũng không sao đâu.", usage: "Thân mật; gần nghĩa với “no big deal”." },
  { id: "ev-chill-out", text: "chill out", kind: "slang", meaning: "thư giãn; bình tĩnh lại", example: "Let's chill out at home this evening.", exampleVi: "Tối nay ở nhà thư giãn nhé.", usage: "Thân mật; nghĩa cụ thể tùy ngữ cảnh." },
];

export const EVERYDAY_KIND_LABEL: Record<EverydayKind, string> = {
  phrase: "Cụm từ",
  phrasal: "Phrasal verb",
  idiom: "Thành ngữ",
  slang: "Từ lóng",
};

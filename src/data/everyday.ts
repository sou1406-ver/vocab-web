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
  otherSenses?: EverydaySense[];
}

export interface EverydaySense {
  definition: string;
  meaning: string;
  example: string;
  exampleVi: string;
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
  { id: "ev-come-up-with", text: "come up with", kind: "phrasal", meaning: "nghĩ ra (ý tưởng, kế hoạch)", example: "The team came up with a better way to organize the files.", exampleVi: "Cả nhóm nghĩ ra cách sắp xếp hồ sơ tốt hơn.", usage: "Thường đi với idea, plan, solution hoặc answer." },
  { id: "ev-deal-with", text: "deal with", kind: "phrasal", meaning: "xử lý, giải quyết (vấn đề)", example: "Our support team will deal with the complaint.", exampleVi: "Đội hỗ trợ sẽ xử lý khiếu nại này.", usage: "Cũng dùng với nghĩa làm việc hoặc giao tiếp với một người; xem nghĩa khác.", otherSenses: [{ definition: "to talk to or work with a person, especially as part of your job", meaning: "làm việc, giao tiếp với (ai)", example: "She deals with customers from across the country.", exampleVi: "Cô ấy làm việc với khách hàng từ khắp cả nước." }] },
  { id: "ev-bring-up", text: "bring up", kind: "phrasal", meaning: "đề cập đến (một chủ đề)", example: "He brought up the budget during the meeting.", exampleVi: "Anh ấy đề cập đến ngân sách trong cuộc họp.", otherSenses: [{ definition: "to care for a child until they are an adult", meaning: "nuôi dạy (một đứa trẻ)", example: "She was brought up by her grandparents.", exampleVi: "Cô ấy được ông bà nuôi dạy." }] },
  { id: "ev-turn-down", text: "turn down", kind: "phrasal", meaning: "từ chối (lời mời, đề nghị)", example: "Mina turned down the job offer.", exampleVi: "Mina đã từ chối lời mời làm việc.", otherSenses: [{ definition: "to reduce the level, volume, or strength of something", meaning: "vặn nhỏ; giảm mức (âm lượng, nhiệt độ)", example: "Could you turn down the music a little?", exampleVi: "Bạn vặn nhỏ nhạc xuống một chút được không?" }] },
  { id: "ev-take-off", text: "take off", kind: "phrasal", meaning: "cất cánh (máy bay)", example: "Our plane took off on time.", exampleVi: "Máy bay của chúng tôi cất cánh đúng giờ.", otherSenses: [{ definition: "to suddenly become successful or popular", meaning: "bỗng trở nên thành công hoặc nổi tiếng", example: "Her online shop really took off last year.", exampleVi: "Cửa hàng trực tuyến của cô ấy bỗng phát triển mạnh vào năm ngoái." }, { definition: "to remove a piece of clothing", meaning: "cởi (quần áo)", example: "Please take off your shoes at the door.", exampleVi: "Vui lòng cởi giày ở cửa." }] },
  { id: "ev-work-out", text: "work out", kind: "phrasal", meaning: "tập thể dục", example: "I work out at the gym twice a week.", exampleVi: "Tôi tập ở phòng gym hai lần mỗi tuần.", otherSenses: [{ definition: "to find an answer or understand something by thinking", meaning: "tìm ra lời giải; hiểu ra", example: "We need to work out why the figures do not match.", exampleVi: "Chúng ta cần tìm hiểu vì sao các con số không khớp." }, { definition: "if a situation works out, it develops successfully or satisfactorily", meaning: "diễn biến tốt đẹp; có kết quả ổn thỏa", example: "I hope everything works out for you.", exampleVi: "Mong mọi chuyện sẽ ổn thỏa với bạn." }] },
  { id: "ev-give-up", text: "give up", kind: "phrasal", meaning: "bỏ cuộc; từ bỏ", example: "Don't give up just because the first attempt failed.", exampleVi: "Đừng bỏ cuộc chỉ vì lần thử đầu tiên thất bại." },
  { id: "ev-pick-up", text: "pick up", kind: "phrasal", meaning: "đón (ai đó) bằng xe", example: "I'll pick you up outside the station.", exampleVi: "Tôi sẽ đón bạn bên ngoài nhà ga.", otherSenses: [{ definition: "to learn a new skill or language by practising it", meaning: "học được một cách tự nhiên", example: "He picked up some Spanish while travelling.", exampleVi: "Anh ấy học được chút tiếng Tây Ban Nha trong chuyến đi." }] },
  { id: "ev-look-forward-to", text: "look forward to", kind: "phrasal", meaning: "mong chờ, háo hức đón đợi", example: "We look forward to seeing you next week.", exampleVi: "Chúng tôi mong được gặp bạn vào tuần tới.", usage: "Sau “to” dùng danh từ hoặc động từ dạng -ing." },
  { id: "ev-call-off", text: "call off", kind: "phrasal", meaning: "hủy bỏ (kế hoạch, sự kiện)", example: "They called off the match because of the rain.", exampleVi: "Họ hủy trận đấu vì trời mưa." },
  { id: "ev-run-into", text: "run into", kind: "phrasal", meaning: "tình cờ gặp", example: "I ran into an old colleague at the market.", exampleVi: "Tôi tình cờ gặp một đồng nghiệp cũ ở chợ.", otherSenses: [{ definition: "to experience an unexpected problem", meaning: "gặp phải (khó khăn, vấn đề)", example: "We ran into a few technical problems.", exampleVi: "Chúng tôi gặp phải một vài vấn đề kỹ thuật." }] },
  { id: "ev-point-out", text: "point out", kind: "phrasal", meaning: "chỉ ra; lưu ý cho ai thấy", example: "She pointed out a mistake in the report.", exampleVi: "Cô ấy chỉ ra một lỗi trong báo cáo." },
  { id: "ev-fill-in", text: "fill in", kind: "phrasal", meaning: "điền vào (biểu mẫu)", example: "Please fill in this form before your appointment.", exampleVi: "Vui lòng điền biểu mẫu này trước buổi hẹn.", otherSenses: [{ definition: "to give someone information they missed", meaning: "cập nhật thông tin cho ai", example: "Can you fill me in on what happened?", exampleVi: "Bạn cập nhật cho tôi chuyện đã xảy ra được không?" }] },
  { id: "ev-find-out-about", text: "find out about", kind: "phrasal", meaning: "tìm hiểu thông tin về", example: "I called to find out about the course fees.", exampleVi: "Tôi gọi để hỏi thông tin về học phí khóa học." },
  { id: "ev-put-up-with", text: "put up with", kind: "phrasal", meaning: "chịu đựng điều khó chịu", example: "I can't put up with the noise any longer.", exampleVi: "Tôi không thể chịu tiếng ồn này thêm nữa." },
  { id: "ev-take-over", text: "take over", kind: "phrasal", meaning: "tiếp quản; đảm nhận quyền kiểm soát", example: "A new manager will take over next month.", exampleVi: "Một quản lý mới sẽ tiếp quản vào tháng tới." },
  { id: "ev-carry-on", text: "carry on", kind: "phrasal", meaning: "tiếp tục làm việc gì", example: "Please carry on with your work while I speak to her.", exampleVi: "Cứ tiếp tục công việc trong lúc tôi nói chuyện với cô ấy nhé." },
  { id: "ev-get-along", text: "get along", kind: "phrasal", meaning: "hòa thuận với ai", example: "Do you get along with your new colleagues?", exampleVi: "Bạn có hòa thuận với đồng nghiệp mới không?", usage: "Trong Anh-Anh thường dùng get on với cùng nghĩa." },
  { id: "ev-break-down", text: "break down", kind: "phrasal", meaning: "hỏng (máy móc, xe cộ)", example: "Our car broke down on the way home.", exampleVi: "Xe chúng tôi bị hỏng trên đường về nhà.", otherSenses: [{ definition: "to lose control of your emotions and start crying", meaning: "suy sụp cảm xúc, bật khóc", example: "He broke down when he heard the news.", exampleVi: "Anh ấy suy sụp và bật khóc khi nghe tin." }, { definition: "to separate information or a process into smaller parts", meaning: "chia nhỏ, phân tích thành từng phần", example: "The report breaks down costs by department.", exampleVi: "Báo cáo phân tích chi phí theo từng phòng ban." }] },
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
  "ev-come-up-with": "to think of or suggest an idea, plan, or solution",
  "ev-deal-with": "to take action to solve or manage a problem",
  "ev-bring-up": "to start talking about a particular subject",
  "ev-turn-down": "to refuse an offer, request, or opportunity",
  "ev-take-off": "if an aircraft takes off, it leaves the ground and starts flying",
  "ev-work-out": "to do physical exercise to improve your fitness",
  "ev-give-up": "to stop trying to do something or stop doing something",
  "ev-pick-up": "to collect someone in a vehicle and take them somewhere",
  "ev-look-forward-to": "to feel pleased and excited about something that is going to happen",
  "ev-call-off": "to cancel something that has been arranged",
  "ev-run-into": "to meet someone unexpectedly",
  "ev-point-out": "to mention something to make people notice it",
  "ev-fill-in": "to write information in the spaces on a form",
  "ev-find-out-about": "to get information about something",
  "ev-put-up-with": "to accept an unpleasant situation or person without complaining",
  "ev-take-over": "to take control of something or become responsible for it",
  "ev-carry-on": "to continue doing something",
  "ev-get-along": "to have a friendly relationship with someone",
  "ev-break-down": "if a machine or vehicle breaks down, it stops working",
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

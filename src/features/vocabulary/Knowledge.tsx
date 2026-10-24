import "./vocabulary.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import { netHref, PosTag } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { familyOf } from "@/lib/data";
import { useProfile } from "@/state/profile";
import { useLessonDetails } from "@/lib/useLessonDetails";

const parts = [
  {
    name: "Danh từ",
    key: "Noun",
    className: "b-indigo",
    question: "Ai hoặc cái gì?",
    clues: "Đứng sau a/an/the, tính từ; thường làm chủ ngữ hoặc tân ngữ.",
    example: "The report was sent this morning.",
    answer: "report",
  },
  {
    name: "Động từ",
    key: "Verb",
    className: "b-violet",
    question: "Làm gì hoặc ở trạng thái nào?",
    clues: "Đứng sau chủ ngữ; theo sau can, will, should là động từ nguyên mẫu.",
    example: "The team completed the project.",
    answer: "completed",
  },
  {
    name: "Tính từ",
    key: "Adjective",
    className: "b-emerald",
    question: "Đặc điểm gì?",
    clues: "Thường đứng trước danh từ hoặc sau be, seem, become.",
    example: "We received a detailed proposal.",
    answer: "detailed",
  },
  {
    name: "Trạng từ",
    key: "Adverb",
    className: "b-amber",
    question: "Theo cách nào, mức độ ra sao?",
    clues: "Bổ nghĩa cho động từ, tính từ hoặc trạng từ khác; nhiều từ tận cùng bằng -ly.",
    example: "Please respond promptly.",
    answer: "promptly",
  },
];

export function KnowledgePage() {
  const [section, setSection] = useState<"word-forms" | "grammar">("word-forms");
  const catalog = useProfile((state) => state.catalog);
  const detailsReady = useLessonDetails();
  const agreement = catalog.all.find((word) => word.word === "agreement");
  const exampleFamily = agreement ? familyOf(agreement) : [];
  if (!detailsReady)
    return (
      <div className="card" role="status">
        Đang tải dữ liệu kiến thức…
      </div>
    );
  return (
    <div className="knowledge-page">
      <header className="page-head">
        <p className="kicker">NGỮ PHÁP THỰC DỤNG · TOEIC</p>
        <h1>Kiến thức</h1>
        <p className="lede">
          Hiểu một ý nghĩa cốt lõi trước, rồi xem từ loại quyết định cách ý nghĩa đó được dùng trong câu.
        </p>
      </header>

      <div className="knowledge-switch" role="group" aria-label="Nhóm kiến thức">
        <button
          aria-pressed={section === "word-forms"}
          className={section === "word-forms" ? "active" : ""}
          onClick={() => setSection("word-forms")}
        >
          Từ loại & gốc từ
        </button>
        <button
          aria-pressed={section === "grammar"}
          className={section === "grammar" ? "active" : ""}
          onClick={() => setSection("grammar")}
        >
          Ngữ pháp nền tảng
        </button>
      </div>

      {section === "word-forms" ? (
        <>
          <section aria-labelledby="pos-title">
            <div className="knowledge-section-head">
              <div>
                <h2 id="pos-title" className="section-title">
                  Bốn từ loại thường gặp
                </h2>
                <p className="muted">Trong Part 5, hãy hỏi từ còn thiếu đang giữ vai trò gì trong câu.</p>
              </div>
            </div>
            <div className="knowledge-grid">
              {parts.map((part) => (
                <article className="card knowledge-card" key={part.key}>
                  <div className="row between">
                    <h3>{part.name}</h3>
                    <span className={`badge ${part.className}`}>{part.key}</span>
                  </div>
                  <p className="knowledge-question">{part.question}</p>
                  <p className="muted">{part.clues}</p>
                  <p className="knowledge-example">
                    {part.example.split(part.answer)[0]}
                    <b>{part.answer}</b>
                    {part.example.split(part.answer)[1]}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="card knowledge-tip">
            <div>
              <p className="eyebrow">HIỂU VAI TRÒ TRONG CÂU</p>
              <h2>Từ loại là chức năng, không phải mẹo nhìn đuôi</h2>
              <p className="muted">
                Một gốc nghĩa có thể tạo thành nhiều từ. Danh từ gọi tên sự việc, động từ diễn tả hành động, tính từ
                miêu tả đặc điểm và trạng từ bổ nghĩa cho cách hành động diễn ra. Hình thức từ chỉ giúp nhận diện; hãy
                hiểu nghĩa và vai trò của nó trong câu.
              </p>
            </div>
          </section>

          <section className="card roots-sample" aria-labelledby="roots-sample-title">
            <div className="roots-sample-intro">
              <p className="eyebrow">NHÌN QUA MỘT HỌ TỪ</p>
              <h2 id="roots-sample-title">Một ý tưởng, nhiều vai trò</h2>
              <p className="muted">
                Gốc <b>agree</b> mang ý “đồng ý”. Tùy từ loại và ngữ cảnh, ta có hành động đồng ý, một thỏa thuận, hay
                tính chất sẵn lòng chấp thuận.
              </p>
            </div>
            <div className="roots-sample-forms">
              {agreement &&
                exampleFamily.map((form) => (
                  <Link className="roots-sample-form" key={form.w} to={netHref(agreement.id, form.w)}>
                    <span className="roots-word">{form.w}</span>
                    <PosTag pos={form.pos} />
                    <span className="muted">{form.vi}</span>
                  </Link>
                ))}
            </div>
          </section>

          <section className="card knowledge-affix">
            <div className="knowledge-affix-icon">
              <Icon name="branch" size="lg" />
            </div>
            <div>
              <h2>Gốc từ và họ từ</h2>
              <p className="muted">
                Theo dõi một ý nghĩa cốt lõi qua các từ cùng họ, rồi so sánh cách ý nghĩa đó trở thành người/vật, hành
                động hay đặc điểm. Bắt đầu từ các từ trong bộ TOEIC.
              </p>
            </div>
            <Link className="btn" to="/roots">
              Khám phá gốc từ <Icon name="right" size="sm" />
            </Link>
          </section>
        </>
      ) : (
        <section className="grammar-library" aria-label="Các chủ điểm ngữ pháp">
          <div className="knowledge-section-head">
            <div>
              <h2 className="section-title">Ngữ pháp nền tảng</h2>
              <p className="muted">
                Tóm tắt theo tài liệu Grammar: chọn quy tắc cần xem, tập trung vào cấu trúc và cách dùng.
              </p>
            </div>
          </div>

          <details className="card grammar-topic" open>
            <summary>
              <span>
                <b>12 thì tiếng Anh</b>
                <small>Ba mốc thời gian × bốn trạng thái</small>
              </span>
              <Icon name="plus" size="sm" />
            </summary>
            <div className="grammar-content">
              <p className="muted">
                Simple nói về thói quen, sự thật hoặc sự việc trọn vẹn; Continuous nhìn hành động đang diễn ra; Perfect
                nối một mốc trước với mốc tham chiếu; Perfect Continuous nhấn mạnh khoảng thời gian của quá trình.
              </p>
              <div className="grammar-table-wrap">
                <table className="grammar-table">
                  <thead>
                    <tr>
                      <th>Trạng thái</th>
                      <th>Hiện tại</th>
                      <th>Quá khứ</th>
                      <th>Tương lai</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>Simple</th>
                      <td>S + V(s/es)</td>
                      <td>S + V2</td>
                      <td>S + will + V1</td>
                    </tr>
                    <tr>
                      <th>Continuous</th>
                      <td>S + am/is/are + V-ing</td>
                      <td>S + was/were + V-ing</td>
                      <td>S + will be + V-ing</td>
                    </tr>
                    <tr>
                      <th>Perfect</th>
                      <td>S + have/has + V3</td>
                      <td>S + had + V3</td>
                      <td>S + will have + V3</td>
                    </tr>
                    <tr>
                      <th>Perfect Continuous</th>
                      <td>S + have/has been + V-ing</td>
                      <td>S + had been + V-ing</td>
                      <td>S + will have been + V-ing</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="grammar-example">
                <b>Ví dụ:</b> I have worked here since 2022. <span>Tôi làm việc ở đây từ năm 2022 đến nay.</span>
              </p>
              <p className="grammar-note">
                Mẹo: for + khoảng thời gian; since + mốc thời gian. Động từ chỉ trạng thái như know, need, own thường
                không dùng ở dạng tiếp diễn.
              </p>
            </div>
          </details>

          <details className="card grammar-topic">
            <summary>
              <span>
                <b>Biến đổi dạng động từ</b>
                <small>Thêm -s/-es, -ed và -ing</small>
              </span>
              <Icon name="plus" size="sm" />
            </summary>
            <div className="grammar-content grammar-rules">
              <p>
                <b>Ngôi thứ ba số ít:</b> thường thêm -s; thêm -es sau s, sh, ch, x, z; phụ âm + y đổi thành -ies (
                <i>study → studies</i>).
              </p>
              <p>
                <b>Quá khứ -ed:</b> phụ âm + y đổi thành -ied (<i>carry → carried</i>); nguyên âm + y giữ y (
                <i>play → played</i>); một số từ ngắn gấp đôi phụ âm cuối (<i>stop → stopped</i>).
              </p>
              <p>
                <b>Dạng -ing:</b> thường bỏ e câm (<i>make → making</i>), đổi -ie thành y (<i>lie → lying</i>), và gấp
                đôi phụ âm cuối trong một số từ ngắn (<i>run → running</i>).
              </p>
              <p className="grammar-note">
                Đây là quy tắc thường gặp, không thay thế việc tra dạng bất quy tắc và ngoại lệ.
              </p>
            </div>
          </details>

          <details className="card grammar-topic">
            <summary>
              <span>
                <b>Danh từ & mạo từ</b>
                <small>Đếm được, không đếm được, a/an/the</small>
              </span>
              <Icon name="plus" size="sm" />
            </summary>
            <div className="grammar-content grammar-rules">
              <p>
                <b>Danh từ đếm được số ít</b> thường cần từ hạn định: <i>a report, the report, this report</i>. Danh từ
                không đếm được thường không dùng trực tiếp với số đếm.
              </p>
              <p>
                <b>a/an</b> dùng với danh từ số ít chưa xác định; chọn theo âm đầu, không chỉ theo chữ cái:{" "}
                <i>a university</i> nhưng <i>an hour</i>.
              </p>
              <p>
                <b>the</b> dùng khi người nghe biết rõ đối tượng hoặc đối tượng đã được nhắc đến. Không dùng mạo từ khi
                nói khái quát về danh từ số nhiều / không đếm được: <i>Reports take time. Information is useful.</i>
              </p>
            </div>
          </details>

          <details className="card grammar-topic">
            <summary>
              <span>
                <b>Câu điều kiện</b>
                <small>Điều kiện thực tế, giả định và trái với quá khứ</small>
              </span>
              <Icon name="plus" size="sm" />
            </summary>
            <div className="grammar-content">
              <div className="grammar-quick-grid">
                <p>
                  <b>Loại 0 · sự thật</b>
                  <code>If + hiện tại đơn, hiện tại đơn</code>
                  <i>If water reaches 100°C, it boils.</i>
                </p>
                <p>
                  <b>Loại 1 · có thể xảy ra</b>
                  <code>If + hiện tại đơn, will + V1</code>
                  <i>If we finish early, we'll call you.</i>
                </p>
                <p>
                  <b>Loại 2 · giả định hiện tại</b>
                  <code>If + quá khứ đơn, would + V1</code>
                  <i>If I had more time, I would travel.</i>
                </p>
                <p>
                  <b>Loại 3 · trái với quá khứ</b>
                  <code>If + had + V3, would have + V3</code>
                  <i>If they had left earlier, they would have caught the train.</i>
                </p>
              </div>
              <p className="grammar-note">
                <b>Unless</b> thường mang nghĩa “if ... not”. Với điều kiện trái thực tế, có thể đảo ngữ trang trọng:{" "}
                <i>Had I known, I would have called.</i>
              </p>
            </div>
          </details>

          <details className="card grammar-topic">
            <summary>
              <span>
                <b>Hòa hợp chủ ngữ – động từ</b>
                <small>Tìm đúng chủ ngữ chính trước khi chia động từ</small>
              </span>
              <Icon name="plus" size="sm" />
            </summary>
            <div className="grammar-content grammar-rules">
              <p>
                <b>The number of + danh từ số nhiều</b> đi với động từ số ít; <b>a number of + danh từ số nhiều</b>{" "}
                thường đi với động từ số nhiều.
              </p>
              <p>
                Với <b>either...or / neither...nor</b>, động từ thường hòa hợp với chủ ngữ gần nó. Cụm chen giữa như{" "}
                <i>with, as well as, together with</i> không đổi chủ ngữ chính.
              </p>
              <p>
                Danh động từ làm chủ ngữ thường đi với động từ số ít: <i>Studying regularly helps.</i> Các đại từ{" "}
                <i>each, everyone, someone</i> cũng thường đi với động từ số ít.
              </p>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}

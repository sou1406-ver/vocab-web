import { useState } from "react";
import { Link } from "react-router-dom";
import { Empty } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { FreqMeter } from "@/components/FreqMeter";
import { EVERYDAY_ENTRIES, EVERYDAY_KIND_LABEL } from "@/data/everyday";
import { lessonLabel, termInfo } from "@/lib/data";
import { useActions } from "@/state/actions";
import { useProfile } from "@/state/profile";

export function ReviewPage() {
  const [filter, setFilter] = useState<"all" | "weak" | "learning">("all");
  const [collection, setCollection] = useState<"toeic" | "everyday">("toeic");
  const { catalog, status, stats } = useProfile();
  const act = useActions();
  const words = catalog
    .scope("all", "all")
    .map((word) => ({ word, misses: stats[word.id]?.w ?? 0, learning: status[word.id] === "learning" }))
    .filter(({ word, misses, learning }) => learning || (misses > 0 && status[word.id] !== "mastered"))
    .sort(
      (a, b) =>
        b.misses - a.misses || Number(b.learning) - Number(a.learning) || a.word.word.localeCompare(b.word.word),
    );
  const weakCount = words.filter(({ misses }) => misses > 0).length;
  const learningCount = words.filter(({ learning }) => learning).length;
  const visibleWords = words.filter(({ misses, learning }) => filter === "all" || (filter === "weak" ? misses > 0 : learning));
  const everydayWords = EVERYDAY_ENTRIES.filter((entry) => status[`everyday:${entry.id}`] === "learning");
  const everydayMastered = EVERYDAY_ENTRIES.filter((entry) => status[`everyday:${entry.id}`] === "mastered").length;

  return (
    <div className="review-page">
      <header className="home-head">
        <div>
          <p className="kicker">HỌC CÓ TRỌNG TÂM</p>
          <h1>Ôn tập</h1>
          <p className="lede">Gom những mục đang học và những từ từng trả lời sai để ôn lại có trọng tâm.</p>
        </div>
        {collection === "toeic" && visibleWords.length > 0 && (
          <button className="btn primary" onClick={() => act.reviewWords(visibleWords.map(({ word }) => word.id))}>
            <Icon name="repeat" size="sm" /> Ôn {visibleWords.length} từ bằng flashcard
          </button>
        )}
      </header>

      <div className="review-collections" role="group" aria-label="Chọn bộ nội dung cần ôn">
        <button className={`btn sm${collection === "toeic" ? " primary" : ""}`} aria-pressed={collection === "toeic"} onClick={() => setCollection("toeic")}>
          600 từ TOEIC
        </button>
        <button className={`btn sm${collection === "everyday" ? " primary" : ""}`} aria-pressed={collection === "everyday"} onClick={() => setCollection("everyday")}>
          Cụm từ đời thường
        </button>
      </div>

      {collection === "toeic" ? <section className="d-stats review-stats" aria-label="Tổng quan ôn tập TOEIC">
        <div className="d-stat">
          <b>{words.length}</b>
          <span>từ cần ôn</span>
        </div>
        <div className="d-stat">
          <b>{weakCount}</b>
          <span>từ từng làm sai</span>
        </div>
        <div className="d-stat">
          <b>{learningCount}</b>
          <span>đang học</span>
        </div>
      </section> : <section className="d-stats review-stats" aria-label="Tổng quan cụm từ đời thường">
        <div className="d-stat"><b>{everydayWords.length}</b><span>mục đang học</span></div>
        <div className="d-stat"><b>{everydayMastered}</b><span>đã thuộc</span></div>
        <div className="d-stat"><b>{EVERYDAY_ENTRIES.length}</b><span>mục trong bộ</span></div>
      </section>}

      {collection === "everyday" ? (
        everydayWords.length ? <>
          <div className="review-everyday-action">
            <p className="muted">Các mục bạn đánh dấu “Đang học” được gom thành một lượt mới.</p>
            <Link className="btn primary" to="/everyday?review=learning"><Icon name="repeat" size="sm" /> Ôn {everydayWords.length} mục</Link>
          </div>
          <section className="review-list" aria-label="Cụm từ đời thường đang học">
            {everydayWords.map((entry) => <article className="card review-item" key={entry.id}>
              <div className="review-word"><Link to="/everyday"><b>{entry.text}</b></Link><span className="muted">{entry.meaning}</span><small className="muted">{EVERYDAY_KIND_LABEL[entry.kind]}</small></div>
              <span className="badge b-amber">Đang học</span>
            </article>)}
          </section>
        </> : <Empty title="Chưa có mục đời thường nào cần ôn">
          <p className="muted">Khi học flashcard, đánh dấu một mục là “Đang học” để gom mục đó vào đây.</p>
          <Link className="btn primary" to="/everyday">Mở bộ sưu tập</Link>
        </Empty>
      ) : words.length ? (
        <>
          <div className="review-filters" role="group" aria-label="Lọc từ cần ôn">
            {([
              ["all", `Tất cả (${words.length})`],
              ["weak", `Hay sai (${weakCount})`],
              ["learning", `Đang học (${learningCount})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn sm${filter === key ? " primary" : ""}`}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {visibleWords.length ? (
            <section className="review-list" aria-label="Danh sách từ cần ôn">
              {visibleWords.map(({ word, misses, learning }) => (
                <article className="card review-item" key={word.id}>
                  <div className="review-word">
                    <Link to={`/network/${word.id}`}>
                      <FreqMeter z={termInfo(word.word).z} />
                      <b>{word.word}</b>
                    </Link>
                    <span className="muted">{word.vi}</span>
                    <small className="muted">{lessonLabel(word)}</small>
                  </div>
                  <div className="review-flags">
                    {misses > 0 && <span className="badge b-rose">Sai {misses} lần</span>}
                    {learning && <span className="badge b-amber">Đang học</span>}
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <Empty title="Không có từ nào trong nhóm này" />
          )}
        </>
      ) : (
        <Empty title="Chưa có từ nào cần ôn">
          <p className="muted">Khi bạn trả lời sai hoặc đánh dấu một từ là đang học, từ đó sẽ xuất hiện ở đây.</p>
          <Link className="btn primary" to="/topics">
            Chọn bài để học
          </Link>
        </Empty>
      )}
    </div>
  );
}

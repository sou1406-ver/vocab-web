import { useState } from "react";
import { Link } from "react-router-dom";
import { Empty, PosTag, StatusDot } from "@/components/bits";
import { Icon } from "@/components/Icon";
import { expandedCount } from "@/lib/data";
import { matchReason } from "@/lib/search";
import { dayKey, fold, lower } from "@/lib/util";
import { useProfile } from "@/state/profile";
import { toast, useUI } from "@/state/ui";

/** Trường từ tự thêm, sao lưu / khôi phục JSON, xoá tiến độ */
export function ManagePage() {
  const prof = useProfile();
  const setModal = useUI((s) => s.setModal);
  const [q, setQ] = useState("");
  const fq = fold(q.trim());
  const list = prof.custom.filter((w) => !fq || fold(w.word).includes(fq) || matchReason(w, q.trim()));
  const learned = Object.values(prof.status).filter((s) => s === "mastered").length;
  const answered = Object.values(prof.stats).reduce((s, x) => s + x.c + x.w, 0);

  const exportJSON = () => {
    const p = prof.profile();
    const data = {
      app: "VocabLearn-600",
      version: 2,
      profile: p,
      custom: prof.custom,
      status: prof.status,
      statusAt: prof.statusAt,
      srs: prof.srs,
      reviewedToday: prof.reviewedToday,
      stats: prof.stats,
      book: prof.book,
      log: prof.log,
    };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = `vocab-learn-${lower(p.name).replace(/[^a-z0-9]+/g, "-") || "ho-so"}-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importJSON = async (file?: File) => {
    if (!file) return;
    try {
      prof.importData(JSON.parse(await file.text()));
      toast("Đã nhập dữ liệu thành công");
    } catch {
      toast("File JSON không hợp lệ");
    }
  };

  return (
    <div className="stack">
      <section className="card pad">
        <div className="row between">
          <div>
            <h2 className="section-title">Quản lý kho trường từ &amp; sao lưu</h2>
            <p className="section-sub">
              Tự thêm trường từ của riêng bạn (ngoài 600 từ trong sách). Dữ liệu lưu trên trình duyệt này — nhớ Xuất
              JSON để sao lưu, hoặc đăng nhập Google để tự đồng bộ.
            </p>
          </div>
          <div className="row">
            <button className="btn primary" onClick={() => setModal({ kind: "word" })}>
              <Icon name="plus" /> Thêm từ gốc &amp; trường từ
            </button>
            <button className="btn" onClick={exportJSON}>
              <Icon name="download" size="sm" /> Xuất JSON
            </button>
            <label className="btn" style={{ cursor: "pointer" }}>
              <Icon name="upload" size="sm" /> Nhập JSON
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  void importJSON(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
        <div className="search-box" style={{ marginTop: 16 }}>
          <Icon name="search" size="sm" />
          <input
            className="input"
            placeholder="Tìm trong trường từ tự thêm…"
            aria-label="Tìm trong trường từ tự thêm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </section>

      <div className="stats-line">
        <span>
          <b>{prof.custom.length}</b>trường từ của bạn
        </span>
        <span>
          <b>{learned}</b>từ đã thuộc
        </span>
        <span>
          <b>{answered}</b>câu bài tập đã làm
        </span>
      </div>

      <div className="row between">
        <p className="muted" style={{ fontWeight: 600, fontSize: ".85rem" }}>
          Hiển thị {list.length} trường từ tự thêm
        </p>
        <button
          className="btn sm ghost danger"
          onClick={() => {
            if (!confirm("Xoá toàn bộ trạng thái học và thống kê bài tập? (Trường từ tự thêm vẫn giữ nguyên)")) return;
            prof.resetProgress();
            toast("Đã xoá tiến độ");
          }}
        >
          <Icon name="undo" size="sm" /> Xoá toàn bộ tiến độ học
        </button>
      </div>

      {list.length ? (
        <div className="grid grid-3">
          {list.map((w) => (
            <div className="card custom-card" key={w.id}>
              <div className="row between">
                <div className="row" style={{ gap: 6 }}>
                  <StatusDot id={w.id} />
                  <b style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>{w.word}</b>
                  <PosTag pos={w.pos} />
                </div>
                <span className="badge b-teal">+{expandedCount(w)}</span>
              </div>
              <div className="muted" style={{ fontSize: ".85rem" }}>
                {w.vi}
              </div>
              <div style={{ fontSize: ".78rem" }} className="muted">
                {w.family.map((f) => f.w).join(" · ") || "Chưa có họ từ"}
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <Link className="btn sm soft" to={`/network/${w.id}`}>
                  <Icon name="network" size="sm" /> Sơ đồ
                </Link>
                <button className="btn sm" onClick={() => setModal({ kind: "word", id: w.id })}>
                  <Icon name="pencil" size="sm" /> Sửa
                </button>
                <button
                  className="btn sm ghost danger"
                  aria-label={`Xoá trường từ ${w.word}`}
                  onClick={() => {
                    if (!confirm(`Xoá trường từ “${w.word}”?`)) return;
                    prof.deleteCustomWord(w.id);
                    toast("Đã xoá");
                  }}
                >
                  <Icon name="trash" size="sm" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="Chưa có trường từ nào của bạn">
          Thêm một từ bạn gặp ngoài sách, kèm họ từ của nó, để học chung với 600 từ.
          <br />
          <button className="btn primary" onClick={() => setModal({ kind: "word" })}>
            <Icon name="plus" size="sm" /> Thêm trường từ đầu tiên
          </button>
        </Empty>
      )}
    </div>
  );
}

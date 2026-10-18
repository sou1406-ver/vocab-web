import { useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { POS_LABEL, TARGETS } from "@/lib/data";
import type { Word } from "@/lib/types";
import { lower, same } from "@/lib/util";
import { PROFILE_COLORS, useProfile } from "@/state/profile";
import { toast, useUI } from "@/state/ui";
import { Icon } from "./Icon";
import { ModalFrame } from "./Layout";

const GOALS: [number, string][] = [
  [10, "Nhẹ nhàng"],
  [20, "Đều đặn"],
  [40, "Tăng tốc"],
  [60, "Cấp tốc"],
];
const NEW_WORD_LIMITS: [number, string][] = [
  [5, "Nhẹ"],
  [10, "Vừa"],
  [15, "Nhiều"],
  [20, "Rất nhiều"],
];

export function ProfileModal({ isNew }: { isNew: boolean }) {
  const navigate = useNavigate();
  const prof = useProfile();
  const cur = prof.profile();
  const close = useCallback(() => useUI.getState().setModal(null), []);
  const p = isNew
    ? {
        name: "",
        color: PROFILE_COLORS[prof.profiles.length % PROFILE_COLORS.length],
        goal: 20,
        newWordLimit: 10,
        target: 600,
        setup: false,
      }
    : cur;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: String(fd.get("name") || "").trim() || "Đại ca",
      color: String(fd.get("color") || PROFILE_COLORS[0]),
      target: +(fd.get("target") ?? 600) || 600,
      goal: +(fd.get("goal") ?? 20) || 20,
      newWordLimit: +(fd.get("newWordLimit") ?? 10) || 10,
      setup: true,
    };
    if (isNew) {
      prof.addProfile(data);
      useUI.getState().resetSession();
      toast(`Đã tạo hồ sơ “${data.name}”`);
      navigate("/");
    } else {
      prof.updateProfile(data);
      toast("Đã lưu hồ sơ");
    }
    close();
  };

  const remove = () => {
    if (!confirm(`Xoá hồ sơ “${cur.name}” cùng toàn bộ tiến độ của hồ sơ này? Không thể hoàn tác.`)) return;
    prof.deleteProfile(cur.id);
    useUI.getState().resetSession();
    close();
    navigate("/");
  };

  return (
    <ModalFrame onClose={close}>
      <form className="modal" style={{ width: "min(560px,100%)" }} onSubmit={submit}>
        <div className="row between">
          <h3 style={{ fontSize: "1.25rem" }}>{isNew ? "Thêm hồ sơ học" : "Hồ sơ & mục tiêu"}</h3>
          <button type="button" className="icon-btn" onClick={close} aria-label="Đóng">
            <Icon name="x" />
          </button>
        </div>
        <label className="field" style={{ marginTop: 16 }}>
          <span>Tên hiển thị</span>
          <input
            className="input"
            name="name"
            required
            maxLength={40}
            defaultValue={p.name === "Đại ca" && !p.setup ? "" : p.name}
            placeholder="vd: Minh Anh"
          />
        </label>
        <div className="field" style={{ marginTop: 14 }}>
          <span>Màu hồ sơ</span>
          <div className="color-pick">
            {PROFILE_COLORS.map((c) => (
              <label key={c}>
                <input type="radio" name="color" value={c} defaultChecked={c === p.color} aria-label={c} />
                <i style={{ background: c }} />
              </label>
            ))}
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <span>Từ mới tối đa mỗi ngày</span>
          <div className="choice-row">
            {NEW_WORD_LIMITS.map(([limit, label]) => (
              <label key={limit}>
                <input
                  type="radio"
                  name="newWordLimit"
                  value={limit}
                  defaultChecked={(p.newWordLimit ?? 10) === limit}
                />
                <span>
                  <b>{limit} từ</b>
                  <small>{label}</small>
                </span>
              </label>
            ))}
          </div>
          <p className="muted" style={{ fontSize: ".8rem", marginTop: 6 }}>
            Tính khi bạn bắt đầu học từ lần đầu; ôn từ cũ không bị giới hạn.
          </p>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <span>Mục tiêu điểm TOEIC</span>
          <div className="choice-row">
            {TARGETS.map(([s, w, lv]) => (
              <label key={s}>
                <input type="radio" name="target" value={s} defaultChecked={+p.target === s} />
                <span>
                  <b>{s}+</b>
                  <small>
                    {lv} · {w} từ
                  </small>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <span>Mỗi ngày học</span>
          <div className="choice-row">
            {GOALS.map(([g, lv]) => (
              <label key={g}>
                <input type="radio" name="goal" value={g} defaultChecked={+p.goal === g} />
                <span>
                  <b>{g}</b>
                  <small>{lv}</small>
                </span>
              </label>
            ))}
          </div>
          <p className="muted" style={{ fontSize: ".8rem", marginTop: 6 }}>
            Tính cả câu bài tập và thẻ flashcard.
          </p>
        </div>
        <div className="row between" style={{ marginTop: 22 }}>
          {!isNew && prof.profiles.length > 1 && !cur.cloud ? (
            <button type="button" className="btn ghost danger" onClick={remove}>
              <Icon name="trash" size="sm" /> Xoá hồ sơ
            </button>
          ) : (
            <span />
          )}
          <div className="row">
            <button type="button" className="btn" onClick={close}>
              Huỷ
            </button>
            <button className="btn primary">
              <Icon name="check" size="sm" /> {isNew ? "Tạo hồ sơ" : "Lưu"}
            </button>
          </div>
        </div>
      </form>
    </ModalFrame>
  );
}

/** Thêm / sửa trường từ tự thêm (ngoài 600 từ của sách) */
export function WordModal({ id }: { id?: string }) {
  const navigate = useNavigate();
  const { catalog, saveCustomWord } = useProfile();
  const w = id ? catalog.byId[id] : undefined;
  const close = useCallback(() => useUI.getState().setModal(null), []);
  const famText = w
    ? w.family
        .map((f) => [f.w, f.pos, f.parts.join("+"), f.vi, f.note ?? ""].join(" | ").replace(/ \| $/, ""))
        .join("\n")
    : "";

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const list = (k: string) =>
      v(k)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    const family = v("family")
      .split("\n")
      .map((l) => l.split("|").map((c) => c.trim()))
      .filter((c) => c[0])
      .map((c) => ({
        w: c[0],
        pos: c[1] || "n",
        parts: (c[2] || c[0])
          .split("+")
          .map((p) => p.trim())
          .filter(Boolean),
        vi: c[3] || "",
        ...(c[4] ? { note: c[4] } : {}),
      }));
    const newId = id || "c-" + lower(v("word")).replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
    const self = family.find((f) => same(f.w, v("word")));
    const word: Word = {
      id: newId,
      lesson: 0,
      word: v("word"),
      pos: v("pos"),
      def: v("def"),
      ex: v("ex") ? [v("ex")] : [],
      vi: v("vi"),
      syn: list("syn"),
      ant: list("ant"),
      parts: self ? self.parts : [v("word")],
      family,
    };
    saveCustomWord(word);
    toast(`Đã lưu trường từ “${word.word}”`);
    close();
    navigate(`/network/${newId}`);
  };

  return (
    <ModalFrame onClose={close}>
      <form className="modal" onSubmit={submit}>
        <div className="row between">
          <h3 style={{ fontSize: "1.2rem" }}>{w ? "Sửa" : "Thêm"} trường từ</h3>
          <button type="button" className="icon-btn" onClick={close} aria-label="Đóng">
            <Icon name="x" />
          </button>
        </div>
        <div className="grid grid-2" style={{ marginTop: 16, gap: 12 }}>
          <label className="field">
            <span>Từ gốc *</span>
            <input className="input" name="word" required defaultValue={w?.word} placeholder="vd: predict" />
          </label>
          <label className="field">
            <span>Từ loại</span>
            <select className="input" name="pos" defaultValue={w?.pos ?? "n"}>
              {Object.entries(POS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v} ({k})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Nghĩa tiếng Việt *</span>
            <input className="input" name="vi" required defaultValue={w?.vi} placeholder="vd: dự đoán" />
          </label>
          <label className="field">
            <span>Định nghĩa tiếng Anh</span>
            <input className="input" name="def" defaultValue={w?.def} />
          </label>
          <label className="field">
            <span>Đồng nghĩa (cách nhau dấu phẩy)</span>
            <input className="input" name="syn" defaultValue={w?.syn.join(", ")} placeholder="foresee, forecast" />
          </label>
          <label className="field">
            <span>Trái nghĩa (cách nhau dấu phẩy)</span>
            <input className="input" name="ant" defaultValue={w?.ant.join(", ")} />
          </label>
        </div>
        <label className="field" style={{ marginTop: 12 }}>
          <span>Câu ví dụ</span>
          <input className="input" name="ex" defaultValue={w?.ex[0] ?? ""} />
        </label>
        <label className="field" style={{ marginTop: 12 }}>
          <span>Họ từ — mỗi dòng: từ | từ loại | cấu tạo (nối bằng +) | nghĩa</span>
          <textarea
            className="textarea"
            name="family"
            defaultValue={famText}
            placeholder={
              "prediction | n | predict+-ion | sự dự đoán\nunpredictable | adj | un-+predict+-able | khó đoán"
            }
          />
        </label>
        <p className="muted" style={{ fontSize: ".75rem", marginTop: 6 }}>
          Từ loại: n, v, adj, adv, phr. Tiền tố viết <span className="chip prefix">un-</span>, hậu tố viết{" "}
          <span className="chip suffix">-able</span>.
        </p>
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
          <button type="button" className="btn" onClick={close}>
            Huỷ
          </button>
          <button className="btn primary">
            <Icon name="check" size="sm" /> Lưu trường từ
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

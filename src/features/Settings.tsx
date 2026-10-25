"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useApp } from "../state/provider";
import { catalog } from "../data/catalog";
import { applyImport, previewImport, type ImportPreview } from "../data/imports";
import { Icon } from "../shared/ui";
import { dayKey } from "../domain/learning";
import { UserAvatar } from "../components/UserAvatar";

const initialAvatarSeeds = Array.from({ length: 12 }, (_, i) => `vocab-avatar-${i + 1}`);

export default function Settings() {
  const { data, busy, change } = useApp();
  const [name, setName] = useState(data.settings.name);
  const [goal, setGoal] = useState(data.settings.dailyNew);
  const [theme, setTheme] = useState(data.settings.theme);
  const [avatarSeed, setAvatarSeed] = useState<string>();
  const [avatarSeeds, setAvatarSeeds] = useState<string[] | null>(null);
  const selectedAvatar = avatarSeed ?? data.settings.avatarSeed ?? (name.trim() || "Vocab guest");
  const avatarOptions = avatarSeeds ?? [
    selectedAvatar,
    ...initialAvatarSeeds.filter((seed) => seed !== selectedAvatar).slice(0, 11),
  ];
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [reading, setReading] = useState(false);
  const active = data.session && data.session.phase !== "complete";
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setNotice("");
    if (
      await change((s) => ({
        ...s,
        settings: {
          ...s.settings,
          name: name.trim().slice(0, 60),
          dailyNew: goal,
          theme,
          ...(avatarSeed === undefined ? {} : { avatarSeed }),
        },
      }))
    )
      setNotice("Đã lưu tuỳ chọn của bạn.");
  };
  const download = () => {
    const blob = new Blob(
      [JSON.stringify({ app: "VocabLearn-v2", exportedAt: new Date().toISOString(), data: data }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocab-v2-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const chooseFile = async (file?: File) => {
    if (!file) return;
    setPreview(null);
    setError("");
    setReading(true);
    setNotice("");
    try {
      if (file.size > 10_000_000) throw new Error("Vui lòng chọn file dưới 10 MB.");
      setPreview(await previewImport(await file.text(), catalog));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được file. Hãy chọn bản sao lưu JSON của Vocab.");
    } finally {
      setReading(false);
    }
  };
  const importData = async () => {
    if (!preview) return;
    if (await change((s) => applyImport(s, preview))) {
      setNotice("Đã nhập dữ liệu. Bạn có thể kiểm tra ở Thư viện và Tiến độ.");
      setPreview(null);
    }
  };
  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>
            Góc nhỏ của bạn<span className="heading-dot">.</span>
          </h1>
          <p className="page-subtitle">Điều chỉnh mục tiêu và giữ một bản sao hành trình học.</p>
        </div>
      </div>
      <section className="local-notice">
        <span className="stat-icon green">
          <Icon name="check" />
        </span>
        <div>
          <h2>Đang học trên thiết bị này</h2>
          <p>
            Bản thử nghiệm lưu tiến độ trong trình duyệt. Tải bản sao để mang theo khi đổi máy hoặc xoá dữ liệu trình
            duyệt. Đồng bộ tài khoản sẽ được bổ sung trước khi phát hành chính thức.
          </p>
        </div>
      </section>
      <div className="settings-columns">
        <section className="panel">
          <div className="section-heading">
            <h2>Nhịp học & giao diện</h2>
            <Icon name="settings" />
          </div>
          <form className="settings-form" onSubmit={(e) => void save(e)}>
            <label htmlFor="profile-name">Mình gọi bạn là gì?</label>
            <input
              id="profile-name"
              autoComplete="given-name"
              maxLength={60}
              placeholder="Tên của bạn"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <fieldset className="avatar-picker">
              <legend>Ảnh đại diện</legend>
              <div className="avatar-options">
                {avatarOptions.map((seed, i) => (
                  <button
                    key={seed}
                    type="button"
                    className="avatar-option"
                    aria-label={`Chọn avatar ${i + 1}`}
                    aria-pressed={seed === selectedAvatar}
                    onClick={() => {
                      setAvatarSeeds(avatarOptions);
                      setAvatarSeed(seed);
                    }}
                  >
                    <UserAvatar seed={seed} />
                  </button>
                ))}
              </div>
              <button
                className="text-link"
                type="button"
                onClick={() =>
                  setAvatarSeeds([selectedAvatar, ...Array.from({ length: 11 }, () => crypto.randomUUID())])
                }
              >
                Đổi bộ avatar
              </button>
            </fieldset>
            <label htmlFor="daily-goal">Mục tiêu từ mới mỗi ngày</label>
            <select id="daily-goal" value={goal} onChange={(e) => setGoal(Number(e.target.value))}>
              {[5, 10, 15, 20, 30, 50].includes(goal) ? null : <option value={goal}>{goal} từ</option>}
              {[5, 10, 15, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n} từ mỗi ngày
                </option>
              ))}
            </select>
            <p className="field-hint">Đây là mục tiêu gợi ý. Bạn vẫn có thể học thêm khi muốn.</p>
            <label htmlFor="theme-select">Giao diện</label>
            <select id="theme-select" value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)}>
              <option value="system">Theo thiết bị</option>
              <option value="light">Sáng</option>
              <option value="dark">Tối</option>
            </select>
            <p className="field-hint">Ngày học tính theo giờ Việt Nam (UTC+7).</p>
            <button className="button primary" disabled={busy} type="submit">
              Lưu tuỳ chọn <Icon name="check" size={17} />
            </button>
          </form>
        </section>
        <section className="panel backup-panel">
          <div className="section-heading">
            <h2>Giữ lại hành trình</h2>
            <Icon name="download" />
          </div>
          <p className="muted">Bản sao gồm tiến độ, lịch ôn, lượt dang dở và dữ liệu đã nhập từ web cũ.</p>
          <button className="button secondary full-width" onClick={download}>
            <Icon name="download" size={18} /> Tải bản sao lưu
          </button>
          <div className="settings-divider" />
          <h3>Mang dữ liệu của bạn sang đây</h3>
          <p className="muted">
            Chọn file JSON xuất từ web cũ hoặc bản Vocab mới. Bạn sẽ được xem trước trước khi nhập.
          </p>
          <label className="file-upload" htmlFor="backup-file">
            <Icon name="upload" size={24} />
            <span>{reading ? "Đang đọc bản sao lưu…" : "Chọn bản sao lưu JSON"}</span>
            <small>Dưới 10 MB</small>
          </label>
          <input
            id="backup-file"
            className="file-input"
            type="file"
            accept=".json,application/json"
            disabled={reading || busy}
            onChange={(e) => {
              void chooseFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
          <p className="quiet-note">File có thể chứa thông tin cá nhân. Giữ ở nơi riêng của bạn.</p>
        </section>
      </div>
      {preview && (
        <section className="panel import-preview" aria-label="Xem trước dữ liệu nhập">
          <p className="eyebrow">XEM TRƯỚC · CHƯA NHẬP DỮ LIỆU</p>
          <h2>{preview.title}</h2>
          <div className="import-counts">
            <span>
              <b>{preview.count}</b> từ có tiến độ
            </span>
            <span>
              <b>{preview.customCount}</b> từ riêng
            </span>
            <span>
              <b>{preview.warnings.length}</b> mục cần xem lại
            </span>
          </div>
          <p>
            {preview.kind === "backup"
              ? "Khôi phục sẽ thay tiến độ hiện tại bằng bản sao này. Một bản dữ liệu trước khôi phục được giữ trong file xuất sau đó. Nên tải bản sao hiện tại trước khi tiếp tục."
              : "Tiến độ đang có ở bản mới được ưu tiên khi trùng ID. Phần chưa ánh xạ và dữ liệu gốc được giữ trong bản sao xuất ra."}
          </p>
          {data.imports.includes(preview.id) && <p className="inline-error">Bản này đã được nhập trước đó.</p>}
          {preview.warnings.length > 0 && (
            <details>
              <summary>Xem các mục cần kiểm tra</summary>
              <ul>
                {preview.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </details>
          )}
          {active && (
            <p className="inline-error">
              Còn lượt đang học. <Link href="/study">Tiếp tục hoặc kết thúc lượt</Link> trước khi nhập.
            </p>
          )}
          <div className="import-actions">
            <button
              className="button primary"
              disabled={busy || Boolean(active) || data.imports.includes(preview.id)}
              onClick={() => void importData()}
            >
              {preview.kind === "backup" ? "Khôi phục bản sao này" : "Nhập dữ liệu này"}
              <Icon name="upload" size={17} />
            </button>
            <button className="button secondary" onClick={() => setPreview(null)}>
              Huỷ
            </button>
          </div>
        </section>
      )}
      {notice && (
        <p className="success-note" role="status">
          <Icon name="check" size={18} />
          {notice}
        </p>
      )}
    </div>
  );
}

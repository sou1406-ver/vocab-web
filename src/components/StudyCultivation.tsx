import { cultivationOf } from "../domain/cultivation";
import { CultivationAvatar } from "./CultivationAvatar";
import { ProgressBar } from "../shared/ui";

export function StudyCultivation({ count }: { count: number }) {
  const realm = cultivationOf(count);
  return (
    <section className="study-cultivation" aria-label="Tu vi trong lượt">
      <div>
        <strong>{realm.name}</strong>
        <span>
          {realm.count}
          {realm.next === null ? " từ · Đã đạt mốc cao nhất" : ` / ${realm.next} từ`}
        </span>
      </div>
      <ProgressBar value={realm.progress} label="Tiến độ tới cảnh giới kế tiếp" />
    </section>
  );
}

export function StudyBreakthrough({
  threshold,
  seed,
  onContinue,
}: {
  threshold: number;
  seed: string;
  onContinue: () => void;
}) {
  const realm = cultivationOf(threshold);
  return (
    <div className="page study-breakthrough" aria-labelledby="breakthrough-title">
      <p className="eyebrow">ĐỘT PHÁ CẢNH GIỚI</p>
      <CultivationAvatar words={threshold} seed={seed} />
      <h1 id="breakthrough-title" tabIndex={-1}>
        {realm.name}
      </h1>
      <p>Bạn đã học {threshold} từ. Tiếp tục từng bước để nhớ lâu hơn.</p>
      <button className="button primary" autoFocus onClick={onContinue}>
        Tiếp tục
      </button>
    </div>
  );
}

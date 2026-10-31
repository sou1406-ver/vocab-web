import {
  Circle,
  Wind,
  Shield,
  CircleDot,
  Sparkles,
  Sun,
  Orbit,
  Hexagon,
  Gem,
  Zap,
  CloudSun,
  Crown,
} from "lucide-react";
import { cultivationOf } from "../domain/cultivation";
import { UserAvatar } from "./UserAvatar";

const badges = [Circle, Wind, Shield, CircleDot, Sparkles, Sun, Orbit, Hexagon, Gem, Zap, CloudSun, Crown];
export function CultivationAvatar({
  words,
  seed = "Vocab guest",
  decorative = false,
}: {
  words: number;
  seed?: string;
  decorative?: boolean;
}) {
  const realm = cultivationOf(words);
  const Badge = badges[realm.index];
  return (
    <span
      className={`cultivation-avatar cultivation-avatar--${realm.index}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Avatar cảnh giới ${realm.name}`}
    >
      <UserAvatar seed={seed} />
      <span className="cultivation-avatar-badge" aria-hidden="true">
        <Badge />
      </span>
    </span>
  );
}

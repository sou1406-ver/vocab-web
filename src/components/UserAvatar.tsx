import { avatarSource } from "../lib/avatar";

export function UserAvatar({ seed }: { seed: string }) {
  return (
    <span className="user-avatar" aria-hidden="true">
      {/* Static SVGs are served directly; no runtime image generator. */}
      <img src={avatarSource(seed)} alt="" width={64} height={64} draggable={false} />
    </span>
  );
}

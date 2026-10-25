import Avatar from "boring-avatars";

export function UserAvatar({ seed }: { seed: string }) {
  return (
    <span className="user-avatar" aria-hidden="true">
      <Avatar name={seed} variant="beam" size="100%" colors={["#2f7357", "#6cc790", "#e9eee4", "#ffb89a", "#e04a2f"]} />
    </span>
  );
}

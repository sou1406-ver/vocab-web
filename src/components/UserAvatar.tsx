import Avatar from "boring-avatars";

export function UserAvatar({ seed }: { seed: string }) {
  return (
    <span className="user-avatar" aria-hidden="true">
      <Avatar name={seed} variant="beam" size="100%" colors={["#205840", "#6cc790", "#e6edb7", "#ffb89a", "#e04a2f"]} />
    </span>
  );
}

import type { Metadata } from "next";
import Leaderboard from "../../features/Leaderboard";
import { LocalReady } from "../LocalReady";

export const metadata: Metadata = { title: "Bảng tu luyện", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <LocalReady>
      <Leaderboard />
    </LocalReady>
  );
}

import type { Metadata } from "next";
import Study from "../../features/Study";
import { LocalReady } from "../LocalReady";
export const metadata: Metadata = { title: "Lượt học", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <LocalReady>
      <Study />
    </LocalReady>
  );
}

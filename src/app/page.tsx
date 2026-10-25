import type { Metadata } from "next";
import { Today } from "../features/Today";
import { LocalReady } from "./LocalReady";
export const metadata: Metadata = { title: "Hôm nay", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <LocalReady>
      <Today />
    </LocalReady>
  );
}

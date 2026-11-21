import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JourneySandbox } from "../../../features/hanh-trinh/Journey";
import "../../../features/hanh-trinh/journey.css";

export const metadata: Metadata = {
  title: "Hành trình Luyện đan sư",
  robots: { index: false, follow: false },
};

export default function JourneyLayout({ children }: { children: ReactNode }) {
  return <JourneySandbox>{children}</JourneySandbox>;
}

"use client";
import { useEffect } from "react";
import { library } from "../data/catalog";

// Registers the offline cache in production builds only; development unregisters it so stale caches never hide edits.
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((registration) => void registration.unregister()))
        .catch(() => undefined);
      return;
    }
    const version = encodeURIComponent(process.env.NEXT_PUBLIC_BUILD_ID ?? "dev");
    let timer = 0;
    navigator.serviceWorker
      .register(`/sw.js?v=${version}`, { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        // Lesson pages render their list on the client, so the app hands the worker their URLs once the page is idle.
        const urls = library.books.flatMap((book) =>
          book.catalog.lessons.map((lesson) => `/books/${book.id}/lessons/${lesson.id}`),
        );
        timer = window.setTimeout(() => registration.active?.postMessage({ type: "cache-lessons", urls }), 3000);
      })
      .catch(() => {
        /* Offline caching is optional; the app keeps working online without it. */
      });
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}

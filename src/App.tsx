import { lazy, Suspense, type ReactNode } from "react";
import { createHashRouter, Navigate, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout";

const AffixesPage = lazy(() => import("./features/vocabulary/Affixes").then((m) => ({ default: m.AffixesPage })));
const Dashboard = lazy(() => import("./features/dashboard/Dashboard").then((m) => ({ default: m.Dashboard })));
const CoursePathPage = lazy(() =>
  import("./features/learning/CoursePath").then((m) => ({ default: m.CoursePathPage })),
);
const EverydayPage = lazy(() => import("./features/everyday/Everyday").then((m) => ({ default: m.EverydayPage })));
const FlashcardsPage = lazy(() =>
  import("./features/learning/Flashcards").then((m) => ({ default: m.FlashcardsPage })),
);
const KnowledgePage = lazy(() => import("./features/vocabulary/Knowledge").then((m) => ({ default: m.KnowledgePage })));
const ManagePage = lazy(() => import("./features/account/Manage").then((m) => ({ default: m.ManagePage })));
const NetworkPage = lazy(() => import("./features/vocabulary/Network").then((m) => ({ default: m.NetworkPage })));
const PracticePage = lazy(() => import("./features/learning/Practice").then((m) => ({ default: m.PracticePage })));
const QuizPage = lazy(() => import("./features/learning/Quiz").then((m) => ({ default: m.QuizPage })));
const ReviewPage = lazy(() => import("./features/learning/Review").then((m) => ({ default: m.ReviewPage })));
const TermPage = lazy(() => import("./features/vocabulary/Term").then((m) => ({ default: m.TermPage })));
const TopicsPage = lazy(() => import("./features/vocabulary/Topics").then((m) => ({ default: m.TopicsPage })));

function PageLoading() {
  return (
    <main className="container page-loading" role="status">
      Đang tải trang…
    </main>
  );
}

function page(element: ReactNode) {
  return <Suspense fallback={<PageLoading />}>{element}</Suspense>;
}

// Hash router: giữ nguyên dạng link của bản cũ (#/network/agreement-1/agree) và chạy được trên GitHub Pages.
const router = createHashRouter(
  [
    {
      path: "/",
      element: <Layout />,
      children: [
        { index: true, element: page(<Dashboard />) },
        { path: "topics", element: page(<TopicsPage />) },
        { path: "network/:id?/:form?", element: page(<NetworkPage />) },
        { path: "term/:term", element: page(<TermPage />) },
        { path: "flashcards", element: page(<FlashcardsPage />) },
        { path: "quiz", element: page(<QuizPage />) },
        { path: "practice", element: page(<PracticePage />) },
        { path: "course", element: page(<CoursePathPage />) },
        { path: "everyday", element: page(<EverydayPage />) },
        { path: "review", element: page(<ReviewPage />) },
        { path: "affixes/:affix?", element: page(<AffixesPage />) },
        { path: "knowledge", element: page(<KnowledgePage />) },
        { path: "manage", element: page(<ManagePage />) },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  {
    // Bật sẵn các thay đổi của React Router v7 (hết cảnh báo "Future Flag" trong console, dễ nâng cấp sau này).
    // Web không dùng form action / fetcher / splat route lồng nhau nên các cờ này không đổi hành vi.
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);

export function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}

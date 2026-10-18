import { lazy, Suspense, type ReactNode } from "react";
import { createHashRouter, Navigate, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout";

const AffixesPage = lazy(() => import("./pages/Affixes").then((m) => ({ default: m.AffixesPage })));
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const EverydayPage = lazy(() => import("./pages/Everyday").then((m) => ({ default: m.EverydayPage })));
const FlashcardsPage = lazy(() => import("./pages/Flashcards").then((m) => ({ default: m.FlashcardsPage })));
const KnowledgePage = lazy(() => import("./pages/Knowledge").then((m) => ({ default: m.KnowledgePage })));
const ManagePage = lazy(() => import("./pages/Manage").then((m) => ({ default: m.ManagePage })));
const NetworkPage = lazy(() => import("./pages/Network").then((m) => ({ default: m.NetworkPage })));
const PracticePage = lazy(() => import("./pages/Practice").then((m) => ({ default: m.PracticePage })));
const QuizPage = lazy(() => import("./pages/Quiz").then((m) => ({ default: m.QuizPage })));
const ReviewPage = lazy(() => import("./pages/Review").then((m) => ({ default: m.ReviewPage })));
const TermPage = lazy(() => import("./pages/Term").then((m) => ({ default: m.TermPage })));
const TopicsPage = lazy(() => import("./pages/Topics").then((m) => ({ default: m.TopicsPage })));

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
const router = createHashRouter([
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
      { path: "everyday", element: page(<EverydayPage />) },
      { path: "review", element: page(<ReviewPage />) },
      { path: "affixes/:affix?", element: page(<AffixesPage />) },
      { path: "knowledge", element: page(<KnowledgePage />) },
      { path: "manage", element: page(<ManagePage />) },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

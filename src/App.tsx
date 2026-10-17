import { createHashRouter, Navigate, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AffixesPage } from "./pages/Affixes";
import { Dashboard } from "./pages/Dashboard";
import { EverydayPage } from "./pages/Everyday";
import { FlashcardsPage } from "./pages/Flashcards";
import { KnowledgePage } from "./pages/Knowledge";
import { ManagePage } from "./pages/Manage";
import { NetworkPage } from "./pages/Network";
import { PracticePage } from "./pages/Practice";
import { QuizPage } from "./pages/Quiz";
import { ReviewPage } from "./pages/Review";
import { TermPage } from "./pages/Term";
import { TopicsPage } from "./pages/Topics";

// Hash router: giữ nguyên dạng link của bản cũ (#/network/agreement-1/agree) và chạy được trên GitHub Pages
const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "topics", element: <TopicsPage /> },
      { path: "network/:id?/:form?", element: <NetworkPage /> },
      { path: "term/:term", element: <TermPage /> },
      { path: "flashcards", element: <FlashcardsPage /> },
      { path: "quiz", element: <QuizPage /> },
      { path: "practice", element: <PracticePage /> },
      { path: "everyday", element: <EverydayPage /> },
      { path: "review", element: <ReviewPage /> },
      { path: "affixes/:affix?", element: <AffixesPage /> },
      { path: "knowledge", element: <KnowledgePage /> },
      { path: "manage", element: <ManagePage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

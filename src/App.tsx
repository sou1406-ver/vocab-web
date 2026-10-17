import { createHashRouter, Navigate, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AffixesPage } from "./pages/Affixes";
import { Dashboard } from "./pages/Dashboard";
import { FlashcardsPage } from "./pages/Flashcards";
import { ManagePage } from "./pages/Manage";
import { NetworkPage } from "./pages/Network";
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
      { path: "review", element: <ReviewPage /> },
      { path: "affixes/:affix?", element: <AffixesPage /> },
      { path: "manage", element: <ManagePage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

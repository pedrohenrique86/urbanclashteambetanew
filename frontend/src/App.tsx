import React, { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import GlobalLayout from "./components/layout/GlobalLayout";
import { LoadingSpinner } from "./components/ui/LoadingSpinner"; // Um spinner para o fallback

// --- Lazy Load das Páginas ---
const HomePage = lazy(() => import("./pages/HomePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const FactionSelectionPage = lazy(() => import("./pages/FactionSelectionPage"));
const ClanSelectionPage = lazy(() => import("./pages/ClanSelectionPage"));
const EmailConfirmationPage = lazy(
  () => import("./pages/EmailConfirmationPage"),
);
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const RankingPage = lazy(() => import("./pages/RankingPage"));
const ClansPage = lazy(() => import("./pages/ClansPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const DuelsPage = lazy(() => import("./pages/DuelsPage"));
const RestaurantPage = lazy(() => import("./pages/RestaurantPage"));
const HospitalPage = lazy(() => import("./pages/HospitalPage"));
const PrisonPage = lazy(() => import("./pages/PrisonPage"));
const TerritoryPage = lazy(() => import("./pages/TerritoryPage"));
const MarketPage = lazy(() => import("./pages/MarketPage"));
const BankPage = lazy(() => import("./pages/BankPage"));
const BusinessPage = lazy(() => import("./pages/BusinessPage"));
const SquarePage = lazy(() => import("./pages/SquarePage"));
const GymPage = lazy(() => import("./pages/GymPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const VipPage = lazy(() => import("./pages/VipPage"));
const StorePage = lazy(() => import("./pages/StorePage"));
const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const ClanPage = lazy(() => import("./pages/ClanPage"));
const GoogleCallbackPage = lazy(() => import("./pages/GoogleCallbackPage"));

import "./index.css";

// Componente de fallback para o Suspense
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <LoadingSpinner />
  </div>
);

const AppLayout = () => (
  <GlobalLayout>
    <Outlet />
  </GlobalLayout>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/auth/google/callback",
    element: <GoogleCallbackPage />,
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "faction-selection", element: <FactionSelectionPage /> },
      { path: "clan-selection", element: <ClanSelectionPage /> },
      { path: "email-confirmation", element: <EmailConfirmationPage /> },
      { path: "confirm-email", element: <EmailConfirmationPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "ranking", element: <RankingPage /> },
      { path: "clans", element: <ClansPage /> },
      { path: "clan", element: <ClanPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "duels", element: <DuelsPage /> },
      { path: "restaurant", element: <RestaurantPage /> },
      { path: "hospital", element: <HospitalPage /> },
      { path: "prison", element: <PrisonPage /> },
      { path: "territory", element: <TerritoryPage /> },
      { path: "market", element: <MarketPage /> },
      { path: "bank", element: <BankPage /> },
      { path: "business", element: <BusinessPage /> },
      { path: "square", element: <SquarePage /> },
      { path: "gym", element: <GymPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "vip", element: <VipPage /> },
      { path: "store", element: <StorePage /> },
      { path: "overview", element: <OverviewPage /> },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Suspense fallback={<PageLoader />}>
          <RouterProvider
            router={router}
            future={{ v7_startTransition: true }}
          />
        </Suspense>
      </ToastProvider>
    </ThemeProvider>
  );
}

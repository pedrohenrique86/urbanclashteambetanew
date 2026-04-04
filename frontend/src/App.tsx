import React, { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { GameClockProvider } from "./contexts/GameClockContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { GlobalLoadingSpinner } from "./components/ui/GlobalLoadingSpinner";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import GlobalLayout from "./components/layout/GlobalLayout";

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
const ContractsPage = lazy(() => import("./pages/ContractsPage"));
const ReckoningPage = lazy(() => import("./pages/ReckoningPage"));
const SquadWarPage = lazy(() => import("./pages/SquadWarPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SupplyExtractionPage = lazy(() => import("./pages/SupplyExtractionPage"));
const RecoveryBasePage = lazy(() => import("./pages/RecoveryBasePage"));
const IsolationPage = lazy(() => import("./pages/IsolationPage"));
const DarkZonesPage = lazy(() => import("./pages/DarkZonesPage"));
const ParallelNetworkPage = lazy(() => import("./pages/ParallelNetworkPage"));
const SafePage = lazy(() => import("./pages/SafePage"));
const CorporationsPage = lazy(() => import("./pages/CorporationsPage"));
const SocialZonePage = lazy(() => import("./pages/SocialZonePage"));
const TrainingPage = lazy(() => import("./pages/TrainingPage"));
const DigitalIdentityPage = lazy(() => import("./pages/DigitalIdentityPage"));
const VipAccessPage = lazy(() => import("./pages/VipAccessPage"));
const RestrictedStorePage = lazy(() => import("./pages/RestrictedStorePage"));
const ClanPage = lazy(() => import("./pages/ClanPage"));
const GoogleCallbackPage = lazy(() => import("./pages/GoogleCallbackPage"));

import "./index.css";

// Componente de fallback para o Suspense
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-900" />
);

const RootWrapper = () => (
  <UserProfileProvider>
    <Outlet />
  </UserProfileProvider>
);

const AppLayout = () => (
  <GlobalLayout>
    <Outlet />
  </GlobalLayout>
);

const router = createBrowserRouter([
  {
    element: <RootWrapper />,
    children: [
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
          // Rotas de Autenticação e Seleção
          { path: "dashboard", element: <DashboardPage /> },
          { path: "faction-selection", element: <FactionSelectionPage /> },
          { path: "clan-selection", element: <ClanSelectionPage /> },
          { path: "email-confirmation", element: <EmailConfirmationPage /> },
          { path: "confirm-email", element: <EmailConfirmationPage /> },
          { path: "reset-password", element: <ResetPasswordPage /> },

          // Rotas de Operações
          { path: "contracts", element: <ContractsPage /> },
          { path: "reckoning", element: <ReckoningPage /> },
          { path: "squad-war", element: <SquadWarPage /> },
          { path: "supply-extraction", element: <SupplyExtractionPage /> },
          { path: "recovery-base", element: <RecoveryBasePage /> },
          { path: "isolation", element: <IsolationPage /> },

          // Rotas de Economia
          { path: "dark-zones", element: <DarkZonesPage /> },
          { path: "parallel-network", element: <ParallelNetworkPage /> },
          { path: "safe", element: <SafePage /> },
          { path: "corporations", element: <CorporationsPage /> },

          // Rotas de Rede
          { path: "clan", element: <ClanPage /> },
          { path: "social-zone", element: <SocialZonePage /> },
          { path: "training", element: <TrainingPage /> },
          { path: "digital-identity", element: <DigitalIdentityPage /> },

          // Rotas Elite
          { path: "vip-access", element: <VipAccessPage /> },
          { path: "restricted-store", element: <RestrictedStorePage /> },

          // Outras rotas
          { path: "ranking", element: <RankingPage /> },
          { path: "profile", element: <ProfilePage /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <GameClockProvider>
          <LoadingProvider>
            <Suspense fallback={<PageLoader />}>
              <GlobalLoadingSpinner />
              <RouterProvider
                router={router}
                future={{ v7_startTransition: true }}
              />
            </Suspense>
          </LoadingProvider>
        </GameClockProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
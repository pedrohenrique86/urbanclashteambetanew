import React, { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { GameClockProvider } from "./contexts/GameClockContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { HUDProvider } from "./contexts/HUDContext";
import { GlobalLoadingSpinner } from "./components/ui/GlobalLoadingSpinner";
import { ChatProvider } from "./contexts/ChatContext";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import GlobalLayout from "./components/layout/GlobalLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RootErrorBoundary from "./components/RootErrorBoundary";

// --- Lazy Load das Páginas ---
const HomePage = lazy(() => import("./pages/HomePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const FactionSelectionPage = lazy(() => import("./pages/FactionSelectionPage"));
const QGPage = lazy(() => import("./pages/QGPage"));
const EmailConfirmationPage = lazy(
  () => import("./pages/EmailConfirmationPage"),
);
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const RankingPage = lazy(() => import("./pages/RankingPage"));
const ContractsPage = lazy(() => import("./pages/ContractsPage"));
const ReckoningPage = lazy(() => import("./pages/ReckoningPage"));
const SquadWarPage = lazy(() => import("./pages/SquadWarPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SupplyStationPage = lazy(() => import("./pages/SupplyStationPage"));
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

const DarkMarketPage = lazy(() => import("./pages/DarkMarketPage"));
const ParallelDeckPage = lazy(() => import("./pages/ParallelDeckPage"));
const NetworkCircuitPage = lazy(() => import("./pages/NetworkCircuitPage"));
const TacticalArsenalPage = lazy(() => import("./pages/TacticalArsenalPage"));
const NetworkLogsPage = lazy(() => import("./pages/NetworkLogsPage"));
const SeasonPage = lazy(() => import("./pages/SeasonPage"));

import "./index.css";

// Componente de fallback para o Suspense
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-900" />
);

const RootWrapper = () => (
  <UserProfileProvider>
    <ChatProvider>
      <Outlet />
    </ChatProvider>
  </UserProfileProvider>
);

// O FactionRequiredRoute foi removido. A lógica agora está no ProtectedRoute.
// import FactionRequiredRoute from "./components/FactionRequiredRoute";

const AppLayout = () => (
  <GlobalLayout>
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  </GlobalLayout>
);

const router = createBrowserRouter([
  {
    element: <RootWrapper />,
    errorElement: <RootErrorBoundary />,
    children: [
      // --- Rotas Públicas ---
      { path: "/", element: <GlobalLayout><HomePage /></GlobalLayout> },
      { path: "/auth/google/callback", element: <GlobalLayout><GoogleCallbackPage /></GlobalLayout> },
      { path: "/confirm-email", element: <GlobalLayout><EmailConfirmationPage /></GlobalLayout> },
      { path: "/email-confirmation", element: <GlobalLayout><EmailConfirmationPage /></GlobalLayout> },
      { path: "/reset-password", element: <GlobalLayout><ResetPasswordPage /></GlobalLayout> },

      // --- Rotas Protegidas ---
      {
        element: (
          <ProtectedRoute requiresFaction={false}>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          // Rota para seleção de facção: requer login, mas não facção.
          { path: "faction-selection", element: <FactionSelectionPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute requiresFaction={true}>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          // Rotas de jogo: requerem login E facção.
          { path: "dashboard", element: <DashboardPage /> },
          { path: "contracts", element: <ContractsPage /> },
          { path: "reckoning", element: <ReckoningPage /> },
          { path: "squad-war", element: <SquadWarPage /> },
          { path: "supply-station", element: <SupplyStationPage /> },
          { path: "recovery-base", element: <RecoveryBasePage /> },
          { path: "isolation", element: <IsolationPage /> },
          { path: "dark-zones", element: <DarkZonesPage /> },
          { path: "parallel-network", element: <ParallelNetworkPage /> },
          { path: "safe", element: <SafePage /> },
          { path: "corporations", element: <CorporationsPage /> },
          { path: "qg", element: <QGPage /> },
          { path: "social-zone", element: <SocialZonePage /> },
          { path: "training", element: <TrainingPage /> },
          { path: "digital-identity", element: <DigitalIdentityPage /> },
          { path: "vip-access", element: <VipAccessPage /> },
          { path: "restricted-store", element: <RestrictedStorePage /> },
          { path: "ranking", element: <RankingPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "clan", element: <ClanPage /> },
          { path: "dark-market", element: <DarkMarketPage /> },
          { path: "parallel-deck", element: <ParallelDeckPage /> },
          { path: "network-circuit", element: <NetworkCircuitPage /> },
          { path: "tactical-arsenal", element: <TacticalArsenalPage /> },
          { path: "network-logs", element: <NetworkLogsPage /> },
          { path: "season", element: <SeasonPage /> },
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
            <HUDProvider>
              <GlobalLoadingSpinner />
              <RouterProvider
                router={router}
                future={{ v7_startTransition: true }}
              />
            </HUDProvider>
          </LoadingProvider>
        </GameClockProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
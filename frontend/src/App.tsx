import React, { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { GameClockProvider } from "./contexts/GameClockContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { GlobalLoadingSpinner } from "./components/ui/GlobalLoadingSpinner";
import { ChatProvider } from "./contexts/ChatContext";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import GlobalLayout from "./components/layout/GlobalLayout";
import ProtectedRoute from "./components/ProtectedRoute";

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
    <ChatProvider>
      <Outlet />
    </ChatProvider>
  </UserProfileProvider>
);

// O FactionRequiredRoute foi removido. A lógica agora está no ProtectedRoute.
// import FactionRequiredRoute from "./components/FactionRequiredRoute";

const AppLayout = () => (
  <GlobalLayout>
    <Outlet />
  </GlobalLayout>
);

const router = createBrowserRouter([
  {
    element: <RootWrapper />,
    children: [
      // --- Rotas Públicas ---
      { path: "/", element: <HomePage /> },
      { path: "/auth/google/callback", element: <GoogleCallbackPage /> },
      { path: "/confirm-email", element: <EmailConfirmationPage /> },
      { path: "/email-confirmation", element: <EmailConfirmationPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },

      // --- Rotas Protegidas ---
      {
        element: <AppLayout />,
        children: [
          // Rota para seleção de facção: requer login, mas não facção.
          {
            path: "faction-selection",
            element: (
              <ProtectedRoute>
                <FactionSelectionPage />
              </ProtectedRoute>
            ),
          },
          // Rotas de jogo: requerem login E facção.
          {
            path: "dashboard",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <DashboardPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "contracts",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <ContractsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "reckoning",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <ReckoningPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "squad-war",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <SquadWarPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "supply-extraction",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <SupplyExtractionPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "recovery-base",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <RecoveryBasePage />
              </ProtectedRoute>
            ),
          },
          {
            path: "isolation",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <IsolationPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "dark-zones",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <DarkZonesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "parallel-network",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <ParallelNetworkPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "safe",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <SafePage />
              </ProtectedRoute>
            ),
          },
          {
            path: "corporations",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <CorporationsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "qg",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <QGPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "social-zone",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <SocialZonePage />
              </ProtectedRoute>
            ),
          },
          {
            path: "training",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <TrainingPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "digital-identity",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <DigitalIdentityPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "vip-access",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <VipAccessPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "restricted-store",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <RestrictedStorePage />
              </ProtectedRoute>
            ),
          },
          {
            path: "ranking",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <RankingPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "profile",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <ProfilePage />
              </ProtectedRoute>
            ),
          },
           {
            path: "clan",
            element: (
              <ProtectedRoute requiresFaction={true}>
                <ClanPage />
              </ProtectedRoute>
            ),
          },
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
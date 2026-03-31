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
const EmailConfirmationPage = lazy(
  () => import("./pages/EmailConfirmationPage"),
);
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const RankingPage = lazy(() => import("./pages/RankingPage"));
const ContractsPage = lazy(() => import("./pages/ContractsPage"));
const ReckoningPage = lazy(() => import("./pages/ReckoningPage"));
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
      // Rotas de Autenticação e Seleção
      { path: "dashboard", element: <DashboardPage /> },
      { path: "faction-selection", element: <FactionSelectionPage /> },
      { path: "email-confirmation", element: <EmailConfirmationPage /> },
      { path: "confirm-email", element: <EmailConfirmationPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },

      // Rotas de Operações
      { path: "contracts", element: <ContractsPage /> },
      { path: "reckoning", element: <ReckoningPage /> },
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

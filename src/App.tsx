import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Rotas públicas que não usam o GlobalLayout */}
              <Route path="/" element={<HomePage />} />
              <Route
                path="/auth/google/callback"
                element={<GoogleCallbackPage />}
              />

              {/* Rotas protegidas que usam o GlobalLayout */}
              <Route
                path="*"
                element={
                  <GlobalLayout>
                    <Routes>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route
                        path="/faction-selection"
                        element={<FactionSelectionPage />}
                      />
                      <Route
                        path="/clan-selection"
                        element={<ClanSelectionPage />}
                      />
                      <Route
                        path="/email-confirmation"
                        element={<EmailConfirmationPage />}
                      />
                      <Route
                        path="/confirm-email"
                        element={<EmailConfirmationPage />}
                      />
                      <Route
                        path="/reset-password"
                        element={<ResetPasswordPage />}
                      />
                      <Route path="/ranking" element={<RankingPage />} />
                      <Route path="/clans" element={<ClansPage />} />
                      <Route path="/clan" element={<ClanPage />} />
                      <Route path="/tasks" element={<TasksPage />} />
                      <Route path="/duels" element={<DuelsPage />} />
                      <Route path="/restaurant" element={<RestaurantPage />} />
                      <Route path="/hospital" element={<HospitalPage />} />
                      <Route path="/prison" element={<PrisonPage />} />
                      <Route path="/territory" element={<TerritoryPage />} />
                      <Route path="/market" element={<MarketPage />} />
                      <Route path="/bank" element={<BankPage />} />
                      <Route path="/business" element={<BusinessPage />} />
                      <Route path="/square" element={<SquarePage />} />
                      <Route path="/gym" element={<GymPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/vip" element={<VipPage />} />
                      <Route path="/store" element={<StorePage />} />
                      <Route path="/overview" element={<OverviewPage />} />
                    </Routes>
                  </GlobalLayout>
                }
              />
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

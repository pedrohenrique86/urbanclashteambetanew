import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import GlobalLayout from "./components/layout/GlobalLayout";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import FactionSelectionPage from "./pages/FactionSelectionPage";
import ClanSelectionPage from "./pages/ClanSelectionPage";
import EmailConfirmationPage from "./pages/EmailConfirmationPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import RankingPage from "./pages/RankingPage";
import ClansPage from "./pages/ClansPage";
import TasksPage from "./pages/TasksPage";
import DuelsPage from "./pages/DuelsPage";
import RestaurantPage from "./pages/RestaurantPage";
import HospitalPage from "./pages/HospitalPage";
import PrisonPage from "./pages/PrisonPage";
import TerritoryPage from "./pages/TerritoryPage";
import MarketPage from "./pages/MarketPage";
import BankPage from "./pages/BankPage";
import BusinessPage from "./pages/BusinessPage";
import SquarePage from "./pages/SquarePage";
import GymPage from "./pages/GymPage";
import ProfilePage from "./pages/ProfilePage";
import VipPage from "./pages/VipPage";
import StorePage from "./pages/StorePage";
import OverviewPage from "./pages/OverviewPage"; // Importa a nova página
import "./index.css";

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <GlobalLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/faction-selection"
                element={<FactionSelectionPage />}
              />
              <Route path="/clan-selection" element={<ClanSelectionPage />} />
              <Route
                path="/email-confirmation"
                element={<EmailConfirmationPage />}
              />
              <Route
                path="/confirm-email"
                element={<EmailConfirmationPage />}
              />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/ranking" element={<RankingPage />} />
              <Route path="/clans" element={<ClansPage />} />
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
              <Route path="/overview" element={<OverviewPage />} />{" "}
              {/* Adiciona a nova rota */}
            </Routes>
          </GlobalLayout>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

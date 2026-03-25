import React from "react";
import { useNavigate } from "react-router-dom";
import { useSWRConfig } from "swr";
import { apiClient } from "../../lib/supabaseClient";

interface HeaderProps {
  themeClasses: {
    bg: string;
    cardBg: string;
    sidebarBg: string;
    text: string;
    textSecondary: string;
    border: string;
    hover: string;
    buttonSecondary: string;
    shadow: string;
  };
  username: string;
}

const Header: React.FC<HeaderProps> = ({ themeClasses, username }) => {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig();

  const handleLogout = async () => {
    await apiClient.logout();
    mutate(() => true, undefined, { revalidate: false });
    // Pequeno delay antes de redirecionar
    await new Promise((resolve) => setTimeout(resolve, 1000));
    navigate("/");
  };

  return (
    <div
      className={`flex justify-between items-center mb-8 ${themeClasses.cardBg} p-4 rounded-lg ${themeClasses.shadow} transition-colors duration-300`}
    >
      <h1 className="text-3xl font-orbitron text-orange-500">DASHBOARD</h1>
      <div className="flex items-center space-x-4">
        <div className={`${themeClasses.buttonSecondary} px-4 py-2 rounded-lg`}>
          <p className={`${themeClasses.text} font-orbitron`}>{username}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-orbitron px-4 py-2 rounded-lg transition-colors hover:scale-105 transform"
        >
          SAIR
        </button>
      </div>
    </div>
  );
};

export default Header;

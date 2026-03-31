import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  PlayIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  SparklesIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

const DashboardSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const navItems = [
    {
      name: "Principal",
      path: "/dashboard",
      icon: <HomeIcon className="w-6 h-6" />,
    },
    { name: "Jogo", path: "/game", icon: <PlayIcon className="w-6 h-6" /> },
    {
      name: "Atividades",
      path: "/tasks",
      icon: <ClipboardDocumentListIcon className="w-6 h-6" />,
    },
    {
      name: "Social",
      path: "/clans",
      icon: <UserGroupIcon className="w-6 h-6" />,
    },
    {
      name: "Premium",
      path: "/vip",
      icon: <SparklesIcon className="w-6 h-6" />,
    },
  ];

  return (
    <aside
      className={`bg-black/50 backdrop-blur-lg border-r border-slate-800/50 flex-shrink-0 flex flex-col items-center py-6 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-48"
      }`}
      style={{
        boxShadow: "inset -5px 0 15px -5px rgba(0,0,0,0.5)",
      }}
    >
      <div className="w-full px-4 mb-6">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex justify-center items-center p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
      </div>
      <nav className="flex flex-col gap-4 w-full">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center py-3 text-slate-400 hover:text-white hover:bg-orange-500/10 transition-all duration-200 border-l-4 ${
                isActive
                  ? "border-orange-500 text-white bg-orange-500/10"
                  : "border-transparent"
              } ${isCollapsed ? "justify-center" : "justify-start pl-8"}`}
              title={item.name}
            >
              {item.icon}
              <span
                className={`ml-4 font-semibold whitespace-nowrap transition-opacity duration-200 ${
                  isCollapsed ? "opacity-0 hidden" : "opacity-100"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default DashboardSidebar;

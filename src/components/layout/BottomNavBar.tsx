import React, { useState, useRef, useEffect } from "react";
import { menuCategories } from "../constants/menuItems";

interface BottomNavBarProps {
  navigateTo: (path: string) => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ navigateTo }) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = (category: string) => {
    setOpenMenu(openMenu === category ? null : category);
  };

  const handleNavigate = (path: string) => {
    navigateTo(path);
    setOpenMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={menuRef}
      className="fixed bottom-0 left-0 right-0 h-24 bg-gray-900/80 backdrop-blur-md border-t-2 border-t-amber-800/50 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-50 flex justify-center items-center"
    >
      <div className="flex space-x-8">
        {Object.entries(menuCategories).map(([key, category]) => (
          <div key={key} className="relative">
            <button
              onClick={() => toggleMenu(key)}
              className="flex flex-col items-center justify-center text-white w-20 h-20 rounded-full transition-all duration-300 hover:bg-amber-500/20 focus:outline-none"
            >
              <span className="text-4xl">{category.icon}</span>
              <span className="text-xs font-bold tracking-wider uppercase">
                {category.title}
              </span>
            </button>
            {openMenu === key && (
              <div className="absolute bottom-full mb-4 w-56 bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-lg border border-gray-700/50 overflow-hidden">
                <ul className="p-2">
                  {category.items.map((item) => (
                    <li key={item.path}>
                      <button
                        onClick={() => handleNavigate(item.path)}
                        className="w-full text-left px-4 py-3 text-white/90 flex items-center space-x-3 hover:bg-amber-500/20 rounded-md transition-colors duration-200"
                      >
                        <span className="text-2xl">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BottomNavBar;

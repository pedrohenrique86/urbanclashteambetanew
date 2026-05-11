import React from 'react';

interface MenuItem {
  icon: string;
  label: string;
  path: string;
}

interface SidebarMenuProps {
  title: string;
  icon: string;
  items: MenuItem[];
  isOpen: boolean;
  isCompact: boolean;
  themeClasses: {
    text: string;
    textSecondary: string;
    buttonSecondary: string;
    hover: string;
  };
  onToggle: () => void;
  onNavigate: (path: string) => void;
  customStyles?: string;
  activeItem?: string;
  onItemClick?: () => void;
}

const SidebarMenu: React.FC<SidebarMenuProps> = ({
  title,
  icon,
  items,
  isOpen,
  isCompact,
  themeClasses,
  onToggle,
  onNavigate,
  customStyles = '',
  activeItem,
  onItemClick
}) => {
  
  const handleItemClick = (path: string) => {
    // Chama onItemClick primeiro para manter o menu aberto
    if (onItemClick) {
      onItemClick();
    }
    onNavigate(path);
  };
  if (isCompact) {
    return (
      <div className="space-y-1">
        {/* Botão principal do menu no modo compacto */}
        <button
          className={`w-full ${themeClasses.text} hover:${themeClasses.textSecondary} font-orbitron py-2 px-2 rounded transition-colors text-center text-sm ${
            items.some(item => activeItem === item.path) ? 'bg-orange-500 bg-opacity-30' : ''
          }`}
          onClick={onToggle}
          title={title}
        >
          {icon}
        </button>
        {/* Itens do submenu sempre visíveis no modo compacto */}
        <div className="space-y-1 ml-1">
          {items.map((item, index) => (
            <button
              key={index}
              className={`w-full ${themeClasses.text} hover:${themeClasses.textSecondary} font-orbitron py-1 px-2 rounded transition-colors text-center text-xs ${
                activeItem === item.path ? 'bg-orange-500 bg-opacity-30' : ''
              }`}
              onClick={() => handleItemClick(item.path)}
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        className={`w-full ${customStyles || `${themeClasses.buttonSecondary} ${themeClasses.text}`} font-orbitron py-3 px-4 rounded-lg transition-all text-left flex items-center justify-between hover:bg-opacity-80 hover:scale-105 ${customStyles ? '' : 'shadow-md hover:shadow-lg'} ${
          isOpen ? 'bg-blue-600 bg-opacity-20 border-l-4 border-blue-500' : ''
        }`}
        onClick={onToggle}
      >
        <span>{icon} {title}</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && (
        <ul className="mt-2 space-y-1 ml-4">
          {items.map((item, index) => (
            <li key={index}>
              <button
                className={`w-full ${customStyles ? 'text-yellow-400 hover:text-yellow-300' : `${themeClasses.text} hover:${themeClasses.textSecondary}`} font-orbitron py-2 px-3 rounded transition-all text-left text-sm hover:bg-gray-700 hover:bg-opacity-30 hover:translate-x-1 ${
                  activeItem === item.path ? 'bg-orange-500 bg-opacity-20 border-l-2 border-orange-500' : ''
                }`}
                onClick={() => handleItemClick(item.path)}
              >
                {item.icon} {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default SidebarMenu;
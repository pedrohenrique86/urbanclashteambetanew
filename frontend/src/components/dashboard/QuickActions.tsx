import React from 'react';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  testAddXP?: (amount: number) => void;
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
}

const QuickActions: React.FC<QuickActionsProps> = ({ testAddXP, themeClasses }) => {
  const navigate = useNavigate();

  const navigateTo = (path: string) => {
    navigate(path);
  };

  return (
    <div className="mb-8">
      {/* Quick Actions Section */}
      <div className="mb-6">
        <h2 className={`${themeClasses.text} text-xl font-bold mb-4`}>Ações Rápidas</h2>
        <div className="flex flex-wrap gap-2">
          {testAddXP && (
            <>
              <button
                onClick={() => testAddXP(50)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                +50 XP
              </button>
              <button
                onClick={() => testAddXP(100)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                +100 XP
              </button>
              <button
                onClick={() => testAddXP(150)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                +150 XP
              </button>
              <button
                onClick={() => testAddXP(200)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                +200 XP
              </button>
              <button
                onClick={() => testAddXP(500)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                +500 XP
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigateTo("/territory")}
          className={`${themeClasses.cardBg} ${themeClasses.text} ${themeClasses.hover} p-4 rounded-lg flex flex-col items-center justify-center transition-transform transform hover:scale-105 ${themeClasses.shadow}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-orbitron">TERRITÓRIO</span>
        </button>

        <button
          onClick={() => navigateTo("/duels")}
          className={`${themeClasses.cardBg} ${themeClasses.text} ${themeClasses.hover} p-4 rounded-lg flex flex-col items-center justify-center transition-transform transform hover:scale-105 ${themeClasses.shadow}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-orbitron">DUELOS</span>
        </button>

        <button
          onClick={() => navigateTo("/clan")}
          className={`${themeClasses.cardBg} ${themeClasses.text} ${themeClasses.hover} p-4 rounded-lg flex flex-col items-center justify-center transition-transform transform hover:scale-105 ${themeClasses.shadow}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="font-orbitron">CLÃ</span>
        </button>

        <button
          onClick={() => navigateTo("/market")}
          className={`${themeClasses.cardBg} ${themeClasses.text} ${themeClasses.hover} p-4 rounded-lg flex flex-col items-center justify-center transition-transform transform hover:scale-105 ${themeClasses.shadow}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="font-orbitron">MERCADO</span>
        </button>

        <button
          onClick={() => navigateTo("/hospital")}
          className={`${themeClasses.cardBg} ${themeClasses.text} ${themeClasses.hover} p-4 rounded-lg flex flex-col items-center justify-center transition-transform transform hover:scale-105 ${themeClasses.shadow}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="font-orbitron">HOSPITAL</span>
        </button>

        <button
          onClick={() => navigateTo("/bank")}
          className={`${themeClasses.cardBg} ${themeClasses.text} ${themeClasses.hover} p-4 rounded-lg flex flex-col items-center justify-center transition-transform transform hover:scale-105 ${themeClasses.shadow}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
          </svg>
          <span className="font-orbitron">BANCO</span>
        </button>
      </div>
    </div>
  );
};

export default QuickActions;
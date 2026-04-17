import React from 'react';
import { Activity } from '../../types';

interface ActivitySectionsProps {
  recentActivities: Activity[];
  clanActivities: Activity[];
  themeClasses: {
    text: string;
    cardBg: string;
    shadow: string;
    hover: string;
    textSecondary: string;
  };
  isDarkTheme: boolean;
}

export function ActivitySections({ 
  recentActivities, 
  clanActivities, 
  themeClasses, 
  isDarkTheme 
}: ActivitySectionsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Activities */}
      <div>
        <h2 className={`text-2xl font-orbitron mb-6 ${themeClasses.text}`}>Atividades Recentes</h2>
        <div className={`${themeClasses.cardBg} rounded-lg ${themeClasses.shadow} overflow-hidden transition-colors duration-300`}>
          <ul className={`divide-y ${isDarkTheme ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {recentActivities.map((activity) => (
              <li key={activity.id} className={`p-4 ${themeClasses.hover} transition-colors duration-200`}>
                <div className="flex justify-between items-center">
                  <p className={`${themeClasses.text} font-medium`}>{activity.activity}</p>
                  <p className={`${themeClasses.textSecondary} text-sm`}>{activity.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Clan Activities */}
      <div>
        <h2 className={`text-2xl font-orbitron mb-6 ${themeClasses.text}`}>Atividades da Divisão</h2>
        <div className={`${themeClasses.cardBg} rounded-lg ${themeClasses.shadow} overflow-hidden transition-colors duration-300`}>
          <ul className={`divide-y ${isDarkTheme ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {clanActivities.map((activity) => (
              <li key={activity.id} className={`p-4 ${themeClasses.hover} transition-colors duration-200`}>
                <div className="flex justify-between items-center">
                  <p className={`${themeClasses.text} font-medium`}>{activity.activity}</p>
                  <p className={`${themeClasses.textSecondary} text-sm`}>{activity.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
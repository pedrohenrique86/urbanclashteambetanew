import React from 'react';

interface Activity {
  id: string;
  title: string;
  description: string;
  time: string;
  type: string;
}

interface ActivitySectionProps {
  recentActivities: Activity[];
  clanActivities: Activity[];
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

const ActivitySection: React.FC<ActivitySectionProps> = ({ recentActivities, clanActivities, themeClasses }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Recent Activities */}
      <div className={`${themeClasses.cardBg} p-4 rounded-lg ${themeClasses.shadow} transition-colors duration-300`}>
        <h2 className={`${themeClasses.text} text-xl font-bold mb-4`}>Atividades Recentes</h2>
        {recentActivities.length > 0 ? (
          <ul className="space-y-3">
            {recentActivities.map((activity) => (
              <li 
                key={activity.id} 
                className={`${themeClasses.buttonSecondary} p-3 rounded-lg flex justify-between items-start`}
              >
                <div>
                  <p className={`${themeClasses.text} font-bold`}>{activity.title}</p>
                  <p className={`${themeClasses.textSecondary} text-sm`}>{activity.description}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`${themeClasses.textSecondary} text-xs`}>{activity.time}</span>
                  <span className={`text-xs mt-1 ${activity.type === 'win' ? 'text-green-500' : activity.type === 'loss' ? 'text-red-500' : 'text-blue-500'}`}>
                    {activity.type === 'win' ? 'Vitória' : activity.type === 'loss' ? 'Derrota' : 'Evento'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className={`${themeClasses.textSecondary} text-center`}>Nenhuma atividade recente</p>
            <p className={`${themeClasses.textSecondary} text-center text-sm mt-1`}>Suas atividades aparecerão aqui</p>
          </div>
        )}
      </div>

      {/* Clan Activities */}
      <div className={`${themeClasses.cardBg} p-4 rounded-lg ${themeClasses.shadow} transition-colors duration-300`}>
        <h2 className={`${themeClasses.text} text-xl font-bold mb-4`}>Atividades do Clã</h2>
        {clanActivities.length > 0 ? (
          <ul className="space-y-3">
            {clanActivities.map((activity) => (
              <li 
                key={activity.id} 
                className={`${themeClasses.buttonSecondary} p-3 rounded-lg flex justify-between items-start`}
              >
                <div>
                  <p className={`${themeClasses.text} font-bold`}>{activity.title}</p>
                  <p className={`${themeClasses.textSecondary} text-sm`}>{activity.description}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`${themeClasses.textSecondary} text-xs`}>{activity.time}</span>
                  <span className={`text-xs mt-1 ${activity.type === 'win' ? 'text-green-500' : activity.type === 'loss' ? 'text-red-500' : 'text-purple-500'}`}>
                    {activity.type === 'win' ? 'Vitória' : activity.type === 'loss' ? 'Derrota' : 'Clã'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className={`${themeClasses.textSecondary} text-center`}>Nenhuma atividade do clã</p>
            <p className={`${themeClasses.textSecondary} text-center text-sm mt-1`}>Junte-se a um clã para ver atividades</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivitySection;
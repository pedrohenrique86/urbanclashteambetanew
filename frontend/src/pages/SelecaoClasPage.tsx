import React, { useState } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useClans } from '../hooks/useClans';
import { apiClient } from '../lib/supabaseClient';
import { motion } from 'framer-motion';

const FactionColors = {
  guardas: {
    bg: 'bg-blue-900/50',
    border: 'border-blue-400/50',
    button: 'bg-blue-600 hover:bg-blue-500',
    glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]',
    gradient: 'radial-gradient(ellipse at center, rgba(29, 78, 216, 0.3) 0%, rgba(0,0,0,0) 70%)',
  },
  gangsters: {
    bg: 'bg-orange-900/50',
    border: 'border-orange-400/50',
    button: 'bg-orange-600 hover:bg-orange-500',
    glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.5)]',
    gradient: 'radial-gradient(ellipse at center, rgba(234, 88, 12, 0.3) 0%, rgba(0,0,0,0) 70%)',
  },
};

const SelecaoClasPage: React.FC = () => {
  const { userProfile, refreshProfile, setUserProfile } = useUserProfile();
  const { clans, isLoading: isLoadingClans, error: errorClans } = useClans(userProfile?.faction);
  const [joiningClanId, setJoiningClanId] = useState<number | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoinClan = async (clanId: number) => {
    if (!userProfile) return;
    setJoiningClanId(clanId);
    setJoinError(null);
    try {
      await apiClient.joinClan(String(clanId));
      // Atualização otimista: atualiza o estado local sem recarregar tudo.
      setUserProfile({ ...userProfile, clan_id: String(clanId) });
    } catch (err) {
      console.error("Erro ao entrar no clã:", err);
      setJoinError("Não foi possível entrar no clã. Tente novamente.");
      setJoiningClanId(null);
    }
  };

  const faction = userProfile?.faction || 'gangsters'; // Default para evitar erros
  const colors = FactionColors[faction];

  if (isLoadingClans) {
    return <div className="flex items-center justify-center h-screen bg-black text-white">Carregando clãs...</div>;
  }

  return (
    <div 
      className="min-h-screen w-full p-4 text-white transition-all duration-500"
      style={{ backgroundImage: colors.gradient }}
    >
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 md:mb-12"
      >
        <h1 className="text-3xl md:text-4xl font-bold font-orbitron">ESCOLHA SEU CLÃ</h1>
        <p className="text-gray-300 mt-2">
          Junte-se a um clã para lutar ao lado da sua facção: <span className={`font-bold ${faction === 'guardas' ? 'text-blue-400' : 'text-orange-400'}`}>{faction}</span>
        </p>
      </motion.div>

      {errorClans && <p className="text-red-500 bg-red-900/50 p-3 rounded-md mb-4 text-center">{errorClans}</p>}
      {joinError && <p className="text-red-500 bg-red-900/50 p-3 rounded-md mb-4 text-center">{joinError}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {clans && clans.map((clan, index) => {
          const isJoining = joiningClanId === clan.id;
          const isFull = clan.member_count >= clan.max_members;
          const statusText = isFull ? 'CHEIO' : 'RECRUTANDO';
          const statusColor = isFull ? 'bg-red-500/80' : 'bg-green-500/80';

          return (
            <motion.div
              key={clan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative flex flex-col rounded-xl border ${colors.border} ${colors.bg} backdrop-blur-sm shadow-lg transition-all duration-300 ${colors.glow}`}
            >
              <div className={`absolute top-0 right-4 -mt-3 px-3 py-1 text-xs font-bold tracking-wider text-white rounded-full shadow-md ${statusColor}`}>
                {statusText}
              </div>

              <div className="p-6 flex-grow flex flex-col">
                <h2 className="text-2xl font-bold font-orbitron text-white">{clan.name}</h2>
                <p className="text-gray-400 text-sm mt-1 mb-4">
                  Membros: {clan.member_count} / {clan.max_members}
                </p>
                <p className="text-gray-300 text-sm flex-grow mb-6">{clan.description}</p>

                <button 
                  type="button"
                  onClick={() => handleJoinClan(clan.id)}
                  disabled={isJoining || joiningClanId !== null || isFull}
                  className={`w-full mt-auto font-bold py-2 px-4 rounded-lg transition-all duration-300 text-white ${isFull ? 'bg-gray-600 cursor-not-allowed' : colors.button} disabled:opacity-50 disabled:cursor-wait`}
                >
                  {isJoining ? 'ENTRANDO...' : (isFull ? 'CLÃ CHEIO' : 'JUNTAR-SE')}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SelecaoClasPage;
import React, { useState } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useClans } from '../hooks/useClans';
import { apiClient } from '../lib/supabaseClient';

const SelecaoClasPage: React.FC = () => {
  const { userProfile, refreshProfile } = useUserProfile();
  const { clans, isLoading: isLoadingClans, error: errorClans } = useClans(userProfile?.faction);
  const [joiningClanId, setJoiningClanId] = useState<number | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoinClan = async (clanId: number) => {
    setJoiningClanId(clanId);
    setJoinError(null);
    try {
      await apiClient.joinClan(String(clanId));
      // Após se juntar, atualiza o perfil do usuário.
      // O QGPage irá redirecionar automaticamente para a ClanPage.
      await refreshProfile();
    } catch (err) {
      console.error("Erro ao entrar no clã:", err);
      setJoinError("Não foi possível entrar no clã. Tente novamente.");
      setJoiningClanId(null); // Reseta o estado de carregamento em caso de erro
    }
    // Não precisamos mais resetar joiningClanId aqui, pois a página irá mudar.
  };

  if (isLoadingClans) {
    return <div>Carregando clãs...</div>;
  }

  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold">Escolha seu Clã</h1>
      <p className="mb-4">
        Você ainda não faz parte de um clã. Escolha um para se juntar à sua facção: {userProfile?.faction}
      </p>
      {errorClans && <p className="text-red-500 bg-red-900/50 p-3 rounded-md mb-4">{errorClans}</p>}
      {joinError && <p className="text-red-500 bg-red-900/50 p-3 rounded-md mb-4">{joinError}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clans && clans.map((clan: any) => {
          const isJoining = joiningClanId === clan.id;
          return (
            <div key={clan.id} className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-semibold">{clan.name}</h2>
              <p>{clan.description}</p>
              <button 
                onClick={() => handleJoinClan(clan.id)}
                disabled={isJoining || joiningClanId !== null}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                {isJoining ? 'Entrando...' : 'Juntar-se'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SelecaoClasPage;
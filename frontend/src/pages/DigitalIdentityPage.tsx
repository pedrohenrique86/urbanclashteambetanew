import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserProfileContext } from "../contexts/UserProfileContext";
import { apiClient } from "../lib/supabaseClient";
import DigitalIdentity from "../components/DigitalIdentity";
import { useTheme } from "../contexts/ThemeContext";

export default function DigitalIdentityPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useUserProfileContext();
  const { themeClasses } = useTheme();

  const [playerData, setPlayerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      // Se não houver ID na URL, tentamos usar o do usuário logado
      const targetId = id || userProfile?.user_id || userProfile?.id;

      if (!targetId) {
        setLoading(false);
        setError("Identidade não encontrada.");
        return;
      }

      // ESTRATÉGIA DE CACHE: Se o perfil for o do usuário logado, usamos o contexto (Zero requisição)
      if (targetId === userProfile?.user_id || targetId === userProfile?.id) {
        setPlayerData({
          ...userProfile,
          id: userProfile.user_id || userProfile.id, // Normalização de ID
        });
        setLoading(false);
        return;
      }

      // BUSCA OTIMIZADA: Caso contrário, buscamos no Redis via Backend (Única requisição)
      try {
        setLoading(true);
        const data = await apiClient.getUser(targetId);
        if (data?.user) {
          setPlayerData(data.user);
        } else {
          setError("Jogador não encontrado na rede.");
        }
      } catch (err) {
        setError("Erro ao conectar com a Digital Link.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [id, userProfile]);

  if (loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${themeClasses.bg}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className={`max-w-7xl mx-auto px-4 py-12 text-center ${themeClasses.bg}`}>
        <h2 className="text-2xl font-bold text-red-500 mb-4">Falha na Sincronização</h2>
        <p className="text-gray-400 mb-6">{error || "Não foi possível carregar o perfil."}</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6`}>
      <DigitalIdentity 
        player={playerData} 
        onClose={id ? () => navigate(-1) : undefined} 
      />
    </div>
  );
}
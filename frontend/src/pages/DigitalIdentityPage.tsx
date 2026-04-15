import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserProfileContext } from "../contexts/UserProfileContext";
import { apiClient } from "../lib/supabaseClient";
import DigitalIdentity from "../components/DigitalIdentity";
import { useTheme } from "../contexts/ThemeContext";

type DigitalIdentityProps = React.ComponentProps<typeof DigitalIdentity>;
type IdentityPlayer = DigitalIdentityProps["player"];
type IdentityEditData = DigitalIdentityProps["editData"];
type IdentityEditChangeData = Parameters<
  NonNullable<DigitalIdentityProps["onEditChange"]>
>[0];

export default function DigitalIdentityPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useUserProfileContext();
  const { themeClasses } = useTheme();

  const [playerData, setPlayerData] = useState<IdentityPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de edição
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<IdentityEditData>(undefined);
  const [saving, setSaving] = useState(false);

  // ID-alvo estável: se veio pela rota, usa ele; senão usa o perfil logado
  const targetId = useMemo(() => {
    return id || userProfile?.user_id || userProfile?.id || null;
  }, [id, userProfile?.user_id, userProfile?.id]);

  // Verifica se o perfil visualizado pertence ao usuário logado
  const isOwnProfile = useMemo(() => {
    if (!userProfile || !targetId) return false;
    return targetId === userProfile.user_id || targetId === userProfile.id;
  }, [targetId, userProfile]);

  const normalizePlayer = useCallback(
    (raw: any, fallbackId: string): IdentityPlayer | null => {
      if (!raw) return null;

      return {
        ...raw,
        id: raw.user_id || raw.id || fallbackId,
      } as IdentityPlayer;
    },
    []
  );

  const fetchProfile = useCallback(
    async (currentTargetId: string): Promise<IdentityPlayer> => {
      const data = await apiClient.getUser(currentTargetId);

      if (!data?.user) {
        throw new Error("Jogador não encontrado na rede.");
      }

      const normalized = normalizePlayer(data.user, currentTargetId);

      if (!normalized) {
        throw new Error("Jogador não encontrado na rede.");
      }

      return normalized;
    },
    [normalizePlayer]
  );

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!targetId) {
        setPlayerData(null);
        setError("Identidade não encontrada.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fonte oficial unificada: sempre backend
        const freshPlayer = await fetchProfile(targetId);

        if (cancelled) return;
        setPlayerData(freshPlayer);
      } catch (err: any) {
        console.error("Erro ao carregar perfil:", err);

        if (cancelled) return;
        setPlayerData(null);
        setError(
          err?.message === "Jogador não encontrado na rede."
            ? "Jogador não encontrado na rede."
            : "Erro ao conectar com a Digital Link."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [targetId, fetchProfile]);

  const handleEditChange = useCallback((data: IdentityEditChangeData) => {
    setEditData(data);
  }, []);

  const handleToggleEdit = () => {
    if (!isEditing) {
      setEditData({
        bio: playerData?.bio ?? "",
        avatar_url: playerData?.avatar_url ?? "",
        birth_date: playerData?.birth_date ?? "",
      });
    } else {
      setEditData(undefined);
    }

    setIsEditing((prev) => !prev);
  };

  const handleSave = async () => {
    try {
      if (!targetId || !editData) {
        throw new Error("Dados de edição inválidos.");
      }

      setSaving(true);
      setError(null);

      // Persiste no backend
      await apiClient.updateUserProfile(targetId, editData);

      // Refetch da fonte oficial após salvar
      const freshPlayer = await fetchProfile(targetId);

      setPlayerData(freshPlayer);

      // Sincroniza contexto global apenas se for o próprio perfil
      if (isOwnProfile) {
        setUserProfile((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...freshPlayer,
          };
        });
      }

      setIsEditing(false);
      setEditData(undefined);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      alert("Falha ao salvar. Verifique sua conexão.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`min-h-[400px] flex flex-col items-center justify-center ${themeClasses.bg} text-white`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
        <p className="font-orbitron text-[10px] animate-pulse">
          SINCRO DE DADOS REDIS...
        </p>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className={`max-w-7xl mx-auto px-4 py-12 text-center ${themeClasses.bg}`}>
        <h2 className="text-2xl font-bold text-red-500 mb-4">
          Falha na Sincronização
        </h2>
        <p className="text-gray-400 mb-6">
          {error || "Não foi possível carregar o perfil."}
        </p>
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {saving && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3"></div>
            <p className="font-orbitron text-[10px] text-orange-500 tracking-widest">
              ATUALIZANDO IDENTIDADE...
            </p>
          </div>
        </div>
      )}

      <DigitalIdentity
        player={playerData}
        onClose={id ? () => navigate(-1) : undefined}
        isOwnProfile={isOwnProfile}
        isEditing={isEditing}
        editData={editData}
        onEditChange={handleEditChange}
        onToggleEdit={handleToggleEdit}
        onSave={handleSave}
      />
    </div>
  );
}
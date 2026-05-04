import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserProfileContext } from "../contexts/UserProfileContext";
import { apiClient } from "../lib/supabaseClient";
import DigitalIdentity from "../components/DigitalIdentity";
import { useTheme } from "../contexts/ThemeContext";
import { HUDCache } from "../hooks/useHUDCache";

type DigitalIdentityProps = React.ComponentProps<typeof DigitalIdentity>;
type IdentityPlayer = DigitalIdentityProps["player"];
type IdentityEditData = DigitalIdentityProps["editData"];
type IdentityEditChangeData = Parameters<
  NonNullable<DigitalIdentityProps["onEditChange"]>
>[0];

interface DigitalIdentityPageProps {
  forcedId?: string;
  onClose?: () => void;
  isCompact?: boolean;
}

export default function DigitalIdentityPage({
  forcedId,
  onClose: forcedOnClose,
  isCompact = false,
}: DigitalIdentityPageProps = {}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useUserProfileContext();
  const { themeClasses } = useTheme();

  const [playerData, setPlayerData] = useState<IdentityPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<IdentityEditData>(undefined);
  const [saving, setSaving] = useState(false);

  const targetId = useMemo(() => {
    return forcedId || id || userProfile?.user_id || userProfile?.id || null;
  }, [forcedId, id, userProfile?.user_id, userProfile?.id]);

  const isOwnProfile = useMemo(() => {
    if (!userProfile || !targetId) return false;
    return targetId === userProfile.user_id || targetId === userProfile.id;
  }, [targetId, userProfile]);

  const fetchProfile = useCallback(async (targetId: string) => {
    const data = await apiClient.getUser(targetId);

    if (!data?.user) {
      throw new Error("Jogador não encontrado na rede.");
    }

    return {
      ...data.user,
      id: data.user.user_id || data.user.id || targetId,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!targetId) {
        setError("Identidade não encontrada.");
        setLoading(false);
        return;
      }

      // 🔥 1. CACHE
      const cached = HUDCache.getProfile<IdentityPlayer>(targetId);
      if (cached) {
        setPlayerData(cached);
        setLoading(false);
        return;
      }

      // 🔥 2. REQUEST EM ANDAMENTO
      const pending = HUDCache.getPendingProfile<IdentityPlayer>(targetId);
      if (pending) {
        try {
          const data = await pending;
          if (!cancelled) {
            setPlayerData(data);
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setError("Erro ao carregar perfil.");
            setLoading(false);
          }
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const request = fetchProfile(targetId);

        HUDCache.setPendingProfile(targetId, request);

        const fresh = await request;

        if (cancelled) return;

        HUDCache.setProfile(targetId, fresh);
        setPlayerData(fresh);
      } catch (err: any) {
        if (cancelled) return;

        HUDCache.invalidateProfile(targetId);

        setError(
          err?.message === "Jogador não encontrado na rede."
            ? "Jogador não encontrado na rede."
            : "Erro ao conectar com a Digital Link."
        );
      } finally {
        HUDCache.clearPendingProfile(targetId);

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

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
      if (!targetId || !editData) return;

      setSaving(true);
      setError(null);

      await apiClient.updateUserProfile(targetId, editData);

      const fresh = await fetchProfile(targetId);

      // 🔥 sincroniza cache
      HUDCache.setProfile(targetId, fresh);

      setPlayerData(fresh);

      if (isOwnProfile) {
        setUserProfile((prev) => {
          if (!prev) return prev;
          return { ...prev, ...fresh };
        });
      }

      setIsEditing(false);
      setEditData(undefined);
    } catch (err) {
      setError("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose =
    forcedOnClose || (id ? () => navigate(-1) : undefined);

  const mergedPlayer = useMemo(() => {
    if (!isOwnProfile || !userProfile || !playerData) return playerData;
    // SÊNIOR: Sincronização granular para evitar conflitos de tipos (ex: faction object vs string)
    // Garante que o DigitalIdentity receba exatamente o que espera na interface PublicPlayer
    return {
      ...playerData,
      level: userProfile.level ?? playerData.level,
      victories: userProfile.victories ?? playerData.victories,
      defeats: userProfile.defeats ?? playerData.defeats,
      winning_streak: userProfile.winning_streak ?? playerData.winning_streak,
      status: userProfile.status || playerData.status,
      status_ends_at: userProfile.status_ends_at || playerData.status_ends_at,
      avatar_url: userProfile.avatar_url || playerData.avatar_url,
      bio: userProfile.bio || playerData.bio,
    } as IdentityPlayer;
  }, [isOwnProfile, userProfile, playerData]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500" />
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="text-center text-red-400">
        {error || "Erro ao carregar perfil"}
      </div>
    );
  }

  return (
    <>
      {saving && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-orange-500" />
        </div>
      )}
      
      {/* Sincronização em tempo real do status se for o perfil do próprio usuário */}
      <DigitalIdentity
        player={mergedPlayer!}
        onClose={handleClose}
        isOwnProfile={isOwnProfile}
        isEditing={isEditing}
        editData={editData}
        onEditChange={handleEditChange}
        onToggleEdit={handleToggleEdit}
        onSave={handleSave}
        isCompact={isCompact}
      />
    </>
  );
}
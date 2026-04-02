import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../lib/supabaseClient";
import { UserProfile } from "../types";
import { calculateLevel } from "../utils/leveling";

// Função global para invalidar cache do perfil
let invalidateProfileCache: (() => void) | null = null;

export const invalidateUserProfile = () => {
  if (invalidateProfileCache) {
    invalidateProfileCache();
  }
};

export const useUserProfile = (shouldRedirect: boolean = true) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await apiClient.logout();
    setUserProfile(null);
    navigate("/");
  };

  // Registrar função de invalidação
  useEffect(() => {
    invalidateProfileCache = () => {
      // setUserProfile(null); // NÃO limpe o perfil para evitar a "tremida"
      setLoading(true);
      setRefreshTrigger((prev) => prev + 1);
    };

    return () => {
      invalidateProfileCache = null;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkUserAndFaction = async () => {
      // Se não houver token, o usuário está definitivamente deslogado.
      // Paramos aqui para evitar erros 401 desnecessários no console em páginas públicas.
      if (!apiClient.getToken()) {
        if (isMounted) setLoading(false);
        return;
      }

      // A verificação de autenticação é feita independentemente do redirecionamento
      // para que a aplicação sempre possua o estado do usuário.

      try {
        const userResponse = await apiClient.getCurrentUser();

        if (!userResponse.data.user) {
          if (isMounted && shouldRedirect) navigate("/");
          if (isMounted) setLoading(false);
          return;
        }

        const user = userResponse.data.user;
        const profileData = await apiClient.getUserProfile();

        if (isMounted) {
          const currentPath = location.pathname;

          // Processa e define o perfil do usuário se os dados existirem
          if (profileData) {
            const processedProfile = await processExistingProfile(
              profileData,
              user,
            );
            setUserProfile(processedProfile);
          }

          // Lógica de Redirecionamento Centralizada
          if (shouldRedirect) {
            if (profileData?.faction && profileData.clan_id) {
              // 1. Usuário totalmente configurado
              if (
                currentPath === "/faction-selection" ||
                currentPath === "/clan-selection"
              ) {
                navigate("/dashboard");
              }
            } else if (profileData?.faction) {
              // 2. Tem facção, mas não tem clã
              if (currentPath !== "/clan-selection") {
                navigate("/clan-selection");
              }
            } else {
              // 3. Não tem facção (novo usuário ou perfil incompleto)
              if (currentPath !== "/faction-selection") {
                navigate("/faction-selection");
              }
            }
          }
        }
      } catch (error) {
        const currentPath = location.pathname;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Se o erro for 404 (perfil não encontrado), é um novo usuário.
        // Redireciona para a seleção de facção.
        if (
          errorMessage.includes("404") ||
          errorMessage.includes("Perfil não encontrado")
        ) {
          if (shouldRedirect && currentPath !== "/faction-selection") {
            navigate("/faction-selection");
          }
        } else {
          // Para outros erros, apenas loga no console para não quebrar a aplicação.
          console.error("Erro ao verificar perfil do usuário:", error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkUserAndFaction();

    return () => {
      isMounted = false;
    };
  }, [navigate, shouldRedirect, refreshTrigger, location.pathname]);

  const processExistingProfile = async (profileData: any, user: any) => {
    // Usar sempre o nível vindo do banco; não sobrescrever automaticamente
    // Calcular informações de XP apenas para exibição local quando necessário
    const levelInfo = calculateLevel(profileData.current_xp || 0);

    // Usar os pontos de ação diretamente do banco de dados sem resetar
    const actionPoints = profileData.action_points;

    const userProfileData = {
      id: profileData.id ? profileData.id.toString() : profileData.user_id,
      user_id: profileData.user_id,
      email: user.email, // Adiciona o email do usuário de autenticação
      is_admin: profileData.is_admin, // Adiciona a flag de administrador
      faction: profileData.faction,
      clan_id: profileData.clan_id,
      username: (profileData.username || "Usuário").substring(0, 10), // username vem da tabela users via API, truncado para 10 caracteres
      created_at: profileData.created_at,
      current_xp: profileData.current_xp,
      level: Number(profileData.level ?? levelInfo.level),
      xp_required: Number(profileData.xp_required ?? levelInfo.xpForNextLevel),
      resources: profileData.money,
      money: profileData.money, // Adicionar campo money diretamente
      wins: profileData.victories,
      losses: profileData.defeats,
      victories: profileData.victories, // Adicionar campo victories diretamente
      defeats: profileData.defeats, // Adicionar campo defeats diretamente
      streak: profileData.winning_streak,
      winning_streak: profileData.winning_streak, // Adicionar campo winning_streak diretamente
      critical_damage: profileData.critical_damage, // Adicionar campo critical_damage
      action_points: actionPoints,
      attack: profileData.attack,
      defense: profileData.defense,
      focus: profileData.focus,
      energy: profileData.energy,
      max_energy: profileData.max_energy,
      intimidation: profileData.intimidation,
      discipline: profileData.discipline,
    };

    return userProfileData;
  };

  const createNewProfile = async (user: any) => {
    const newProfile = {
      user_id: user.id,
      faction: user.user_metadata.faction,
      // Removido username - vem da tabela users, não precisa ser enviado
      // Removido todos os atributos - deixar o backend calcular os valores corretos
    };

    try {
      const profileData = await apiClient.createUserProfile(newProfile);

      if (!profileData) {
        return null;
      }

      const levelInfo = calculateLevel(profileData.current_xp || 0);

      const userProfileData = {
        id: profileData.id ? profileData.id.toString() : profileData.user_id,
        user_id: profileData.user_id,
        email: user.email, // Adiciona o email do usuário de autenticação
        is_admin: profileData.is_admin, // Adiciona a flag de administrador
        faction: profileData.faction,
        clan_id: profileData.clan_id,
        username: (profileData.username || "Usuário").substring(0, 10), // username vem da tabela users via API, truncado para 10 caracteres
        created_at: profileData.created_at,
        current_xp: profileData.current_xp,
        level: levelInfo.level,
        resources: profileData.money,
        money: profileData.money, // Adicionar campo money diretamente
        wins: profileData.victories,
        losses: profileData.defeats,
        victories: profileData.victories, // Adicionar campo victories diretamente
        defeats: profileData.defeats, // Adicionar campo defeats diretamente
        streak: profileData.victory_streak,
        winning_streak: profileData.winning_streak, // Adicionar campo winning_streak diretamente
        critical_damage: profileData.critical_damage, // Adicionar campo critical_damage
        action_points: profileData.action_points,
        attack: profileData.attack,
        defense: profileData.defense,
        focus: profileData.focus,
        energy: profileData.energy,
        max_energy: profileData.max_energy,
        intimidation: profileData.intimidation,
        discipline: profileData.discipline,
      };

      return userProfileData;
    } catch (error) {
      return null;
    }
  };

  return { userProfile, loading, setUserProfile, handleLogout };
};

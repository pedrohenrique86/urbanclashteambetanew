import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/supabaseClient';
import { UserProfile } from '../types';
import { applyFactionDefaults, isMoreThan24HoursAgo } from '../utils/faction';
import { calculateLevel } from '../utils/leveling';

// Função global para invalidar cache do perfil
let invalidateProfileCache: (() => void) | null = null;

export const invalidateUserProfile = () => {
  if (invalidateProfileCache) {
    console.log('🔄 Invalidando cache do perfil do usuário...');
    invalidateProfileCache();
  }
};

export const useUserProfile = (shouldRedirect: boolean = true) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  
  // Registrar função de invalidação
  useEffect(() => {
    invalidateProfileCache = () => {
      setUserProfile(null);
      setLoading(true);
      setRefreshTrigger(prev => prev + 1);
    };
    
    return () => {
      invalidateProfileCache = null;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const checkUserAndFaction = async () => {
      // Se não deve redirecionar, não verifica autenticação
      if (!shouldRedirect) {
        if (isMounted) setLoading(false);
        return;
      }
      
      try {
        const userResponse = await apiClient.getCurrentUser();
        
        if (!userResponse.data.user) {
          console.log('Usuário não autenticado');
          if (isMounted && shouldRedirect) navigate('/');
          if (isMounted) setLoading(false);
          return;
        }
        
        const user = userResponse.data.user;
        console.log('👤 useUserProfile - Buscando dados do perfil...');
        const profileData = await apiClient.getUserProfile();
        
        console.log('📊 useUserProfile - Dados recebidos da API:', {
          faction: profileData?.faction,
          clan_id: profileData?.clan_id,
          username: profileData?.username
        });
        
        if (profileData?.faction) {
          const processedProfile = await processExistingProfile(profileData, user);
          console.log('✅ useUserProfile - Perfil processado:', {
            faction: processedProfile.faction,
            clan_id: processedProfile.clan_id,
            username: processedProfile.username
          });
          if (isMounted) setUserProfile(processedProfile);
        } else if (user.user_metadata?.faction) {
          const newProfile = await createNewProfile(user);
          if (isMounted && newProfile) setUserProfile(newProfile);
        } else {
          console.log('Usuário sem facção');
          if (isMounted && shouldRedirect) {
            console.log('Redirecionando para página de seleção de facção');
            window.location.href = '/faction-selection';
          }
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkUserAndFaction();
    
    return () => {
      isMounted = false;
    };
  }, [navigate, shouldRedirect, refreshTrigger]);

  const processExistingProfile = async (profileData: any, user: any) => {
    
    // Usar level do banco de dados, mas verificar se precisa atualizar xp_required
    const levelInfo = calculateLevel(profileData.current_xp || 0);
    const shouldUpdateLevel = levelInfo.level !== profileData.level;
    
    // Se o nível calculado for diferente do armazenado, atualizar no banco
    if (shouldUpdateLevel) {
      try {
        await apiClient.updateUserProfile({
          level: levelInfo.level,
          xp_required: levelInfo.xpForNextLevel
        });
        profileData.level = levelInfo.level;
        profileData.xp_required = levelInfo.xpForNextLevel;
      } catch (error) {
        console.error('Erro ao atualizar level:', error);
      }
    }
    
    // Usar os pontos de ação diretamente do banco de dados sem resetar
    let actionPoints = profileData.action_points;
    
    const userProfileData = {
      id: profileData.id ? profileData.id.toString() : profileData.user_id,
      user_id: profileData.user_id,
      faction: profileData.faction,
      clan_id: profileData.clan_id,
      username: profileData.username || 'Usuário', // username vem da tabela users via API
      created_at: profileData.created_at,
      current_xp: profileData.current_xp,
      level: profileData.level, // Usar level do banco de dados
      xp_required: profileData.xp_required, // Usar xp_required do banco
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
      discipline: profileData.discipline
    };
    
    return userProfileData;
  };

  const createNewProfile = async (user: any) => {
    const newProfile = {
      user_id: user.id,
      faction: user.user_metadata.faction
      // Removido username - vem da tabela users, não precisa ser enviado
      // Removido todos os atributos - deixar o backend calcular os valores corretos
    };
    
    try {
      const profileData = await apiClient.createUserProfile(newProfile);
        
      if (!profileData) {
        console.error('Erro ao criar perfil');
        return null;
      }
      
      const levelInfo = calculateLevel(profileData.current_xp || 0);
      
      const userProfileData = {
        id: profileData.id ? profileData.id.toString() : profileData.user_id,
        user_id: profileData.user_id,
        faction: profileData.faction,
        clan_id: profileData.clan_id,
        username: profileData.username || 'Usuário', // username vem da tabela users via API
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
        discipline: profileData.discipline
      };
      
      return userProfileData;
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
      return null;
    }
  };

  return { userProfile, loading, setUserProfile };
};
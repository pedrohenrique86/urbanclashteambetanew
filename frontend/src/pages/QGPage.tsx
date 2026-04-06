import React from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SelecaoClasPage from './SelecaoClasPage';
import ClanPage from './ClanPage';

const QGPage: React.FC = () => {
  const { userProfile, loading } = useUserProfile();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!userProfile) {
    // Idealmente, o usuário não deveria chegar aqui sem perfil,
    // mas é bom ter um fallback.
    return <div>Erro ao carregar perfil. Tente novamente.</div>;
  }

  // Se o usuário tem um clã, mostra a página do clã.
  // A propriedade 'clan_id' ou similar deve existir no seu userProfile.
  // Ajuste o nome da propriedade conforme sua estrutura de dados.
  if (userProfile.clan_id) {
    return <ClanPage />;
  }

  // Se não tiver clã, mostra a página de seleção de clãs.
  return <SelecaoClasPage />;
};

export default QGPage;
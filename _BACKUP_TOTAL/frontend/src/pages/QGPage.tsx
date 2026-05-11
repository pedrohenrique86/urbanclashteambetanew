import React from 'react';
import { useUserProfileContext } from '../contexts/UserProfileContext';
import SelecaoClasPage from './SelecaoClasPage';
import ClanPage from './ClanPage';

const QGPage: React.FC = () => {
  const { userProfile } = useUserProfileContext();

  // Fallback leve e não bloqueante, conforme solicitado.
  // Garante que a página não quebre se o perfil ainda não estiver disponível.
  if (!userProfile) {
    return <div className="p-4 text-white">Carregando...</div>;
  }

  // Lógica principal da página, que agora usa a fonte de dados correta.
  if (userProfile.clan_id) {
    return <ClanPage />;
  }

  return <SelecaoClasPage />;
};

export default QGPage;
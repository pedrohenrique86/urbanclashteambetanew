export interface MenuItem {
  icon: string;
  label: string;
  path: string;
}

const mainMenuItems: MenuItem[] = [];

const gameMenuItems: MenuItem[] = [
  { icon: '📋', label: 'Tarefas', path: '/tasks' },
  { icon: '⚔️', label: 'Duelos', path: '/duels' },
  { icon: '🍽️', label: 'Restaurante', path: '/restaurant' },
  { icon: '🏥', label: 'Hospital', path: '/hospital' },
  { icon: '🔒', label: 'Prisão', path: '/prison' },
];

const activitiesMenuItems: MenuItem[] = [
  { icon: '🗺️', label: 'Territórios', path: '/territory' },
  { icon: '🛒', label: 'Mercado Negro', path: '/market' },
  { icon: '🏦', label: 'Banco', path: '/bank' },
  { icon: '🏢', label: 'Empresas', path: '/business' },
];

const socialMenuItems: MenuItem[] = [
  { icon: '🏴', label: 'Clã', path: '/clan' },
  { icon: '🏆', label: 'Ranking', path: '/ranking' },
  { icon: '🏛️', label: 'Praça', path: '/square' },
  { icon: '💪', label: 'Academia', path: '/gym' },
  { icon: '👤', label: 'Perfil', path: '/profile' },
];

const premiumMenuItems: MenuItem[] = [
  { icon: '💎', label: 'VIP', path: '/vip' },
  { icon: '🛍️', label: 'Loja Premium', path: '/store' },
];

export const menuCategories = {
  principal: {
    title: 'Principal',
    icon: '🏠',
    items: mainMenuItems,
  },
  jogo: {
    title: 'Jogo',
    icon: '🎒',
    items: gameMenuItems,
  },
  atividades: {
    title: 'Atividades',
    icon: '🎯',
    items: activitiesMenuItems,
  },
  social: {
    title: 'Social',
    icon: '👥',
    items: socialMenuItems,
  },
  premium: {
    title: 'Premium',
    icon: '💎',
    items: premiumMenuItems,
  },
};
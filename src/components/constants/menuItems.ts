export interface MenuItem {
  icon: string;
  label: string;
  path: string;
}

const mainMenuItems: MenuItem[] = [
  { icon: '📊', label: 'Visão Geral', path: '/overview' },
  { icon: '🗺️', label: 'Mapa', path: '/dashboard' },
];

const gameMenuItems: MenuItem[] = [
  { icon: '🎲', label: 'Gacha', path: '/gacha' },
  { icon: '🛒', label: 'Loja', path: '/loja' },
  { icon: '🛠️', label: 'Fabricar', path: '/fabricar' },
  { icon: '📚', label: 'Códice', path: '/codice' },
];

const activitiesMenuItems: MenuItem[] = [
  { icon: '⚔️', label: 'Batalha', path: '/batalha' },
  { icon: '🎯', label: 'Missões', path: '/missoes' },
  { icon: '🏆', label: 'Conquistas', path: '/conquistas' },
];

const socialMenuItems: MenuItem[] = [
  { icon: '🤝', label: 'Clã', path: '/cla' },
  { icon: '👥', label: 'Amigos', path: '/amigos' },
  { icon: '🏆', label: 'Ranking', path: '/ranking' },
];

const premiumMenuItems: MenuItem[] = [
  { icon: '💎', label: 'VIP', path: '/vip' },
  { icon: '✨', label: 'Passe de Batalha', path: '/passe-de-batalha' },
];

export const menuCategories = {
  principal: {
    title: 'Principal',
    icon: '🏠',
    items: mainMenuItems,
  },
  jogo: {
    title: 'Itens',
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
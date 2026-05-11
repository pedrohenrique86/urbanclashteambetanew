import React from "react";
import {
  HomeIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  FireIcon,
  BuildingStorefrontIcon,
  HeartIcon,
  LockClosedIcon,
  MapIcon,
  GlobeAltIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  FlagIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  UserCircleIcon,
  StarIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  RectangleStackIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

export const FOLDER_COLORS: Record<string, { bg: string, text: string, border: string, icon: string, solid: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", icon: "text-emerald-200/90", solid: "bg-emerald-500" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", icon: "text-blue-200/90", solid: "bg-blue-500" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", icon: "text-purple-200/90", solid: "bg-purple-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", icon: "text-amber-200/90", solid: "bg-amber-500" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", icon: "text-rose-200/90", solid: "bg-rose-500" },
};

export interface DrawerPage {
  id: string;
  name: string;
  path: string;
  icon: React.ReactNode;
  category: string;
}

export const ALL_PAGES: DrawerPage[] = [
  { id: "dashboard", name: "Dashboard", path: "/dashboard", icon: <HomeIcon className="w-5 h-5" />, category: "Base" },
  { id: "contracts", name: "Contratos", path: "/contracts", icon: <DocumentTextIcon className="w-5 h-5" />, category: "Operações" },
  { id: "reckoning", name: "Acerto de Contas", path: "/reckoning", icon: <ShieldExclamationIcon className="w-5 h-5" />, category: "Operações" },
  { id: "squad-war", name: "Guerra de Esquadrão", path: "/squad-war", icon: <FireIcon className="w-5 h-5" />, category: "Operações" },
  { id: "supply-station", name: "Estação de Suprimentos", path: "/supply-station", icon: <BuildingStorefrontIcon className="w-5 h-5" />, category: "Operações" },
  { id: "recovery-base", name: "Base de Recuperação", path: "/recovery-base", icon: <HeartIcon className="w-5 h-5" />, category: "Operações" },
  { id: "isolation", name: "Isolamento", path: "/isolation", icon: <LockClosedIcon className="w-5 h-5" />, category: "Operações" },
  { id: "dark-zones", name: "Zonas Sombrias", path: "/dark-zones", icon: <MapIcon className="w-5 h-5" />, category: "Economia" },
  { id: "parallel-network", name: "Rede Paralela", path: "/parallel-network", icon: <GlobeAltIcon className="w-5 h-5" />, category: "Economia" },
  { id: "safe", name: "Cofre", path: "/safe", icon: <BuildingLibraryIcon className="w-5 h-5" />, category: "Economia" },
  { id: "corporations", name: "Corporações", path: "/corporations", icon: <BuildingOffice2Icon className="w-5 h-5" />, category: "Economia" },
  { id: "qg", name: "QG", path: "/qg", icon: <FlagIcon className="w-5 h-5" />, category: "Rede" },
  { id: "ranking", name: "Ranking", path: "/ranking", icon: <ChartBarIcon className="w-5 h-5" />, category: "Rede" },
  { id: "social-zone", name: "Zona Social", path: "/social-zone", icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />, category: "Rede" },
  { id: "training", name: "Treinamento", path: "/training", icon: <AcademicCapIcon className="w-5 h-5" />, category: "Rede" },
  { id: "digital-identity", name: "Identidade Digital", path: "/digital-identity", icon: <UserCircleIcon className="w-5 h-5" />, category: "Rede" },
  { id: "vip-access", name: "Acesso VIP", path: "/vip-access", icon: <StarIcon className="w-5 h-5" />, category: "Elite" },
  { id: "restricted-store", name: "Loja Restrita", path: "/restricted-store", icon: <ShoppingBagIcon className="w-5 h-5" />, category: "Elite" },
  { id: "dark-market", name: "Bolsa Sombria", path: "/dark-market", icon: <CurrencyDollarIcon className="w-5 h-5" />, category: "Economia" },
  { id: "parallel-deck", name: "Deck Paralelo", path: "/parallel-deck", icon: <RectangleStackIcon className="w-5 h-5" />, category: "Economia" },
  { id: "network-circuit", name: "Circuito da Rede", path: "/network-circuit", icon: <CpuChipIcon className="w-5 h-5" />, category: "Economia" },
  { id: "tactical-arsenal", name: "Arsenal Tático", path: "/tactical-arsenal", icon: <WrenchScrewdriverIcon className="w-5 h-5" />, category: "Rede" },
  { id: "network-logs", name: "Registros da Rede", path: "/network-logs", icon: <ClipboardDocumentListIcon className="w-5 h-5" />, category: "Rede" },
  { id: "season", name: "Temporada", path: "/season", icon: <CalendarDaysIcon className="w-5 h-5" />, category: "Rede" },
];

export const DEFAULT_ORDER = ALL_PAGES.map((p) => p.id);
export const PAGE_MAP = new Map(ALL_PAGES.map((p) => [p.id, p]));

export const SNAP_OPEN_PX = 80;
export const SNAP_CLOSE_PX = 60;
export const LONG_PRESS_MS = 180;

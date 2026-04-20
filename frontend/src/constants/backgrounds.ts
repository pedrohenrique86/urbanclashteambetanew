/**
 * Centralized background configuration for the application.
 * Defines which background image should be used for each route.
 * 
 * Performance: Images are only loaded when the specific route is active.
 * Responsive: Supports different images for mobile/desktop.
 */

import dashbgangster from "../assets/dashbgangster.webp";
import dashguardas from "../assets/dashguardas.webp";
import rankingBg from "../assets/ranking.webp";
import homeBg from "../assets/home.webp";
import homeMobileBg from "../assets/home-mobile.webp";
import factionSelectionBg from "../assets/faction-selection.webp";
import idBg from "../assets/id.webp";
import acertoContasBg from "../assets/acerto-contas.webp";
import cardClansBg from "../assets/cardclans-home.webp";
import squadWarBg from "../assets/squad-war.webp";
import recoveryBaseBg from "../assets/recovery-base.webp";
import restrictedStoreBg from "../assets/restricted-store.webp";
import isolationBg from "../assets/isolation.webp";
import supplyStationGuardioes from "../assets/supply-station-guardioes.webp";
import supplyStationRenegados from "../assets/supply-station-renegados.webp";
import contractGuardiaoBg from "../assets/contract-guardiao.webp";
import contractRenegadosBg from "../assets/contract-renegados.webp";
import darkZonesBg from "../assets/dark-zones.webp";
import parallelNetworkBg from "../assets/parallel-network.webp";
import safeBg from "../assets/safe.webp";
import corporationsBg from "../assets/corporations.webp";
import qgChatGuardioes from "../assets/qg-chat-guardioes.webp";
import qgChatRenegados from "../assets/qg-chat-renegados.webp";
import zonaSocialBg from "../assets/zona-social.webp";
import trainingGuardioes from "../assets/training-guardioes.webp";
import trainingRenegados from "../assets/training-renegados.webp";
import vipAccessBg from "../assets/vip-access.webp";
import seasonBg from "../assets/season.webp";
import arsenalBg from "../assets/arsenal.webp";
import networkLogsBg from "../assets/network-logs.webp";
import networkCircuitBg from "../assets/network-circuit.webp";
import { FACTION_ALIAS_MAP_FRONTEND } from "../utils/faction";

export interface BackgroundConfig {
  src: string;
  mobileSrc?: string;
  overlay?: string; // CSS class for the overlay (e.g., bg-black/40)
  position?: string; // CSS class for background-position
  blur?: boolean;
}

// Default glassmorphism placeholder for pages without a defined background
export const DEFAULT_PLACEHOLDER = "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)";

export type BackgroundMap = Record<string, BackgroundConfig | ((data: any) => BackgroundConfig)>;

const isGuardFaction = (profile: any) => {
  const faction = typeof profile?.faction === "string" ? profile.faction : profile?.faction?.name;
  return FACTION_ALIAS_MAP_FRONTEND[String(faction).toLowerCase().trim()] === "guardas";
};

export const PAGE_BACKGROUNDS: BackgroundMap = {
  "/": {
    src: homeBg,
    mobileSrc: homeMobileBg,
    overlay: "bg-black/30",
  },
  "/dashboard": (profile: any) => {
    return {
      src: isGuardFaction(profile) ? dashguardas : dashbgangster,
      overlay: "bg-black/20",
    };
  },
  "/ranking": {
    src: rankingBg,
    overlay: "bg-black/60",
    position: "bg-center",
  },
  "/reckoning": {
    src: acertoContasBg,
    overlay: "bg-black/50",
    position: "bg-top",
  },
  "/faction-selection": {
    src: factionSelectionBg,
    overlay: "bg-black/40",
    position: "bg-center",
  },
  "/confirm-email": {
    src: factionSelectionBg,
    overlay: "bg-black/40",
    position: "bg-center",
  },
  "/reset-password": {
    src: factionSelectionBg,
    overlay: "bg-black/40",
    position: "bg-center",
  },
  "/clan": (profile: any) => {
    return {
      src: isGuardFaction(profile) ? qgChatGuardioes : qgChatRenegados,
      overlay: "bg-black/40",
      position: "bg-center",
    };
  },
  "/qg": (profile: any) => {
    return {
      src: isGuardFaction(profile) ? qgChatGuardioes : qgChatRenegados,
      overlay: "bg-black/40",
      position: "bg-center",
    };
  },
  "/clan-selection": {
    src: cardClansBg,
    overlay: "bg-black/60",
    blur: true,
  },
  "/squad-war": {
    src: squadWarBg,
    overlay: "bg-black/50",
    position: "bg-center",
  },
  "/supply-station": (profile: any) => {
    return {
      src: isGuardFaction(profile) ? supplyStationGuardioes : supplyStationRenegados,
      overlay: "bg-black/60",
      position: "bg-center",
    };
  },
  "/recovery-base": {
    src: recoveryBaseBg,
    overlay: "bg-black/60",
    position: "bg-center",
  },
  "/isolation": {
    src: isolationBg,
    overlay: "bg-black/60",
    position: "bg-center",
  },
  "/contracts": (profile: any) => {
    return {
      src: isGuardFaction(profile) ? contractGuardiaoBg : contractRenegadosBg,
      overlay: "bg-black/50",
      position: "bg-center",
    };
  },
  "/dark-zones": {
    src: darkZonesBg,
    overlay: "bg-black/70",
    position: "bg-center",
  },
  "/parallel-network": {
    src: parallelNetworkBg,
    overlay: "bg-black/60",
    position: "bg-center",
  },
  "/safe": {
    src: safeBg,
    overlay: "bg-black/60",
    position: "bg-center",
  },
  "/corporations": {
    src: corporationsBg,
    overlay: "bg-black/60",
    position: "bg-center",
  },
  "/social-zone": {
    src: zonaSocialBg,
    overlay: "bg-black/40",
    position: "bg-center",
  },
  "/training": (profile: any) => {
    return {
      src: isGuardFaction(profile) ? trainingGuardioes : trainingRenegados,
      overlay: "bg-black/60",
      position: "bg-center",
    };
  },
  "/digital-identity": {
    src: idBg,
    overlay: "bg-black/40",
    position: "bg-center",
  },
  "/vip-access": {
    src: vipAccessBg,
    overlay: "bg-black/60",
    position: "bg-center",
  },
  "/restricted-store": {
    src: restrictedStoreBg,
    overlay: "bg-black/60",
    position: "bg-center",
  },
  "/season": {
    src: seasonBg,
    overlay: "bg-black/50",
    position: "bg-center",
  },
  "/tactical-arsenal": {
    src: arsenalBg,
    overlay: "bg-black/40",
    position: "bg-center",
  },
  "/network-logs": {
    src: networkLogsBg,
    overlay: "bg-black/60",
    position: "bg-center",
  },
  "/network-circuit": {
    src: networkCircuitBg,
    overlay: "bg-black/50",
    position: "bg-center",
  },
  // Future pages can be registered here easily
};

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
import cardDivisoesBg from "../assets/card-divisoes.webp";
import squadWarBg from "../assets/squad-war.webp";
import recoveryBaseBg from "../assets/recovery-base.webp";
import restrictedStoreBg from "../assets/restricted-store.webp";
import isolationBg from "../assets/isolation.webp";
import supplyStationBg from "../assets/supply-station.webp";
import contractsBg from "../assets/contracts.webp";
import darkZonesBg from "../assets/dark-zones.webp";
import parallelNetworkBg from "../assets/parallel-network.webp";
import safeBg from "../assets/safe.webp";
import corporationsBg from "../assets/corporations.webp";
import qgBg from "../assets/qg.webp";
import zonaSocialBg from "../assets/zona-social.webp";
import trainingBg from "../assets/training.webp";
import vipAccessBg from "../assets/vip-access.webp";
import seasonBg from "../assets/season.webp";
import arsenalBg from "../assets/arsenal.webp";
import networkLogsBg from "../assets/network-logs.webp";
import networkCircuitBg from "../assets/network-circuit.webp";
import parallelDeckBg from "../assets/parallel-deck.webp";
import darkMarketBg from "../assets/dark-market.webp";
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

export type BackgroundMap = Record<string, BackgroundConfig | ((data: any) => BackgroundConfig) | null>;

const isGuardFaction = (profile: any) => {
  const faction = typeof profile?.faction === "string" ? profile.faction : profile?.faction?.name;
  return FACTION_ALIAS_MAP_FRONTEND[String(faction).toLowerCase().trim()] === "guardas";
};

export const PAGE_BACKGROUNDS: BackgroundMap = {
  "/": null,
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
    overlay: "bg-black/80",
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
  "/clan": {
    src: qgBg,
    overlay: "bg-black/40",
    position: "bg-center",
  },
  "/qg": {
    src: qgBg,
    overlay: "bg-black/40",
    position: "bg-center",
  },
  "/clan-selection": {
    src: cardDivisoesBg,
    overlay: "bg-black/60",
    blur: true,
  },
  "/squad-war": {
    src: squadWarBg,
    overlay: "bg-black/50",
    position: "bg-center",
  },
  "/supply-station": {
    src: supplyStationBg,
    overlay: "bg-black/60",
    position: "bg-center",
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
  "/contracts": {
    src: contractsBg,
    overlay: "bg-black/60",
    position: "bg-center",
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
  "/training": {
    src: trainingBg,
    overlay: "bg-black/60",
    position: "bg-center",
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
  "/parallel-deck": {
    src: parallelDeckBg,
    overlay: "bg-black/40",
    position: "bg-center",
  },
  "/dark-market": {
    src: darkMarketBg,
    overlay: "bg-black/70",
    position: "bg-center",
  },
  // Future pages can be registered here easily
};

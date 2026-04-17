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
import acertoContasBg from "../assets/acerto-contas.webp";
import cardClansBg from "../assets/cardclans-home.webp";
import squadWarBg from "../assets/squad-war.webp";
import recoveryBaseBg from "../assets/recovery-base.webp";
import supplyGangsterBg from "../assets/stretching station-gangsters.webp";
import supplyGuardBg from "../assets/stretching station-guardas.webp";
import isolationBg from "../assets/isolation.webp";
import contractGuardiaoBg from "../assets/contract-guardiao.webp";
import contractRenegadosBg from "../assets/contract-renegados.webp";
import darkZonesBg from "../assets/dark-zones.webp";
import parallelNetworkBg from "../assets/parallel-network.webp";
import safeBg from "../assets/safe.webp";
import corporationsBg from "../assets/corporations.webp";
import qgChatGuardioes from "../assets/qg-chat-guardioes.webp";
import qgChatRenegados from "../assets/qg-chat-renegados.webp";

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

export const PAGE_BACKGROUNDS: BackgroundMap = {
  "/": {
    src: homeBg,
    mobileSrc: homeMobileBg,
    overlay: "bg-black/30",
  },
  "/dashboard": (profile: any) => {
    const faction = typeof profile?.faction === "string" ? profile.faction : profile?.faction?.name;
    return {
      src: faction === "guardas" ? dashguardas : dashbgangster,
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
    src: homeBg,
    overlay: "bg-black/70",
    blur: true,
  },
  "/clan": (profile: any) => {
    const faction = typeof profile?.faction === "string" ? profile.faction : profile?.faction?.name;
    const isGuard = faction?.toLowerCase() === "guardas";
    return {
      src: isGuard ? qgChatGuardioes : qgChatRenegados,
      overlay: "bg-black/40",
      position: "bg-center",
    };
  },
  "/qg": (profile: any) => {
    const faction = typeof profile?.faction === "string" ? profile.faction : profile?.faction?.name;
    const isGuard = faction?.toLowerCase() === "guardas";
    return {
      src: isGuard ? qgChatGuardioes : qgChatRenegados,
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
    const faction = typeof profile?.faction === "string" ? profile.faction : profile?.faction?.name;
    return {
      src: faction === "guardas" ? supplyGuardBg : supplyGangsterBg,
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
    const faction = typeof profile?.faction === "string" ? profile.faction : profile?.faction?.name;
    const isGuard = faction?.toLowerCase() === "guardas";
    return {
      src: isGuard ? contractGuardiaoBg : contractRenegadosBg,
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
  // Future pages can be registered here easily
};

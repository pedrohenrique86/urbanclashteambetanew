import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useUserProfileContext } from "../../contexts/UserProfileContext";
import { PAGE_BACKGROUNDS, DEFAULT_PLACEHOLDER, BackgroundConfig } from "../../constants/backgrounds";

// In-memory cache to avoid re-preloading during the session
// This is global to the component file to persist across navigations
const LOADED_ASSETS = new Set<string>();

/**
 * Refined DynamicBackground Component
 * 
 * Improvements:
 * 1. Double-layering: The previous background stays visible until the new one is 100% ready.
 * 2. Cross-session asset cache: Zero wait time for already visited pages.
 * 3. Snappy transitions: Adjusted to 500ms for a professional feel.
 * 4. Robust responsivity: Uses resize listener and robust checks.
 */
export const DynamicBackground: React.FC = () => {
  const location = useLocation();
  const { userProfile } = useUserProfileContext();
  
  // States for double-buffering
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [prevImage, setPrevImage] = useState<string | null>(null);
  const [isNewReady, setIsNewReady] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Resize handling
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const config = useMemo((): BackgroundConfig | null => {
    const path = location.pathname;
    const item = PAGE_BACKGROUNDS[path];
    if (!item) return null;
    return typeof item === "function" ? item(userProfile) : item;
  }, [location.pathname, userProfile]);

  const targetSrc = useMemo(() => {
    if (!config) return null;
    return (isMobile && config.mobileSrc) ? config.mobileSrc : config.src;
  }, [config, isMobile]);

  const loadingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!targetSrc) {
      setPrevImage(activeImage);
      setActiveImage(null);
      setIsNewReady(false);
      return;
    }

    // Capture the state before starting new load
    if (activeImage !== targetSrc) {
      setPrevImage(activeImage);
      setIsNewReady(false);
    }

    if (LOADED_ASSETS.has(targetSrc)) {
      setActiveImage(targetSrc);
      setIsNewReady(true);
      return;
    }

    loadingRef.current = targetSrc;
    const img = new Image();
    img.src = targetSrc;
    
    const handleLoad = () => {
      if (loadingRef.current === targetSrc) {
        LOADED_ASSETS.add(targetSrc);
        setActiveImage(targetSrc);
        setIsNewReady(true);
      }
    };

    img.onload = handleLoad;
    if (img.complete) handleLoad();

  }, [targetSrc, activeImage]);

  if (!config && !activeImage && !prevImage) {
    return (
      <div 
        className="fixed inset-0 z-[-2]"
        style={{ background: DEFAULT_PLACEHOLDER }}
      />
    );
  }

  return (
    <>
      {/* Layer 0: Global Background Placeholder */}
      <div 
        className="fixed inset-0 z-[-4]"
        style={{ background: DEFAULT_PLACEHOLDER }}
      />

      {/* Layer 1: Previous Background (keeps visible during load) */}
      {prevImage && (
        <div
          className="fixed inset-0 z-[-3] bg-cover bg-center"
          style={{ backgroundImage: `url(${prevImage})` }}
        />
      )}

      {/* Layer 2: Active Background (fades in when ready) */}
      {activeImage && (
        <div
          className={`fixed inset-0 z-[-2] bg-cover ${config?.position || "bg-center"} transition-opacity ${isMobile ? "duration-200" : "duration-500"} ease-out ${
            isNewReady ? "opacity-100" : "opacity-0"
          } ${config?.blur ? "blur-md scale-105" : ""}`}
          style={{ backgroundImage: `url(${activeImage})` }}
        />
      )}

      {/* Layer 3: Dynamic Overlay */}
      {config?.overlay && (
        <div className={`fixed inset-0 z-[-1] pointer-events-none transition-opacity ${isMobile ? "duration-200" : "duration-500"} ${config.overlay}`} />
      )}
    </>
  );
};

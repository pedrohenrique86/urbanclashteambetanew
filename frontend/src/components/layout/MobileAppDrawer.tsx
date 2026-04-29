import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  memo,
  startTransition,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useHUD } from "../../contexts/HUDContext";
import {
  ChevronUpIcon,
  GlobeAltIcon,
  ArrowLeftOnRectangleIcon,
  CheckIcon,
  PencilSquareIcon,
  FolderOpenIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { useDrawerOrder, DrawerFolder } from "../../hooks/useDrawerOrder";
import { useGameClock } from "../../hooks/useGameClock";
import { useAuth } from "../../contexts/AuthContext";
import { useUserProfileContext } from "../../contexts/UserProfileContext";
import { LockClosedIcon as LockIcon } from "@heroicons/react/20/solid";
import { ALL_PAGES, DEFAULT_ORDER, PAGE_MAP, DrawerPage, FOLDER_COLORS, SNAP_OPEN_PX, SNAP_CLOSE_PX, LONG_PRESS_MS } from "./MobileDrawerConstants";
import { DrawerItem, DrawerFolderItem } from "./MobileDrawerItems";

const fmtTimer = (s: number): string => {
  if (s <= 0) return "0d 00h 00m 00s";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
};

const fmtSrvTime = (date: Date | null): string => {
  if (!date) return "--:--:-- BRT | --:--:-- UTC";
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
  const brt = date.toLocaleString("en-GB", { ...opts, timeZone: "America/Sao_Paulo" });
  const utc = date.toLocaleString("en-GB", { ...opts, timeZone: "UTC" });
  return `${brt} BRT | ${utc} UTC`;
};

const STATUS_COLOR: Record<string, string> = {
  running: "text-lime-400",
  paused: "text-orange-400",
  finished: "text-gray-400",
  stopped: "text-red-500",
  scheduled: "text-cyan-400",
};

const STATUS_LABEL: Record<string, string> = {
  running: "Em Andamento",
  paused: "Pausado",
  finished: "Finalizado",
  stopped: "Parado",
  scheduled: "Aguardando",
};

const MobileHUDTimer: React.FC = () => {
  const { remainingTime, status, serverTime } = useGameClock();
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.5)] tabular-nums font-mono antialiased w-max max-w-full">
      {/* Status e Cronômetro */}
      <div className={`flex items-center justify-center gap-1.5 ${STATUS_COLOR[status] ?? "text-gray-500"} shrink-0`}>
        <div className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">{STATUS_LABEL[status]}</span>
        <div className="text-[11px] font-black text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 shrink-0 tracking-wider">
          {fmtTimer(remainingTime)}
        </div>
      </div>

      {/* Hora do Servidor */}
      <div className="flex items-center justify-center gap-1 text-white/90 font-bold shrink-0">
        <GlobeAltIcon className="w-3.5 h-3.5 text-purple-400 opacity-80" />
        <span className="text-[10px] uppercase tracking-wider">{fmtSrvTime(serverTime)}</span>
      </div>
    </div>
  );
};

export const MobileAppDrawer: React.FC = () => {
  const { currentPanel, closePanel, clearPanels, hasOpenPanel, setMobileDrawerOpen } = useHUD();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  // Sincroniza estado global do Drawer para outros componentes (ex: ocultar scroll topo)
  useEffect(() => {
    setMobileDrawerOpen(isOpen);
  }, [isOpen, setMobileDrawerOpen]);

  const [isEditMode, setIsEditMode] = useState(false);

  const [drawerDragY, setDrawerDragY] = useState(0);
  const drawerTouchStartY = useRef<number | null>(null);
  const pointerStartPos = useRef<{ x: number, y: number } | null>(null);

  // DRAGGING STATE 
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragAction, setDragAction] = useState<"group" | "reorder" | null>(null);
  const [liveOrder, setLiveOrder] = useState<string[] | null>(null);

  // FOLDER MODAL STATE
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderDragId, setFolderDragId] = useState<string | null>(null);
  const [isFolderTrashHover, setIsFolderTrashHover] = useState(false);

  // CONTEXT MENU OPEARATION
  const [contextMenuTarget, setContextMenuTarget] = useState<{ id: string, x: number, y: number } | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reorderDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didReorderRef = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const [drawerData, setDrawerData] = useDrawerOrder(DEFAULT_ORDER);

  const { userProfile } = useUserProfileContext();
  const playerStatus = userProfile?.status || 'Operacional';

  const isPathBlocked = useCallback((path: string) => {
    if (playerStatus === 'Operacional' || playerStatus === 'Sangrando') return false;

    const whitelist = [
      '/dashboard',
      '/digital-identity',
      '/social-zone',
      '/clan',
      '/vip-access',
      '/season',
      '/ranking'
    ];

    if (playerStatus === 'Isolamento') whitelist.push('/isolation');
    if (playerStatus === 'Recondicionamento') whitelist.push('/recovery-base');
    if (playerStatus === 'Aprimoramento') whitelist.push('/training');

    return !whitelist.some(p => path === p || path.startsWith(p + '/'));
  }, [playerStatus]);

  // Removido o uso do hook central para evitar que a Gaveta inteira (800+ linhas)
  // re-renderize a cada 1 segundo. Usamos o Wrapper local abaixo.
  
  // Highlight active
  const activePagePath = location.pathname;
  const activePage = ALL_PAGES.find(p => p.path === activePagePath);
  const activePageId = activePage?.id;
  const folderContainingActivePage = Object.values(drawerData.folders || {}).find(f => activePageId && f.items.includes(activePageId))?.id;

  const currentViewItems = useMemo(() => {
    if (draggingId && dragAction === "reorder" && liveOrder) return liveOrder;
    return drawerData?.order || DEFAULT_ORDER;
  }, [drawerData, draggingId, dragAction, liveOrder]);

  useEffect(() => {
    setIsOpen(false);
    setIsEditMode(false);
    setDraggingId(null);
    setDragOverId(null);
    setDragAction(null);
    setLiveOrder(null);
    setCurrentFolder(null);
    setContextMenuTarget(null);
    didReorderRef.current = false;
  }, [location.pathname]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (draggingId || folderDragId) {
        setDraggingId(null);
        setLiveOrder(null);
        setDragOverId(null);
        setDragAction(null);
        setIsFolderTrashHover(false);
        setFolderDragId(null);
      }

      if (reorderDelayTimer.current) {
        clearTimeout(reorderDelayTimer.current);
        reorderDelayTimer.current = null;
      }
      clearLongPressTimer();
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [draggingId, folderDragId, clearLongPressTimer]);


  // OPEN / CLOSE DRAW TOUCH LOGIC
  const handleDrawerTouchStart = useCallback((e: React.TouchEvent) => {
    if (isEditMode) return;
    drawerTouchStartY.current = e.touches[0].clientY;
  }, [isEditMode]);

  const handleDrawerTouchMove = useCallback((e: React.TouchEvent) => {
    if (drawerTouchStartY.current === null || isEditMode) return;
    const dy = e.touches[0].clientY - drawerTouchStartY.current;
    if (!isOpen && dy < 0) setDrawerDragY(Math.max(dy, -200));
    else if (isOpen && dy > 0) setDrawerDragY(Math.min(dy, 150));
  }, [isOpen, isEditMode]);

  const handleDrawerTouchEnd = useCallback(() => {
    if (drawerTouchStartY.current === null) return;
    if (!isOpen && drawerDragY < -SNAP_OPEN_PX) setIsOpen(true);
    else if (isOpen && drawerDragY > SNAP_CLOSE_PX) {
      setIsOpen(false);
      setIsEditMode(false);
      setCurrentFolder(null);
    }
    setDrawerDragY(0);
    drawerTouchStartY.current = null;
  }, [isOpen, drawerDragY]);

  const toggleDrawer = () => {
    if (drawerTouchStartY.current !== null) return;
    setIsOpen((prev) => {
      if (prev) {
        setIsEditMode(false);
        setCurrentFolder(null);
      }
      return !prev;
    });
  };

  // ROOT GRID DRAG N DROP
  const handleItemPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    if (!isEditMode) return;
    e.preventDefault();

    didReorderRef.current = false;
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    setContextMenuTarget(null);
    clearLongPressTimer();

    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setDraggingId(id);
      setLiveOrder([...drawerData.order]);
      setDragAction("reorder");
    }, LONG_PRESS_MS);
  }, [isEditMode, drawerData, clearLongPressTimer]);

  const handleItemPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingId || !gridRef.current) return;
    e.preventDefault();

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const btn = el?.closest("[data-drawer-id]");
    const overId = btn?.getAttribute("data-drawer-id") ?? null;

    if (btn && overId && overId !== draggingId) {
      const rect = btn.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width;
      const relativeY = (e.clientY - rect.top) / rect.height;

      // Hitbox de Agrupamento aumentada pra 25% - 75% -> Mais facil criar a pasta!
      const isCenterHover = relativeX > 0.25 && relativeX < 0.75 && relativeY > 0.25 && relativeY < 0.75;

      if (isCenterHover && !drawerData.folders[draggingId]) {
        // Group Intent => Interrompe qualquer plano de mover ele do lugar.
        if (reorderDelayTimer.current) {
          clearTimeout(reorderDelayTimer.current);
          reorderDelayTimer.current = null;
        }
        setDragAction("group");
        setDragOverId(overId);
      } else {
        setDragAction("reorder");
        setDragOverId(null);

        // Timer Inteligente: Aguarda 250ms antes de mover os grids para confirmar se o usuário não ia parar em cima dele.
        if (!reorderDelayTimer.current) {
          reorderDelayTimer.current = setTimeout(() => {
            setLiveOrder((currentLive) => {
              if (!currentLive) return null;
              const newLive = [...currentLive];
              const fromIdx = newLive.indexOf(draggingId);
              const toIdx = newLive.indexOf(overId);
              if (fromIdx >= 0 && toIdx >= 0) {
                newLive.splice(fromIdx, 1);
                newLive.splice(toIdx, 0, draggingId);
              }
              return newLive;
            });
            reorderDelayTimer.current = null;
          }, 300);
        }
      }
    } else {
      setDragOverId(null);
      setDragAction("reorder");
      if (reorderDelayTimer.current) {
        clearTimeout(reorderDelayTimer.current);
        reorderDelayTimer.current = null;
      }
    }
  }, [draggingId, drawerData]);

  const executeGroup = useCallback((fromId: string, toId: string) => {
    const isToFolder = !!drawerData?.folders[toId];

    if (isToFolder) {
      setDrawerData(prev => {
        const next = { ...prev, order: [...prev.order], folders: { ...prev.folders } };
        next.order = next.order.filter(id => id !== fromId);
        next.folders[toId] = {
          ...next.folders[toId],
          items: [...next.folders[toId].items, fromId]
        };
        return next;
      });
    } else {
      const folderName = "Nova Pasta";
      const newFolderId = `folder_${Date.now()}`;
      setDrawerData(prev => {
        const next = { ...prev, order: [...prev.order], folders: { ...prev.folders } };
        const toIdx = next.order.indexOf(toId);
        next.order = next.order.filter(id => id !== fromId && id !== toId);
        if (toIdx >= 0) next.order.splice(toIdx, 0, newFolderId);
        else next.order.push(newFolderId);
        next.folders[newFolderId] = { id: newFolderId, name: folderName, items: [toId, fromId] };
        return next;
      });
    }
  }, [drawerData, setDrawerData]);

  const handleItemPointerUp = useCallback((e: React.PointerEvent, id: string) => {
    clearLongPressTimer();

    if (draggingId) {
      // Executa drops
      if (dragAction === "group" && dragOverId) executeGroup(draggingId, dragOverId);
      else if (dragAction === "reorder" && liveOrder) {
        setDrawerData(prev => ({ ...prev, order: liveOrder }));
      }

      didReorderRef.current = true;
      setDraggingId(null);
      setDragOverId(null);
      setDragAction(null);
      setLiveOrder(null);
      if (reorderDelayTimer.current) {
        clearTimeout(reorderDelayTimer.current);
        reorderDelayTimer.current = null;
      }
      setTimeout(() => didReorderRef.current = false, 100);
    } else {
      // Se soltou e NUNCA originou drag mas É PASTA no modo edit
      // Ou seja "Bateu na Pasta" em vez de arrastar (o clique sintonizou e desligou logo antes dos 180ms ou n se moveu)
      if (isEditMode && drawerData.folders[id]) {
        const dx = Math.abs(e.clientX - (pointerStartPos.current?.x || e.clientX));
        const dy = Math.abs(e.clientY - (pointerStartPos.current?.y || e.clientY));
        if (dx < 20 && dy < 20 && !didReorderRef.current) {
          // ABRE CONTEXT MENU DAS PASTAS!
          const el = e.currentTarget as HTMLElement;
          const r = el.getBoundingClientRect();
          setContextMenuTarget({ id, x: r.left + r.width / 2, y: r.top });
        }
      }
    }
  }, [draggingId, dragOverId, dragAction, liveOrder, isEditMode, drawerData, clearLongPressTimer, executeGroup, setDrawerData]);


  const handleItemPress = (e: React.MouseEvent, id: string, path?: string) => {
    if (draggingId || didReorderRef.current) return;

    if (isEditMode) {
      // Bloqueado cliques. Modificaçoes só via arrasto ou Context Menu.
      return;
    }

    if (drawerData?.folders && drawerData.folders[id]) {
      setCurrentFolder(id); // Entra na Pasta visual Modal Fluida
    } else if (path) {
      if (isPathBlocked(path)) return;
      
      // Resposta instantânea na UI ("clicou abriu")
      setIsOpen(false);
      // Delega a troca de página pesada do React Router para baixa prioridade (não trava a animação)
      startTransition(() => {
        navigate(path);
      });
    }
  };

  // DRAG INTERNO PASTAS EM MODAIS
  const handleFolderItemPointerDown = useCallback((e: React.PointerEvent, itemId: string) => {
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setFolderDragId(itemId);
    }, LONG_PRESS_MS);
  }, [clearLongPressTimer]);

  const handleFolderItemPointerMove = useCallback((e: React.PointerEvent) => {
    if (folderDragId) {
      if (e.clientY < 140) setIsFolderTrashHover(true);
      else setIsFolderTrashHover(false);
    }
  }, [folderDragId]);

  const handleFolderItemPointerUp = useCallback((e: React.PointerEvent, itemId: string) => {
    clearLongPressTimer();
    if (folderDragId) {
      if (isFolderTrashHover && currentFolder) {
        setDrawerData(prev => {
          const next = { ...prev, order: [...prev.order], folders: { ...prev.folders } };
          next.folders[currentFolder].items = next.folders[currentFolder].items.filter(i => i !== folderDragId);
          next.order.push(folderDragId);
          return next;
        });
        if (navigator.vibrate) navigator.vibrate(50);
      }
      didReorderRef.current = true;
      setFolderDragId(null);
      setIsFolderTrashHover(false);
      setTimeout(() => didReorderRef.current = false, 100);
    }
  }, [folderDragId, isFolderTrashHover, currentFolder, clearLongPressTimer, setDrawerData]);

  const handleFolderItemClick = (e: React.MouseEvent, itemId: string) => {
    if (folderDragId || didReorderRef.current) return;
    const page = PAGE_MAP.get(itemId);
    if (page) {
      if (isPathBlocked(page.path)) return;
      
      setCurrentFolder(null);
      setIsOpen(false);
      
      startTransition(() => {
        navigate(page.path);
      });
    }
  };


  return (
    <>
      <style>{`
        @keyframes drawer-wiggle {
          0%, 100% { transform: rotate(-1.5deg) scale(1.01); }
          50% { transform: rotate(1.5deg) scale(1.01); }
        }
      `}</style>

      {/* OVERLAY BG FUNDO ESCURO (Otimizado: Sempre no DOM, opacidade via GPU) */}
      <div
        onClick={() => {
          if (isOpen && !currentFolder) {
            setIsOpen(false);
            setIsEditMode(false);
            setContextMenuTarget(null);
          }
        }}
        className="fixed inset-0 z-[9989] md:hidden transition-opacity duration-300 pointer-events-none"
        style={{ 
          background: "rgba(0,0,0,0.55)", 
          backdropFilter: "blur(2px)",
          opacity: isOpen && !currentFolder ? 1 : 0,
          pointerEvents: isOpen && !currentFolder ? "auto" : "none"
        }}
      />

      {/* DRAWER PRINCIPAL — Usa Framer Motion para deslize suave e controle de estado */}
      <motion.div
        initial={false}
        animate={isOpen ? "open" : "closed"}
        variants={{
          open: { y: drawerDragY > 0 ? drawerDragY : 0 },
          closed: { y: "calc(100% - 52px)" } // Menor área visível
        }}
        transition={{ type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.25 }}
        className="fixed bottom-0 left-0 right-0 z-[9990] md:hidden flex flex-col justify-end"
        style={{ 
          willChange: "transform",
          height: "92vh",
          pointerEvents: "auto",
        }}
        onPointerMove={isEditMode ? handleItemPointerMove : undefined}
      >
        <div
          className={[
            "relative w-full h-full rounded-t-3xl overflow-hidden flex flex-col",
            "border border-b-0 border-white/[0.08]",
          ].join(" ")}
          style={{
            background: "transparent",
            backdropFilter: "blur(24px) saturate(1.8) brightness(0.85)",
            WebkitBackdropFilter: "blur(24px) saturate(1.8) brightness(0.85)",
            boxShadow: [
              "0 -1px 0 rgba(255,255,255,0.08)",
              "0 -12px 48px rgba(0,0,0,0.75)",
              "0 -2px 16px rgba(168,85,247,0.15)",
              "inset 0 1px 0 rgba(255,255,255,0.05)",
            ].join(", "),
            paddingBottom: "env(safe-area-inset-bottom, 12px)",
          }}
        >
          {/* Fundo Tático Piso de Casa Azul - Quadrados Grandes */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(45deg, rgba(59,130,246,0.2) 25%, transparent 25%), 
                linear-gradient(-45deg, rgba(59,130,246,0.2) 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, rgba(59,130,246,0.2) 75%), 
                linear-gradient(-45deg, transparent 75%, rgba(59,130,246,0.2) 75%)
              `,
              backgroundSize: "100px 100px",
              backgroundPosition: "0 0, 0 50px, 50px -50px, -50px 0px",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: "linear-gradient(rgba(59,130,246,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.4) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />

          <div
            role="button"
            onTouchStart={handleDrawerTouchStart}
            onTouchMove={handleDrawerTouchMove}
            onTouchEnd={handleDrawerTouchEnd}
            onClick={toggleDrawer}
            className="flex flex-col items-center cursor-pointer select-none pt-1.5 w-full active:bg-white/5 transition-colors relative z-10"
          >
            <div
              className={[
                "h-1 rounded-full transition-all duration-300 mb-1.5",
                isOpen ? "bg-purple-400/60 w-10" : "bg-white/20 w-8",
              ].join(" ")}
            />
            {!isOpen && (
              <div className="flex items-center w-full px-4 pb-2">
                <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                  {(() => {
                    const activePage = ALL_PAGES.find((p) => location.pathname === p.path);
                    if (!activePage) return <span className="text-[12px] text-white/40 uppercase font-black tracking-widest">Menu</span>;
                    return (
                      <>
                        <span className="text-purple-300/80 scale-75 flex-shrink-0 origin-left">{activePage.icon}</span>
                        <span className="text-[9px] font-black text-purple-100 tracking-tighter uppercase drop-shadow-md line-clamp-2 max-w-[85px] leading-[0.9] text-left">
                          {activePage.name}
                        </span>
                      </>
                    );
                  })()}
                </div>

                <div className="flex-shrink-0 px-4 flex items-center gap-1 opacity-60">
                  <ChevronUpIcon className="w-3 h-3 text-white/70" />
                  <span className="text-[12px] font-black text-white/70 uppercase tracking-[0.1em] animate-pulse">Expandir Menu</span>
                </div>

                <div className="flex-1" />
              </div>
            )}
            {isOpen && <ChevronUpIcon className="w-4 h-4 text-white/30 rotate-180 mb-1" />}
          </div>

          <motion.div 
            initial={false}
            animate={{ opacity: isOpen ? 1 : 0 }}
            transition={{ duration: 0.15, ease: "linear" }}
            className="flex-1 flex flex-col relative z-20 min-h-0 w-full overflow-hidden"
            style={{ 
              pointerEvents: isOpen ? "auto" : "none",
              willChange: "opacity"
            }}
          >
            <div className="px-3 py-2 border-b border-white/[0.03] bg-white/[0.01] mb-2 flex-shrink-0">
              <div className="flex justify-center w-full px-2">
                <MobileHUDTimer />
              </div>
            </div>

            {/* Cabeçalho EDITAR Navegação Restourado */}
            <div className="flex items-center justify-between pl-4 pr-6 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                {activePage && (
                  <span className="text-[11px] font-black text-white uppercase tracking-widest drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] whitespace-nowrap">
                    {activePage.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-red-200 border border-red-500/20 bg-red-500/10 active:scale-95 transition-all"
                >
                  <ArrowLeftOnRectangleIcon className="w-4 h-4" /> <span>Sair</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={[
                    "flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95",
                    isEditMode 
                      ? "text-white border-emerald-400 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                      : "text-white/70 border-white/10 bg-white/5"
                  ].join(" ")}
                >
                  {isEditMode ? <CheckIcon className="w-4 h-4" /> : <PencilSquareIcon className="w-4 h-4" />}
                  <span>{isEditMode ? "Pronto" : "Editar"}</span>
                </button>
              </div>
            </div>

            {isEditMode && (
              <p className="px-5 pb-2 text-[10px] text-purple-300/60 leading-snug flex-shrink-0 animate-[fade-in_0.3s]">
                Modo Editar. Segure para arrastar ícones. Solte um em cima de outro para criar uma Pasta. Toque numa Pasta rápido para renomear/remover.
              </p>
            )}

            <div ref={gridRef} className="px-[12px] pt-1 pb-10 overflow-y-auto overflow-x-hidden flex-1"
              style={{ WebkitOverflowScrolling: "touch", touchAction: isEditMode ? "none" : "auto" }}>
              <div className="grid grid-cols-4 gap-x-4 gap-y-7 w-full">
                <AnimatePresence>
                  {currentViewItems.map((id) => {
                    const folder = drawerData.folders ? drawerData.folders[id] : undefined;
                    const page = PAGE_MAP.get(id);
                    if (!folder && !page) return null;

                    const isActive = folder ? folderContainingActivePage === id : location.pathname === page?.path;
                    const isDragging = draggingId === id;
                    const isDragOverAsGroup = dragOverId === id && dragAction === "group";

                    return (
                      <motion.div
                        layoutId={`v1-item-${id}`}
                        layout="position"
                        key={id}
                        data-drawer-id={id}
                        onPointerDown={(e: any) => handleItemPointerDown(e, id)}
                        onPointerUp={(e: any) => { e.preventDefault(); handleItemPointerUp(e, id); }}
                        onPointerCancel={(e: any) => { e.preventDefault(); handleItemPointerUp(e, id); }}
                        onClick={(e: any) => handleItemPress(e, id, page?.path)}
                        className={[
                          "relative w-full select-none cursor-pointer flex justify-center",
                          isDragOverAsGroup ? "ring-2 ring-emerald-400/80 rounded-xl bg-emerald-400/20 z-[60] scale-105" : "z-0",
                        ].join(" ")}
                        initial={false}
                        animate={{ scale: isDragging ? 0.9 : 1, zIndex: isDragging ? 99 : 0, opacity: isDragging ? 0.5 : 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      >
                        <div className="w-full">
                          {folder ? (
                            <DrawerFolderItem folder={folder} isActive={isActive} isEditMode={isEditMode} isDragging={false} onPress={() => { }} />
                          ) : (
                            <DrawerItem 
                              page={page!} 
                              isActive={isActive} 
                              isEditMode={isEditMode} 
                              isDragging={false} 
                              onPress={() => { }} 
                              isBlocked={isPathBlocked(page!.path)}
                            />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Gatilho de Fechamento Inferior - UX Mobile Premium */}
            <div
              className="w-full flex flex-col items-center cursor-pointer select-none pb-[env(safe-area-inset-bottom,1rem)] pt-2 active:bg-white/5 transition-colors relative z-10 border-t border-white/[0.03] bg-transparent backdrop-blur-sm mt-auto h-[52px] justify-center"
              onClick={(e) => { e.stopPropagation(); toggleDrawer(); }}
            >
              <div className="flex items-center justify-center w-full px-5 mb-1.5 gap-1 opacity-60">
                <ChevronUpIcon className="w-3 h-3 text-white/70 rotate-180" />
                <span className="text-[12px] font-black text-white/70 uppercase tracking-[0.1em] animate-pulse">Recolher Menu</span>
              </div>

              {/* Handle Mirroring Top */}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* MENU CONTEXTUAL PARA PASTAS (Renomear/Excluir) via Clicar Longo ou Clicar da Pasta no Modo Edit */}
      <AnimatePresence>
        {contextMenuTarget && drawerData.folders[contextMenuTarget.id] && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/40"
            onClick={() => setContextMenuTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bg-gray-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-w-[170px]"
              style={{
                top: `clamp(20px, ${contextMenuTarget.y - 120}px, 80vh)`,
                left: `clamp(20px, ${contextMenuTarget.x - 85}px, calc(100vw - 190px))`
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="px-4 py-2 border-b border-white/5 text-[10px] text-emerald-400/70 font-bold tracking-widest text-center uppercase bg-emerald-500/5">
                {drawerData.folders[contextMenuTarget.id].name}
              </div>
              <button
                className="px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5"
                onClick={() => {
                  const newName = window.prompt("Digite o novo nome da pasta:", drawerData.folders[contextMenuTarget.id].name);
                  if (newName) setDrawerData(prev => ({ ...prev, folders: { ...prev.folders, [contextMenuTarget.id]: { ...prev.folders[contextMenuTarget.id], name: newName } } }));
                  setContextMenuTarget(null);
                }}
              >
                Renomear Pastinha
              </button>
              <button
                className="px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-400/10 active:bg-red-400/20 transition-colors"
                onClick={() => {
                  setDrawerData(prev => {
                    const next = { ...prev, order: [...prev.order], folders: { ...prev.folders } };
                    const targetItems = next.folders[contextMenuTarget.id].items;
                    next.order = next.order.filter(i => i !== contextMenuTarget.id).concat(targetItems);
                    delete next.folders[contextMenuTarget.id];
                    return next;
                  });
                  setContextMenuTarget(null);
                }}
              >
                Remover Pasta
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* PASTA MODAL - DESIGN PREMIUM GLASSMORPHISM */}
      <AnimatePresence>
        {currentFolder && drawerData.folders[currentFolder] && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/20 backdrop-blur-[6px] touch-none"
            onPointerMove={handleFolderItemPointerMove}
            onClick={(e) => {
              if (e.target === e.currentTarget && !folderDragId) setCurrentFolder(null);
            }}
          >
            <AnimatePresence>
              {folderDragId && (
                <motion.div
                  initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
                  className={["fixed top-[8vh] left-1/2 -translate-x-1/2 px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-300 z-[9999]",
                    isFolderTrashHover ? "bg-red-500/90 text-white scale-110 shadow-[0_0_30px_rgba(239,68,68,0.5)]" : "bg-black/40 border border-white/20 backdrop-blur-md text-white/70 shadow-xl"
                  ].join(" ")}
                >
                  <TrashIcon className="w-5 h-5" />
                  <span className="text-[11px] font-bold uppercase tracking-widest">{isFolderTrashHover ? "Soltar aqui" : "Remover do Grupo"}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="w-[92%] max-w-[360px] p-8 rounded-[3rem] bg-gradient-to-br from-white/12 via-white/5 to-transparent border border-white/20 backdrop-blur-2xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] flex flex-col items-center pointer-events-auto relative overflow-hidden"
              style={{ willChange: "transform, opacity" }}
              onClick={(e) => { if (!folderDragId) e.stopPropagation(); }}
            >
              {/* Decorative Glows */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />

              <div className="w-full flex flex-col items-center mb-8 relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-white font-bold text-2xl text-center tracking-tight drop-shadow-lg">
                    {drawerData.folders[currentFolder].name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newName = window.prompt("Novo nome da pasta:", drawerData.folders[currentFolder!].name);
                      if (newName) setDrawerData(prev => ({ ...prev, folders: { ...prev.folders, [currentFolder!]: { ...prev.folders[currentFolder!], name: newName } } }));
                    }}
                    className={["p-2 rounded-2xl bg-white/10 border border-white/10 active:scale-90 transition-all hover:bg-white/20", FOLDER_COLORS[drawerData.folders[currentFolder].color || 'emerald']?.text || 'text-emerald-300'].join(" ")}
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const folderId = currentFolder!;
                      setDrawerData(prev => {
                        const next = { ...prev, order: [...prev.order], folders: { ...prev.folders } };
                        const targetItems = next.folders[folderId].items;
                        next.order = next.order.filter(id => id !== folderId).concat(targetItems);
                        delete next.folders[folderId];
                        return next;
                      });
                      setCurrentFolder(null);
                    }}
                    className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-red-400/90 text-[10px] font-bold uppercase tracking-[0.2em] active:scale-95 transition-all hover:bg-red-500/10 hover:border-red-500/30 shadow-sm"
                  >
                    <TrashIcon className="w-4 h-4" /> Desagrupar
                  </button>

                  <div className="flex flex-col items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Personalizar Cor</span>
                    <div className="flex items-center gap-2.5">
                      {Object.keys(FOLDER_COLORS).map(colorK => {
                        const isSel = (drawerData.folders[currentFolder!].color || 'emerald') === colorK;
                        const c = FOLDER_COLORS[colorK];
                        return (
                          <button
                            key={colorK}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawerData(prev => ({
                                ...prev,
                                folders: {
                                  ...prev.folders,
                                  [currentFolder!]: { ...prev.folders[currentFolder!], color: colorK }
                                }
                              }));
                              if (navigator.vibrate) navigator.vibrate(40);
                            }}
                            className={[
                              "w-7 h-7 rounded-full border-2 transition-all duration-300 relative",
                              c.solid,
                              isSel ? "border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)]" : "border-white/10 hover:border-white/20"
                            ].join(" ")}
                          >
                            {isSel && (
                              <div className="absolute -inset-[4px] border border-white/20 rounded-full animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full grid grid-cols-4 gap-y-8 gap-x-5 relative z-10 px-2">
                {drawerData.folders[currentFolder].items.map(itemId => {
                  const page = PAGE_MAP.get(itemId);
                  if (!page) return null;
                  const isDragging = folderDragId === itemId;
                  const isActive = location.pathname === page.path;
                  const isBlocked = isPathBlocked(page.path);

                  return (
                    <motion.div
                      key={itemId}
                      className={[
                        "relative flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 transition-all duration-300 select-none w-full outline-none active:scale-95",
                        isBlocked ? "opacity-30 cursor-not-allowed" : (isActive ? "bg-purple-500/20 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.35)]" : "text-slate-300 hover:bg-white/5"),
                        isEditMode && !isDragging ? "animate-[drawer-wiggle_0.45s_ease-in-out_infinite]" : "",
                      ].join(" ")}
                      onPointerDown={isBlocked && !isEditMode ? undefined : (e: any) => handleFolderItemPointerDown(e, itemId)}
                      onPointerUp={(e: any) => { e.preventDefault(); handleFolderItemPointerUp(e, itemId); }}
                      onClick={(e: any) => handleFolderItemClick(e, itemId)}
                      animate={{ scale: isDragging ? 0.8 : 1, opacity: isDragging ? 0.3 : 1 }}
                    >
                      <div className={[
                        "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 pointer-events-none relative",
                        isBlocked ? "border-zinc-800 bg-black/40 grayscale" : (isActive ? "border-purple-500/60 bg-purple-600/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "border-white/10 bg-white/5"),
                      ].join(" ")}>
                        {isBlocked ? <LockIcon className="w-8 h-8 text-zinc-700/50" /> : React.cloneElement(page.icon as React.ReactElement, { className: "w-7 h-7" })}
                        {isActive && !isBlocked && <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />}
                      </div>
                      <span className={[
                        "text-[11px] font-bold leading-tight text-center max-w-[72px] line-clamp-2 transition-colors",
                        isBlocked ? "text-zinc-600 line-through decoration-zinc-700" : (isActive ? "text-purple-300" : "text-slate-300")
                      ].join(" ")}>{page.name}</span>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileAppDrawer;
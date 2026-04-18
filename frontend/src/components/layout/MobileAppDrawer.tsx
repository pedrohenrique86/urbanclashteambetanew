import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  memo,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  ChevronUpIcon,
  XMarkIcon,
  PencilSquareIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { useDrawerOrder } from "../../hooks/useDrawerOrder";
import { useGameClock } from "../../hooks/useGameClock";

// Formatadores locais — mesma lógica do GameClockDisplay, sem importar o componente
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

interface DrawerPage {
  id: string;
  name: string;
  path: string;
  icon: React.ReactNode;
  category: string;
}

const ALL_PAGES: DrawerPage[] = [
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
];

const DEFAULT_ORDER = ALL_PAGES.map((p) => p.id);
const PAGE_MAP = new Map(ALL_PAGES.map((p) => [p.id, p]));

const HANDLE_HEIGHT = 40;
const COLLAPSED_PB = 0;
const SNAP_OPEN_PX = 80;
const SNAP_CLOSE_PX = 60;
const LONG_PRESS_MS = 180;

interface DrawerItemProps {
  page: DrawerPage;
  isActive: boolean;
  isEditMode: boolean;
  isDragging: boolean;
  onPress: () => void;
}

const DrawerItem = memo(function DrawerItem({
  page,
  isActive,
  isEditMode,
  isDragging,
  onPress,
}: DrawerItemProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      role="menuitem"
      aria-label={`Navegar para ${page.name}`}
      className={[
        "relative flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 transition-all duration-150 select-none w-full",
        isActive
          ? "bg-purple-500/20 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.35)]"
          : "text-slate-300 hover:text-white hover:bg-white/5",
        isEditMode && !isDragging
          ? "animate-[drawer-wiggle_0.45s_ease-in-out_infinite]"
          : "",
        isDragging ? "opacity-50 scale-95 z-50" : "",
      ].join(" ")}
    >
      <div
        className={[
          "w-11 h-11 rounded-2xl flex items-center justify-center",
          "border transition-all duration-150",
          isActive
            ? "border-purple-500/60 bg-purple-600/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
            : "border-white/10 bg-white/5",
        ].join(" ")}
      >
        {page.icon}
      </div>

      <span className="text-[10px] font-medium leading-tight text-center max-w-[68px] line-clamp-2">
        {page.name}
      </span>

      {isActive && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_4px_rgba(168,85,247,0.8)]" />
      )}
    </button>
  );
});

export const MobileAppDrawer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [drawerDragY, setDrawerDragY] = useState(0);
  const drawerTouchStartY = useRef<number | null>(null);
  const drawerIsDragging = useRef(false);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didReorderRef = useRef(false);

  const gridRef = useRef<HTMLDivElement>(null);

  const [order, setOrder] = useDrawerOrder(DEFAULT_ORDER);

  // Reutiliza o hook existente — sem polling, sem chamada de rede
  const { remainingTime, status, serverTime } = useGameClock();

  const orderedPages = useMemo(
    () => order.map((id) => PAGE_MAP.get(id)).filter((p): p is DrawerPage => !!p),
    [order]
  );

  useEffect(() => {
    setIsOpen(false);
    setIsEditMode(false);
    setDraggingId(null);
    setDragOverId(null);
    didReorderRef.current = false;
  }, [location.pathname]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  const handleDrawerTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isEditMode) return;
      drawerTouchStartY.current = e.touches[0].clientY;
      drawerIsDragging.current = false;
    },
    [isEditMode]
  );

  const handleDrawerTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (drawerTouchStartY.current === null || isEditMode) return;

      const dy = e.touches[0].clientY - drawerTouchStartY.current;
      drawerIsDragging.current = Math.abs(dy) > 8;

      if (!isOpen && dy < 0) {
        setDrawerDragY(Math.max(dy, -200));
      } else if (isOpen && dy > 0) {
        setDrawerDragY(Math.min(dy, 150));
      }
    },
    [isOpen, isEditMode]
  );

  const handleDrawerTouchEnd = useCallback(() => {
    if (drawerTouchStartY.current === null) return;

    // Se houve drag real
    if (drawerIsDragging.current) {
      if (!isOpen && drawerDragY < -SNAP_OPEN_PX) {
        setIsOpen(true);
      } else if (isOpen && drawerDragY > SNAP_CLOSE_PX) {
        setIsOpen(false);
        setIsEditMode(false);
      }
    }

    setDrawerDragY(0);
    drawerTouchStartY.current = null;
    drawerIsDragging.current = false;
  }, [isOpen, drawerDragY]);

  const toggleDrawer = useCallback(() => {
    // Se estava arrastando não interagir (prevent ghost click)
    if (drawerIsDragging.current) return;
    
    setIsOpen((prev) => {
      if (prev) setIsEditMode(false);
      return !prev;
    });
  }, []);

  const handleItemPointerDown = useCallback(
    (id: string) => {
      if (!isEditMode) return;

      didReorderRef.current = false;
      clearLongPressTimer();

      longPressTimer.current = setTimeout(() => {
        setDraggingId(id);
      }, LONG_PRESS_MS);
    },
    [isEditMode, clearLongPressTimer]
  );

  const handleItemPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId || !gridRef.current) return;

      e.preventDefault();

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const btn = el?.closest("[data-drawer-id]");
      const overId = btn?.getAttribute("data-drawer-id") ?? null;

      if (overId && overId !== draggingId) {
        setDragOverId(overId);
      }
    },
    [draggingId]
  );

  const handleItemPointerUp = useCallback(() => {
    clearLongPressTimer();

    if (draggingId && dragOverId && draggingId !== dragOverId) {
      setOrder((prev) => {
        const arr = [...prev];
        const fromIdx = arr.indexOf(draggingId);
        const toIdx = arr.indexOf(dragOverId);

        if (fromIdx < 0 || toIdx < 0) return prev;

        arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, draggingId);
        return arr;
      });

      didReorderRef.current = true;
    }

    setDraggingId(null);
    setDragOverId(null);

    requestAnimationFrame(() => {
      didReorderRef.current = false;
    });
  }, [draggingId, dragOverId, setOrder, clearLongPressTimer]);

  const handleNavigate = useCallback(
    (path: string) => {
      if (isEditMode || draggingId || didReorderRef.current) return;
      navigate(path);
      setIsOpen(false);
    },
    [navigate, isEditMode, draggingId]
  );

  const drawerTranslateY = isOpen
    ? Math.max(0, drawerDragY)
    : -Math.min(-drawerDragY, 200);

  return (
    <>
      <style>{`
        @keyframes drawer-wiggle {
          0%, 100% { transform: rotate(-1.5deg) scale(1.02); }
          50% { transform: rotate(1.5deg) scale(1.02); }
        }
      `}</style>

      {isOpen && (
        <div
          onClick={() => {
            setIsOpen(false);
            setIsEditMode(false);
            setDraggingId(null);
            setDragOverId(null);
            clearLongPressTimer();
          }}
          className="fixed inset-0 z-[9989] md:hidden"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
          aria-hidden="true"
        />
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-[9990] md:hidden transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${isOpen ? Math.max(0, drawerDragY) : "0"})`,
          willChange: "transform",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          touchAction: isEditMode ? "none" : "pan-y",
        }}
        onPointerMove={isEditMode ? handleItemPointerMove : undefined}
        onPointerUp={isEditMode ? handleItemPointerUp : undefined}
        onPointerLeave={isEditMode ? handleItemPointerUp : undefined}
        onPointerCancel={isEditMode ? handleItemPointerUp : undefined}
      >
        <div
          className={[
            "relative w-full rounded-t-3xl overflow-hidden",
            "border border-b-0 border-white/10",
            "bg-gradient-to-b from-gray-900/95 to-black/98",
          ].join(" ")}
          style={{
            boxShadow: [
              "0 -1px 0 rgba(255,255,255,0.06)",
              "0 -8px 32px rgba(0,0,0,0.8)",
              "0 -2px 12px rgba(168,85,247,0.12)",
            ].join(", "),
            backdropFilter: "blur(24px) saturate(1.5)",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                "linear-gradient(rgba(168,85,247,1) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,1) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div
            role="button"
            aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
            onTouchStart={handleDrawerTouchStart}
            onTouchMove={handleDrawerTouchMove}
            onTouchEnd={handleDrawerTouchEnd}
            onClick={toggleDrawer}
            className="flex flex-col items-center cursor-pointer select-none pt-1.5 w-full active:bg-white/5 transition-colors"
          >
            {/* Drag pill — sempre visível */}
            <div
              className={[
                "h-1 rounded-full transition-all duration-300 mb-1.5",
                isOpen ? "bg-purple-400/60 w-10" : "bg-white/20 w-8",
              ].join(" ")}
            />

            {/* Quando fechado: linha compacta com página ativa + chevron */}
            {!isOpen && (
              <div className="flex items-center justify-between w-full px-4 pb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {(() => {
                    const activePage = orderedPages.find((p) => location.pathname === p.path);
                    if (!activePage) return <span className="text-[11px] text-white/30">Menu</span>;
                    return (
                      <>
                        <span className="text-purple-300/70 scale-75 flex-shrink-0 origin-left">{activePage.icon}</span>
                        <span className="text-[11px] font-semibold text-purple-200/80 tracking-wide truncate">{activePage.name}</span>
                        <span className="w-1 h-1 rounded-full bg-purple-400/80 shadow-[0_0_4px_rgba(168,85,247,0.8)] flex-shrink-0 ml-0.5" />
                      </>
                    );
                  })()}
                </div>
                <ChevronUpIcon className="w-3.5 h-3.5 text-white/25 flex-shrink-0 ml-2" />
              </div>
            )}

            {/* Quando aberto: só o chevron invertido */}
            {isOpen && (
              <ChevronUpIcon className="w-4 h-4 text-white/30 rotate-180 mb-1" />
            )}
          </div>

          <div
            className="overflow-hidden transition-all duration-350 ease-in-out"
            style={{
              maxHeight: isOpen ? "70vh" : "0px",
              opacity: isOpen ? 1 : 0,
            }}
          >
            {/* Relógio — 1 linha: status · cronômetro | hora servidor */}
            <div className="flex items-center justify-between px-5 py-1.5 border-b border-white/5 mb-2 gap-2">
              <div className={`flex items-center gap-1.5 font-mono text-[10px] font-bold flex-shrink-0 ${STATUS_COLOR[status] ?? "text-gray-500"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                <span>{STATUS_LABEL[status] ?? "..."}</span>
                <span className="text-white/20">·</span>
                <span>{fmtTimer(remainingTime)}</span>
              </div>
              <span className="font-mono text-[9px] text-gray-400 whitespace-nowrap truncate">
                {fmtSrvTime(serverTime)}
              </span>
            </div>

            <div className="flex items-center justify-between px-5 pb-2">
              <span className="text-[10px] font-semibold tracking-widest text-purple-400/70 uppercase">
                Navegação
              </span>

              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMode(false);
                      setDraggingId(null);
                      setDragOverId(null);
                      clearLongPressTimer();
                    }}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 active:scale-95 transition-all"
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                    Pronto
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-400 border border-white/10 bg-white/5 active:scale-95 transition-all"
                  >
                    <PencilSquareIcon className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsEditMode(false);
                    setDraggingId(null);
                    setDragOverId(null);
                    clearLongPressTimer();
                  }}
                  aria-label="Fechar menu"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all active:scale-95"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isEditMode && (
              <p className="px-5 pb-2 text-[10px] text-purple-300/60 leading-snug">
                Segure e arraste os ícones para reorganizar. A ordem é salva automaticamente.
              </p>
            )}

            <div
              ref={gridRef}
              role="menu"
              className="grid grid-cols-4 px-3 pb-4 gap-2 overflow-y-auto"
              style={{ maxHeight: "52vh" }}
            >
              {orderedPages.map((page) => {
                const isActive = location.pathname === page.path;
                const isDragging = draggingId === page.id;
                const isDragOver = dragOverId === page.id;

                return (
                  <div
                    key={page.id}
                    data-drawer-id={page.id}
                    onPointerDown={() => handleItemPointerDown(page.id)}
                    onPointerCancel={handleItemPointerUp}
                    className={[
                      "relative transition-all duration-150",
                      isDragOver && draggingId !== page.id
                        ? "scale-105 ring-1 ring-purple-400/60 rounded-xl"
                        : "",
                    ].join(" ")}
                    style={{ touchAction: isEditMode ? "none" : "auto" }}
                  >
                    <DrawerItem
                      page={page}
                      isActive={isActive}
                      isEditMode={isEditMode}
                      isDragging={isDragging}
                      onPress={() => handleNavigate(page.path)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="px-5 pb-3 flex items-center gap-2">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[9px] text-white/20 tracking-widest uppercase">
                {orderedPages.find((p) => location.pathname === p.path)?.category ?? ""}
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
          </div>


        </div>
      </div>
    </>
  );
};

export default MobileAppDrawer;
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from "react";

export type HUDPanel =
  | { type: "user"; id: string }
  | { type: "clan"; id: string };

interface IHUDContext {
  panelStack: HUDPanel[];
  currentPanel: HUDPanel | null;
  openUserPanel: (id: string) => void;
  openClanPanel: (id: string) => void;
  closePanel: () => void;
  goBackPanel: () => void;
  clearPanels: () => void;
  hasOpenPanel: boolean;
  isMobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;
}

const HUDContext = createContext<IHUDContext | undefined>(undefined);

export const HUDProvider = ({ children }: { children: ReactNode }) => {
  const [panelStack, setPanelStack] = useState<HUDPanel[]>([]);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const openUserPanel = useCallback((id: string) => {
    if (!id) return;
    setPanelStack((prev) => [...prev, { type: "user", id }]);
  }, []);

  const openClanPanel = useCallback((id: string) => {
    if (!id) return;
    setPanelStack((prev) => [...prev, { type: "clan", id }]);
  }, []);

  const closePanel = useCallback(() => {
    setPanelStack((prev) => prev.slice(0, -1));
  }, []);

  const goBackPanel = useCallback(() => {
    setPanelStack((prev) => prev.slice(0, -1));
  }, []);

  const clearPanels = useCallback(() => {
    setPanelStack([]);
  }, []);

  const value = useMemo<IHUDContext>(() => {
    const currentPanel =
      panelStack.length > 0 ? panelStack[panelStack.length - 1] : null;

    return {
      panelStack,
      currentPanel,
      openUserPanel,
      openClanPanel,
      closePanel,
      goBackPanel,
      clearPanels,
      hasOpenPanel: panelStack.length > 0,
      isMobileDrawerOpen,
      setMobileDrawerOpen,
    };
  }, [
    panelStack,
    openUserPanel,
    openClanPanel,
    closePanel,
    goBackPanel,
    clearPanels,
    isMobileDrawerOpen,
    setMobileDrawerOpen,
  ]);

  return <HUDContext.Provider value={value}>{children}</HUDContext.Provider>;
};

export const useHUD = () => {
  const context = useContext(HUDContext);

  if (!context) {
    throw new Error("useHUD must be used within a HUDProvider");
  }

  return context;
};
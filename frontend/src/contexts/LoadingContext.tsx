import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface LoadingState {
  isVisible: boolean;
  message: string;
}

interface LoadingContextType {
  loadingState: LoadingState;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({
  children,
}) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isVisible: false,
    message: "Carregando...",
  });

  const showLoading = useCallback((message = "Carregando...") => {
    setLoadingState({ isVisible: true, message });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState({ isVisible: false, message: "" });
  }, []);

  const value = { loadingState, showLoading, hideLoading };

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
};
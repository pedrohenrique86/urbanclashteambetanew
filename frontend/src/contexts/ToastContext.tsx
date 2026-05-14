import React, { createContext, useContext, useState, ReactNode } from 'react';
import Toast from '../components/Toast';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState({
    message: '',
    type: 'info' as ToastType,
    show: false,
    duration: 3000
  });

  const showToast = (message: string, type: ToastType, duration = 3000) => {
    setToast({
      message,
      type,
      show: true,
      duration
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  // SÊNIOR PATTERN: Listener universal para disparar toasts via eventos globais
  // Isso permite disparar toasts de arquivos .ts/.js puros (ex: api.ts)
  React.useEffect(() => {
    const handleGlobalToast = (event: any) => {
      const { message, type, duration } = event.detail || {};
      if (message && type) {
        showToast(message, type, duration || 3000);
      }
    };

    window.addEventListener('toast:show' as any, handleGlobalToast);
    return () => window.removeEventListener('toast:show' as any, handleGlobalToast);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        duration={toast.duration}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
}
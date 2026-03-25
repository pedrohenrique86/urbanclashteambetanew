export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  hideToast: () => void;
}
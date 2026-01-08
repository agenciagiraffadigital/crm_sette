import { useState, useCallback } from 'react';
import { ToastProps } from '../components/ui/Toast';

export interface ToastManager {
  show: (toast: Omit<ToastProps, 'id' | 'onDismiss'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const useToast = (): ToastManager & { toasts: ToastProps[] } => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const show = useCallback((toast: Omit<ToastProps, 'id' | 'onDismiss'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastProps = {
      ...toast,
      id,
      onDismiss: (toastId: string) => dismiss(toastId)
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    show,
    dismiss,
    dismissAll
  };
};
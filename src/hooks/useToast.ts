import { useAppStore } from '../store/useAppStore';

export function useToast() {
  const toasts = useAppStore(s => s.toasts);
  const popToast = useAppStore(s => s.popToast);
  return { toasts, popToast };
}
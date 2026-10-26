export interface ToastMessage {
  id: number;
  text: string;
  /** ms; 0 keeps it until dismissed or replaced. */
  duration: number;
}

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(toasts));
}

export function showToast(text: string, duration = 1600): void {
  const toast = { id: nextId++, text, duration };
  toasts = [toast, ...toasts].slice(0, 3);
  emit();
  if (duration > 0) {
    setTimeout(() => dismissToast(toast.id), duration);
  }
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function clearToasts(): void {
  toasts = [];
  emit();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

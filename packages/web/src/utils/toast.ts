// Toast notification utilities

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function pushToast(
  kind: ToastKind,
  message: string,
  title?: string,
  action?: { label: string; run: () => void }
): void {
  try {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const detail: ToastItem = {
      id,
      kind,
      message,
      ...(title !== undefined && { title }),
      ...(action?.label !== undefined && { actionLabel: action.label }),
      ...(action?.run !== undefined && { onAction: action.run }),
    };
    window.dispatchEvent(new CustomEvent('toast:push', { detail }));
  } catch {
    // fallback if events fail
    // eslint-disable-next-line no-alert
    alert(message);
  }
}

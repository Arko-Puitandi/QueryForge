import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Helper to ensure message is always a string
const normalizeMessage = (message: any): string | undefined => {
  if (message === undefined || message === null) return undefined;
  if (typeof message === 'string') return message;
  if (typeof message === 'object') {
    // Handle error objects with message property
    if (message.message && typeof message.message === 'string') {
      return message.message;
    }
    // Try to stringify
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
  return String(message);
};

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  
  addNotification: (notification) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification = { 
      ...notification, 
      id,
      message: normalizeMessage(notification.message),
    };
    
    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto-remove after duration (default 5 seconds)
    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }
  },
  
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  
  clearNotifications: () => set({ notifications: [] }),
}));

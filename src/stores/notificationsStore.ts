import { create } from 'zustand';

export type NotifType = 'quote' | 'company' | 'system';

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  data?: Record<string, unknown>;
}

interface NotificationsState {
  items: AppNotification[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

let nextId = 1;

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],

  addNotification: (notif) =>
    set((s) => ({
      items: [
        { ...notif, id: String(nextId++), read: false },
        ...s.items,
      ],
    })),

  markRead: (id) =>
    set((s) => ({ items: s.items.map((n) => n.id === id ? { ...n, read: true } : n) })),

  markAllRead: () =>
    set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),

  clearAll: () => set({ items: [] }),
}));

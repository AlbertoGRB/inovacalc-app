import { create } from 'zustand';

export type NotifType = 'quote' | 'company' | 'system';

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const INITIAL: AppNotification[] = [
  { id: '1', type: 'quote',   title: 'Orçamento aprovado',     body: 'ORC-2025-001 aprovado pelo cliente.',     time: 'Agora mesmo',   read: false },
  { id: '2', type: 'company', title: 'Nova empresa cadastrada', body: 'Construtora ABC adicionada com sucesso.', time: '5 min atrás',   read: false },
  { id: '3', type: 'system',  title: 'Atualização disponível', body: 'Nova versão do InovaCalc disponível.',    time: '1 hora atrás',  read: true  },
  { id: '4', type: 'quote',   title: 'Orçamento enviado',      body: 'ORC-2025-002 enviado p/ Indústria XYZ.', time: '2 horas atrás', read: true  },
  { id: '5', type: 'company', title: 'Empresa atualizada',     body: 'Dados de Metalúrgica Santos atualizados.', time: 'Ontem',        read: true  },
];

interface NotificationsState {
  items: AppNotification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: INITIAL,
  markRead: (id) =>
    set((s) => ({ items: s.items.map((n) => n.id === id ? { ...n, read: true } : n) })),
  markAllRead: () =>
    set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),
  clearAll: () => set({ items: [] }),
}));

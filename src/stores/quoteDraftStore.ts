import { create } from 'zustand';

interface QuoteDraftState {
  companyId: string | null;
  setCompanyId: (id: string | null) => void;
  reset: () => void;
}

export const useQuoteDraft = create<QuoteDraftState>((set) => ({
  companyId: null,
  setCompanyId: (id) => set({ companyId: id }),
  reset: () => set({ companyId: null }),
}));

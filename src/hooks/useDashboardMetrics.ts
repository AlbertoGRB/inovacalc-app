import { useMemo } from 'react';
import { useQuotes } from './useQuotes';
import { useCompanies } from './useCompanies';
import { useAuthStore } from '@/stores/authStore';
import type { Quote } from '@/types/database';

export interface MonthTrend {
  label: string;
  value: number;
}

export interface SellerRanking {
  userId: string;
  name: string;
  count: number;
  revenue: number;
}

export function useDashboardMetrics() {
  const { data: quotes = [] } = useQuotes();
  const { data: companies = [] } = useCompanies();
  const profile = useAuthStore(s => s.profile);

  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Total quotes
    const totalQuotes = quotes.length;

    // Active companies (those with at least one quote)
    const companyIdsWithQuotes = new Set(quotes.map(q => q.company_id));
    const activeCompanies = companies.filter(c => companyIdsWithQuotes.has(c.id)).length;

    // This month quotes
    const thisMonthQuotes = quotes.filter(q => {
      const d = new Date(q.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // Monthly revenue (approved quotes this month)
    const monthlyRevenue = thisMonthQuotes
      .filter(q => q.status === 'APPROVED')
      .reduce((acc, q) => acc + (q.total_value ?? 0), 0);

    // Conversion rate (approved / total, excluding drafts)
    const nonDrafts = quotes.filter(q => q.status !== 'DRAFT');
    const approved = quotes.filter(q => q.status === 'APPROVED');
    const conversionRate = nonDrafts.length > 0
      ? Math.round((approved.length / nonDrafts.length) * 100)
      : 0;

    // 6-month trend
    const trend: MonthTrend[] = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthQuotes = quotes.filter(q => {
        const qd = new Date(q.created_at);
        return qd.getMonth() === m && qd.getFullYear() === y;
      });
      const revenue = monthQuotes.reduce((acc, q) => acc + (q.total_value ?? 0), 0);
      trend.push({ label: monthNames[m], value: revenue });
    }

    // Status breakdown
    const statusBreakdown = {
      DRAFT: quotes.filter(q => q.status === 'DRAFT').length,
      SENT: quotes.filter(q => q.status === 'SENT').length,
      APPROVED: approved.length,
      REJECTED: quotes.filter(q => q.status === 'REJECTED').length,
      EXPIRED: quotes.filter(q => q.status === 'EXPIRED').length,
    };

    // Seller ranking (only for ADMIN/MANAGER)
    const isAdminOrManager = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';
    let sellerRanking: SellerRanking[] = [];
    if (isAdminOrManager) {
      const byUser = new Map<string, { count: number; revenue: number }>();
      for (const q of quotes) {
        if (!q.created_by) continue;
        const entry = byUser.get(q.created_by) ?? { count: 0, revenue: 0 };
        entry.count += 1;
        entry.revenue += q.total_value ?? 0;
        byUser.set(q.created_by, entry);
      }
      sellerRanking = Array.from(byUser.entries())
        .map(([userId, data]) => ({ userId, name: userId.slice(0, 8), ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    }

    return {
      totalQuotes,
      activeCompanies,
      monthlyRevenue,
      conversionRate,
      trend,
      statusBreakdown,
      sellerRanking,
      isAdminOrManager,
      thisMonthCount: thisMonthQuotes.length,
    };
  }, [quotes, companies, profile]);
}

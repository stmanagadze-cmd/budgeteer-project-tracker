import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Invoice } from "@/types/invoice";
import { Company } from "@/types/company";
import { Client } from "@/types/client";

export interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
  activeClients: number;
  totalHoldbacks: number;
  holdbacksByCompany: { companyName: string; amount: number }[];
  upcomingIncome: number;
  unpaidInvoices: Invoice[];
  incomeByMonth: { month: string; income: number; expenses: number }[];
  incomeByCompany: { company: string; value: number }[];
}

export const useDashboardData = (userId?: string, selectedCompanyIds: string[] = []) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const [invoicesRes, companiesRes, clientsRes] = await Promise.all([
          supabase
            .from("invoices")
            .select("*")
            .eq("user_id", userId)
            .order("invoice_date", { ascending: false }),
          supabase
            .from("companies")
            .select("*")
            .eq("user_id", userId),
          supabase
            .from("clients")
            .select("*")
            .eq("user_id", userId),
        ]);

        if (invoicesRes.error) throw invoicesRes.error;
        if (companiesRes.error) throw companiesRes.error;
        if (clientsRes.error) throw clientsRes.error;

        setInvoices(invoicesRes.data || []);
        setCompanies(companiesRes.data || []);
        setClients(clientsRes.data || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel("dashboard_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices", filter: `user_id=eq.${userId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const dashboardData = useMemo((): DashboardData => {
    // Filter invoices by selected companies
    const filteredInvoices = selectedCompanyIds.length > 0
      ? invoices.filter(inv => inv.company_id && selectedCompanyIds.includes(inv.company_id))
      : invoices;

    // Calculate total income (sum of all paid invoices)
    const paidInvoices = filteredInvoices.filter(inv => 
      inv.status === "paid_by_holdback" || inv.status === "fully_paid"
    );
    const totalIncome = paidInvoices.reduce((sum, inv) => sum + (inv.total_payable || 0), 0);

    // Mock expenses (30% of income for demo purposes)
    const totalExpenses = totalIncome * 0.3;

    const currentBalance = totalIncome - totalExpenses;

    // Calculate active clients (unique clients with unpaid invoices)
    const unpaidInvoices = filteredInvoices.filter(inv => inv.status === "unpaid");
    const activeClientIds = new Set(unpaidInvoices.map(inv => inv.client_id).filter(Boolean));
    const activeClients = activeClientIds.size;

    // Calculate total holdbacks
    const holdbackInvoices = filteredInvoices.filter(inv => inv.holdback_enabled);
    const totalHoldbacks = holdbackInvoices.reduce((sum, inv) => sum + (inv.holdback_amount || 0), 0);

    // Holdbacks by company
    const holdbacksByCompanyMap = new Map<string, number>();
    holdbackInvoices.forEach(inv => {
      if (inv.company_id) {
        const company = companies.find(c => c.id === inv.company_id);
        const companyName = company?.name || "Unknown";
        holdbacksByCompanyMap.set(
          companyName,
          (holdbacksByCompanyMap.get(companyName) || 0) + (inv.holdback_amount || 0)
        );
      }
    });
    const holdbacksByCompany = Array.from(holdbacksByCompanyMap.entries()).map(([companyName, amount]) => ({
      companyName,
      amount,
    }));

    // Calculate upcoming income (unpaid invoices)
    const upcomingIncome = unpaidInvoices.reduce((sum, inv) => sum + (inv.total_payable || 0), 0);

    // Income by month (last 6 months)
    const incomeByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const monthInvoices = paidInvoices.filter(inv => 
        inv.invoice_date && inv.invoice_date.startsWith(monthKey)
      );
      const income = monthInvoices.reduce((sum, inv) => sum + (inv.total_payable || 0), 0);
      const expenses = income * 0.3; // Mock expenses

      incomeByMonth.push({ month: monthName, income, expenses });
    }

    // Income by company
    const incomeByCompanyMap = new Map<string, number>();
    paidInvoices.forEach(inv => {
      if (inv.company_id) {
        const company = companies.find(c => c.id === inv.company_id);
        const companyName = company?.name || "Unknown";
        incomeByCompanyMap.set(
          companyName,
          (incomeByCompanyMap.get(companyName) || 0) + (inv.total_payable || 0)
        );
      }
    });
    const incomeByCompany = Array.from(incomeByCompanyMap.entries()).map(([company, value]) => ({
      company,
      value,
    }));

    return {
      totalIncome,
      totalExpenses,
      currentBalance,
      activeClients,
      totalHoldbacks,
      holdbacksByCompany,
      upcomingIncome,
      unpaidInvoices,
      incomeByMonth,
      incomeByCompany,
    };
  }, [invoices, companies, selectedCompanyIds]);

  return {
    companies,
    clients,
    dashboardData,
    loading,
  };
};

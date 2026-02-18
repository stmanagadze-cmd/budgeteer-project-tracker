import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useContracts } from "@/hooks/useContracts";
import { useClients } from "@/hooks/useClients";
import { useCompanies } from "@/hooks/useCompanies";
import { useInvoices } from "@/hooks/useInvoices";
import { Contract } from "@/types/contract";
import { ContractDetail } from "@/components/contracts/ContractDetail";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, ArrowLeft } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-chart-3/20 text-chart-3",
  completed: "bg-chart-2/20 text-chart-2",
};

export default function Contracts() {
  const [userId, setUserId] = useState<string>();
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  const { contracts, loading, createContract, updateContract, deleteContract, addChangeOrder, deleteChangeOrder, uploadDocument, deleteDocument, getDocumentUrl } = useContracts(userId);
  const { clients } = useClients(userId);
  const { companies } = useCompanies(userId);
  const { invoices } = useInvoices(userId);

  const getClientName = (id: string | null) => clients.find(c => c.id === id)?.name || "—";
  const getCompanyName = (id: string | null) => companies.find(c => c.id === id)?.name || "—";

  const contractFinancials = useMemo(() => {
    const map: Record<string, { changeOrderTotal: number; invoicedTotal: number }> = {};
    for (const c of contracts) {
      const changeOrderTotal = (c.change_orders || []).reduce((s, co) => s + Number(co.amount), 0);
      const invoicedTotal = invoices
        .filter(inv => inv.project_id === c.id || (inv.client_id === c.client_id && inv.company_id === c.company_id))
        .reduce((s, inv) => s + Number(inv.total_payable || 0), 0);
      map[c.id] = { changeOrderTotal, invoicedTotal };
    }
    return map;
  }, [contracts, invoices]);

  if (!userId || loading) {
    return <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">Loading contracts...</div>;
  }

  if (selectedContract) {
    const current = contracts.find(c => c.id === selectedContract.id) || selectedContract;
    const fin = contractFinancials[current.id] || { changeOrderTotal: 0, invoicedTotal: 0 };
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedContract(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Contracts
        </Button>
        <ContractDetail
          contract={current}
          clientName={getClientName(current.client_id)}
          companyName={getCompanyName(current.company_id)}
          changeOrderTotal={fin.changeOrderTotal}
          invoicedTotal={fin.invoicedTotal}
          onAddChangeOrder={addChangeOrder}
          onDeleteChangeOrder={deleteChangeOrder}
          onUploadDocument={uploadDocument}
          onDeleteDocument={deleteDocument}
          onGetDocumentUrl={getDocumentUrl}
          onUpdateContract={updateContract}
          onEdit={() => { setEditingContract(current); setShowForm(true); }}
          onDelete={async () => { await deleteContract(current.id); setSelectedContract(null); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
          <p className="text-muted-foreground">Manage contracts and change orders</p>
        </div>
        <Button onClick={() => { setEditingContract(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Contract
        </Button>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No contracts yet</h3>
            <p className="text-muted-foreground mb-4">Create your first contract to get started.</p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Contract
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>All Contracts</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Original Amount</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map(c => {
                  const fin = contractFinancials[c.id] || { changeOrderTotal: 0, invoicedTotal: 0 };
                  const totalValue = Number(c.original_amount) + fin.changeOrderTotal;
                  const remaining = totalValue - fin.invoicedTotal;
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelectedContract(c)}>
                      <TableCell className="font-medium">{c.project_title}</TableCell>
                      <TableCell>{getClientName(c.client_id)}</TableCell>
                      <TableCell>${Number(c.original_amount).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">${totalValue.toLocaleString()}</TableCell>
                      <TableCell className={remaining < 0 ? "text-destructive" : "text-chart-3"}>
                        ${remaining.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[c.status] || ""}>{c.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ContractFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        clients={clients}
        companies={companies}
        contract={editingContract}
        onSubmit={async (data) => {
          if (editingContract) {
            await updateContract(editingContract.id, data);
          } else {
            await createContract(data);
          }
          setShowForm(false);
          setEditingContract(null);
        }}
      />
    </div>
  );
}

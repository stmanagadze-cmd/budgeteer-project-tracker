import { useState, useRef } from "react";
import { Contract, ChangeOrder, ContractDocument } from "@/types/contract";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Upload, FileText, Image, Pencil, ExternalLink } from "lucide-react";

interface Props {
  contract: Contract;
  clientName: string;
  companyName: string;
  changeOrderTotal: number;
  invoicedTotal: number;
  onAddChangeOrder: (contractId: string, description: string, amount: number) => Promise<void>;
  onDeleteChangeOrder: (id: string) => Promise<void>;
  onUploadDocument: (contractId: string, file: File, description?: string) => Promise<void>;
  onDeleteDocument: (doc: ContractDocument) => Promise<void>;
  onGetDocumentUrl: (filePath: string) => Promise<string | null>;
  onUpdateContract: (id: string, updates: Partial<Contract>) => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-chart-3/20 text-chart-3",
  completed: "bg-chart-2/20 text-chart-2",
};

export function ContractDetail({
  contract, clientName, companyName, changeOrderTotal, invoicedTotal,
  onAddChangeOrder, onDeleteChangeOrder, onUploadDocument, onDeleteDocument,
  onGetDocumentUrl, onEdit, onDelete,
}: Props) {
  const totalValue = Number(contract.original_amount) + changeOrderTotal;
  const remaining = totalValue - invoicedTotal;

  const [coDesc, setCoDesc] = useState("");
  const [coAmount, setCoAmount] = useState("");
  const [addingCo, setAddingCo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddCo = async () => {
    if (!coDesc.trim() || !coAmount) return;
    setAddingCo(true);
    await onAddChangeOrder(contract.id, coDesc, parseFloat(coAmount));
    setCoDesc(""); setCoAmount("");
    setAddingCo(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await onUploadDocument(contract.id, file);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openDocument = async (doc: ContractDocument) => {
    const url = await onGetDocumentUrl(doc.file_path);
    if (url) window.open(url, "_blank");
  };

  const changeOrders = contract.change_orders || [];
  const documents = contract.documents || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{contract.project_title}</h2>
          <p className="text-muted-foreground">{clientName} · {companyName}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge className={statusColors[contract.status] || ""}>{contract.status}</Badge>
          <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Original Amount</p>
            <p className="text-2xl font-bold">${Number(contract.original_amount).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Change Orders</p>
            <p className="text-2xl font-bold">${changeOrderTotal.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Contract Value</p>
            <p className="text-2xl font-bold text-primary">${totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Remaining Balance</p>
            <p className={`text-2xl font-bold ${remaining < 0 ? "text-destructive" : "text-chart-3"}`}>
              ${remaining.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {contract.notes && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p>{contract.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="change-orders">
        <TabsList>
          <TabsTrigger value="change-orders">Change Orders ({changeOrders.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="change-orders" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Add Change Order</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input value={coDesc} onChange={e => setCoDesc(e.target.value)} placeholder="Extra work description" />
                </div>
                <div className="w-36 space-y-1">
                  <Label className="text-xs">Amount ($)</Label>
                  <Input type="number" step="0.01" value={coAmount} onChange={e => setCoAmount(e.target.value)} placeholder="0.00" />
                </div>
                <Button onClick={handleAddCo} disabled={addingCo || !coDesc.trim()} className="gap-1">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {changeOrders.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeOrders.map(co => (
                      <TableRow key={co.id}>
                        <TableCell>{co.description}</TableCell>
                        <TableCell className="text-right font-medium">${Number(co.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => onDeleteChangeOrder(co.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">${changeOrderTotal.toLocaleString()}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Upload Document</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 items-center">
                <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                  <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Choose Files"}
                </Button>
                <span className="text-xs text-muted-foreground">PDF, Images, Word docs</span>
              </div>
            </CardContent>
          </Card>

          {documents.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        {doc.file_type.includes("pdf") ? (
                          <FileText className="h-5 w-5 text-destructive" />
                        ) : doc.file_type.startsWith("image") ? (
                          <Image className="h-5 w-5 text-chart-2" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDocument(doc)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteDocument(doc)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

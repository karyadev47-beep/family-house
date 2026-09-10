import { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatIDR, formatDate, CATEGORIES } from "@/lib/format";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, MoreHorizontal, ArrowLeftRight, Search } from "lucide-react";

export default function Transactions() {
  const { activeId, activeFamily } = useFamily();
  const { data: txs, reload } = useResource(activeId ? `/families/${activeId}/transactions` : null, [activeId]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const canManage = ["husband", "wife"].includes(activeFamily?.my_role);
  const [form, setForm] = useState({ description: "", category: "Makanan", amount: "", type: "expense" });

  const submit = async () => {
    if (!form.description || !form.amount) return toast.error("Lengkapi data transaksi");
    try {
      await api.post(`/families/${activeId}/transactions`, { ...form, amount: Number(form.amount) });
      toast.success("Transaksi ditambahkan");
      setOpen(false);
      setForm({ description: "", category: "Makanan", amount: "", type: "expense" });
      reload();
    } catch (e) { toast.error(apiError(e)); }
  };

  const remove = async (id) => {
    try { await api.delete(`/families/${activeId}/transactions/${id}`); reload(); toast.success("Transaksi dihapus"); }
    catch (e) { toast.error(apiError(e)); }
  };

  const list = (txs || []).filter((t) =>
    (filterCat === "all" || t.category === filterCat) &&
    t.description.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <PageHeader title="Transaksi" description="Semua pemasukan dan pengeluaran keluarga.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-transaction-button"><Plus className="mr-2 h-4 w-4" />Tambah Transaksi</Button>
          </DialogTrigger>
          <DialogContent data-testid="add-transaction-dialog">
            <DialogHeader><DialogTitle>Tambah Transaksi</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Deskripsi</Label>
                <Input data-testid="tx-description-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Belanja mingguan" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Jenis</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger data-testid="tx-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="expense">Pengeluaran</SelectItem><SelectItem value="income">Pemasukan</SelectItem></SelectContent>
                  </Select></div>
                <div className="space-y-2"><Label>Kategori</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger data-testid="tx-category-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select></div>
              </div>
              <div className="space-y-2"><Label>Jumlah (Rp)</Label>
                <Input data-testid="tx-amount-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="350000" /></div>
            </div>
            <DialogFooter><Button data-testid="tx-submit-button" onClick={submit}>Simpan</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input data-testid="tx-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari transaksi…" className="pl-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="sm:w-48" data-testid="tx-filter-category"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua Kategori</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="Belum ada transaksi" description="Tambahkan transaksi pertama keluarga Anda." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead><TableHead>Deskripsi</TableHead><TableHead>Kategori</TableHead>
                <TableHead>Anggota</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((t) => (
                <TableRow key={t.id} data-testid={`tx-row-${t.id}`}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(t.date)}</TableCell>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{t.member_name}</TableCell>
                  <TableCell className={`text-right font-semibold ${t.type === "income" ? "text-chart-1" : "text-foreground"}`}>
                    {t.type === "income" ? "+" : "-"}{formatIDR(t.amount)}
                  </TableCell>
                  <TableCell>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`tx-actions-${t.id}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>Hapus</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Hapus transaksi?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => remove(t.id)} data-testid={`tx-delete-confirm-${t.id}`}>Hapus</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

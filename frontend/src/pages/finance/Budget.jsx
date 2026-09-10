import { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatIDR, CATEGORIES } from "@/lib/format";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Wallet, AlertTriangle } from "lucide-react";

export default function Budget() {
  const { activeId, activeFamily } = useFamily();
  const { data: budgets, reload } = useResource(activeId ? `/families/${activeId}/budgets` : null, [activeId]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "Makanan", limit: "" });
  const canManage = ["husband", "wife"].includes(activeFamily?.my_role);

  const submit = async () => {
    if (!form.limit) return toast.error("Isi limit anggaran");
    try {
      await api.post(`/families/${activeId}/budgets`, { category: form.category, limit: Number(form.limit) });
      toast.success("Anggaran disimpan");
      setOpen(false);
      setForm({ category: "Makanan", limit: "" });
      reload();
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6" data-testid="budget-page">
      <PageHeader title="Anggaran" description="Atur batas pengeluaran per kategori setiap bulan.">
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button data-testid="add-budget-button"><Plus className="mr-2 h-4 w-4" />Atur Anggaran</Button></DialogTrigger>
            <DialogContent data-testid="add-budget-dialog">
              <DialogHeader><DialogTitle>Atur Anggaran</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label>Kategori</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger data-testid="budget-category-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="space-y-2"><Label>Limit (Rp)</Label>
                  <Input data-testid="budget-limit-input" type="number" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} placeholder="1000000" /></div>
              </div>
              <DialogFooter><Button data-testid="budget-submit-button" onClick={submit}>Simpan</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {(!budgets || budgets.length === 0) ? (
        <EmptyState icon={Wallet} title="Belum ada anggaran" description="Buat anggaran untuk memantau pengeluaran keluarga." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {budgets.map((b) => {
            const pct = b.limit ? Math.round((b.spent / b.limit) * 100) : 0;
            const over = pct >= 100;
            const warn = pct >= 80;
            return (
              <Card key={b.id} data-testid={`budget-card-${b.category}`}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{b.category}</span>
                    <Badge variant={over ? "destructive" : warn ? "secondary" : "outline"}>
                      {warn && <AlertTriangle className="mr-1 h-3 w-3" />}{pct}%
                    </Badge>
                  </div>
                  <Progress value={Math.min(100, pct)} className={warn ? "[&>div]:bg-destructive" : ""} />
                  <p className="text-sm text-muted-foreground">{formatIDR(b.spent)} / {formatIDR(b.limit)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

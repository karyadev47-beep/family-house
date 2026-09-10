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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { formatIDR, formatDate } from "@/lib/format";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Target } from "lucide-react";

export default function Goals() {
  const { activeId, activeFamily } = useFamily();
  const { data: goals, reload } = useResource(activeId ? `/families/${activeId}/goals` : null, [activeId]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", target_amount: "", current_amount: "", target_date: "" });
  const canManage = ["husband", "wife"].includes(activeFamily?.my_role);

  const submit = async () => {
    if (!form.name || !form.target_amount) return toast.error("Lengkapi data target");
    try {
      await api.post(`/families/${activeId}/goals`, {
        name: form.name, target_amount: Number(form.target_amount),
        current_amount: Number(form.current_amount || 0), target_date: form.target_date || null,
      });
      toast.success("Target tabungan dibuat");
      setOpen(false);
      setForm({ name: "", target_amount: "", current_amount: "", target_date: "" });
      reload();
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6" data-testid="goals-page">
      <PageHeader title="Target Tabungan" description="Kumpulkan dana untuk tujuan keluarga bersama.">
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button data-testid="add-goal-button"><Plus className="mr-2 h-4 w-4" />Target Baru</Button></DialogTrigger>
            <DialogContent data-testid="add-goal-dialog">
              <DialogHeader><DialogTitle>Target Tabungan Baru</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label>Nama Target</Label><Input data-testid="goal-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dana Liburan" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Target (Rp)</Label><Input data-testid="goal-target-input" type="number" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} placeholder="15000000" /></div>
                  <div className="space-y-2"><Label>Terkumpul (Rp)</Label><Input data-testid="goal-current-input" type="number" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} placeholder="0" /></div>
                </div>
                <div className="space-y-2"><Label>Target Tanggal</Label><Input data-testid="goal-date-input" type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></div>
              </div>
              <DialogFooter><Button data-testid="goal-submit-button" onClick={submit}>Simpan</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {(!goals || goals.length === 0) ? (
        <EmptyState icon={Target} title="Belum ada target" description="Buat target tabungan untuk keluarga." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => {
            const pct = g.target_amount ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
            return (
              <Card key={g.id} data-testid={`goal-card-${g.id}`}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{g.name}</span>
                    <span className="text-sm font-bold text-primary">{pct}%</span>
                  </div>
                  <Progress value={pct} />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatIDR(g.current_amount)} / {formatIDR(g.target_amount)}</span>
                    {g.target_date && <span>{formatDate(g.target_date)}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

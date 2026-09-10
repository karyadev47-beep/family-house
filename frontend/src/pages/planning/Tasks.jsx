import { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, CheckSquare, Trash2 } from "lucide-react";

const PRIORITY = { high: { label: "Tinggi", variant: "destructive" }, medium: { label: "Sedang", variant: "secondary" }, low: { label: "Rendah", variant: "outline" } };

export default function Tasks() {
  const { activeId, activeFamily } = useFamily();
  const { data: tasks, reload } = useResource(activeId ? `/families/${activeId}/tasks` : null, [activeId]);
  const { data: members } = useResource(activeId ? `/families/${activeId}/members` : null, [activeId]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", assignee_id: "", due_date: "", priority: "medium" });
  const canManage = ["husband", "wife"].includes(activeFamily?.my_role);
  const active = (members || []).filter((m) => m.status === "active");

  const submit = async () => {
    if (!form.title) return toast.error("Judul tugas wajib diisi");
    try {
      await api.post(`/families/${activeId}/tasks`, {
        title: form.title, assignee_id: form.assignee_id || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null, priority: form.priority,
      });
      toast.success("Tugas ditambahkan");
      setOpen(false);
      setForm({ title: "", assignee_id: "", due_date: "", priority: "medium" });
      reload();
    } catch (e) { toast.error(apiError(e)); }
  };
  const toggle = async (t) => { try { await api.patch(`/families/${activeId}/tasks/${t.id}`); reload(); } catch (e) { toast.error(apiError(e)); } };
  const remove = async (t) => { try { await api.delete(`/families/${activeId}/tasks/${t.id}`); reload(); toast.success("Tugas dihapus"); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div className="space-y-6" data-testid="tasks-page">
      <PageHeader title="Tugas & Jadwal" description="Kelola tugas rumah tangga keluarga.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="add-task-button"><Plus className="mr-2 h-4 w-4" />Tambah Tugas</Button></DialogTrigger>
          <DialogContent data-testid="add-task-dialog">
            <DialogHeader><DialogTitle>Tambah Tugas</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Judul</Label><Input data-testid="task-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Bayar tagihan listrik" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Ditugaskan ke</Label>
                  <Select value={form.assignee_id} onValueChange={(v) => setForm({ ...form, assignee_id: v })}>
                    <SelectTrigger data-testid="task-assignee-select"><SelectValue placeholder="Pilih anggota" /></SelectTrigger>
                    <SelectContent>{active.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="space-y-2"><Label>Prioritas</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger data-testid="task-priority-select"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="high">Tinggi</SelectItem><SelectItem value="medium">Sedang</SelectItem><SelectItem value="low">Rendah</SelectItem></SelectContent>
                  </Select></div>
              </div>
              <div className="space-y-2"><Label>Tenggat</Label><Input data-testid="task-due-input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <DialogFooter><Button data-testid="task-submit-button" onClick={submit}>Simpan</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {(!tasks || tasks.length === 0) ? (
        <EmptyState icon={CheckSquare} title="Belum ada tugas" description="Tambahkan tugas untuk keluarga Anda." />
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <Card key={t.id} data-testid={`task-item-${t.id}`}>
              <CardContent className="flex items-center gap-3 p-4">
                <Checkbox checked={t.status === "done"} onCheckedChange={() => toggle(t)} data-testid={`task-toggle-${t.id}`} />
                <div className="flex-1">
                  <p className={`font-medium ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}>{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.assignee_name || "Belum ditugaskan"}{t.due_date ? ` · ${formatDate(t.due_date)}` : ""}</p>
                </div>
                <Badge variant={PRIORITY[t.priority]?.variant}>{PRIORITY[t.priority]?.label}</Badge>
                {canManage && <button onClick={() => remove(t)} data-testid={`task-delete-${t.id}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

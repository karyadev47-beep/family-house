import { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, CalendarDays, Trash2 } from "lucide-react";

export default function CalendarPage() {
  const { activeId, activeFamily } = useFamily();
  const { data: events, reload } = useResource(activeId ? `/families/${activeId}/events` : null, [activeId]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "" });
  const canManage = ["owner", "parent"].includes(activeFamily?.my_role);

  const submit = async () => {
    if (!form.title || !form.date) return toast.error("Judul dan tanggal wajib diisi");
    try {
      await api.post(`/families/${activeId}/events`, { ...form, date: new Date(form.date).toISOString() });
      toast.success("Acara ditambahkan");
      setOpen(false);
      setForm({ title: "", description: "", date: "" });
      reload();
    } catch (e) { toast.error(apiError(e)); }
  };
  const remove = async (id) => { try { await api.delete(`/families/${activeId}/events/${id}`); reload(); toast.success("Acara dihapus"); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div className="space-y-6" data-testid="calendar-page">
      <PageHeader title="Kalender Acara" description="Jadwal dan acara penting keluarga.">
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button data-testid="add-event-button"><Plus className="mr-2 h-4 w-4" />Tambah Acara</Button></DialogTrigger>
            <DialogContent data-testid="add-event-dialog">
              <DialogHeader><DialogTitle>Tambah Acara</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label>Judul</Label><Input data-testid="event-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ulang tahun Ani" /></div>
                <div className="space-y-2"><Label>Tanggal</Label><Input data-testid="event-date-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Deskripsi</Label><Textarea data-testid="event-desc-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detail acara" /></div>
              </div>
              <DialogFooter><Button data-testid="event-submit-button" onClick={submit}>Simpan</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {(!events || events.length === 0) ? (
        <EmptyState icon={CalendarDays} title="Belum ada acara" description="Tambahkan acara keluarga mendatang." />
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <Card key={e.id} data-testid={`event-item-${e.id}`}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <span className="text-xs">{new Date(e.date).toLocaleDateString("id-ID", { month: "short" })}</span>
                  <span className="text-lg font-bold leading-none">{new Date(e.date).getDate()}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-muted-foreground">{e.description || formatDate(e.date)}</p>
                </div>
                {canManage && <button onClick={() => remove(e.id)} data-testid={`event-delete-${e.id}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

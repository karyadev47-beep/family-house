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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MOODS, formatDate } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, BookOpen, Lock, Users, Trash2 } from "lucide-react";

export function JournalView({ scope, title, description, defaultVisibility = "private" }) {
  const { activeId } = useFamily();
  const { user } = useAuth();
  const { data: entries, reload } = useResource(activeId ? `/families/${activeId}/journal?scope=${scope}` : null, [activeId, scope]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", mood: "senang", visibility: defaultVisibility, date: "" });

  const submit = async () => {
    if (!form.title || !form.content) return toast.error("Lengkapi jurnal Anda");
    try {
      await api.post(`/families/${activeId}/journal`, { ...form, date: form.date ? new Date(form.date).toISOString() : null });
      toast.success("Jurnal disimpan");
      setOpen(false);
      setForm({ title: "", content: "", mood: "senang", visibility: defaultVisibility, date: "" });
      reload();
    } catch (e) { toast.error(apiError(e)); }
  };

  const remove = async (id) => {
    try { await api.delete(`/families/${activeId}/journal/${id}`); reload(); toast.success("Jurnal dihapus"); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6" data-testid={`journal-${scope}-page`}>
      <PageHeader title={title} description={description}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="add-journal-button"><Plus className="mr-2 h-4 w-4" />Tulis Jurnal</Button></DialogTrigger>
          <DialogContent data-testid="add-journal-dialog">
            <DialogHeader><DialogTitle>Tulis Jurnal</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Judul</Label><Input data-testid="journal-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Hari yang menyenangkan" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Suasana Hati</Label>
                  <Select value={form.mood} onValueChange={(v) => setForm({ ...form, mood: v })}>
                    <SelectTrigger data-testid="journal-mood-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(MOODS).map(([k, m]) => <SelectItem key={k} value={k}>{m.emoji} {m.label}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="space-y-2"><Label>Visibilitas</Label>
                  <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })}>
                    <SelectTrigger data-testid="journal-visibility-select"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="private">Pribadi</SelectItem><SelectItem value="family">Keluarga</SelectItem></SelectContent>
                  </Select></div>
              </div>
              <div className="space-y-2"><Label>Tanggal</Label><Input data-testid="journal-date-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Isi</Label><Textarea data-testid="journal-content-input" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Ceritakan harimu…" /></div>
            </div>
            <DialogFooter><Button data-testid="journal-submit-button" onClick={submit}>Simpan Jurnal</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {(!entries || entries.length === 0) ? (
        <EmptyState icon={BookOpen} title="Belum ada jurnal" description="Mulai tulis catatan harian Anda." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <Card key={e.id} data-testid={`journal-card-${e.id}`} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-2 p-5">
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{MOODS[e.mood]?.emoji || "😊"}</span>
                  <Badge variant={e.visibility === "family" ? "secondary" : "outline"} className="gap-1">
                    {e.visibility === "family" ? <Users className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {e.visibility === "family" ? "Keluarga" : "Pribadi"}
                  </Badge>
                </div>
                <h3 className="font-semibold">{e.title}</h3>
                <p className="flex-1 text-sm text-muted-foreground line-clamp-4">{e.content}</p>
                <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <span>{e.author_name} · {formatDate(e.date)}</span>
                  {e.user_id === user?.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><button data-testid={`journal-delete-${e.id}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Hapus jurnal?</AlertDialogTitle><AlertDialogDescription>Jurnal ini akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => remove(e.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

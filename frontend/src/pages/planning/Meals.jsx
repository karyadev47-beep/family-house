import { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, ChefHat, Trash2, X, ShoppingCart } from "lucide-react";

const MEAL_TYPES = {
  sarapan: { label: "Sarapan", emoji: "🍳" },
  makan_siang: { label: "Makan Siang", emoji: "🍚" },
  makan_malam: { label: "Makan Malam", emoji: "🍲" },
  camilan: { label: "Camilan", emoji: "🍪" },
};

export default function Meals() {
  const { activeId, activeFamily } = useFamily();
  const { user } = useAuth();
  const { data: meals, reload } = useResource(activeId ? `/families/${activeId}/meals` : null, [activeId]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", meal_type: "makan_siang", date: "", notes: "" });
  const [ingredients, setIngredients] = useState([]);
  const [ingInput, setIngInput] = useState("");

  const addIng = () => {
    const v = ingInput.trim();
    if (v) { setIngredients([...ingredients, v]); setIngInput(""); }
  };

  const submit = async () => {
    if (!form.title) return toast.error("Nama menu wajib diisi");
    try {
      await api.post(`/families/${activeId}/meals`, {
        ...form, date: form.date ? new Date(form.date).toISOString() : null, ingredients,
      });
      toast.success("Menu direncanakan");
      setOpen(false);
      setForm({ title: "", meal_type: "makan_siang", date: "", notes: "" });
      setIngredients([]);
      reload();
    } catch (e) { toast.error(apiError(e)); }
  };

  const toggle = async (m) => { try { await api.patch(`/families/${activeId}/meals/${m.id}`); reload(); } catch (e) { toast.error(apiError(e)); } };
  const remove = async (m) => { try { await api.delete(`/families/${activeId}/meals/${m.id}`); reload(); toast.success("Menu dihapus"); } catch (e) { toast.error(apiError(e)); } };

  const toShopping = async (m) => {
    if (!m.ingredients?.length) return toast.error("Tidak ada bahan untuk ditambahkan");
    try {
      await Promise.all(m.ingredients.map((name) =>
        api.post(`/families/${activeId}/shopping`, { name, quantity: 1, category: "Bahan Masak" })));
      toast.success(`${m.ingredients.length} bahan ditambahkan ke daftar belanja`);
    } catch (e) { toast.error(apiError(e)); }
  };

  const list = meals || [];

  return (
    <div className="space-y-6" data-testid="meals-page">
      <PageHeader title="Meal Prep" description="Rencanakan menu masakan keluarga beserta bahan-bahannya.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="add-meal-button"><Plus className="mr-2 h-4 w-4" />Rencana Menu</Button></DialogTrigger>
          <DialogContent data-testid="add-meal-dialog">
            <DialogHeader><DialogTitle>Rencana Menu Masakan</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Nama Menu</Label><Input data-testid="meal-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nasi goreng spesial" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Waktu Makan</Label>
                  <Select value={form.meal_type} onValueChange={(v) => setForm({ ...form, meal_type: v })}>
                    <SelectTrigger data-testid="meal-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(MEAL_TYPES).map(([k, t]) => <SelectItem key={k} value={k}>{t.emoji} {t.label}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="space-y-2"><Label>Tanggal</Label><Input data-testid="meal-date-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Bahan-bahan</Label>
                <div className="flex gap-2">
                  <Input data-testid="meal-ingredient-input" value={ingInput} onChange={(e) => setIngInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIng(); } }} placeholder="mis. 2 butir telur" />
                  <Button type="button" variant="outline" onClick={addIng} data-testid="meal-add-ingredient-button"><Plus className="h-4 w-4" /></Button>
                </div>
                {ingredients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ingredients.map((ing, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {ing}
                        <button type="button" onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2"><Label>Catatan (opsional)</Label><Textarea data-testid="meal-notes-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Langkah singkat atau catatan memasak" /></div>
            </div>
            <DialogFooter><Button data-testid="meal-submit-button" onClick={submit}>Simpan Menu</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState icon={ChefHat} title="Belum ada rencana menu" description="Rencanakan masakan keluarga dan catat bahan-bahannya." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <Card key={m.id} data-testid={`meal-card-${m.id}`} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{MEAL_TYPES[m.meal_type]?.emoji}</span>
                    <div>
                      <h3 className={`font-semibold leading-tight ${m.done ? "text-muted-foreground line-through" : ""}`}>{m.title}</h3>
                      <p className="text-xs text-muted-foreground">{MEAL_TYPES[m.meal_type]?.label} · {formatDate(m.date)}</p>
                    </div>
                  </div>
                  <Checkbox checked={m.done} onCheckedChange={() => toggle(m)} data-testid={`meal-toggle-${m.id}`} />
                </div>

                {m.ingredients?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.ingredients.map((ing, i) => <Badge key={i} variant="outline" className="font-normal">{ing}</Badge>)}
                  </div>
                )}
                {m.notes && <p className="text-sm text-muted-foreground">{m.notes}</p>}

                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">oleh {m.author_name}</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => toShopping(m)} data-testid={`meal-to-shopping-${m.id}`}>
                      <ShoppingCart className="h-3.5 w-3.5" /> Ke Belanja
                    </Button>
                    {(m.user_id === user?.id || ["owner", "parent"].includes(activeFamily?.my_role)) && (
                      <button onClick={() => remove(m)} data-testid={`meal-delete-${m.id}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

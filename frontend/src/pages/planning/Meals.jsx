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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatIDR, formatDate } from "@/lib/format";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, ChefHat, Trash2, X, ShoppingCart, ChevronLeft, ChevronRight, Wallet } from "lucide-react";

const MEAL_TYPES = {
  sarapan: { label: "Sarapan", emoji: "🍳" },
  makan_siang: { label: "Makan Siang", emoji: "🍚" },
  makan_malam: { label: "Makan Malam", emoji: "🍲" },
  camilan: { label: "Camilan", emoji: "🍪" },
};
const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function startOfWeek(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dayIdx = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dayIdx + offset * 7);
  return d;
}
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function Meals() {
  const { activeId, activeFamily } = useFamily();
  const { user } = useAuth();
  const { data: meals, reload } = useResource(activeId ? `/families/${activeId}/meals` : null, [activeId]);
  const { data: budgets } = useResource(activeId ? `/families/${activeId}/budgets` : null, [activeId]);
  const [view, setView] = useState("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", meal_type: "makan_siang", date: "", notes: "", cost: "" });
  const [ingredients, setIngredients] = useState([]);
  const [ingInput, setIngInput] = useState("");

  const weekStart = startOfWeek(weekOffset);
  const weekDays = [...Array(7)].map((_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });
  const weekEnd = weekDays[6];
  const list = meals || [];
  const weekMeals = list.filter((m) => { const d = new Date(m.date); return d >= weekDays[0] && d <= new Date(weekEnd.getTime() + 86399999); });
  const weekCost = weekMeals.reduce((s, m) => s + (m.cost || 0), 0);
  const foodBudget = (budgets || []).find((b) => b.category === "Makanan");
  const budgetPct = foodBudget?.limit ? Math.min(100, Math.round((weekCost / foodBudget.limit) * 100)) : 0;

  const openDialog = (presetDate) => {
    setForm({ title: "", meal_type: "makan_siang", date: presetDate || "", notes: "", cost: "" });
    setIngredients([]); setIngInput("");
    setOpen(true);
  };
  const addIng = () => { const v = ingInput.trim(); if (v) { setIngredients([...ingredients, v]); setIngInput(""); } };

  const submit = async () => {
    if (!form.title) return toast.error("Nama menu wajib diisi");
    try {
      await api.post(`/families/${activeId}/meals`, {
        title: form.title, meal_type: form.meal_type,
        date: form.date ? new Date(form.date).toISOString() : null,
        ingredients, notes: form.notes, cost: Number(form.cost || 0),
      });
      toast.success("Menu direncanakan");
      setOpen(false); reload();
    } catch (e) { toast.error(apiError(e)); }
  };
  const toggle = async (m) => { try { await api.patch(`/families/${activeId}/meals/${m.id}`); reload(); } catch (e) { toast.error(apiError(e)); } };
  const remove = async (m) => { try { await api.delete(`/families/${activeId}/meals/${m.id}`); reload(); toast.success("Menu dihapus"); } catch (e) { toast.error(apiError(e)); } };
  const toShopping = async (m) => {
    if (!m.ingredients?.length) return toast.error("Tidak ada bahan untuk ditambahkan");
    try {
      await Promise.all(m.ingredients.map((name) => api.post(`/families/${activeId}/shopping`, { name, quantity: 1, category: "Bahan Masak" })));
      toast.success(`${m.ingredients.length} bahan ditambahkan ke daftar belanja`);
    } catch (e) { toast.error(apiError(e)); }
  };
  const canDelete = (m) => m.user_id === user?.id || ["owner", "parent"].includes(activeFamily?.my_role);

  return (
    <div className="space-y-6" data-testid="meals-page">
      <PageHeader title="Meal Prep" description="Rencanakan menu masakan keluarga beserta bahan dan estimasi biayanya.">
        <Button data-testid="add-meal-button" onClick={() => openDialog()}><Plus className="mr-2 h-4 w-4" />Rencana Menu</Button>
      </PageHeader>

      {/* Budget linkage card */}
      <Card data-testid="meal-budget-card">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Wallet className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Estimasi biaya menu minggu ini</p>
              <p className="text-xl font-bold font-display" data-testid="meal-week-cost">{formatIDR(weekCost)}</p>
            </div>
          </div>
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Anggaran Makanan</span>
              <span>{foodBudget ? formatIDR(foodBudget.limit) : "Belum diatur"}</span>
            </div>
            <Progress value={budgetPct} className={budgetPct >= 100 ? "[&>div]:bg-destructive" : ""} />
            <p className="mt-1 text-xs text-muted-foreground">
              {foodBudget ? (weekCost > foodBudget.limit
                ? `Melebihi anggaran ${formatIDR(weekCost - foodBudget.limit)}`
                : `Sisa ${formatIDR(foodBudget.limit - weekCost)} (${budgetPct}%)`) : "Atur anggaran kategori Makanan untuk memantau."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="week" data-testid="meal-view-week">Menu Mingguan</TabsTrigger>
            <TabsTrigger value="all" data-testid="meal-view-all">Semua Menu</TabsTrigger>
          </TabsList>
        </Tabs>
        {view === "week" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(weekOffset - 1)} data-testid="week-prev"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-[150px] text-center text-sm font-medium" data-testid="week-range">
              {weekDays[0].getDate()} {MONTHS[weekDays[0].getMonth()]} – {weekEnd.getDate()} {MONTHS[weekEnd.getMonth()]}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(weekOffset + 1)} data-testid="week-next"><ChevronRight className="h-4 w-4" /></Button>
            {weekOffset !== 0 && <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} data-testid="week-today">Minggu Ini</Button>}
          </div>
        )}
      </div>

      {view === "week" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((day, i) => {
            const dayMeals = list.filter((m) => sameDay(new Date(m.date), day));
            const isToday = sameDay(day, new Date());
            return (
              <div key={i} data-testid={`week-day-${i}`} className={`rounded-xl border p-2 ${isToday ? "border-primary bg-accent/40" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between px-1 pb-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{DOW[i]}</p>
                    <p className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>{day.getDate()}</p>
                  </div>
                  <button onClick={() => openDialog(day.toISOString().slice(0, 10))} data-testid={`week-add-${i}`} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="space-y-2">
                  {dayMeals.map((m) => (
                    <div key={m.id} data-testid={`week-meal-${m.id}`} className="rounded-lg border border-border bg-background p-2">
                      <div className="flex items-start gap-1.5">
                        <span>{MEAL_TYPES[m.meal_type]?.emoji}</span>
                        <p className={`flex-1 text-xs font-medium leading-tight ${m.done ? "text-muted-foreground line-through" : ""}`}>{m.title}</p>
                      </div>
                      {m.cost > 0 && <p className="mt-1 text-[11px] text-muted-foreground">{formatIDR(m.cost)}</p>}
                    </div>
                  ))}
                  {dayMeals.length === 0 && <p className="px-1 text-[11px] text-muted-foreground/60">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : list.length === 0 ? (
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

                {m.cost > 0 && <Badge variant="secondary" className="w-fit gap-1"><Wallet className="h-3 w-3" />{formatIDR(m.cost)}</Badge>}

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
                    {canDelete(m) && <button onClick={() => remove(m)} data-testid={`meal-delete-${m.id}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
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
            <div className="space-y-2"><Label>Estimasi Biaya Bahan (Rp)</Label><Input data-testid="meal-cost-input" type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="50000" /></div>
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
    </div>
  );
}

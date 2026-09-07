import { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useResource } from "@/hooks/useResource";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";

export default function Shopping() {
  const { activeId } = useFamily();
  const { data: items, reload } = useResource(activeId ? `/families/${activeId}/shopping` : null, [activeId]);
  const [name, setName] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    try { await api.post(`/families/${activeId}/shopping`, { name, quantity: 1 }); setName(""); reload(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const toggle = async (i) => { try { await api.patch(`/families/${activeId}/shopping/${i.id}`); reload(); } catch (e) { toast.error(apiError(e)); } };
  const remove = async (i) => { try { await api.delete(`/families/${activeId}/shopping/${i.id}`); reload(); } catch (e) { toast.error(apiError(e)); } };

  const list = items || [];
  const remaining = list.filter((i) => !i.bought).length;

  return (
    <div className="space-y-6" data-testid="shopping-page">
      <PageHeader title="Daftar Belanja" description={`${remaining} item belum dibeli.`} />
      <div className="flex gap-2">
        <Input data-testid="shopping-name-input" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Tambah item belanja…" />
        <Button data-testid="add-shopping-button" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Daftar kosong" description="Tambahkan item yang perlu dibeli." />
      ) : (
        <div className="space-y-2">
          {list.map((i) => (
            <Card key={i.id} data-testid={`shopping-item-${i.id}`}>
              <CardContent className="flex items-center gap-3 p-3.5">
                <Checkbox checked={i.bought} onCheckedChange={() => toggle(i)} data-testid={`shopping-toggle-${i.id}`} />
                <span className={`flex-1 ${i.bought ? "text-muted-foreground line-through" : ""}`}>{i.name}</span>
                <Badge variant="outline">{i.category}</Badge>
                <button onClick={() => remove(i)} data-testid={`shopping-delete-${i.id}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

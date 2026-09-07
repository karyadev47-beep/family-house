import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useFamily } from "@/context/FamilyContext";

export function CreateFamilyDialog({ trigger, open, onOpenChange }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const { refresh, switchFamily } = useFamily();

  const submit = async () => {
    if (!name.trim()) return toast.error("Nama keluarga wajib diisi");
    setBusy(true);
    try {
      const { data } = await api.post("/families", { name, description });
      await refresh();
      switchFamily(data.id);
      toast.success("Keluarga baru dibuat");
      setName("");
      setDescription("");
      onOpenChange?.(false);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent data-testid="create-family-dialog">
        <DialogHeader>
          <DialogTitle>Buat Keluarga Baru</DialogTitle>
          <DialogDescription>Anda akan otomatis menjadi Pemilik keluarga ini.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="fam-name">Nama Keluarga</Label>
            <Input id="fam-name" data-testid="create-family-name-input" value={name}
              onChange={(e) => setName(e.target.value)} placeholder="Keluarga Fernanda" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fam-desc">Deskripsi (opsional)</Label>
            <Textarea id="fam-desc" data-testid="create-family-desc-input" value={description}
              onChange={(e) => setDescription(e.target.value)} placeholder="Keluarga inti kami" />
          </div>
        </div>
        <DialogFooter>
          <Button data-testid="create-family-submit-button" onClick={submit} disabled={busy}>
            {busy ? "Membuat…" : "Buat Keluarga"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

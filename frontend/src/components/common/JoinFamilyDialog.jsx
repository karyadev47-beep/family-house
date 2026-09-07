import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useFamily } from "@/context/FamilyContext";

export function JoinFamilyDialog({ open, onOpenChange }) {
  const [inviteCode, setInviteCode] = useState("");
  const [famCode, setFamCode] = useState("");
  const [busy, setBusy] = useState(false);
  const { refresh, switchFamily } = useFamily();

  const acceptInvite = async () => {
    if (!inviteCode.trim()) return toast.error("Masukkan kode undangan");
    setBusy(true);
    try {
      const { data } = await api.post("/invitations/accept", { code: inviteCode.trim().toUpperCase() });
      await refresh();
      switchFamily(data.id);
      toast.success(`Bergabung ke ${data.name}`);
      setInviteCode("");
      onOpenChange?.(false);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const requestJoin = async () => {
    if (!famCode.trim()) return toast.error("Masukkan kode keluarga");
    setBusy(true);
    try {
      const { data } = await api.post("/join-requests", { code: famCode.trim().toUpperCase() });
      toast.success(`Permintaan bergabung ke ${data.family_name} terkirim`);
      setFamCode("");
      onOpenChange?.(false);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="join-family-dialog">
        <DialogHeader>
          <DialogTitle>Gabung Keluarga</DialogTitle>
          <DialogDescription>Gunakan kode undangan untuk langsung bergabung, atau kode keluarga untuk mengirim permintaan.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="invite" className="pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite" data-testid="join-tab-invite">Kode Undangan</TabsTrigger>
            <TabsTrigger value="request" data-testid="join-tab-request">Kode Keluarga</TabsTrigger>
          </TabsList>
          <TabsContent value="invite" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Kode Undangan</Label>
              <Input id="invite-code" data-testid="join-invite-code-input" value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="KEL-89F2A1" className="font-mono uppercase" />
            </div>
            <DialogFooter>
              <Button data-testid="accept-invite-code-button" onClick={acceptInvite} disabled={busy} className="w-full">
                {busy ? "Memproses…" : "Gabung Sekarang"}
              </Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="request" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="fam-code">Kode Keluarga</Label>
              <Input id="fam-code" data-testid="join-family-code-input" value={famCode}
                onChange={(e) => setFamCode(e.target.value.toUpperCase())} placeholder="FAM-12AB34" className="font-mono uppercase" />
            </div>
            <DialogFooter>
              <Button data-testid="submit-join-code-button" onClick={requestJoin} disabled={busy} className="w-full">
                {busy ? "Mengirim…" : "Minta Bergabung"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

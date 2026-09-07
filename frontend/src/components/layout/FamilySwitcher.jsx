import { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { UserAvatar } from "@/components/common/UserAvatar";
import { CreateFamilyDialog } from "@/components/common/CreateFamilyDialog";
import { JoinFamilyDialog } from "@/components/common/JoinFamilyDialog";
import { Check, ChevronsUpDown, Plus, KeyRound } from "lucide-react";
import { ROLE_META } from "@/lib/format";

export function FamilySwitcher() {
  const { families, activeFamily, switchFamily } = useFamily();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            data-testid="family-switcher-trigger"
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent"
          >
            <UserAvatar name={activeFamily?.name || "Keluarga"} src={activeFamily?.avatar_url} className="h-9 w-9 rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{activeFamily?.name || "Pilih Keluarga"}</p>
              <p className="text-xs text-muted-foreground">{activeFamily ? `${activeFamily.member_count} anggota` : ""}</p>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari keluarga…" data-testid="family-switcher-search" />
            <CommandList>
              <CommandEmpty>Keluarga tidak ditemukan.</CommandEmpty>
              <CommandGroup heading="Keluarga Anda">
                {families.map((f) => (
                  <CommandItem
                    key={f.id}
                    value={f.name}
                    data-testid={`family-switcher-option-${f.id}`}
                    onSelect={() => {
                      switchFamily(f.id);
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <UserAvatar name={f.name} src={f.avatar_url} className="h-7 w-7 rounded-md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.member_count} anggota · {ROLE_META[f.my_role]?.label}
                      </p>
                    </div>
                    {activeFamily?.id === f.id && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem data-testid="family-switcher-create" onSelect={() => { setOpen(false); setCreateOpen(true); }} className="gap-2">
                  <Plus className="h-4 w-4" /> Buat Keluarga Baru
                </CommandItem>
                <CommandItem data-testid="family-switcher-join" onSelect={() => { setOpen(false); setJoinOpen(true); }} className="gap-2">
                  <KeyRound className="h-4 w-4" /> Gabung via Kode
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <CreateFamilyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinFamilyDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </>
  );
}

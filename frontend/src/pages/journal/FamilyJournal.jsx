import { JournalView } from "@/components/journal/JournalView";

export default function FamilyJournal() {
  return <JournalView scope="family" title="Jurnal Keluarga" description="Catatan yang dibagikan untuk seluruh anggota keluarga." defaultVisibility="family" />;
}

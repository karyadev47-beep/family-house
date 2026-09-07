import { JournalView } from "@/components/journal/JournalView";

export default function MyJournal() {
  return <JournalView scope="my" title="Jurnal Saya" description="Catatan pribadi dan keluarga yang Anda tulis." defaultVisibility="private" />;
}

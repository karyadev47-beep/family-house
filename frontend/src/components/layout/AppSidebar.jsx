import { NavLink } from "react-router-dom";
import { FamilySwitcher } from "./FamilySwitcher";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, PieChart, ArrowLeftRight, Wallet, Target,
  BookOpen, Users, Calendar, UserCheck, MailPlus, UserPlus, History,
  CheckSquare, CalendarDays, ShoppingCart, Settings, HeartHandshake, ChefHat,
} from "lucide-react";

const GROUPS = [
  { title: "Utama", items: [{ label: "Dasbor", icon: LayoutDashboard, path: "/dashboard" }] },
  {
    title: "Keuangan",
    items: [
      { label: "Ikhtisar", icon: PieChart, path: "/finance/overview" },
      { label: "Transaksi", icon: ArrowLeftRight, path: "/finance/transactions" },
      { label: "Anggaran", icon: Wallet, path: "/finance/budget" },
      { label: "Target Tabungan", icon: Target, path: "/finance/goals" },
    ],
  },
  {
    title: "Jurnal & Catatan",
    items: [
      { label: "Jurnal Saya", icon: BookOpen, path: "/journal/my" },
      { label: "Jurnal Keluarga", icon: Users, path: "/journal/family" },
      { label: "Kalender Jurnal", icon: Calendar, path: "/journal/calendar" },
    ],
  },
  {
    title: "Manajemen Keluarga",
    items: [
      { label: "Anggota Keluarga", icon: UserCheck, path: "/family/members" },
      { label: "Undangan", icon: MailPlus, path: "/family/invitations" },
      { label: "Permintaan Bergabung", icon: UserPlus, path: "/family/requests" },
      { label: "Log Aktivitas", icon: History, path: "/family/audit" },
    ],
  },
  {
    title: "Perencanaan",
    items: [
      { label: "Tugas & Jadwal", icon: CheckSquare, path: "/planning/tasks" },
      { label: "Kalender Acara", icon: CalendarDays, path: "/planning/calendar" },
      { label: "Meal Prep", icon: ChefHat, path: "/planning/meals" },
      { label: "Daftar Belanja", icon: ShoppingCart, path: "/planning/shopping" },
    ],
  },
  { title: "Pengaturan", items: [{ label: "Pengaturan Keluarga", icon: Settings, path: "/settings" }] },
];

export function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <HeartHandshake className="h-5 w-5" />
        </div>
        <span className="text-base font-bold tracking-tight font-display">KeluargaKita</span>
      </div>
      <div className="px-3 pb-2">
        <FamilySwitcher />
      </div>
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-5 py-3">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    data-testid={`sidebar-nav-${item.path.replace(/\//g, "-").replace(/^-/, "")}`}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}

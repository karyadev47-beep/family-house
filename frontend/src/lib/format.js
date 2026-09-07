export const formatIDR = (n) =>
  "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");

export const formatShortIDR = (n) => {
  n = Number(n) || 0;
  if (Math.abs(n) >= 1_000_000) return "Rp " + (n / 1_000_000).toFixed(1).replace(".0", "") + "jt";
  if (Math.abs(n) >= 1_000) return "Rp " + Math.round(n / 1_000) + "rb";
  return "Rp " + n;
};

const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
};

export const ROLE_META = {
  owner: { label: "Pemilik", className: "bg-primary text-primary-foreground" },
  parent: { label: "Orang Tua", className: "bg-chart-3 text-white" },
  member: { label: "Anggota", className: "bg-secondary text-secondary-foreground border border-border" },
  child: { label: "Anak", className: "bg-chart-2 text-white" },
};

export const MOODS = {
  senang: { emoji: "😊", label: "Senang" },
  biasa: { emoji: "😐", label: "Biasa" },
  sedih: { emoji: "😔", label: "Sedih" },
  bersemangat: { emoji: "🚀", label: "Bersemangat" },
  lelah: { emoji: "😴", label: "Lelah" },
};

export const CATEGORIES = [
  "Makanan", "Transportasi", "Tagihan", "Belanja",
  "Hiburan", "Pendidikan", "Kesehatan", "Gaji", "Bonus", "Lainnya",
];

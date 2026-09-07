import os
import uuid
import secrets
import string
import bcrypt
from datetime import datetime, timezone, timedelta


def now():
    return datetime.now(timezone.utc)


def iso(dt=None):
    return (dt or now()).isoformat()


def nid():
    return str(uuid.uuid4())


def hp(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def code(prefix):
    return f"{prefix}-" + ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))


async def run_seed(db):
    admin_email = os.environ.get("ADMIN_EMAIL", "karyadev47@gmail.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Keluarga123!")

    existing = await db.users.find_one({"email": admin_email})
    if existing:
        # keep admin password in sync with .env
        if not bcrypt.checkpw(admin_password.encode(), existing["password_hash"].encode()):
            await db.users.update_one({"email": admin_email},
                                      {"$set": {"password_hash": hp(admin_password)}})
        return  # already seeded

    # ------- users -------
    yogi = {"id": nid(), "name": "Yogi Fernanda", "email": admin_email,
            "password_hash": hp(admin_password), "avatar_url": "", "created_at": iso(), "updated_at": iso()}
    siti = {"id": nid(), "name": "Siti Fernanda", "email": "siti@keluarga.id",
            "password_hash": hp("anggota123"), "avatar_url": "", "created_at": iso(), "updated_at": iso()}
    budi = {"id": nid(), "name": "Budi Fernanda", "email": "budi@keluarga.id",
            "password_hash": hp("anggota123"), "avatar_url": "", "created_at": iso(), "updated_at": iso()}
    ani = {"id": nid(), "name": "Ani Fernanda", "email": "ani@keluarga.id",
           "password_hash": hp("anggota123"), "avatar_url": "", "created_at": iso(), "updated_at": iso()}
    await db.users.insert_many([yogi, siti, budi, ani])

    # ------- family 1: Keluarga Fernanda -------
    fam1 = {"id": nid(), "name": "Keluarga Fernanda",
            "description": "Keluarga inti yang penuh cinta dan kolaborasi.",
            "avatar_url": "", "owner_id": yogi["id"], "join_code": code("FAM"),
            "created_at": iso(), "updated_at": iso()}
    # ------- family 2: Keluarga Orang Tua -------
    fam2 = {"id": nid(), "name": "Keluarga Orang Tua",
            "description": "Rumah orang tua dan saudara.",
            "avatar_url": "", "owner_id": yogi["id"], "join_code": code("FAM"),
            "created_at": iso(), "updated_at": iso()}
    await db.families.insert_many([fam1, fam2])

    def mem(fid, uid, role, status="active"):
        return {"id": nid(), "family_id": fid, "user_id": uid, "role": role,
                "status": status, "joined_at": iso(), "created_at": iso(), "updated_at": iso()}

    await db.family_members.insert_many([
        mem(fam1["id"], yogi["id"], "owner"),
        mem(fam1["id"], siti["id"], "parent"),
        mem(fam1["id"], budi["id"], "member"),
        mem(fam1["id"], ani["id"], "child"),
        mem(fam2["id"], yogi["id"], "owner"),
        mem(fam2["id"], siti["id"], "member"),
        mem(fam2["id"], budi["id"], "member"),
    ])

    # ------- budgets (fam1) -------
    budgets = [("Makanan", 1000000), ("Tagihan", 1500000), ("Transportasi", 600000),
               ("Belanja", 800000), ("Hiburan", 400000), ("Pendidikan", 1000000)]
    await db.budgets.insert_many([
        {"id": nid(), "family_id": fam1["id"], "category": c, "limit": l, "period": "month", "created_at": iso()}
        for c, l in budgets])

    # ------- transactions (fam1, current month) -------
    members_tx = [("Yogi Fernanda", yogi["id"]), ("Siti Fernanda", siti["id"]), ("Budi Fernanda", budi["id"])]
    tx_data = [
        ("Gaji bulanan", "Gaji", 7500000, "income", -2),
        ("Belanja mingguan", "Makanan", 350000, "expense", -1),
        ("Listrik & air", "Tagihan", 620000, "expense", -3),
        ("Bensin motor", "Transportasi", 150000, "expense", -4),
        ("Makan di restoran", "Makanan", 280000, "expense", -5),
        ("Langganan internet", "Tagihan", 350000, "expense", -6),
        ("Beli sepatu anak", "Belanja", 420000, "expense", -7),
        ("Tiket bioskop", "Hiburan", 180000, "expense", -8),
        ("Les bahasa Inggris", "Pendidikan", 500000, "expense", -9),
        ("Bonus proyek", "Bonus", 1200000, "income", -10),
    ]
    txs = []
    for i, (desc, cat, amt, typ, off) in enumerate(tx_data):
        name, uid = members_tx[i % len(members_tx)]
        txs.append({"id": nid(), "family_id": fam1["id"], "user_id": uid, "member_name": name,
                    "description": desc, "category": cat, "amount": amt, "type": typ,
                    "date": iso(now() + timedelta(days=off)), "created_at": iso()})
    await db.transactions.insert_many(txs)

    # ------- goals -------
    await db.goals.insert_many([
        {"id": nid(), "family_id": fam1["id"], "name": "Dana Liburan Bali", "target_amount": 15000000,
         "current_amount": 6500000, "target_date": iso(now() + timedelta(days=120)), "created_at": iso()},
        {"id": nid(), "family_id": fam1["id"], "name": "Dana Darurat", "target_amount": 30000000,
         "current_amount": 18000000, "target_date": iso(now() + timedelta(days=300)), "created_at": iso()},
    ])

    # ------- journal -------
    await db.journal_entries.insert_many([
        {"id": nid(), "family_id": fam1["id"], "user_id": yogi["id"], "author_name": "Yogi Fernanda",
         "title": "Minggu yang produktif", "content": "Hari ini kami membereskan rumah bersama dan menyusun anggaran bulan depan.",
         "mood": "bersemangat", "visibility": "family", "date": iso(now() - timedelta(days=1)), "created_at": iso()},
        {"id": nid(), "family_id": fam1["id"], "user_id": siti["id"], "author_name": "Siti Fernanda",
         "title": "Catatan pribadi", "content": "Ingin lebih rutin olahraga pagi mulai minggu ini.",
         "mood": "senang", "visibility": "private", "date": iso(now() - timedelta(days=2)), "created_at": iso()},
        {"id": nid(), "family_id": fam1["id"], "user_id": budi["id"], "author_name": "Budi Fernanda",
         "title": "Ulang tahun Ani", "content": "Kita rayakan ulang tahun Ani akhir pekan ini!",
         "mood": "senang", "visibility": "family", "date": iso(now() - timedelta(days=3)), "created_at": iso()},
    ])

    # ------- tasks -------
    await db.tasks.insert_many([
        {"id": nid(), "family_id": fam1["id"], "title": "Bayar tagihan listrik", "assignee_id": yogi["id"],
         "assignee_name": "Yogi Fernanda", "due_date": iso(now() + timedelta(days=2)), "priority": "high",
         "status": "todo", "created_at": iso()},
        {"id": nid(), "family_id": fam1["id"], "title": "Belanja bulanan", "assignee_id": siti["id"],
         "assignee_name": "Siti Fernanda", "due_date": iso(now() + timedelta(days=1)), "priority": "medium",
         "status": "todo", "created_at": iso()},
        {"id": nid(), "family_id": fam1["id"], "title": "Servis motor", "assignee_id": budi["id"],
         "assignee_name": "Budi Fernanda", "due_date": iso(now() + timedelta(days=5)), "priority": "low",
         "status": "done", "created_at": iso()},
    ])

    # ------- events -------
    await db.calendar_events.insert_many([
        {"id": nid(), "family_id": fam1["id"], "title": "Ulang tahun Ani", "description": "Perayaan di rumah",
         "date": iso(now() + timedelta(days=4)), "created_at": iso()},
        {"id": nid(), "family_id": fam1["id"], "title": "Rapat keluarga", "description": "Bahas anggaran bulan depan",
         "date": iso(now() + timedelta(days=7)), "created_at": iso()},
    ])

    # ------- shopping -------
    await db.shopping_items.insert_many([
        {"id": nid(), "family_id": fam1["id"], "name": "Beras 5kg", "quantity": 1, "category": "Sembako", "bought": False, "created_at": iso()},
        {"id": nid(), "family_id": fam1["id"], "name": "Susu", "quantity": 2, "category": "Sembako", "bought": True, "created_at": iso()},
        {"id": nid(), "family_id": fam1["id"], "name": "Sabun cuci", "quantity": 1, "category": "Kebersihan", "bought": False, "created_at": iso()},
    ])

    # ------- meal prep -------
    await db.meals.insert_many([
        {"id": nid(), "family_id": fam1["id"], "user_id": siti["id"], "author_name": "Siti Fernanda",
         "title": "Nasi goreng spesial", "meal_type": "makan_malam",
         "date": iso(now() + timedelta(days=1)), "done": False,
         "ingredients": ["2 piring nasi", "3 butir telur", "Bawang merah & putih", "Kecap manis", "Ayam suwir"],
         "notes": "Tambahkan acar timun sebagai pelengkap.", "created_at": iso()},
        {"id": nid(), "family_id": fam1["id"], "user_id": yogi["id"], "author_name": "Yogi Fernanda",
         "title": "Sup ayam hangat", "meal_type": "makan_siang",
         "date": iso(now() + timedelta(days=2)), "done": False,
         "ingredients": ["1 ekor ayam", "Wortel", "Kentang", "Daun bawang & seledri", "Kaldu ayam"],
         "notes": "", "created_at": iso()},
        {"id": nid(), "family_id": fam1["id"], "user_id": budi["id"], "author_name": "Budi Fernanda",
         "title": "Roti bakar cokelat", "meal_type": "sarapan",
         "date": iso(now()), "done": True,
         "ingredients": ["Roti tawar", "Cokelat meses", "Mentega", "Susu kental manis"],
         "notes": "Menu andalan pagi hari.", "created_at": iso()},
    ])

    # ------- invitations & join requests -------
    await db.invitations.insert_one({
        "id": nid(), "family_id": fam1["id"], "code": code("KEL"),
        "code_hash": "", "role": "member", "email": "paman@keluarga.id",
        "invited_by": yogi["id"], "invited_by_name": "Yogi Fernanda",
        "status": "pending", "used": False,
        "expires_at": iso(now() + timedelta(days=7)), "created_at": iso()})
    await db.join_requests.insert_one({
        "id": nid(), "family_id": fam1["id"], "user_id": ani["id"], "user_name": "Bibi Rina",
        "user_email": "rina@keluarga.id", "role": "member", "status": "pending",
        "message": "Ingin ikut mengatur keuangan keluarga.", "created_at": iso()})

    # ------- activity log -------
    acts = [
        ("family.created", "Yogi Fernanda membuat keluarga", 10),
        ("member.joined", "Siti Fernanda bergabung ke keluarga", 9),
        ("member.joined", "Budi Fernanda bergabung ke keluarga", 8),
        ("transaction.created", "Yogi Fernanda menambah pemasukan Gaji bulanan", 2),
        ("journal.created", "Yogi Fernanda menulis jurnal 'Minggu yang produktif'", 1),
    ]
    await db.activity_logs.insert_many([
        {"id": nid(), "family_id": fam1["id"], "actor_id": yogi["id"], "actor_name": "Yogi Fernanda",
         "action": a, "message": m, "target": None, "created_at": iso(now() - timedelta(hours=h))}
        for a, m, h in acts])

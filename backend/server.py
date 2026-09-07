from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import logging
import uuid
import secrets
import string
import hashlib
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="KeluargaKita API")
api = APIRouter(prefix="/api")

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("keluargakita")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return str(uuid.uuid4())


def gen_code(prefix="KEL"):
    body = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    return f"{prefix}-{body}"


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


# ---------------------------------------------------------------------------
# Permission matrix
# ---------------------------------------------------------------------------
ROLES = ["owner", "parent", "member", "child"]
ROLE_LABEL = {"owner": "Pemilik", "parent": "Orang Tua", "member": "Anggota", "child": "Anak"}

ACTION_ROLES = {
    "family.edit": {"owner"},
    "family.delete": {"owner"},
    "member.invite": {"owner", "parent"},
    "request.approve": {"owner", "parent"},
    "member.remove": {"owner"},
    "member.role_change": {"owner"},
    "ownership.transfer": {"owner"},
    "budget.manage": {"owner", "parent"},
    "goal.manage": {"owner", "parent"},
    "transaction.create": {"owner", "parent", "member"},
    "transaction.manage": {"owner", "parent"},
    "journal.create": {"owner", "parent", "member"},
    "task.create": {"owner", "parent", "member"},
    "task.manage": {"owner", "parent"},
    "calendar.manage": {"owner", "parent"},
    "shopping.manage": {"owner", "parent", "member"},
    "meal.create": {"owner", "parent", "member"},
    "meal.manage": {"owner", "parent"},
    "view": {"owner", "parent", "member", "child"},
}


def can(role: str, action: str) -> bool:
    return role in ACTION_ROLES.get(action, set())


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------
async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesi berakhir")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="Pengguna tidak ditemukan")
    return clean(user)


async def get_membership(family_id: str, user_id: str) -> dict:
    m = await db.family_members.find_one(
        {"family_id": family_id, "user_id": user_id, "status": "active"})
    if not m:
        raise HTTPException(status_code=403, detail="Anda bukan anggota keluarga ini")
    return clean(m)


async def require(family_id: str, user: dict, action: str) -> dict:
    m = await get_membership(family_id, user["id"])
    if not can(m["role"], action):
        raise HTTPException(status_code=403, detail="Peran Anda tidak memiliki izin ini")
    return m


async def log_activity(family_id, actor, action, message, target=None):
    await db.activity_logs.insert_one({
        "id": new_id(), "family_id": family_id,
        "actor_id": actor.get("id"), "actor_name": actor.get("name"),
        "action": action, "message": message, "target": target,
        "created_at": now_iso(),
    })


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class FamilyIn(BaseModel):
    name: str
    description: Optional[str] = ""
    avatar_url: Optional[str] = ""


class InviteIn(BaseModel):
    role: Literal["parent", "member", "child"] = "member"
    email: Optional[str] = ""
    expires_days: int = 7


class AcceptIn(BaseModel):
    code: str


class JoinRequestIn(BaseModel):
    code: str
    message: Optional[str] = ""


class RoleIn(BaseModel):
    role: Literal["parent", "member", "child"]


class TransferIn(BaseModel):
    new_owner_id: str


class TxIn(BaseModel):
    description: str
    category: str
    amount: float
    type: Literal["income", "expense"]
    date: Optional[str] = None


class BudgetIn(BaseModel):
    category: str
    limit: float


class GoalIn(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0
    target_date: Optional[str] = None


class JournalIn(BaseModel):
    title: str
    content: str
    mood: str = "senang"
    visibility: Literal["private", "family"] = "private"
    date: Optional[str] = None


class TaskIn(BaseModel):
    title: str
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None
    priority: Literal["low", "medium", "high"] = "medium"


class EventIn(BaseModel):
    title: str
    description: Optional[str] = ""
    date: str


class ShoppingIn(BaseModel):
    name: str
    quantity: int = 1
    category: Optional[str] = "Lainnya"


class MealIn(BaseModel):
    title: str
    meal_type: Literal["sarapan", "makan_siang", "makan_malam", "camilan"] = "makan_siang"
    date: Optional[str] = None
    ingredients: List[str] = []
    notes: Optional[str] = ""
    cost: float = 0


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    user = {"id": new_id(), "name": body.name, "email": email,
            "password_hash": hash_password(body.password),
            "avatar_url": "", "created_at": now_iso(), "updated_at": now_iso()}
    await db.users.insert_one(user)
    # every new user gets a default family and becomes owner
    await _create_family_for(user, body.name.split(" ")[0] and f"Keluarga {body.name.split(' ')[0]}")
    token = create_token(user["id"], email)
    return {"token": token, "user": clean(dict(user))}


@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau kata sandi salah")
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": clean(dict(user))}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    return {"ok": True}


# ---------------------------------------------------------------------------
# Family helpers
# ---------------------------------------------------------------------------
async def _create_family_for(user: dict, name: str, description="") -> dict:
    fam = {"id": new_id(), "name": name or "Keluarga Saya", "description": description,
           "avatar_url": "", "owner_id": user["id"], "join_code": gen_code("FAM"),
           "created_at": now_iso(), "updated_at": now_iso()}
    await db.families.insert_one(fam)
    await db.family_members.insert_one({
        "id": new_id(), "family_id": fam["id"], "user_id": user["id"],
        "role": "owner", "status": "active", "joined_at": now_iso(),
        "created_at": now_iso(), "updated_at": now_iso()})
    await log_activity(fam["id"], user, "family.created", f"{user['name']} membuat keluarga")
    return fam


async def _member_view(family_id: str) -> list:
    members = await db.family_members.find({"family_id": family_id}).to_list(1000)
    out = []
    for m in members:
        u = await db.users.find_one({"id": m["user_id"]})
        m = clean(m)
        m["name"] = u["name"] if u else "?"
        m["email"] = u["email"] if u else ""
        m["avatar_url"] = (u or {}).get("avatar_url", "")
        out.append(m)
    return out


async def _family_card(fam: dict, user_id: str) -> dict:
    fam = clean(dict(fam))
    count = await db.family_members.count_documents({"family_id": fam["id"], "status": "active"})
    mem = await db.family_members.find_one({"family_id": fam["id"], "user_id": user_id})
    fam["member_count"] = count
    fam["my_role"] = mem["role"] if mem else None
    return fam


# ---------------------------------------------------------------------------
# Family routes
# ---------------------------------------------------------------------------
@api.get("/families")
async def list_families(user: dict = Depends(get_current_user)):
    mems = await db.family_members.find({"user_id": user["id"], "status": "active"}).to_list(1000)
    out = []
    for m in mems:
        fam = await db.families.find_one({"id": m["family_id"]})
        if fam:
            out.append(await _family_card(fam, user["id"]))
    return out


@api.post("/families")
async def create_family(body: FamilyIn, user: dict = Depends(get_current_user)):
    fam = await _create_family_for(user, body.name, body.description or "")
    if body.avatar_url:
        await db.families.update_one({"id": fam["id"]}, {"$set": {"avatar_url": body.avatar_url}})
        fam["avatar_url"] = body.avatar_url
    return await _family_card(fam, user["id"])


@api.get("/families/{fid}")
async def get_family(fid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    fam = await db.families.find_one({"id": fid})
    if not fam:
        raise HTTPException(status_code=404, detail="Keluarga tidak ditemukan")
    return await _family_card(fam, user["id"])


@api.put("/families/{fid}")
async def update_family(fid: str, body: FamilyIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "family.edit")
    await db.families.update_one({"id": fid}, {"$set": {
        "name": body.name, "description": body.description or "",
        "avatar_url": body.avatar_url or "", "updated_at": now_iso()}})
    await log_activity(fid, user, "family.updated", f"{user['name']} memperbarui info keluarga")
    fam = await db.families.find_one({"id": fid})
    return await _family_card(fam, user["id"])


@api.delete("/families/{fid}")
async def delete_family(fid: str, user: dict = Depends(get_current_user)):
    await require(fid, user, "family.delete")
    for col in ["family_members", "invitations", "join_requests", "activity_logs",
                "transactions", "budgets", "goals", "journal_entries", "tasks",
                "calendar_events", "shopping_items"]:
        await db[col].delete_many({"family_id": fid})
    await db.families.delete_one({"id": fid})
    return {"ok": True}


@api.post("/families/{fid}/transfer")
async def transfer_ownership(fid: str, body: TransferIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "ownership.transfer")
    target = await db.family_members.find_one(
        {"family_id": fid, "user_id": body.new_owner_id, "status": "active"})
    if not target:
        raise HTTPException(status_code=400, detail="Anggota tujuan tidak valid")
    # atomic-ish role swap; no family without owner
    await db.family_members.update_one({"id": target["id"]}, {"$set": {"role": "owner", "updated_at": now_iso()}})
    await db.family_members.update_one(
        {"family_id": fid, "user_id": user["id"]}, {"$set": {"role": "parent", "updated_at": now_iso()}})
    await db.families.update_one({"id": fid}, {"$set": {"owner_id": body.new_owner_id, "updated_at": now_iso()}})
    tu = await db.users.find_one({"id": body.new_owner_id})
    await log_activity(fid, user, "ownership.transferred",
                       f"{user['name']} mengalihkan kepemilikan ke {tu['name']}")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Members
# ---------------------------------------------------------------------------
@api.get("/families/{fid}/members")
async def get_members(fid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    return await _member_view(fid)


@api.patch("/families/{fid}/members/{mid}/role")
async def change_role(fid: str, mid: str, body: RoleIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "member.role_change")
    m = await db.family_members.find_one({"id": mid, "family_id": fid})
    if not m:
        raise HTTPException(status_code=404, detail="Anggota tidak ditemukan")
    if m["role"] == "owner":
        raise HTTPException(status_code=400, detail="Tidak bisa mengubah peran pemilik")
    await db.family_members.update_one({"id": mid}, {"$set": {"role": body.role, "updated_at": now_iso()}})
    tu = await db.users.find_one({"id": m["user_id"]})
    await log_activity(fid, user, "member.role_changed",
                       f"{user['name']} mengubah peran {tu['name']} menjadi {ROLE_LABEL[body.role]}")
    return {"ok": True}


@api.delete("/families/{fid}/members/{mid}")
async def remove_member(fid: str, mid: str, user: dict = Depends(get_current_user)):
    await require(fid, user, "member.remove")
    m = await db.family_members.find_one({"id": mid, "family_id": fid})
    if not m:
        raise HTTPException(status_code=404, detail="Anggota tidak ditemukan")
    if m["role"] == "owner":
        raise HTTPException(status_code=400, detail="Pemilik tidak dapat dikeluarkan")
    await db.family_members.update_one({"id": mid}, {"$set": {"status": "removed", "updated_at": now_iso()}})
    tu = await db.users.find_one({"id": m["user_id"]})
    await log_activity(fid, user, "member.removed", f"{user['name']} mengeluarkan {tu['name']}")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------
@api.get("/families/{fid}/invitations")
async def list_invitations(fid: str, user: dict = Depends(get_current_user)):
    await require(fid, user, "member.invite")
    invs = await db.invitations.find({"family_id": fid}).sort("created_at", -1).to_list(1000)
    out = []
    for i in invs:
        i = clean(i)
        # mark expired
        if i["status"] == "pending" and i["expires_at"] < now_iso():
            i["status"] = "expired"
        out.append(i)
    return out


@api.post("/families/{fid}/invitations")
async def create_invitation(fid: str, body: InviteIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "member.invite")
    code = gen_code("KEL")
    inv = {"id": new_id(), "family_id": fid, "code": code,
           "code_hash": hashlib.sha256(code.encode()).hexdigest(),
           "role": body.role, "email": (body.email or "").lower(),
           "invited_by": user["id"], "invited_by_name": user["name"],
           "status": "pending", "used": False,
           "expires_at": (datetime.now(timezone.utc) + timedelta(days=body.expires_days)).isoformat(),
           "created_at": now_iso()}
    await db.invitations.insert_one(inv)
    await log_activity(fid, user, "invitation.created",
                       f"{user['name']} membuat undangan ({ROLE_LABEL[body.role]})")
    return clean(dict(inv))


@api.post("/families/{fid}/invitations/{iid}/revoke")
async def revoke_invitation(fid: str, iid: str, user: dict = Depends(get_current_user)):
    await require(fid, user, "member.invite")
    inv = await db.invitations.find_one({"id": iid, "family_id": fid})
    if not inv:
        raise HTTPException(status_code=404, detail="Undangan tidak ditemukan")
    await db.invitations.update_one({"id": iid}, {"$set": {"status": "revoked"}})
    await log_activity(fid, user, "invitation.revoked", f"{user['name']} mencabut undangan")
    return {"ok": True}


@api.get("/invitations/lookup/{code}")
async def lookup_invitation(code: str, user: dict = Depends(get_current_user)):
    inv = await db.invitations.find_one({"code": code.upper()})
    if not inv:
        raise HTTPException(status_code=404, detail="Kode undangan tidak ditemukan")
    if inv["status"] != "pending" or inv["used"]:
        raise HTTPException(status_code=400, detail="Undangan sudah tidak berlaku")
    if inv["expires_at"] < now_iso():
        raise HTTPException(status_code=400, detail="Undangan sudah kedaluwarsa")
    fam = await db.families.find_one({"id": inv["family_id"]})
    return {"family_name": fam["name"], "family_avatar": fam.get("avatar_url", ""),
            "role": inv["role"], "invited_by_name": inv.get("invited_by_name", ""),
            "code": inv["code"]}


@api.post("/invitations/accept")
async def accept_invitation(body: AcceptIn, user: dict = Depends(get_current_user)):
    inv = await db.invitations.find_one({"code": body.code.upper().strip()})
    if not inv:
        raise HTTPException(status_code=404, detail="Kode undangan tidak ditemukan")
    if inv["status"] != "pending" or inv["used"]:
        raise HTTPException(status_code=400, detail="Undangan sudah digunakan atau dicabut")
    if inv["expires_at"] < now_iso():
        await db.invitations.update_one({"id": inv["id"]}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=400, detail="Undangan sudah kedaluwarsa")
    existing = await db.family_members.find_one(
        {"family_id": inv["family_id"], "user_id": user["id"]})
    if existing and existing["status"] == "active":
        raise HTTPException(status_code=400, detail="Anda sudah menjadi anggota keluarga ini")
    if existing:
        await db.family_members.update_one({"id": existing["id"]}, {"$set": {
            "status": "active", "role": inv["role"], "joined_at": now_iso(), "updated_at": now_iso()}})
    else:
        await db.family_members.insert_one({
            "id": new_id(), "family_id": inv["family_id"], "user_id": user["id"],
            "role": inv["role"], "status": "active", "joined_at": now_iso(),
            "created_at": now_iso(), "updated_at": now_iso()})
    await db.invitations.update_one({"id": inv["id"]}, {"$set": {"status": "accepted", "used": True}})
    await log_activity(inv["family_id"], user, "member.joined",
                       f"{user['name']} bergabung ke keluarga")
    fam = await db.families.find_one({"id": inv["family_id"]})
    return await _family_card(fam, user["id"])


# ---------------------------------------------------------------------------
# Join requests (via permanent family join_code)
# ---------------------------------------------------------------------------
@api.post("/join-requests")
async def create_join_request(body: JoinRequestIn, user: dict = Depends(get_current_user)):
    fam = await db.families.find_one({"join_code": body.code.upper().strip()})
    if not fam:
        # maybe it's an invitation code -> accept directly
        raise HTTPException(status_code=404, detail="Kode keluarga tidak ditemukan")
    existing = await db.family_members.find_one({"family_id": fam["id"], "user_id": user["id"]})
    if existing and existing["status"] == "active":
        raise HTTPException(status_code=400, detail="Anda sudah menjadi anggota keluarga ini")
    dup = await db.join_requests.find_one(
        {"family_id": fam["id"], "user_id": user["id"], "status": "pending"})
    if dup:
        raise HTTPException(status_code=400, detail="Permintaan Anda sudah menunggu persetujuan")
    req = {"id": new_id(), "family_id": fam["id"], "user_id": user["id"],
           "user_name": user["name"], "user_email": user["email"],
           "role": "member", "status": "pending", "message": body.message or "",
           "created_at": now_iso()}
    await db.join_requests.insert_one(req)
    await log_activity(fam["id"], user, "join_request.created",
                       f"{user['name']} meminta bergabung")
    return {"family_name": fam["name"], **clean(dict(req))}


@api.get("/families/{fid}/join-requests")
async def list_join_requests(fid: str, user: dict = Depends(get_current_user)):
    await require(fid, user, "request.approve")
    reqs = await db.join_requests.find({"family_id": fid}).sort("created_at", -1).to_list(1000)
    return [clean(r) for r in reqs]


@api.post("/families/{fid}/join-requests/{rid}/approve")
async def approve_request(fid: str, rid: str, body: RoleIn = None, user: dict = Depends(get_current_user)):
    await require(fid, user, "request.approve")
    req = await db.join_requests.find_one({"id": rid, "family_id": fid})
    if not req or req["status"] != "pending":
        raise HTTPException(status_code=404, detail="Permintaan tidak ditemukan")
    role = body.role if body else req.get("role", "member")
    existing = await db.family_members.find_one({"family_id": fid, "user_id": req["user_id"]})
    if existing:
        await db.family_members.update_one({"id": existing["id"]}, {"$set": {
            "status": "active", "role": role, "joined_at": now_iso(), "updated_at": now_iso()}})
    else:
        await db.family_members.insert_one({
            "id": new_id(), "family_id": fid, "user_id": req["user_id"],
            "role": role, "status": "active", "joined_at": now_iso(),
            "created_at": now_iso(), "updated_at": now_iso()})
    await db.join_requests.update_one({"id": rid}, {"$set": {"status": "approved"}})
    await log_activity(fid, user, "join_request.approved",
                       f"{user['name']} menyetujui {req['user_name']} bergabung")
    return {"ok": True}


@api.post("/families/{fid}/join-requests/{rid}/reject")
async def reject_request(fid: str, rid: str, user: dict = Depends(get_current_user)):
    await require(fid, user, "request.approve")
    req = await db.join_requests.find_one({"id": rid, "family_id": fid})
    if not req or req["status"] != "pending":
        raise HTTPException(status_code=404, detail="Permintaan tidak ditemukan")
    await db.join_requests.update_one({"id": rid}, {"$set": {"status": "rejected"}})
    await log_activity(fid, user, "join_request.rejected",
                       f"{user['name']} menolak permintaan {req['user_name']}")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Activity log
# ---------------------------------------------------------------------------
@api.get("/families/{fid}/activity")
async def get_activity(fid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    logs = await db.activity_logs.find({"family_id": fid}).sort("created_at", -1).limit(100).to_list(100)
    return [clean(l) for l in logs]


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------
@api.get("/families/{fid}/transactions")
async def list_tx(fid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    txs = await db.transactions.find({"family_id": fid}).sort("date", -1).to_list(1000)
    return [clean(t) for t in txs]


@api.post("/families/{fid}/transactions")
async def create_tx(fid: str, body: TxIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "transaction.create")
    tx = {"id": new_id(), "family_id": fid, "user_id": user["id"], "member_name": user["name"],
          "description": body.description, "category": body.category, "amount": body.amount,
          "type": body.type, "date": body.date or now_iso(), "created_at": now_iso()}
    await db.transactions.insert_one(tx)
    await log_activity(fid, user, "transaction.created",
                       f"{user['name']} menambah {'pemasukan' if body.type=='income' else 'pengeluaran'} {body.description}")
    return clean(dict(tx))


@api.delete("/families/{fid}/transactions/{tid}")
async def delete_tx(fid: str, tid: str, user: dict = Depends(get_current_user)):
    await require(fid, user, "transaction.manage")
    await db.transactions.delete_one({"id": tid, "family_id": fid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Budgets
# ---------------------------------------------------------------------------
@api.get("/families/{fid}/budgets")
async def list_budgets(fid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    buds = await db.budgets.find({"family_id": fid}).to_list(1000)
    # compute spent per category (current month)
    month = now_iso()[:7]
    txs = await db.transactions.find({"family_id": fid, "type": "expense"}).to_list(5000)
    spent = {}
    for t in txs:
        if str(t.get("date", ""))[:7] == month:
            spent[t["category"]] = spent.get(t["category"], 0) + t["amount"]
    out = []
    for b in buds:
        b = clean(b)
        b["spent"] = spent.get(b["category"], 0)
        out.append(b)
    return out


@api.post("/families/{fid}/budgets")
async def upsert_budget(fid: str, body: BudgetIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "budget.manage")
    existing = await db.budgets.find_one({"family_id": fid, "category": body.category})
    if existing:
        await db.budgets.update_one({"id": existing["id"]}, {"$set": {"limit": body.limit}})
        b = await db.budgets.find_one({"id": existing["id"]})
    else:
        b = {"id": new_id(), "family_id": fid, "category": body.category,
             "limit": body.limit, "period": "month", "created_at": now_iso()}
        await db.budgets.insert_one(b)
    await log_activity(fid, user, "budget.updated", f"{user['name']} mengatur anggaran {body.category}")
    return clean(dict(b))


@api.delete("/families/{fid}/budgets/{bid}")
async def delete_budget(fid: str, bid: str, user: dict = Depends(get_current_user)):
    await require(fid, user, "budget.manage")
    await db.budgets.delete_one({"id": bid, "family_id": fid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Goals
# ---------------------------------------------------------------------------
@api.get("/families/{fid}/goals")
async def list_goals(fid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    goals = await db.goals.find({"family_id": fid}).to_list(1000)
    return [clean(g) for g in goals]


@api.post("/families/{fid}/goals")
async def create_goal(fid: str, body: GoalIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "goal.manage")
    g = {"id": new_id(), "family_id": fid, "name": body.name, "target_amount": body.target_amount,
         "current_amount": body.current_amount, "target_date": body.target_date, "created_at": now_iso()}
    await db.goals.insert_one(g)
    return clean(dict(g))


@api.put("/families/{fid}/goals/{gid}")
async def update_goal(fid: str, gid: str, body: GoalIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "goal.manage")
    await db.goals.update_one({"id": gid, "family_id": fid}, {"$set": {
        "name": body.name, "target_amount": body.target_amount,
        "current_amount": body.current_amount, "target_date": body.target_date}})
    g = await db.goals.find_one({"id": gid})
    return clean(dict(g))


@api.delete("/families/{fid}/goals/{gid}")
async def delete_goal(fid: str, gid: str, user: dict = Depends(get_current_user)):
    await require(fid, user, "goal.manage")
    await db.goals.delete_one({"id": gid, "family_id": fid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Journal
# ---------------------------------------------------------------------------
@api.get("/families/{fid}/journal")
async def list_journal(fid: str, scope: str = Query("family"), user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    if scope == "my":
        q = {"family_id": fid, "user_id": user["id"]}
    else:
        # family journal: family-visible entries + own private entries hidden from others
        q = {"family_id": fid, "visibility": "family"}
    entries = await db.journal_entries.find(q).sort("date", -1).to_list(1000)
    return [clean(e) for e in entries]


@api.post("/families/{fid}/journal")
async def create_journal(fid: str, body: JournalIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "journal.create")
    e = {"id": new_id(), "family_id": fid, "user_id": user["id"], "author_name": user["name"],
         "title": body.title, "content": body.content, "mood": body.mood,
         "visibility": body.visibility, "date": body.date or now_iso(), "created_at": now_iso()}
    await db.journal_entries.insert_one(e)
    await log_activity(fid, user, "journal.created",
                       f"{user['name']} menulis jurnal '{body.title}'")
    return clean(dict(e))


@api.delete("/families/{fid}/journal/{jid}")
async def delete_journal(fid: str, jid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    e = await db.journal_entries.find_one({"id": jid, "family_id": fid})
    if not e:
        raise HTTPException(status_code=404, detail="Jurnal tidak ditemukan")
    if e["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Hanya penulis yang dapat menghapus")
    await db.journal_entries.delete_one({"id": jid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------
@api.get("/families/{fid}/tasks")
async def list_tasks(fid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    tasks = await db.tasks.find({"family_id": fid}).sort("created_at", -1).to_list(1000)
    return [clean(t) for t in tasks]


@api.post("/families/{fid}/tasks")
async def create_task(fid: str, body: TaskIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "task.create")
    assignee_name = None
    if body.assignee_id:
        au = await db.users.find_one({"id": body.assignee_id})
        assignee_name = au["name"] if au else None
    t = {"id": new_id(), "family_id": fid, "title": body.title, "assignee_id": body.assignee_id,
         "assignee_name": assignee_name, "due_date": body.due_date, "priority": body.priority,
         "status": "todo", "created_at": now_iso()}
    await db.tasks.insert_one(t)
    return clean(dict(t))


@api.patch("/families/{fid}/tasks/{tid}")
async def toggle_task(fid: str, tid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    t = await db.tasks.find_one({"id": tid, "family_id": fid})
    if not t:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    new_status = "done" if t["status"] == "todo" else "todo"
    await db.tasks.update_one({"id": tid}, {"$set": {"status": new_status}})
    return {"status": new_status}


@api.delete("/families/{fid}/tasks/{tid}")
async def delete_task(fid: str, tid: str, user: dict = Depends(get_current_user)):
    await require(fid, user, "task.manage")
    await db.tasks.delete_one({"id": tid, "family_id": fid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Calendar events
# ---------------------------------------------------------------------------
@api.get("/families/{fid}/events")
async def list_events(fid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    ev = await db.calendar_events.find({"family_id": fid}).sort("date", 1).to_list(1000)
    return [clean(e) for e in ev]


@api.post("/families/{fid}/events")
async def create_event(fid: str, body: EventIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "calendar.manage")
    e = {"id": new_id(), "family_id": fid, "title": body.title,
         "description": body.description or "", "date": body.date, "created_at": now_iso()}
    await db.calendar_events.insert_one(e)
    return clean(dict(e))


@api.delete("/families/{fid}/events/{eid}")
async def delete_event(fid: str, eid: str, user: dict = Depends(get_current_user)):
    await require(fid, user, "calendar.manage")
    await db.calendar_events.delete_one({"id": eid, "family_id": fid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Shopping
# ---------------------------------------------------------------------------
@api.get("/families/{fid}/shopping")
async def list_shopping(fid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    items = await db.shopping_items.find({"family_id": fid}).sort("created_at", -1).to_list(1000)
    return [clean(i) for i in items]


@api.post("/families/{fid}/shopping")
async def create_shopping(fid: str, body: ShoppingIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "shopping.manage")
    i = {"id": new_id(), "family_id": fid, "name": body.name, "quantity": body.quantity,
         "category": body.category or "Lainnya", "bought": False, "created_at": now_iso()}
    await db.shopping_items.insert_one(i)
    return clean(dict(i))


@api.patch("/families/{fid}/shopping/{sid}")
async def toggle_shopping(fid: str, sid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    i = await db.shopping_items.find_one({"id": sid, "family_id": fid})
    if not i:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    await db.shopping_items.update_one({"id": sid}, {"$set": {"bought": not i["bought"]}})
    return {"bought": not i["bought"]}


@api.delete("/families/{fid}/shopping/{sid}")
async def delete_shopping(fid: str, sid: str, user: dict = Depends(get_current_user)):
    await require(fid, user, "shopping.manage")
    await db.shopping_items.delete_one({"id": sid, "family_id": fid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Meal Prep
# ---------------------------------------------------------------------------
@api.get("/families/{fid}/meals")
async def list_meals(fid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    meals = await db.meals.find({"family_id": fid}).sort("date", 1).to_list(1000)
    return [clean(m) for m in meals]


@api.post("/families/{fid}/meals")
async def create_meal(fid: str, body: MealIn, user: dict = Depends(get_current_user)):
    await require(fid, user, "meal.create")
    m = {"id": new_id(), "family_id": fid, "user_id": user["id"], "author_name": user["name"],
         "title": body.title, "meal_type": body.meal_type,
         "date": body.date or now_iso(), "ingredients": body.ingredients or [],
         "notes": body.notes or "", "cost": body.cost or 0, "done": False, "created_at": now_iso()}
    await db.meals.insert_one(m)
    await log_activity(fid, user, "meal.created", f"{user['name']} merencanakan menu '{body.title}'")
    return clean(dict(m))


@api.patch("/families/{fid}/meals/{mid}")
async def toggle_meal(fid: str, mid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    m = await db.meals.find_one({"id": mid, "family_id": fid})
    if not m:
        raise HTTPException(status_code=404, detail="Menu tidak ditemukan")
    await db.meals.update_one({"id": mid}, {"$set": {"done": not m.get("done", False)}})
    return {"done": not m.get("done", False)}


@api.delete("/families/{fid}/meals/{mid}")
async def delete_meal(fid: str, mid: str, user: dict = Depends(get_current_user)):
    m = await db.meals.find_one({"id": mid, "family_id": fid})
    if not m:
        raise HTTPException(status_code=404, detail="Menu tidak ditemukan")
    mem = await get_membership(fid, user["id"])
    if m["user_id"] != user["id"] and not can(mem["role"], "meal.manage"):
        raise HTTPException(status_code=403, detail="Tidak memiliki izin menghapus menu ini")
    await db.meals.delete_one({"id": mid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@api.get("/families/{fid}/dashboard")
async def dashboard(fid: str, user: dict = Depends(get_current_user)):
    await get_membership(fid, user["id"])
    month = now_iso()[:7]
    txs = await db.transactions.find({"family_id": fid}).to_list(5000)
    income = expense = m_income = m_expense = 0
    for t in txs:
        if t["type"] == "income":
            income += t["amount"]
            if str(t.get("date", ""))[:7] == month:
                m_income += t["amount"]
        else:
            expense += t["amount"]
            if str(t.get("date", ""))[:7] == month:
                m_expense += t["amount"]
    members = await db.family_members.count_documents({"family_id": fid, "status": "active"})
    tasks_open = await db.tasks.count_documents({"family_id": fid, "status": "todo"})
    return {
        "balance": income - expense,
        "month_income": m_income,
        "month_expense": m_expense,
        "member_count": members,
        "tasks_open": tasks_open,
        "recent_transactions": [clean(t) for t in sorted(txs, key=lambda x: x.get("date", ""), reverse=True)[:5]],
    }


# ---------------------------------------------------------------------------
# App wiring
# ---------------------------------------------------------------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.family_members.create_index([("family_id", 1), ("user_id", 1)])
    await db.families.create_index("join_code")
    await db.invitations.create_index("code")
    from seed import run_seed
    await run_seed(db)


@app.on_event("shutdown")
async def shutdown():
    client.close()

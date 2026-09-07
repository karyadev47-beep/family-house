"""Comprehensive backend tests for KeluargaKita multi-family invitation system."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://household-invite.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER = {"email": "karyadev47@gmail.com", "password": "Keluarga123!"}
PARENT = {"email": "siti@keluarga.id", "password": "anggota123"}
MEMBER = {"email": "budi@keluarga.id", "password": "anggota123"}
CHILD = {"email": "ani@keluarga.id", "password": "anggota123"}


def _login(cred):
    r = requests.post(f"{API}/auth/login", json=cred, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    d = r.json()
    assert "token" in d and "user" in d
    return d


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="session")
def owner():
    return _login(OWNER)


@pytest.fixture(scope="session")
def parent():
    return _login(PARENT)


@pytest.fixture(scope="session")
def member():
    return _login(MEMBER)


@pytest.fixture(scope="session")
def child():
    return _login(CHILD)


@pytest.fixture(scope="session")
def fam1_id(owner):
    r = requests.get(f"{API}/families", headers=_hdr(owner["token"]))
    assert r.status_code == 200
    fams = r.json()
    fern = [f for f in fams if f["name"] == "Keluarga Fernanda"]
    assert fern, "seed family missing"
    return fern[0]["id"]


# ---------------- Auth ----------------
class TestAuth:
    def test_login_owner(self, owner):
        assert owner["user"]["email"] == OWNER["email"]
        assert "password_hash" not in owner["user"]

    def test_me(self, owner):
        r = requests.get(f"{API}/auth/me", headers=_hdr(owner["token"]))
        assert r.status_code == 200
        assert r.json()["email"] == OWNER["email"]

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_bad_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": OWNER["email"], "password": "wrong"})
        assert r.status_code == 401


# ---------------- Families ----------------
class TestFamilies:
    def test_list_families(self, owner):
        r = requests.get(f"{API}/families", headers=_hdr(owner["token"]))
        assert r.status_code == 200
        fams = r.json()
        names = {f["name"] for f in fams}
        assert "Keluarga Fernanda" in names
        assert "Keluarga Orang Tua" in names
        fern = [f for f in fams if f["name"] == "Keluarga Fernanda"][0]
        assert fern["my_role"] == "owner"
        assert fern["member_count"] >= 4

    def test_dashboard(self, owner, fam1_id):
        r = requests.get(f"{API}/families/{fam1_id}/dashboard", headers=_hdr(owner["token"]))
        assert r.status_code == 200
        d = r.json()
        for k in ["balance", "month_income", "month_expense", "member_count", "recent_transactions"]:
            assert k in d
        assert d["member_count"] >= 4
        assert isinstance(d["recent_transactions"], list)

    def test_family_isolation(self, fam1_id):
        # Create outsider user
        email = f"test_outsider_{uuid.uuid4().hex[:8]}@test.io"
        r = requests.post(f"{API}/auth/register", json={"name": "Out", "email": email, "password": "outer123"})
        assert r.status_code == 200
        tok = r.json()["token"]
        # outsider should get 403 on fam1 resources
        r = requests.get(f"{API}/families/{fam1_id}/transactions", headers=_hdr(tok))
        assert r.status_code == 403
        r = requests.get(f"{API}/families/{fam1_id}/budgets", headers=_hdr(tok))
        assert r.status_code == 403


# ---------------- Members ----------------
class TestMembers:
    def test_list_members(self, owner, fam1_id):
        r = requests.get(f"{API}/families/{fam1_id}/members", headers=_hdr(owner["token"]))
        assert r.status_code == 200
        mems = r.json()
        assert len(mems) >= 4
        for m in mems:
            assert "name" in m and "email" in m and "role" in m
            assert "password_hash" not in m

    def test_role_change_owner_rejected(self, owner, fam1_id):
        r = requests.get(f"{API}/families/{fam1_id}/members", headers=_hdr(owner["token"]))
        owner_m = [m for m in r.json() if m["role"] == "owner"][0]
        r = requests.patch(f"{API}/families/{fam1_id}/members/{owner_m['id']}/role",
                           json={"role": "parent"}, headers=_hdr(owner["token"]))
        assert r.status_code == 400

    def test_role_change_and_remove_flow(self, owner, fam1_id):
        # invite a fresh user & accept, then change role & remove
        inv = requests.post(f"{API}/families/{fam1_id}/invitations",
                            json={"role": "member", "expires_days": 1},
                            headers=_hdr(owner["token"]))
        assert inv.status_code == 200
        code = inv.json()["code"]

        email = f"test_rr_{uuid.uuid4().hex[:8]}@test.io"
        r = requests.post(f"{API}/auth/register", json={"name": "RR", "email": email, "password": "pwd12345"})
        tok = r.json()["token"]
        r = requests.post(f"{API}/invitations/accept", json={"code": code}, headers=_hdr(tok))
        assert r.status_code == 200

        mems = requests.get(f"{API}/families/{fam1_id}/members", headers=_hdr(owner["token"])).json()
        target = [m for m in mems if m["email"] == email][0]

        # change role
        r = requests.patch(f"{API}/families/{fam1_id}/members/{target['id']}/role",
                           json={"role": "child"}, headers=_hdr(owner["token"]))
        assert r.status_code == 200
        mems = requests.get(f"{API}/families/{fam1_id}/members", headers=_hdr(owner["token"])).json()
        assert [m for m in mems if m["id"] == target["id"]][0]["role"] == "child"

        # remove
        r = requests.delete(f"{API}/families/{fam1_id}/members/{target['id']}", headers=_hdr(owner["token"]))
        assert r.status_code == 200


# ---------------- Invitations ----------------
class TestInvitations:
    def test_full_invitation_flow(self, owner, fam1_id):
        r = requests.post(f"{API}/families/{fam1_id}/invitations",
                          json={"role": "member", "expires_days": 1},
                          headers=_hdr(owner["token"]))
        assert r.status_code == 200
        inv = r.json()
        code = inv["code"]
        assert code.startswith("KEL-")

        # lookup with any authed user
        r = requests.get(f"{API}/invitations/lookup/{code}", headers=_hdr(owner["token"]))
        assert r.status_code == 200
        assert r.json()["family_name"] == "Keluarga Fernanda"

        # register new user and accept
        email = f"test_inv_{uuid.uuid4().hex[:8]}@test.io"
        rr = requests.post(f"{API}/auth/register", json={"name": "Inv", "email": email, "password": "pwd12345"})
        assert rr.status_code == 200
        newtok = rr.json()["token"]
        r = requests.post(f"{API}/invitations/accept", json={"code": code}, headers=_hdr(newtok))
        assert r.status_code == 200

        # second use rejected
        r2 = requests.post(f"{API}/invitations/accept", json={"code": code}, headers=_hdr(newtok))
        assert r2.status_code == 400

    def test_revoked_cannot_accept(self, owner, fam1_id):
        r = requests.post(f"{API}/families/{fam1_id}/invitations",
                          json={"role": "member"}, headers=_hdr(owner["token"]))
        inv = r.json()
        rv = requests.post(f"{API}/families/{fam1_id}/invitations/{inv['id']}/revoke",
                           headers=_hdr(owner["token"]))
        assert rv.status_code == 200

        email = f"test_rv_{uuid.uuid4().hex[:8]}@test.io"
        rr = requests.post(f"{API}/auth/register", json={"name": "Rv", "email": email, "password": "pwd12345"})
        tok = rr.json()["token"]
        r = requests.post(f"{API}/invitations/accept", json={"code": inv["code"]}, headers=_hdr(tok))
        assert r.status_code == 400


# ---------------- Permissions ----------------
class TestPermissions:
    def test_member_cannot_invite(self, member, fam1_id):
        r = requests.post(f"{API}/families/{fam1_id}/invitations",
                          json={"role": "member"}, headers=_hdr(member["token"]))
        assert r.status_code == 403

    def test_member_cannot_change_roles(self, owner, member, fam1_id):
        mems = requests.get(f"{API}/families/{fam1_id}/members", headers=_hdr(owner["token"])).json()
        parent_m = [m for m in mems if m["role"] == "parent"][0]
        r = requests.patch(f"{API}/families/{fam1_id}/members/{parent_m['id']}/role",
                           json={"role": "member"}, headers=_hdr(member["token"]))
        assert r.status_code == 403

    def test_member_can_create_transaction(self, member, fam1_id):
        r = requests.post(f"{API}/families/{fam1_id}/transactions",
                          json={"description": "TEST_tx", "category": "Makanan",
                                "amount": 1000, "type": "expense"},
                          headers=_hdr(member["token"]))
        assert r.status_code == 200
        assert r.json()["description"] == "TEST_tx"

    def test_child_cannot_create_transaction(self, child, fam1_id):
        r = requests.post(f"{API}/families/{fam1_id}/transactions",
                          json={"description": "TEST_child", "category": "X",
                                "amount": 1000, "type": "expense"},
                          headers=_hdr(child["token"]))
        assert r.status_code == 403

    def test_child_can_view(self, child, fam1_id):
        r = requests.get(f"{API}/families/{fam1_id}/transactions", headers=_hdr(child["token"]))
        assert r.status_code == 200


# ---------------- Join Requests ----------------
class TestJoinRequests:
    def test_join_flow(self, owner, fam1_id):
        # get join_code
        r = requests.get(f"{API}/families/{fam1_id}", headers=_hdr(owner["token"]))
        join_code = r.json()["join_code"]

        email = f"test_jr_{uuid.uuid4().hex[:8]}@test.io"
        rr = requests.post(f"{API}/auth/register", json={"name": "JR", "email": email, "password": "pwd12345"})
        tok = rr.json()["token"]

        r = requests.post(f"{API}/join-requests", json={"code": join_code, "message": "hi"},
                          headers=_hdr(tok))
        assert r.status_code == 200

        reqs = requests.get(f"{API}/families/{fam1_id}/join-requests",
                            headers=_hdr(owner["token"])).json()
        mine = [x for x in reqs if x["user_email"] == email and x["status"] == "pending"]
        assert mine
        rid = mine[0]["id"]

        r = requests.post(f"{API}/families/{fam1_id}/join-requests/{rid}/approve",
                          headers=_hdr(owner["token"]))
        assert r.status_code == 200

        # user now member
        fams = requests.get(f"{API}/families", headers=_hdr(tok)).json()
        assert any(f["id"] == fam1_id for f in fams)

    def test_join_reject(self, owner, fam1_id):
        r = requests.get(f"{API}/families/{fam1_id}", headers=_hdr(owner["token"]))
        join_code = r.json()["join_code"]
        email = f"test_jr2_{uuid.uuid4().hex[:8]}@test.io"
        rr = requests.post(f"{API}/auth/register", json={"name": "JR2", "email": email, "password": "pwd12345"})
        tok = rr.json()["token"]
        requests.post(f"{API}/join-requests", json={"code": join_code}, headers=_hdr(tok))
        reqs = requests.get(f"{API}/families/{fam1_id}/join-requests",
                            headers=_hdr(owner["token"])).json()
        rid = [x for x in reqs if x["user_email"] == email][0]["id"]
        r = requests.post(f"{API}/families/{fam1_id}/join-requests/{rid}/reject",
                          headers=_hdr(owner["token"]))
        assert r.status_code == 200


# ---------------- Budgets/Goals/Journal/Tasks/Events/Shopping ----------------
class TestResources:
    def test_budgets_spent(self, owner, fam1_id):
        r = requests.get(f"{API}/families/{fam1_id}/budgets", headers=_hdr(owner["token"]))
        assert r.status_code == 200
        buds = r.json()
        assert buds
        for b in buds:
            assert "spent" in b and "limit" in b and "category" in b

    def test_goals_crud(self, owner, fam1_id):
        r = requests.post(f"{API}/families/{fam1_id}/goals",
                          json={"name": "TEST_goal", "target_amount": 1000000, "current_amount": 0},
                          headers=_hdr(owner["token"]))
        assert r.status_code == 200
        gid = r.json()["id"]
        r = requests.delete(f"{API}/families/{fam1_id}/goals/{gid}", headers=_hdr(owner["token"]))
        assert r.status_code == 200

    def test_journal_visibility(self, owner, parent, fam1_id):
        # parent (siti) creates a private journal
        rp = requests.post(f"{API}/families/{fam1_id}/journal",
                           json={"title": "TEST_priv", "content": "x", "visibility": "private"},
                           headers=_hdr(parent["token"]))
        assert rp.status_code == 200
        # family scope for owner: should NOT include private of parent
        r = requests.get(f"{API}/families/{fam1_id}/journal?scope=family",
                         headers=_hdr(owner["token"])).json()
        assert not any(e["title"] == "TEST_priv" for e in r)
        # my scope for parent: includes own private
        r = requests.get(f"{API}/families/{fam1_id}/journal?scope=my",
                         headers=_hdr(parent["token"])).json()
        assert any(e["title"] == "TEST_priv" for e in r)

    def test_tasks_flow(self, owner, fam1_id):
        r = requests.post(f"{API}/families/{fam1_id}/tasks",
                          json={"title": "TEST_task"}, headers=_hdr(owner["token"]))
        assert r.status_code == 200
        tid = r.json()["id"]
        r = requests.patch(f"{API}/families/{fam1_id}/tasks/{tid}", headers=_hdr(owner["token"]))
        assert r.status_code == 200
        assert r.json()["status"] == "done"
        requests.delete(f"{API}/families/{fam1_id}/tasks/{tid}", headers=_hdr(owner["token"]))

    def test_events(self, owner, fam1_id):
        r = requests.post(f"{API}/families/{fam1_id}/events",
                          json={"title": "TEST_ev", "date": "2026-06-01T00:00:00Z"},
                          headers=_hdr(owner["token"]))
        assert r.status_code == 200
        eid = r.json()["id"]
        requests.delete(f"{API}/families/{fam1_id}/events/{eid}", headers=_hdr(owner["token"]))

    def test_shopping_toggle(self, owner, fam1_id):
        r = requests.post(f"{API}/families/{fam1_id}/shopping",
                          json={"name": "TEST_item"}, headers=_hdr(owner["token"]))
        assert r.status_code == 200
        sid = r.json()["id"]
        r = requests.patch(f"{API}/families/{fam1_id}/shopping/{sid}", headers=_hdr(owner["token"]))
        assert r.status_code == 200
        assert r.json()["bought"] is True
        requests.delete(f"{API}/families/{fam1_id}/shopping/{sid}", headers=_hdr(owner["token"]))


# ---------------- Ownership Transfer ----------------
class TestOwnershipTransfer:
    def test_transfer_and_back(self, owner, fam1_id):
        # find parent (siti) id
        mems = requests.get(f"{API}/families/{fam1_id}/members", headers=_hdr(owner["token"])).json()
        siti = [m for m in mems if m["email"] == PARENT["email"]][0]
        yogi = [m for m in mems if m["email"] == OWNER["email"]][0]

        # transfer to siti
        r = requests.post(f"{API}/families/{fam1_id}/transfer",
                          json={"new_owner_id": siti["user_id"]},
                          headers=_hdr(owner["token"]))
        assert r.status_code == 200

        mems2 = requests.get(f"{API}/families/{fam1_id}/members", headers=_hdr(owner["token"])).json()
        owners = [m for m in mems2 if m["role"] == "owner"]
        assert len(owners) == 1
        assert owners[0]["email"] == PARENT["email"]
        assert [m for m in mems2 if m["email"] == OWNER["email"]][0]["role"] == "parent"

        # transfer back using parent's token
        sitok = _login(PARENT)["token"]
        r = requests.post(f"{API}/families/{fam1_id}/transfer",
                          json={"new_owner_id": yogi["user_id"]},
                          headers=_hdr(sitok))
        assert r.status_code == 200

        mems3 = requests.get(f"{API}/families/{fam1_id}/members", headers=_hdr(owner["token"])).json()
        owners3 = [m for m in mems3 if m["role"] == "owner"]
        assert len(owners3) == 1
        assert owners3[0]["email"] == OWNER["email"]

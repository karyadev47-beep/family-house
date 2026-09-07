# KeluargaKita — Multi-Family & Family Invitation System

## Original Problem Statement
Extend a Family Management app into a multi-member household system (inspired by OpenFamily):
Family/Household, Family Members, Invite (via code), Invitation/Join code, Join Request,
Roles & Permissions, Family Switcher, family-scoped Budget/Journal/Transactions/Tasks/Calendar/Shopping,
Audit Activity, Ownership Transfer. UI must use shadcn/ui, clean modern SaaS, Bahasa Indonesia, IDR.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor), UUID string ids. JWT auth (Bearer, token in body). `/app/backend/server.py`, seed at `/app/backend/seed.py`.
- **Frontend**: React + shadcn/ui + Tailwind (semantic tokens), react-router, recharts. Contexts: `AuthContext` (kk_token), `FamilyContext` (active family, kk_active_family).
- **Authorization**: server-side membership + role check on every family-scoped route (equivalent to RLS; MongoDB has no RLS). `ACTION_ROLES` matrix + `can()` + `require()`/`get_membership()` dependencies.
- **Data isolation**: every resource carries `family_id`; non-members get 403.

## Data model (collections)
users, families (owner_id, join_code), family_members (role owner/parent/member/child, status active/pending/suspended/removed),
invitations (code, single-use, expiry, revoke), join_requests, activity_logs,
transactions, budgets, goals, journal_entries (private/family), tasks, calendar_events, shopping_items.

## Permission matrix
- Owner: full access (edit/delete family, invite, approve, remove, role change, transfer, manage all).
- Parent: invite, approve requests, manage budget/transactions/tasks/calendar, view. NOT delete/transfer/remove.
- Member: view, create transactions, view budget, create own journal, create tasks, manage shopping.
- Child: view-only (restricted).

## Implemented (2026-06)
- JWT auth (register/login/me/logout); new users auto-get a default family as owner.
- Families CRUD + Family Switcher (Command search), create/join dialogs.
- Members management (role change, remove; owner protected).
- Invitations: create (code KEL-XXXXXX), lookup preview, accept (single-use + expiry), revoke; result dialog with copy link + WhatsApp share; pending invitations data table.
- Join via code page `/join-family/:code`; Join Requests (via permanent FAM-XXXXXX code) approve/reject.
- Ownership transfer (new owner promoted before old owner demoted → never ownerless) + delete family.
- Finance: Overview (pie/bar charts), Transactions (table, filter, add/delete), Budget (progress per category vs spent), Goals.
- Journal: My/Family scopes, private stays private, mood + visibility, Journal calendar (mood grid).
- Planning: Tasks (assignee/priority/toggle), Calendar events, Shopping list.
- Dashboard: greeting, balance/income/expense/members stat cards, monthly budget progress, recent activity + transactions.
- Audit activity log (member.invited/joined/removed/role_changed, invitation.*, join_request.*, ownership.transferred, transaction.created, journal.created, etc.).
- Settings tabs: Umum, Anggota & Peran, Undangan & Kode, Izin Akses (permission matrix), Zona Berbahaya.
- Seed: 2 families, 4 users, budgets/transactions/goals/journal/tasks/events/shopping + pending invitation & join request + activity.
- Bahasa Indonesia UI, IDR formatting, responsive sidebar + mobile Sheet, dark/light theme.

## Verified
26/26 backend pytest pass; all frontend flows verified (testing agent iteration_1). Tests at `/app/backend/tests/test_keluargakita.py`.

## Update (2026-06)
- Invitations are now **code-only** (email field removed from the invite dialog; joining is by code → user enters the family).
- New **Meal Prep** feature (`/planning/meals`): plan dishes with meal type (sarapan/makan siang/makan malam/camilan), date, ingredient list, notes; mark as cooked; delete (author or owner/parent); "Ke Belanja" button pushes all ingredients into the Shopping list. Backend collection `meals`, endpoints GET/POST/PATCH/DELETE `/api/families/{fid}/meals` with meal.create (owner/parent/member) and meal.manage (owner/parent). Sidebar item added under Perencanaan.

## Backlog / TODO (P2, optional)
- Use invitation `code_hash` for lookup instead of plaintext (currently plaintext for re-copy UX).
- True multi-doc Mongo transaction for transfer (needs replica set); current ordering avoids ownerless state.
- Login rate-limiting / lockout.
- Email delivery of invitations (currently code/link only, by user choice).
- Explicit CORS origins for production.

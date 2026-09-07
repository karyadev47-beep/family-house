# Auth Testing — KeluargaKita

JWT is returned in the login/register response body (field `token`) and stored in
localStorage as `kk_token`. Send as `Authorization: Bearer <token>` on all protected requests.

## Accounts
- karyadev47@gmail.com / Keluarga123!  (Owner of "Keluarga Fernanda" & "Keluarga Orang Tua")
- siti@keluarga.id / anggota123  (Parent)
- budi@keluarga.id / anggota123  (Member)
- ani@keluarga.id  / anggota123  (Child)

## API smoke test
```
API=https://household-invite.preview.emergentagent.com
TOKEN=$(curl -s -X POST $API/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"karyadev47@gmail.com","password":"Keluarga123!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s $API/api/auth/me -H "Authorization: Bearer $TOKEN"
curl -s $API/api/families -H "Authorization: Bearer $TOKEN"
```

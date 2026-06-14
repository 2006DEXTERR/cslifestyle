# Auth Follow-Up — 2FA Coverage Report

> TOTP two-factor authentication surface and test coverage. Date: 2026-06-14.

---

## 1. Capabilities delivered

| Capability | Status | Detail |
| ---------- | :----: | ------ |
| Authenticator-app (TOTP) support | ✅ | otplib v12, SHA-1/6-digit/30s, ±1 step skew tolerance |
| QR generation | ✅ | `qrcode` → PNG data URL from the otpauth URI |
| Manual secret entry | ✅ | base32 secret returned alongside the QR |
| Backup recovery codes | ✅ | 10 single-use codes (XXXXX-XXXXX), hashed at rest, reuse-rejected |
| Per-user opt-in enablement | ✅ | `/api/auth/2fa/setup` → `enable`; default off |
| Disable | ✅ | requires a valid TOTP **or** backup code |
| Regenerate backup codes | ✅ | requires a current TOTP code |
| Two-step login challenge | ✅ | password → short-lived challenge JWT → `/login/2fa` |
| Login via backup code | ✅ | single-use; consumed on use |
| Admin enforcement option | ✅ | `Setting auth.enforce_2fa_roles` + policy GET/PUT; soft `mustEnable2fa` flag |
| Secret encryption at rest | ✅ | AES-256-GCM (`ENCRYPTION_KEY`) |
| Anti-brute-force on codes | ✅ | dedicated 2FA rate limiter (10/15m/IP) |
| CSRF on 2FA mutations | ✅ | setup/enable/disable/backup-codes |

## 2. Endpoints

| Endpoint | Auth | Notes |
| -------- | ---- | ----- |
| `GET /api/auth/2fa/status` | session | enabled/pending + backup codes remaining |
| `POST /api/auth/2fa/setup` | session + CSRF | returns secret, otpauthUri, qrDataUrl |
| `POST /api/auth/2fa/enable` | session + CSRF | verify code → enable + backup codes (once) |
| `POST /api/auth/2fa/disable` | session + CSRF + 2FA-limiter | verify TOTP/backup → disable |
| `POST /api/auth/2fa/backup-codes` | session + CSRF | regenerate (requires TOTP) |
| `POST /api/auth/login/2fa` | challenge | 2FA-limiter; completes login |
| `GET/PUT /api/v1/admin/security/2fa-policy` | session + RBAC (settings.view/edit) | enforced roles |

All documented in Swagger (`/docs`); 7 new 2FA/security paths verified present.

## 3. Test coverage

**Unit:** `totp.test.ts` (generate/verify/URI/QR), `backup-codes.test.ts` (format/normalise/hash),
`crypto.test.ts` (AES-GCM round-trip/tamper), `challenge.test.ts` (challenge sign/verify + reject
access token).

**Integration (verified vs real Postgres):** `twofactor.integration.test.ts` —
- setup → wrong code rejected (400) → enable with valid TOTP → backup codes returned;
- login returns `twoFactorRequired` + challenge (no session cookies);
- `/login/2fa` with TOTP → session; `/me` works;
- wrong 2FA code → 401;
- login via backup code → 200; **same backup code reused → 401**;
- disable → status off → subsequent normal login has no challenge;
- admin policy GET/PUT + `mustEnable2fa` flag on enforced-role login.

## 4. Frontend

- **Login page** handles the challenge step (code input) inline, existing design system.
- **`/account/security`** page: enable (QR + secret + code → backup codes w/ copy), disable.
- `lib/auth.ts`: `loginTwoFactor`, `twoFactorStatus/Setup/Enable/Disable`, `regenerateBackupCodes`,
  `LoginResponse` union. No existing page restyled.

## 5. Gaps / follow-ups

- No nav entry to `/account/security` yet (reachable directly) — add when account menu is built.
- Hard-enforcement (block privileged login until enrolled) is intentionally soft (`mustEnable2fa`)
  to avoid lockout; can be hardened later (ADR-016).
- No WebAuthn/passkeys (future); no "remember this device".
- Frontend 2FA flows lack component/E2E tests (backend flows fully covered).

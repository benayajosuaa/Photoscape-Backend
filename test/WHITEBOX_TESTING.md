# Whitebox Testing (Backend) – Mapping ke PDF “TESTING Plan - Detailing Project”

Dokumen PDF merinci unit backend seperti JWT, middleware auth, OTP, mailer, contact-us, business time, dan helper payment. Implementasi whitebox test untuk unit-unit yang **pure / minim side-effect** sudah dibuat dengan Node built-in test runner.

## Cara menjalankan

Di folder `backend/`:

- `npm test`

Script yang dipakai: `node --test --import ./ts-node-register.mjs test/*.test.ts`

## Coverage unit (sesuai daftar PDF)

### 1) Auth & Identity

- JWT: `generateToken()`, `verifyToken()`, `revokeToken()`, `getTokenExpiration()`
  - Test: `backend/test/jwt.test.ts`
- Middlewares auth: `extractBearerToken()`, `authenticateExpress()`, `requireRoles()`
  - Test: `backend/test/auth-middleware.test.ts`
- Refresh token: `RefreshTokenServices.issue()`, `verify()`, `revoke()`, `rotate()`
  - Test: `backend/test/refresh-token.test.ts`

### 2) Register & OTP

- OTP: `generateOTP()`, `verifyOTP()`
  - Test: `backend/test/otp.test.ts`

### 3) Public Website (Contact Us)

- Contact service: `ContactServices.sendMessage()` termasuk validasi & escaping HTML
  - Test: `backend/test/contact.test.ts`
- Validator email: `validateEmail()` (ter-cover melalui test Contact)
  - Implementasi: `backend/src/utils/validator.ts`

### 4) Booking Meta & Availability (Time Helper)

- Business time helper: `getBusinessTimeZone()`, `toUtcClockInTimeZone()`, `getNowScheduleClock()`
  - Test: `backend/test/business-time.test.ts`

### 5) Payment helpers

- Payment helpers: `isPaymentMethod()`, `isVirtualAccountMethod()`, `buildPaymentExpiry()`,
  `buildTicketQrCode()`, `getPaymentInstructions()`
  - Test: `backend/test/payment.test.ts`

### 6) Mailer

- Mailer: `sendEmail()`, `sendOTPEmail()`
  - Test (dengan mock `nodemailer.createTransport`): `backend/test/mailer.test.ts`

## Unit yang belum di-test (butuh DB/Prisma atau flow end-to-end)

Beberapa unit di PDF (mis. `AuthService.loginUser()`, booking/payment controller/service, report, admin ops, notification jobs) banyak bergantung ke Prisma + data schedule/booking.

Kalau kamu mau, next step yang paling “whitebox-friendly”:

- Tambah test dengan **mock Prisma client** untuk `auth.service.ts`, `booking.service.ts`, `payment.services.ts` (bagian transaksi) tanpa konek DB.
- Atau tambah test integration dengan database test (mis. PostgreSQL docker / ephemeral) + seed minimal.


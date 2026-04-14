# PlacementPath Backend

## Start the app

```powershell
cd "C:\Users\dupam\OneDrive\Desktop\placement-portal"
npm start
```

Open `http://localhost:3000`.

## What the backend does

- Serves the existing frontend pages.
- Stores registered students in SQLite at `data/placement-portal.db`.
- Handles student register, login, logout, and session checks.
- Protects student-only pages and the admin dashboard.

## Optional environment variables

Copy `.env.example` values into your shell before starting the server:

```powershell
$env:PORT=3000
$env:SESSION_SECRET="replace-this-with-a-long-random-secret"
$env:ADMIN_EMAIL="admin@placementpath.local"
$env:ADMIN_PASSWORD="admin123"
npm start
```

## Admin dashboard

- Admin login page: `http://localhost:3000/admin-login.html`
- Admin dashboard: `http://localhost:3000/admin.html`

Admin credentials are configured through environment variables:

  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
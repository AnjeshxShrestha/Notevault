# NoteVault — Secure Notes & Reminders App

A production-grade, security-first web application for private notes and recurring reminders. Built with Node.js, Express, MongoDB, and vanilla JS.

---

## Security Features

| Feature | Implementation |
|---|---|
| Password Hashing | bcryptjs with 12 salt rounds |
| Session Management | JWT in HTTP-only cookies (never localStorage) |
| NoSQL Injection Prevention | express-mongo-sanitize + Mongoose (no raw queries) |
| XSS Prevention | Helmet CSP headers + input escaping |
| CSRF Protection | SameSite=Strict cookies |
| Brute Force Protection | express-rate-limit (10 login attempts / 15 min) |
| Input Validation | express-validator on all endpoints |
| HTTP Security Headers | Helmet middleware |
| Data Isolation | Every query filters by user._id |
| Error Sanitization | No stack traces exposed to users |
| Suspicious Activity Logging | Winston logger with security.log |

---

## Prerequisites

- **Node.js** v18 or later
- **MongoDB** v6 or later (running locally or MongoDB Atlas)
- **npm** v9 or later

---

## Quick Start

### 1. Clone / Download the project

```bash
# Navigate to the project folder
cd notevault
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Edit the `.env` file in the project root:

```env
PORT=3000
NODE_ENV=development

# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/notevault

# CHANGE THESE IN PRODUCTION - use long random strings
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_EXPIRES_IN=7d
COOKIE_SECRET=your-cookie-secret-change-this

# Rate limiting
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=10
```

> **⚠️ Important:** Always change `JWT_SECRET` and `COOKIE_SECRET` to strong random strings before deploying.

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4. Start MongoDB

**Local:**
```bash
mongod --dbpath /data/db
```

**macOS with Homebrew:**
```bash
brew services start mongodb-community
```

**Docker:**
```bash
docker run -d -p 27017:27017 --name mongo mongo:7
```

### 5. Run the application

**Development (with auto-restart):**
```bash
npm run dev
```

**Production:**
```bash
NODE_ENV=production npm start
```

### 6. Open the app

Navigate to: **http://localhost:3000**

---

## Project Structure

```
notevault/
├── server.js              # Express app entry point
├── package.json
├── .env                   # Environment config (never commit!)
│
├── config/
│   └── database.js        # MongoDB connection
│
├── models/
│   ├── User.js            # User schema (password hashed in pre-save)
│   ├── Note.js            # Note schema (user-isolated)
│   └── Reminder.js        # Reminder schema with recurrence rules
│
├── controllers/
│   ├── authController.js  # register, login, logout, getMe
│   ├── noteController.js  # CRUD for notes
│   └── reminderController.js  # CRUD for reminders
│
├── routes/
│   ├── authRoutes.js
│   ├── noteRoutes.js
│   └── reminderRoutes.js
│
├── middleware/
│   ├── auth.js            # JWT verify + cookie setter
│   ├── validate.js        # express-validator rules
│   ├── rateLimiter.js     # Rate limit configs
│   └── errorHandler.js    # Global error handler (no stack traces)
│
├── utils/
│   ├── logger.js          # Winston logger
│   └── reminderEngine.js  # node-cron reminder checker
│
├── logs/                  # Auto-created
│   ├── combined.log
│   ├── error.log
│   └── security.log
│
└── public/                # Frontend
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js         # API client layer
        └── app.js         # App logic
```

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login (rate limited) |
| POST | `/api/auth/logout` | Yes | Logout + clear cookie |
| GET | `/api/auth/me` | Yes | Get current user |

### Notes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/notes` | Yes | Get all user's notes |
| POST | `/api/notes` | Yes | Create note |
| PUT | `/api/notes/:id` | Yes | Update note (owner only) |
| DELETE | `/api/notes/:id` | Yes | Delete note (owner only) |

### Reminders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/reminders` | Yes | Get all user's reminders |
| GET | `/api/reminders/triggered` | Yes | Get recently triggered |
| POST | `/api/reminders` | Yes | Create reminder |
| DELETE | `/api/reminders/:id` | Yes | Delete reminder (owner only) |

---

## Recurring Reminders

Supported recurrence types:

| Type | Description | Required Fields |
|---|---|---|
| `none` | One-time reminder | `dateTime` |
| `daily` | Every day at set time | `dateTime` (time used) |
| `weekly` | Every week on day | `dateTime` + `recurrence.dayOfWeek` (0=Sun) |
| `monthly` | Every month on day | `dateTime` + `recurrence.dayOfMonth` (1-31) |
| `yearly` | Every year | `dateTime` + `recurrence.dayOfMonth` + `recurrence.month` (1-12) |

The reminder engine (node-cron) runs every minute and checks all active reminders.

---

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET` (48+ random bytes)
- [ ] Generate strong `COOKIE_SECRET`
- [ ] Set `MONGODB_URI` to your production MongoDB
- [ ] Enable HTTPS (required for `secure` cookie flag)
- [ ] Set `ALLOWED_ORIGIN` to your domain
- [ ] Review and tighten rate limits
- [ ] Use a process manager (PM2): `pm2 start server.js`
- [ ] Set up log rotation for the `logs/` directory
- [ ] Consider MongoDB Atlas for managed hosting

---

## Security Notes

- Passwords are hashed with **bcryptjs at 12 salt rounds** (>300ms per hash, brute-force resistant)
- JWT tokens are stored in **httpOnly cookies** — JavaScript on the page cannot read them
- All MongoDB queries go through **Mongoose** — no string interpolation, no raw queries
- User input is sanitized with **express-mongo-sanitize** to strip `$` and `.` operators
- The **`user._id`** is always injected server-side — users cannot forge ownership
- Login error messages are **intentionally generic** to prevent user enumeration
- No internal errors, stack traces, or MongoDB details are ever sent to the client

# Watermelon Room Service

Watermelon Room Service is a hotel room service system. Guests can make requests from their room, staff can see them on a dashboard, and the system tracks inventory. The backend is built with Node.js and MariaDB. Later, the project will also use real-time updates and separate guest and staff interfaces.

## What this backend does now

Right now this project includes the backend skeleton plus a secure login flow and staff management tools. It already has:

- Express server
- MariaDB connection
- environment config
- basic routes
- DB-backed guest and staff login
- bcrypt password verification
- signed HTTP-only session cookie auth
- simple guest and staff landing pages
- staff CRUD management from the staff dashboard
- global error handling
- Socket.IO setup for future real-time updates

Current test routes:

- `GET /health`
- `GET /login`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/staff`
- `POST /api/staff`
- `PUT /api/staff/:staffId`
- `DELETE /api/staff/:staffId`
- `GET /docs/staff`
- `GET /docs/staff.json`
- `GET /api/requests`
- `GET /api/inventory`

## Project structure

```text
watermelon-room-service/
├─ src/
│  ├─ app.js
│  ├─ server.js
│  ├─ config/
│  │  ├─ env.js
│  │  └─ db.js
│  ├─ routes/
│  │  ├─ health.routes.js
│  │  ├─ auth.routes.js
│  │  ├─ page.routes.js
│  │  ├─ staff.routes.js
│  │  ├─ requests.routes.js
│  │  └─ inventory.routes.js
│  ├─ controllers/
│  │  ├─ health.controller.js
│  │  ├─ auth.controller.js
│  │  ├─ page.controller.js
│  │  ├─ staff.controller.js
│  │  ├─ requests.controller.js
│  │  └─ inventory.controller.js
│  ├─ middleware/
│  │  ├─ errorHandler.js
│  │  ├─ auth.js
│  │  └─ notFound.js
│  ├─ sockets/
│  │  └─ index.js
│  ├─ utils/
│  │  ├─ apiError.js
│  │  ├─ logger.js
│  │  └─ session.js
│  └─ services/
│     ├─ auth-schema.service.js
│     ├─ auth.service.js
│     └─ staff.service.js
├─ public/
│  ├─ login.html
│  ├─ login.js
│  ├─ guest.html
│  ├─ guest-main.js
│  ├─ staff.html
│  ├─ staff-main.js
│  ├─ page-main.js
│  └─ styles.css
├─ sql/
│  └─ schema.sql
├─ .env.example
├─ .gitignore
├─ package.json
└─ README.md
```

## File and folder explanation

### `src/app.js`

This builds the Express app.  
It adds middleware and connects routes.

### `src/server.js`

This starts the server.  
It also starts Socket.IO and checks database connection.

### `src/config/`

This folder stores project configuration.

- `env.js` reads values from `.env`
- `db.js` creates the MariaDB connection pool

### `src/routes/`

This folder defines API paths.

- `health.routes.js` handles health checks
- `auth.routes.js` handles login/logout/session endpoints
- `page.routes.js` handles the login, guest, and staff pages
- `staff.routes.js` handles staff CRUD endpoints
- `requests.routes.js` handles guest requests
- `inventory.routes.js` handles inventory endpoints

### `src/controllers/`

Controllers receive the HTTP request and return the HTTP response.

- `health.controller.js` returns API status
- `auth.controller.js` handles login/session responses
- `page.controller.js` serves the browser pages
- `staff.controller.js` validates and handles staff CRUD requests
- `requests.controller.js` handles request endpoints
- `inventory.controller.js` handles inventory endpoints

### `src/services/`

Services will hold business logic.  
This keeps controllers simple.

Example:

- authentication and session logic
- staff management logic
- request creation logic
- stock reservation logic
- fulfillment logic

### `src/middleware/`

This folder contains Express middleware.

- `errorHandler.js` returns safe error responses
- `auth.js` protects role-based routes and API endpoints
- `notFound.js` handles unknown routes

### `src/sockets/`

This folder handles real-time communication with Socket.IO.

### `src/utils/`

Small shared helper files.

- `apiError.js` creates structured errors
- `logger.js` prints logs
- `session.js` signs and verifies the session cookie

### `public/`

This folder contains the browser pages and client-side scripts.

- `login.html` and `login.js` handle sign-in
- `guest.html` and `guest-main.js` handle the guest landing page
- `staff.html` and `staff-main.js` handle the staff dashboard and staff CRUD table
- `page-main.js` contains shared authenticated dashboard logic
- `styles.css` contains the current UI styling

### `sql/schema.sql`

This file creates the current MariaDB schema for rooms, staff, inventory, requests, statuses, transactions, and stocktaking.

### `.env.example`

This shows which environment variables are needed.

### `.gitignore`

This prevents files like `.env` and `node_modules` from going into Git.

## Why the structure is like this

The project brief says the code must be split properly, not kept in one file.  
It also says:

- server startup should be separate
- routes should be grouped by feature
- database access should be isolated
- environment config should be centralized

This structure follows those rules. It keeps the project simple and easy to grow.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

Copy `.env.example` to `.env` and fill in your real values.

Example:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=watermelon_room_service
DB_USER=root
DB_PASSWORD=your_password_here
CLIENT_ORIGIN=http://localhost:5173
SESSION_SECRET=replace_this_with_a_long_random_secret
```

### 3. Create the database

In MariaDB:

```sql
CREATE DATABASE watermelon_room_service;
```

### 4. Run the schema

```bash
mysql -u root -p watermelon_room_service < sql/schema.sql
```

The server also ensures the `rooms` and `staff` auth tables exist on startup and migrates older auth-table column names to the current snake_case schema before dropping old plaintext `pass` columns.

### 5. Start the backend

```bash
npm run dev
```

## Test the backend

### Health check

```bash
curl http://localhost:3000/health
```

### Login page

Open `http://localhost:3000/login` in a browser.

The schema file contains sample room, staff, inventory, request, and stocktaking data when you import it manually.
The server does not insert those sample records automatically on startup.
If you want known demo passwords for manually imported seeded users, replace the inserted `password_hash` values with bcrypt hashes for passwords you choose.

Room numbers redirect to `/guest` after successful login.
Staff emails redirect to `/staff` after successful login.

### Staff management

After staff login, the staff dashboard includes a table and form for:

- listing staff users
- creating staff users
- updating staff users
- deleting staff users

The role field is a dropdown in the UI.
Passwords are always hashed on the server before storage.
The currently signed-in staff user cannot delete their own active account.

### Swagger docs

Interactive Swagger UI for the staff API is available at `/docs/staff`.
The raw OpenAPI JSON is available at `/docs/staff.json`.
The staff API uses the signed `wrs_session` cookie from `/api/auth/login` for authentication.

### Requests route

```bash
curl http://localhost:3000/api/requests
```

### Inventory route

```bash
curl http://localhost:3000/api/inventory
```

### Unknown route test

```bash
curl http://localhost:3000/not-real
```

## Current expected results

- `/health` returns API status
- `/login` serves the login UI
- `/api/auth/login` verifies a bcrypt hash and sets an HTTP-only signed cookie
- successful room login redirects the browser to `/guest`
- successful staff login redirects the browser to `/staff`
- `/api/staff` supports authenticated staff CRUD operations
- `/docs/staff` serves interactive Swagger documentation for the staff API
- `/api/requests` returns an empty array for now
- `/api/inventory` returns an empty array for now
- wrong routes return structured 404 errors

## Git workflow used in this project

The brief requires a real Git workflow. It says:

- do not commit directly to `main`
- use feature branches
- use commit names like `feat(scope): message`
- keep `main` always working

This project follows that workflow.

### Branch format

- `feature/...`
- `fix/...`

### Commit format

- `feat(server): add Express bootstrap`
- `feat(api): add inventory routes`
- `fix(db): correct connection config`

## Notes

This is still an early backend.  
Next steps will add:

- request creation
- stock reservation
- request status updates
- room-based WebSocket updates
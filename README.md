# Watermelon Room Service

Watermelon Room Service is a hotel room service system. Guests can make requests from their room, staff can see them on a dashboard, and the system tracks inventory. The backend is built with Node.js and MariaDB. Later, the project will also use real-time updates and separate guest and staff interfaces.

## What this backend does now

Right now this project includes the backend skeleton plus a simple secure login flow. It already has:

- Express server
- MariaDB connection
- environment config
- basic routes
- DB-backed guest and staff login
- bcrypt password verification
- signed HTTP-only session cookie auth
- simple guest and staff landing pages
- global error handling
- Socket.IO setup for future real-time updates

Current test routes:

- `GET /health`
- `GET /login`
- `POST /api/auth/login`
- `GET /api/auth/me`
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
│  │  ├─ requests.routes.js
│  │  └─ inventory.routes.js
│  ├─ controllers/
│  │  ├─ health.controller.js
│  │  ├─ auth.controller.js
│  │  ├─ page.controller.js
│  │  ├─ requests.controller.js
│  │  └─ inventory.controller.js
│  ├─ middleware/
│  │  ├─ errorHandler.js
│  │  └─ notFound.js
│  ├─ sockets/
│  │  └─ index.js
│  ├─ utils/
│  │  ├─ apiError.js
│  │  └─ logger.js
│  └─ services/
│     ├─ request.service.js
│     └─ inventory.service.js
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
- `requests.routes.js` handles guest requests
- `inventory.routes.js` handles inventory endpoints

### `src/controllers/`

Controllers receive the HTTP request and return the HTTP response.

- `health.controller.js` returns API status
- `auth.controller.js` handles login/session responses
- `page.controller.js` serves the browser pages
- `requests.controller.js` handles request endpoints
- `inventory.controller.js` handles inventory endpoints

### `src/services/`

Services will hold business logic.  
This keeps controllers simple.

Example:

- authentication and session logic
- request creation logic
- stock reservation logic
- fulfillment logic

### `src/middleware/`

This folder contains Express middleware.

- `errorHandler.js` returns safe error responses
- `notFound.js` handles unknown routes

### `src/sockets/`

This folder handles real-time communication with Socket.IO.

### `src/utils/`

Small shared helper files.

- `apiError.js` creates structured errors
- `logger.js` prints logs

### `sql/schema.sql`

This file creates the database tables, including the secure `rooms` and `staff` login tables with seeded demo users.

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

The server also ensures the `rooms` and `staff` auth tables exist on startup and migrates old plaintext `pass` columns to `password_hash` with bcrypt before dropping the plaintext column.

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

Demo credentials seeded by default:

- Guest: room `101` with password `101pass`
- Guest: room `202` with password `202pass`
- Staff: `alice.porter@hotel.test` with password `alice.staff`
- Staff: `bob.service@hotel.test` with password `bob.staff`

Room numbers redirect to `/guest` after successful login.
Staff emails redirect to `/staff` after successful login.

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
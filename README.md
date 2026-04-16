# Watermelon Room Service

Watermelon Room Service is a hotel operations backend with secure room and staff login, a browser-based staff dashboard, and MariaDB-backed CRUD for staff and rooms.

## Current features

- Express server with MariaDB connection pooling
- request logging with request ids
- bcrypt password verification for login
- signed HTTP-only cookie sessions
- guest and staff page routing
- staff CRUD from the staff dashboard
- room CRUD from the staff dashboard
- staff self-delete protection
- Swagger UI for staff and room APIs
- Socket.IO bootstrap for future realtime work

## Main routes

- `GET /login`
- `GET /guest`
- `GET /staff`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/staff`
- `POST /api/staff`
- `PUT /api/staff/:staffId`
- `DELETE /api/staff/:staffId`
- `GET /api/rooms`
- `POST /api/rooms`
- `PUT /api/rooms/:roomId`
- `DELETE /api/rooms/:roomId`
- `GET /api-docs`
- `GET /api-docs.json`

## Setup

1. Install dependencies.

```bash
npm install
```

2. Create `.env` from `.env.example`.

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

3. Create the database.

```sql
CREATE DATABASE watermelon_room_service;
```

4. Import the schema if you want the sample data from the SQL script.

```bash
mysql -u root -p watermelon_room_service < sql/schema.sql
```

5. Start the app.

```bash
npm run dev
```

You can also run:

```bash
npm start
```

## Startup behavior

The server creates the `rooms` and `staff` tables if they do not exist and migrates older auth columns to the current snake_case schema.

The server does **not** auto-insert sample room or staff records on startup.

Sample data is only inserted when you manually import [sql/schema.sql](sql/schema.sql).

## Logging and errors

- each request gets an `X-Request-Id` header
- request logs include the request id, method, path, status, and response time
- API errors return JSON with `error`, `statusCode`, and `requestId`
- server logs keep stack traces in development for easier debugging

## Dashboard behavior

The staff dashboard at [public/staff.html](public/staff.html) now manages both staff users and rooms.

- staff passwords are hashed on the server
- room passwords are hashed on the server
- the staff role field is a dropdown
- the signed-in staff user cannot delete their own active account
- room and staff deletes check database `affectedRows` so failed deletes do not silently pass

## Swagger

Swagger UI is available at `http://localhost:3000/api-docs`.

The raw OpenAPI document is available at `http://localhost:3000/api-docs.json`.

The documented protected endpoints use the signed `wrs_session` cookie from `/api/auth/login`.
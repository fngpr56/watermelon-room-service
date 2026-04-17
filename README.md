# Watermelon Room Service

Watermelon Room Service is a hotel operations web app built with Express, MariaDB, and Socket.IO. It combines a room-facing guest experience, a staff operations dashboard, stock-aware request fulfillment, realtime guest help conversations, and signed per-tab session tokens so guest and staff sessions stay isolated inside the browser.

## Feature breakdown

### Authentication and session handling

- room users log in with room number and password
- staff users log in with email and password
- room and staff passwords are hashed with bcrypt before storage
- `/api/auth/login` returns a signed session token instead of creating a traditional server-side browser session
- the same signed token is reused for page navigation, API requests, and Socket.IO connections
- sessions are stored per browser tab through `sessionStorage`, which keeps multiple room or staff sessions isolated from each other

### Guest-facing features

- a guest home page focused on quick request entry
- freeform request text such as `two towels` or `need extra pillows`
- live request catalog loading from `/api/requests/catalog`
- automatic inventory item matching based on request text
- automatic quantity detection from digits and number words
- manual item and quantity override dropdowns before submit
- a guest tasks page that lists request date, category, status, ETA, and notes
- a guest help page for room-specific front desk conversations
- guest help refresh through both Socket.IO events and polling fallback

### Staff-facing features

- a single browser dashboard for hotel operations staff
- dedicated `runner` and `receptionist` staff roles in addition to the existing staff roles
- staff create, update, and delete forms with table-based record management
- room create, update, and delete forms from the same dashboard
- password show/hide controls on login, staff, and room forms
- self-delete protection for the currently signed-in staff account
- guest conversation inbox for front desk workflows
- housekeeping-only inventory management panels
- recent inventory assignment create, edit, and delete actions for housekeeping users
- a runner-only delivery queue page for inventory-backed guest requests
- a receptionist-only operations page with live metrics, charts, and stocktaking reporting

### Inventory and fulfillment features

- inventory item tracking with name, category, unit, stock, reserved quantity, and low-stock threshold
- room inventory assignments that immediately reduce stock levels
- guest request matching that can create linked `request_items`, `inventory_transactions`, and `inventory_room_assignments` rows
- automatic attempt to assign matched guest inventory requests to housekeeping staff when possible
- inventory-backed guest requests are surfaced to runners through a dedicated queue with accept, decline, and complete actions
- request status management through a dedicated statuses API
- stocktaking CRUD endpoints for reconciliation and audit-style adjustments
- stocktaking validation requires a reason when expected and physical counts do not match
- receptionist stocktaking entries feed a current-month discrepancy report with reason and activity charts

### Realtime, docs, and operational features

- realtime guest and staff conversation updates through Socket.IO
- realtime housekeeping inventory refresh events through Socket.IO
- realtime runner queue refresh events through Socket.IO
- realtime receptionist overview refresh events through Socket.IO
- Swagger UI and raw OpenAPI output
- per-request `X-Request-Id` correlation headers
- structured application logging with redaction of sensitive auth and session fields
- centralized API error responses with request ids

## Frontend pages

- `GET /` redirects authenticated users to their role-specific page and otherwise serves the login flow
- `GET /login` serves the shared login page for both room and staff users
- `GET /guest` serves the guest quick-request home page
- `GET /guest/tasks` serves the guest request history page
- `GET /guest/help` serves the guest help conversation page
- `GET /staff` serves the staff operations dashboard
- `GET /runner` serves the runner delivery queue page
- `GET /receptionist` serves the receptionist operations and stocktaking page

## Main API routes

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Staff and rooms

- `GET /api/staff`
- `POST /api/staff`
- `PUT /api/staff/:staffId`
- `DELETE /api/staff/:staffId`
- `GET /api/rooms`
- `POST /api/rooms`
- `PUT /api/rooms/:roomId`
- `DELETE /api/rooms/:roomId`

### Request statuses

- `GET /api/statuses`
- `POST /api/statuses`
- `PUT /api/statuses/:statusId`
- `DELETE /api/statuses/:statusId`

### Inventory

- `GET /api/inventory`
- `POST /api/inventory`
- `PUT /api/inventory/:inventoryId`
- `DELETE /api/inventory/:inventoryId`
- `GET /api/inventory/assignments`
- `POST /api/inventory/assignments`
- `PUT /api/inventory/assignments/:assignmentId`
- `DELETE /api/inventory/assignments/:assignmentId`

### Guest requests

- `GET /api/requests/catalog`
- `GET /api/requests`
- `POST /api/requests`
- `PUT /api/requests/:requestId`
- `DELETE /api/requests/:requestId`

### Conversations

- `GET /api/conversations`
- `GET /api/conversations/current`
- `POST /api/conversations/current/messages`
- `GET /api/conversations/:conversationId`
- `POST /api/conversations/:conversationId/messages`

### Stocktaking

- `GET /api/stocktaking`
- `POST /api/stocktaking`
- `PUT /api/stocktaking/:id`
- `DELETE /api/stocktaking/:id`

### Runner

- `GET /api/runner/requests`
- `POST /api/runner/requests/:requestId/accept`
- `POST /api/runner/requests/:requestId/decline`
- `POST /api/runner/requests/:requestId/complete`

### Receptionist

- `GET /api/receptionist/overview`
- `POST /api/receptionist/stocktaking`

### Docs

- `GET /api-docs`
- `GET /api-docs.json`

## Session model

The app no longer relies on a traditional server-side cookie session flow for page and API auth.

- `/api/auth/login` returns a signed session token
- the browser stores that token in `sessionStorage`
- page routes keep the token in the `session` query parameter
- API requests send the token through the `x-wrs-session` header
- Socket.IO connections send the token through `auth.sessionToken`

This keeps guest and staff sessions isolated per browser tab.

## Guest request and help flow

The guest flow is split into three focused pages instead of one overloaded dashboard.

- the guest home page is optimized for fast text entry and simple inventory requests
- freeform text is scored against the live inventory catalog so the UI can suggest a likely item match
- quantity is inferred from both digits and common number words such as `one`, `two`, or `couple`
- the guest can leave the form on auto-detect or manually choose the inventory item and quantity before submitting
- the server accepts both purely freeform requests and inventory-linked requests
- when an inventory match is confirmed, the backend can create related request, reservation, transaction, and room-assignment records in the same flow
- the tasks page lets the guest review submitted requests with status, ETA, and notes without needing staff assistance
- the help page opens the room's front desk conversation thread and supports both explicit refresh and background realtime updates
- if the realtime socket is unavailable, the help page still refreshes through polling so the guest thread remains usable

## Staff dashboard flow

The staff dashboard groups several hotel operations workflows into one authenticated page.

- all signed-in staff users can manage staff records and room records from browser forms and tables
- the active staff account cannot delete itself, which prevents accidental lockout from the dashboard
- room and staff passwords are only stored as hashes on the server even though the forms provide temporary show/hide toggles in the browser
- the guest conversation area gives staff a shared inbox for room help requests
- front desk staff are the intended role for answering guest conversations
- housekeeping staff see additional inventory panels for stock management and room delivery tracking
- non-housekeeping staff do not see those inventory sections and cannot use the protected inventory API flow
- housekeeping can create, update, and delete inventory items as well as create, edit, and delete recent room assignments
- the dashboard also acts as the live receiver for housekeeping inventory refresh broadcasts
- runner staff get a separate queue page for inventory-backed request fulfillment
- receptionist staff get a separate overview page with room, request, and stocktaking visibility

## Realtime and fallback behavior

- staff conversation lists and guest help threads receive `conversation:updated` events
- guest sockets join room-specific conversation channels so each room only receives its own thread updates
- staff sockets join a shared staff conversation channel, and housekeeping, runner, and receptionist roles also join their own role-specific realtime rooms
- housekeeping dashboards receive `inventory:updated` events after stock-affecting changes
- runner dashboards receive `runner:request-updated` events after queue-affecting request changes
- receptionist dashboards receive `receptionist:overview-updated` events after request, room, inventory, runner, or stocktaking changes
- the server validates Socket.IO sessions using the same signed token model as HTTP routes
- the guest help page keeps a polling fallback in addition to sockets so conversation refresh still works during socket failure

## Runner queue flow

- inventory-backed guest requests enter the runner queue in `received` status
- runners can accept, decline, or complete requests from their dedicated queue page
- queue updates are pushed in realtime through Socket.IO, with polling fallback if the socket is unavailable
- the runner service locks queue records during accept, decline, and complete transitions to prevent concurrent handling races
- the runner page includes client-side notification sound support for new queue arrivals after the browser has received a user interaction

## Receptionist overview flow

- the receptionist page combines occupancy, arrivals, departures, request mix, guest follow-up needs, and recent request activity in one live page
- the page also includes a stocktaking form where the receptionist enters an item, expected count, and physical count while the discrepancy is calculated automatically
- when the discrepancy is not zero, the API requires a reason such as `damaged`, `theft`, `miscounted`, or `supplier_error`
- the receptionist overview exposes current-month stocktaking summaries, discrepancy reason charts, daily activity charts, and recent stocktaking entries
- if realtime updates fail, the receptionist page still refreshes through periodic polling

## Setup

1. Install dependencies.

```bash
npm install
```

2. Create `.env` from `.env.example`.

```bash
cp .env.example .env
```

3. Review the environment values.

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

4. Create the database.

```sql
CREATE DATABASE watermelon_room_service;
```

5. Import the schema and sample data manually.

```bash
mysql -u root -p watermelon_room_service < sql/schema.sql
```

6. Start the app.

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

## Database and startup behavior

- the server checks the MariaDB connection before listening
- the server does **not** auto-create tables on startup
- the server does **not** auto-run migrations on startup
- the server does **not** auto-seed sample data on startup
- sample data only appears when you manually import `sql/schema.sql`

If you already have an older database and need the newer inventory assignment tables, run:

```bash
mysql -u root -p watermelon_room_service < sql/migrate_inventory_assignments.sql
```

## Logging and errors

- each request gets an `X-Request-Id` header for correlation across frontend, API, and logs
- request logs are written in a structured format and include method, path, status, duration, and request id
- sensitive fields such as authorization headers, cookies, passwords, and session tokens are redacted from logs
- API errors return JSON with `error`, `statusCode`, and `requestId`
- malformed JSON bodies and oversized request payloads are converted into clearer client-facing error messages
- startup failures such as database errors or port conflicts are logged centrally with structured context

## Swagger

Swagger UI is available at `http://localhost:3000/api-docs`.

The raw OpenAPI document is available at `http://localhost:3000/api-docs.json`.

## Database diagram

<img width="1442" height="951" alt="hotel_schema_drawio_clean" src="https://github.com/user-attachments/assets/47e6baba-759e-4faa-a023-2bdb14b16242" />

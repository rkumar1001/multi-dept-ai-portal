# Multi-Department AI Agent Portal

A single-portal, role-based access platform for deploying specialized AI agents across **Logistics**, **Restaurant**, **Finance**, **Accounting**, and **Sales** departments. Each department gets a dedicated AI assistant with domain-specific tools and data isolation.

## Architecture

```
[Browser] → [Next.js Frontend :3000] → [FastAPI Backend :8000]
                                              │
              ┌─────────────┬─────────────────┼──────────────┬──────────────┐
        [Logistics]    [Restaurant]     [Finance]     [Accounting]      [Sales]
              │              │              │              │               │
       [FleetHunt API] [POS/Menu]    [ERP Mock]    [AP/AR Mock]     [CRM Mock]
              └──────────────┴──────────────┴──────────────┴───────────────┘
                                        │
                                 [Claude API (Anthropic)]
                                 [SQLite Database]
```

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| LLM       | Anthropic Claude (claude-sonnet-4-20250514)  |
| Backend   | Python 3.12 / FastAPI             |
| Frontend  | Next.js 15 / React 19 / Tailwind  |
| Database  | SQLite (aiosqlite)                |
| Auth      | JWT (bcrypt + python-jose)        |
| Deploy    | Docker Compose                    |

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- An Anthropic API key
- (Optional) Docker & Docker Compose

### Option A — Local Development

```bash
# 1. Clone
git clone https://github.com/rkumar1001/multi-dept-ai-portal.git
cd multi-dept-ai-portal

# 2. Backend
cd backend
cp .env.example .env          # Edit .env and set ANTHROPIC_API_KEY (and FLEETHUNT_API_KEY for logistics)
python -m venv ../venv
..\venv\Scripts\activate      # Windows  (source ../venv/bin/activate on Mac/Linux)
pip install -r requirements.txt
cd ..
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000 --app-dir backend

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Option B — Docker Compose

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your keys
docker compose up --build
```

### Default Users

The backend auto-seeds these users on first startup:

| Email                       | Password | Department  | Role  |
|-----------------------------|----------|-------------|-------|
| admin@gmail.com             | admin    | restaurant  | admin |
| admin1@gmail.com            | admin    | logistics   | admin |
| themasalatwist@gmail.com    | oxnard   | restaurant  | user  |
| finance@demo.com            | admin    | finance     | admin |
| accounting@demo.com         | admin    | accounting  | admin |
| sales@demo.com              | admin    | sales       | admin |

## Department Agents

Each department gets a specialized AI agent with:
- **Custom system prompt** tailored to the domain
- **Department-specific tools** with real or mock integrations
- **Data isolation** — users only see their own department's conversations
- **Dashboard-style output** — KPI cards, charts, and data tables in chat

| Department  | Tools                                                                 | Integration |
|-------------|-----------------------------------------------------------------------|-------------|
| Logistics   | `get_fleet_location`, `get_moving_vehicles`, `get_idle_vehicles`, `get_stopped_vehicles`, `get_fleet_summary`, `get_vehicle_by_name`, `get_vehicle_by_id`, `get_vehicles_near_location`, `get_speeding_vehicles`, `get_live_tracking` | FleetHunt API (live) |
| Restaurant  | `query_menu`, `get_orders`, `get_order_stats`                         | POS / Menu data |
| Finance     | `query_erp`, `get_cash_flow_forecast`, `check_compliance`             | Mock ERP |
| Accounting  | `query_invoices`, `reconcile_accounts`, `calculate_tax`               | Mock AP/AR |
| Sales       | `query_crm`, `search_email_logs`, `get_market_data`                   | Mock CRM |

## API Endpoints

| Endpoint                       | Method  | Auth | Purpose                           |
|-------------------------------|---------|------|-----------------------------------|
| `/api/v1/auth/login`          | POST    | No   | Authenticate user, returns JWT    |
| `/api/v1/auth/register`       | POST    | No   | Register new user, returns JWT    |
| `/api/v1/chat`                | POST    | Yes  | Send message to dept AI agent     |
| `/api/v1/chat/stream`         | GET     | Yes  | Stream AI response via SSE        |
| `/api/v1/conversations`       | GET     | Yes  | List user's conversations (max 50)|
| `/api/v1/conversations/{id}`  | GET     | Yes  | Get conversation with messages    |
| `/api/v1/admin/usage`         | GET     | Admin| Aggregated usage metrics          |
| `/api/v1/admin/config/{dept}` | GET/PUT | Admin| Department budget configuration   |
| `/api/v1/admin/insights`      | GET     | Admin| Department KPI insights           |
| `/health`                     | GET     | No   | Health check                      |

## Project Structure

```
backend/
  app/
    main.py              # FastAPI app, CORS, lifespan
    config.py            # Settings from .env (Pydantic Settings)
    agents/
      orchestrator.py    # Claude tool-use loop (agentic pattern)
      registry.py        # Department registry — maps dept → tools/prompts/executors
    departments/         # Per-department modules (isolated tools + prompts)
      __init__.py        # Protocol interface for department modules
      sales/             # prompts.py + tools.py (mock CRM, email, market)
      finance/           # prompts.py + tools.py (mock ERP, cash flow, compliance)
      accounting/        # prompts.py + tools.py (mock invoices, reconciliation, tax)
      restaurant/        # prompts.py + tools.py + data.py (real menu + FCM orders)
      logistics/         # prompts.py + tools.py (real FleetHunt GPS API)
    api/                 # Route handlers (auth, chat, conversations, admin)
    db/database.py       # SQLAlchemy async engine + session + seed users
    middleware/           # Rate limiter, auth middleware (JWT)
    models/              # SQLAlchemy ORM models (User, Conversation, Message, Usage)
    services/            # Auth & usage business logic

frontend/
  src/
    app/
      page.tsx           # Landing page (VRTek hero, features)
      login/page.tsx     # Login/register form with department selection
      chat/page.tsx      # Chat interface with sidebar, messages, voice input
      services/page.tsx  # Service catalog (5 department cards)
      services/[id]/page.tsx  # Service detail + purchase flow
      admin/page.tsx     # Admin dashboard (charts, KPIs, budget config)
    components/chat/     # DashboardMessage, DashboardTable, DonutChart, MessageActions
    departments/         # Config, dashboard transforms, integrations, types
    lib/api.ts           # API client (fetch wrapper with Bearer token)
    types/index.ts       # Core TypeScript interfaces
```

## Environment Variables

See [`backend/.env.example`](backend/.env.example) for all available settings. Key variables:

| Variable              | Required | Description                         |
|-----------------------|----------|-------------------------------------|
| `ANTHROPIC_API_KEY`   | Yes      | Anthropic API key for Claude        |
| `SECRET_KEY`          | Yes      | JWT signing secret (32+ chars)      |
| `FLEETHUNT_API_KEY`   | No       | FleetHunt API key (logistics dept)  |
| `FLEETHUNT_BASE_URL`  | No       | FleetHunt API base URL              |
| `FCM_BACKEND_URL`     | No       | FCM backend for restaurant dept     |
| `FCM_BACKEND_SECRET`  | No       | FCM backend auth secret             |

## Learn More

For a comprehensive deep-dive into every concept, workflow, and code pattern, see [**PROJECT_GUIDE.md**](PROJECT_GUIDE.md). It covers the tool-use loop, department registry pattern, authentication flow, database models, and more.

## License

MIT

---

### Logistics Department (FleetHunt GPS)

The Logistics agent is powered by the **FleetHunt GPS tracking API**, providing real-time fleet management capabilities:

- **Fleet Summary** — Total vehicles, moving/idle/stopped counts, utilization %
- **Vehicle Search** — Find vehicles by name or keyword
- **Live Tracking** — Real-time GPS position, speed, heading, ignition state
- **Speed Alerts** — Detect vehicles exceeding a speed threshold
- **Idle Detection** — Find vehicles with engine on but not moving
- **Geofence Monitoring** — Check which vehicles are within a geographic boundary
- **Proximity Search** — Find vehicles near a specific lat/lng coordinate
- **Fuel Analysis** — Odometer and distance-based fuel usage estimates
- **Maintenance Alerts** — Flag vehicles due for service by odometer
- **Trip History** — Retrieve historical trip data for a vehicle

Vehicle status is derived from real-time data:
| Status  | Condition                      |
|---------|--------------------------------|
| Moving  | `speed > 0`                    |
| Idle    | `speed == 0` and `ignition on` |
| Stopped | `speed == 0` and `ignition off`|

## Detailed Project Structure

```
├── backend/
│   ├── app/
│   │   ├── agents/              # Core AI engine
│   │   │   ├── orchestrator.py  # Claude tool-use loop (agentic pattern)
│   │   │   └── registry.py      # Department registry (maps dept → tools/prompts/executors)
│   │   ├── departments/         # Per-department modules (each has prompts + tools)
│   │   │   ├── __init__.py      # Protocol class defining the department interface
│   │   │   ├── sales/           # Mock CRM, email logs, market data
│   │   │   ├── finance/         # Mock ERP, cash flow, compliance
│   │   │   ├── accounting/      # Mock invoices, reconciliation, tax
│   │   │   ├── restaurant/      # Real menu data (100+ items) + FCM order API
│   │   │   └── logistics/       # Real FleetHunt GPS API (10 tools)
│   │   ├── api/                 # FastAPI route handlers
│   │   │   ├── admin.py         # Usage metrics, budget config, KPI insights
│   │   │   ├── auth.py          # Login & registration
│   │   │   ├── chat.py          # POST /chat + GET /chat/stream (SSE)
│   │   │   └── conversations.py # Conversation history
│   │   ├── db/database.py       # Async SQLAlchemy engine + session + seed users
│   │   ├── middleware/          # JWT auth, in-memory rate limiter
│   │   ├── models/              # ORM models (User, Conversation, Message, Usage, Budget)
│   │   ├── services/            # Auth (bcrypt + JWT) & usage tracking
│   │   ├── config.py            # Pydantic Settings (.env loader with @lru_cache)
│   │   └── main.py              # FastAPI app, CORS, lifespan, router registration
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   │   ├── page.tsx         # Landing page (VRTek branding)
│   │   │   ├── login/           # Auth form with department selection
│   │   │   ├── chat/            # Main AI chat interface
│   │   │   ├── admin/           # Admin dashboard (Recharts)
│   │   │   └── services/        # Service catalog + detail pages
│   │   ├── components/chat/     # DashboardMessage, DashboardTable, DonutChart
│   │   ├── departments/         # Config, dashboard transforms, integrations
│   │   ├── lib/api.ts           # Fetch wrapper with Bearer token injection
│   │   └── types/               # TypeScript interfaces + Web Speech API types
│   ├── package.json
│   └── Dockerfile               # Multi-stage build (deps → build → runner)
├── docker-compose.yml           # 2 services: backend + frontend
├── PROJECT_GUIDE.md             # Complete technical deep-dive (this project)
└── README.md
```

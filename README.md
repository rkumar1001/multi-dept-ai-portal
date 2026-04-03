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

| Email                       | Password     | Department  | Role  |
|-----------------------------|-------------|-------------|-------|
| admin@gmail.com             | admin123    | logistics   | admin |
| admin1@gmail.com            | admin123    | logistics   | admin |
| themasalatwist@gmail.com    | masala123   | restaurant  | admin |
| finance@demo.com            | finance123  | finance     | admin |
| accounting@demo.com         | accounting123| accounting | admin |
| sales@demo.com              | sales123    | sales       | admin |

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

| Endpoint                       | Method | Purpose                    |
|-------------------------------|--------|----------------------------|
| `/api/v1/auth/login`          | POST   | Authenticate user          |
| `/api/v1/auth/register`       | POST   | Register new user          |
| `/api/v1/chat`                | POST   | Send message to dept agent |
| `/api/v1/conversations`       | GET    | List conversation history  |
| `/api/v1/conversations/{id}`  | GET    | Get conversation detail    |
| `/api/v1/admin/usage`         | GET    | Department usage metrics   |
| `/api/v1/admin/config/{dept}` | GET/PUT| Department budget config   |
| `/health`                     | GET    | Health check               |

## Project Structure

```
backend/
  app/
    main.py              # FastAPI app, CORS, lifespan
    config.py            # Settings from .env
    agents/
      orchestrator.py    # Claude tool-use loop
      prompts.py         # Department system prompts
      tools.py           # Tool definitions & handlers
    api/                 # Route handlers (auth, chat, conversations, admin)
    db/database.py       # SQLAlchemy async engine + session
    middleware/           # Rate limiter, auth middleware
    models/              # SQLAlchemy ORM models (User, Conversation, Usage)
    services/            # Auth & usage business logic

frontend/
  src/
    app/
      page.tsx           # Landing page
      login/page.tsx     # Login page
      chat/page.tsx      # Chat dashboard with AI agents
      services/page.tsx  # Service catalog
      services/[id]/page.tsx  # Service detail + buy flow
      admin/page.tsx     # Admin dashboard
    lib/api.ts           # API client (fetch wrapper)
    types/index.ts       # TypeScript types, department config, quick prompts
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

## License

MIT

### Logistics Department (FleetHunt MCP)

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

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── agents/          # Agent orchestrator, prompts, tools
│   │   │   ├── orchestrator.py   # Routes queries to department agents
│   │   │   ├── prompts.py        # System prompts per department
│   │   │   └── tools.py          # Tool definitions & FleetHunt API integration
│   │   ├── api/             # FastAPI route handlers
│   │   │   ├── admin.py          # Admin dashboard & KPIs
│   │   │   ├── auth.py           # Registration & login
│   │   │   ├── chat.py           # Chat endpoint (dept-aware)
│   │   │   └── conversations.py  # Conversation history
│   │   ├── db/              # Database engine & session
│   │   ├── middleware/      # Auth, rate limiting
│   │   ├── models/          # SQLAlchemy models (User, Conversation)
│   │   ├── services/        # Auth & usage services
│   │   ├── config.py        # Settings (env-based, incl. FleetHunt config)
│   │   └── main.py          # App entry point
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment variable template
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   │   ├── login/       # Department selection & auth
│   │   │   ├── chat/        # Chat interface per department
│   │   │   └── admin/       # Usage dashboard & KPIs
│   │   ├── lib/             # API client (axios)
│   │   └── types/           # TypeScript types & department config
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

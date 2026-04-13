# Multi-Department AI Portal — Complete Project Documentation

> **Version**: 1.0.0  
> **Architecture**: Single Portal with Role-Based Access & Agentic AI  
> **Stack**: FastAPI (Python 3.12) · Next.js 15 (React 19, TypeScript) · SQLite/PostgreSQL · Anthropic Claude · Redis  
> **Last Updated**: April 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Project Structure](#4-project-structure)
5. [Backend Architecture](#5-backend-architecture)
   - [Configuration & Settings](#51-configuration--settings)
   - [Database Layer](#52-database-layer)
   - [Models & Schema](#53-models--schema)
   - [Authentication & Authorization](#54-authentication--authorization)
   - [Rate Limiting](#55-rate-limiting)
   - [AI Agent System (Agentic Loop)](#56-ai-agent-system-agentic-loop)
   - [Department Registry](#57-department-registry)
6. [Department Agents & Tools](#6-department-agents--tools)
7. [Email Integration (Gmail & Outlook)](#7-email-integration-gmail--outlook)
8. [FleetHunt GPS Integration (Logistics)](#8-fleethunt-gps-integration-logistics)
9. [Restaurant POS Integration](#9-restaurant-pos-integration)
10. [API Reference](#10-api-reference)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Middleware Pipeline](#12-middleware-pipeline)
13. [Environment Variables](#13-environment-variables)
14. [Docker Deployment](#14-docker-deployment)
15. [How to Run (Local Development)](#15-how-to-run-local-development)
16. [Security Considerations](#16-security-considerations)
17. [End-to-End Workflow](#17-end-to-end-workflow)
18. [Common Questions & Answers](#18-common-questions--answers)

---

## 1. Project Overview

The Multi-Department AI Portal is a **single AI-powered web application** where different departments within an organization each get their own specialized AI chatbot agent. Each agent has access to **department-specific tools, data sources, and system prompts**, allowing domain-focused AI assistance.

### Key Concept

One portal → multiple AI agents → role-based access → real-time tool execution → department data isolation.

### Supported Departments

| Department     | Agent Expertise                                      | Data Sources                          |
|----------------|------------------------------------------------------|---------------------------------------|
| **Sales**      | Lead scoring, pipeline forecasting, CRM insights     | Mock CRM, email logs, market data     |
| **Finance**    | Financial modeling, cash flow, risk, compliance       | Mock ERP, GL accounts, journals       |
| **Accounting** | Invoice processing, reconciliation, tax, audit        | Mock AP/AR, bank statements, tax data |
| **Restaurant** | Menu planning, inventory, reservations, food cost     | **Real** POS/menu data (The Masala Twist) |
| **Logistics**  | Fleet management, vehicle tracking, route optimization | **Real** FleetHunt GPS API            |

### Core Features

- **Agentic AI loop** — Claude decides what tools to call, backend executes them, results fed back until the AI has enough data to answer
- **JWT-based authentication** with BCrypt password hashing and Redis token blacklisting
- **Real-time streaming** via Server-Sent Events (SSE)
- **Email integration** — Gmail and Outlook OAuth2 for all departments (search, read, send, reply, draft)
- **Admin dashboard** — usage analytics, token tracking, department budgets, KPI insights, email management
- **Conversation persistence** with full message history
- **Rate limiting** — sliding window per IP
- **Quick action prompts** per department
- **Markdown rendering** with GFM support (tables, code blocks, task lists)
- **Expandable tool result cards** showing raw API data

---

## 2. Tech Stack

### Backend

| Technology              | Purpose                                              |
|-------------------------|------------------------------------------------------|
| **Python 3.12+**        | Programming language                                 |
| **FastAPI**             | Async web framework (ASGI)                           |
| **Uvicorn**             | ASGI server                                          |
| **SQLAlchemy 2.x**      | Async ORM for database operations                    |
| **aiosqlite**           | Async SQLite driver (development)                    |
| **asyncpg**             | Async PostgreSQL driver (production)                 |
| **Anthropic SDK**       | Direct Claude API calls (NOT LangChain/LangGraph)    |
| **Pydantic v2**         | Data validation and settings management              |
| **python-jose**         | JWT token creation and validation                    |
| **bcrypt**              | Password hashing                                     |
| **httpx**               | Async HTTP client (FleetHunt, OAuth, POS)            |
| **aioredis**            | Async Redis client (token blacklist, caching)        |
| **cryptography (Fernet)** | OAuth token encryption at rest                     |
| **sse-starlette**       | Server-Sent Events for streaming responses           |
| **passlib**             | BCrypt context management                            |

### Frontend

| Technology              | Purpose                                              |
|-------------------------|------------------------------------------------------|
| **Next.js 15**          | React framework (App Router)                         |
| **React 19**            | UI library                                           |
| **TypeScript 5.7**      | Type-safe JavaScript                                 |
| **Tailwind CSS 3.4**    | Utility-first CSS framework                          |
| **Recharts**            | Charts for admin dashboard (bar, pie/donut)          |
| **react-markdown**      | Renders AI responses as formatted markdown            |
| **remark-gfm**          | GitHub Flavored Markdown support                     |
| **Lucide React**        | Icon library                                         |

### Infrastructure

| Technology              | Purpose                                              |
|-------------------------|------------------------------------------------------|
| **Docker & Docker Compose** | Containerization and orchestration               |
| **Redis 7 Alpine**      | Token blacklist, session cache, rate limiting (prod)  |
| **PostgreSQL 16**       | Production database                                  |
| **SQLite**              | Development database (zero setup)                    |

### External APIs

| API                     | Purpose                                              |
|-------------------------|------------------------------------------------------|
| **Anthropic Claude**    | LLM (claude-sonnet-4-20250514)                       |
| **FleetHunt GPS API**   | Real-time fleet tracking (Logistics)                 |
| **FCM Backend**         | Restaurant POS/menu data                             |
| **Gmail API**           | Email operations via OAuth2                          |
| **Microsoft Graph API** | Outlook email operations via OAuth2                  |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 15)                       │
│                                                                  │
│  /login  →  /chat  →  /admin  →  /services                     │
│                                                                  │
│  localStorage: token, department, role, fullName                 │
│  API Client (lib/api.ts) → Bearer Token Auth                    │
└───────────────────────────┬──────────────────────────────────────┘
                            │  HTTP / SSE
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                            │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │   CORS   │→ │  Rate    │→ │   Auth   │→ │  Route   │         │
│  │Middleware │  │ Limiter  │  │Middleware │  │ Handler  │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                │                  │
│                          ┌─────────────────────┼───────────────┐  │
│                          ▼                     ▼               ▼  │
│                     /api/v1/auth        /api/v1/chat     /api/v1/ │
│                                              │          admin,    │
│                                              ▼          email     │
│                                 ┌──────────────────────┐          │
│                                 │  Agent Orchestrator   │          │
│                                 │                      │          │
│                                 │  1. Get system prompt │          │
│                                 │  2. Get dept tools +  │          │
│                                 │     email tools       │          │
│                                 │  3. Call Claude API    │          │
│                                 │  4. Execute tools      │          │
│                                 │  5. Loop until done    │          │
│                                 └──────────┬───────────┘          │
│                                            │                      │
│                       ┌────────────────────┼────────────────┐     │
│                       ▼                    ▼                ▼     │
│                  Dept Tools          Email Tools       Claude API  │
│                 (Mock/Real)        (Gmail/Outlook)                 │
│                       │                    │                       │
│              ┌────────┼────────┐    ┌──────┼──────┐               │
│              ▼        ▼        ▼    ▼             ▼               │
│         FleetHunt  FCM POS   Mock  Gmail API  MS Graph            │
│         GPS API    Backend   Data  (OAuth2)   API (OAuth2)        │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              DATABASE (SQLite / PostgreSQL)                  │  │
│  │  users · conversations · messages · usage_records           │  │
│  │  department_budgets · department_email_configs               │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                     REDIS                                    │  │
│  │  Token blacklist · Session cache · Rate limiting (prod)      │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. Project Structure

```
multi-dept-ai-portal/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── orchestrator.py     # Claude API agentic loop + tool dispatch
│   │   │   └── registry.py         # Department → {tools, prompt, execute} mapping
│   │   ├── api/
│   │   │   ├── admin.py            # Admin endpoints (usage, budgets, insights)
│   │   │   ├── auth.py             # Login/register endpoints
│   │   │   ├── chat.py             # Chat send + SSE stream
│   │   │   ├── conversations.py    # Conversation list/detail
│   │   │   └── email.py            # Email OAuth + status endpoints
│   │   ├── db/
│   │   │   └── database.py         # Async engine, sessions, init, seeding
│   │   ├── departments/
│   │   │   ├── common/
│   │   │   │   ├── email_tools.py  # 6 shared email tool definitions
│   │   │   │   └── email_config.py # DepartmentEmailConfig model + encryption
│   │   │   ├── sales/
│   │   │   │   ├── prompts.py      # Sales system prompt
│   │   │   │   └── tools.py        # CRM, email logs, market data tools
│   │   │   ├── finance/
│   │   │   │   ├── prompts.py      # Finance system prompt
│   │   │   │   └── tools.py        # ERP, cash flow, compliance tools
│   │   │   ├── accounting/
│   │   │   │   ├── prompts.py      # Accounting system prompt
│   │   │   │   └── tools.py        # Invoices, reconciliation, tax tools
│   │   │   ├── restaurant/
│   │   │   │   ├── data.py         # Real menu data (The Masala Twist)
│   │   │   │   ├── prompts.py      # Restaurant system prompt
│   │   │   │   └── tools.py        # Menu, inventory, orders + FCM POS
│   │   │   └── logistics/
│   │   │       ├── prompts.py      # Logistics system prompt
│   │   │       └── tools.py        # 10 FleetHunt GPS tools (real API)
│   │   ├── middleware/
│   │   │   ├── auth_middleware.py   # JWT validation + role enforcement
│   │   │   └── rate_limiter.py     # Sliding window rate limiter
│   │   ├── models/
│   │   │   ├── conversation.py     # Conversation + Message ORM models
│   │   │   ├── email_config.py     # DepartmentEmailConfig ORM model
│   │   │   ├── usage.py            # UsageRecord + DepartmentBudget models
│   │   │   └── user.py             # User model + Department/Role enums
│   │   ├── services/
│   │   │   ├── auth_service.py     # Password hashing, JWT, user CRUD
│   │   │   ├── email_service.py    # OAuth flows, token mgmt, email operations
│   │   │   ├── redis_service.py    # Redis client (token blacklist, fail-open)
│   │   │   └── usage_service.py    # Usage recording
│   │   ├── config.py               # Pydantic Settings (env vars)
│   │   └── main.py                 # FastAPI app entry point + lifespan
│   ├── .env                        # Environment variables
│   ├── Dockerfile                  # Python 3.12 slim container
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/page.tsx      # Admin dashboard + email management
│   │   │   ├── chat/page.tsx       # Main chat interface
│   │   │   ├── login/page.tsx      # Auth page (signin/register)
│   │   │   ├── services/page.tsx   # Services overview
│   │   │   ├── services/[id]/page.tsx # Service detail pages
│   │   │   ├── globals.css         # Tailwind + CSS variables
│   │   │   ├── layout.tsx          # Root layout
│   │   │   └── page.tsx            # Root redirect
│   │   ├── components/chat/        # Chat UI components
│   │   ├── departments/
│   │   │   ├── config.ts           # Department visual config (colors, icons)
│   │   │   ├── dashboard.ts        # Dashboard component configs
│   │   │   ├── integrations.ts     # Integration cards (FleetHunt, Gmail, etc.)
│   │   │   ├── types.ts            # Department type definitions
│   │   │   └── index.ts            # Re-exports
│   │   ├── lib/
│   │   │   └── api.ts              # API client wrapper
│   │   └── types/
│   │       └── index.ts            # TypeScript interfaces
│   ├── Dockerfile                  # Multi-stage Next.js build
│   ├── package.json                # Node dependencies
│   └── tailwind.config.ts          # Tailwind config
├── docker-compose.yml              # Production orchestration (4 services)
├── README.md                       # Quick start guide
├── DOCUMENTATION.md                # Technical documentation
└── PROJECT_GUIDE.md                # Comprehensive technical guide
```

---

## 5. Backend Architecture

### 5.1 Configuration & Settings

**File**: `backend/app/config.py`

Uses Pydantic `BaseSettings` with `.env` file support. All configuration is loaded from environment variables at startup and cached via `@lru_cache`.

| Variable                       | Type   | Default                     | Description                          |
|--------------------------------|--------|-----------------------------|--------------------------------------|
| `app_name`                     | str    | `multi-dept-ai-portal`      | Application identifier               |
| `app_env`                      | str    | `development`               | Environment (controls SQL echo)      |
| `database_url`                 | str    | SQLite connection string    | Async DB URL                         |
| `redis_url`                    | str    | `redis://localhost:6379/0`  | Redis URL                            |
| `secret_key`                   | str    | (required)                  | JWT signing + Fernet encryption seed |
| `anthropic_api_key`            | str    | (required)                  | Anthropic API key                    |
| `cors_origins`                 | str    | `http://localhost:3001,...`  | Comma-separated allowed origins      |
| `rate_limit_default`           | int    | `30`                        | Default req/min per IP               |
| `rate_limit_admin`             | int    | `100`                       | Admin req/min per IP                 |
| `access_token_expire_minutes`  | int    | `60`                        | JWT token TTL                        |
| `google_client_id`             | str    | —                           | Gmail OAuth client ID                |
| `google_client_secret`         | str    | —                           | Gmail OAuth client secret            |
| `google_redirect_uri`          | str    | —                           | Gmail OAuth redirect URI             |
| `microsoft_client_id`          | str    | —                           | Outlook OAuth client ID              |
| `microsoft_client_secret`      | str    | —                           | Outlook OAuth client secret          |
| `microsoft_tenant_id`          | str    | —                           | Azure AD tenant ID                   |
| `microsoft_redirect_uri`       | str    | —                           | Outlook OAuth redirect URI           |
| `fleethunt_base_url`           | str    | —                           | FleetHunt API base URL               |
| `fleethunt_api_key`            | str    | —                           | FleetHunt API token                  |
| `fcm_backend_url`              | str    | —                           | Restaurant POS backend URL           |
| `fcm_backend_secret`           | str    | —                           | Restaurant POS backend secret        |

### 5.2 Database Layer

**File**: `backend/app/db/database.py`

- **Engine**: `create_async_engine()` — SQLAlchemy async engine (aiosqlite for dev, asyncpg for prod)
- **Session Factory**: `async_sessionmaker(AsyncSession)` — scoped async sessions
- **`get_db()`**: Async generator yielding DB sessions (FastAPI dependency injection)
- **`init_db()`**: Called on app startup via FastAPI lifespan hook — creates all tables, seeds default users
- **`_seed_default_admin()`**: Creates admin user from `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` if not exists

### 5.3 Models & Schema

#### User Model

```
Table: users
├── id              VARCHAR(36)   PK, UUID
├── email           VARCHAR       UNIQUE, indexed
├── hashed_password VARCHAR       NOT NULL (BCrypt hash)
├── full_name       VARCHAR       NOT NULL
├── department      VARCHAR       NOT NULL (Enum: SALES|FINANCE|ACCOUNTING|RESTAURANT|LOGISTICS)
├── role            VARCHAR       NOT NULL (Enum: USER|DEPT_ADMIN|ADMIN, default: USER)
├── is_active       BOOLEAN       DEFAULT true
├── created_at      DATETIME(tz)
└── updated_at      DATETIME(tz)
```

#### Conversation Model

```
Table: conversations
├── id              VARCHAR(36)   PK, UUID
├── user_id         VARCHAR(36)   FK → users, indexed
├── department      VARCHAR       NOT NULL, indexed
├── title           VARCHAR       NULLABLE (auto-generated)
├── created_at      DATETIME(tz)
└── updated_at      DATETIME(tz)
Index: (user_id, department) composite
```

#### Message Model

```
Table: messages
├── id              VARCHAR(36)   PK, UUID
├── conversation_id VARCHAR(36)   FK → conversations, CASCADE DELETE
├── role            VARCHAR       "user" | "assistant"
├── content         TEXT          NOT NULL
├── tool_calls      JSON          NULLABLE (array of {tool, input, result})
├── token_count     INTEGER       NULLABLE
└── created_at      DATETIME(tz)
Index: (conversation_id, created_at) composite
```

#### UsageRecord Model

```
Table: usage_records
├── id              VARCHAR(36)   PK, UUID
├── user_id         VARCHAR(36)   FK → users
├── department      VARCHAR       indexed
├── input_tokens    INTEGER       DEFAULT 0
├── output_tokens   INTEGER       DEFAULT 0
├── tool_calls_count INTEGER      DEFAULT 0
├── model           VARCHAR       DEFAULT "claude-sonnet-4-20250514"
└── created_at      DATETIME(tz)
Indices: (department, created_at), (user_id, created_at)
```

#### DepartmentBudget Model

```
Table: department_budgets
├── id                      VARCHAR(36)   PK, UUID
├── department              VARCHAR       UNIQUE
├── monthly_token_limit     INTEGER       DEFAULT 2,000,000
├── monthly_tool_call_limit INTEGER       DEFAULT 5,000
├── max_concurrent_users    INTEGER       DEFAULT 50
├── alert_threshold_pct     INTEGER       DEFAULT 75
└── updated_at              DATETIME(tz)
```

#### DepartmentEmailConfig Model

```
Table: department_email_configs
├── id              VARCHAR(36)   PK, UUID
├── department      VARCHAR(50)   UNIQUE, indexed
├── provider        VARCHAR(20)   "gmail" | "outlook"
├── email_address   VARCHAR(255)  Connected email address
├── access_token    TEXT          Fernet-encrypted OAuth access token
├── refresh_token   TEXT          Fernet-encrypted OAuth refresh token
├── token_expiry    DATETIME      Token expiration timestamp
├── scopes          VARCHAR(500)  OAuth scopes granted
├── is_active       BOOLEAN       Enable/disable flag
├── connected_at    DATETIME      When the connection was established
└── updated_at      DATETIME      Last update timestamp
```

**Token Encryption**: Uses Fernet symmetric encryption. The encryption key is derived from the application's `SECRET_KEY` via SHA-256 hash + base64 encoding.

### 5.4 Authentication & Authorization

#### Password Handling
- **Hashing**: BCrypt via `passlib.context.CryptContext(schemes=["bcrypt"])`
- **Verification**: `verify_password(plain, hash) → bool`

#### JWT Token
- **Algorithm**: HS256
- **Payload**: `{ sub: user_id, department: str, role: str, exp: datetime }`
- **TTL**: 60 minutes (configurable)
- **Library**: `python-jose[cryptography]`

#### Redis Token Blacklist
- On logout, the JWT token ID is added to Redis with the remaining TTL
- `get_current_user()` checks if the token is blacklisted before allowing access
- **Fail-open design**: If Redis is unavailable, auth still works (tokens not revoked)

#### Auth Flow

```
Login/Register Request
    │
    ▼
authenticate_user() / create user
    ├── Hash password (BCrypt, 12 rounds)
    ├── Verify password hash (login)
    └── Create JWT token (user_id, department, role, 60-min expiry)
    │
    ▼
Response: { access_token, token_type: "bearer", department, role, full_name }
    │
    ▼
Frontend stores in localStorage → redirects to /chat
```

#### Middleware Dependencies
- **`get_current_user()`**: Bearer token → decode JWT → check Redis blacklist → load user from DB → return `CurrentUser(id, department, role)`
- **`require_admin()`**: Calls `get_current_user()` → asserts `role == "admin"` → 403 if not

### 5.5 Rate Limiting

**File**: `backend/app/middleware/rate_limiter.py`

- **Algorithm**: In-memory sliding window (1-minute window per IP)
- **Storage**: Python `dict[str, list[float]]` — IP → list of request timestamps
- **Cleanup**: Removes timestamps older than 60 seconds on each request
- **Limits**:
  - `/admin` paths: 100 req/min per IP
  - Other `/api/` paths: 30 req/min per IP
- **Response Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- **On Exceed**: HTTP 429 Too Many Requests
- **Note**: In-memory only — use Redis-backed limiter for production multi-instance deployments

### 5.6 AI Agent System (Agentic Loop)

**File**: `backend/app/agents/orchestrator.py`

The `AgentOrchestrator` is the core AI engine implementing the **agentic tool-use pattern**:

```
User asks a question
    │
    ▼
Orchestrator prepares Claude API call:
  - model: claude-sonnet-4-20250514
  - system: department-specific prompt
  - tools: department tools + 6 email tools
  - messages: conversation history + current message
    │
    ▼
Claude API responds ──────────────────────────┐
    │                                          │
    ├── stop_reason: "tool_use"                │
    │   → Extract tool name + input            │
    │   → Route to handler:                    │
    │     • Department tool → mock/API handler │
    │     • Email tool → email_service          │
    │   → Feed result back to Claude           │
    │   → LOOP ◄──────────────────────────────┘
    │
    ├── stop_reason: "end_turn"
    │   → Extract final text response
    │   → Return AgentResponse(content, tokens, tool_calls)
```

**Key behaviors**:
- Accumulates tokens across all loop iterations
- Records all tool executions with inputs and results
- Supports both sync (`process_query`) and streaming (`stream_query`) via SSE
- Email tools are detected via `is_email_tool()` and dispatched to `execute_email_tool()`
- Maximum loop iterations prevent infinite tool calling

### 5.7 Department Registry

**File**: `backend/app/agents/registry.py`

Maps each department to its tools, prompts, and execution functions:

```python
DEPARTMENT_REGISTRY = {
    "sales":      { "tools": SALES_TOOLS,      "prompt": SALES_PROMPT,      "execute": execute_sales_tool },
    "finance":    { "tools": FINANCE_TOOLS,     "prompt": FINANCE_PROMPT,    "execute": execute_finance_tool },
    "accounting": { "tools": ACCOUNTING_TOOLS,  "prompt": ACCOUNTING_PROMPT, "execute": execute_accounting_tool },
    "restaurant": { "tools": RESTAURANT_TOOLS,  "prompt": RESTAURANT_PROMPT, "execute": execute_restaurant_tool },
    "logistics":  { "tools": LOGISTICS_TOOLS,   "prompt": LOGISTICS_PROMPT,  "execute": execute_logistics_tool },
}

def get_tools(department):
    return entry["tools"] + EMAIL_TOOLS  # Email tools appended to ALL departments
```

---

## 6. Department Agents & Tools

Each department has: (1) a **system prompt** defining expertise, (2) **tool definitions** in Claude's JSON format, (3) **tool handlers** that return data.

### Sales Agent
| Tool               | Parameters                           | Description                        | Data Source |
|--------------------|--------------------------------------|------------------------------------|------------|
| `query_crm`        | query_type, filters, date_range      | Query leads, deals, contacts       | Mock       |
| `search_email_logs`| search_term, date_range, sender      | Search email communications        | Mock       |
| `get_market_data`  | data_type, industry, region          | Competitive analysis, market data  | Mock       |

### Finance Agent
| Tool                    | Parameters                             | Description                        | Data Source |
|-------------------------|----------------------------------------|------------------------------------|------------|
| `query_erp`             | module, query_type, filters, date_range| GL, transactions, budgets, journals| Mock       |
| `get_cash_flow_forecast`| period, scenario, include_projections  | Multi-scenario cash flow           | Mock       |
| `check_compliance`      | regulation, check_type, entity         | SOX, IFRS, GAAP compliance         | Mock       |

### Accounting Agent
| Tool                 | Parameters                              | Description                        | Data Source |
|----------------------|-----------------------------------------|------------------------------------|------------|
| `query_invoices`     | invoice_type, status, date_range, vendor| AP/AR invoice queries              | Mock       |
| `reconcile_accounts` | account_type, period, include_pending   | Bank-to-book reconciliation        | Mock       |
| `calculate_tax`      | tax_type, jurisdiction, period, entity  | Tax liability estimation           | Mock       |

### Restaurant Agent
| Tool             | Parameters                              | Description                        | Data Source |
|------------------|-----------------------------------------|------------------------------------|------------|
| `query_menu`     | category, dietary_filter, price_range   | Menu items, pricing, nutrition     | **Real** (POS) |
| `get_orders`     | status, date_range                      | Order data from POS                | **Real** (FCM) |
| `get_order_stats`| date_range, group_by                    | Order analytics                    | **Real** (FCM) |

### Logistics Agent (10 tools — all **real** data)
| Tool                     | Description                        | How It Works                          |
|--------------------------|------------------------------------|---------------------------------------|
| `get_fleet_location`     | All vehicle positions              | Fetch all active devices              |
| `get_vehicle_by_name`    | Search by name keyword             | Partial match on device name          |
| `get_vehicle_by_id`      | Get specific vehicle               | Direct device_id lookup               |
| `get_moving_vehicles`    | Vehicles in motion                 | Filter: `speed > 0`                   |
| `get_idle_vehicles`      | Engine on, not moving              | Filter: `speed == 0 AND ignition == 1`|
| `get_stopped_vehicles`   | Engine off, parked                 | Filter: `speed == 0 AND ignition == 0`|
| `get_fleet_summary`      | Count by status                    | Aggregate: total, moving, idle, stopped|
| `get_vehicles_near_location` | Proximity search               | Haversine distance formula from lat/lng|
| `get_speeding_vehicles`  | Over speed threshold               | Filter: `speed > threshold` (default 100 km/h)|
| `get_live_tracking`      | Real-time tracking                 | Full device data: GPS, speed, heading  |

### Shared Email Tools (all departments)
See [Section 7: Email Integration](#7-email-integration-gmail--outlook) for full details.

---

## 7. Email Integration (Gmail & Outlook)

### Overview

Every department can connect a Gmail or Outlook email account via OAuth2. Once connected, the AI agent can search, read, send, reply, draft, and list email folders — all through natural language commands.

### Email Tools (6 tools, available to all departments)

| Tool               | Parameters                            | Description                              |
|--------------------|---------------------------------------|------------------------------------------|
| `search_emails`    | `query` (required), `max_results`     | Search inbox (e.g., "from:john invoice") |
| `read_email`       | `message_id` (required)               | Get full email content by message ID     |
| `send_email`       | `to`, `subject`, `body` (required); `cc`, `bcc` (optional) | Send email (requires user confirmation) |
| `reply_to_email`   | `message_id`, `body` (required)       | Reply to an email thread                 |
| `create_draft`     | `to`, `subject`, `body` (required)    | Create unsent email draft                |
| `list_email_folders` | (none)                              | List available folders/labels            |

### OAuth2 Flow

```
Admin clicks "Connect Gmail" on Admin Dashboard
    │
    ▼
Frontend calls GET /api/v1/email/connect/{department}/gmail
    │
    ▼
Backend generates OAuth URL with:
  - client_id from settings
  - redirect_uri (callback URL)
  - scopes (gmail.readonly, gmail.send, gmail.compose, gmail.modify, userinfo.email)
  - state = JWT-signed { department, provider, type: "email_oauth" }
  - access_type=offline (for refresh token)
  - prompt=consent (force consent screen)
    │
    ▼
Browser redirects to Google consent screen
    │
    ▼
User authorizes → Google redirects to GET /api/v1/email/callback/gmail?code=xxx&state=yyy
    │
    ▼
Backend:
  1. Decodes state JWT → extracts department + provider
  2. Exchanges auth code for access_token + refresh_token
  3. Fetches user's email address from /oauth2/v2/userinfo
  4. Encrypts tokens with Fernet (derived from SECRET_KEY)
  5. Stores DepartmentEmailConfig in database
  6. Redirects to frontend: /admin?email_connected={department}
    │
    ▼
Frontend detects ?email_connected param → refreshes email status → shows green connected state
```

### OAuth Providers

| Provider   | Auth URL                                                    | Token URL                                         | Scopes                                                                   |
|------------|-------------------------------------------------------------|---------------------------------------------------|--------------------------------------------------------------------------|
| **Gmail**  | `accounts.google.com/o/oauth2/v2/auth`                     | `oauth2.googleapis.com/token`                     | gmail.readonly, gmail.send, gmail.compose, gmail.modify, userinfo.email  |
| **Outlook**| `login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`  | `login.microsoftonline.com/{tenant}/oauth2/v2.0/token` | Mail.ReadWrite, Mail.Send, offline_access, User.Read                |

### Token Management

- **Storage**: Encrypted at rest using Fernet cipher (AES-128-CBC)
- **Auto-refresh**: Tokens are refreshed 5 minutes before expiry
- **Timezone handling**: Token expiry is normalized to UTC-aware datetime for comparison
- **Per-department**: Each department has its own email config (one provider at a time)

### Frontend Email Management (Admin Page)

- **Email Integration** section in admin dashboard
- 5 department cards (one per department)
- **Connected state**: Green dot, provider badge, email address, "Disconnect" button
- **Not connected state**: Gmail and Outlook connect buttons
- OAuth callback detected via `?email_connected=` URL parameter

---

## 8. FleetHunt GPS Integration (Logistics)

### What Is It?

The Logistics department connects to the **FleetHunt GPS tracking API** — a real, production GPS fleet management system. Unlike other departments that use mock data, this returns **live vehicle data**.

### How It Works

```
User asks about fleet
    → Claude picks the right tool
    → Backend calls: GET https://app.fleethunt.ca/api/fleet?api_token=xxx
    → FleetHunt returns real GPS data
    → We filter/process based on the tool (e.g., idle = speed 0 + ignition on)
    → Claude interprets and presents the result
```

### Vehicle Status Logic

```
If speed > 0                     → "moving"
If speed == 0 AND ignition ON    → "idle" (wasting fuel!)
If speed == 0 AND ignition OFF   → "stopped"
```

### Active Device Filtering

Devices that haven't reported data in 7+ days are excluded (decommissioned/offline).

### API Details

- **URL**: `https://app.fleethunt.ca/api/fleet`
- **Auth**: Query parameter `?api_token=<key>`
- **Client**: `httpx.AsyncClient` with 30-second timeout
- **Response**: `{status: 1, devices: [{id, name, speed, latitude, longitude, ignition, angle, odometer, device_time}]}`

---

## 9. Restaurant POS Integration

The Restaurant agent connects to a real POS backend (FCM) for The Masala Twist restaurant.

- **Menu Data**: Real menu items with prices, categories, and dietary information stored in `departments/restaurant/data.py`
- **Order Data**: Live order data from the FCM backend API (AWS-hosted)
- **Auth**: Secret key in request headers
- **Features**: Query menu items, check inventory levels, get order statistics

---

## 10. API Reference

### Auth Endpoints (`/api/v1/auth`)

| Method | Path        | Auth | Request Body                                    | Response                                                |
|--------|-------------|------|-------------------------------------------------|---------------------------------------------------------|
| POST   | `/login`    | None | `{ email, password }`                           | `{ access_token, token_type, department, role, full_name }` |
| POST   | `/register` | None | `{ email, password, full_name, department, role? }` | `{ access_token, token_type, department, role, full_name }` |

### Chat Endpoints (`/api/v1/chat`)

| Method | Path      | Auth   | Request                              | Response                                               |
|--------|-----------|--------|--------------------------------------|---------------------------------------------------------|
| POST   | `/chat`   | Bearer | Body: `{ message, conversation_id? }` | `{ conversation_id, message: {…}, tool_calls }` |
| GET    | `/stream` | Bearer | Query: `message, conversation_id?`   | SSE event stream of text chunks                         |

### Conversation Endpoints (`/api/v1/conversations`)

| Method | Path               | Auth   | Response                                               |
|--------|---------------------|--------|---------------------------------------------------------|
| GET    | `/`                | Bearer | `[{ id, title, department, created_at }]` (last 50)     |
| GET    | `/{conversation_id}` | Bearer | `{ id, title, department, messages: [{…}] }`           |

### Admin Endpoints (`/api/v1/admin`) — Admin Role Required

| Method | Path              | Params/Body                          | Response                                                 |
|--------|--------------------|--------------------------------------|---------------------------------------------------------|
| GET    | `/usage`          | Query: `days=30`                     | `[{ department, input_tokens, output_tokens, ... }]`     |
| GET    | `/config/{dept}`  | Path: department name                | `{ monthly_token_limit, current_usage, usage_pct, ... }` |
| PUT    | `/config/{dept}`  | Body: `{ monthly_token_limit, ... }` | Updated config with recalculated usage                    |
| GET    | `/insights`       | —                                    | `{ departments: [{ department, kpis: [...] }] }`         |

### Email Endpoints (`/api/v1/email`)

| Method | Path                              | Auth   | Description                                    |
|--------|-----------------------------------|--------|------------------------------------------------|
| GET    | `/connect/{department}/{provider}` | Admin  | Get OAuth authorization URL                     |
| GET    | `/callback/{provider}`            | None   | OAuth callback (handles code → token exchange)  |
| GET    | `/status`                         | Admin  | List all departments' email connection status   |
| GET    | `/status/{department}`            | Bearer | Get specific department's email status          |
| DELETE | `/disconnect/{department}`        | Admin  | Revoke email connection for a department        |

### Health Check

| Method | Path      | Auth | Response                                              |
|--------|-----------|------|-------------------------------------------------------|
| GET    | `/health` | None | `{ status: "healthy", service: "multi-dept-ai-portal" }` |

---

## 11. Frontend Architecture

### Page Flow

```
http://localhost:3001/
    │
    ├─ Check localStorage for token
    │  ├─ Has token → /chat
    │  └─ No token → /login
    │
    ├─ /login
    │  ├─ Sign In tab: email + password
    │  ├─ Register tab: name + email + password + department selector (5 depts)
    │  └─ On success → store token + metadata → /chat
    │
    ├─ /chat (main interface)
    │  ├─ Sidebar: user profile, new chat, search, conversation history, integrations, sign out
    │  ├─ Welcome screen: department greeting + 4 quick action cards
    │  ├─ Chat area: messages with markdown + tool result cards
    │  ├─ Input bar: type message + send (Enter key)
    │  └─ Integrations: FleetHunt, POS, Gmail, Outlook status cards
    │
    ├─ /admin (admin only, redirects non-admins)
    │  ├─ Summary cards: total tokens, requests, tool calls, est. cost
    │  ├─ Period selector: 7 / 14 / 30 / 90 days
    │  ├─ Charts: bar chart (tokens by dept), donut chart (token share)
    │  ├─ Cost breakdown: per-department with progress bars
    │  ├─ Department KPI insights: 4 KPIs per dept with trend arrows
    │  └─ Email Integration: connect/disconnect Gmail/Outlook per department
    │
    └─ /services
       ├─ Service overview cards for each department
       └─ /services/[id] — detailed service pages with integrations
```

### Key Frontend Components

| Component          | Location               | Purpose                                       |
|--------------------|------------------------|-----------------------------------------------|
| `ToolResultCard`   | chat/page.tsx          | Expandable card showing tool execution results |
| `MessageActions`   | components/chat/       | Copy, thumbs up/down on assistant messages     |
| `DashboardMessage` | components/chat/       | Dashboard-style message rendering              |
| `DashboardTable`   | components/chat/       | Tabular data display in chat                   |
| `DonutChart`       | components/chat/       | Donut chart component                          |

### API Client

**File**: `frontend/src/lib/api.ts`

Generic `apiFetch<T>(path, options?)` that:
1. Prepends base URL (`NEXT_PUBLIC_API_URL` or `http://localhost:8000`)
2. Injects `Authorization: Bearer <token>` from localStorage
3. Sets `Content-Type: application/json`
4. Throws on non-2xx responses

Key methods: `login()`, `register()`, `sendMessage()`, `listConversations()`, `getConversation()`, `getUsage()`, `getDepartmentConfig()`, `getInsights()`, `getEmailStatus()`, `getAllEmailStatus()`, `connectDepartmentEmail()`, `disconnectDepartmentEmail()`

### Integrations Sidebar

**File**: `frontend/src/departments/integrations.ts`

Integration cards shown in the chat sidebar, filtered by department:

| Integration      | Departments        | Status Check                     |
|------------------|--------------------|----------------------------------|
| FleetHunt        | Logistics          | Always connected                 |
| Samsara          | Logistics          | Static                           |
| Highway          | Logistics          | Static                           |
| Restaurant POS   | Restaurant         | Always connected                 |
| QuickBooks       | Finance            | Static                           |
| Gmail            | **All departments**| Checked via `api.getEmailStatus()`|
| Outlook          | **All departments**| Checked via `api.getEmailStatus()`|

Filter logic: `integ.department === userDept || integ.department === "__all__"`

---

## 12. Middleware Pipeline

### Request Processing Order

```
Incoming Request
    │
    ▼
CORS Middleware (FastAPI CORSMiddleware)
    │  - Allows origins from CORS_ORIGINS env var
    │  - Allows all methods and headers
    │  - Enables credentials
    ▼
Rate Limiter (custom ASGIMiddleware)
    │  - Sliding window per IP
    │  - 30 req/min default, 100 req/min for /admin paths
    │  - Returns 429 if exceeded
    ▼
Auth Middleware (FastAPI Depends)
    │  - Extracts Bearer token
    │  - Decodes JWT (HS256)
    │  - Checks Redis blacklist
    │  - Loads user from DB
    │  - Returns CurrentUser(id, department, role)
    ▼
Route Handler
```

---

## 13. Environment Variables

### Backend (`.env`)

```env
# Application
APP_NAME=multi-dept-ai-portal
APP_ENV=development
APP_PORT=8000

# Security
SECRET_KEY=<random-secret-key>            # JWT signing + Fernet encryption seed

# CORS
CORS_ORIGINS=http://localhost:3001,http://localhost:3000

# Database
DATABASE_URL=sqlite+aiosqlite:///./ai_portal.db
# DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db  # Production

# Cache
REDIS_URL=redis://localhost:6379/0

# LLM
ANTHROPIC_API_KEY=sk-ant-...

# Auth
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Rate Limiting
RATE_LIMIT_DEFAULT=30
RATE_LIMIT_ADMIN=100

# Default Admin Seeding
DEFAULT_ADMIN_EMAIL=admin@gmail.com
DEFAULT_ADMIN_PASSWORD=admin              # CHANGE IN PRODUCTION

# FleetHunt GPS (Logistics)
FLEETHUNT_BASE_URL=https://app.fleethunt.ca/api
FLEETHUNT_API_KEY=<api-token>

# Restaurant POS
FCM_BACKEND_URL=<pos-backend-url>
FCM_BACKEND_SECRET=<pos-secret>

# Gmail OAuth2
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/email/callback/gmail

# Outlook OAuth2
MICROSOFT_CLIENT_ID=<microsoft-client-id>
MICROSOFT_CLIENT_SECRET=<microsoft-client-secret>
MICROSOFT_TENANT_ID=<azure-ad-tenant-id>
MICROSOFT_REDIRECT_URI=http://localhost:8000/api/v1/email/callback/outlook
```

### Frontend

| Variable             | Description          | Default                 |
|----------------------|----------------------|-------------------------|
| `NEXT_PUBLIC_API_URL`| Backend API base URL | `http://localhost:8000` |

---

## 14. Docker Deployment

### Services (docker-compose.yml)

| Service    | Image                | Port | Purpose                    |
|------------|----------------------|------|----------------------------|
| `postgres` | PostgreSQL 16        | 5432 | Production database         |
| `redis`    | Redis 7 Alpine       | 6379 | Token blacklist, caching    |
| `backend`  | Custom (Dockerfile)  | 8000 | FastAPI application         |
| `frontend` | Custom (Dockerfile)  | 3000 | Next.js application         |

### Commands

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Production Notes

1. **Change `SECRET_KEY`** — use `openssl rand -hex 32`
2. **Change admin password** — update `DEFAULT_ADMIN_PASSWORD`
3. **Deploy behind HTTPS** — use a reverse proxy (nginx, Caddy, Traefik)
4. **PostgreSQL is used automatically** in Docker — `DATABASE_URL` overridden in compose
5. **Redis is available** for production rate limiting / token blacklist

---

## 15. How to Run (Local Development)

### Prerequisites

- Python 3.12+
- Node.js 20+
- An Anthropic API key
- (Optional) Redis, Google/Microsoft OAuth credentials

### Backend

```bash
cd backend

# Create virtual environment
python -m venv ../venv
source ../venv/bin/activate   # Linux/Mac
# ..\venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY, SECRET_KEY, etc.

# Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev -- -p 3001
```

### Verify

- Backend health: `curl http://localhost:8000/health`
- Frontend: Open `http://localhost:3001`
- Login: `admin@gmail.com` / `admin` (seeded admin)

---

## 16. Security Considerations

### Implemented

| Control                     | Implementation                                             |
|-----------------------------|------------------------------------------------------------|
| Password hashing            | BCrypt (12 rounds) via passlib                             |
| JWT authentication          | HS256 signed tokens with 60-min expiry                     |
| Token blacklisting          | Redis-backed revocation on logout (fail-open)              |
| Role-based access control   | Admin-only endpoints enforced via `require_admin`          |
| Data isolation              | All queries filter by `user_id` and `department`           |
| Rate limiting               | Sliding window per IP (30/min default, 100/min admin)      |
| CORS                        | Restricted to configured origins                           |
| Input validation            | Pydantic models for all request bodies                     |
| OAuth token encryption      | Fernet symmetric encryption for stored tokens              |
| CSRF protection (OAuth)     | JWT-signed state parameter in OAuth flows                  |

### Recommended for Production

| Control                     | Recommendation                                             |
|-----------------------------|------------------------------------------------------------|
| HTTPS                       | Deploy behind TLS-terminating reverse proxy                |
| Secret management           | Use a vault (AWS Secrets Manager, HashiCorp Vault)         |
| Rate limiting               | Switch to Redis-backed distributed rate limiter            |
| Session management          | Add refresh tokens and token rotation                      |
| Audit logging               | Log all admin actions and data access events               |
| Dependency scanning         | Run `pip audit` and `npm audit` in CI/CD                   |
| OWASP headers               | Add CSP, X-Frame-Options, HSTS headers                    |

---

## 17. End-to-End Workflow

### Chat Flow (Complete)

```
Step 1:  User types "Show me idle vehicles" in chat UI
Step 2:  Frontend sends POST /api/v1/chat { message, conversation_id }
Step 3:  Backend validates JWT → gets CurrentUser (dept: logistics)
Step 4:  Creates/retrieves Conversation (scoped to user + department)
Step 5:  Loads conversation history from DB
Step 6:  Calls AgentOrchestrator.process_query("logistics", message, history)
Step 7:  Orchestrator calls Claude API with:
           - model: claude-sonnet-4-20250514
           - system: LOGISTICS_SYSTEM_PROMPT
           - tools: logistics tools + email tools
           - messages: history + current message
Step 8:  Claude responds with tool_use: { name: "get_idle_vehicles", input: {} }
Step 9:  Orchestrator executes tool:
           → Calls FleetHunt API: GET /fleet?api_token=xxx
           → Filters: speed == 0 AND ignition == 1
           → Returns: { results: [...], total: 3 }
Step 10: Feeds tool result back to Claude → Claude may call more tools (LOOP)
Step 11: Claude responds with end_turn: "I found 3 idle vehicles: ..."
Step 12: Saves user message + assistant message + usage record to DB
Step 13: Returns to frontend: { conversation_id, message, tool_calls }
Step 14: Frontend renders markdown response + expandable tool result cards
```

### Email Flow (Complete)

```
Step 1:  Admin navigates to /admin → Email Integration section
Step 2:  Clicks "Connect Gmail" for restaurant department
Step 3:  Frontend calls GET /api/v1/email/connect/restaurant/gmail
Step 4:  Backend returns OAuth URL → browser redirects to Google
Step 5:  User authorizes → Google redirects to /api/v1/email/callback/gmail
Step 6:  Backend exchanges code for tokens, encrypts & stores in DB
Step 7:  Redirects to /admin?email_connected=restaurant
Step 8:  Frontend refreshes → shows green connected status
Step 9:  Now in chat, user can say "search my emails for invoices"
Step 10: Claude calls search_emails tool → backend decrypts token → calls Gmail API
Step 11: Results returned through the agentic loop → Claude summarizes for user
```

---

## 18. Common Questions & Answers

**Q: What architecture pattern does this use?**  
A: Agentic AI pattern with a tool-use loop. The AI (Claude) decides what data it needs, our backend executes the tool, feeds the result back, and the AI interprets it. This loops until the AI has enough data to answer.

**Q: Why Anthropic SDK directly instead of LangChain?**  
A: Direct SDK gives full control over the tool-use loop, lower latency, less abstraction overhead, and simpler debugging. LangChain adds unnecessary complexity for this use case.

**Q: How does department isolation work?**  
A: Each user has a `department` field stored in the JWT. The backend loads only that department's system prompt and tools. Conversation history is scoped to (user_id, department). The AI agent can only call tools for its department.

**Q: What's the difference between mock and real tools?**  
A: Sales, Finance, Accounting tools return simulated data. Logistics tools call the real FleetHunt GPS API. Restaurant tools query real POS data. Email tools call real Gmail/Outlook APIs via OAuth2.

**Q: How is email integration secured?**  
A: OAuth2 with CSRF protection (JWT-signed state parameter). Tokens are encrypted at rest using Fernet (AES-128-CBC) derived from the app's SECRET_KEY. Only admins can connect/disconnect accounts. Token auto-refresh happens 5 minutes before expiry.

**Q: How does streaming work?**  
A: The `/chat/stream` endpoint uses SSE. We use `client.messages.stream()` which yields text chunks as Claude generates them. Each chunk is sent as an SSE event. The frontend uses `EventSource` to receive them in real-time.

**Q: How would you scale this for production?**  
A: (1) PostgreSQL instead of SQLite, (2) Redis for rate limiting and token blacklist, (3) Connection pooling, (4) Docker Compose or Kubernetes, (5) HTTPS via reverse proxy, (6) Add refresh tokens, (7) Distributed rate limiting, (8) Horizontal scaling behind a load balancer.

**Q: What is MCP?**  
A: Model Context Protocol — a standard for connecting AI models to real data sources. The Logistics agent is the MCP implementation — connecting Claude to FleetHunt GPS API. The architecture supports adding MCP servers for other departments (Salesforce for Sales, SAP for Finance, etc.).

---

*Generated for the Multi-Department AI Agent Portal project.*

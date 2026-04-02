# Multi-Department AI Agent Portal — Technical Documentation

> **Version**: 1.0.0  
> **Architecture**: Approach 1 — Single Portal with Role-Based Access  
> **Stack**: FastAPI (Python 3.12) · Next.js 15 (React 19, TypeScript) · SQLite (dev) / PostgreSQL (prod) · Anthropic Claude API

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Directory Structure](#3-directory-structure)
4. [Backend](#4-backend)
   - [Configuration](#41-configuration)
   - [Database Layer](#42-database-layer)
   - [Models & Schema](#43-models--schema)
   - [Authentication & Authorization](#44-authentication--authorization)
   - [Rate Limiting](#45-rate-limiting)
   - [AI Agent System](#46-ai-agent-system)
   - [API Reference](#47-api-reference)
5. [Frontend](#5-frontend)
   - [Types & Constants](#51-types--constants)
   - [API Client](#52-api-client)
   - [Pages & Components](#53-pages--components)
6. [Department Configuration](#6-department-configuration)
7. [Environment Variables](#7-environment-variables)
8. [Local Development Setup](#8-local-development-setup)
9. [Docker Deployment](#9-docker-deployment)
10. [MCP Integration Guide](#10-mcp-integration-guide)
11. [Multi-Tenant MCP Architecture](#11-multi-tenant-mcp-architecture)
12. [Security Considerations](#12-security-considerations)
13. [Future Roadmap](#13-future-roadmap)

---

## 1. Project Overview

The Multi-Department AI Agent Portal is a full-stack application that provides specialized AI assistants to different departments within an organization. Each department gets its own AI agent with:

- **Department-specific system prompts** — tailored personality, domain expertise, and behavioral guidelines.
- **Department-specific tools** — each agent can invoke tools scoped to its domain (CRM, ERP, AP/AR, POS).
- **Data isolation** — users can only access conversations and data belonging to their own department.
- **Role-based access control** — three roles (User, Dept Admin, Admin) with escalating privileges.

### Supported Departments

| Department   | Agent Expertise                                    | Tools                                       |
|--------------|----------------------------------------------------|---------------------------------------------|
| **Sales**       | Lead scoring, pipeline forecasting, CRM insights   | `query_crm`, `search_email_logs`, `get_market_data` |
| **Finance**     | Financial modeling, cash flow, risk, compliance     | `query_erp`, `get_cash_flow_forecast`, `check_compliance` |
| **Accounting**  | Invoice processing, reconciliation, tax, audit      | `query_invoices`, `reconcile_accounts`, `calculate_tax` |
| **Restaurant**  | Menu planning, inventory, reservations, food cost   | `query_menu`, `check_inventory`, `get_reservations` |

### Core Features

- JWT-based authentication with BCrypt password hashing
- Real-time streaming responses via Server-Sent Events (SSE)
- Agentic tool-use loop (Claude API `tool_use` → execute → return result → loop)
- Conversation persistence with full message history
- Admin dashboard with usage analytics, cost tracking, and department KPIs
- Rate limiting (sliding window per IP)
- Quick action prompts per department
- Markdown rendering with GFM support in chat
- Expandable tool result cards with tabular data

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 15)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │  Login   │  │   Chat   │  │  Admin   │  │  Root Redirect│   │
│  │  Page    │  │   Page   │  │Dashboard │  │               │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────────────┘   │
│       │              │              │                             │
│       └──────────────┼──────────────┘                            │
│                      │  API Client (lib/api.ts)                  │
│                      │  Bearer Token Auth                        │
└──────────────────────┼───────────────────────────────────────────┘
                       │  HTTP / SSE
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                            │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │   Auth API     │  │   Chat API     │  │   Admin API       │  │
│  │  /auth/login   │  │  /chat         │  │  /admin/usage     │  │
│  │  /auth/register│  │  /chat/stream  │  │  /admin/config    │  │
│  └───────┬────────┘  └───────┬────────┘  │  /admin/insights  │  │
│          │                   │            └───────┬───────────┘  │
│          ▼                   ▼                    ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Middleware Layer                        │   │
│  │   JWT Auth  ·  Rate Limiter  ·  CORS                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│          ┌───────────────────┼───────────────────┐              │
│          ▼                   ▼                   ▼              │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐      │
│  │  Auth Service│  │ Agent Orchestrator│  │Usage Service │      │
│  │  (JWT+BCrypt)│  │ (Claude API Loop) │  │(Token Track) │      │
│  └──────────────┘  └────────┬─────────┘  └──────────────┘      │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│      ┌────────────┐  ┌────────────┐  ┌────────────────┐        │
│      │  Prompts   │  │   Tools    │  │ Tool Execution │        │
│      │ (per dept) │  │ (per dept) │  │ (mock handlers)│        │
│      └────────────┘  └────────────┘  └────────────────┘        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Database Layer (SQLAlchemy Async)         │   │
│  │   Users · Conversations · Messages · Usage · Budgets      │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  SQLite (dev)    │
                    │  PostgreSQL (prod)│
                    └──────────────────┘
```

### Request Flow (Chat)

1. User sends message from the Chat page
2. Frontend calls `POST /api/v1/chat` with Bearer token
3. Backend validates JWT → extracts `CurrentUser` (id, department, role)
4. Creates or retrieves the `Conversation` (scoped to user + department)
5. Loads conversation history (last N messages)
6. Sends to `AgentOrchestrator.process_query()`:
   - Calls Claude API with department system prompt + tools + history
   - If Claude responds with `tool_use` → executes tool → passes result back → loops
   - On `end_turn` → returns final text response
7. Backend saves user message + assistant response to DB
8. Records usage (tokens, tool calls) in `usage_records`
9. Returns response to frontend

---

## 3. Directory Structure

```
test/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── orchestrator.py     # Claude API orchestration + tool loop
│   │   │   ├── prompts.py          # Department system prompts
│   │   │   └── tools.py            # Tool definitions + mock handlers
│   │   ├── api/
│   │   │   ├── admin.py            # Admin endpoints (usage, config, insights)
│   │   │   ├── auth.py             # Login/register endpoints
│   │   │   ├── chat.py             # Chat send + SSE stream
│   │   │   └── conversations.py    # Conversation list/detail
│   │   ├── db/
│   │   │   └── database.py         # Async engine, sessions, init, seeding
│   │   ├── middleware/
│   │   │   ├── auth_middleware.py   # JWT validation + role enforcement
│   │   │   └── rate_limiter.py     # Sliding window rate limiter
│   │   ├── models/
│   │   │   ├── conversation.py     # Conversation + Message ORM models
│   │   │   ├── usage.py            # UsageRecord + DepartmentBudget models
│   │   │   └── user.py             # User model + Department/Role enums
│   │   ├── services/
│   │   │   ├── auth_service.py     # Password hashing, JWT, user CRUD
│   │   │   └── usage_service.py    # Usage recording
│   │   ├── config.py               # Pydantic Settings
│   │   └── main.py                 # FastAPI app entry point
│   ├── .env                        # Environment configuration
│   ├── .env.example                # Template env file
│   ├── Dockerfile                  # Backend container image
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/
│   │   │   │   └── page.tsx        # Admin dashboard (charts, KPIs, costs)
│   │   │   ├── chat/
│   │   │   │   └── page.tsx        # Chat interface (markdown, tools, actions)
│   │   │   ├── login/
│   │   │   │   └── page.tsx        # Auth page (signin/register)
│   │   │   ├── globals.css         # Tailwind + CSS variables
│   │   │   ├── layout.tsx          # Root layout
│   │   │   └── page.tsx            # Root redirect
│   │   ├── lib/
│   │   │   └── api.ts              # API client wrapper
│   │   └── types/
│   │       └── index.ts            # TS interfaces & constants
│   ├── public/                     # Static assets
│   ├── Dockerfile                  # Multi-stage frontend build
│   ├── next.config.js              # Next.js config (standalone)
│   ├── package.json                # Dependencies
│   ├── start.sh                    # Dev start script
│   ├── tailwind.config.ts          # Tailwind config
│   └── tsconfig.json               # TypeScript config
├── docker-compose.yml              # Production orchestration
├── README.md                       # Quick start guide
└── DOCUMENTATION.md                # This file
```

---

## 4. Backend

### 4.1 Configuration

**File**: `backend/app/config.py`

Uses Pydantic `BaseSettings` with `.env` file support.

| Variable                       | Type   | Default                     | Description                          |
|--------------------------------|--------|-----------------------------|--------------------------------------|
| `app_name`                     | str    | `multi-dept-ai-portal`      | Application identifier               |
| `app_env`                      | str    | `development`               | Environment name                     |
| `database_url`                 | str    | SQLite connection string    | Async DB URL                         |
| `redis_url`                    | str    | `redis://localhost:6379/0`  | Redis URL (for caching/sessions)     |
| `secret_key`                   | str    | (required)                  | JWT signing secret                   |
| `jwt_algorithm`                | str    | `HS256`                     | JWT algorithm                        |
| `access_token_expire_minutes`  | int    | `60`                        | Token TTL in minutes                 |
| `anthropic_api_key`            | str    | (required)                  | Anthropic API key                    |
| `cors_origins`                 | str    | `http://localhost:3000`     | Comma-separated allowed origins      |
| `rate_limit_default`           | int    | `30`                        | Default rate limit (req/min)         |
| `rate_limit_admin`             | int    | `100`                       | Admin rate limit (req/min)           |
| `default_admin_email`          | str    | `""`                        | Seed admin email (empty = no seed)   |
| `default_admin_password`       | str    | `""`                        | Seed admin password                  |

### 4.2 Database Layer

**File**: `backend/app/db/database.py`

- **Engine**: `create_async_engine()` — async SQLAlchemy engine (aiosqlite for dev, asyncpg for prod)
- **Session Factory**: `async_sessionmaker(AsyncSession)` — scoped async sessions
- **`get_db()`**: Async generator yielding DB sessions (used as FastAPI dependency)
- **`init_db()`**: Called on app startup via lifespan — creates all tables, then seeds admin
- **`_seed_default_admin()`**: If `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` are set in `.env`, creates an admin user (role=ADMIN, department=SALES) if one doesn't exist

### 4.3 Models & Schema

#### User Model (`backend/app/models/user.py`)

```
Table: users
├── id              VARCHAR(36)   PK        UUID string
├── email           VARCHAR       UNIQUE    Indexed
├── hashed_password VARCHAR       NOT NULL  BCrypt hash
├── full_name       VARCHAR       NOT NULL
├── department      VARCHAR       NOT NULL  Enum: SALES|FINANCE|ACCOUNTING|RESTAURANT
├── role            VARCHAR       NOT NULL  Enum: USER|DEPT_ADMIN|ADMIN (default: USER)
├── is_active       BOOLEAN       DEFAULT true
├── created_at      DATETIME(tz)  DEFAULT now()
└── updated_at      DATETIME(tz)  DEFAULT now(), ON UPDATE now()
```

**Enums**:
- `Department`: `SALES`, `FINANCE`, `ACCOUNTING`, `RESTAURANT`
- `Role`: `USER`, `DEPT_ADMIN`, `ADMIN`

#### Conversation Model (`backend/app/models/conversation.py`)

```
Table: conversations
├── id              VARCHAR(36)   PK        UUID string
├── user_id         VARCHAR(36)   FK→users  Indexed
├── department      VARCHAR       NOT NULL  Indexed
├── title           VARCHAR       NULLABLE  Auto-generated or null
├── created_at      DATETIME(tz)  DEFAULT now()
└── updated_at      DATETIME(tz)  DEFAULT now(), ON UPDATE now()
Index: (user_id, department) composite
```

#### Message Model (`backend/app/models/conversation.py`)

```
Table: messages
├── id              VARCHAR(36)   PK        UUID string
├── conversation_id VARCHAR(36)   FK→conversations  CASCADE DELETE
├── role            VARCHAR       NOT NULL  "user" | "assistant"
├── content         TEXT          NOT NULL  Full message text
├── tool_calls      JSON          NULLABLE  Array of {tool, input, result}
├── token_count     INTEGER       NULLABLE  Token count for this message
└── created_at      DATETIME(tz)  DEFAULT now()
Index: (conversation_id, created_at) composite
```

#### UsageRecord Model (`backend/app/models/usage.py`)

```
Table: usage_records
├── id              VARCHAR(36)   PK        UUID string
├── user_id         VARCHAR(36)   FK→users
├── department      VARCHAR       NOT NULL  Indexed
├── input_tokens    INTEGER       DEFAULT 0
├── output_tokens   INTEGER       DEFAULT 0
├── tool_calls_count INTEGER      DEFAULT 0
├── model           VARCHAR       DEFAULT "claude-sonnet-4-20250514"
└── created_at      DATETIME(tz)  DEFAULT now()
Indices: (department, created_at), (user_id, created_at)
```

#### DepartmentBudget Model (`backend/app/models/usage.py`)

```
Table: department_budgets
├── id                    VARCHAR(36)   PK        UUID string
├── department            VARCHAR       UNIQUE    One per department
├── monthly_token_limit   INTEGER       DEFAULT 2,000,000
├── monthly_tool_call_limit INTEGER     DEFAULT 5,000
├── max_concurrent_users  INTEGER       DEFAULT 50
├── alert_threshold_pct   INTEGER       DEFAULT 75
└── updated_at            DATETIME(tz)  DEFAULT now()
```

### 4.4 Authentication & Authorization

**Files**: `backend/app/services/auth_service.py`, `backend/app/middleware/auth_middleware.py`

#### Password Handling
- Hashing: BCrypt via `passlib.context.CryptContext(schemes=["bcrypt"])`
- Library: `bcrypt==4.0.1` (pinned — v5.0 has breaking changes with passlib)
- Functions: `hash_password(plain) → hash`, `verify_password(plain, hash) → bool`

#### JWT Token
- Algorithm: HS256
- Payload: `{ sub: user_id, department: str, role: str, exp: datetime }`
- TTL: 60 minutes (configurable)
- Library: `python-jose[cryptography]`

#### Auth Flow
```
Login Request (email, password)
    │
    ▼
authenticate_user()
    ├── Lookup user by email
    ├── Verify password hash
    └── Return user or None
    │
    ▼
create_access_token()
    ├── Encode JWT with user_id, department, role, expiry
    └── Return signed token
    │
    ▼
Response: { access_token, token_type: "bearer", department, role, full_name }
```

#### Middleware Dependencies
- **`get_current_user()`**: Extracts Bearer token → decodes JWT → loads user from DB → returns `CurrentUser(id, department, role)`
- **`require_admin()`**: Calls `get_current_user()` → asserts `role == "admin"` → raises 403 if not

### 4.5 Rate Limiting

**File**: `backend/app/middleware/rate_limiter.py`

- **Strategy**: In-memory sliding window (1-minute window per IP)
- **Storage**: Python `dict[str, list[float]]` — maps IP to list of request timestamps
- **Cleanup**: Removes timestamps older than 60 seconds on each request
- **Limits**:
  - `/admin` paths: 100 requests/minute
  - Other `/api/` paths: 30 requests/minute
- **Response Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- **On Exceed**: HTTP 429 Too Many Requests

> **Note**: In-memory rate limiting is suitable for single-instance dev. Use Redis for production multi-instance deployments.

### 4.6 AI Agent System

#### System Prompts (`backend/app/agents/prompts.py`)

Each department has a detailed system prompt that defines:
- Agent identity and role
- Domain expertise areas
- Available data sources
- Response formatting guidelines
- Data access restrictions (cannot access other departments)

**Sales Agent**: CRM specialist — lead scoring, pipeline analytics, competitive analysis, email draft assistance. Data: CRM system, email communications, market intelligence.

**Finance Agent**: Financial analyst — cash flow modeling, budget analysis, risk assessment, regulatory compliance (SOX, IFRS, GAAP). Data: ERP system, GL accounts, journal entries.

**Accounting Agent**: Accounting specialist — invoice processing, account reconciliation, tax estimation, audit preparation. Data: AP/AR system, bank statements, tax regulations.

**Restaurant Agent**: Restaurant operations manager — menu planning, food cost analysis, inventory tracking, reservation management, health compliance. Data: POS system, inventory database, reservation system.

#### Tool Definitions (`backend/app/agents/tools.py`)

Tools are defined in Claude's `tool_use` format with JSON Schema `input_schema`:

**Sales Tools**:
| Tool               | Parameters                           | Description                               |
|--------------------|--------------------------------------|-------------------------------------------|
| `query_crm`        | query_type, filters, date_range      | Query leads, deals, contacts, pipeline    |
| `search_email_logs` | search_term, date_range, sender_filter | Search email communications              |
| `get_market_data`  | data_type, industry, region          | Competitive analysis and market data      |

**Finance Tools**:
| Tool                   | Parameters                            | Description                               |
|------------------------|---------------------------------------|-------------------------------------------|
| `query_erp`            | module, query_type, filters, date_range | GL, transactions, budgets, journals     |
| `get_cash_flow_forecast` | period, scenario, include_projections | Multi-scenario cash flow projections     |
| `check_compliance`     | regulation, check_type, entity         | SOX, IFRS, GAAP compliance validation    |

**Accounting Tools**:
| Tool                 | Parameters                              | Description                              |
|----------------------|-----------------------------------------|------------------------------------------|
| `query_invoices`     | invoice_type, status, date_range, vendor | AP/AR invoice queries with filters      |
| `reconcile_accounts` | account_type, period, include_pending    | Bank-to-book reconciliation             |
| `calculate_tax`      | tax_type, jurisdiction, period, entity   | Tax liability estimation                |

**Restaurant Tools**:
| Tool               | Parameters                              | Description                              |
|--------------------|-----------------------------------------|------------------------------------------|
| `query_menu`       | category, dietary_filter, price_range    | Menu items, pricing, nutrition           |
| `check_inventory`  | category, low_stock_only, include_costs  | Ingredient levels with par tracking      |
| `get_reservations` | date_range, party_size_min, status       | Bookings, table assignments, capacity    |

#### Tool Execution

All tools currently return **mock/simulated data** for development. The `execute_tool(tool_name, tool_input)` function routes to the appropriate handler which returns structured JSON with:
- Status information
- Results as arrays of objects (displayable as tables)
- Summary metadata

#### Orchestrator (`backend/app/agents/orchestrator.py`)

The `AgentOrchestrator` class manages the agentic loop:

```python
class AgentOrchestrator:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def process_query(self, message, department, conversation_history):
        system_prompt = get_system_prompt(department)
        tools = get_tools(department)
        messages = [...history, {"role": "user", "content": message}]

        while True:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=system_prompt,
                tools=tools,
                messages=messages,
            )

            if response.stop_reason == "tool_use":
                # Extract tool calls, execute them, append results
                messages.append({"role": "assistant", "content": response.content})
                tool_results = [execute each tool_use block]
                messages.append({"role": "user", "content": tool_results})
                # Loop continues...
            else:
                # End turn — extract text and return
                return AgentResponse(content, tokens, tool_calls, model)
```

**Key behaviors**:
- Accumulates tokens across loop iterations
- Records all tool executions with inputs and results
- Supports both sync (`process_query`) and streaming (`stream_query`) modes
- Streaming uses SSE for real-time text delivery to the frontend

### 4.7 API Reference

#### Auth Endpoints

| Method | Path                    | Auth  | Description            | Request Body                                                   | Response                                                          |
|--------|-------------------------|-------|------------------------|----------------------------------------------------------------|-------------------------------------------------------------------|
| POST   | `/api/v1/auth/login`    | None  | User login             | `{ email, password }`                                          | `{ access_token, token_type, department, role, full_name }`       |
| POST   | `/api/v1/auth/register` | None  | User registration      | `{ email, password, full_name, department, role? }`            | `{ access_token, token_type, department, role, full_name }`       |

**Error Codes**:
- `401`: Invalid credentials
- `409`: Email already registered

#### Chat Endpoints

| Method | Path                    | Auth     | Description               | Request/Params                           | Response                                         |
|--------|-------------------------|----------|---------------------------|------------------------------------------|--------------------------------------------------|
| POST   | `/api/v1/chat`          | Bearer   | Send message to agent     | Body: `{ message, conversation_id? }`    | `{ conversation_id, message: {…}, tool_calls }` |
| GET    | `/api/v1/chat/stream`   | Bearer   | Stream response (SSE)     | Query: `message, conversation_id?`       | EventSource stream of text chunks                |

#### Conversation Endpoints

| Method | Path                                      | Auth    | Description            | Response                                          |
|--------|-------------------------------------------|---------|------------------------|---------------------------------------------------|
| GET    | `/api/v1/conversations`                   | Bearer  | List conversations     | `[{ id, title, department, created_at, updated_at }]` (last 50) |
| GET    | `/api/v1/conversations/{conversation_id}` | Bearer  | Get conversation detail | `{ id, title, department, messages: [{…}], … }`  |

#### Admin Endpoints (require Admin role)

| Method | Path                          | Auth   | Description              | Params/Body                                          | Response                                                        |
|--------|-------------------------------|--------|--------------------------|------------------------------------------------------|-----------------------------------------------------------------|
| GET    | `/api/v1/admin/usage`         | Admin  | Usage metrics            | Query: `days=30`                                      | `[{ department, input_tokens, output_tokens, tool_calls, request_count }]` |
| GET    | `/api/v1/admin/config/{dept}` | Admin  | Department budget config | Path: department name                                 | `{ monthly_token_limit, …, current_usage, usage_pct }`         |
| PUT    | `/api/v1/admin/config/{dept}` | Admin  | Update budget config     | Body: partial `{ monthly_token_limit, … }`            | Updated config with recalculated usage                          |
| GET    | `/api/v1/admin/insights`      | Admin  | Department KPIs          | —                                                     | `{ department: [{ label, value, trend, change }] }`            |

#### Health Check

| Method | Path      | Auth | Response                                          |
|--------|-----------|------|---------------------------------------------------|
| GET    | `/health` | None | `{ status: "healthy", service: "multi-dept-ai-portal" }` |

---

## 5. Frontend

### 5.1 Types & Constants

**File**: `frontend/src/types/index.ts`

#### Key Interfaces

```typescript
interface User { id: string; email: string; full_name: string; department: string; role: string; }
interface AuthResponse { access_token: string; token_type: string; department: string; role: string; full_name: string; }
interface ChatMessage { id: string; role: "user" | "assistant"; content: string; tool_calls?: ToolCall[]; created_at: string; }
interface ToolCall { tool: string; input: Record<string, any>; result: any; }
interface Conversation { id: string; title: string; department: string; created_at: string; updated_at: string; }
interface DepartmentUsage { department: string; input_tokens: number; output_tokens: number; tool_calls: number; request_count: number; }
interface BudgetConfig { monthly_token_limit: number; current_usage: number; usage_pct: number; /* ... */ }
interface QuickPrompt { icon: string; label: string; description: string; prompt: string; }
```

#### Department Configuration

`DEPARTMENT_CONFIG` maps each department to visual styling:
- **Sales**: Blue theme, `📊` icon
- **Finance**: Green theme, `💰` icon
- **Accounting**: Purple theme, `📋` icon
- **Restaurant**: Orange theme, `🍽️` icon

#### Quick Action Prompts

`DEPARTMENT_PROMPTS` defines 4 quick action cards per department:

- **Sales**: Pipeline overview, Lead analysis, Competitive intel, Email drafts
- **Finance**: Cash flow forecast, Budget vs actual, Compliance check, Risk assessment
- **Accounting**: Outstanding invoices, Account reconciliation, Tax calculation, Audit prep
- **Restaurant**: Today's menu, Inventory check, Reservation overview, Food cost analysis

### 5.2 API Client

**File**: `frontend/src/lib/api.ts`

Generic `apiFetch<T>(path, options?)` function that:
1. Prepends the base URL (`NEXT_PUBLIC_API_URL` or `http://localhost:8000`)
2. Injects `Authorization: Bearer <token>` from `localStorage`
3. Sets `Content-Type: application/json`
4. Throws on non-2xx responses with the detail message

Exported methods:
- `login(email, password)` → `POST /api/v1/auth/login`
- `register(data)` → `POST /api/v1/auth/register`
- `sendMessage(message, conversation_id?)` → `POST /api/v1/chat`
- `listConversations()` → `GET /api/v1/conversations`
- `getConversation(id)` → `GET /api/v1/conversations/{id}`
- `getUsage(days?)` → `GET /api/v1/admin/usage?days={days}`
- `getDepartmentConfig(dept)` → `GET /api/v1/admin/config/{dept}`
- `getInsights()` → `GET /api/v1/admin/insights`

### 5.3 Pages & Components

#### Login Page (`frontend/src/app/login/page.tsx`)

- Dual mode: **Sign In** / **Register** toggle
- Registration includes:
  - Full name input
  - Department selection grid (4 department cards with icons and colors)
- On success: stores `token`, `department`, `role`, `fullName` in `localStorage` → redirects to `/chat`
- Error handling: displays error messages below the form

#### Chat Page (`frontend/src/app/chat/page.tsx`)

The most complex page with several sub-components:

**`ToolResultCard`** — Expandable card showing tool execution results:
- Header: tool name with colored badge
- Collapsed/expanded toggle
- Table rendering for array results
- JSON fallback for non-array results

**`MessageActions`** — Floating action bar on assistant messages:
- Copy to clipboard
- Thumbs up / thumbs down feedback buttons
- Appears on hover

**Main Chat Interface**:
- **Sidebar** (collapsible):
  - User profile (name, department badge, role)
  - "New Chat" button
  - Conversation search filter
  - Conversation history list (clickable to load)
  - Logout button
- **Welcome Screen** (no messages):
  - Department-specific greeting
  - 4 quick action prompt cards (clickable to auto-send)
- **Message Area**:
  - User messages: right-aligned, blue background
  - Assistant messages: left-aligned, white background, markdown rendered
  - Tool result cards inline with messages
  - Animated typing indicator (bouncing dots)
- **Input Bar**: Text field + Send button, Enter to send

**Markdown Rendering**: Uses `react-markdown` with `remark-gfm` plugin for:
- Tables, strikethrough, task lists
- Code blocks with syntax highlighting styles
- Links, images, blockquotes, lists

#### Admin Dashboard (`frontend/src/app/admin/page.tsx`)

Requires admin role (redirects non-admins to `/chat`).

**Summary Cards** (top row):
| Card           | Calculation                                              |
|----------------|----------------------------------------------------------|
| Total Tokens   | Sum of input + output tokens across all departments      |
| Total Requests | Sum of request_count across all departments              |
| Tool Calls     | Sum of tool_calls across all departments                 |
| Est. API Cost  | `(input × $0.003/1K) + (output × $0.015/1K)`           |
| Active Depts   | Count of departments with > 0 requests                   |

**Period Selector**: 7 days / 14 days / 30 days / 90 days — refetches data on change.

**Charts** (Recharts library):
- **Bar Chart**: Input tokens vs output tokens by department (dual bars)
- **Pie Chart**: Token share as donut chart with percentage labels

**Cost Breakdown**: Per-department cost cards with:
- Input/output cost split
- Total cost
- Visual progress bar (proportional to highest department)

**Department KPI Insights**: Data from `/admin/insights` endpoint:
- 4 KPIs per department
- Trend arrows (↑ green, ↓ red, → gray)
- Change percentages

**Department Detail Cards**: Grid of department cards showing:
- Token counts (input/output)
- Request count
- Tool calls
- Calculated cost

---

## 6. Department Configuration

Adding a new department requires changes across both backend and frontend:

### Backend Changes

1. **`backend/app/models/user.py`**: Add to `Department` enum
2. **`backend/app/agents/prompts.py`**: Add system prompt in `SYSTEM_PROMPTS` dict
3. **`backend/app/agents/tools.py`**: Add tool definitions list + mock handlers, update `DEPARTMENT_TOOLS` dict and `execute_tool()` router
4. **`backend/app/api/admin.py`**: Add department KPIs to the insights endpoint

### Frontend Changes

5. **`frontend/src/types/index.ts`**: Add to `DEPARTMENT_CONFIG` (styling) and `DEPARTMENT_PROMPTS` (quick actions)
6. **`frontend/src/app/login/page.tsx`**: Department appears automatically if using the `DEPARTMENT_CONFIG` constant

---

## 7. Environment Variables

### Backend (`.env`)

```env
# Application
APP_NAME=multi-dept-ai-portal
APP_ENV=development              # development | staging | production
APP_PORT=8000

# Security
SECRET_KEY=<random-secret-key>   # Used for JWT signing — CHANGE IN PRODUCTION

# CORS
CORS_ORIGINS=http://localhost:3000

# Database
DATABASE_URL=sqlite+aiosqlite:///./ai_portal.db           # Local dev
# DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db  # Production

# Cache
REDIS_URL=redis://localhost:6379/0

# LLM
ANTHROPIC_API_KEY=sk-ant-...     # Your Anthropic API key

# Auth
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Rate Limiting
RATE_LIMIT_DEFAULT=30            # Requests per minute (general)
RATE_LIMIT_ADMIN=100             # Requests per minute (admin)

# Default Admin Seeding
DEFAULT_ADMIN_EMAIL=admin@gmail.com
DEFAULT_ADMIN_PASSWORD=admin     # CHANGE IN PRODUCTION
```

### Frontend

| Variable               | Description               | Default                  |
|------------------------|---------------------------|--------------------------|
| `NEXT_PUBLIC_API_URL`  | Backend API base URL      | `http://localhost:8000`  |

---

## 8. Local Development Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- npm or yarn

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY, SECRET_KEY, DEFAULT_ADMIN_EMAIL/PASSWORD

# Start server
uvicorn app.main:app --reload --port 8000
```

The server will:
1. Create SQLite database (`ai_portal.db`) on first run
2. Create all tables
3. Seed the default admin user (if configured in `.env`)

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
NEXT_PUBLIC_API_URL=http://localhost:8000 npx next dev --port 3000
```

### Verify

- Backend health: `curl http://localhost:8000/health`
- Frontend: Open `http://localhost:3000` in browser
- Login: Use seeded admin credentials (default: `admin@gmail.com` / `admin`)

---

## 9. Docker Deployment

### Production Stack

The `docker-compose.yml` defines 4 services:

```yaml
services:
  postgres:     # PostgreSQL 16 with persistent volume
  redis:        # Redis 7 for caching/rate limiting
  backend:      # FastAPI app (built from ./backend/Dockerfile)
  frontend:     # Next.js app (built from ./frontend/Dockerfile)
```

### Deploy

```bash
# Build and start all services
docker-compose up --build -d

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop
docker-compose down

# Stop and remove volumes (DESTRUCTIVE)
docker-compose down -v
```

### Production Notes

1. **Change `SECRET_KEY`** — use a cryptographically random string (e.g., `openssl rand -hex 32`)
2. **Change admin password** — update `DEFAULT_ADMIN_PASSWORD` in `.env`
3. **Set real `ANTHROPIC_API_KEY`** — the dummy key won't work for actual LLM calls
4. **PostgreSQL** is used automatically in Docker — the `DATABASE_URL` is overridden in `docker-compose.yml`
5. **Redis** is available for production rate limiting — replace the in-memory store
6. **HTTPS** — deploy behind a reverse proxy (nginx, Caddy, Traefik) with TLS termination

---

## 10. MCP Integration Guide

The Model Context Protocol (MCP) enables connecting real data sources to the AI agents, replacing the current mock tool handlers with live integrations.

### Architecture

```
Agent Orchestrator
    │
    ▼
MCP Client (per department)
    │
    ├── Sales MCP Server ──→ Salesforce, HubSpot, Mailchimp
    ├── Finance MCP Server ──→ SAP, Oracle ERP, QuickBooks
    ├── Accounting MCP Server ──→ Xero, FreshBooks, bank APIs
    └── Restaurant MCP Server ──→ Toast POS, OpenTable, inventory system
```

### Integration Points

1. **Replace mock handlers** in `backend/app/agents/tools.py` → each tool handler calls the MCP server instead of returning mock data
2. **MCP Server per department** — standalone service that wraps the real API/database
3. **Tool discovery** — MCP servers can advertise available tools, allowing dynamic tool registration

### Example: Connecting a CRM MCP Server

```python
# In tools.py, replace mock handler:
async def handle_query_crm(params: dict) -> dict:
    async with MCPClient("http://mcp-sales:8080") as client:
        result = await client.call_tool("query_crm", params)
        return result
```

### MCP Server Template

Each MCP server is a separate service that:
1. Exposes tools via the MCP protocol
2. Handles authentication to the underlying data source
3. Returns structured data matching the tool's output schema
4. Runs independently and can be scaled/updated without affecting the portal

---

## 11. Multi-Tenant MCP Architecture

For scenarios where different customers (tenants) need different data source integrations, even within the same department.

### Architecture

```
                    ┌─────────────────────┐
                    │   Agent Orchestrator │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │  Tenant MCP Router   │
                    │  (tenant_id + dept)  │
                    └─────────┬───────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌─────────▼─────┐  ┌─────────▼─────┐  ┌─────────▼─────┐
│ Tenant A Pool │  │ Tenant B Pool │  │ Tenant C Pool │
│               │  │               │  │               │
│ Sales → SF    │  │ Sales → Hub   │  │ Sales → Pipe  │
│ Fin → SAP     │  │ Fin → Oracle  │  │ Fin → QB      │
│ Acct → Xero   │  │ Acct → Fresh  │  │ Acct → Wave   │
└───────────────┘  └───────────────┘  └───────────────┘
```

### Key Concepts

1. **Tenant MCP Pool**: Each tenant has a pool of MCP server connections, one per department
2. **Tenant Config**: Database table mapping `(tenant_id, department) → mcp_server_url`
3. **Connection pooling**: MCP connections are pooled and reused across requests
4. **Dynamic routing**: The orchestrator resolves the correct MCP server at query time based on the authenticated user's tenant

### Configuration Model

```python
class TenantMCPConfig(Base):
    __tablename__ = "tenant_mcp_configs"
    tenant_id: str        # Organization ID
    department: str       # Department enum
    mcp_server_url: str   # MCP server endpoint
    auth_config: JSON     # Encrypted credentials for the MCP server
    is_active: bool
```

### Benefits

- Each customer brings their own data sources
- Department tools work identically — only the underlying MCP server changes
- New integrations are added per-tenant without code changes
- MCP servers can be self-hosted by the customer for data sovereignty

---

## 12. Security Considerations

### Implemented

| Control                  | Implementation                                       |
|--------------------------|------------------------------------------------------|
| Password hashing         | BCrypt (12 rounds) via passlib                       |
| JWT authentication       | HS256 signed tokens with 60-min expiry               |
| Role-based access        | Admin-only endpoints enforced via `require_admin`     |
| Data isolation           | All queries filter by `user_id` and `department`      |
| Rate limiting            | Sliding window per IP (30/min default, 100/min admin) |
| CORS                     | Restricted to configured origins                      |
| Input validation         | Pydantic models for all request bodies                |

### Recommended for Production

| Control                  | Recommendation                                        |
|--------------------------|-------------------------------------------------------|
| HTTPS                    | Deploy behind TLS-terminating reverse proxy            |
| Secret management        | Use a vault (AWS Secrets Manager, HashiCorp Vault)     |
| Rate limiting            | Switch to Redis-backed distributed rate limiter        |
| Session management       | Add refresh tokens and token revocation                |
| Audit logging            | Log all admin actions and data access events            |
| API key rotation         | Rotate Anthropic API keys periodically                 |
| Database encryption      | Encrypt sensitive fields (e.g., MCP auth configs)      |
| Dependency scanning      | Run `pip audit` and `npm audit` in CI/CD               |
| OWASP headers            | Add CSP, X-Frame-Options, HSTS headers                 |

---

## 13. Future Roadmap

### Not Yet Implemented (from Architecture Document)

| Feature                           | Status    | Notes                                              |
|-----------------------------------|-----------|----------------------------------------------------|
| Approach 2 — Separate portals     | Planned   | Independent frontend per department                |
| Approach 3 — Microservices        | Planned   | Per-department backend services                    |
| ChromaDB / RAG                    | Not started | Vector database for document retrieval            |
| Real MCP integrations             | Not started | Replace mock tool handlers                        |
| WebSocket chat                    | Not started | Replace SSE with bidirectional WebSocket          |
| File upload in chat               | Not started | Attach documents for agent analysis               |
| Conversation export               | Not started | Export chat as PDF/markdown                        |
| Email notifications               | Not started | Alert on budget thresholds                         |
| Alembic migrations                | Not started | Schema version control (Alembic is installed)      |
| Redis caching                     | Not started | Cache frequent queries and session data            |
| Multi-language support             | Not started | i18n for the frontend                             |
| Agent memory                      | Not started | Cross-conversation context retention               |
| Custom tool builder               | Not started | Admin UI to define new tools per department        |
| Approval workflows                | Not started | Human-in-the-loop for sensitive operations         |
| Tenant management                 | Not started | Multi-tenant admin with per-org MCP configs        |

---

*Generated for the Multi-Department AI Agent Portal project.*

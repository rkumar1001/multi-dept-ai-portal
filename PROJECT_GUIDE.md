# Multi-Department AI Portal — Complete Technical Guide

> **Purpose**: This document explains every aspect of the project so you can confidently answer any technical question about it.

---

## Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Project Structure — Every File Explained](#4-project-structure--every-file-explained)
5. [Database Models & Relationships](#5-database-models--relationships)
6. [Authentication Flow (End-to-End)](#6-authentication-flow-end-to-end)
7. [Chat & Agent Workflow (End-to-End)](#7-chat--agent-workflow-end-to-end)
8. [All API Endpoints](#8-all-api-endpoints)
9. [Department Agents & Tools](#9-department-agents--tools)
10. [FleetHunt MCP Integration (Logistics)](#10-fleethunt-mcp-integration-logistics)
11. [Frontend Pages & UI Flow](#11-frontend-pages--ui-flow)
12. [Middleware (Auth + Rate Limiting)](#12-middleware-auth--rate-limiting)
13. [Environment Variables](#13-environment-variables)
14. [Docker Setup](#14-docker-setup)
15. [How to Run](#15-how-to-run)
16. [Common Interview / Tech Lead Questions](#16-common-interview--tech-lead-questions)

---

## 1. What Is This Project?

A **single AI-powered web portal** where different departments (Sales, Finance, Accounting, Restaurant, Logistics) each get their own AI chatbot agent. Each agent has access to **department-specific tools and data sources**.

**Key concept**: One portal, multiple AI agents, role-based access, real-time tool execution.

- Sales agent can query CRM, search emails, get market data
- Finance agent can query ERP, forecast cash flow, check compliance
- Accounting agent can query invoices, reconcile accounts, calculate tax
- Restaurant agent can query real menu data and orders (The Masala Twist)
- Logistics agent calls the **real FleetHunt GPS API** for live fleet tracking

---

## 2. Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.12+** | Programming language |
| **FastAPI** | Web framework (async, high-performance) |
| **SQLAlchemy 2.0** (async) | ORM for database operations |
| **SQLite** (dev) / **PostgreSQL** (prod) | Database |
| **Anthropic SDK** | Direct Claude API calls (NOT LangChain/LangGraph) |
| **httpx** | Async HTTP client (for FleetHunt API calls) |
| **python-jose** | JWT token creation and validation |
| **bcrypt** | Password hashing |
| **Pydantic v2** | Data validation and settings management |
| **SSE-Starlette** | Server-Sent Events for streaming responses |
| **Uvicorn** | ASGI server |

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 15** | React framework (App Router) |
| **React 19** | UI library |
| **TypeScript** | Type-safe JavaScript |
| **Tailwind CSS** | Utility-first CSS framework |
| **Recharts** | Charts for admin dashboard |
| **react-markdown** | Renders AI responses as formatted markdown |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker & Docker Compose** | Containerization |
| **Redis 7** | Session/cache store (future use) |
| **PostgreSQL 16** | Production database |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                   (Next.js + React + Tailwind)               │
│                                                              │
│  /login  →  /chat  →  /admin                                │
│     │          │          │                                   │
│     │   localStorage: token, department, role, fullName      │
│     │          │                                              │
└─────┼──────────┼──────────┼──────────────────────────────────┘
      │          │          │
      │   HTTP + Bearer JWT Token
      │          │          │
┌─────┼──────────┼──────────┼──────────────────────────────────┐
│     ▼          ▼          ▼          BACKEND                  │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  CORS    │→ │  Rate    │→ │  Auth    │→ │  Route   │     │
│  │Middleware│  │ Limiter  │  │Middleware│  │ Handler  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                │              │
│                                    ┌───────────┼───────────┐  │
│                                    ▼           ▼           ▼  │
│                               /api/v1/    /api/v1/    /api/v1/│
│                               auth        chat        admin   │
│                                            │                  │
│                                            ▼                  │
│                                 ┌─────────────────────┐       │
│                                 │  AgentOrchestrator  │       │
│                                 │                     │       │
│                                 │  1. Get system      │       │
│                                 │     prompt for dept │       │
│                                 │  2. Get tools       │       │
│                                 │  3. Call Claude API  │       │
│                                 │  4. Execute tools   │       │
│                                 │  5. Loop until done │       │
│                                 └─────────┬───────────┘       │
│                                           │                   │
│                              ┌────────────┼────────────┐      │
│                              ▼            ▼            ▼      │
│                         Mock Tools   FleetHunt     Claude     │
│                        (Sales,Fin,   GPS API       API        │
│                         Acct)        (REAL)                   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              DATABASE (SQLite / PostgreSQL)             │   │
│  │  users │ conversations │ messages │ usage │ budgets    │   │
│  └────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

---

## 4. Project Structure — Every File Explained

### Backend Files

| File | Purpose |
|---|---|
| `backend/app/main.py` | **Entry point**. Creates FastAPI app, registers CORS middleware, rate limiter, and 4 API routers (auth, chat, conversations, admin). Runs `init_db()` on startup via lifespan hook. |
| `backend/app/config.py` | **Settings**. Uses Pydantic `BaseSettings` to load all env vars from `.env`. Includes API keys, DB URL, JWT config, rate limits, FleetHunt credentials. Cached with `@lru_cache`. |
| `backend/app/agents/orchestrator.py` | **Core AI engine**. `AgentOrchestrator` class creates Anthropic client, sends queries to Claude with department-specific prompts + tools. Implements the **tool-use loop**: call Claude → if it wants a tool → execute tool → feed result back → repeat until Claude gives a final text answer. Supports both sync and SSE streaming. |
| `backend/app/agents/prompts.py` | **System prompts**. One prompt per department defining the agent's expertise, personality, available tools, and data isolation rules. E.g., Logistics prompt says "You are a Logistics AI Agent powered by FleetHunt GPS tracking..." |
| `backend/app/agents/tools.py` | **Tool definitions + handlers**. Defines tools in Claude's tool_use JSON format for each department. Contains: (a) FleetHunt API integration functions using `httpx`, (b) mock handlers for Sales/Finance/Accounting, (c) real menu data for Restaurant, (d) Haversine distance formula for proximity search. **This is the biggest file (~900 lines).** |
| `backend/app/api/auth.py` | **Auth routes**. `POST /login` (validate credentials, return JWT), `POST /register` (create user, return JWT). |
| `backend/app/api/chat.py` | **Chat route**. `POST /chat` — receives message + optional conversation_id, loads history, calls orchestrator, saves messages to DB, records token usage, returns response. Also `GET /chat/stream` for SSE streaming. |
| `backend/app/api/conversations.py` | **Conversation routes**. `GET /conversations` (list user's last 50), `GET /conversations/{id}` (full message history). |
| `backend/app/api/admin.py` | **Admin routes** (admin role required). Usage metrics, department budget config (get/update), department KPI insights. |
| `backend/app/db/database.py` | **Database setup**. Creates async SQLAlchemy engine, session factory, `get_db()` dependency, `init_db()` creates tables + seeds 3 default users on startup. |
| `backend/app/middleware/auth_middleware.py` | **JWT validation**. `get_current_user()` extracts Bearer token, decodes JWT, loads user from DB, returns `CurrentUser` dataclass. `require_admin()` checks admin role. |
| `backend/app/middleware/rate_limiter.py` | **Rate limiting**. In-memory sliding window (1 min). 30 req/min default, 100 req/min for admin paths. Returns HTTP 429 if exceeded. |
| `backend/app/models/user.py` | **User model**. SQLAlchemy model with Department enum (SALES, FINANCE, ACCOUNTING, RESTAURANT, LOGISTICS) and Role enum (USER, DEPT_ADMIN, ADMIN). |
| `backend/app/models/conversation.py` | **Conversation + Message models**. Conversations scoped to (user_id, department). Messages store role, content, tool_calls (JSON), token_count. Messages CASCADE delete with conversation. |
| `backend/app/models/usage.py` | **Usage tracking models**. `UsageRecord` (per-request token + tool call counts) and `DepartmentBudget` (monthly limits). |
| `backend/app/services/auth_service.py` | **Auth business logic**. Password hashing (bcrypt), JWT create/decode, user CRUD. |
| `backend/app/services/usage_service.py` | **Usage recording**. Inserts a UsageRecord after each chat query. |
| `backend/requirements.txt` | Python package dependencies. |
| `backend/Dockerfile` | Python 3.12 slim, installs deps, runs uvicorn on port 8000. |
| `backend/.env` | Environment variables (API keys, DB config, secrets). |

### Frontend Files

| File | Purpose |
|---|---|
| `frontend/src/app/layout.tsx` | Root layout wrapper with HTML metadata. |
| `frontend/src/app/page.tsx` | **Root redirect**. Checks localStorage for token → if present go to `/chat`, else go to `/login`. |
| `frontend/src/app/login/page.tsx` | **Auth page**. Has Sign In / Register tabs. Register includes a visual department selector grid (5 departments with icons and colors). On success, stores token + metadata in localStorage, redirects to `/chat`. |
| `frontend/src/app/chat/page.tsx` | **Main chat interface**. Sidebar with conversation history + quick actions. Welcome screen with department-specific greeting and 4 prompt suggestion cards. Message area with markdown rendering, tool result cards (expandable), copy/feedback buttons. Input bar with Enter-to-send. |
| `frontend/src/app/admin/page.tsx` | **Admin dashboard**. Summary cards (Total Tokens, Requests, Tool Calls, Est. Cost). Bar chart (input vs output tokens by dept), pie chart (token share). Period selector (7/14/30/90 days). Department KPI insights with trend arrows. Only accessible if `role === "admin"`. |
| `frontend/src/app/globals.css` | Tailwind CSS directives + custom CSS variables. |
| `frontend/src/lib/api.ts` | **API client**. Generic `apiFetch<T>()` that injects Bearer token from localStorage. Exported methods: `login()`, `register()`, `sendMessage()`, `listConversations()`, `getConversation()`, `getUsage()`, `getDepartmentConfig()`, `getInsights()`. |
| `frontend/src/types/index.ts` | TypeScript interfaces + department config (colors, icons, labels) + quick action prompts per department. |
| `frontend/package.json` | Node dependencies: React 19, Next.js 15, Tailwind, recharts, react-markdown, remark-gfm. |
| `frontend/next.config.js` | Standalone output mode for Docker. |
| `frontend/tailwind.config.ts` | Tailwind config pointing to `./src/**`. |
| `frontend/Dockerfile` | Multi-stage build: deps → build → runner. Node 20 alpine. |

### Root Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | 4 services: PostgreSQL 16, Redis 7, FastAPI backend, Next.js frontend. Health checks on DB/Redis. |
| `README.md` | Quick start, tech stack, API endpoints, department tools table. |
| `DOCUMENTATION.md` | Full technical documentation (1000+ lines). |

---

## 5. Database Models & Relationships

```
┌──────────────────┐       ┌──────────────────────┐
│      users       │       │   department_budgets  │
├──────────────────┤       ├──────────────────────┤
│ id (PK, UUID)    │       │ id (PK, UUID)        │
│ email (UNIQUE)   │       │ department (UNIQUE)  │
│ hashed_password  │       │ monthly_token_limit  │
│ full_name        │       │ monthly_tool_call_limit│
│ department (enum)│       │ max_concurrent_users │
│ role (enum)      │       │ alert_threshold_pct  │
│ is_active        │       │ updated_at           │
│ created_at       │       └──────────────────────┘
│ updated_at       │
└────────┬─────────┘
         │ 1:N
         ▼
┌──────────────────────┐
│    conversations     │
├──────────────────────┤
│ id (PK, UUID)        │
│ user_id (FK→users)   │
│ department           │        ┌──────────────────────┐
│ title                │        │    usage_records     │
│ created_at           │        ├──────────────────────┤
│ updated_at           │        │ id (PK, UUID)        │
└────────┬─────────────┘        │ user_id (FK→users)   │
         │ 1:N (CASCADE)        │ department           │
         ▼                      │ input_tokens         │
┌──────────────────────┐        │ output_tokens        │
│      messages        │        │ tool_calls_count     │
├──────────────────────┤        │ model                │
│ id (PK, UUID)        │        │ created_at           │
│ conversation_id (FK) │        └──────────────────────┘
│ role (user/assistant)│
│ content (TEXT)       │
│ tool_calls (JSON)    │
│ token_count          │
│ created_at           │
└──────────────────────┘
```

### Key Relationships:
- **users → conversations**: One user has many conversations (1:N)
- **conversations → messages**: One conversation has many messages (1:N, CASCADE DELETE)
- **users → usage_records**: One user has many usage records (1:N)
- **department_budgets**: Standalone, 1 row per department (no FK)

### Department Enum Values:
`SALES`, `FINANCE`, `ACCOUNTING`, `RESTAURANT`, `LOGISTICS`

### Role Enum Values:
`USER`, `DEPT_ADMIN`, `ADMIN`

---

## 6. Authentication Flow (End-to-End)

### Registration:
```
User fills form → POST /api/v1/auth/register
    → Backend creates User record (bcrypt hash password)
    → Creates JWT token (payload: {sub: user_id, department, role, exp: now+60min})
    → Signs with HS256 using SECRET_KEY
    → Returns: {access_token, department, role, full_name}
    → Frontend stores in localStorage
    → Redirects to /chat
```

### Login:
```
User enters email+password → POST /api/v1/auth/login
    → Backend queries: SELECT * FROM users WHERE email = ? AND is_active = true
    → bcrypt.checkpw(password, stored_hash)
    → If valid: create JWT → return token
    → If invalid: return 401 "Invalid credentials"
```

### Every Authenticated Request:
```
Frontend sends: Authorization: Bearer <JWT_TOKEN>
    → auth_middleware extracts token
    → jwt.decode(token, SECRET_KEY, HS256)
    → If expired/invalid → 401 "Invalid or expired token"
    → Extract user_id from payload["sub"]
    → Load user from DB
    → If not found/inactive → 401
    → Return CurrentUser(id, department, role)
```

### Token Details:
- **Algorithm**: HS256
- **Expiry**: 60 minutes (configurable)
- **Payload**: `{sub: user_id, department: "logistics", role: "admin", exp: timestamp}`
- **No refresh tokens** — user must re-login after expiry

---

## 7. Chat & Agent Workflow (End-to-End)

This is the **most important flow** in the project:

```
Step 1: User types "Show me idle vehicles" in chat UI
            │
Step 2: Frontend sends POST /api/v1/chat
        Headers: { Authorization: Bearer <token> }
        Body: { message: "Show me idle vehicles", conversation_id: null }
            │
Step 3: Backend validates JWT → gets CurrentUser (dept: logistics)
            │
Step 4: Chat handler creates new conversation (or uses existing)
            │
Step 5: Loads message history from DB for this conversation
            │
Step 6: Calls AgentOrchestrator.process_query("logistics", message, history)
            │
Step 7: Orchestrator prepares Claude API call:
        {
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: LOGISTICS_SYSTEM_PROMPT,
          tools: [get_fleet_location, get_idle_vehicles, ...],
          messages: [...history, {role: "user", content: "Show me idle vehicles"}]
        }
            │
Step 8: Claude API responds with tool_use:
        {
          stop_reason: "tool_use",
          content: [{type: "tool_use", name: "get_idle_vehicles", input: {}}]
        }
            │
Step 9: Orchestrator executes the tool:
        → _execute_logistics_tool("get_idle_vehicles", {})
        → Calls FleetHunt API: GET https://app.fleethunt.ca/api/fleet?api_token=xxx
        → Filters: speed == 0 AND ignition == 1
        → Returns: {results: [{device_id, name, speed: 0, ignition: "on", ...}], total: 3}
            │
Step 10: Orchestrator feeds tool result back to Claude:
         messages.append({role: "assistant", content: [tool_use_block]})
         messages.append({role: "user", content: [{type: "tool_result", ...}]})
         → Calls Claude API again
            │
Step 11: Claude responds with final text (stop_reason: "end_turn"):
         "I found 3 idle vehicles: ... [formatted table]"
            │
Step 12: Chat handler saves:
         → INSERT user message into messages table
         → INSERT assistant message into messages table (with tool_calls JSON)
         → INSERT usage_record (input_tokens, output_tokens, tool_calls_count)
            │
Step 13: Returns to frontend:
         {
           conversation_id: "abc-123",
           message: "I found 3 idle vehicles:\n\n| Name | Location | ...",
           tool_calls: [{tool: "get_idle_vehicles", input: {}, output: {...}}]
         }
            │
Step 14: Frontend renders:
         → Markdown table with vehicle data
         → Expandable tool result card showing raw API data
```

### The Tool-Use Loop (Key Concept)

Claude doesn't execute tools itself. The flow is:

1. **Claude decides** which tool to call based on the user's question
2. **Our backend executes** the tool (calls FleetHunt API, queries DB, etc.)
3. **We send the result back** to Claude
4. **Claude interprets** the result and either calls another tool or gives a final answer
5. This loop continues until Claude says "I'm done" (`stop_reason: "end_turn"`)

This is the **agentic pattern** — the AI decides what data it needs, and our code fetches it.

---

## 8. All API Endpoints

### Auth (`/api/v1/auth`)
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/login` | None | `{email, password}` | `{access_token, department, role, full_name}` |
| POST | `/register` | None | `{email, password, full_name, department}` | `{access_token, department, role, full_name}` |

### Chat (`/api/v1/chat`)
| Method | Path | Auth | Body/Params | Response |
|---|---|---|---|---|
| POST | `/chat` | Bearer | `{message, conversation_id?}` | `{conversation_id, message, tool_calls?}` |
| GET | `/chat/stream` | Bearer | query: `message, conversation_id?` | SSE stream |

### Conversations (`/api/v1/conversations`)
| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/conversations` | Bearer | `[{id, title, department, created_at}]` (max 50) |
| GET | `/conversations/{id}` | Bearer | `{id, title, messages: [...], created_at}` |

### Admin (`/api/v1/admin`) — Requires Admin Role
| Method | Path | Params/Body | Response |
|---|---|---|---|
| GET | `/admin/usage` | `?days=30` | `{usage: [{department, total_input_tokens, ...}]}` |
| GET | `/admin/config/{dept}` | — | `{department, monthly_token_limit, usage_pct}` |
| PUT | `/admin/config/{dept}` | `{monthly_token_limit?, ...}` | Updated config |
| GET | `/admin/insights` | — | `{departments: [{department, kpis: [...]}]}` |

### Health
| Method | Path | Response |
|---|---|---|
| GET | `/health` | `{status: "healthy"}` |

---

## 9. Department Agents & Tools

Each department has: (1) a system prompt, (2) a set of tools, (3) tool handlers.

### Sales Agent
- **Prompt**: CRM expert, pipeline analysis, email communication
- **Tools**: `query_crm`, `search_email_logs`, `get_market_data`
- **Data**: Mock/simulated

### Finance Agent
- **Prompt**: ERP expert, cash flow, compliance
- **Tools**: `query_erp`, `get_cash_flow_forecast`, `check_compliance`
- **Data**: Mock/simulated

### Accounting Agent
- **Prompt**: AP/AR expert, reconciliation, tax
- **Tools**: `query_invoices`, `reconcile_accounts`, `calculate_tax`
- **Data**: Mock/simulated

### Restaurant Agent
- **Prompt**: Menu expert for The Masala Twist restaurant
- **Tools**: `query_menu`, `get_orders`, `get_order_stats`
- **Data**: **Real menu** (100+ items with prices) + real order data from POS

### Logistics Agent
- **Prompt**: Fleet management expert powered by FleetHunt
- **Tools**: 10 tools (see next section)
- **Data**: **Real** — live GPS data from FleetHunt API

---

## 10. FleetHunt MCP Integration (Logistics)

### What Is It?
The Logistics department connects to the **FleetHunt GPS tracking API** — a real, production GPS fleet management system. Unlike other departments that use mock data, this one returns **live vehicle data**.

### How It Works
```
User asks about fleet
    → Claude picks the right tool
    → Our backend calls: GET https://app.fleethunt.ca/api/fleet?api_token=xxx
    → FleetHunt returns real GPS data for all vehicles
    → We filter/process the data (e.g., find idle ones)
    → Claude interprets and presents the result
```

### All 10 Logistics Tools

| Tool | What It Does | How It Works |
|---|---|---|
| `get_fleet_location` | All vehicle positions | Fetch all active devices, return summaries |
| `get_vehicle_by_name` | Search by name keyword | Partial match on device name |
| `get_vehicle_by_id` | Get specific vehicle | Direct device_id lookup |
| `get_moving_vehicles` | Vehicles in motion | Filter: `speed > 0` |
| `get_idle_vehicles` | Engine on, not moving | Filter: `speed == 0 AND ignition == 1` |
| `get_stopped_vehicles` | Engine off, parked | Filter: `speed == 0 AND ignition == 0` |
| `get_fleet_summary` | Count by status | Aggregate: total, moving, idle, stopped |
| `get_vehicles_near_location` | Proximity search | Haversine distance formula from lat/lng |
| `get_speeding_vehicles` | Over speed threshold | Filter: `speed > threshold` (default 100 km/h) |
| `get_live_tracking` | Real-time tracking | Full device data: GPS, speed, heading, ignition |

### Vehicle Status Logic
```
If speed > 0          → "moving"
If speed == 0 AND ignition ON  → "idle" (wasting fuel!)
If speed == 0 AND ignition OFF → "stopped"
```

### Active Device Filtering
Devices that haven't reported data in 7+ days are excluded (decommissioned/offline).

### FleetHunt API Details
- **URL**: `https://app.fleethunt.ca/api/fleet`
- **Auth**: Query param `?api_token=<key>`
- **Response**: `{status: 1, devices: [{id, name, speed, latitude, longitude, ignition, angle, odometer, device_time}]}`

---

## 11. Frontend Pages & UI Flow

### Page Flow
```
http://localhost:3000/
    │
    ├─ Check localStorage for token
    │  ├─ Has token → /chat
    │  └─ No token → /login
    │
    ├─ /login
    │  ├─ Sign In tab: email + password
    │  ├─ Register tab: name + email + password + department selector
    │  └─ On success → store token → /chat
    │
    ├─ /chat (main interface)
    │  ├─ Sidebar: user profile, new chat, search, conversation history, sign out
    │  ├─ Welcome screen: department greeting + 4 quick action cards
    │  ├─ Chat area: messages with markdown + tool result cards
    │  └─ Input bar: type message + send
    │
    └─ /admin (admin only)
       ├─ Summary cards: tokens, requests, tool calls, cost
       ├─ Charts: bar (tokens by dept), pie (token share)
       └─ Department KPI insights with trends
```

### How Frontend Talks to Backend
All API calls go through `api.ts` → `apiFetch()` which:
1. Gets token from `localStorage`
2. Adds `Authorization: Bearer <token>` header
3. Sends request to `http://localhost:8000`
4. If 401 error → token expired → user needs to re-login

---

## 12. Middleware (Auth + Rate Limiting)

### Request Processing Order
```
Request → CORS Middleware → Rate Limiter → Auth Middleware → Route Handler
```

### CORS Middleware
- Allows origins from `CORS_ORIGINS` env var (default: `http://localhost:3000`)
- Allows all methods and headers
- Enables credentials

### Rate Limiter
- **Algorithm**: In-memory sliding window (1-minute window)
- **Default limit**: 30 requests/minute per IP
- **Admin limit**: 100 requests/minute per IP (for `/admin` paths)
- **Response when exceeded**: HTTP 429 Too Many Requests
- **Note**: In-memory only — resets on server restart. For production, use Redis.

### Auth Middleware
- Extracts `Bearer` token from `Authorization` header
- Decodes JWT using `SECRET_KEY` + `HS256`
- Loads user from database
- Returns `CurrentUser(id, department, role)` to route handlers

---

## 13. Environment Variables

| Variable | Purpose | Example |
|---|---|---|
| `APP_NAME` | App identifier | `multi-dept-ai-portal` |
| `APP_ENV` | Environment (controls SQL echo) | `development` |
| `SECRET_KEY` | JWT signing key (32+ chars in prod) | `dev-secret-key-...` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000` |
| `DATABASE_URL` | Database connection string | `sqlite+aiosqlite:///./ai_portal.db` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379/0` |
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-api03-...` |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token TTL | `60` |
| `RATE_LIMIT_DEFAULT` | Requests/min general | `30` |
| `RATE_LIMIT_ADMIN` | Requests/min admin | `100` |
| `DEFAULT_ADMIN_EMAIL` | Seed admin email | `admin@gmail.com` |
| `DEFAULT_ADMIN_PASSWORD` | Seed admin password | `admin` |
| `FLEETHUNT_BASE_URL` | FleetHunt API URL | `https://app.fleethunt.ca/api` |
| `FLEETHUNT_API_KEY` | FleetHunt API token | `0cf62cbf-...` |
| `FCM_BACKEND_URL` | Restaurant backend URL | `http://...elb.amazonaws.com` |
| `FCM_BACKEND_SECRET` | Restaurant backend secret | `...` |
| `NEXT_PUBLIC_API_URL` (frontend) | Backend URL for browser | `http://localhost:8000` |

---

## 14. Docker Setup

`docker-compose.yml` defines 4 services:

| Service | Image | Port | Purpose |
|---|---|---|---|
| `db` | PostgreSQL 16 | 5432 | Production database |
| `redis` | Redis 7 Alpine | 6379 | Cache/session store |
| `backend` | Custom (Dockerfile) | 8000 | FastAPI backend |
| `frontend` | Custom (Dockerfile) | 3000 | Next.js frontend |

```bash
# Start everything with Docker
docker-compose up --build
```

---

## 15. How to Run

### Local Development (without Docker)

**Terminal 1 — Backend:**
```powershell
cd c:\Users\kanwa\multi-dept-ai-portal\backend
python -m uvicorn app.main:app --reload --port 8000 --app-dir .
```

**Terminal 2 — Frontend:**
```powershell
cd c:\Users\kanwa\multi-dept-ai-portal\frontend
npm run dev
```

**Open**: http://localhost:3000

### Login Credentials
| Email | Password | Department | Role |
|---|---|---|---|
| `admin1@gmail.com` | `admin` | Logistics | Admin |
| `admin@gmail.com` | `admin` | Restaurant | Admin |
| `themasalatwist@gmail.com` | `oxnard` | Restaurant | User |

---

## 16. Common Interview / Tech Lead Questions

### Q: What architecture pattern does this use?
**A**: Agentic AI pattern with a tool-use loop. The AI (Claude) decides what data it needs, our backend executes the tool (API call/DB query), feeds the result back, and the AI interprets it. This loops until the AI has enough data to answer.

### Q: Why Anthropic SDK directly instead of LangChain?
**A**: Direct SDK gives us full control over the tool-use loop, lower latency, less abstraction overhead, and simpler debugging. LangChain adds unnecessary complexity for our use case.

### Q: How does department isolation work?
**A**: Each user has a `department` field. The JWT token contains the department. When chatting, the backend loads only that department's system prompt and tools. The AI agent can only call tools for its department. Conversation history is scoped to (user_id, department).

### Q: What's the difference between mock and real tools?
**A**: Sales, Finance, Accounting tools return hardcoded simulated data. Logistics tools call the real FleetHunt GPS API with live vehicle data. Restaurant tools use real menu data and real orders from the POS system.

### Q: How does the FleetHunt integration work?
**A**: We call `GET /fleet?api_token=xxx` on FleetHunt's API using `httpx` (async HTTP client). It returns all GPS devices. We then filter/process based on what tool was called (e.g., idle vehicles = speed 0 + ignition on). The Haversine formula calculates distance for proximity search.

### Q: How is authentication implemented?
**A**: BCrypt for password hashing, JWT (HS256) for session tokens. Token contains user_id, department, and role. 60-minute expiry. No refresh tokens — user re-logins after expiry.

### Q: What database do you use?
**A**: SQLite for development (file-based, zero setup), PostgreSQL 16 for production (via Docker Compose). SQLAlchemy async ORM abstracts the difference.

### Q: How does rate limiting work?
**A**: In-memory sliding window — tracks request timestamps per IP in a dictionary. Cleans up old entries (> 60 seconds). 30 req/min default, 100 for admin. Returns 429 if exceeded. Would use Redis in production for persistence across restarts.

### Q: What happens if the FleetHunt API is down?
**A**: The `httpx` call will timeout (30 second limit) or raise an `HTTPError`. The `_execute_logistics_tool` function catches this and returns `{"error": "FleetHunt API error: <details>"}`. Claude then tells the user the API is unavailable.

### Q: How does streaming work?
**A**: The `/chat/stream` endpoint uses Server-Sent Events (SSE). Instead of waiting for Claude's full response, we use `client.messages.stream()` which yields text chunks as they're generated. Each chunk is sent to the browser as an SSE event. The frontend uses `EventSource` to receive them in real-time.

### Q: How would you scale this for production?
**A**: (1) Replace SQLite with PostgreSQL, (2) Use Redis for rate limiting and session caching, (3) Add connection pooling for database, (4) Deploy with Docker Compose or Kubernetes, (5) Add MCP servers per department to replace mock tools with real API integrations, (6) Add token refresh mechanism, (7) Add WebSocket support for real-time features.

### Q: What is MCP?
**A**: Model Context Protocol — a standard for connecting AI models to real data sources. In our project, the Logistics agent is the MCP implementation — it connects Claude to the FleetHunt GPS API. The architecture supports adding MCP servers for other departments (Salesforce for Sales, SAP for Finance, etc.) where each MCP server wraps a real API.

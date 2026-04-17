# Multi-Department AI Agent Portal — Complete Project Guide

> **VRTek Consulting** | Version 1.0.0 | Built with Claude (Anthropic), Next.js 15, FastAPI

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Full Directory Structure](#3-full-directory-structure)
4. [Architecture & Data Flow](#4-architecture--data-flow)
5. [Every File — Purpose & Summary](#5-every-file--purpose--summary)
   - [Backend Files](#51-backend-files)
   - [Frontend Files](#52-frontend-files)
   - [Config & Infrastructure Files](#53-config--infrastructure-files)
6. [Database Schema](#6-database-schema)
7. [All API Routes](#7-all-api-routes)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Department Agents](#9-department-agents)
10. [All Integrations](#10-all-integrations)
11. [Frontend Pages & Components](#11-frontend-pages--components)
12. [Streaming Chat (SSE)](#12-streaming-chat-sse)
13. [Dashboard Rendering Logic](#13-dashboard-rendering-logic)
14. [OAuth Flows](#14-oauth-flows)
15. [Security Measures](#15-security-measures)
16. [Environment Variables](#16-environment-variables)
17. [Default Users (Seeded)](#17-default-users-seeded)
18. [Running the Project](#18-running-the-project)
19. [Styling & Branding](#19-styling--branding)
20. [Key Patterns & Concepts](#20-key-patterns--concepts)

---

## 1. Project Overview

The **Multi-Department AI Agent Portal** is an enterprise-grade, single-portal platform that gives 5 different business departments their own specialized AI assistant powered by Anthropic's Claude. Each department has:

- A **domain-specific AI agent** with custom system prompt and tools
- **Role-based access control** (user, dept_admin, admin)
- **Live integrations** with real APIs (FleetHunt GPS, Samsara fleet, Gmail, Outlook, Slack, QuickBooks)
- A **real-time streaming chat UI** with embedded dashboards (KPIs, charts, tables)
- An **admin panel** for usage monitoring and budget management

**The 5 Departments:**

| Department | Focus | Real APIs |
|---|---|---|
| Logistics | Fleet tracking, driver safety, HOS, fuel | FleetHunt, Samsara |
| Restaurant | Menu, orders, dietary guidance | FCM Backend |
| Finance | Cash flow, ERP, compliance | Mock (pluggable) |
| Accounting | AP/AR, reconciliation, tax | Mock (pluggable) |
| Sales | CRM, pipeline, market data | Mock (pluggable) |

---

## 2. Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.12 | Primary backend language |
| FastAPI | >=0.115.6 | Web framework — async REST + SSE |
| SQLAlchemy | >=2.0.36 | ORM with full async support |
| aiosqlite | >=0.20.0 | Async SQLite driver |
| Anthropic SDK | >=0.88.0 | Claude LLM client (tool-use, streaming) |
| python-jose | >=3.3.0 | JWT token creation and validation |
| bcrypt | >=4.0.1 | Password hashing |
| httpx | >=0.28.1 | Async HTTP client (external API calls) |
| cryptography | >=44.0.0 | Fernet encryption for OAuth tokens |
| sse-starlette | >=2.2.1 | Server-Sent Events streaming |
| pydantic-settings | >=2.7.0 | Config/env management |
| uvicorn | >=0.34.0 | ASGI server |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15.1.0 | React framework (App Router) |
| React | 19.0.0 | UI library |
| TypeScript | 5.7.0 | Type-safe JavaScript |
| Tailwind CSS | 3.4.16 | Utility-first CSS framework |
| Recharts | 3.8.1 | Charts (Bar, Pie, Line, Area) |
| react-markdown | 10.1.0 | Markdown rendering in chat |
| remark-gfm | 4.0.1 | GitHub-flavored markdown tables/strikethrough |
| lucide-react | 0.468.0 | Icon library |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Container orchestration |
| SQLite | Default database (swappable to PostgreSQL) |
| JWT (HS256) | Stateless authentication |

---

## 3. Full Directory Structure

```
multi-dept-ai-portal-new/
│
├── backend/                                 Python FastAPI application
│   ├── app/
│   │   ├── main.py                          App entry point, CORS, route registration
│   │   ├── config.py                        All environment variables via Pydantic Settings
│   │   │
│   │   ├── agents/
│   │   │   ├── orchestrator.py              Claude agentic loop + tool execution engine
│   │   │   └── registry.py                  Department → tools/prompt/executor mapping
│   │   │
│   │   ├── api/                             HTTP route handlers
│   │   │   ├── auth.py                      Login, register, logout
│   │   │   ├── chat.py                      Chat (standard + SSE streaming)
│   │   │   ├── conversations.py             Conversation history
│   │   │   ├── admin.py                     Usage stats, budgets, insights
│   │   │   ├── email.py                     Gmail/Outlook OAuth management
│   │   │   ├── slack.py                     Slack workspace OAuth management
│   │   │   └── quickbooks.py                QuickBooks Online OAuth management
│   │   │
│   │   ├── db/
│   │   │   └── database.py                  SQLAlchemy engine, sessions, init_db, seed users
│   │   │
│   │   ├── middleware/
│   │   │   └── auth_middleware.py           JWT validation dependency functions
│   │   │
│   │   ├── models/                          SQLAlchemy ORM models
│   │   │   ├── user.py                      User table
│   │   │   ├── conversation.py              Conversation + Message tables
│   │   │   ├── usage.py                     UsageRecord + DepartmentBudget tables
│   │   │   ├── email_config.py              DepartmentEmailConfig table
│   │   │   ├── slack_config.py              DepartmentSlackConfig table
│   │   │   └── quickbooks_config.py         DepartmentQuickBooksConfig table
│   │   │
│   │   ├── services/                        Business logic layer
│   │   │   ├── auth_service.py              Password hashing, JWT, user queries
│   │   │   ├── email_service.py             Gmail/Outlook OAuth + email operations
│   │   │   ├── slack_service.py             Slack OAuth + workspace/message operations
│   │   │   ├── quickbooks_service.py        QuickBooks OAuth + QBO API operations
│   │   │   └── usage_service.py             Token and tool call usage recording
│   │   │
│   │   └── departments/                     Per-department agent definitions
│   │       ├── common/                      Tools shared by ALL departments
│   │       │   ├── email_tools.py           6 email tools (search, read, send, reply, draft)
│   │       │   ├── slack_tools.py           7 Slack tools (list, read, send, reply, search)
│   │       │   └── quickbooks_tools.py      20+ QuickBooks tools (customers, invoices, etc.)
│   │       ├── sales/
│   │       │   ├── prompts.py               Sales agent system prompt
│   │       │   └── tools.py                 3 sales tools (CRM, email logs, market data)
│   │       ├── finance/
│   │       │   ├── prompts.py               Finance agent system prompt
│   │       │   └── tools.py                 3 finance tools (ERP, cash flow, compliance)
│   │       ├── accounting/
│   │       │   ├── prompts.py               Accounting agent system prompt
│   │       │   └── tools.py                 3 accounting tools (invoices, reconcile, tax)
│   │       ├── restaurant/
│   │       │   ├── prompts.py               Restaurant agent system prompt
│   │       │   ├── tools.py                 3 restaurant tools (menu, orders, order stats)
│   │       │   └── data.py                  Static menu data: 100+ items, 10 categories
│   │       └── logistics/
│   │           ├── prompts.py               Logistics agent system prompt
│   │           ├── tools.py                 10 FleetHunt GPS tracking tools
│   │           └── samsara_tools.py         15+ Samsara fleet management tools
│   │
│   ├── requirements.txt                     Python dependencies
│   ├── Dockerfile                           Backend Docker image
│   ├── .env.example                         Template for all environment variables
│   └── .env                                 Actual secrets (NOT committed to git)
│
├── frontend/                                Next.js 15 application
│   └── src/
│       ├── app/                             App Router pages
│       │   ├── page.tsx                     Landing page (/)
│       │   ├── layout.tsx                   Root layout + metadata
│       │   ├── login/page.tsx               Login & register page (/login)
│       │   ├── chat/page.tsx                Main chat page (/chat)
│       │   ├── admin/page.tsx               Admin dashboard (/admin)
│       │   └── services/
│       │       ├── page.tsx                 Service catalog (/services)
│       │       └── [id]/page.tsx            Service detail (/services/[id])
│       │
│       ├── components/chat/                 Reusable chat UI components
│       │   ├── DashboardMessage.tsx         Renders tool outputs as KPIs/charts/tables
│       │   ├── DashboardTable.tsx           Responsive data table component
│       │   ├── DonutChart.tsx               Recharts pie/donut chart wrapper
│       │   └── MessageActions.tsx           Copy/share message actions
│       │
│       ├── departments/                     Frontend dept config & data helpers
│       │   ├── config.ts                    Labels, colors, icons per department
│       │   ├── types.ts                     QuickPrompt, PromptSection interfaces
│       │   ├── dashboard.ts                 extractDashboardData() — parses tool outputs
│       │   ├── integrations.ts              OAuth status helpers
│       │   └── integrations.tsx             OAuth popup flow (email/slack/QB)
│       │
│       ├── lib/
│       │   └── api.ts                       API client — Bearer token, SSE, all endpoints
│       │
│       ├── types/
│       │   ├── index.ts                     All TypeScript interfaces
│       │   └── speech-recognition.d.ts      Web Speech API types
│       │
│       └── globals.css                      Tailwind imports + custom animations
│
├── docker-compose.yml                       Orchestrates backend + frontend containers
├── README.md                                This file — complete project guide
└── .gitignore                               Ignores .env, node_modules, __pycache__, etc.
```

---

## 4. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (User)                           │
│  ┌────────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ Landing /  │  │ Login    │  │ Chat     │  │ Admin       │  │
│  │ Services   │  │ Register │  │ /chat    │  │ Dashboard   │  │
│  └────────────┘  └──────────┘  └──────────┘  └─────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP + SSE (EventStream)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│               NEXT.JS FRONTEND  :3000                           │
│  - /api/* requests rewritten to backend :8000                   │
│  - JWT stored in localStorage                                   │
│  - SSE stream for real-time chat tokens                         │
│  - OAuth popups (Gmail, Slack, QB)                              │
└───────────────────────────────┬─────────────────────────────────┘
                                │ /api/v1/* requests
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│               FASTAPI BACKEND  :8000                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Auth Middleware (JWT validation on every request)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ /auth    │ │ /chat      │ │ /admin   │ │ /email /slack  │  │
│  │ login    │ │ POST       │ │ usage    │ │ /quickbooks    │  │
│  │ register │ │ POST/stream│ │ config   │ │ OAuth connect  │  │
│  └──────────┘ └─────┬──────┘ └──────────┘ └────────────────┘  │
│                     │                                           │
│              ┌──────▼────────────────────────────────────┐     │
│              │         AGENT ORCHESTRATOR                 │     │
│              │  1. Load dept system prompt                │     │
│              │  2. Load dept tools + common tools         │     │
│              │  3. Call Claude with message history       │     │
│              │  4. If tool_use → execute tool → loop back │     │
│              │  5. If text response → stream to frontend  │     │
│              └──────────────────┬────────────────────────┘     │
│                                 │                               │
│         ┌───────────────────────┼───────────────────┐          │
│         ▼                       ▼                    ▼          │
│  ┌─────────────┐       ┌──────────────┐    ┌──────────────┐    │
│  │ DEPARTMENT  │       │   COMMON     │    │  CLAUDE API  │    │
│  │   TOOLS     │       │   TOOLS      │    │  (Anthropic) │    │
│  │             │       │              │    │              │    │
│  │ Sales: CRM  │       │ Email Tools  │    │ claude-haiku │    │
│  │ Finance:ERP │       │ Slack Tools  │    │ -4-5-...     │    │
│  │ Accounting  │       │ QB Tools     │    └──────────────┘    │
│  │ Restaurant  │       └──────────────┘                        │
│  │ Logistics:  │         External APIs:                         │
│  │  FleetHunt  │         Gmail, Outlook,                        │
│  │  Samsara    │         Slack, QuickBooks                      │
│  └─────────────┘                                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  SQLite DATABASE                         │  │
│  │  Users | Conversations | Messages | UsageRecords         │  │
│  │  DepartmentBudgets | EmailConfig | SlackConfig | QBConfig │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │            │               │              │
         ▼            ▼               ▼              ▼
   FleetHunt API  Samsara API    FCM Backend    External APIs
   (GPS tracking) (Fleet mgmt)  (Restaurant)  (Gmail/Slack/QB)
```

### Step-by-Step Chat Flow

```
1. User types message in /chat page
2. Frontend calls POST /api/v1/chat/stream with { message, conversation_id? }
3. Backend validates JWT → gets user + department
4. Backend loads conversation history from DB (last N messages)
5. Agent Orchestrator:
   a. Builds tool list for this department (dept tools + email/slack/QB if connected)
   b. Calls Claude API with system_prompt + message history + tools
   c. Claude decides to use a tool → returns tool_use block
   d. Orchestrator executes the tool function (may hit external API)
   e. Tool result appended to messages → loops back to Claude
   f. Claude produces final text response
6. Streaming: each text chunk sent as SSE event → frontend renders word by word
7. Tool status events sent during execution ("Checking fleet status...")
8. On completion: full message + tool_calls saved to DB, usage recorded
9. Frontend extracts tool_calls → renders KPI cards, charts, tables
```

---

## 5. Every File — Purpose & Summary

### 5.1 Backend Files

#### `backend/app/main.py`
The entry point of the FastAPI application.
- Creates the FastAPI app instance with title, version, and description
- Registers all API routers with `/api/v1` prefix
- Configures CORS (Cross-Origin Resource Sharing) — allows the frontend at localhost:3000 to talk to the backend
- `lifespan` hook: runs `init_db()` on startup to create tables and seed users

#### `backend/app/config.py`
Central configuration management using Pydantic Settings.
- Reads all environment variables from `.env` file
- Provides typed access to config throughout the app (e.g., `settings.ANTHROPIC_API_KEY`)
- All variables have defaults where safe (e.g., port 8000, SQLite URL)
- Contains: app settings, DB URL, JWT settings, CORS origins, all API keys, OAuth credentials

#### `backend/app/agents/orchestrator.py`
The brain of the AI agent system — manages the Claude tool-use loop.
- `run_agent(user_message, conversation_id, department, db_session)` — main entry
- Loads message history from DB, builds tool list from registry
- Calls Claude with `anthropic.messages.create()` using `tools` parameter
- If Claude returns `tool_use` → executes the tool → appends result → calls Claude again
- Loops until Claude returns a pure text response
- `run_agent_stream()` — same but yields SSE events (text chunks, tool status)
- Handles retries with exponential backoff on API errors
- Records token usage after each turn

#### `backend/app/agents/registry.py`
Single source of truth mapping each department to its tools and agent configuration.
- `DEPARTMENT_REGISTRY` dict: maps department name → tools, system prompt, executor
- On app startup, registers tools for each department
- Dynamically injects common tools (email, slack, QB) if those integrations are active for the dept
- `get_tools_for_department(dept, db)` — returns the correct tool set for a given department
- Makes it easy to add new departments by just adding to the registry

#### `backend/app/api/auth.py`
Handles user authentication.
- `POST /login` — Takes email + password, verifies with bcrypt, returns JWT token
- `POST /register` — Takes email + password + department, creates user, returns JWT
- `POST /logout` — Token revocation (placeholder; JWT is stateless so expiration handles this)
- Returns: `{ access_token, token_type, user: { id, email, department, role } }`

#### `backend/app/api/chat.py`
Core chat endpoint — connects user messages to the AI agent.
- `POST /` — Standard (non-streaming) chat: runs agent, returns full response
- `POST /stream` — Streaming chat: runs agent with SSE, streams text chunks in real-time
  - SSE Events: `conv_id` (new conversation ID), `message` (text chunk), `tool_status` ("Analyzing fleet data..."), `done` (completion with full tool_calls), `error`
- Saves messages to DB after completion
- Records token usage via `usage_service`
- Checks budget limits before running

#### `backend/app/api/conversations.py`
Retrieves conversation history.
- `GET /` — Lists all conversations for current user + department (max 50, sorted by updated_at)
- `GET /{conversation_id}` — Returns a conversation with all its messages (including tool_calls JSON)
- Used by the frontend sidebar to show chat history

#### `backend/app/api/admin.py`
Admin-only dashboard data.
- `GET /usage` — Aggregated token usage per department for a time period
- `GET /config/{dept}` — Get current budget configuration for a department
- `PUT /config/{dept}` — Update monthly token limit, tool call limit, alert threshold
- `GET /insights` — KPI trends (usage over time, most active departments)
- All routes require `admin` role (enforced by `require_admin` dependency)

#### `backend/app/api/email.py`
Manages Gmail/Outlook OAuth connections per department.
- `GET /status` — Lists all departments with their email connection status
- `GET /status/{dept}` — Connection status for one department
- `GET /connect/{dept}/{provider}` — Returns OAuth URL to redirect user to Gmail/Outlook consent page
- `GET /callback` — OAuth callback URL that receives the auth code, exchanges for tokens, saves encrypted
- `DELETE /disconnect/{dept}` — Removes email config for a department

#### `backend/app/api/slack.py`
Manages Slack workspace OAuth connections per department.
- Same pattern as email.py but for Slack
- `GET /connect/{dept}` — Returns Slack OAuth URL
- `GET /callback` — Exchanges code for bot token, saves encrypted workspace config

#### `backend/app/api/quickbooks.py`
Manages QuickBooks Online OAuth connections per department.
- Same OAuth pattern but with `realm_id` (QuickBooks company ID)
- Supports sandbox and production environments
- `GET /callback` — Saves QB access + refresh tokens with realm_id

#### `backend/app/db/database.py`
Database setup and initialization.
- Creates SQLAlchemy async engine pointing to SQLite (or PostgreSQL)
- `AsyncSessionLocal` — async session factory used throughout the app
- `get_db()` — FastAPI dependency that yields a DB session per request
- `init_db()` — Creates all tables on startup (`CREATE TABLE IF NOT EXISTS`)
- `seed_users()` — Creates default admin/test users if they don't exist

#### `backend/app/middleware/auth_middleware.py`
JWT authentication as FastAPI dependencies.
- `get_current_user(token)` — Decodes JWT, fetches user from DB, returns `CurrentUser` dataclass
- `require_admin(user)` — Raises 403 if user role is not `admin`
- `require_dept_admin(user)` — Raises 403 if user is not `dept_admin` or `admin`
- Used as `Depends()` in all protected route handlers

#### `backend/app/models/user.py`
SQLAlchemy ORM model for users.
- Columns: `id` (UUID), `email` (unique), `hashed_password`, `full_name`, `department` (enum), `role` (enum), `is_active`, `created_at`, `updated_at`
- `Department` enum: `sales`, `finance`, `accounting`, `restaurant`, `logistics`
- `Role` enum: `user`, `dept_admin`, `admin`

#### `backend/app/models/conversation.py`
ORM models for chat conversations and messages.
- `Conversation`: id, user_id (FK to User), department, title, created_at, updated_at
- `Message`: id, conversation_id (FK to Conversation, cascade delete), role (user/assistant), content (text), tool_calls (JSON), token_count, created_at
- Index on (user_id, department) for fast lookups

#### `backend/app/models/usage.py`
ORM models for tracking token and tool usage.
- `UsageRecord`: id, user_id (FK), department, input_tokens, output_tokens, tool_calls_count, model, created_at
- `DepartmentBudget`: id, department (unique), monthly_token_limit (2M default), monthly_tool_call_limit (5K default), alert_threshold_pct (75% default)

#### `backend/app/models/email_config.py`
ORM model for per-department email OAuth config.
- Stores Gmail or Outlook tokens encrypted using Fernet symmetric encryption
- `encrypt_token(token)` / `decrypt_token(token)` — class methods using key derived from SECRET_KEY
- Columns: department (unique), provider, email_address, access_token (encrypted), refresh_token (encrypted), token_expiry, scopes, is_active

#### `backend/app/models/slack_config.py`
ORM model for per-department Slack workspace config.
- Stores: team_id, team_name, bot_token (encrypted), bot_user_id, default_channel_id, is_active

#### `backend/app/models/quickbooks_config.py`
ORM model for per-department QuickBooks Online config.
- Stores: realm_id (QB company ID), company_name, access_token (encrypted), refresh_token (encrypted), token_expiry, is_active

#### `backend/app/services/auth_service.py`
Business logic for authentication.
- `hash_password(password)` → bcrypt hash
- `verify_password(plain, hashed)` → boolean
- `create_access_token(user)` → signed JWT string
- `decode_token(token)` → payload dict
- `authenticate_user(email, password, db)` → User or None
- `get_user_by_id(user_id, db)` → User or None

#### `backend/app/services/email_service.py`
All Gmail and Outlook OAuth + email operations.
- OAuth flow: build auth URL → exchange code → refresh tokens
- Gmail operations: `search_emails()`, `get_email()`, `send_email()`, `reply_email()`, `create_draft()`
- Outlook operations: same interface but different Microsoft Graph API calls
- Auto-refreshes access tokens when expired
- Returns structured data (subject, from, to, body, date, thread_id)

#### `backend/app/services/slack_service.py`
Slack OAuth + workspace operations.
- OAuth: exchange code → get bot token → save workspace config
- Operations: `list_channels()`, `read_channel_messages()`, `send_message()`, `reply_to_thread()`, `search_messages()`
- Uses Slack Web API with bot token
- Returns structured message data (user, text, timestamp, thread_ts)

#### `backend/app/services/quickbooks_service.py`
QuickBooks Online OAuth + accounting API operations.
- OAuth: exchange code + realm_id → get tokens → save config
- Operations: customers, invoices, payments, vendors, bills, items, financial reports
- Handles token refresh (QB tokens expire frequently)
- QBO API: `https://quickbooks.api.intuit.com/v3/company/{realmId}/query`

#### `backend/app/services/usage_service.py`
Records token and tool call usage for budgeting.
- `record_usage(user_id, dept, input_tokens, output_tokens, tool_calls, model, db)` → creates UsageRecord
- `check_budget(dept, db)` → checks if department is within monthly token limit
- Used by chat.py after each agent run

#### `backend/app/departments/common/email_tools.py`
6 email tool definitions that Claude can call.
- Tools: `search_emails`, `get_email`, `send_email`, `reply_to_email`, `forward_email`, `create_draft`
- Each tool is a dict with `name`, `description`, `input_schema` (JSON Schema for Claude)
- Executor functions call `email_service` methods, handle errors, return structured results
- Available to ALL departments if email is connected

#### `backend/app/departments/common/slack_tools.py`
7 Slack tool definitions for Claude.
- Tools: `list_slack_channels`, `read_slack_channel`, `send_slack_message`, `reply_to_slack_thread`, `search_slack_messages`, `get_slack_user_info`, `get_channel_info`
- Available to ALL departments if Slack is connected

#### `backend/app/departments/common/quickbooks_tools.py`
20+ QuickBooks tool definitions for Claude.
- Tools cover: customers, invoices, payments, vendors, bills, purchase orders, items (products/services), journal entries, financial reports (P&L, Balance Sheet, Cash Flow, A/R Aging, A/P Aging)
- Available to ALL departments if QB is connected

#### `backend/app/departments/sales/prompts.py`
System prompt for the Sales AI agent.
- Tells Claude: "You are an AI sales assistant for VRTek Consulting..."
- Defines personality: data-driven, pipeline-focused
- Lists available tools and when to use them
- Instructions for formatting responses (use tables, percentages, clear recommendations)

#### `backend/app/departments/sales/tools.py`
3 mock sales tools.
- `query_crm(query_type, filters)` — Simulates CRM queries (leads, deals, contacts, pipeline)
- `search_email_logs(search_term, date_range)` — Simulates email log search
- `get_market_data(industry, metrics)` — Simulates market research data
- Returns realistic-looking mock data for demonstration

#### `backend/app/departments/finance/prompts.py`
System prompt for the Finance AI agent.
- Finance expert: cash flow, ERP, GL accounts, budgeting, compliance
- Guides Claude to think in financial terms and use proper accounting terminology

#### `backend/app/departments/finance/tools.py`
3 mock finance tools.
- `query_erp(query_type, parameters)` — GL accounts, journal entries, budgets, trial balance
- `get_cash_flow_forecast(period, scenario)` — Operating/investing/financing cash flows
- `check_compliance(regulation_type, period)` — SOX, GAAP, tax compliance checks

#### `backend/app/departments/accounting/prompts.py`
System prompt for the Accounting AI agent.
- AP/AR specialist, reconciliation expert, tax calculation
- Focuses on precise numbers and audit trails

#### `backend/app/departments/accounting/tools.py`
3 mock accounting tools.
- `query_invoices(status, vendor_customer, date_range)` — AP/AR invoice queries
- `reconcile_accounts(account_id, period)` — Bank/account reconciliation
- `calculate_tax(transaction_type, amount, jurisdiction)` — Tax calculations

#### `backend/app/departments/restaurant/prompts.py`
System prompt for the Restaurant AI agent.
- Menu expert, order assistant, dietary guidance specialist
- Knows the Masala Twist menu completely
- Can help with reservations, specials, allergen info

#### `backend/app/departments/restaurant/tools.py`
3 restaurant tools.
- `query_menu(query_type, filters)` — Searches local menu data (by category, dietary tag, price)
- `get_orders(period, status)` — Calls FCM Backend API for real order data
- `get_order_stats(period)` — Aggregated order statistics (total, revenue, by category)

#### `backend/app/departments/restaurant/data.py`
Static menu database.
- 100+ menu items across 10 categories (Appetizers, Mains, Biryani, Breads, Desserts, etc.)
- Each item: name, description, price, dietary tags (vegan, gluten-free, spicy), ingredients
- Used by `query_menu` tool — no database needed for menu data

#### `backend/app/departments/logistics/prompts.py`
System prompt for the Logistics AI agent.
- Fleet manager, driver safety expert, HOS compliance advisor
- Knows FleetHunt and Samsara tool capabilities
- Guides Claude to provide actionable fleet insights

#### `backend/app/departments/logistics/tools.py`
10 FleetHunt GPS tracking tools.
- `get_fleet_location()` — All vehicles with GPS coordinates
- `get_vehicle_by_name(name)` — Find specific vehicle
- `get_vehicle_by_id(id)` — Vehicle details by ID
- `get_moving_vehicles()` — Currently moving vehicles
- `get_idle_vehicles()` — Currently idling vehicles
- `get_stopped_vehicles()` — Currently stopped vehicles
- `get_speeding_vehicles(threshold)` — Vehicles over speed limit
- `get_nearby_vehicles(lat, lng, radius)` — Vehicles near a location
- `get_live_tracking(vehicle_id)` — Real-time tracking link
- `get_fleet_summary()` — Total counts by status

#### `backend/app/departments/logistics/samsara_tools.py`
15+ Samsara fleet management tools.
- Vehicle tools: list, locations, stats
- Driver tools: list drivers, safety scores
- HOS/ELD: driver logs, violations, compliance
- Fuel/Energy: consumption by vehicle, fleet totals
- Trips: trip history, summaries
- Safety: harsh events (braking, acceleration, cornering), dashcam clips
- Equipment tracking: non-vehicle asset tracking
- Live shares: generate shareable GPS links
- All hit Samsara's official REST API with bearer token

---

### 5.2 Frontend Files

#### `frontend/src/app/page.tsx` — Landing Page (`/`)
- VRTek Consulting hero section with gradient background (navy to teal)
- Feature cards: 5 department descriptions with icons
- CTAs: "Start Using Portal" to /login, "View Services" to /services
- Fully responsive; mobile-first layout

#### `frontend/src/app/layout.tsx` — Root Layout
- HTML root, body, metadata (title: "VRTek AI Portal")
- Applies global fonts and Tailwind base styles
- Wraps all pages

#### `frontend/src/app/login/page.tsx` — Login & Register (`/login`)
- Toggle between Login and Register forms
- Department selection dropdown on Register
- Calls `POST /api/v1/auth/login` or `/auth/register`
- On success: saves JWT + user info to localStorage, redirects to /chat
- Error display for invalid credentials

#### `frontend/src/app/chat/page.tsx` — Main Chat Interface (`/chat`)
This is the largest and most complex component.
- **Sidebar**: Department icon, conversation history list, "New Chat" button
- **Chat area**: Message thread with user/assistant bubbles
- **Assistant messages**: Rendered via `DashboardMessage` component (markdown + tool outputs)
- **Input**: Text input + voice input button (Web Speech API)
- **SSE Streaming**: Connects to `/api/v1/chat/stream`, processes events in real-time
- **Tool status**: Shows "Checking fleet data..." notifications during tool execution
- **Quick prompts**: Department-specific suggested questions
- **Auth check**: Redirects to /login if no JWT

#### `frontend/src/app/admin/page.tsx` — Admin Dashboard (`/admin`)
- Usage charts per department (Recharts BarChart)
- Budget cards: monthly token limits, current usage, % consumed
- Integration status section: Email, Slack, QB connections per department
- Connect/Disconnect buttons for each OAuth integration
- Fetches: `/api/v1/admin/usage`, `/api/v1/email/status`, `/api/v1/slack/status`, `/api/v1/quickbooks/status`
- Admin-only (redirects regular users to /chat)

#### `frontend/src/app/services/page.tsx` — Service Catalog (`/services`)
- Grid of 5 department cards
- Each card: icon, name, description, feature list, "Learn More" link

#### `frontend/src/app/services/[id]/page.tsx` — Service Detail (`/services/[id]`)
- Dynamic route — id matches department key (sales, finance, etc.)
- Detailed description, use cases, tool capabilities
- "Start Using" CTA to /login

#### `frontend/src/components/chat/DashboardMessage.tsx`
**The most important rendering component.**
- Receives a `message` with `tool_calls` array
- Calls `extractDashboardData(tool_calls)` to get structured data
- Renders:
  - **KPI Cards**: 4-column grid with label, value, color indicator, subtitle
  - **Donut Chart**: For fleet status or category breakdowns
  - **Data Tables**: Via `DashboardTable` component
  - **Markdown Text**: The Claude response text below the visuals
  - **Follow-up Prompts**: Clickable buttons for suggested next questions
  - **Embedded iframes**: For live tracking maps (from Samsara live share URLs)

#### `frontend/src/components/chat/DashboardTable.tsx`
- Receives `columns` (array of header names) and `rows` (array of data arrays)
- Renders responsive HTML table with Tailwind styling
- Sticky header, hover rows, overflow scroll for mobile

#### `frontend/src/components/chat/DonutChart.tsx`
- Wraps Recharts `PieChart` with `innerRadius` for donut effect
- Props: `data` (array of {name, value, color}), `size` (px)
- Shows total count in center
- Used for fleet status: Moving/Idle/Stopped breakdown

#### `frontend/src/components/chat/MessageActions.tsx`
- Floating action buttons on assistant messages
- Copy to clipboard, thumbs up/down (feedback hooks)
- Appears on hover

#### `frontend/src/departments/config.ts`
- `DEPARTMENT_CONFIG` object: maps dept key to { label, color, icon, description, quickPrompts }
- Colors: Sales (blue), Finance (green), Accounting (purple), Restaurant (orange), Logistics (teal)
- Quick prompts: pre-written questions for each department
- Used by sidebar, service cards, chat UI

#### `frontend/src/departments/types.ts`
- `QuickPrompt` interface: `{ label: string, prompt: string }`
- `PromptSection` interface: `{ title: string, prompts: QuickPrompt[] }`

#### `frontend/src/departments/dashboard.ts`
**Core data extraction logic.**
- `extractDashboardData(tool_calls)` returns `DashboardData`
- Per-tool parsers: `parseFleetSummary()`, `parseMovingVehicles()`, `parseOrderStats()`, etc.
- KPI extraction: looks for numeric values, labels them correctly
- Chart extraction: groups status counts into chart segments
- Table extraction: converts arrays of objects to column/row format
- Follow-up prompt generation: based on what tools were used

#### `frontend/src/departments/integrations.ts` and `integrations.tsx`
- `getIntegrationStatus(dept, type)` — checks if email/slack/QB is connected
- `connectOAuth(dept, type)` — opens popup window to OAuth URL
- Popup message listener: receives success/failure from OAuth callback
- Used in admin page connect buttons

#### `frontend/src/lib/api.ts`
**All API calls in one place.**
- `authHeaders()` returns `{ Authorization: Bearer {jwt} }`
- `login(email, password)` — POST /auth/login
- `register(email, password, department)` — POST /auth/register
- `sendMessage(message, conv_id)` — POST /chat
- `streamMessage(message, conv_id, onChunk, onTool, onDone, onError)` — SSE stream
- `getConversations()` — GET /conversations
- `getConversation(id)` — GET /conversations/{id}
- `getUsage(period)` — GET /admin/usage
- All OAuth status/connect/disconnect methods for email, Slack, QB

#### `frontend/src/types/index.ts`
All TypeScript interfaces:
- `User`: id, email, department, role
- `AuthResponse`: access_token, token_type, user
- `ChatMessage`: id, role, content, tool_calls, timestamp
- `ToolCall`: tool, input, output
- `Conversation`: id, department, title, messages[], created_at
- `DashboardData`: kpis[], chartData[], tableData, followUpPrompts[]
- `KPICard`: label, value, color, subtitle
- `DepartmentUsage`: department, total_tokens, tool_calls, requests
- `BudgetConfig`: monthly_token_limit, alert_threshold_pct, etc.

---

### 5.3 Config & Infrastructure Files

#### `backend/.env.example`
Template for all environment variables. Copy to `.env` and fill in secrets before running.

#### `docker-compose.yml`
Defines two services:
- `backend`: builds from backend/Dockerfile, exposes :8000, mounts `.env`
- `frontend`: builds from frontend/Dockerfile, exposes :3000
- `backend-data` volume: persists SQLite DB file between container restarts

#### `frontend/next.config.js`
- API proxy: rewrites `/api/*` to `http://backend:8000/api/*` (Docker internal networking)
- `output: standalone` for optimized Docker image size

#### `frontend/tailwind.config.ts`
- Custom brand colors: `navy`, `teal` with shades
- Custom animations: `fade-in`, `slide-up`, `float`
- Content: scans `src/**/*.{ts,tsx}` for class names

---

## 6. Database Schema

```
┌──────────────────────────────────────┐
│              users                    │
│  id           UUID PK                 │
│  email        VARCHAR UNIQUE          │
│  hashed_password VARCHAR              │
│  full_name    VARCHAR                 │
│  department   ENUM (sales|finance|    │
│               accounting|restaurant|  │
│               logistics)              │
│  role         ENUM (user|dept_admin|  │
│               admin)                  │
│  is_active    BOOLEAN default true    │
│  created_at   DATETIME                │
│  updated_at   DATETIME                │
└──────────────────────┬───────────────┘
                       │ 1:many
┌──────────────────────▼───────────────┐
│           conversations               │
│  id           UUID PK                 │
│  user_id      UUID FK → users.id      │
│  department   VARCHAR                 │
│  title        VARCHAR                 │
│  created_at   DATETIME                │
│  updated_at   DATETIME                │
│  INDEX (user_id, department)          │
└──────────────────────┬───────────────┘
                       │ 1:many
┌──────────────────────▼───────────────┐
│              messages                 │
│  id           UUID PK                 │
│  conversation_id UUID FK              │
│  role         VARCHAR (user/assistant)│
│  content      TEXT                    │
│  tool_calls   JSON (array of calls)   │
│  token_count  INTEGER                 │
│  created_at   DATETIME                │
│  INDEX (conversation_id, created_at)  │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│           usage_records               │
│  id           UUID PK                 │
│  user_id      UUID FK → users.id      │
│  department   VARCHAR                 │
│  input_tokens INTEGER                 │
│  output_tokens INTEGER                │
│  tool_calls_count INTEGER             │
│  model        VARCHAR                 │
│  created_at   DATETIME                │
│  INDEX (department, created_at)       │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│         department_budgets            │
│  id           UUID PK                 │
│  department   VARCHAR UNIQUE          │
│  monthly_token_limit     INTEGER(2M)  │
│  monthly_tool_call_limit INTEGER(5K)  │
│  max_concurrent_users    INTEGER(50)  │
│  alert_threshold_pct     INTEGER(75)  │
│  updated_at   DATETIME                │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│       department_email_configs        │
│  id           UUID PK                 │
│  department   VARCHAR UNIQUE          │
│  provider     VARCHAR (gmail/outlook) │
│  email_address VARCHAR                │
│  access_token  TEXT (Fernet encrypted)│
│  refresh_token TEXT (Fernet encrypted)│
│  token_expiry  DATETIME               │
│  scopes        TEXT                   │
│  is_active     BOOLEAN                │
│  connected_at  DATETIME               │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│       department_slack_configs        │
│  id           UUID PK                 │
│  department   VARCHAR UNIQUE          │
│  team_id      VARCHAR                 │
│  team_name    VARCHAR                 │
│  bot_token    TEXT (Fernet encrypted) │
│  bot_user_id  VARCHAR                 │
│  default_channel_id   VARCHAR         │
│  default_channel_name VARCHAR         │
│  is_active    BOOLEAN                 │
│  connected_at DATETIME                │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│     department_quickbooks_configs     │
│  id           UUID PK                 │
│  department   VARCHAR UNIQUE          │
│  realm_id     VARCHAR                 │
│  company_name VARCHAR                 │
│  access_token  TEXT (Fernet encrypted)│
│  refresh_token TEXT (Fernet encrypted)│
│  token_expiry  DATETIME               │
│  is_active     BOOLEAN                │
│  connected_at  DATETIME               │
└──────────────────────────────────────┘
```

---

## 7. All API Routes

### Auth — `/api/v1/auth`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/login` | None | Login → returns JWT |
| POST | `/register` | None | Register new user → returns JWT |
| POST | `/logout` | Bearer | Revoke session |

### Chat — `/api/v1/chat`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/` | Bearer | Send message, get full response |
| POST | `/stream` | Bearer | Send message, stream response via SSE |

**SSE Events from `/stream`:**
```
event: conv_id      data: {"conversation_id": "uuid"}
event: message      data: {"content": "text chunk"}
event: tool_status  data: {"status": "Checking fleet data..."}
event: done         data: {"tool_calls": [...], "total_tokens": 1234}
event: error        data: {"error": "message"}
```

### Conversations — `/api/v1/conversations`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/` | Bearer | List conversations (current user + dept) |
| GET | `/{id}` | Bearer | Get conversation with messages |

### Admin — `/api/v1/admin`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/usage` | Admin | Usage per department |
| GET | `/config/{dept}` | Admin | Get budget config |
| PUT | `/config/{dept}` | Admin | Update budget config |
| GET | `/insights` | Admin | KPI trends |

### Email — `/api/v1/email`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/status` | Bearer | All dept email connections |
| GET | `/status/{dept}` | Bearer | One dept email status |
| GET | `/connect/{dept}/{provider}` | Admin | Get Gmail/Outlook OAuth URL |
| GET | `/callback` | None* | OAuth callback (receives code) |
| DELETE | `/disconnect/{dept}` | Admin | Remove email connection |

### Slack — `/api/v1/slack`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/status` | Bearer | All dept Slack connections |
| GET | `/status/{dept}` | Bearer | One dept Slack status |
| GET | `/connect/{dept}` | Admin | Get Slack OAuth URL |
| GET | `/callback` | None* | OAuth callback |
| DELETE | `/disconnect/{dept}` | Admin | Remove Slack connection |

### QuickBooks — `/api/v1/quickbooks`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/status` | Bearer | All dept QB connections |
| GET | `/status/{dept}` | Bearer | One dept QB status |
| GET | `/connect/{dept}` | Admin | Get QB OAuth URL |
| GET | `/callback` | None* | OAuth callback |
| DELETE | `/disconnect/{dept}` | Admin | Remove QB connection |

### Health

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Returns `{"status": "ok"}` |

---

## 8. Authentication & Authorization

### Login Flow

```
1. User submits email + password to POST /api/v1/auth/login
2. Backend fetches user by email from DB
3. bcrypt.verify(plain_password, hashed_password) → True/False
4. If valid: create JWT payload:
   { sub: user.id, department: "logistics", role: "admin", exp: now + 60min }
5. Sign JWT with SECRET_KEY using HS256 algorithm
6. Return { access_token: "eyJ...", token_type: "bearer", user: {...} }
7. Frontend stores JWT in localStorage["access_token"]
```

### Request Auth Flow

```
Every API request:
1. Frontend adds header: Authorization: Bearer eyJ...
2. Backend middleware: get_current_user() dependency
3. Extract token from header
4. python-jose.decode(token, SECRET_KEY, algorithms=["HS256"])
5. Fetch user from DB using sub (user_id)
6. Return CurrentUser(id, email, department, role)
7. Route handler receives user as parameter via Depends(get_current_user)
```

### Role Hierarchy

```
admin                     → All routes, all departments, usage dashboard
  └─ dept_admin           → Chat in their dept + OAuth management for their dept
       └─ user            → Chat in their assigned department only
```

### Data Isolation

- Conversations: `WHERE user_id = current_user.id AND department = current_user.department`
- Messages: accessed only through own conversations
- OAuth configs: per-department; connect/disconnect requires admin

---

## 9. Department Agents

### How Agents Work

Each department agent is defined by 3 things:
1. **System Prompt** — Tells Claude who it is, what it knows, how to respond
2. **Tools** — List of callable functions Claude can use to get real data
3. **Executor** — Function that routes tool names to actual Python functions

```python
# orchestrator.py (simplified)
while True:
    response = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        system=system_prompt,
        messages=message_history,
        tools=tool_definitions
    )

    if response.stop_reason == "tool_use":
        for block in response.content:
            if block.type == "tool_use":
                result = execute_tool(block.name, block.input)
                message_history.append({"role": "tool", "content": result})
    else:
        return response.content[0].text  # Final answer
```

### Sales Agent
- **System Prompt:** CRM analysis, pipeline management, deal tracking, market research
- **Tools:** `query_crm`, `search_email_logs`, `get_market_data` (all mock)
- **Example queries:** "Show me deals closing this quarter", "Which leads haven't been contacted?"

### Finance Agent
- **System Prompt:** Cash flow analysis, ERP data, GL accounts, compliance
- **Tools:** `query_erp`, `get_cash_flow_forecast`, `check_compliance` (all mock)
- **Example queries:** "What's our cash position?", "Run a compliance check for Q4"

### Accounting Agent
- **System Prompt:** Accounts payable/receivable, reconciliation, tax
- **Tools:** `query_invoices`, `reconcile_accounts`, `calculate_tax` (all mock)
- **Example queries:** "List all overdue invoices", "Reconcile bank account for November"

### Restaurant Agent
- **System Prompt:** Menu expertise, order status, dietary guidance
- **Tools:** `query_menu` (real local data), `get_orders` (real FCM API), `get_order_stats` (real)
- **Example queries:** "What vegan options do we have?", "Show today's orders"

### Logistics Agent
- **System Prompt:** Fleet tracking, driver safety, HOS compliance, fuel efficiency
- **FleetHunt Tools (real GPS):** `get_fleet_location`, `get_moving_vehicles`, `get_idle_vehicles`, `get_stopped_vehicles`, `get_speeding_vehicles`, `get_nearby_vehicles`, `get_live_tracking`, `get_fleet_summary`
- **Samsara Tools (real fleet mgmt):** `list_vehicles`, `get_vehicle_locations`, `get_vehicle_stats`, `get_driver_safety_scores`, `get_hos_logs`, `get_fuel_energy_usage`, `get_trip_history`, `get_safety_events`, `get_dashcam_media`, `create_live_share`
- **Example queries:** "Which vehicles are currently moving?", "Show me driver safety scores", "Are there any HOS violations?"

---

## 10. All Integrations

### FleetHunt (Logistics Only)
- **Type:** Real-time GPS fleet tracking
- **Auth:** API key in header
- **Base URL:** `https://app.fleethunt.ca/api`
- **Config:** `FLEETHUNT_API_KEY`, `FLEETHUNT_BASE_URL` in `.env`
- **Data:** Vehicle positions, speeds, ignition status, timestamps

### Samsara (Logistics Only)
- **Type:** Comprehensive fleet management platform
- **Auth:** Bearer token
- **Base URL:** `https://api.samsara.com`
- **Config:** `SAMSARA_API_KEY` in `.env`
- **Data:** Vehicles, drivers, trips, HOS logs, fuel, safety events, dashcam media

### FCM Backend (Restaurant Only)
- **Type:** Order management system
- **Auth:** Secret header
- **Config:** `FCM_BACKEND_URL`, `FCM_BACKEND_SECRET` in `.env`
- **Data:** Orders (recent, by status, by period)

### Gmail (All Departments)
- **Type:** Google Workspace email
- **Auth:** OAuth 2.0
- **Config:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in `.env`
- **Redirect URI:** `{API_URL}/api/v1/email/callback`
- **Scopes:** `gmail.readonly`, `gmail.send`, `gmail.modify`

### Outlook (All Departments)
- **Type:** Microsoft 365 email
- **Auth:** OAuth 2.0 (Microsoft Identity Platform)
- **Config:** `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` in `.env`
- **Data:** Same as Gmail via Microsoft Graph API

### Slack (All Departments)
- **Type:** Team messaging platform
- **Auth:** OAuth 2.0 (bot token)
- **Config:** `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` in `.env`
- **Redirect URI:** `{API_URL}/api/v1/slack/callback`
- **Scopes:** `channels:read`, `chat:write`, `channels:history`, `search:read`

### QuickBooks Online (All Departments)
- **Type:** Accounting software
- **Auth:** OAuth 2.0 (Intuit)
- **Config:** `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_ENVIRONMENT` in `.env`
- **Redirect URI:** `{API_URL}/api/v1/quickbooks/callback`
- **Environments:** `sandbox` (development) or `production`
- **Data:** Customers, invoices, payments, vendors, bills, items, financial reports

---

## 11. Frontend Pages & Components

### Page Routing

```
/                    → Landing page
/login               → Login/Register
/chat                → Main chat interface
/admin               → Admin dashboard (admin role required)
/services            → Service catalog
/services/[id]       → Service detail (id = sales|finance|accounting|restaurant|logistics)
```

### Chat Page Layout

```
┌────────────────────────────────────────────────────────┐
│ [Dept Icon] VRTek AI      [Admin] [Settings] [Logout]  │ Header
├──────────────┬─────────────────────────────────────────┤
│  Sidebar     │           Chat Area                     │
│              │                                         │
│ [New Chat]   │  ┌─────────────────────────────────┐   │
│              │  │ User: Show me fleet summary       │  │
│ Conversations│  └─────────────────────────────────┘   │
│              │                                         │
│ > Today      │  ┌─────────────────────────────────┐   │
│   Fleet check│  │ AI: [KPI Cards: Moving/Idle/...] │  │
│ > Yesterday  │  │     [Donut Chart]                 │  │
│   Menu query │  │     [Vehicle Table]               │  │
│              │  │     Response text...              │  │
│ Quick Prompts│  │     [Follow-up prompts]           │  │
│ • Show fleet │  └─────────────────────────────────┘   │
│ • Get orders │                                         │
│              │  [Mic] [Type your message...] [Send]    │
└──────────────┴─────────────────────────────────────────┘
```

---

## 12. Streaming Chat (SSE)

Server-Sent Events allow real-time word-by-word streaming of Claude's response.

**Backend (`chat.py`):**
```python
async def event_generator():
    async for event in orchestrator.run_agent_stream(...):
        if event["type"] == "text_delta":
            yield f"event: message\ndata: {json.dumps({'content': event['text']})}\n\n"
        elif event["type"] == "tool_status":
            yield f"event: tool_status\ndata: {json.dumps({'status': event['message']})}\n\n"
        elif event["type"] == "done":
            yield f"event: done\ndata: {json.dumps({'tool_calls': event['tool_calls']})}\n\n"

return EventSourceResponse(event_generator())
```

**Frontend (`api.ts`):**
```typescript
const streamMessage = (message, convId, onChunk, onTool, onDone, onError) => {
  const eventSource = new EventSource(`/api/v1/chat/stream?...`);

  eventSource.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    onChunk(data.content);  // Append to displayed message
  });

  eventSource.addEventListener('tool_status', (e) => {
    const data = JSON.parse(e.data);
    onTool(data.status);  // Show "Checking fleet data..."
  });

  eventSource.addEventListener('done', (e) => {
    const data = JSON.parse(e.data);
    onDone(data.tool_calls);  // Render dashboard from tool outputs
  });
};
```

---

## 13. Dashboard Rendering Logic

After Claude's response, tool outputs are parsed into visual dashboards.

**Flow:**
```
SSE "done" event arrives
    → tool_calls = [{ tool: "get_fleet_summary", output: {...} }, ...]
    → extractDashboardData(tool_calls)
    → DashboardData { kpis, chartData, tableData, followUpPrompts }
    → DashboardMessage renders:
        KPI Cards → Donut Chart → Data Table → Markdown → Follow-up prompts
```

**KPI Extraction Example:**
```
Tool: get_fleet_summary
Output: { total: 25, moving: 18, idle: 4, stopped: 3 }

→ KPIs:
  { label: "Total Vehicles", value: "25", color: "blue" }
  { label: "Moving",         value: "18", color: "green" }
  { label: "Idle",           value: "4",  color: "yellow" }
  { label: "Stopped",        value: "3",  color: "red" }

→ Chart Segments:
  [ { name: "Moving",  value: 18, color: "#22c55e" },
    { name: "Idle",    value: 4,  color: "#f59e0b" },
    { name: "Stopped", value: 3,  color: "#ef4444" } ]
```

---

## 14. OAuth Flows

All integrations follow the same OAuth 2.0 Authorization Code flow:

```
1. Admin clicks "Connect Gmail" in admin panel

2. Frontend calls GET /api/v1/email/connect/logistics/gmail
   Backend returns Google OAuth URL with state=jwt_token

3. Frontend opens popup window to that OAuth URL

4. User signs into Gmail, grants permissions

5. Gmail redirects to /api/v1/email/callback?code=...&state=...

6. Backend:
   a. Validates state parameter (verifies JWT)
   b. Exchanges authorization code for access_token + refresh_token
   c. Encrypts both tokens with Fernet (key derived from SECRET_KEY)
   d. Saves encrypted tokens to department_email_configs table
   e. Returns HTML success page → popup closes itself

7. Admin panel refreshes: shows "Gmail Connected"

8. From now on when agent runs for this dept:
   → email tools added to Claude's available tool list
   → Claude can now search/send emails
```

**Token Refresh:** Before each API call, the service checks token expiry → auto-refreshes using the refresh_token → updates encrypted value in DB.

---

## 15. Security Measures

| Security Layer | Implementation |
|---|---|
| Password Hashing | bcrypt with salt (work factor 12) |
| JWT Tokens | HS256 signed, 60-min expiry |
| OAuth Token Storage | Fernet symmetric encryption at rest in SQLite |
| CORS | Whitelist only known frontend origins |
| SQL Injection Prevention | SQLAlchemy ORM (parameterized queries only) |
| Data Isolation | All queries filtered by user_id + department |
| Admin Routes | `require_admin` FastAPI dependency on all `/admin/*` routes |
| Rate Limiting | 30 req/min (user), 100 req/min (admin) |
| HTTPS | Enforced via reverse proxy in production |

---

## 16. Environment Variables

Copy `backend/.env.example` → `backend/.env` and fill in all values.

### Required

```bash
# Claude AI (get from console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-...

# Security — generate with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-32-char-secret-key-here

# Logistics — FleetHunt GPS (contact FleetHunt for API key)
FLEETHUNT_API_KEY=your-fleethunt-key
FLEETHUNT_BASE_URL=https://app.fleethunt.ca/api

# Logistics — Samsara Fleet Management (contact Samsara)
SAMSARA_API_KEY=your-samsara-key

# Restaurant — Order System
FCM_BACKEND_URL=https://your-fcm-backend.com
FCM_BACKEND_SECRET=your-fcm-secret

# Gmail OAuth (create at console.cloud.google.com)
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Outlook OAuth (create at portal.azure.com — App Registration)
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...

# Slack OAuth (create at api.slack.com/apps)
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...

# QuickBooks OAuth (create at developer.intuit.com)
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
QUICKBOOKS_ENVIRONMENT=sandbox
```

### Optional (defaults provided)

```bash
APP_ENV=development
APP_PORT=8000
DATABASE_URL=sqlite+aiosqlite:///./ai_portal.db
CORS_ORIGINS=http://localhost:3000
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
RATE_LIMIT_DEFAULT=30
RATE_LIMIT_ADMIN=100
```

---

## 17. Default Users (Seeded)

These users are created automatically on first backend startup via `seed_users()` in `database.py`.

| Email | Password | Department | Role |
|---|---|---|---|
| `admin@gmail.com` | `admin` | Restaurant | admin |
| `admin1@gmail.com` | `admin` | Logistics | admin |
| `themasalatwist@gmail.com` | `oxnard` | Restaurant | user |
| `finance@demo.com` | `admin` | Finance | admin |
| `accounting@demo.com` | `admin` | Accounting | admin |
| `sales@demo.com` | `admin` | Sales | admin |

> Change these passwords immediately in any production environment.

---

## 18. Running the Project

### Option A: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone <repo-url>
cd multi-dept-ai-portal-new

# 2. Set up environment variables
cp backend/.env.example backend/.env
# Open backend/.env and fill in all API keys

# 3. Build and start all containers
docker compose up --build

# 4. Open the app
# Frontend:  http://localhost:3000
# Backend API: http://localhost:8000
# API Docs (Swagger): http://localhost:8000/docs
```

### Option B: Local Development

```bash
# --- BACKEND ---
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your keys
uvicorn app.main:app --reload --port 8000

# --- FRONTEND (new terminal) ---
cd frontend
npm install
# Create frontend/.env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
# Runs at http://localhost:3000
```

### First Login

1. Open `http://localhost:3000`
2. Click "Start Using Portal"
3. Login: `admin@gmail.com` / `admin`
4. You're in the Restaurant department chat
5. Try: "What vegan options do you have on the menu?"

### Connect an Integration (Admin Panel)

1. Login as any admin user
2. Go to `/admin` (click Admin in the header)
3. Scroll to "Integrations" section
4. Click "Connect Gmail" for a department
5. Complete OAuth flow in the popup
6. Gmail tools will now be available to Claude for that department

---

## 19. Styling & Branding

### VRTek Brand Colors

```css
/* Primary gradient */
background: linear-gradient(135deg, #08203E 0%, #557C93 100%);

Navy:       #08203E   (dark navy blue — primary)
Teal:       #557C93   (medium teal — secondary)
Teal Light: #7BA7B7   (light teal — accents)
```

### Department Colors

| Department | Color | Hex |
|---|---|---|
| Sales | Blue | `#3B82F6` |
| Finance | Green | `#22C55E` |
| Accounting | Purple | `#A855F7` |
| Restaurant | Orange | `#F97316` |
| Logistics | Teal | `#14B8A6` |

### Custom Animations (`tailwind.config.ts`)

```
fade-in:   opacity 0→1 over 0.5s
slide-up:  translateY(20px)→0 + opacity 0→1 over 0.5s
float:     translateY(0→-10px→0) looping every 3s
```

---

## 20. Key Patterns & Concepts

### 1. Claude Agentic Tool-Use Loop
Claude doesn't just generate text — it decides which tools to call, sees the results, and generates a response grounded in real data. This "think → act → observe → think" loop is the core of every department agent.

### 2. Department Registry Pattern
All department configuration (tools, prompts, executors) lives in one file: `registry.py`. To add a new department, add one entry to the registry and create a `departments/newdept/` folder with `prompts.py` and `tools.py`. No other files need changing.

### 3. Dynamic Common Tool Injection
Email, Slack, and QuickBooks tools are not hardcoded into any department. They live in `departments/common/` and are dynamically injected by the registry into whichever department has those integrations connected. Claude automatically gains access to them without any department-specific code changes.

### 4. SSE Streaming Architecture
The backend streams Claude's response word-by-word to the frontend using Server-Sent Events. This gives a ChatGPT-like experience. The frontend receives three types of events: text chunks (for display), tool status (for "Analyzing..." indicators), and done (for dashboard rendering).

### 5. Fernet Token Encryption
All OAuth tokens (Gmail, Slack, QB) are encrypted with Fernet symmetric encryption before being stored in SQLite. The encryption key is derived from the `SECRET_KEY` environment variable. Tokens are only decrypted in memory when making API calls — they are never stored or logged in plaintext.

### 6. Per-Department Integration Isolation
Each integration is tied to a department, not a user. The Sales department connects its own Gmail; the Finance department connects its own. Users in different departments cannot use each other's OAuth tokens. This mirrors real organizational structure where each team has its own credentials.

### 7. Frontend Dashboard Data Extraction
The `extractDashboardData()` function is a pure function that takes raw tool output JSON and transforms it into structured KPI cards, chart segments, and table rows. This keeps rendering logic completely separate from API/chat logic and makes it easy to add new visualization types.

### 8. TypeScript Strict Mode
The entire frontend uses TypeScript strict mode. All component props, API responses, and state are fully typed. This means compile-time errors instead of runtime surprises, and the types serve as living documentation of the data shapes.

### 9. Async Everything (Backend)
All database operations use async SQLAlchemy with aiosqlite. All external API calls use httpx async client. This means the FastAPI server can handle many concurrent SSE streams without blocking — critical when multiple users are chatting simultaneously.

### 10. Popup OAuth Pattern
OAuth connections are opened in a popup window (not a full-page redirect) so the admin stays on the admin dashboard. The popup closes itself after a successful OAuth flow and sends a `window.postMessage` to the parent window, which triggers a status refresh. This gives a smooth UX without page reloads.

---

*This is the complete documentation for the Multi-Department AI Agent Portal. Every file, every concept, every workflow is documented here. For questions or contributions, open an issue in the project repository.*

# Multi-Department AI Portal — Complete Technical Guide

> **Purpose**: This document explains every aspect of the project in deep detail — architecture, code, workflows, concepts, and patterns — so that anyone new to the project can understand exactly how everything works from top to bottom.

---

## Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [Core Concepts You Need to Know First](#2-core-concepts-you-need-to-know-first)
3. [Tech Stack (Why Each Technology Was Chosen)](#3-tech-stack-why-each-technology-was-chosen)
4. [Architecture Overview](#4-architecture-overview)
5. [Project Structure — Every File Explained](#5-project-structure--every-file-explained)
6. [Database Models & Relationships](#6-database-models--relationships)
7. [Authentication Flow (End-to-End)](#7-authentication-flow-end-to-end)
8. [Chat & Agent Workflow (End-to-End)](#8-chat--agent-workflow-end-to-end)
9. [The Department Registry Pattern](#9-the-department-registry-pattern)
10. [All API Endpoints (Detailed)](#10-all-api-endpoints-detailed)
11. [Department Agents & Tools (In Depth)](#11-department-agents--tools-in-depth)
12. [FleetHunt GPS Integration (Logistics)](#12-fleethunt-gps-integration-logistics)
13. [Restaurant Integration (The Masala Twist)](#13-restaurant-integration-the-masala-twist)
14. [Frontend Pages & UI Flow (In Depth)](#14-frontend-pages--ui-flow-in-depth)
15. [Frontend Department System](#15-frontend-department-system)
16. [Dashboard Visualization System](#16-dashboard-visualization-system)
17. [Middleware (Auth + Rate Limiting)](#17-middleware-auth--rate-limiting)
18. [Environment Variables](#18-environment-variables)
19. [Docker Setup](#19-docker-setup)
20. [How to Run (Step by Step)](#20-how-to-run-step-by-step)
21. [Key Design Patterns Used](#21-key-design-patterns-used)
22. [How Data Flows Through the System](#22-how-data-flows-through-the-system)
23. [Error Handling Strategy](#23-error-handling-strategy)
24. [Common Interview / Tech Lead Questions](#24-common-interview--tech-lead-questions)

---

## 1. What Is This Project?

This is a **Multi-Department AI Agent Portal** — a single web application where different departments of an organization (Sales, Finance, Accounting, Restaurant, Logistics) each get their own **specialized AI chatbot assistant**. Think of it as "one portal, many AI agents."

### What Makes It Special?

1. **Each department gets its own AI agent** — The Sales agent knows CRM data. The Logistics agent tracks real GPS vehicles. The Restaurant agent knows the real menu. They don't share data.

2. **Real tool execution** — When you ask the Logistics AI "show me idle vehicles", it actually calls a real GPS API (FleetHunt), gets live vehicle data, and presents it. It's not just generating text — it's executing real-world actions.

3. **Agentic AI pattern** — The AI (Claude) decides what tools to call based on your question, our backend executes those tools, feeds the results back, and the AI interprets them. This loop continues until the AI has enough information to give a final answer.

4. **Role-based access** — Users belong to departments. Admins can see usage analytics across all departments. Regular users can only chat with their department's AI agent.

5. **Dashboard-style UI** — AI responses aren't just plain text. The frontend transforms tool results into KPI cards, donut charts, data tables, and follow-up action buttons — like a real business dashboard embedded in a chat interface.

### Real-World Analogy

Imagine walking into an office building where:
- The **Sales floor** has an AI assistant that can pull up any deal, search emails, and analyze the market.
- The **Finance office** has an AI that forecasts cash flow, checks compliance, and queries the ERP system.
- The **Logistics center** has an AI that shows you where every vehicle is in real-time on a map.
- The **Restaurant** has an AI that knows every menu item, price, and recent order.
- The **Accounting department** has an AI that reconciles accounts, tracks invoices, and calculates taxes.

Each person can only access their own department's AI. The admin can see how much each department is spending on AI usage.

---

## 2. Core Concepts You Need to Know First

Before diving into the code, here are the key concepts that make this project work:

### 2.1 What Is an "AI Agent"?

An **AI agent** is more than just a chatbot. A regular chatbot just generates text. An AI agent can:
1. **Think** about what data it needs to answer your question
2. **Call tools** (APIs, databases, calculations) to get real data
3. **Interpret** the results of those tool calls
4. **Decide** if it needs more data (call another tool) or if it's ready to answer
5. **Respond** with a final, informed answer

This "think → act → observe → repeat" cycle is called the **agentic loop** or **tool-use loop**.

### 2.2 What Is the "Tool-Use Loop"?

This is the single most important concept in the project. Here's how it works:

```
You: "Show me idle vehicles"
  ↓
Claude thinks: "I need to call get_idle_vehicles to answer this"
  ↓
Claude responds: "I want to use tool: get_idle_vehicles"
  (stop_reason: "tool_use")
  ↓
Our backend: Calls the FleetHunt GPS API, filters idle vehicles
  ↓
Our backend: Sends the result back to Claude
  ↓
Claude thinks: "I now have the data. Let me format a nice answer."
  ↓
Claude responds: "I found 3 idle vehicles: [table with details]"
  (stop_reason: "end_turn")
```

The key insight: **Claude never calls the tools itself.** It tells our code *which* tool it wants to call and *what parameters* to use. Our code executes the tool and feeds the result back. Claude then interprets the data.

### 2.3 What Is Claude's Tool-Use Format?

Claude (by Anthropic) has a specific way to define tools. Each tool is a JSON object:

```json
{
  "name": "get_idle_vehicles",
  "description": "Get all vehicles that are currently idling (engine on but stationary).",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

When we send a message to Claude along with tool definitions, Claude can respond in two ways:
1. **Text response** (`stop_reason: "end_turn"`) — Claude gives a final text answer
2. **Tool use** (`stop_reason: "tool_use"`) — Claude wants us to execute a tool first

### 2.4 What Is JWT Authentication?

JWT (JSON Web Token) is a way to prove "who you are" to the server on every request without needing to re-enter your password each time:

1. **Login**: You send email + password. Server verifies them and creates a **signed token** (JWT).
2. **Every subsequent request**: Your browser sends this token in the `Authorization: Bearer <token>` header.
3. **Server validation**: The server decodes the token, verifies the signature, and knows who you are, what department you belong to, and what role you have.
4. **Expiry**: After 60 minutes, the token expires. You must log in again.

A JWT token has 3 parts (separated by dots):
- **Header**: Algorithm used (HS256)
- **Payload**: Your data (user_id, department, role, expiry time)
- **Signature**: Cryptographic proof that the token hasn't been tampered with

### 2.5 What Is SSE (Server-Sent Events)?

SSE is a technology that lets the server **push data to the browser** in real-time. In this project, it's used for streaming AI responses:

Instead of waiting for Claude to generate the entire response (which could take 10+ seconds), we stream each word/chunk as it's generated. The user sees the response "typing out" in real-time.

**How it works:**
- Browser opens a special HTTP connection to `/chat/stream`
- Server sends `event: message` with each text chunk as Claude generates it
- Server sends `event: done` when Claude finishes
- Browser renders each chunk immediately

### 2.6 What Is an ORM?

ORM (Object-Relational Mapping) is a technique that lets you interact with a database using Python objects instead of writing raw SQL:

```python
# Without ORM (raw SQL):
cursor.execute("SELECT * FROM users WHERE email = 'admin@gmail.com'")

# With ORM (SQLAlchemy):
result = await db.execute(select(User).where(User.email == "admin@gmail.com"))
user = result.scalar_one_or_none()
```

The ORM maps Python classes to database tables and Python objects to rows.

---

## 3. Tech Stack (Why Each Technology Was Chosen)

### Backend

| Technology | Version | Purpose | Why This Was Chosen |
|---|---|---|---|
| **Python** | 3.12+ | Programming language | Rich AI/ML ecosystem, excellent async support, widely used for backend APIs |
| **FastAPI** | 0.115+ | Web framework | Async by default, automatic API docs (Swagger/OpenAPI), type-safe with Pydantic, very fast (built on Starlette + Uvicorn) |
| **SQLAlchemy** | 2.0+ (async) | Database ORM | Industry standard Python ORM, supports async operations, works with SQLite and PostgreSQL |
| **SQLite** (dev) | — | Development database | Zero setup, file-based, perfect for development. No server needed. |
| **PostgreSQL** (prod) | 16 | Production database | Enterprise-grade, ACID compliant, handles concurrent connections well |
| **Anthropic SDK** | 0.88+ | Claude API client | Official Python SDK for calling Claude's API. Supports tool-use and streaming natively. |
| **httpx** | 0.28+ | Async HTTP client | Used to call external APIs (FleetHunt, FCM). Async-native, similar API to `requests` but non-blocking. |
| **python-jose** | 3.3+ | JWT library | Creates and validates JWT tokens. Supports HS256, RS256, etc. |
| **bcrypt** | 4.0+ | Password hashing | Industry standard for securely hashing passwords. One-way hash — impossible to reverse. |
| **Pydantic** | v2 (2.11+) | Data validation | Validates request/response data, loads settings from .env files, generates JSON schemas |
| **pydantic-settings** | 2.7+ | Settings management | Extension of Pydantic specifically for loading configuration from environment variables and `.env` files |
| **SSE-Starlette** | 2.2+ | Server-Sent Events | Enables streaming responses from the server to the browser |
| **Uvicorn** | 0.34+ | ASGI server | High-performance async Python web server. Runs the FastAPI application. |
| **aiosqlite** | 0.20+ | Async SQLite driver | Makes SQLite work with async Python (since SQLite is normally synchronous) |
| **asyncpg** | 0.30+ | Async PostgreSQL driver | High-performance async PostgreSQL driver for production. |
| **python-dotenv** | 1.0+ | Environment variables | Loads `.env` files into the process environment |
| **python-multipart** | 0.0.20+ | Form data parsing | Required by FastAPI for form data and file upload support |

### Frontend

| Technology | Version | Purpose | Why This Was Chosen |
|---|---|---|---|
| **Next.js** | 15 | React framework | Server-side rendering, file-based routing (App Router), standalone output for Docker, excellent developer experience |
| **React** | 19 | UI library | Component-based, declarative, industry standard |
| **TypeScript** | 5.7+ | Type-safe JavaScript | Catches errors at compile time, better IDE support, self-documenting code |
| **Tailwind CSS** | 3.4 | Utility-first CSS | Rapid styling without writing custom CSS files, responsive design utilities, consistent design system |
| **Recharts** | 3.8+ | Chart library | React-based charting for admin dashboard (bar charts, pie charts). Built on D3.js. |
| **react-markdown** | 10.1+ | Markdown renderer | Renders Claude's markdown-formatted responses as proper HTML (tables, lists, code blocks, bold text) |
| **remark-gfm** | 4.0+ | Markdown plugin | Adds GitHub Flavored Markdown support (tables, strikethrough, task lists) |
| **lucide-react** | 0.468+ | Icon library | Modern, clean SVG icons as React components |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Docker** | Containerizes the backend and frontend as separate images |
| **Docker Compose** | Orchestrates multi-container deployment (backend + frontend) |

---

## 4. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                        │
│                                                                 │
│   Landing Page → Login → Chat Interface                         │
│   (/)           (/login)  (/chat)                 (/admin)      │
│                                                                 │
│   localStorage: { token, department, role, fullName }           │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    HTTP Requests
                    Authorization: Bearer <JWT>
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     FASTAPI BACKEND (:8000)                     │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   CORS   │→ │ Rate Limiter │→ │ Auth (JWT)   │              │
│  │Middleware │  │  (per-IP)    │  │  Middleware   │              │
│  └──────────┘  └──────────────┘  └──────┬───────┘              │
│                                         │                       │
│              ┌──────────────────────────┼─────────────────┐     │
│              ▼             ▼            ▼           ▼      │     │
│         /api/v1/      /api/v1/    /api/v1/    /api/v1/    │     │
│          auth          chat     conversations  admin      │     │
│                          │                                │     │
│                          ▼                                │     │
│               ┌─────────────────────┐                     │     │
│               │  AgentOrchestrator  │                     │     │
│               │                     │                     │     │
│               │  1. Registry lookup │                     │     │
│               │     → get prompt    │                     │     │
│               │     → get tools     │                     │     │
│               │  2. Call Claude API  │                     │     │
│               │  3. Tool-use loop:  │                     │     │
│               │     → execute tool  │                     │     │
│               │     → feed result   │                     │     │
│               │     → call Claude   │                     │     │
│               │     → repeat until  │                     │     │
│               │       "end_turn"    │                     │     │
│               └────────┬────────────┘                     │     │
│                        │                                  │     │
│           ┌────────────┼────────────┬───────────┐         │     │
│           ▼            ▼            ▼           ▼         │     │
│      FleetHunt     FCM/POS      Mock Tools   Claude      │     │
│      GPS API       (Orders)     (Sales,Fin,  API         │     │
│      (REAL)        (REAL)       Acct)        (Anthropic) │     │
│                                                           │     │
│  ┌────────────────────────────────────────────────────┐   │     │
│  │              DATABASE (SQLite / PostgreSQL)         │   │     │
│  │                                                    │   │     │
│  │  users │ conversations │ messages │ usage_records  │   │     │
│  │        │               │          │ dept_budgets   │   │     │
│  └────────────────────────────────────────────────────┘   │     │
└───────────────────────────────────────────────────────────────┘
```

### Request Flow (Simplified)

Every request to a protected endpoint follows this path:

```
Browser → CORS Check → Rate Limit Check → JWT Validation → Route Handler → Response
```

1. **CORS Middleware**: Checks if the request origin (http://localhost:3000) is allowed.
2. **Rate Limiter**: Checks if the IP has exceeded 30 requests/minute (100 for admin paths).
3. **Auth Middleware**: Extracts the JWT token from the `Authorization` header, decodes it, loads the user from the database.
4. **Route Handler**: Processes the request (chat, list conversations, etc.) and returns a response.

---

## 5. Project Structure — Every File Explained

### Backend Directory Structure

```
backend/
├── Dockerfile                    # Docker image definition for the backend
├── requirements.txt              # Python package dependencies
├── .env                          # Environment variables (API keys, DB config, secrets)
└── app/
    ├── __init__.py               # Makes 'app' a Python package (empty)
    ├── main.py                   # FastAPI entry point — creates the app, registers middleware & routes
    ├── config.py                 # Loads all configuration from .env using Pydantic Settings
    │
    ├── agents/
    │   ├── __init__.py           # Empty package init
    │   ├── orchestrator.py       # Core AI engine — sends queries to Claude, runs tool-use loop
    │   └── registry.py           # Department registry — maps department names to their tools/prompts/executors
    │
    ├── departments/
    │   ├── __init__.py           # Base interface (Protocol class) that all departments must implement
    │   ├── sales/
    │   │   ├── __init__.py       # Exports TOOLS, SYSTEM_PROMPT, execute_tool
    │   │   ├── prompts.py        # System prompt defining the Sales AI agent's personality & expertise
    │   │   └── tools.py          # Tool definitions (CRM, email, market) + mock handlers
    │   ├── finance/
    │   │   ├── __init__.py
    │   │   ├── prompts.py        # Finance agent system prompt
    │   │   └── tools.py          # Tool definitions (ERP, cash flow, compliance) + mock handlers
    │   ├── accounting/
    │   │   ├── __init__.py
    │   │   ├── prompts.py        # Accounting agent system prompt
    │   │   └── tools.py          # Tool definitions (invoices, reconciliation, tax) + mock handlers
    │   ├── restaurant/
    │   │   ├── __init__.py
    │   │   ├── prompts.py        # Restaurant agent system prompt
    │   │   ├── tools.py          # Tool definitions (menu, orders, stats) + real FCM API handlers
    │   │   └── data.py           # Static menu data for The Masala Twist (100+ real menu items with prices)
    │   └── logistics/
    │       ├── __init__.py
    │       ├── prompts.py        # Logistics agent system prompt
    │       └── tools.py          # Tool definitions (10 fleet tools) + real FleetHunt API integration
    │
    ├── api/
    │   ├── __init__.py           # Empty package init
    │   ├── auth.py               # Auth routes: POST /login, POST /register
    │   ├── chat.py               # Chat routes: POST /chat, GET /chat/stream (SSE)
    │   ├── conversations.py      # Conversation routes: GET /conversations, GET /conversations/{id}
    │   └── admin.py              # Admin routes: GET /usage, GET/PUT /config/{dept}, GET /insights
    │
    ├── db/
    │   ├── __init__.py           # Empty package init
    │   └── database.py           # SQLAlchemy engine setup, session factory, init_db(), seed default users
    │
    ├── middleware/
    │   ├── __init__.py           # Empty package init
    │   ├── auth_middleware.py     # JWT validation, get_current_user(), require_admin() dependencies
    │   └── rate_limiter.py       # In-memory sliding window rate limiter middleware
    │
    ├── models/
    │   ├── __init__.py           # Empty package init
    │   ├── user.py               # User model, Department enum, Role enum
    │   ├── conversation.py       # Conversation + Message models
    │   └── usage.py              # UsageRecord + DepartmentBudget models
    │
    └── services/
        ├── __init__.py           # Empty package init
        ├── auth_service.py       # Password hashing, JWT creation/decoding, user CRUD
        └── usage_service.py      # Records token/tool usage after each chat request
```

### Frontend Directory Structure

```
frontend/
├── Dockerfile                    # Multi-stage Docker build (deps → build → runner)
├── package.json                  # Node.js dependencies and scripts
├── next.config.js                # Next.js config (standalone output mode for Docker)
├── tailwind.config.ts            # Tailwind CSS configuration (custom colors, fonts, animations)
├── tsconfig.json                 # TypeScript configuration (path aliases, compiler options)
├── postcss.config.js             # PostCSS config (Tailwind + Autoprefixer plugins)
├── start.sh                      # Shell script for quick local development start
└── src/
    ├── app/
    │   ├── globals.css           # Tailwind directives + custom CSS (scrollbar, glass effects, animations)
    │   ├── layout.tsx            # Root HTML layout — metadata, font preloading, body wrapper
    │   ├── page.tsx              # Landing page — VRTek hero, features, CTA sections
    │   ├── login/
    │   │   └── page.tsx          # Login/Register form with department selection
    │   ├── chat/
    │   │   └── page.tsx          # Main chat interface — sidebar, messages, input, voice support
    │   ├── admin/
    │   │   └── page.tsx          # Admin dashboard — usage charts, KPIs, department insights
    │   └── services/
    │       ├── page.tsx          # Service catalog — 5 department AI services with descriptions
    │       └── [id]/
    │           └── page.tsx      # Individual service detail page with purchase flow
    │
    ├── components/
    │   └── chat/
    │       ├── index.ts          # Barrel export for all chat components
    │       ├── DashboardMessage.tsx  # Renders tool results as KPI cards, charts, tables
    │       ├── DashboardTable.tsx    # Data table with color-coded values and formatted headers
    │       ├── DonutChart.tsx        # Conic-gradient donut chart with legend
    │       └── MessageActions.tsx    # Copy, thumbs-up, thumbs-down buttons for messages
    │
    ├── departments/
    │   ├── index.ts              # Barrel export for department system
    │   ├── types.ts              # TypeScript types: DashboardKPI, ChartSegment, Integration, etc.
    │   ├── config.ts             # Department labels, colors, icons + quick prompts per department
    │   ├── dashboard.ts          # Transforms tool call results into dashboard data (KPIs, charts, tables)
    │   └── integrations.ts       # Integration definitions per department (FleetHunt, POS, QuickBooks, etc.)
    │
    ├── lib/
    │   └── api.ts                # API client — wraps all fetch calls with auth token injection
    │
    └── types/
        ├── index.ts              # Core TypeScript interfaces (User, ChatMessage, Conversation, etc.)
        └── speech-recognition.d.ts  # Web Speech API TypeScript type definitions
```

### Root Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Defines 2 services (backend + frontend) with volume for persistence |
| `README.md` | Quick start guide, tech stack, API endpoints, department tools overview |
| `PROJECT_GUIDE.md` | This file — complete technical deep-dive |
| `DOCUMENTATION.md` | Additional technical documentation |

---

## 6. Database Models & Relationships

### Entity-Relationship Diagram

```
┌──────────────────────────┐
│          users            │
├──────────────────────────┤
│ id:              VARCHAR(36) PK, UUID (auto-generated)
│ email:           VARCHAR(255) UNIQUE, NOT NULL, INDEXED
│ hashed_password: VARCHAR(255) NOT NULL (bcrypt hash)
│ full_name:       VARCHAR(255) NOT NULL
│ department:      ENUM(sales|finance|accounting|restaurant|logistics) NOT NULL, INDEXED
│ role:            ENUM(user|dept_admin|admin) NOT NULL, DEFAULT 'user'
│ is_active:       BOOLEAN, DEFAULT true
│ created_at:      DATETIME(tz), DEFAULT now()
│ updated_at:      DATETIME(tz), DEFAULT now(), auto-updates
└──────┬───────────────────┘
       │ 1 user → N conversations
       │ 1 user → N usage_records
       │
       ├──────────────────────────────────────────────┐
       ▼                                              ▼
┌──────────────────────────┐          ┌──────────────────────────┐
│      conversations       │          │      usage_records       │
├──────────────────────────┤          ├──────────────────────────┤
│ id:          VARCHAR(36) PK         │ id:               VARCHAR(36) PK
│ user_id:     VARCHAR(36) FK→users   │ user_id:          VARCHAR(36) FK→users
│ department:  VARCHAR(50) NOT NULL   │ department:       VARCHAR(50) NOT NULL, INDEXED
│ title:       VARCHAR(255) NULLABLE  │ input_tokens:     INTEGER, DEFAULT 0
│ created_at:  DATETIME(tz)           │ output_tokens:    INTEGER, DEFAULT 0
│ updated_at:  DATETIME(tz)           │ tool_calls_count: INTEGER, DEFAULT 0
│                                     │ model:            VARCHAR(50) NOT NULL
│ INDEXES:                            │ created_at:       DATETIME(tz)
│  - ix_conversations_user_dept       │
│    (user_id, department)            │ INDEXES:
└──────┬───────────────────┘          │  - ix_usage_dept_date (department, created_at)
       │ 1 conversation → N messages  │  - ix_usage_user_date (user_id, created_at)
       ▼                              └──────────────────────────┘
┌──────────────────────────┐
│        messages           │          ┌──────────────────────────┐
├──────────────────────────┤          │    department_budgets     │
│ id:              VARCHAR(36) PK     ├──────────────────────────┤
│ conversation_id: VARCHAR(36)        │ id:                    VARCHAR(36) PK
│                  FK→conversations   │ department:            VARCHAR(50) UNIQUE
│                  ON DELETE CASCADE  │ monthly_token_limit:   INTEGER, DEFAULT 2,000,000
│ role:            VARCHAR(20)        │ monthly_tool_call_limit: INTEGER, DEFAULT 5,000
│                  "user"|"assistant" │ max_concurrent_users:  INTEGER, DEFAULT 50
│ content:         TEXT NOT NULL       │ alert_threshold_pct:   INTEGER, DEFAULT 75
│ tool_calls:      JSON NULLABLE      │ updated_at:            DATETIME(tz)
│ token_count:     INTEGER NULLABLE   └──────────────────────────┘
│ created_at:      DATETIME(tz)
│
│ INDEXES:
│  - ix_messages_conversation
│    (conversation_id, created_at)
└──────────────────────────┘
```

### Key Relationships Explained

**users → conversations (One-to-Many)**
One user can have many conversations. Each conversation belongs to exactly one user and one department. The composite index `(user_id, department)` speeds up the most common query: "get all conversations for this user in this department."

**conversations → messages (One-to-Many, CASCADE DELETE)**
One conversation has many messages (the chat history). When a conversation is deleted, all its messages are automatically deleted (`ON DELETE CASCADE`). Messages store both user messages and assistant responses. The `tool_calls` JSON field stores the tool call details (which tools were used, their inputs and outputs).

**users → usage_records (One-to-Many)**
Every chat request generates a usage record that tracks how many tokens were consumed and how many tool calls were made. This is used by the admin dashboard for analytics.

**department_budgets (Standalone)**
One row per department. Stores monthly limits for tokens and tool calls. Not linked to users via foreign key — it's a configuration table.

### Department Enum Values
```python
class Department(str, enum.Enum):
    SALES = "sales"
    FINANCE = "finance"
    ACCOUNTING = "accounting"
    RESTAURANT = "restaurant"
    LOGISTICS = "logistics"
```

### Role Enum Values
```python
class Role(str, enum.Enum):
    USER = "user"           # Regular user — can chat with their department's agent
    DEPT_ADMIN = "dept_admin" # Department admin — can see department-level analytics
    ADMIN = "admin"           # Super admin — can see all departments, manage budgets
```

### Why UUIDs Instead of Auto-Increment IDs?
The project uses UUID strings (e.g., `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`) as primary keys instead of auto-incrementing integers. This is because:
1. **Security**: Auto-increment IDs are predictable (1, 2, 3...). UUIDs are random and can't be guessed.
2. **Distributed systems**: UUIDs can be generated on any server without coordination.
3. **Privacy**: You can't infer how many users/conversations exist from a UUID.

---

## 7. Authentication Flow (End-to-End)

### 7.1 Registration Flow

```
Step 1: User fills registration form
        - Full name, email, password
        - Selects department (sales/finance/accounting/restaurant/logistics)

Step 2: Frontend sends POST /api/v1/auth/register
        Body: {
          email: "user@example.com",
          password: "mypassword",
          full_name: "John Doe",
          department: "logistics"
        }

Step 3: Backend receives request (auth.py → register endpoint)
        → Pydantic validates the request body (RegisterRequest model)
        → Calls create_user(db, email, password, full_name, department, Role.USER)

Step 4: auth_service.py → create_user()
        → hash_password("mypassword")
          → bcrypt generates a salt (random string)
          → bcrypt hashes password + salt → "$2b$12$LJ2QE4..." (60 chars)
          → This hash is IRREVERSIBLE — you can never get "mypassword" back from it
        → Creates User ORM object with UUID id
        → Inserts into database
        → Returns the User object

Step 5: Backend creates JWT token
        → create_access_token(user_id, department, role)
        → Payload: {
            "sub": "uuid-of-the-user",      # "sub" = subject (standard JWT claim)
            "department": "logistics",
            "role": "user",
            "exp": 1743897600                 # Unix timestamp, 60 minutes from now
          }
        → Signs payload with SECRET_KEY using HS256 algorithm
        → Returns: "eyJhbGciOiJIUzI1NiIs..." (base64-encoded token)

Step 6: Backend returns response
        {
          "access_token": "eyJhbGciOiJIUzI1NiIs...",
          "token_type": "bearer",
          "department": "logistics",
          "role": "user",
          "full_name": "John Doe"
        }

Step 7: Frontend stores in localStorage
        localStorage.setItem("token", "eyJhbGciOiJIUzI1NiIs...")
        localStorage.setItem("department", "logistics")
        localStorage.setItem("role", "user")
        localStorage.setItem("fullName", "John Doe")
        → Redirects to /chat
```

### 7.2 Login Flow

```
Step 1: User enters email + password on login form

Step 2: Frontend sends POST /api/v1/auth/login
        Body: { "email": "admin@gmail.com", "password": "admin" }

Step 3: Backend → auth.py → login endpoint
        → Calls authenticate_user(db, email, password)

Step 4: auth_service.py → authenticate_user()
        → SELECT * FROM users WHERE email = 'admin@gmail.com' AND is_active = true
        → If user not found → return None → 401 "Invalid credentials"
        → verify_password("admin", stored_hash)
          → bcrypt.checkpw("admin".encode(), stored_hash.encode())
          → bcrypt internally extracts the salt from stored_hash
          → bcrypt hashes "admin" with that salt
          → Compares: if match → True, else → False
        → If password wrong → return None → 401 "Invalid credentials"
        → If correct → return the User object

Step 5-7: Same as registration (create token, return response, store in localStorage)
```

### 7.3 How Every Authenticated Request Works

```
Step 1: Frontend makes API call
        api.ts → fetch("/api/v1/chat", { method: "POST", body: ... })
        → Gets token from localStorage
        → Adds header: "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."

Step 2: FastAPI route has dependency: current_user = Depends(get_current_user)

Step 3: auth_middleware.py → get_current_user()
        → HTTPBearer extracts token from "Authorization: Bearer <token>" header
        → Calls decode_access_token(token)

Step 4: auth_service.py → decode_access_token()
        → jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        → If token is expired → JWTError → returns None
        → If signature is invalid (tampered) → JWTError → returns None
        → If valid → returns payload: {"sub": "user-uuid", "department": "logistics", "role": "admin"}

Step 5: auth_middleware.py continues
        → If None → 401 "Invalid or expired token"
        → Extracts user_id from payload["sub"]
        → Queries: SELECT * FROM users WHERE id = user_id
        → If not found or is_active=False → 401 "User not found or inactive"
        → Returns CurrentUser(id=..., department="logistics", role="admin")

Step 6: Route handler receives CurrentUser object and uses it to:
        → Know which department the user belongs to
        → Load only that department's conversations
        → Route to the correct AI agent
```

### 7.4 Admin Authorization

```python
async def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```

Admin endpoints use `Depends(require_admin)` instead of `Depends(get_current_user)`. This first runs `get_current_user` (JWT validation), then checks if the role is "admin". If not, returns 403 Forbidden.

---

## 8. Chat & Agent Workflow (End-to-End)

This is the **most important and complex flow** in the entire project. Let's trace every step from the moment a user types a message to seeing the response:

### Step-by-Step Walkthrough

```
═══════════════════════════════════════════════════════════════
STEP 1: USER TYPES A MESSAGE
═══════════════════════════════════════════════════════════════

User (Logistics department, admin role) types in the chat input:
"Show me idle vehicles"

The chat/page.tsx component captures this in the handleSubmit() function.


═══════════════════════════════════════════════════════════════
STEP 2: FRONTEND SENDS API REQUEST
═══════════════════════════════════════════════════════════════

api.ts → sendMessage("Show me idle vehicles", null)
→ POST http://localhost:8000/api/v1/chat
→ Headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
  }
→ Body: {
    "message": "Show me idle vehicles",
    "conversation_id": null           // null = new conversation
  }


═══════════════════════════════════════════════════════════════
STEP 3: BACKEND RECEIVES & VALIDATES
═══════════════════════════════════════════════════════════════

FastAPI receives the request at chat.py → send_message()

Dependency injection runs:
  1. get_current_user() → validates JWT → returns CurrentUser(
       id="abc-123",
       department="logistics",
       role="admin"
     )
  2. get_db() → creates an async database session


═══════════════════════════════════════════════════════════════
STEP 4: CREATE OR LOAD CONVERSATION
═══════════════════════════════════════════════════════════════

Since conversation_id is null, create a new conversation:

  conversation = Conversation(
    user_id="abc-123",
    department="logistics",
    title="Show me idle vehicles"    # First 100 chars of message as title
  )
  db.add(conversation)
  await db.flush()  # Gets the auto-generated UUID id


═══════════════════════════════════════════════════════════════
STEP 5: LOAD CONVERSATION HISTORY
═══════════════════════════════════════════════════════════════

SELECT * FROM messages
WHERE conversation_id = 'new-conv-id'
ORDER BY created_at

Result: [] (empty — this is a new conversation)


═══════════════════════════════════════════════════════════════
STEP 6: SAVE USER MESSAGE TO DATABASE
═══════════════════════════════════════════════════════════════

user_msg = Message(
  conversation_id="new-conv-id",
  role="user",
  content="Show me idle vehicles"
)
db.add(user_msg)
await db.flush()


═══════════════════════════════════════════════════════════════
STEP 7: CALL THE AGENT ORCHESTRATOR
═══════════════════════════════════════════════════════════════

orchestrator.process_query(
  department="logistics",
  user_message="Show me idle vehicles",
  conversation_history=[]            # Empty for new conversations
)


═══════════════════════════════════════════════════════════════
STEP 8: ORCHESTRATOR PREPARES CLAUDE API CALL
═══════════════════════════════════════════════════════════════

orchestrator.py → process_query():

  a) Lookup department via registry:
     system_prompt = registry.get_prompt("logistics")
     → Returns the LOGISTICS_SYSTEM_PROMPT (from logistics/prompts.py)
       "You are a Logistics AI Agent for the organization..."

     tools = registry.get_tools("logistics")
     → Returns list of 10 tool definitions:
       [get_fleet_location, get_vehicle_by_name, get_vehicle_by_id,
        get_moving_vehicles, get_idle_vehicles, get_stopped_vehicles,
        get_fleet_summary, get_vehicles_near_location,
        get_speeding_vehicles, get_live_tracking]

  b) Build messages array:
     messages = [
       {"role": "user", "content": "Show me idle vehicles"}
     ]

  c) Call Claude API:
     response = await self.client.messages.create(
       model="claude-sonnet-4-20250514",
       max_tokens=4096,
       system=system_prompt,
       tools=tools,          # Claude now knows what tools are available
       messages=messages
     )


═══════════════════════════════════════════════════════════════
STEP 9: CLAUDE DECIDES TO USE A TOOL
═══════════════════════════════════════════════════════════════

Claude reads the user's question and the tool definitions.
Claude thinks: "The user wants idle vehicles. I have a tool called
'get_idle_vehicles' that does exactly this."

Claude responds:
{
  "stop_reason": "tool_use",         ← This means "I want to use a tool first"
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_123abc",
      "name": "get_idle_vehicles",   ← The tool Claude wants to call
      "input": {}                     ← No parameters needed for this tool
    }
  ],
  "usage": { "input_tokens": 1250, "output_tokens": 58 }
}


═══════════════════════════════════════════════════════════════
STEP 10: ORCHESTRATOR EXECUTES THE TOOL
═══════════════════════════════════════════════════════════════

The orchestrator sees stop_reason == "tool_use", so it enters the tool loop:

  a) Append Claude's response to messages:
     messages.append({
       "role": "assistant",
       "content": [tool_use_block]    # Claude's response with the tool request
     })

  b) For each tool_use block, execute the tool:
     tool_result = await registry.execute_tool(
       "logistics", "get_idle_vehicles", {}
     )

  c) This calls logistics/tools.py → execute_tool("get_idle_vehicles", {}):
     → Calls _fleethunt_get_active_fleet()
       → HTTP GET https://app.fleethunt.ca/api/fleet?api_token=xxx
       → FleetHunt returns: {"status": 1, "devices": [...280 devices...]}
       → Filters: only devices that reported in last 7 days → ~200 active devices
     → Filters active devices where: speed == 0 AND ignition == 1 (idle)
     → Returns: {
         "results": [
           {"device_id":"1234","name":"Truck 42","status":"idle",...},
           {"device_id":"5678","name":"Van 15","status":"idle",...},
           {"device_id":"9012","name":"Truck 78","status":"idle",...}
         ],
         "total": 3
       }

  d) Track the tool call:
     all_tool_calls.append({
       "tool": "get_idle_vehicles",
       "input": {},
       "output": {results: [...], total: 3}
     })


═══════════════════════════════════════════════════════════════
STEP 11: ORCHESTRATOR FEEDS RESULT BACK TO CLAUDE
═══════════════════════════════════════════════════════════════

  a) Append tool result to messages:
     messages.append({
       "role": "user",
       "content": [{
         "type": "tool_result",
         "tool_use_id": "toolu_123abc",    # Links to Claude's original request
         "content": '{"results":[...]}'     # JSON string of the tool output
       }]
     })

  b) Messages now look like:
     [
       {"role": "user", "content": "Show me idle vehicles"},
       {"role": "assistant", "content": [tool_use_block]},
       {"role": "user", "content": [tool_result]}
     ]

  c) Call Claude API again with the updated messages:
     response = await self.client.messages.create(
       model="claude-sonnet-4-20250514",
       max_tokens=4096,
       system=system_prompt,
       tools=tools,
       messages=messages      # Now includes the tool result
     )


═══════════════════════════════════════════════════════════════
STEP 12: CLAUDE GIVES FINAL ANSWER
═══════════════════════════════════════════════════════════════

Claude now has the real GPS data. It generates a formatted response:

{
  "stop_reason": "end_turn",         ← "I'm done, here's my final answer"
  "content": [
    {
      "type": "text",
      "text": "I found **3 idle vehicles** in the fleet...\n\n
               | Vehicle | Location | Engine | Duration |\n
               |---------|----------|--------|----------|\n
               | Truck 42 | 43.65, -79.38 | On | ... |\n
               ..."
    }
  ],
  "usage": { "input_tokens": 1800, "output_tokens": 250 }
}

The orchestrator sees stop_reason == "end_turn" and exits the loop.


═══════════════════════════════════════════════════════════════
STEP 13: SAVE EVERYTHING TO DATABASE
═══════════════════════════════════════════════════════════════

  a) Save assistant message:
     assistant_msg = Message(
       conversation_id="new-conv-id",
       role="assistant",
       content="I found **3 idle vehicles**...",
       tool_calls=[{"tool":"get_idle_vehicles","input":{},"output":{...}}],
       token_count=3358     # 1250+58+1800+250
     )

  b) Record usage:
     UsageRecord(
       user_id="abc-123",
       department="logistics",
       input_tokens=3050,    # 1250 + 1800
       output_tokens=308,    # 58 + 250
       tool_calls_count=1,
       model="claude-sonnet-4-20250514"
     )


═══════════════════════════════════════════════════════════════
STEP 14: RETURN RESPONSE TO FRONTEND
═══════════════════════════════════════════════════════════════

{
  "conversation_id": "new-conv-id",
  "message": "I found **3 idle vehicles** in the fleet...",
  "tool_calls": [
    {
      "tool": "get_idle_vehicles",
      "input": {},
      "output": {
        "results": [...],
        "total": 3
      }
    }
  ]
}


═══════════════════════════════════════════════════════════════
STEP 15: FRONTEND RENDERS THE RESPONSE
═══════════════════════════════════════════════════════════════

chat/page.tsx receives the response and checks:
  - Has tool_calls? Yes → render DashboardMessage component
  - DashboardMessage calls extractDashboardData(tool_calls, "logistics")

  dashboard.ts processes "get_idle_vehicles" for logistics dept:
  → Creates KPI card: "IDLE VEHICLES: 3 (Engine on, stationary)"
  → Sets badge: "3 vehicles idle"
  → Sets followUps: ["Fleet summary overview", "Show stopped vehicles",
                      "Show moving vehicles"]
  → Passes results to DashboardTable for tabular display

  The user sees:
  ┌──────────────────────────────────────────────────┐
  │  [Badge: 3 vehicles idle]                         │
  │                                                   │
  │  ┌──────────────┐                                │
  │  │ IDLE VEHICLES │                                │
  │  │     3         │                                │
  │  │ Engine on     │                                │
  │  └──────────────┘                                │
  │                                                   │
  │  I found **3 idle vehicles** in the fleet...      │
  │                                                   │
  │  ┌─────────────────────────────────────────────┐ │
  │  │ Vehicle  │ Speed  │ Ignition │ Location     │ │
  │  │ Truck 42 │ 0 km/h │ on       │ 43.65,-79.38│ │
  │  │ Van 15   │ 0 km/h │ on       │ 45.50,-73.57│ │
  │  │ Truck 78 │ 0 km/h │ on       │ 44.23,-78.35│ │
  │  └─────────────────────────────────────────────┘ │
  │                                                   │
  │  [Fleet summary] [Stopped vehicles] [Moving]      │
  └──────────────────────────────────────────────────┘
```

### What If Claude Needs Multiple Tool Calls?

The tool-use loop handles this automatically. Example:

```
User: "Compare moving and idle vehicles counts"

→ Claude calls get_moving_vehicles (1st tool)
→ Backend executes, feeds result back
→ Claude calls get_idle_vehicles (2nd tool)   ← Claude wants more data!
→ Backend executes, feeds result back
→ Claude now has both datasets → gives final comparison answer
```

The `while True` loop in `orchestrator.py` continues until Claude returns `stop_reason: "end_turn"`.

---

## 9. The Department Registry Pattern

The project uses a **registry pattern** to cleanly separate department-specific logic from the core orchestrator. This is a key architectural decision.

### How It Works

```python
# registry.py — The central mapping
_REGISTRY = {
    "sales":      { "tools": ..., "prompt": ..., "execute": ... },
    "finance":    { "tools": ..., "prompt": ..., "execute": ... },
    "accounting": { "tools": ..., "prompt": ..., "execute": ... },
    "restaurant": { "tools": ..., "prompt": ..., "execute": ... },
    "logistics":  { "tools": ..., "prompt": ..., "execute": ... },
}
```

Each department module (e.g., `departments/logistics/`) must export exactly 3 things:
1. `TOOLS` — A list of Claude tool-use definitions (JSON-compatible dicts)
2. `SYSTEM_PROMPT` — The system prompt string that defines the agent's personality
3. `execute_tool(tool_name, tool_input) -> dict` — An async function that runs the actual tool

### Three Public Functions

```python
def get_tools(department: str) -> list[dict]:
    """Return tool definitions for a department."""

def get_prompt(department: str) -> str:
    """Return the system prompt for a department."""

async def execute_tool(department: str, tool_name: str, tool_input: dict) -> dict:
    """Execute a specific tool for a department."""
```

### Why This Pattern?

1. **The orchestrator is department-agnostic** — It doesn't know or care about FleetHunt, restaurant menus, or CRM data. It just says "give me the tools and prompt for department X" and runs the loop.
2. **Adding a new department is easy** — Create a new folder under `departments/`, implement the 3 exports, and add one line to the registry. No changes to the orchestrator needed.
3. **Each department is fully isolated** — The restaurant code can't accidentally access logistics tools.
4. **Testing is simpler** — You can test each department's tools independently.

### The Protocol Interface

```python
# departments/__init__.py defines the expected interface:
class DepartmentModule(Protocol):
    TOOLS: list[dict[str, Any]]
    SYSTEM_PROMPT: str
    async def execute_tool(self, tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]: ...
```

This is a Python `Protocol` — a way to define "any module that has these attributes/methods is valid" without requiring inheritance. It's like a TypeScript interface but for Python.

---

## 10. All API Endpoints (Detailed)

### Authentication Endpoints

#### `POST /api/v1/auth/login`
- **Purpose**: Authenticate an existing user
- **Auth required**: No
- **Request body**:
  ```json
  { "email": "admin@gmail.com", "password": "admin" }
  ```
- **Success response** (200):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "department": "logistics",
    "role": "admin",
    "full_name": "Logistics Admin"
  }
  ```
- **Error responses**:
  - 401: Invalid credentials (wrong email or password)
  - 422: Validation error (missing fields)

#### `POST /api/v1/auth/register`
- **Purpose**: Create a new user account
- **Auth required**: No
- **Request body**:
  ```json
  {
    "email": "newuser@example.com",
    "password": "securepassword",
    "full_name": "New User",
    "department": "finance"
  }
  ```
- **Success response** (201): Same format as login
- **Error responses**:
  - 409: Email already registered
  - 422: Validation error

### Chat Endpoints

#### `POST /api/v1/chat`
- **Purpose**: Send a message to the department's AI agent
- **Auth required**: Yes (Bearer token)
- **Request body**:
  ```json
  {
    "message": "Show me idle vehicles",
    "conversation_id": null
  }
  ```
- **Success response** (200):
  ```json
  {
    "conversation_id": "uuid-of-conversation",
    "message": "I found 3 idle vehicles...",
    "tool_calls": [
      {
        "tool": "get_idle_vehicles",
        "input": {},
        "output": { "results": [...], "total": 3 }
      }
    ]
  }
  ```
- **Error responses**:
  - 401: Invalid/expired token
  - 404: Conversation not found

#### `GET /api/v1/chat/stream`
- **Purpose**: Stream a response via Server-Sent Events
- **Auth required**: Yes (Bearer token)
- **Query parameters**: `message` (required), `conversation_id` (optional)
- **Response**: SSE stream with `message` and `done` events
- **Note**: Streaming only covers the final text response. Tool execution happens server-side before streaming begins.

### Conversation Endpoints

#### `GET /api/v1/conversations`
- **Purpose**: List the current user's recent conversations (max 50)
- **Auth required**: Yes
- **Scoping**: Only conversations for the user's own department

#### `GET /api/v1/conversations/{conversation_id}`
- **Purpose**: Get full conversation with all messages
- **Auth required**: Yes
- **Security**: Users can only access their own conversations in their department

### Admin Endpoints (Admin Role Required)

#### `GET /api/v1/admin/usage?days=30`
- **Purpose**: Aggregated usage metrics per department for the given period

#### `GET /api/v1/admin/config/{dept}`
- **Purpose**: Get department budget configuration + current month usage

#### `PUT /api/v1/admin/config/{dept}`
- **Purpose**: Update department budget limits

#### `GET /api/v1/admin/insights`
- **Purpose**: Get KPI insights for all departments (mock data for demo)

### Health Check

#### `GET /health`
- **Auth required**: No
- **Response**: `{ "status": "healthy", "service": "multi-dept-ai-portal" }`

---

## 11. Department Agents & Tools (In Depth)

### How Each Department Is Structured

Every department has the same structure under `backend/app/departments/<dept>/`:

```
<dept>/
├── __init__.py    # Exports: TOOLS, SYSTEM_PROMPT, execute_tool
├── prompts.py     # Defines SYSTEM_PROMPT (the AI agent's personality and rules)
└── tools.py       # Defines TOOLS (list of tool definitions) + execute_tool (handler)
```

### System Prompts — What They Do

The **system prompt** tells Claude:
1. **Who it is**: "You are a Logistics AI Agent..."
2. **What it can do**: "You have access to real-time GPS tracking data..."
3. **How to behave**: "Always present location data as current/real-time..."
4. **What NOT to do**: "Never share data from other departments..."
5. **How to format**: "Structure every response as: 1. Summary, 2. Key insights, 3. Recommendation"

### Sales Agent
- **Tools**: `query_crm` (leads, deals, contacts, pipeline), `search_email_logs`, `get_market_data`
- **Data**: Mock — returns hardcoded sample deals, emails, market insights
- **Use case**: Pipeline analysis, lead scoring, competitive intelligence

### Finance Agent
- **Tools**: `query_erp` (GL accounts, transactions, budgets), `get_cash_flow_forecast`, `check_compliance`
- **Data**: Mock — returns sample GL balances, 3-month forecast, compliance status
- **Use case**: Financial reporting, cash flow management, regulatory checks

### Accounting Agent
- **Tools**: `query_invoices` (AP/AR), `reconcile_accounts`, `calculate_tax`
- **Data**: Mock — returns sample invoices, bank reconciliation, 21% tax calculation
- **Use case**: Invoice tracking, account reconciliation, tax estimation

### Restaurant Agent (The Masala Twist)
- **Tools**: `query_menu`, `get_orders`, `get_order_stats`
- **Data**: **Real menu** (100+ items in `data.py`) + **Real orders** (FCM API)
- **Use case**: Menu browsing, dietary recommendations, order analytics

### Logistics Agent (FleetHunt GPS)
- **Tools**: 10 fleet tracking tools (see next section)
- **Data**: **Real GPS data** from FleetHunt API
- **Use case**: Vehicle tracking, fleet analytics, proximity search

---

## 12. FleetHunt GPS Integration (Logistics)

This is the most complex integration — it connects to a real, production GPS tracking system.

### What Is FleetHunt?

FleetHunt is a real GPS fleet management platform at `https://app.fleethunt.ca`. It returns real-time GPS positions, speed, heading, ignition state, and odometer for all tracked vehicles.

### How the Integration Works

```
User asks about vehicles
         │
         ▼
Claude selects the right tool (e.g., get_idle_vehicles)
         │
         ▼
Our backend calls:
  GET https://app.fleethunt.ca/api/fleet?api_token=<key>
         │
         ▼
FleetHunt returns: { "status": 1, "devices": [...~280 devices...] }
         │
         ▼
Our code:
  1. Filters stale devices (no data in 7+ days)
  2. Applies tool-specific filter (e.g., speed==0 AND ignition==1)
  3. Extracts key fields into summary objects
         │
         ▼
Returns processed data → Claude interprets → User sees the answer
```

### All 10 Logistics Tools

| # | Tool | What It Does | Filter Logic |
|---|---|---|---|
| 1 | `get_fleet_location` | All vehicle positions | Active devices only |
| 2 | `get_vehicle_by_name` | Search by name | Partial case-insensitive match |
| 3 | `get_vehicle_by_id` | Get specific vehicle | Direct device_id lookup |
| 4 | `get_moving_vehicles` | Vehicles driving | `speed > 0` |
| 5 | `get_idle_vehicles` | Engine on, not moving | `speed == 0 AND ignition == 1` |
| 6 | `get_stopped_vehicles` | Engine off, parked | `speed == 0 AND ignition == 0` |
| 7 | `get_fleet_summary` | Count by status | Aggregate counts |
| 8 | `get_vehicles_near_location` | Proximity search | Haversine formula ≤ radius_km |
| 9 | `get_speeding_vehicles` | Over speed limit | `speed > threshold_kmh` (default 100) |
| 10 | `get_live_tracking` | Full device data | All fields for one device |

### Vehicle Status Logic

```python
if speed > 0:          → "moving"     # Vehicle is driving
if speed == 0 AND ignition == 1:      → "idle"  # Engine on, not moving (wasting fuel!)
if speed == 0 AND ignition == 0:      → "stopped"  # Engine off, parked
```

### Active Device Filtering

Devices that haven't reported in 7+ days are excluded:

```python
def _is_active_device(d, max_stale_days=7):
    device_time = parse(d["device_time"])      # "2026-04-01 10:30:00"
    cutoff = now() - timedelta(days=7)
    return device_time >= cutoff               # True if reported recently
```

### The Haversine Formula (Proximity Search)

Calculates the distance between two GPS coordinates on Earth:

```python
def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth's radius in km
    # ... trigonometric calculation ...
    return distance_in_kilometres
```

Used by `get_vehicles_near_location` to find vehicles within a given radius.

### Error Handling

```python
try:
    # FleetHunt API call
except httpx.HTTPError as exc:
    return {"error": f"FleetHunt API error: {exc}"}
except Exception as exc:
    return {"error": f"Logistics tool error: {exc}"}
```

If FleetHunt is down, Claude gets the error and tells the user gracefully.

---

## 13. Restaurant Integration (The Masala Twist)

### Menu Data (`data.py`)

Real menu data from an actual Indian restaurant in Oxnard, CA:

- **100+ menu items** across 14 categories
- Each item: `name`, `price`, `description`, optional `tags` (e.g., `["Vegan"]`)
- **Price range**: $1.95 to $23.95
- **Categories**: appetizers, soups/salads, chicken curries, lamb curries, goat curries, tandoori, seafood, vegetarian, breads, desserts, biryanis, kids menu

### Menu Query Intelligence

The `query_menu` tool handles:
1. **Category browse**: `category: "chicken_curries"` → All chicken curries
2. **Cross-category search**: `query: "vegan"` → Searches names, descriptions, tags
3. **Full overview**: `category: "all"` → Item counts and price ranges per category
4. **Popular items**: `category: "popular"` → 18 curated favourites
5. **Combined**: `category: "breads", query: "garlic"` → Garlic bread options

### Order API (FCM Backend)

`get_orders` and `get_order_stats` call a real POS system:
```
GET {FCM_BACKEND_URL}/orders?limit=20&offset=0
Authorization: Bearer {FCM_BACKEND_SECRET}
```

---

## 14. Frontend Pages & UI Flow (In Depth)

### Page Navigation Map

```
http://localhost:3000/
│
├── / (Landing Page)
│   ├── VRTek Consulting hero section with dual panels
│   ├── Feature cards: AI Insights, Multi-Integration Hub, Security
│   ├── CTA section with call-to-action
│   └── Navigation: [Login] [Explore Services]
│
├── /login
│   ├── Dual-panel: left gradient + testimonial, right form
│   ├── Email/password fields with show/hide toggle
│   ├── Error handling display
│   └── On success → localStorage → redirect to /chat
│
├── /chat (Protected — needs token)
│   ├── Left Sidebar:
│   │   ├── Department integrations list
│   │   ├── Conversation history (last 50)
│   │   ├── User info (name, department)
│   │   └── Sign out button
│   ├── Main Area:
│   │   ├── Welcome screen with quick prompt cards
│   │   ├── Message list (user + assistant)
│   │   ├── Dashboard visualization (KPIs, charts, tables)
│   │   └── Input bar (text + voice + send/stop)
│   └── Special Features:
│       ├── Voice input (Web Speech API)
│       ├── Abort in-flight requests
│       ├── Copy message content
│       ├── Thumbs up/down feedback
│       └── Follow-up action buttons
│
├── /admin (Protected — admin role)
│   ├── Summary KPI cards (tokens, requests, cost, etc.)
│   ├── Bar chart: Input vs Output tokens by department
│   ├── Pie chart: Token share by department
│   ├── Cost breakdown table
│   ├── Department insights with trend arrows
│   └── Period selector: 7 / 14 / 30 / 90 days
│
├── /services
│   ├── 5 service cards (Logistics AI, Restaurant AI, etc.)
│   ├── "Most Popular" badge
│   └── Links to detail pages
│
└── /services/[id]
    ├── Full service description with features
    ├── Integration showcase
    ├── Pricing card with purchase flow
    └── Demo credentials with copy buttons
```

### Key Frontend Patterns

**1. Token-based routing**: The landing page checks `localStorage` for a token. If present, redirects to `/chat`.

**2. Department-aware UI**: The chat page reads the user's department from localStorage and shows department-specific quick prompts, integrations, and colors.

**3. Dashboard responses**: Tool call results are transformed into KPIs, charts, and tables (not just plain text).

**4. Voice input**: Web Speech API transcribes spoken queries into the input field.

**5. Abort support**: `AbortController` + `signal` on `fetch()` lets users cancel long-running AI requests.

---

## 15. Frontend Department System

### `departments/config.ts`

Defines visual identity and preset prompts per department:
- **Labels**: "Sales", "Finance", "Accounting", "Restaurant", "Logistics"
- **Colors**: blue, green, purple, orange, teal
- **Icons**: 📊, 💰, 📒, 🍽️, 🚛
- **Quick prompts**: 4-10 preset questions per department (e.g., "Fleet Overview" for logistics)

### `departments/integrations.ts`

Maps third-party services to departments:
- **Logistics**: FleetHunt (connected), Samsara (not connected), Highway (not connected)
- **Restaurant**: Restaurant POS (connected)
- **Finance**: QuickBooks (not connected), Triumph Pay (not connected)

### `departments/dashboard.ts`

The `extractDashboardData()` function transforms tool results into structured dashboard data:

For each department and tool combination, it creates:
- **KPI cards**: Label, value, subtitle, color
- **Chart segments**: For donut/pie visualization
- **Data tables**: Raw results in tabular format
- **Follow-up actions**: Suggested next queries

Example for `get_fleet_summary` in logistics:
```
KPIs: [TOTAL FLEET: 200, MOVING: 87, IDLE: 17, STOPPED: 96]
Chart: [Moving: 87 (teal), Idle: 17 (amber), Stopped: 96 (gray)]
Badge: "200 vehicles tracked"
Follow-ups: ["Show stopped vehicles", "Idle time report", ...]
```

---

## 16. Dashboard Visualization System

### Component Hierarchy

```
DashboardMessage
├── Title + Badge
├── KPI Cards Row (DashboardKPI[])
├── DonutChart (ChartSegment[])
├── AI Markdown Content (react-markdown)
├── DashboardTable (rows[])
└── Follow-up Actions (clickable buttons)
```

### DashboardTable
- Auto-formats headers from snake_case
- Color-codes values (speeds, statuses, amounts)
- Shows max 25 rows with count indicator
- Gradient header with brand colors

### DonutChart
- Pure CSS conic-gradient (no charting library)
- Center label with total count
- Legend with colored squares

### MessageActions
- Copy message to clipboard
- Thumbs up/down feedback (UI-only)
- Hover-activated with transitions

---

## 17. Middleware (Auth + Rate Limiting)

### Request Pipeline

```
Request → CORS → Rate Limiter → Auth (per-route) → Handler
```

### CORS Middleware

Allows the frontend (localhost:3000) to call the backend (localhost:8000). Without CORS, browsers block cross-origin requests.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", ...],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Rate Limiter

**Algorithm**: In-memory sliding window (1-minute window)

1. Create key: `"{client_ip}:{request_path}"`
2. Remove timestamps older than 60 seconds
3. If count ≥ limit → 429 Too Many Requests
4. Otherwise → allow and record timestamp

**Limits**: 30 req/min default, 100 req/min for admin paths.

**Response headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

**Note**: In-memory only — resets on restart. Use Redis in production.

### Auth Middleware

Uses FastAPI dependency injection (`Depends(get_current_user)`):
1. Extract Bearer token from Authorization header
2. Decode JWT (verify signature + expiry)
3. Load user from database
4. Return `CurrentUser(id, department, role)`

For admin routes: `Depends(require_admin)` → checks `role == "admin"` after auth.

---

## 18. Environment Variables

All config loaded from `backend/.env` via Pydantic Settings:

### Core Settings

| Variable | Default | Required | Description |
|---|---|---|---|
| `APP_NAME` | multi-dept-ai-portal | No | App identifier |
| `APP_ENV` | development | No | Controls SQL logging |
| `SECRET_KEY` | change-me-... | **Yes** | JWT signing key (use 32+ random chars in production) |
| `CORS_ORIGINS` | http://localhost:3000,... | No | Comma-separated allowed origins |

### Database

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | sqlite+aiosqlite:///./ai_portal.db | Dev: SQLite. Prod: postgresql+asyncpg://... |
| `REDIS_URL` | redis://localhost:6379/0 | Reserved for future use |

### AI

| Variable | Default | Required | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | (empty) | **Yes** | Claude API key from https://console.anthropic.com |

### Auth

| Variable | Default | Description |
|---|---|---|
| `JWT_ALGORITHM` | HS256 | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 60 | Token validity period |
| `RATE_LIMIT_DEFAULT` | 30 | Requests/min for regular paths |
| `RATE_LIMIT_ADMIN` | 100 | Requests/min for admin paths |

### Integrations

| Variable | Default | Description |
|---|---|---|
| `FLEETHUNT_BASE_URL` | https://app.fleethunt.ca/api | FleetHunt GPS API |
| `FLEETHUNT_API_KEY` | (empty) | FleetHunt auth token |
| `FCM_BACKEND_URL` | (empty) | Restaurant order system URL |
| `FCM_BACKEND_SECRET` | (empty) | Restaurant auth secret |

### Frontend

| Variable | Where | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend env | Backend URL. Default: http://localhost:8000 |

---

## 19. Docker Setup

### docker-compose.yml

```yaml
services:
  backend:
    build: ./backend            # Build from backend/Dockerfile
    ports: ["8000:8000"]
    env_file: ./backend/.env
    volumes: [backend-data:/app/data]

  frontend:
    build: ./frontend           # Build from frontend/Dockerfile (multi-stage)
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    depends_on: [backend]

volumes:
  backend-data:
```

### Backend Dockerfile
- Python 3.12-slim base image
- Installs requirements.txt
- Runs uvicorn on port 8000

### Frontend Dockerfile (Multi-Stage)
- **Stage 1 (deps)**: Install npm packages
- **Stage 2 (builder)**: Build Next.js production bundle
- **Stage 3 (runner)**: Copy only standalone output, run with `node server.js`

Multi-stage keeps the final image small (no source code, no dev dependencies).

---

## 20. How to Run (Step by Step)

### Option A: Local Development

#### Prerequisites
- Python 3.12+
- Node.js 20+
- Anthropic API key

#### Backend Setup

```powershell
cd c:\Users\kanwa\multi-dept-ai-portal-new\backend
python -m venv ../venv
..\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

#### Configure `.env`

Edit `backend/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
SECRET_KEY=your-random-secret-key-at-least-32-chars-long
```

#### Start Backend

```powershell
cd c:\Users\kanwa\multi-dept-ai-portal-new
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000 --app-dir backend
```

#### Start Frontend (New Terminal)

```powershell
cd c:\Users\kanwa\multi-dept-ai-portal-new\frontend
npm install
npm run dev
```

#### Open App

- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

### Default Users (Seeded Automatically)

| Email | Password | Department | Role |
|---|---|---|---|
| admin@gmail.com | admin | Restaurant | Admin |
| admin1@gmail.com | admin | Logistics | Admin |
| themasalatwist@gmail.com | oxnard | Restaurant | User |
| finance@demo.com | admin | Finance | Admin |
| accounting@demo.com | admin | Accounting | Admin |
| sales@demo.com | admin | Sales | Admin |

### Option B: Docker Compose

```powershell
cd c:\Users\kanwa\multi-dept-ai-portal-new
# Edit backend/.env with your API keys
docker compose up --build
```

---

## 21. Key Design Patterns Used

### 1. Dependency Injection (FastAPI)
`Depends()` creates a pipeline of checks (auth, DB session) before route handlers run. If any dependency fails, the handler is skipped.

### 2. Registry Pattern
Department-agnostic orchestrator resolves tools/prompts via a central registry. Adding departments requires zero changes to the core.

### 3. Singleton Pattern
One `AgentOrchestrator` instance shared across all requests. Stateless, so safe for concurrency.

### 4. Settings Cache
`@lru_cache` on `get_settings()` reads `.env` once and caches. No disk I/O on every request.

### 5. Async/Await
Entire backend is async. While waiting for Claude API (2-10s), FleetHunt API (~1s), or DB queries, the server handles other requests. One process can serve many concurrent users.

### 6. Component Composition (React)
Dashboard components compose: `DashboardMessage` uses `DonutChart`, `DashboardTable`, `MessageActions`. Department logic extracted to `departments/dashboard.ts`.

### 7. Protocol Pattern (Python)
`departments/__init__.py` defines a `Protocol` (like TypeScript interface) that all department modules must conform to: `TOOLS`, `SYSTEM_PROMPT`, `execute_tool`.

---

## 22. How Data Flows Through the System

### Complete Request Lifecycle

```
Browser                                  Backend                              External
───────                                  ───────                              ────────
  │                                        │                                    │
  │─── POST /api/v1/chat ────────────────→│                                    │
  │    {message, conversation_id}          │                                    │
  │                                        │── JWT validation ──→ DB (users)    │
  │                                        │── Load/create conversation ──→ DB  │
  │                                        │── Load message history ──→ DB      │
  │                                        │── Save user message ──→ DB         │
  │                                        │                                    │
  │                                        │── Orchestrator ──→ Claude API      │
  │                                        │   (system prompt + tools + msgs)   │
  │                                        │                                    │
  │                                        │←── stop_reason: "tool_use" ────────│
  │                                        │                                    │
  │                                        │── Execute tool ────────────────→ FleetHunt/FCM
  │                                        │                                    │
  │                                        │←── tool result ────────────────────│
  │                                        │                                    │
  │                                        │── Feed result ──→ Claude API       │
  │                                        │                                    │
  │                                        │←── stop_reason: "end_turn" ────────│
  │                                        │                                    │
  │                                        │── Save assistant message ──→ DB    │
  │                                        │── Record usage ──→ DB              │
  │                                        │                                    │
  │←── {conv_id, message, tool_calls} ────│                                    │
  │                                        │                                    │
  │── extractDashboardData() ──→           │                                    │
  │   Render KPIs, charts, tables          │                                    │
```

### Data Storage Summary

| What | Where | When |
|---|---|---|
| User credentials | `users` table | Registration |
| JWT token | Browser localStorage | Login/Register |
| Conversations | `conversations` table | First message in chat |
| Messages | `messages` table | Each send/receive |
| Tool call details | `messages.tool_calls` (JSON) | With assistant messages |
| Token usage | `usage_records` table | After each AI response |
| Department budgets | `department_budgets` table | Admin configuration |
| Menu data | `data.py` (in-code) | Always available |

---

## 23. Error Handling Strategy

### Backend Layers

| Layer | Error | HTTP Code | Example |
|---|---|---|---|
| **Pydantic** | Invalid request body | 422 | Wrong type, missing field |
| **Auth** | Missing/expired token | 401 | Expired JWT |
| **Auth** | Wrong role | 403 | Non-admin on admin route |
| **Business logic** | Not found | 404 | Conversation doesn't exist |
| **Business logic** | Conflict | 409 | Email already registered |
| **Rate limiter** | Too many requests | 429 | Over 30 req/min |
| **External API** | API failure | (caught) | FleetHunt down → graceful error to Claude |

### Database Safety

```python
async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()     # Auto-commit on success
        except Exception:
            await session.rollback()   # Auto-rollback on error
            raise
```

### External API Safety

All FleetHunt/FCM calls wrapped in try/except. Errors return `{"error": "..."}` so Claude can tell users gracefully.

---

## 24. Common Interview / Tech Lead Questions

### Q: What architecture pattern does this use?
**A**: Agentic AI with a tool-use loop. The AI decides what data it needs, our backend executes tools, feeds results back, and the AI interprets them. This loops until done.

### Q: Why Anthropic SDK directly instead of LangChain?
**A**: Direct SDK gives full control over the tool-use loop, lower latency, simpler debugging, fewer dependencies.

### Q: How does department isolation work?
**A**: Three layers: (1) JWT contains department, (2) Registry only loads that department's tools/prompt, (3) Conversations scoped to `(user_id, department)`.

### Q: Why the registry pattern?
**A**: Adding a new department = one folder + one registry line. Orchestrator never changes. Each department is fully self-contained.

### Q: How does FleetHunt integration work?
**A**: `httpx` calls `GET /fleet?api_token=xxx`. Filter stale devices (>7d), apply tool-specific filter. Haversine formula for proximity search.

### Q: How is authentication implemented?
**A**: BCrypt for passwords (one-way hash), JWT HS256 for sessions. Payload: `{sub, department, role, exp}`. 60-min expiry, no refresh tokens.

### Q: Why async everywhere?
**A**: Operations are I/O-bound (Claude ~2-10s, FleetHunt ~1s). Async lets one process handle many concurrent users without blocking.

### Q: How does streaming work?
**A**: SSE endpoint uses `client.messages.stream()` to yield text chunks. Browser receives via `EventSource`. Tool execution is non-streamed.

### Q: What happens if FleetHunt is down?
**A**: `httpx` timeout (30s) or `HTTPError` caught → returns `{"error": "..."}` → Claude tells user "GPS unavailable".

### Q: How would you scale?
**A**: PostgreSQL + Redis + connection pooling + horizontal scaling + token refresh + WebSocket + real API integrations.

### Q: How would you add a new department?
**A**: (1) Create `departments/newdept/` with prompts.py, tools.py. (2) Add to registry. (3) Add enum value. (4) Add frontend config. Done.

---

## End of Guide

This document covers every aspect of the Multi-Department AI Portal. Start by understanding:
1. The **tool-use loop** (Section 8) — the heart of the system
2. The **department registry** (Section 9) — how departments are isolated
3. The **authentication flow** (Section 7) — how users are identified
4. The **chat workflow** (Section 8) — the full request lifecycle

Then explore the code files referenced in each section.

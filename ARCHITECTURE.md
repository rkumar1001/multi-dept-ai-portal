# Multi-Department AI Agent Portal
## Architecture & Workflow Documentation

**Version:** 1.0.0  
**Date:** April 14, 2026  
**Classification:** Internal Technical Reference

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Component Architecture](#4-component-architecture)
5. [Data Flow & Workflows](#5-data-flow--workflows)
6. [Database Architecture](#6-database-architecture)
7. [Security Architecture](#7-security-architecture)
8. [API Design](#8-api-design)
9. [AI Agent System](#9-ai-agent-system)
10. [Integration Architecture](#10-integration-architecture)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Scalability & Performance](#12-scalability--performance)
13. [Future Roadmap](#13-future-roadmap)

---

## 1. Executive Summary

### 1.1 Purpose

The Multi-Department AI Agent Portal is an enterprise-grade AI-powered assistant platform that provides specialized, context-aware AI agents to different departments within an organization. Each department receives a tailored AI experience with domain-specific knowledge, tools, and data access controls.

### 1.2 Key Business Value

| Benefit | Description |
|---------|-------------|
| **Operational Efficiency** | AI assistants handle routine queries, freeing staff for high-value work |
| **Data-Driven Insights** | Real-time access to department-specific analytics and KPIs |
| **Unified Platform** | Single portal eliminates tool fragmentation across departments |
| **Secure & Compliant** | Role-based access ensures data isolation between departments |
| **Extensible** | Modular architecture allows adding new departments and integrations |

### 1.3 Supported Departments

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MULTI-DEPARTMENT AI PORTAL                    │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┤
│   📊 SALES   │   💰 FINANCE │  📒 ACCOUNTING│ 🍽️ RESTAURANT│  🚛 LOGISTICS │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ CRM Queries │ ERP System  │ AP/AR Mgmt  │ Menu/Orders │ Fleet Track │
│ Pipeline    │ Cash Flow   │ Invoices    │ Inventory   │ GPS Data    │
│ Lead Scoring│ Compliance  │ Tax Calc    │ POS System  │ QuickBooks  │
│ Market Intel│ Budgeting   │ Audit Prep  │ Reservations│ Samsara     │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     Next.js 15 Frontend (React 19)                     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │  │
│  │  │   Login    │  │   Chat     │  │   Admin    │  │   Services     │  │  │
│  │  │   Page     │  │   Page     │  │ Dashboard  │  │ Configuration  │  │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └───────┬────────┘  │  │
│  │        └───────────────┴───────────────┴─────────────────┘            │  │
│  │                              │                                         │  │
│  │                    API Client (lib/api.ts)                            │  │
│  │                    Bearer Token Authentication                         │  │
│  └──────────────────────────────┼────────────────────────────────────────┘  │
└─────────────────────────────────┼────────────────────────────────────────────┘
                                  │ HTTPS / SSE
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY LAYER                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        FastAPI Application                            │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                      Middleware Stack                            │ │  │
│  │  │   CORS  │  JWT Auth  │  Rate Limiter  │  Request Logging        │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────┐│  │
│  │  │Auth API   │ │Chat API   │ │Admin API  │ │Upload API │ │Services││  │
│  │  │/auth/*    │ │/chat/*    │ │/admin/*   │ │/upload/*  │ │APIs    ││  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └────────┘│  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼────────────────────────────────────────────┐
│                         SERVICE LAYER                │                        │
│  ┌──────────────────────────────┼────────────────────┼──────────────────────┐│
│  │                              ▼                    │                       ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐││
│  │  │                    AGENT ORCHESTRATOR                               │││
│  │  │  ┌─────────────────────────────────────────────────────────────┐   │││
│  │  │  │                   Claude API (Anthropic)                     │   │││
│  │  │  │                                                              │   │││
│  │  │  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │   │││
│  │  │  │  │ System Prompt│───▶│   LLM Call   │───▶│  Tool Use?   │   │   │││
│  │  │  │  │ (per dept)   │    │ (streaming)  │    │              │   │   │││
│  │  │  │  └──────────────┘    └──────────────┘    └──────┬───────┘   │   │││
│  │  │  │                                                  │ Yes      │   │││
│  │  │  │                                                  ▼          │   │││
│  │  │  │                                         ┌──────────────┐    │   │││
│  │  │  │                                         │ Tool Execute │    │   │││
│  │  │  │                                         │  & Loop Back │    │   │││
│  │  │  │                                         └──────────────┘    │   │││
│  │  │  └─────────────────────────────────────────────────────────────┘   │││
│  │  └─────────────────────────────────────────────────────────────────────┘││
│  │                                                                         ││
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   ││
│  │  │ Auth Service │ │ Email Service│ │ Slack Service│ │ QB Service   │   ││
│  │  │ JWT + BCrypt │ │ Gmail/O365   │ │ Messaging    │ │ Accounting   │   ││
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   ││
│  └───────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼────────────────────────────────────────────┐
│                          DATA LAYER                  │                        │
│  ┌──────────────────────────────▼────────────────────┴──────────────────────┐│
│  │                     SQLAlchemy Async ORM                                  ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ ││
│  │  │   Users     │ │Conversations│ │  Messages   │ │   Configurations    │ ││
│  │  │   Table     │ │   Table     │ │   Table     │ │   (Email/Slack/QB)  │ ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘ ││
│  └───────────────────────────────────────────────────────────────────────────┘│
│                                  │                                            │
│                    ┌─────────────▼─────────────┐                             │
│                    │  SQLite (Dev) / PostgreSQL │                             │
│                    │         (Production)       │                             │
│                    └────────────────────────────┘                             │
└──────────────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS             │                        │
│  ┌──────────────────────────────▼────────────────────┴──────────────────────┐│
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐  ││
│  │  │  Gmail    │ │ Outlook   │ │  Slack    │ │ QuickBooks│ │ FleetHunt │  ││
│  │  │   API     │ │   API     │ │   API     │ │   API     │ │   API     │  ││
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘  ││
│  │  ┌───────────┐ ┌───────────┐ ┌───────────────────────────────────────┐  ││
│  │  │  Samsara  │ │ Weather   │ │       Claude API (Anthropic)          │  ││
│  │  │   API     │ │   API     │ │                                       │  ││
│  │  └───────────┘ └───────────┘ └───────────────────────────────────────┘  ││
│  └───────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Architecture Principles

| Principle | Implementation |
|-----------|----------------|
| **Separation of Concerns** | Distinct layers for UI, API, Services, and Data |
| **Single Responsibility** | Each module handles one specific domain |
| **Dependency Injection** | FastAPI's dependency system for clean composition |
| **Async-First** | Full async/await from API to database |
| **Security by Default** | JWT auth, RBAC, data isolation enforced at all layers |

---

## 3. Technology Stack

### 3.1 Backend Stack

```
┌─────────────────────────────────────────────────────┐
│                   PYTHON 3.12+                       │
├─────────────────────────────────────────────────────┤
│  Framework     │  FastAPI 0.115+                    │
│  ASGI Server   │  Uvicorn 0.34+                     │
│  ORM           │  SQLAlchemy 2.0 (async)            │
│  Validation    │  Pydantic 2.11+                    │
│  Auth          │  python-jose + bcrypt              │
│  AI/LLM        │  Anthropic SDK 0.88+               │
│  HTTP Client   │  httpx 0.28+ (async)               │
│  SSE           │  sse-starlette                     │
│  Config        │  pydantic-settings                 │
└─────────────────────────────────────────────────────┘
```

### 3.2 Frontend Stack

```
┌─────────────────────────────────────────────────────┐
│                   NODE.JS 20+                        │
├─────────────────────────────────────────────────────┤
│  Framework     │  Next.js 15.1                      │
│  UI Library    │  React 19                          │
│  Language      │  TypeScript 5.7                    │
│  Styling       │  Tailwind CSS 3.4                  │
│  Charts        │  Recharts 3.8                      │
│  Markdown      │  react-markdown + remark-gfm       │
│  Icons         │  Lucide React                      │
└─────────────────────────────────────────────────────┘
```

### 3.3 Infrastructure

```
┌─────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE                     │
├─────────────────────────────────────────────────────┤
│  Database      │  SQLite (dev) / PostgreSQL (prod)  │
│  Containers    │  Docker + Docker Compose           │
│  AI Provider   │  Anthropic Claude API              │
│  Model         │  claude-haiku-4-5 (configurable)   │
└─────────────────────────────────────────────────────┘
```

---

## 4. Component Architecture

### 4.1 Backend Component Diagram

```
backend/
├── app/
│   ├── main.py                    # FastAPI entry point & lifespan
│   ├── config.py                  # Pydantic settings (env vars)
│   │
│   ├── agents/                    # AI Agent System
│   │   ├── orchestrator.py        # Claude API orchestration + tool loop
│   │   └── registry.py            # Department → tools/prompts mapping
│   │
│   ├── api/                       # REST API Routes
│   │   ├── auth.py               # /api/v1/auth/* (login, register)
│   │   ├── chat.py               # /api/v1/chat/* (send, stream)
│   │   ├── conversations.py      # /api/v1/conversations/*
│   │   ├── admin.py              # /api/v1/admin/* (usage, config)
│   │   ├── email.py              # /api/v1/email/* (OAuth flows)
│   │   ├── slack.py              # /api/v1/slack/* (OAuth flows)
│   │   ├── quickbooks.py         # /api/v1/quickbooks/* (OAuth flows)
│   │   └── upload.py             # /api/v1/upload/* (file handling)
│   │
│   ├── departments/               # Department-Specific Logic
│   │   ├── sales/
│   │   │   ├── prompts.py        # Sales agent system prompt
│   │   │   └── tools.py          # CRM, email, market data tools
│   │   ├── finance/
│   │   │   ├── prompts.py        # Finance agent system prompt
│   │   │   └── tools.py          # ERP, cash flow, compliance tools
│   │   ├── accounting/
│   │   │   ├── prompts.py        # Accounting agent system prompt
│   │   │   └── tools.py          # Invoice, reconciliation, tax tools
│   │   ├── restaurant/
│   │   │   ├── prompts.py        # Restaurant agent system prompt
│   │   │   ├── tools.py          # Menu, orders, inventory tools
│   │   │   └── data.py           # Static menu data
│   │   ├── logistics/
│   │   │   ├── prompts.py        # Logistics agent system prompt
│   │   │   ├── tools.py          # Fleet tracking tools
│   │   │   └── samsara_tools.py  # Samsara dashcam integration
│   │   └── common/
│   │       ├── email_tools.py    # Cross-department email tools
│   │       ├── slack_tools.py    # Cross-department Slack tools
│   │       ├── quickbooks_tools.py # QuickBooks integration
│   │       └── weather_tools.py  # Weather API integration
│   │
│   ├── db/
│   │   └── database.py           # Async engine, sessions, init, seeding
│   │
│   ├── middleware/
│   │   └── auth_middleware.py    # JWT validation + role enforcement
│   │
│   ├── models/                    # SQLAlchemy ORM Models
│   │   ├── user.py               # User, Department, Role
│   │   ├── conversation.py       # Conversation, Message
│   │   ├── usage.py              # UsageRecord, DepartmentBudget
│   │   ├── email_config.py       # OAuth token storage
│   │   ├── slack_config.py       # Slack OAuth config
│   │   └── quickbooks_config.py  # QuickBooks OAuth config
│   │
│   └── services/                  # Business Logic Services
│       ├── auth_service.py       # Password hashing, JWT, user CRUD
│       ├── email_service.py      # Email sending (Gmail/Outlook)
│       ├── slack_service.py      # Slack messaging
│       ├── quickbooks_service.py # QuickBooks API calls
│       └── usage_service.py      # Token & cost tracking
│
├── uploads/                       # File upload storage
├── requirements.txt               # Python dependencies
└── Dockerfile                     # Container build
```

### 4.2 Frontend Component Diagram

```
frontend/
├── src/
│   ├── app/                       # Next.js App Router Pages
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Root redirect
│   │   ├── globals.css           # Tailwind + CSS variables
│   │   ├── login/
│   │   │   └── page.tsx          # Auth page (signin/register)
│   │   ├── chat/
│   │   │   └── page.tsx          # Main chat interface
│   │   ├── admin/
│   │   │   └── page.tsx          # Admin dashboard
│   │   └── services/
│   │       ├── page.tsx          # Services overview
│   │       └── [id]/             # Dynamic service config
│   │
│   ├── components/
│   │   └── chat/                  # Chat UI Components
│   │       ├── DashboardMessage.tsx  # Dashboard-style responses
│   │       ├── DashboardTable.tsx    # Data table rendering
│   │       ├── DonutChart.tsx        # Donut chart component
│   │       ├── MessageActions.tsx    # Copy/feedback buttons
│   │       └── index.ts              # Component exports
│   │
│   ├── departments/               # Department Configuration
│   │   ├── config.ts             # Visual theming per department
│   │   ├── types.ts              # TypeScript interfaces
│   │   ├── dashboard.ts          # Dashboard widget configs
│   │   ├── integrations.ts       # Integration definitions
│   │   └── index.ts              # Exports
│   │
│   ├── lib/
│   │   └── api.ts                # API client wrapper
│   │
│   └── types/
│       ├── index.ts              # TypeScript interfaces
│       └── speech-recognition.d.ts # Web Speech API types
│
├── public/                        # Static assets
├── package.json                   # Dependencies
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
└── Dockerfile                    # Multi-stage build
```

---

## 5. Data Flow & Workflows

### 5.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION WORKFLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────┐                    ┌──────────┐                    ┌──────────┐
   │  User    │                    │ Frontend │                    │ Backend  │
   │ Browser  │                    │ (Next.js)│                    │(FastAPI) │
   └────┬─────┘                    └────┬─────┘                    └────┬─────┘
        │                               │                               │
        │  1. Enter credentials         │                               │
        │ ─────────────────────────────▶│                               │
        │                               │                               │
        │                               │  2. POST /api/v1/auth/login   │
        │                               │  {email, password}            │
        │                               │ ─────────────────────────────▶│
        │                               │                               │
        │                               │              ┌────────────────┤
        │                               │              │ 3. Validate    │
        │                               │              │ - Lookup user  │
        │                               │              │ - BCrypt verify│
        │                               │              └────────────────┤
        │                               │                               │
        │                               │              ┌────────────────┤
        │                               │              │ 4. Generate JWT│
        │                               │              │ {sub, dept,    │
        │                               │              │  role, exp}    │
        │                               │              └────────────────┤
        │                               │                               │
        │                               │  5. Return {access_token,     │
        │                               │     department, role, name}   │
        │                               │◀──────────────────────────────│
        │                               │                               │
        │               ┌───────────────┤                               │
        │               │6. Store token │                               │
        │               │  localStorage │                               │
        │               └───────────────┤                               │
        │                               │                               │
        │  7. Redirect to /chat         │                               │
        │◀──────────────────────────────│                               │
        │                               │                               │
```

### 5.2 Chat Message Flow (Non-Streaming)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHAT MESSAGE WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
   │  User    │     │ Frontend │     │ Chat API │     │Orchestrator│    │Claude API│
   └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬──────┘     └────┬─────┘
        │                │                │                 │                 │
        │ 1. Type msg    │                │                 │                 │
        │───────────────▶│                │                 │                 │
        │                │                │                 │                 │
        │                │ 2. POST /chat  │                 │                 │
        │                │ {message,      │                 │                 │
        │                │  conv_id?}     │                 │                 │
        │                │───────────────▶│                 │                 │
        │                │                │                 │                 │
        │                │                │ 3. Validate JWT │                 │
        │                │                │ Extract user:   │                 │
        │                │                │ id, dept, role  │                 │
        │                │                ├────────────────▶│                 │
        │                │                │                 │                 │
        │                │                │ 4. Get/Create   │                 │
        │                │                │ Conversation    │                 │
        │                │                │ (scoped to user)│                 │
        │                │                ├─────────────────┤                 │
        │                │                │                 │                 │
        │                │                │ 5. Load history │                 │
        │                │                │ (last 20 msgs)  │                 │
        │                │                ├─────────────────┤                 │
        │                │                │                 │                 │
        │                │                │ 6. process_query()                │
        │                │                │────────────────▶│                 │
        │                │                │                 │                 │
        │                │                │                 │ 7. Get dept     │
        │                │                │                 │ prompt + tools  │
        │                │                │                 ├────────────────▶│
        │                │                │                 │                 │
        │                │                │                 │ 8. API Call     │
        │                │                │                 │ {system, msgs,  │
        │                │                │                 │  tools}         │
        │                │                │                 │────────────────▶│
        │                │                │                 │                 │
        │                │                │                 │                 │
        │                │                │                 │◀───[Tool Use]───│
        │                │                │                 │                 │
        │                │                │                 │ 9. Execute tool │
        │                │                │                 │ (async handler) │
        │                │                │                 ├─────────────────┤
        │                │                │                 │                 │
        │                │                │                 │ 10. Return      │
        │                │                │                 │ tool result     │
        │                │                │                 │────────────────▶│
        │                │                │                 │                 │
        │                │                │                 │◀──[Final Text]──│
        │                │                │                 │                 │
        │                │                │◀────────────────│ 11. AgentResponse
        │                │                │                 │ {content, tokens,│
        │                │                │                 │  tool_calls}    │
        │                │                │                 │                 │
        │                │                │ 12. Save msgs   │                 │
        │                │                │ to database     │                 │
        │                │                ├─────────────────┤                 │
        │                │                │                 │                 │
        │                │                │ 13. Record usage│                 │
        │                │                │ (tokens, tools) │                 │
        │                │                ├─────────────────┤                 │
        │                │                │                 │                 │
        │                │◀───────────────│ 14. Return      │                 │
        │                │ {conv_id,      │                 │                 │
        │                │  message,      │                 │                 │
        │                │  tool_calls}   │                 │                 │
        │                │                │                 │                 │
        │◀───────────────│ 15. Render     │                 │                 │
        │ AI response    │ markdown +     │                 │                 │
        │ with tools     │ tool cards     │                 │                 │
        │                │                │                 │                 │
```

### 5.3 Streaming Response Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STREAMING RESPONSE WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

Client                          Backend                         Claude API
   │                               │                                │
   │  POST /api/v1/chat/stream     │                                │
   │  {message, conv_id?}          │                                │
   │──────────────────────────────▶│                                │
   │                               │                                │
   │◀──────────────────────────────│                                │
   │  event: conv_id               │                                │
   │  data: {"conversation_id":..} │                                │
   │                               │                                │
   │                               │  Streaming API call             │
   │                               │───────────────────────────────▶│
   │                               │                                │
   │◀──────────────────────────────│◀───────────────────────────────│
   │  event: message               │  Text chunk 1                  │
   │  data: {"content": "Hello..."}│                                │
   │                               │                                │
   │◀──────────────────────────────│◀───────────────────────────────│
   │  event: message               │  Text chunk 2                  │
   │  data: {"content": " I can..."}                                │
   │                               │                                │
   │                               │  ... more chunks ...           │
   │                               │                                │
   │                               │◀──────[Tool Use Block]─────────│
   │                               │                                │
   │◀──────────────────────────────│                                │
   │  event: tool_status           │  Execute tool locally          │
   │  data: {"name": "query_menu"} │                                │
   │                               │                                │
   │                               │  Return result to Claude        │
   │                               │───────────────────────────────▶│
   │                               │                                │
   │◀──────────────────────────────│◀───────────────────────────────│
   │  event: message               │  Final response chunks         │
   │  data: {"content": "Based..."}│                                │
   │                               │                                │
   │◀──────────────────────────────│                                │
   │  event: done                  │                                │
   │  data: {"tool_calls": [...],  │                                │
   │         "input_tokens": 1234, │                                │
   │         "output_tokens": 567} │                                │
   │                               │                                │
   │  [Connection closed]          │                                │
```

### 5.4 Tool Execution Loop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENTIC TOOL LOOP                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────┐
                    │       User Message          │
                    │   + Conversation History    │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │    Build Request Payload    │
                    │  • System prompt (per dept) │
                    │  • Tools (per dept)         │
                    │  • Message history          │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
             ┌────────────────────────────────────────────┐
             │              Claude API Call               │
             │   messages.create() with retry (3x)        │
             └────────────────────┬───────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │    Check stop_reason        │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
          ┌─────────────────┐         ┌─────────────────┐
          │ stop_reason ==  │         │ stop_reason ==  │
          │   "end_turn"    │         │   "tool_use"    │
          └────────┬────────┘         └────────┬────────┘
                   │                           │
                   │                           ▼
                   │              ┌─────────────────────────────┐
                   │              │   Extract tool_use blocks   │
                   │              │   from response.content     │
                   │              └─────────────┬───────────────┘
                   │                            │
                   │                            ▼
                   │              ┌─────────────────────────────┐
                   │              │   For each tool_use:        │
                   │              │   ┌─────────────────────┐   │
                   │              │   │ 1. Route by type:   │   │
                   │              │   │  • Email tool?      │   │
                   │              │   │  • Slack tool?      │   │
                   │              │   │  • QuickBooks tool? │   │
                   │              │   │  • Weather tool?    │   │
                   │              │   │  • Department tool  │   │
                   │              │   └─────────────────────┘   │
                   │              │   ┌─────────────────────┐   │
                   │              │   │ 2. Execute handler  │   │
                   │              │   │    (async)          │   │
                   │              │   └─────────────────────┘   │
                   │              │   ┌─────────────────────┐   │
                   │              │   │ 3. Collect result   │   │
                   │              │   │    (truncate if big)│   │
                   │              │   └─────────────────────┘   │
                   │              └─────────────┬───────────────┘
                   │                            │
                   │                            ▼
                   │              ┌─────────────────────────────┐
                   │              │   Append to messages:       │
                   │              │   • Assistant (tool_use)    │
                   │              │   • User (tool_result)      │
                   │              └─────────────┬───────────────┘
                   │                            │
                   │                            │ Loop back
                   │                            │ (max 5 iterations)
                   │              ┌─────────────┘
                   │              │
                   │              ▼
                   │    [Back to Claude API Call]
                   │
                   ▼
          ┌─────────────────────────────┐
          │   Extract final text        │
          │   Return AgentResponse:     │
          │   • content                 │
          │   • input_tokens            │
          │   • output_tokens           │
          │   • tool_calls[]            │
          │   • model                   │
          └─────────────────────────────┘
```

### 5.5 OAuth Integration Flow (Gmail Example)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OAUTH INTEGRATION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

   User             Frontend           Backend              Google OAuth
     │                 │                  │                      │
     │ 1. Click        │                  │                      │
     │ "Connect Gmail" │                  │                      │
     │────────────────▶│                  │                      │
     │                 │                  │                      │
     │                 │ 2. GET /email/   │                      │
     │                 │ connect/gmail    │                      │
     │                 │─────────────────▶│                      │
     │                 │                  │                      │
     │                 │◀─────────────────│                      │
     │◀────────────────│ 3. Redirect to   │                      │
     │                 │ Google OAuth URL │                      │
     │                 │                  │                      │
     │ 4. User grants  │                  │                      │
     │ permission      │                  │                      │
     │─────────────────────────────────────────────────────────▶│
     │                 │                  │                      │
     │                 │                  │ 5. Callback with     │
     │                 │                  │    auth code         │
     │                 │                  │◀─────────────────────│
     │                 │                  │                      │
     │                 │                  │ 6. Exchange code     │
     │                 │                  │    for tokens        │
     │                 │                  │─────────────────────▶│
     │                 │                  │                      │
     │                 │                  │◀─────────────────────│
     │                 │                  │ 7. access_token +    │
     │                 │                  │    refresh_token     │
     │                 │                  │                      │
     │                 │                  │ 8. Store encrypted   │
     │                 │                  │    in DB             │
     │                 │                  ├──────────────────────┤
     │                 │                  │                      │
     │◀─────────────────────────────────│ 9. Redirect to        │
     │                 │                  │    frontend /services│
     │                 │                  │                      │
```

---

## 6. Database Architecture

### 6.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA (ERD)                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐         ┌──────────────────────────────┐
│           users              │         │       conversations          │
├──────────────────────────────┤         ├──────────────────────────────┤
│ PK  id          VARCHAR(36)  │◀────┐   │ PK  id          VARCHAR(36)  │
│     email       VARCHAR(255) │     │   │ FK  user_id     VARCHAR(36)  │───┐
│     hashed_pwd  VARCHAR(255) │     │   │     department  VARCHAR(50)  │   │
│     full_name   VARCHAR(255) │     │   │     title       VARCHAR(255) │   │
│     department  ENUM         │     │   │     created_at  DATETIME     │   │
│     role        ENUM         │     │   │     updated_at  DATETIME     │   │
│     is_active   BOOLEAN      │     │   └──────────────────────────────┘   │
│     created_at  DATETIME     │     │                                       │
│     updated_at  DATETIME     │     └───────────────────────────────────────┘
└──────────────────────────────┘                     │
         │                                           │
         │                                           ▼
         │                        ┌──────────────────────────────┐
         │                        │          messages            │
         │                        ├──────────────────────────────┤
         │                        │ PK  id          VARCHAR(36)  │
         │                        │ FK  conv_id     VARCHAR(36)  │
         │                        │     role        VARCHAR(20)  │
         │                        │     content     TEXT         │
         │                        │     tool_calls  JSON         │
         │                        │     token_count INTEGER      │
         │                        │     created_at  DATETIME     │
         │                        └──────────────────────────────┘
         │
         │    ┌──────────────────────────────┐
         │    │       usage_records          │
         │    ├──────────────────────────────┤
         └───▶│ PK  id          VARCHAR(36)  │
              │ FK  user_id     VARCHAR(36)  │
              │     department  VARCHAR(50)  │
              │     input_tokens INTEGER     │
              │     output_tokens INTEGER    │
              │     tool_calls   INTEGER     │
              │     model       VARCHAR(50)  │
              │     created_at  DATETIME     │
              └──────────────────────────────┘

┌──────────────────────────────┐    ┌──────────────────────────────┐
│  department_email_configs    │    │  department_slack_configs    │
├──────────────────────────────┤    ├──────────────────────────────┤
│ PK  id          VARCHAR(36)  │    │ PK  id          VARCHAR(36)  │
│     department  VARCHAR(50)  │    │     department  VARCHAR(50)  │
│     provider    VARCHAR(20)  │    │     team_id     VARCHAR      │
│     email_addr  VARCHAR(255) │    │     team_name   VARCHAR      │
│     access_token TEXT (enc)  │    │     access_token TEXT (enc)  │
│     refresh_token TEXT (enc) │    │     bot_user_id VARCHAR      │
│     token_expiry DATETIME    │    │     is_active   BOOLEAN      │
│     is_active   BOOLEAN      │    │     created_at  DATETIME     │
│     created_at  DATETIME     │    └──────────────────────────────┘
└──────────────────────────────┘
                                    ┌──────────────────────────────┐
                                    │department_quickbooks_configs │
                                    ├──────────────────────────────┤
                                    │ PK  id          VARCHAR(36)  │
                                    │     department  VARCHAR(50)  │
                                    │     realm_id    VARCHAR      │
                                    │     company_name VARCHAR     │
                                    │     access_token TEXT (enc)  │
                                    │     refresh_token TEXT (enc) │
                                    │     token_expiry DATETIME    │
                                    │     is_active   BOOLEAN      │
                                    │     created_at  DATETIME     │
                                    └──────────────────────────────┘
```

### 6.2 Database Indexing Strategy

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| users | ix_users_email | email | Fast login lookup |
| users | ix_users_department | department | Filter by department |
| conversations | ix_conv_user_dept | user_id, department | User's department conversations |
| messages | ix_msg_conv_time | conversation_id, created_at | Chronological message loading |
| usage_records | ix_usage_dept_time | department, created_at | Usage analytics queries |

### 6.3 Data Isolation Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA ISOLATION RULES                               │
└─────────────────────────────────────────────────────────────────────────────┘

 User A (Sales)                    User B (Finance)
      │                                  │
      ▼                                  ▼
┌─────────────┐                   ┌─────────────┐
│ Auth Token  │                   │ Auth Token  │
│ dept: sales │                   │dept: finance│
└──────┬──────┘                   └──────┬──────┘
       │                                 │
       ▼                                 ▼
 ┌───────────────────────────────────────────────────┐
 │            QUERY FILTERS (Enforced)               │
 │                                                   │
 │  WHERE user_id = current_user.id                  │
 │    AND department = current_user.department       │
 └───────────────────────────────────────────────────┘
       │                                 │
       ▼                                 ▼
 ┌─────────────┐                   ┌─────────────┐
 │ Sales Data  │                   │Finance Data │
 │ Only        │                   │ Only        │
 └─────────────┘                   └─────────────┘

 ❌ User A CANNOT access User B's data
 ❌ User A CANNOT access Finance conversations
 ✅ Admins can view aggregate usage across all departments
```

---

## 7. Security Architecture

### 7.1 Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYERS                                    │
└─────────────────────────────────────────────────────────────────────────────┘

           ┌─────────────────────────────────────────────────────────┐
           │                    REQUEST FLOW                          │
           └─────────────────────────────────────────────────────────┘
                                    │
                                    ▼
              ┌────────────────────────────────────────────┐
              │              CORS MIDDLEWARE               │
              │  • Validates Origin header                 │
              │  • Configured allowed origins              │
              └────────────────────┬───────────────────────┘
                                   │
                                   ▼
              ┌────────────────────────────────────────────┐
              │          JWT AUTH MIDDLEWARE               │
              │  • Extracts Bearer token                   │
              │  • Validates signature (HS256)             │
              │  • Checks expiration                       │
              │  • Decodes user_id, department, role       │
              └────────────────────┬───────────────────────┘
                                   │
                                   ▼
              ┌────────────────────────────────────────────┐
              │         ROLE-BASED ACCESS CONTROL          │
              │                                            │
              │  ┌────────────────────────────────────┐   │
              │  │ Role: USER                          │   │
              │  │ • Access own conversations          │   │
              │  │ • Chat with department agent        │   │
              │  │ • View own usage                    │   │
              │  └────────────────────────────────────┘   │
              │                                            │
              │  ┌────────────────────────────────────┐   │
              │  │ Role: DEPT_ADMIN                    │   │
              │  │ • All USER permissions              │   │
              │  │ • Configure department integrations │   │
              │  │ • View department usage             │   │
              │  └────────────────────────────────────┘   │
              │                                            │
              │  ┌────────────────────────────────────┐   │
              │  │ Role: ADMIN                         │   │
              │  │ • All DEPT_ADMIN permissions        │   │
              │  │ • Access admin dashboard            │   │
              │  │ • View all department usage         │   │
              │  │ • Configure budgets & limits        │   │
              │  └────────────────────────────────────┘   │
              └────────────────────────────────────────────┘
```

### 7.2 Security Controls Summary

| Layer | Control | Implementation |
|-------|---------|----------------|
| Transport | HTTPS | TLS termination at reverse proxy |
| Authentication | JWT | HS256 signed, 60-min expiry |
| Password Storage | BCrypt | 12 rounds of hashing |
| Token Storage | Encrypted | OAuth tokens encrypted in DB |
| API Security | CORS | Whitelist allowed origins |
| Data Access | Row-Level | All queries filtered by user + dept |
| Input Validation | Pydantic | Type-safe request bodies |
| Rate Limiting | Sliding Window | 30 req/min default, 100 admin |

### 7.3 OAuth Token Security

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OAUTH TOKEN LIFECYCLE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────┐
     │  OAuth Provider │
     │ (Google/MS/etc) │
     └────────┬────────┘
              │
              │ Authorization Code
              ▼
     ┌─────────────────┐
     │   Backend       │
     │   Exchange code │
     │   for tokens    │
     └────────┬────────┘
              │
              │ access_token + refresh_token
              ▼
     ┌─────────────────┐
     │   Encrypt with  │
     │   Fernet key    │
     │   (from SECRET) │
     └────────┬────────┘
              │
              │ Encrypted blob
              ▼
     ┌─────────────────┐
     │   Store in DB   │
     │   department_   │
     │   *_configs     │
     └─────────────────┘

On Use:
     ┌─────────────────┐
     │  Load from DB   │
     │  Decrypt token  │
     └────────┬────────┘
              │
              │ Check expiry
              ▼
     ┌─────────────────────┐
     │ Expired?            │
     │ ├─ No  → Use token  │
     │ └─ Yes → Refresh    │
     │          and store  │
     └─────────────────────┘
```

---

## 8. API Design

### 8.1 API Endpoint Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API ENDPOINTS                                      │
└─────────────────────────────────────────────────────────────────────────────┘

BASE URL: /api/v1

┌──────────────────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION                                                               │
├────────┬─────────────────────┬───────┬───────────────────────────────────────┤
│ Method │ Path                │ Auth  │ Description                           │
├────────┼─────────────────────┼───────┼───────────────────────────────────────┤
│ POST   │ /auth/login         │ None  │ User login → JWT token                │
│ POST   │ /auth/register      │ None  │ New user registration                 │
└────────┴─────────────────────┴───────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CHAT                                                                          │
├────────┬─────────────────────┬───────┬───────────────────────────────────────┤
│ Method │ Path                │ Auth  │ Description                           │
├────────┼─────────────────────┼───────┼───────────────────────────────────────┤
│ POST   │ /chat               │ JWT   │ Send message (non-streaming)          │
│ POST   │ /chat/stream        │ JWT   │ Send message (SSE streaming)          │
└────────┴─────────────────────┴───────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CONVERSATIONS                                                                 │
├────────┬─────────────────────┬───────┬───────────────────────────────────────┤
│ Method │ Path                │ Auth  │ Description                           │
├────────┼─────────────────────┼───────┼───────────────────────────────────────┤
│ GET    │ /conversations      │ JWT   │ List user's conversations             │
│ GET    │ /conversations/{id} │ JWT   │ Get conversation with messages        │
└────────┴─────────────────────┴───────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ADMIN (Requires Admin Role)                                                   │
├────────┬─────────────────────┬───────┬───────────────────────────────────────┤
│ Method │ Path                │ Auth  │ Description                           │
├────────┼─────────────────────┼───────┼───────────────────────────────────────┤
│ GET    │ /admin/usage        │ Admin │ Usage metrics by department           │
│ GET    │ /admin/config/{d}   │ Admin │ Get department budget config          │
│ PUT    │ /admin/config/{d}   │ Admin │ Update department budget              │
│ GET    │ /admin/insights     │ Admin │ Department KPIs                       │
└────────┴─────────────────────┴───────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ INTEGRATIONS                                                                  │
├────────┬─────────────────────────────┬───────┬───────────────────────────────┤
│ Method │ Path                        │ Auth  │ Description                   │
├────────┼─────────────────────────────┼───────┼───────────────────────────────┤
│ GET    │ /email/connect/gmail        │ JWT   │ Start Gmail OAuth             │
│ GET    │ /email/connect/outlook      │ JWT   │ Start Outlook OAuth           │
│ GET    │ /email/callback/*           │ None  │ OAuth callbacks               │
│ GET    │ /email/status               │ JWT   │ Check email connection        │
│ DELETE │ /email/disconnect           │ JWT   │ Revoke email access           │
│ GET    │ /slack/connect              │ JWT   │ Start Slack OAuth             │
│ GET    │ /slack/callback             │ None  │ Slack OAuth callback          │
│ GET    │ /slack/status               │ JWT   │ Check Slack connection        │
│ DELETE │ /slack/disconnect           │ JWT   │ Revoke Slack access           │
│ GET    │ /quickbooks/connect         │ JWT   │ Start QuickBooks OAuth        │
│ GET    │ /quickbooks/callback        │ None  │ QuickBooks OAuth callback     │
│ GET    │ /quickbooks/status          │ JWT   │ Check QuickBooks connection   │
│ DELETE │ /quickbooks/disconnect      │ JWT   │ Revoke QuickBooks access      │
└────────┴─────────────────────────────┴───────┴───────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FILE UPLOAD                                                                   │
├────────┬─────────────────────┬───────┬───────────────────────────────────────┤
│ Method │ Path                │ Auth  │ Description                           │
├────────┼─────────────────────┼───────┼───────────────────────────────────────┤
│ POST   │ /upload             │ JWT   │ Upload file for chat attachment       │
└────────┴─────────────────────┴───────┴───────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ HEALTH CHECK                                                                  │
├────────┬─────────────────────┬───────┬───────────────────────────────────────┤
│ Method │ Path                │ Auth  │ Description                           │
├────────┼─────────────────────┼───────┼───────────────────────────────────────┤
│ GET    │ /health             │ None  │ Service health status                 │
└────────┴─────────────────────┴───────┴───────────────────────────────────────┘
```

### 8.2 Request/Response Examples

**Chat Request:**
```json
POST /api/v1/chat
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "message": "Show me all pending invoices over $5000",
  "conversation_id": "conv-uuid-123",
  "attachments": [
    {"file_id": "uuid-456", "filename": "report.csv"}
  ]
}
```

**Chat Response:**
```json
{
  "conversation_id": "conv-uuid-123",
  "message": "I found 12 pending invoices over $5,000. Here's the breakdown:\n\n| Vendor | Amount | Due Date | Days Overdue |\n|--------|--------|----------|-------------|\n| ...",
  "tool_calls": [
    {
      "tool": "query_invoices",
      "input": {"invoice_type": "payable", "status": "pending", "min_amount": 5000},
      "output": {"total_count": 12, "invoices": [...]}
    }
  ]
}
```

---

## 9. AI Agent System

### 9.1 Agent Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI AGENT ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │         AgentOrchestrator           │
                    │                                     │
                    │  • Manages Claude API client        │
                    │  • Handles retry logic (3x)         │
                    │  • Routes to department registry    │
                    │  • Executes tool loop (max 5)       │
                    │  • Tracks token usage               │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
                    │                                     │
                    ▼                                     ▼
        ┌─────────────────────┐             ┌─────────────────────┐
        │  Department Registry │             │    Tool Execution   │
        │                     │             │                     │
        │  get_prompt(dept)   │             │  execute_tool(...)  │
        │  get_tools(dept)    │             │                     │
        │                     │             │  Handlers:          │
        │  Supported:         │             │  • Email tools      │
        │  • sales            │             │  • Slack tools      │
        │  • finance          │             │  • QuickBooks tools │
        │  • accounting       │             │  • Weather tools    │
        │  • restaurant       │             │  • Dept-specific    │
        │  • logistics        │             │                     │
        └─────────────────────┘             └─────────────────────┘
```

### 9.2 Department Agent Configuration

| Department | System Prompt Focus | Key Tools | External APIs |
|------------|---------------------|-----------|---------------|
| **Sales** | CRM specialist, lead scoring, pipeline management | query_crm, search_email_logs, get_market_data | CRM systems |
| **Finance** | Financial analyst, compliance, risk assessment | query_erp, get_cash_flow_forecast, check_compliance | ERP systems |
| **Accounting** | AP/AR management, reconciliation, tax | query_invoices, reconcile_accounts, calculate_tax | Accounting systems |
| **Restaurant** | Operations, menu management, orders | query_menu, get_orders, get_order_stats | POS, FCM backend |
| **Logistics** | Fleet tracking, GPS, financial reports | get_fleet_status, search_vehicles, QuickBooks | FleetHunt, Samsara, QuickBooks |

### 9.3 Tool Definition Format

```json
{
  "name": "query_menu",
  "description": "Query restaurant menu for items, pricing, and categories.",
  "input_schema": {
    "type": "object",
    "properties": {
      "category": {
        "type": "string",
        "enum": ["appetizers", "main_courses", "desserts", "all"],
        "description": "Menu category to query"
      },
      "query": {
        "type": "string",
        "description": "Search term (e.g., 'vegan', 'spicy')"
      }
    },
    "required": []
  }
}
```

### 9.4 Cross-Department Tools

These tools are available to all agents based on integration status:

| Tool Category | Tools | Availability |
|---------------|-------|--------------|
| **Email** | send_email, search_emails, list_recent_emails | If Gmail/Outlook connected |
| **Slack** | send_slack_message, list_channels, search_messages | If Slack connected |
| **QuickBooks** | get_profit_loss, get_balance_sheet, list_invoices | If QuickBooks connected |
| **Weather** | get_weather, get_forecast | Always available |

---

## 10. Integration Architecture

### 10.1 External Service Integrations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INTEGRATION ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────────────┐
                         │      Multi-Dept Portal      │
                         │        (Backend)            │
                         └─────────────┬───────────────┘
                                       │
       ┌───────────────┬───────────────┼───────────────┬───────────────┐
       │               │               │               │               │
       ▼               ▼               ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   GOOGLE    │ │  MICROSOFT  │ │   SLACK     │ │ QUICKBOOKS  │ │  FLEETHUNT  │
│   OAUTH     │ │   OAUTH     │ │   OAUTH     │ │   OAUTH     │ │   API KEY   │
├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤
│             │ │             │ │             │ │             │ │             │
│ Gmail API   │ │ Outlook API │ │ Slack API   │ │ QBO API     │ │ Fleet API   │
│             │ │ Graph API   │ │             │ │             │ │             │
│ Scopes:     │ │ Scopes:     │ │ Scopes:     │ │ Scopes:     │ │ Endpoints:  │
│ • send      │ │ • Mail.Send │ │ • chat:write│ │ • accounting│ │ • /vehicles │
│ • read      │ │ • Mail.Read │ │ • channels  │ │ • payments  │ │ • /tracking │
│ • modify    │ │             │ │ • users:read│ │             │ │             │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
       │               │               │               │               │
       └───────────────┴───────────────┴───────────────┴───────────────┘
                                       │
                                       ▼
                         ┌─────────────────────────────┐
                         │    SAMSARA (Dashcam)        │
                         │    API Key Authentication   │
                         └─────────────────────────────┘
```

### 10.2 Integration Status Per Department

| Department | Email | Slack | QuickBooks | FleetHunt | Samsara | Custom |
|------------|-------|-------|------------|-----------|---------|--------|
| Sales | ✅ | ✅ | ❌ | ❌ | ❌ | CRM |
| Finance | ✅ | ✅ | ✅ | ❌ | ❌ | ERP |
| Accounting | ✅ | ✅ | ✅ | ❌ | ❌ | AP/AR |
| Restaurant | ✅ | ✅ | ❌ | ❌ | ❌ | POS, FCM |
| Logistics | ✅ | ✅ | ✅ | ✅ | ✅ | - |

---

## 11. Deployment Architecture

### 11.1 Development Environment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEVELOPMENT SETUP                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  Developer Machine
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │   ┌─────────────────────┐     ┌─────────────────────┐                  │
  │   │   Python Venv       │     │   Node.js           │                  │
  │   │   + FastAPI         │     │   + Next.js         │                  │
  │   │                     │     │                     │                  │
  │   │   uvicorn --reload  │     │   npm run dev       │                  │
  │   │   Port: 8000        │     │   Port: 3000        │                  │
  │   └──────────┬──────────┘     └──────────┬──────────┘                  │
  │              │                           │                             │
  │              │   HTTP/SSE                │   HTTP                      │
  │              │                           │                             │
  │              └─────────────┬─────────────┘                             │
  │                            │                                           │
  │                            ▼                                           │
  │              ┌─────────────────────────────┐                           │
  │              │        SQLite DB            │                           │
  │              │    ai_portal.db (local)     │                           │
  │              └─────────────────────────────┘                           │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Production Environment (Docker)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION DEPLOYMENT                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │         Load Balancer / CDN         │
                    │         (HTTPS Termination)         │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
                    │                                     │
                    ▼                                     ▼
        ┌─────────────────────┐             ┌─────────────────────┐
        │   Frontend Container │             │   Backend Container  │
        │   (Next.js)         │             │   (FastAPI)          │
        │                     │             │                      │
        │   Port: 3000        │────────────▶│   Port: 8000         │
        │   Replicas: 2+      │             │   Replicas: 2+       │
        └─────────────────────┘             └──────────┬───────────┘
                                                       │
                                                       ▼
                              ┌─────────────────────────────────────┐
                              │                                     │
                              ▼                                     ▼
                  ┌─────────────────────┐             ┌─────────────────────┐
                  │   PostgreSQL        │             │   Redis (optional)  │
                  │   Managed Instance  │             │   Session/Cache     │
                  │                     │             │                     │
                  │   Replicas: Primary │             │   Cluster Mode      │
                  │   + Read Replicas   │             │                     │
                  └─────────────────────┘             └─────────────────────┘
```

### 11.3 Docker Compose Services

```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    env_file: ./backend/.env
    volumes:
      - backend-data:/app/data
    depends_on:
      - postgres  # (in prod)

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: ""
    depends_on:
      - backend

  # Production additions:
  postgres:
    image: postgres:16
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis-data:/data
```

---

## 12. Scalability & Performance

### 12.1 Performance Optimizations

| Component | Optimization | Implementation |
|-----------|--------------|----------------|
| Database | Connection Pooling | SQLAlchemy async pool (default: 5-10 connections) |
| Database | Query Indexing | Composite indexes on frequent query patterns |
| API | Async I/O | Full async/await from handler to DB |
| AI | Request Retry | 3x retry with exponential backoff |
| AI | Token Limits | Truncate history to last 20 messages |
| AI | Tool Limits | Max 5 tool loop iterations |
| Streaming | SSE | Real-time response streaming |
| Frontend | Static Generation | Next.js static pages where possible |

### 12.2 Scalability Considerations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SCALING STRATEGY                                      │
└─────────────────────────────────────────────────────────────────────────────┘

 HORIZONTAL SCALING
 ══════════════════

 ┌─────────────────────────────────────────────────────────────────────────┐
 │  Load Balancer (Round Robin / Least Connections)                        │
 └─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │  Backend    │          │  Backend    │          │  Backend    │
   │  Instance 1 │          │  Instance 2 │          │  Instance N │
   │  (Stateless)│          │  (Stateless)│          │  (Stateless)│
   └──────┬──────┘          └──────┬──────┘          └──────┬──────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │     Shared PostgreSQL       │
                    │     (with read replicas)    │
                    └─────────────────────────────┘


 RATE LIMITING (for Claude API)
 ═══════════════════════════════

 ┌─────────────────────────────────────────────────────────────────────────┐
 │  Current: In-memory sliding window (single instance only)               │
 │  Production: Redis-backed distributed rate limiter                      │
 │                                                                         │
 │  Limits per minute:                                                     │
 │  • Standard users: 30 requests                                          │
 │  • Admin users: 100 requests                                            │
 │  • Claude API: Retry with backoff on 429                                │
 └─────────────────────────────────────────────────────────────────────────┘
```

### 12.3 Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | < 200ms | ~150ms (non-AI) |
| AI Response Time (first token) | < 2s | ~1.5s |
| Concurrent Users per Instance | 100+ | Dependent on AI load |
| Database Query Time (avg) | < 50ms | ~20ms |
| SSE Streaming Latency | < 100ms | ~50ms |

---

## 13. Future Roadmap

### 13.1 Planned Enhancements

| Phase | Feature | Description | Priority |
|-------|---------|-------------|----------|
| **Phase 1** | RAG Integration | Vector DB (ChromaDB) for document retrieval | High |
| **Phase 1** | Agent Memory | Cross-conversation context retention | High |
| **Phase 2** | WebSocket Chat | Replace SSE with bidirectional WebSocket | Medium |
| **Phase 2** | File Analysis | In-chat document analysis (PDF, Excel) | Medium |
| **Phase 3** | Custom Tool Builder | Admin UI to define new tools per department | Medium |
| **Phase 3** | Approval Workflows | Human-in-the-loop for sensitive operations | Medium |
| **Phase 4** | Multi-Tenancy | Full tenant isolation with per-org MCP configs | Low |
| **Phase 4** | i18n | Multi-language frontend support | Low |

### 13.2 Architecture Evolution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FUTURE STATE ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────┘

 Current: Monolithic Backend
 ═══════════════════════════

     ┌─────────────────────────────────────────┐
     │            FastAPI Backend               │
     │  (All departments in one service)       │
     └─────────────────────────────────────────┘


 Future Option: Microservices
 ════════════════════════════

     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
     │ Sales Service │     │Finance Service│     │ ... Services  │
     │    + Agent    │     │    + Agent    │     │               │
     └───────┬───────┘     └───────┬───────┘     └───────┬───────┘
             │                     │                     │
             └─────────────────────┼─────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │       API Gateway           │
                    │  (Auth + Rate Limit + Route)│
                    └─────────────────────────────┘


 Future Option: MCP Architecture
 ════════════════════════════════

     ┌─────────────────────────────────────────┐
     │            Agent Orchestrator            │
     │            (MCP Client)                  │
     └─────────────────┬───────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
 │ Salesforce  │ │ SAP ERP     │ │ QuickBooks  │
 │ MCP Server  │ │ MCP Server  │ │ MCP Server  │
 │             │ │             │ │             │
 │ Real CRM    │ │ Real ERP    │ │ Real Acct   │
 │ Integration │ │ Integration │ │ Integration │
 └─────────────┘ └─────────────┘ └─────────────┘
```

---

## Appendix A: Quick Reference

### Environment Variables

```bash
# Application
APP_NAME=multi-dept-ai-portal
APP_ENV=production
SECRET_KEY=<random-32-char-string>

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db

# AI
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-haiku-4-5

# OAuth (Google)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/email/callback/gmail

# OAuth (Microsoft)
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/v1/email/callback/outlook

# OAuth (Slack)
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_REDIRECT_URI=https://yourdomain.com/api/v1/slack/callback

# OAuth (QuickBooks)
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
QUICKBOOKS_REDIRECT_URI=https://yourdomain.com/api/v1/quickbooks/callback

# Integrations
FLEETHUNT_API_KEY=...
SAMSARA_API_KEY=...
```

### Startup Commands

```bash
# Development - Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Development - Frontend
cd frontend
npm run dev

# Production - Docker
docker-compose up --build -d
```

### Default Users (Development)

| Email | Password | Department | Role |
|-------|----------|------------|------|
| admin@gmail.com | admin | Restaurant | Admin |
| admin1@gmail.com | admin | Logistics | Admin |
| finance@demo.com | admin | Finance | Admin |
| accounting@demo.com | admin | Accounting | Admin |
| sales@demo.com | admin | Sales | Admin |

---

*Document generated: April 14, 2026*  
*For internal use only*

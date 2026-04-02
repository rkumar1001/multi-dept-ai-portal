# Multi-Department AI Agent Portal

A single-portal, role-based access architecture for deploying specialized AI agents across **Sales**, **Finance**, and **Accounting** departments.

Built following **Approach 1 (Single Portal with Role-Based Access)** from the architecture document.

## Architecture

```
[Browser] → [Next.js Frontend :3000] → [FastAPI Backend :8000]
                                              │
                          ┌───────────────────┼───────────────────┐
                     [Sales Agent]      [Finance Agent]     [Accounting Agent]
                          │                   │                    │
                      [CRM Tools]        [ERP Tools]        [AP/AR Tools]
                          │                   │                    │
                     ┌────┴───────────────────┴────────────────────┘
                     │
              [Claude API (Anthropic)]
              [PostgreSQL]  [Redis]
```

## Tech Stack

| Layer        | Technology                  |
|--------------|-----------------------------|
| LLM          | Anthropic Claude API        |
| Backend      | Python / FastAPI            |
| Frontend     | Next.js / React / Tailwind  |
| Database     | PostgreSQL                  |
| Cache        | Redis                       |
| Auth         | JWT (BCrypt + JOSE)         |
| Deployment   | Docker Compose              |

## Quick Start

### 1. Prerequisites
- Docker & Docker Compose
- An Anthropic API key

### 2. Configure
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set your ANTHROPIC_API_KEY
```

### 3. Run
```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 4. Create a user
Register via the UI at http://localhost:3000, or via API:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "full_name": "Admin User",
    "department": "sales",
    "role": "admin"
  }'
```

## API Endpoints

| Endpoint                       | Method | Purpose                         |
|-------------------------------|--------|---------------------------------|
| `/api/v1/auth/login`          | POST   | Authenticate user               |
| `/api/v1/auth/register`       | POST   | Register new user               |
| `/api/v1/chat`                | POST   | Send message to dept agent      |
| `/api/v1/chat/stream`         | GET    | Stream response (SSE)           |
| `/api/v1/conversations`       | GET    | List conversation history       |
| `/api/v1/conversations/{id}`  | GET    | Get conversation detail         |
| `/api/v1/admin/usage`         | GET    | Department usage metrics        |
| `/api/v1/admin/config/{dept}` | GET/PUT| Department budget config        |
| `/health`                     | GET    | Health check                    |

## Department Agents

Each department gets a specialized agent with:
- **Custom system prompt** tailored to the domain
- **Department-specific tools** (CRM, ERP, AP/AR integrations)
- **Isolated knowledge base** (vector store namespace)
- **Data isolation** via row-level scoping

| Department  | Tools Available                                      |
|-------------|------------------------------------------------------|
| Sales       | `query_crm`, `search_email_logs`, `get_market_data`  |
| Finance     | `query_erp`, `get_cash_flow_forecast`, `check_compliance` |
| Accounting  | `query_invoices`, `reconcile_accounts`, `calculate_tax`   |

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── agents/          # Agent orchestrator, prompts, tools
│   │   ├── api/             # FastAPI route handlers
│   │   ├── db/              # Database engine & session
│   │   ├── middleware/      # Auth, rate limiting
│   │   ├── models/          # SQLAlchemy models
│   │   ├── services/        # Auth & usage services
│   │   ├── config.py        # Settings (env-based)
│   │   └── main.py          # App entry point
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages (login, chat, admin)
│   │   ├── lib/             # API client
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

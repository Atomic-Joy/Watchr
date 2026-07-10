<div align="center">
  <h1>🍿 Watchr</h1>
  <p><strong>A production-grade, local-first media tracking application</strong></p>
  
  <p>
    <a href="#key-features">Features</a> •
    <a href="#technology-stack">Tech Stack</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#api-reference">API</a>
  </p>
</div>

---

**Watchr** is a resilient, high-performance media tracker application designed to help users track their TV shows and movies. Built with a **local-first architectural philosophy**, it separates core tracking logic from volatile upstream metadata dependencies (like TMDB). This ensures exceptional performance, robust rate-limiting protection, and offline resilience.

## ✨ Key Features

* 🏗️ **Clean Architecture Backend**: Built on FastAPI, strictly decoupling Domain Entities, Application Use Cases, Repositories, and Infrastructure components for maximum maintainability.
* ⚡ **Asynchronous Background Processing**: Utilizes Celery and Redis to handle rate-limited external metadata querying and ingestion seamlessly in the background.
* 💾 **Local-First Resilient Metadata**: Implements a sophisticated mirroring and caching system for TV Show, Season, Episode, and Movie data to support blazing fast query times and fallback offline capabilities.
* 🔄 **Conflict-Free Watch Progress Sync**: Features a chronological scrobble/push reconciliation engine that resolves out-of-order watch progress logs from multiple clients without data loss.
* 🔔 **Smart Notification Engine**: Dynamic, pull-based release notification resolver that avoids expensive `O(N * M)` bulk database writes at release time, fetching updates on-demand.
* 🎨 **Modern Interactive Frontend**: A sleek, responsive UI built with React 19, Vite, TypeScript, Tailwind CSS, and TanStack Query for seamless optimistic state caching.

---

## 🛠️ Technology Stack

### Backend Layer
| Technology | Purpose |
|------------|---------|
| **FastAPI** | Presentation layer, routing, and high-performance async API |
| **SQLAlchemy** | Async ORM transactions against PostgreSQL |
| **Alembic** | Database migrations and schema revision management |
| **Celery & Redis** | Background job queue, scheduler (Beat), and distributed lock provider |
| **Jose/JWT** | Stateless, secure user authentication and session management |

### Frontend Layer
| Technology | Purpose |
|------------|---------|
| **React 19 & TypeScript** | Component rendering and strict type safety |
| **Vite** | Fast bundling and hot-reloading development server |
| **TanStack Query** | Data fetching, optimistic mutations, and local state caching |
| **Tailwind CSS** | Utility-first styling for modern layouts and micro-interactions |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Core relational database storage |
| **Redis** | Message broker for Celery and caching layer |
| **Docker** | Container orchestration for reproducible environments |

---

## 🏗️ Architecture & Directory Structure

The project strictly follows Domain-Driven Design (DDD) principles on the backend and Feature-Sliced Design on the frontend.

```text
├── backend/
│   ├── alembic/                # Database migrations history
│   ├── src/
│   │   ├── api/                # FastAPI routers, endpoints, auth dependencies
│   │   ├── application/        # Use cases (Sync, Notifications, Users)
│   │   ├── domain/             # Pure models and entities (User, History, Metadata)
│   │   ├── infrastructure/     # Database config, TMDB client, Redis cache
│   │   ├── workers/            # Celery application & asynchronous tasks
│   │   └── main.py             # Application entrypoint
│   └── requirements.txt        # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Shared UI components and Layouts
│   │   ├── features/           # Feature-focused modules (Auth, Dashboard, Statistics)
│   │   ├── lib/                # API client wrappers and utilities
│   │   ├── providers/          # React context and global state providers
│   │   └── index.css           # Styling directives
│   └── package.json            # Node dependencies
│
├── docker-compose.yml          # Container configuration (Postgres & Redis)
└── RUNNING.md                  # Comprehensive setup and testing guide
```

---

## 🚀 Getting Started

For a comprehensive, step-by-step guide including CURL tests and edge cases, please refer to [RUNNING.md](https://github.com/Atomic-Joy/Watchr/blob/main/RUNNING.md).

### Prerequisites
* Docker / Podman
* Python 3.10+
* Node.js 20+

### 1. Launch Infrastructure
Start the required database and cache services in the background:
```bash
docker compose up -d
```

### 2. Set Up the Backend
Initialize your virtual environment, apply migrations, and start the API server:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Apply database migrations
alembic upgrade head

# Start FastAPI server
uvicorn src.main:app --reload
```

### 3. Start Background Workers
The background workers process TMDB syncs and release notifications. Open two new terminal windows and activate the virtual environment in each:

**Terminal 1 (Worker):**
```bash
cd backend && source venv/bin/activate
celery -A src.workers.celery_app worker --loglevel=info
```

**Terminal 2 (Scheduler):**
```bash
cd backend && source venv/bin/activate
celery -A src.workers.celery_app beat --loglevel=info
```

### 4. Launch the Frontend
Start the Vite development server:
```bash
cd frontend
npm install
npm run dev
```
Navigate to [http://localhost:5173](http://localhost:5173) to view the application.

---

## 📖 API Reference Overview

The API is fully documented via OpenAPI. Once the backend is running, navigate to:
* **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Core Endpoints
* `POST /api/v1/auth/login/access-token` - Authenticate and retrieve JWT
* `GET /api/v1/metadata/search` - Search TMDB and local cache for media
* `POST /api/v1/sync/push` - Push client watch history and ratings (Conflict-Free Sync)
* `GET /api/v1/users/me/history` - Retrieve chronological watch history
* `GET /api/v1/users/me/progress` - View aggregated TV show watch progress

---

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

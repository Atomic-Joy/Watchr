<div align="center">
  <h1>⚙️ Watchr Development Guide</h1>
  <p><strong>Comprehensive Setup, Execution, and API Testing Manual</strong></p>
  
  <p>
    <a href="#-prerequisites">Prerequisites</a> •
    <a href="#%EF%B8%8F-local-environment-setup">Environment Setup</a> •
    <a href="#-running-the-application">Running the Application</a> •
    <a href="#%EF%B8%8F-api-testing-guide">API Testing Guide</a> •
    <a href="#-database-management">Database Management</a>
  </p>
</div>

---

This guide provides step-by-step instructions for initializing the local development environment, running background services, and thoroughly testing the Watchr backend API.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your host system:
* **Docker** or **Podman** (with `docker compose` compatibility)
* **Python 3.10+**
* **Node.js 20+** & **npm**
* **cURL** or a similar HTTP client for testing

---

## 🛠️ Local Environment Setup

### 1. Start Infrastructure (PostgreSQL & Redis)
The backend relies on PostgreSQL for persistent storage and Redis for Celery task queuing and caching.
```bash
docker compose up -d
```
> **Note for Podman users:** The `docker-compose.yml` uses fully qualified image names (`docker.io/library/...`) to prevent interactive registry prompts.

### 2. Configure Backend Environment
Navigate to the `backend/` directory, set up the virtual environment, and define the required secrets:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file inside the `backend/` directory:
```env
TMDB_API_KEY=your_tmdb_api_key_here
```
> **💡 TMDB API Keys:** This project seamlessly supports both **v3 API keys** (32 hex characters, passed as query parameters) and **v4 Read Access Tokens** (JWTs, sent in the Bearer header).

### 3. Initialize Database Schema
Run Alembic migrations to construct the database schema (including users, watch history, sync logs, and metadata tables):
```bash
alembic upgrade head
```

### 4. Setup Frontend Dependencies
In a new terminal window, navigate to the frontend directory and install NPM packages:
```bash
cd frontend
npm install
```

---

## 🚀 Running the Application

To fully test the system, you must run four separate processes concurrently. Open four terminal windows/tabs:

### Terminal 1: FastAPI Server
Runs the core REST API handling client requests.
```bash
cd backend && source venv/bin/activate
uvicorn src.main:app --reload
```
* **API URL:** [http://localhost:8000](http://localhost:8000)
* **Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Terminal 2: Celery Worker
Processes asynchronous tasks like metadata syncs and background cache updates.
```bash
cd backend && source venv/bin/activate
celery -A src.workers.celery_app worker --loglevel=info
```

### Terminal 3: Celery Beat (Scheduler)
Triggers periodic tasks, such as generating daily release notifications.
```bash
cd backend && source venv/bin/activate
celery -A src.workers.celery_app beat --loglevel=info
```

### Terminal 4: Frontend Development Server
Runs the React 19 UI with hot module replacement (HMR).
```bash
cd frontend
npm run dev
```
* **Frontend UI:** [http://localhost:5173](http://localhost:5173)

---

## 🎨 Testing the New Frontend UI

With the frontend running, you can explore the new features:
1. **Dashboard (`/`)**: View your personalized **Continue Watching** queue with progress tracking, and check the **Release Radar** tab for upcoming episodes of tracked shows.
2. **Statistics (`/statistics`)**: Explore your watch stats through new rich analytics cards, and navigate recent watches with the horizontally scrolling **History Carousel**.
3. **History (`/history`)**: Browse your complete, chronological watch history in the new **Timeline** view, complete with sticky date headers and interactive jumping via the calendar strip.

---
## 🛰️ API Testing Guide

All `curl` commands below assume you are running them from your root directory and the backend is active on port 8000.

### A. Authentication & User Management

#### 1. Register a new user:
```bash
curl -X POST "http://localhost:8000/api/v1/users/" \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "securepassword123"}'
```

#### 2. Log in and acquire an Access Token:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login/access-token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=test@example.com&password=securepassword123"
```
> **Important:** Access tokens are valid for 30 minutes. Export the token value as an environment variable to use in subsequent requests:
```bash
export TOKEN="<your_copied_access_token_here>"
```

#### 3. View User Profile:
```bash
curl -X GET "http://localhost:8000/api/v1/users/me" \
     -H "Authorization: Bearer $TOKEN"
```

#### 4. Manage Preferences:
```bash
# Retrieve current preferences
curl -X GET "http://localhost:8000/api/v1/users/me/preferences" \
     -H "Authorization: Bearer $TOKEN"

# Update preferences
curl -X PATCH "http://localhost:8000/api/v1/users/me/preferences" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"timezone": "America/New_York", "language": "en"}'
```

---

### B. Metadata & Local-First Search
Test the resilient search system, which utilizes Redis for caching and Celery for background ingestion.

#### 1. Trigger Initial Search (Cache Miss)
This will hit TMDB and enqueue a background worker task to sync the metadata locally.
```bash
curl -X GET "http://localhost:8000/api/v1/metadata/search?query=Inception"
```
*(Check your Celery Worker terminal to observe the background sync occurring!)*

#### 2. Repeat Search (Cache Hit)
This returns results immediately from the local database or Redis cache.
```bash
curl -X GET "http://localhost:8000/api/v1/metadata/search?query=Inception"
```

---

### C. Conflict-Free Watch Progress Sync

#### 1. Push Offline Watch Logs
Simulates an offline client pushing queued scrobble events.
```bash
curl -X POST "http://localhost:8000/api/v1/sync/push" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '[
       {
         "device_id": "mobile_app_ios",
         "action_type": "watch",
         "media_type": "movie",
         "tmdb_id": 27205,
         "action_timestamp": "2026-07-06T10:00:00Z"
       },
       {
         "device_id": "mobile_app_ios",
         "action_type": "watch",
         "media_type": "episode",
         "tmdb_id": 1399,
         "season_number": 1,
         "episode_number": 1,
         "action_timestamp": "2026-07-06T11:00:00Z"
       }
     ]'
```

#### 2. Retrieve Chronological Watch History
```bash
curl -X GET "http://localhost:8000/api/v1/users/me/history" \
     -H "Authorization: Bearer $TOKEN"
```

#### 3. Inspect TV Show Completion Progress
```bash
curl -X GET "http://localhost:8000/api/v1/users/me/progress" \
     -H "Authorization: Bearer $TOKEN"
```

---

### D. Pull-Based Release Notifications

#### 1. Retrieve Notification Feed
Fetches on-demand release notifications for tracked TV shows.
```bash
curl -X GET "http://localhost:8000/api/v1/notifications/" \
     -H "Authorization: Bearer $TOKEN"
```

#### 2. Mark Notification as Read
```bash
curl -X POST "http://localhost:8000/api/v1/notifications/<notification_id>/read" \
     -H "Authorization: Bearer $TOKEN"
```

#### 3. Trigger Notification Engine Manually
To test notifications without waiting for the scheduled Celery Beat chron job:
```bash
cd backend
venv/bin/python -c "
import asyncio
from src.infrastructure.database.session import AsyncSessionLocal
from src.application.services.notification_service import NotificationService

async def main():
    async with AsyncSessionLocal() as session:
        await NotificationService.generate_release_notifications(session)

asyncio.run(main())
"
```

---

## 🗄️ Database Management

Directly interact with the PostgreSQL database for debugging and verification.

### Option 1: Docker CLI Shell (`psql`)
Start an interactive SQL session directly inside the container:
```bash
docker compose exec db psql -U postgres -d trakt_clone
```
**Useful `psql` Commands:**
* `\dt` - List all tables
* `SELECT * FROM users;` - View registered users
* `SELECT * FROM watch_history;` - View chronological sync logs
* `SELECT title, first_air_date FROM tv_shows;` - View cached TV shows
* `\q` - Quit

### Option 2: GUI Database Client (DBeaver, pgAdmin, DataGrip)
Create a new **PostgreSQL** connection:
* **Host / Server:** `localhost` (or `127.0.0.1`)
* **Port:** `5432`
* **Database:** `trakt_clone` *(Important: Not the default `postgres` DB)*
* **Username:** `postgres`
* **Password:** `postgres`

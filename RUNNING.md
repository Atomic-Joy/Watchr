# Running the Watchr (Trakt Clone) Application

Follow this guide to get the local development environment up and running.

---

## 📋 Prerequisites

Make sure you have the following installed on your host system:
* **Docker** or **Podman** (with `docker compose` compatibility or `podman-compose`)
* **Python 3.10+**
* **Node.js** & **npm**

---

## 🛠️ Step 1: Start Database & Redis (Infrastructure)

Start the local PostgreSQL database and Redis instance using Docker Compose:
```bash
docker compose up -d
```
> **Note for Podman users:** The `docker-compose.yml` has been updated to use fully qualified image names (`docker.io/library/...`) to prevent interactive registry prompts.

---

## 🐍 Step 2: Set Up and Start the Backend

1. **Activate the Virtual Environment:**
   Navigate to the `backend/` directory and activate the pre-existing virtual environment:
   ```bash
   cd backend
   source venv/bin/activate
   ```
   *(If the virtual environment is missing or empty, run `pip install -r requirements.txt`)*

2. **Configure Environment Variables:**
   Create a `.env` file inside the `backend/` directory:
   ```env
   TMDB_API_KEY=your_tmdb_api_key_here
   ```
   > **TMDB API Keys:** This project seamlessly supports both **v3 API keys** (32 hex characters, passed as query parameters) and **v4 Read Access Tokens** (JWTs, sent in the Bearer header).

3. **Generate and Run Database Migrations:**
   ```bash
   alembic revision --autogenerate -m "Initial schema"
   alembic upgrade head
   ```

4. **Start the FastAPI Application:**
   ```bash
   uvicorn src.main:app --reload
   ```
   The API will be available at [http://localhost:8000](http://localhost:8000). You can access the interactive OpenAPI/Swagger documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

5. **Start the Celery Background Worker & Beat Scheduler (Separate Terminals):**
   In a new terminal window, activate the virtual environment and start the worker to handle background metadata sync tasks:
   ```bash
   cd backend
   source venv/bin/activate
   celery -A src.workers.celery_app worker --loglevel=info
   ```
   In another terminal, start the celery beat scheduler for running the daily release notification checks:
   ```bash
   cd backend
   source venv/bin/activate
   celery -A src.workers.celery_app beat --loglevel=info
   ```

---

## 💻 Step 3: Set Up and Start the Frontend

1. **Navigate to the Root Directory:**
   ```bash
   cd /home/atomicjoy/Projects/trakt
   ```

2. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The frontend hot-reloading dev server will start (usually at [http://localhost:5173](http://localhost:5173)).

---

## 🧪 Running & Testing the API

### 1. Start Services
Make sure your PostgreSQL database and Redis instances are running:
```bash
docker compose up -d
```

### 2. Run Database Migrations
Apply the database schemas (including user preferences, watch history, sync logs, and metadata tables):
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

### 3. Start the FastAPI Dev Server
```bash
uvicorn src.main:app --reload
```
The server will start at [http://localhost:8000](http://localhost:8000) and the interactive docs will be at [http://localhost:8000/docs](http://localhost:8000/docs).

### 4. Start the Celery Worker & Beat (In separate terminals)
To handle background metadata synchronization:
```bash
cd backend
source venv/bin/activate
celery -A src.workers.celery_app worker --loglevel=info
```
To run scheduled notification checks:
```bash
cd backend
source venv/bin/activate
celery -A src.workers.celery_app beat --loglevel=info
```

---

## 🛰️ API Testing Guide

### A. Authentication & Users
All commands can be run from the root of the workspace.

#### 1. Register a new user:
```bash
curl -X POST "http://localhost:8000/api/v1/users/" \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "securepassword123"}'
```

#### 2. Log in and get an Access Token:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login/access-token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=test@example.com&password=securepassword123"
```
*Note: Access tokens are valid for 30 minutes. Export the token value as an environment variable to use in the subsequent steps:*
```bash
export TOKEN="<your_copied_access_token_here>"
```

#### 3. View user profile:
```bash
curl -X GET "http://localhost:8000/api/v1/users/me" \
     -H "Authorization: Bearer $TOKEN"
```

#### 4. View and update preferences:
```bash
# Get preferences
curl -X GET "http://localhost:8000/api/v1/users/me/preferences" \
     -H "Authorization: Bearer $TOKEN"

# Update preferences
curl -X PATCH "http://localhost:8000/api/v1/users/me/preferences" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"timezone": "America/New_York", "language": "en"}'
```

---

### B. Metadata & Search
Test the local-first search system (which integrates Redis caching).

#### 1. Trigger search (cache miss -> hits TMDB -> enqueues background TV show/movie sync):
```bash
curl -X GET "http://localhost:8000/api/v1/metadata/search?query=Inception"
```
**Expected Response:**
```json
{
  "results": [ ... ],
  "source": "tmdb"
}
```
*(Check your Celery logs to see the worker syncing details for movies and show seasons on the fly!)*

#### 2. Run the search again (cache hit -> returns directly from local database/Redis cache):
```bash
curl -X GET "http://localhost:8000/api/v1/metadata/search?query=Inception"
```
**Expected Response:**
```json
{
  "results": [ ... ],
  "source": "local"
}
```

---

### C. Conflict-Free Watch Progress Sync

#### 1. Push watch logs:
Pushes a batch of watch progress logs (simulating offline scrobble logs collected by a client):
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
**Expected Response:**
```json
{
  "processed": 2,
  "skipped": 0,
  "status": "success"
}
```

#### 2. Inspect watch history:
```bash
curl -X GET "http://localhost:8000/api/v1/users/me/history" \
     -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
[
  {
    "media_type": "episode",
    "watched_at": "2026-07-06T11:00:00+00:00",
    "title": "Game of Thrones - S01E01: Winter Is Coming",
    "details": {
      "show_title": "Game of Thrones",
      "season_number": 1,
      "episode_number": 1,
      "episode_title": "Winter Is Coming"
    }
  },
  {
    "media_type": "movie",
    "watched_at": "2026-07-06T10:00:00+00:00",
    "title": "Inception",
    "details": {
      "tmdb_id": 27205,
      "overview": "..."
    }
  }
]
```

#### 3. Inspect TV Show progress:
```bash
curl -X GET "http://localhost:8000/api/v1/users/me/progress" \
     -H "Authorization: Bearer $TOKEN"
```
**Expected Response:**
```json
[
  {
    "show_title": "Game of Thrones",
    "progress_percent": 0.27,
    "last_watched_at": "2026-07-06T11:00:00+00:00"
  }
]
```

---

### D. Pull-Based Release Notifications

#### 1. Retrieve user notification feed:
Fetches personalized release notifications for TV shows in the user's watch history:
```bash
curl -X GET "http://localhost:8000/api/v1/notifications/" \
     -H "Authorization: Bearer $TOKEN"
```

#### 2. Mark a notification as read:
```bash
curl -X POST "http://localhost:8000/api/v1/notifications/<notification_id>/read" \
     -H "Authorization: Bearer $TOKEN"
```

#### 3. Manually Trigger Notification Generation:
To immediately trigger notification generation for tracked TV shows without waiting for the scheduled Celery Beat task, execute the following from the `backend/` directory:
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

### E. Direct Database Access & Querying

To view or manage the data stored in the local PostgreSQL database, use one of the options below:

#### 1. Connect via CLI (`psql` in Docker / Podman)
Run the following from the root directory containing your `docker-compose.yml` to start an interactive SQL shell:
```bash
docker compose exec db psql -U postgres -d trakt_clone
```
Useful commands once connected:
* `\dt` - List all tables.
* `SELECT * FROM watch_history;` - View logged user watch logs.
* `SELECT title, first_air_date FROM tv_shows;` - View cached TV show metadata.
* `\q` - Quit the terminal.

#### 2. Connect via Database GUI Client (e.g., DBeaver, pgAdmin)
Create a new **PostgreSQL** connection with the following settings:
* **Host / Server:** `localhost` (or `127.0.0.1`)
* **Port:** `5432`
* **Database:** `trakt_clone` (Make sure to specify this instead of default `postgres`)
* **Username:** `postgres`
* **Password:** `postgres`

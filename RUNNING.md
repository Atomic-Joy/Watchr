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

5. **Start the Celery Background Worker (Separate Terminal):**
   In a new terminal window, activate the virtual environment and start the worker to handle background metadata sync tasks:
   ```bash
   cd backend
   source venv/bin/activate
   celery -A src.workers.celery_app worker --loglevel=info
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

## 🧪 Testing the API

### Manual Testing
You can manually query the running FastAPI instance:
* **Search for movies/TV shows:**
  ```bash
  curl "http://localhost:8000/api/v1/metadata/search?query=Inception"
  ```
* **Get movie details:**
  ```bash
  curl "http://localhost:8000/api/v1/metadata/movies/272052"
  ```

### Automated Testing
You can create a `tests` suite using `pytest` (pre-installed in the virtual environment):
1. Create a `tests/` directory under `backend/`.
2. Create test files matching the prefix `test_*.py`.
3. Run the test suite:
   ```bash
   cd backend
   pytest
   ```

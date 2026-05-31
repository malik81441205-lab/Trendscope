# TrendScope — System Architecture & Data Flow Diagrams

This document explains the technical architecture, operational pipelines, and data flows of the **TrendScope** system using visual Mermaid diagrams. It is designed to help you quickly understand how frontend, backend, database, and third-party APIs work together!

---

## 1. High-Level System Architecture

TrendScope uses a classic **Client-Server-Database** architecture. 
*   The **Frontend SPA** (Single Page Application) runs entirely in the user's web browser.
*   The **Backend Express Server** handles the business logic, session checks, security limits, and schedules.
*   The **MySQL Database** stores persistent records (users, history, logs) and caches heavy YouTube API feeds.

```mermaid
graph TD
    %% Define Nodes
    subgraph Client ["Client Browser (Frontend SPA)"]
        SPA["index.html (Single Page App)"]
        AJS["app.js / auth-gate.js (Logic)"]
        CSS["style.css / mobile.css (Styles)"]
        CJS["Chart.js (Visual Analytics)"]
        LJS["Leaflet.js (Map demographic graphics)"]
    end

    subgraph Security ["Security & Limit Layer"]
        Rate["Rate Limiters (100 req / 15m)"]
        XSS["Input Sanitizers (XSS Defense)"]
        HPP["HPP Protection Middleware"]
        JWT["Cookie JWT Verification"]
    end

    subgraph Backend ["Backend Server (Node.js & Express)"]
        Router["Express Router (Mapping)"]
        Controller["Controllers (Business Logic)"]
        Cron["node-cron Schedulers"]
        YTService["youtubeService.js (API Caller)"]
    end

    subgraph Data ["Data Storage & External Services"]
        DB[(MySQL Database)]
        YTAPI["YouTube Data API v3"]
        Recaptcha["Google reCAPTCHA v2 API"]
        GoogleOAuth["Google One-Tap OAuth service"]
    end

    %% Define Relationships
    SPA -->|HTTPS User Clicks| AJS
    AJS -->|REST API Request / JSON| Security
    Security -->|Filtered Payload| Router
    Router --> Controller
    Controller -->|Queries / SQL| DB
    Controller --> YTService
    YTService -->|Fetches Trending Feeds| YTAPI
    Cron -->|Hourly snapshot & 6-hr purge| DB
    AJS -->|reCAPTCHA validation token| Recaptcha
    AJS -->|Google Sign-In token| GoogleOAuth
```

---

## 2. Server Boot & Database Initialization Flow

When the Node.js backend starts up (`npm start`), it goes through a safe, automated initialization pipeline to guarantee database integrity before starting the server.

```mermaid
sequenceDiagram
    participant OS as Node.js Process (server.js)
    participant Config as Database Config (database.js)
    participant MySQL as MySQL Database Server

    OS->>Config: Trigger initDatabase() on boot
    Config->>MySQL: Establish connection pool
    
    activate MySQL
    Config->>MySQL: CREATE TABLE IF NOT EXISTS (users, videos, creators, trend_history, regions, keywords, saved_trends, system_logs, system_settings, feedbacks)
    Note over Config, MySQL: The database is created automatically if missing
    
    Config->>MySQL: Run safe ALTER TABLE column migrations on feedbacks
    Note over Config, MySQL: Ensures new columns exist safely without data loss
    
    Config->>MySQL: Run Auto-Approve on existing feedback rows
    
    Config->>MySQL: INSERT IGNORE pre-seeded values (regions, settings)
    deactivate MySQL
    
    Config-->>OS: Initialization Complete (Pool Ready)
    OS->>OS: Start Hourly snapshots & Auto-Cleanup Cron jobs
    OS->>OS: Listen on PORT (5000)
    Note over OS: Server is Live and accepting API requests!
```

---

## 3. Data Query Flow: Viewing Trends (Caching Strategy)

To save YouTube API quota (which has a daily maximum of 10,000 requests), TrendScope utilizes a highly efficient **Cache-First Caching Strategy**.

```mermaid
graph TD
    A[User requests Trending list for US] --> B(GET /api/trends?country=US)
    B --> C{Are there cached videos for US < 4 hours old in DB?}
    
    %% Cache Hit Path
    C -->|YES: Cache Hit| D[Fetch cached videos directly from MySQL DB]
    D --> E[Log cache hit and return JSON data immediately]
    E --> F[Frontend draws charts and maps with zero API overhead!]

    %% Cache Miss Path
    C -->|NO: Cache Miss| G[Call YouTube API v3 list 'mostPopular']
    G --> H[Batch-fetch Channel details - avatars, subscribers]
    H --> I[Calculate Engagement Rates and Viral Probabilities]
    I --> J[Write new cache records to MySQL 'videos' table]
    J --> K[Log snapshot inside 'trend_history' table for analytics]
    K --> L[Return fresh JSON data to user]
    L --> F
```

---

## 4. Authentication Architecture (JWT & HttpOnly Cookies)

TrendScope implements secure token-based authentication. 

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant Express as Express Backend Server
    participant DB as MySQL Database

    Note over User, Express: Login Request Flow
    User->>Express: POST /api/login { email, password, recaptchaToken }
    Express->>Express: Validate reCAPTCHA token & rate-limiting
    Express->>DB: Query User by Email
    DB-->>Express: Returns user row (including bcrypt hash)
    Express->>Express: bcrypt.compare(inputPassword, storedHash)
    
    Note over Express: Token Generation & Secure Cookie Attachment
    Express->>Express: Sign JWT Token with JWT_SECRET (Payload: id, email, role)
    Express-->>User: HTTP 200 OK with HttpOnly Cookie: vvw_auth_token
    
    Note over User: Authorized API Access Flow
    User->>Express: GET /api/saved-trends/mine (Reads Cookie Automatically)
    Express->>Express: authMiddleware validates cookie JWT signature
    Express->>DB: Fetch saved bookmarks for active user ID
    DB-->>Express: Returns bookmarks list
    Express-->>User: Returns bookmarks JSON payload
```

---

## 5. Multi-Layer Security Architecture

TrendScope uses a comprehensive **defense-in-depth** strategy to secure every layer of the application.

```text
  [ Incoming HTTP Request ]
             │
             ▼
┌─────────────────────────────────────────┐
│ 1. Network Layer (express-rate-limit)   │ ──► Prevents denial of service & brute-force
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 2. HTTP Security Headers (Helmet / HPP) │ ──► Secures parameters and prevents XSS/CSRF
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 3. User Payload Sanitization            │ ──► Escapes HTML tags in inputs to block XSS
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 4. Authentication Layer (JWT & reCAPTCHA)│ ──► Confirms identity and blocks automation
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 5. Database Layer (Prepared Statements) │ ──► Escapes SQL parameters to block SQL injection
└─────────────────────────────────────────┘
             │
             ▼
  [ Safe Execution in Database ]
```

Happy studying! This visual architecture manual should give you a clear, structural map of the entire TrendScope platform. Let's make something great!

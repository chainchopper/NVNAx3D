# Nirvana PersonI AI - Complete Setup Guide

## Quick Start

### Option 1: Standalone Mode (No Docker)
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Add your AI provider API key to .env
# At minimum, add GEMINI_API_KEY or OPENAI_API_KEY

# 3. Start the application
npm run dev          # Frontend (port 5000)
node server.js       # Backend (port 3001)
```

### Option 2: Full Stack with Docker Compose
```bash
# 1. Setup environment
cp .env.example .env
# Edit .env and add your API keys

# 2. Launch all services
docker-compose up -d

# 3. Start Nirvana app
npm run dev
node server.js
```

## Environment Variables Reference

### 🔴 Required (Choose at least ONE AI provider)
- `GEMINI_API_KEY` - Google Gemini API (recommended for full features)
- `OPENAI_API_KEY` - OpenAI GPT models

### 🟡 Google OAuth (for Gmail/Calendar integration)
Get from: https://console.cloud.google.com/apis/credentials

1. Create OAuth 2.0 Client ID (Web application)
2. Add redirect URI: `http://localhost:5000/oauth/callback`
3. Enable APIs: Gmail API, Google Calendar API
4. Add to .env:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/oauth/callback
   ```

### 🟡 Twilio (for SMS/Voice calls)
Get from: https://console.twilio.com/

```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 🟢 Optional APIs

**Financial Data:**
- `ALPHA_VANTAGE_API_KEY` - Stock market data (free: https://www.alphavantage.co/)
- `FINNHUB_API_KEY` - Market news (free: https://finnhub.io/)
- `COINMARKETCAP_API_KEY` - Crypto data (free: https://coinmarketcap.com/api/)

**Music & Media:**
- `AUDD_API_TOKEN` - Music identification (free: https://audd.io/)
- `GENIUS_API_TOKEN` - Song lyrics (free: https://genius.com/api-clients)

**Productivity:**
- `NOTION_TOKEN` - Notion integration
- `LINEAR_API_KEY` - Linear issue tracking
- `SLACK_BOT_TOKEN` - Slack messaging
- `GITHUB_TOKEN` - GitHub integration

## Docker Services

When you run `docker-compose up`, you get:

| Service | Port | Purpose |
|---------|------|---------|
| **PostgreSQL** | 5432 | Relational database |
| **Milvus** | 19530 | Vector database (embeddings) |
| **Qdrant** | 6333 | Alternative vector DB |
| **Flowise** | 3000 | LLM workflow builder UI |
| **n8n** | 5678 | Workflow automation UI |
| **Jupyter** | 8888 | Notebook environment |
| **Apache Tika** | 9998 | Document parsing |
| **MinIO** | 9000/9001 | Object storage |

### Access UIs
- Flowise: http://localhost:3000 (admin/admin)
- n8n: http://localhost:5678 (admin/admin)
- Jupyter: http://localhost:8888 (token: nirvana)
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

## Database Configuration

### Using Docker PostgreSQL
Already configured in docker-compose.yml. Connection string:
```
DATABASE_URL=postgresql://nirvana:nirvana_local_pass@localhost:5432/nirvana
```

### Using Cloud Database
Replace with your provider's connection string:
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

## Vector Database Options

### 1. ChromaDB (Embedded - Default)
No configuration needed. Runs in-browser with localStorage fallback.

### 2. Milvus (Docker - High Performance)
```bash
docker-compose up -d milvus etcd minio
```
Add to .env:
```
MILVUS_HOST=localhost
MILVUS_PORT=19530
```

### 3. Qdrant (Docker - Alternative)
```bash
docker-compose up -d qdrant
```
Add to .env:
```
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

## Production Deployment

### 1. Update Environment Variables
```
NODE_ENV=production
PUBLIC_URL=https://your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
```

### 2. Update OAuth Redirects
In Google Cloud Console, add your production redirect URI:
```
https://your-domain.com/oauth/callback
```

### 3. Secure Passwords
Change all default passwords in .env:
- `POSTGRES_PASSWORD`
- `FLOWISE_PASSWORD`
- `N8N_BASIC_AUTH_PASSWORD`

### 4. Use HTTPS
Enable SSL/TLS with reverse proxy (nginx, Caddy, or cloud provider)

## Troubleshooting

### OAuth "Redirect URI Mismatch"
Ensure these match exactly in Google Cloud Console:
- Development: `http://localhost:5000/oauth/callback`
- Production: `https://your-domain.com/oauth/callback`

### Database Connection Fails
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

### Port Conflicts
If ports are in use, change in .env:
```
APP_PORT=5001
FLOWISE_PORT=3001
N8N_PORT=5679
```

## Data Storage

All data persists in `./data/` directory:
```
data/
├── postgres/      # Database files
├── milvus/        # Vector embeddings
├── qdrant/        # Alternative vectors
├── chroma/        # Browser-based vectors
├── flowise/       # LLM workflows
├── n8n/           # Automation workflows
├── jupyter/       # Notebooks
├── minio/         # Object storage
└── etcd/          # Metadata
```

**Backup:** Simply copy `./data/` directory

## Architecture

```
┌─────────────────┐
│  Nirvana App    │ :5000 (Frontend)
│  + Backend API  │ :3001
└────────┬────────┘
         │
    ┌────┴─────────────────────────────┐
    │                                  │
┌───▼────┐  ┌──────────┐  ┌─────────┐
│Postgres│  │  Milvus  │  │ ChromaDB│
│  :5432 │  │  :19530  │  │(Browser)│
└────────┘  └──────────┘  └─────────┘
    │           │
┌───▼───────────▼───┐
│   Flowise :3000   │ (LLM Orchestration)
│   n8n :5678       │ (Workflow Automation)
│   Jupyter :8888   │ (Notebooks)
└───────────────────┘
```

## Security Notes

⚠️ **NEVER commit .env to version control**
⚠️ **Change default passwords in production**
⚠️ **Use HTTPS in production**
⚠️ **Secure API keys using environment variables only**

This system is designed to be **100% portable** - no cloud platform lock-in.

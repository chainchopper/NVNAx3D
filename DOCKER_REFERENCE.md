# Docker Compose Quick Reference

## 🚀 Getting Started

### Launch All Services
```bash
docker-compose up -d
```

### Launch Specific Services
```bash
# Just databases
docker-compose up -d postgres milvus qdrant

# Just workflow tools
docker-compose up -d flowise n8n

# Just data science tools
docker-compose up -d jupyter
```

## 📊 Service Management

### View Running Services
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f milvus
docker-compose logs -f flowise
```

### Stop Services
```bash
# Stop all
docker-compose stop

# Stop specific
docker-compose stop flowise n8n
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific
docker-compose restart postgres
```

### Stop and Remove Everything
```bash
docker-compose down

# Remove volumes too (CAUTION: deletes data)
docker-compose down -v
```

## 🔍 Health Checks

### Check PostgreSQL
```bash
docker-compose exec postgres psql -U nirvana -c "SELECT version();"
```

### Check Milvus
```bash
curl http://localhost:9091/healthz
```

### Check Qdrant
```bash
curl http://localhost:6333/healthz
```

### Check Flowise
```bash
curl http://localhost:3000/api/v1/ping
```

## 🛠️ Maintenance

### View Resource Usage
```bash
docker stats
```

### Clean Up Unused Resources
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Clean everything (CAUTION)
docker system prune -a
```

### Backup Data
```bash
# PostgreSQL
docker-compose exec postgres pg_dump -U nirvana nirvana > backup.sql

# All data directories
tar -czf nirvana-data-backup.tar.gz ./data/
```

### Restore Data
```bash
# PostgreSQL
cat backup.sql | docker-compose exec -T postgres psql -U nirvana nirvana

# All data directories
tar -xzf nirvana-data-backup.tar.gz
```

## 🔧 Troubleshooting

### Service Won't Start
```bash
# Check logs for errors
docker-compose logs servicename

# Remove and recreate
docker-compose rm -f servicename
docker-compose up -d servicename
```

### Port Already in Use
```bash
# Find what's using the port
lsof -i :5432  # PostgreSQL
lsof -i :3000  # Flowise
lsof -i :5678  # n8n

# Change port in .env file, then restart
docker-compose down
docker-compose up -d
```

### Reset Everything
```bash
# Stop all services
docker-compose down -v

# Remove data (CAUTION: permanent!)
rm -rf ./data/

# Recreate
docker-compose up -d
```

## 📍 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Flowise | http://localhost:3000 | admin / admin |
| n8n | http://localhost:5678 | admin / admin |
| Jupyter | http://localhost:8888 | Token: nirvana |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| PostgreSQL | localhost:5432 | nirvana / nirvana_local_pass |
| Milvus | localhost:19530 | No auth |
| Qdrant | localhost:6333 | No auth |

## 🔐 Security Notes

- Default passwords are for **development only**
- Change all passwords in `.env` for production
- Use firewall rules to restrict access
- Enable authentication on all services in production

## 📦 Data Persistence

All data is stored in `./data/` subdirectories:
- `./data/postgres` - PostgreSQL database
- `./data/milvus` - Vector embeddings
- `./data/qdrant` - Alternative vectors
- `./data/flowise` - LLM workflows
- `./data/n8n` - Automation workflows
- `./data/jupyter` - Notebooks

**Backup strategy:** Regular `tar` backups of `./data/` directory

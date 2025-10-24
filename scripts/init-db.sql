-- =============================================================================
-- NIRVANA Phase 0 - PostgreSQL Initialization Script
-- =============================================================================
-- This script creates separate databases for Flowise and n8n
-- It runs automatically when the PostgreSQL container is first created
-- =============================================================================

-- Create database for Flowise
CREATE DATABASE flowise;
GRANT ALL PRIVILEGES ON DATABASE flowise TO nirvana;

-- Create database for n8n
CREATE DATABASE n8n;
GRANT ALL PRIVILEGES ON DATABASE n8n TO nirvana;

-- Log initialization
\echo 'NIRVANA infrastructure databases initialized successfully'
\echo '  - flowise: Database for Flowise LLM orchestration'
\echo '  - n8n: Database for n8n workflow automation'
\echo '  - nirvana: Main application database'

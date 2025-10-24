@echo off
REM =============================================================================
REM NIRVANA Phase 0 Infrastructure Launcher (Windows)
REM =============================================================================
REM This script:
REM 1. Verifies Docker is installed and running
REM 2. Creates .env from .env.example if needed
REM 3. Starts Docker Compose services (with GPU if available)
REM 4. Waits for services to be healthy
REM 5. Launches the NIRVANA web application
REM =============================================================================

setlocal enabledelayedexpansion

REM =============================================================================
REM Step 1: Check if Docker is installed
REM =============================================================================
echo [INFO] Checking Docker installation...

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed!
    echo Please install Docker Desktop from: https://docs.docker.com/desktop/install/windows-install/
    exit /b 1
)

echo [OK] Docker is installed

REM =============================================================================
REM Step 2: Check if Docker is running
REM =============================================================================
echo [INFO] Checking if Docker daemon is running...

docker info >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker daemon is not running!
    echo Please start Docker Desktop and try again.
    exit /b 1
)

echo [OK] Docker daemon is running

REM =============================================================================
REM Step 3: Check if docker-compose is available
REM =============================================================================
echo [INFO] Checking Docker Compose...

where docker-compose >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set COMPOSE_CMD=docker-compose
) else (
    docker compose version >nul 2>nul
    if !ERRORLEVEL! EQU 0 (
        set COMPOSE_CMD=docker compose
    ) else (
        echo [ERROR] Docker Compose is not available!
        echo Please install Docker Compose
        exit /b 1
    )
)

echo [OK] Docker Compose is available

REM =============================================================================
REM Step 4: Create .env file if it doesn't exist
REM =============================================================================
echo [INFO] Checking environment configuration...

if not exist .env (
    if exist .env.example (
        echo [WARN] .env file not found, creating from .env.example...
        copy .env.example .env >nul
        echo [OK] .env file created
        echo [INFO] Please review and customize .env file for your environment
    ) else (
        echo [ERROR] .env.example file not found!
        exit /b 1
    )
) else (
    echo [OK] .env file exists
)

REM Load USE_GPU setting from .env
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /v "^#" ^| findstr "USE_GPU"') do set %%a=%%b

REM =============================================================================
REM Step 5: Check for GPU support
REM =============================================================================
echo [INFO] Checking for GPU support...

set GPU_AVAILABLE=false
where nvidia-smi >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    nvidia-smi >nul 2>nul
    if !ERRORLEVEL! EQU 0 (
        set GPU_AVAILABLE=true
        echo [OK] NVIDIA GPU detected
        
        if "%USE_GPU%"=="true" (
            echo [INFO] GPU support enabled in configuration
            set COMPOSE_FILES=-f docker-compose.yml -f docker-compose.gpu.yml
        ) else (
            echo [WARN] GPU available but not enabled in .env (USE_GPU=false^)
            set COMPOSE_FILES=-f docker-compose.yml
        )
    )
) else (
    echo [INFO] No GPU detected, using CPU-only mode
    set COMPOSE_FILES=-f docker-compose.yml
)

REM =============================================================================
REM Step 6: Create data directories
REM =============================================================================
echo [INFO] Creating data directories...

if not exist data mkdir data
if not exist data\etcd mkdir data\etcd
if not exist data\minio mkdir data\minio
if not exist data\milvus mkdir data\milvus
if not exist data\qdrant mkdir data\qdrant
if not exist data\postgres mkdir data\postgres
if not exist data\flowise mkdir data\flowise
if not exist data\n8n mkdir data\n8n
if not exist data\jupyter mkdir data\jupyter

echo [OK] Data directories created

REM =============================================================================
REM Step 7: Start Docker Compose services
REM =============================================================================
echo [INFO] Starting NIRVANA infrastructure services...
echo This may take a few minutes on first run...

%COMPOSE_CMD% %COMPOSE_FILES% up -d

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start Docker services
    exit /b 1
)

echo [OK] Docker services started

REM =============================================================================
REM Step 8: Wait for services to be healthy
REM =============================================================================
echo [INFO] Waiting for services to be healthy...
echo This may take 1-2 minutes...

timeout /t 30 /nobreak >nul

REM Try to run health check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist scripts\health-check.js (
        node scripts\health-check.js
    )
)

echo [OK] Services should be ready now

REM =============================================================================
REM Step 9: Display service URLs
REM =============================================================================
echo.
echo ================================================================
echo                    Service Access URLs
echo ================================================================
echo  Flowise (LLM Orchestration):  http://localhost:3000
echo  n8n (Workflow Automation):    http://localhost:5678
echo  Jupyter (Notebooks):          http://localhost:8888
echo  MinIO (Object Storage):       http://localhost:9001
echo  Qdrant (Vector DB):           http://localhost:6333/dashboard
echo ================================================================
echo  PostgreSQL:                   localhost:5432
echo  Milvus (Vector DB):           localhost:19530
echo  Apache Tika:                  http://localhost:9998
echo ================================================================
echo.

REM =============================================================================
REM Step 10: Launch web application
REM =============================================================================
if not "%SKIP_WEB_APP%"=="true" (
    echo [INFO] Starting NIRVANA web application...
    
    REM Install dependencies if needed
    if not exist node_modules (
        echo [INFO] Installing npm dependencies...
        call npm install
    )
    
    echo [OK] Starting web app...
    echo [INFO] Web app will run on http://localhost:5000
    echo [INFO] Press Ctrl+C to shut down
    echo.
    
    REM Start web app (this will block)
    npm run dev
) else (
    echo [INFO] Skipping web app launch (SKIP_WEB_APP=true^)
    echo [INFO] Infrastructure is running. Use '%COMPOSE_CMD% down' to stop.
    pause
)

endlocal

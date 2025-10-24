#!/usr/bin/env node

/**
 * =============================================================================
 * NIRVANA Phase 0 - Infrastructure Health Check
 * =============================================================================
 * This script verifies that all Docker services are running and healthy.
 * It checks each service endpoint and provides color-coded feedback.
 * 
 * Exit codes:
 * - 0: All services are healthy
 * - 1: One or more services are unhealthy
 * =============================================================================
 */

const http = require('http');
const https = require('https');
const net = require('net');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Service configurations
const services = [
  {
    name: 'PostgreSQL',
    type: 'tcp',
    host: 'localhost',
    port: 5432,
    critical: true,
  },
  {
    name: 'Milvus',
    type: 'http',
    host: 'localhost',
    port: 9091,
    path: '/healthz',
    critical: true,
  },
  {
    name: 'Qdrant',
    type: 'http',
    host: 'localhost',
    port: 6333,
    path: '/healthz',
    critical: true,
  },
  {
    name: 'Flowise',
    type: 'http',
    host: 'localhost',
    port: 3000,
    path: '/api/v1/ping',
    critical: false,
  },
  {
    name: 'n8n',
    type: 'http',
    host: 'localhost',
    port: 5678,
    path: '/healthz',
    critical: false,
  },
  {
    name: 'Jupyter',
    type: 'http',
    host: 'localhost',
    port: 8888,
    path: '/api',
    critical: false,
  },
  {
    name: 'Apache Tika',
    type: 'http',
    host: 'localhost',
    port: 9998,
    path: '/tika',
    critical: false,
  },
  {
    name: 'MinIO',
    type: 'http',
    host: 'localhost',
    port: 9000,
    path: '/minio/health/live',
    critical: true,
  },
  {
    name: 'etcd',
    type: 'tcp',
    host: 'localhost',
    port: 2379,
    critical: true,
  },
];

/**
 * Check if a TCP port is open
 */
function checkTcpPort(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

/**
 * Check HTTP endpoint
 */
function checkHttpEndpoint(host, port, path, timeout = 5000) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: timeout,
      headers: {
        'User-Agent': 'NIRVANA-Health-Check/1.0',
      },
    };
    
    const req = http.request(options, (res) => {
      // Accept any 2xx or 3xx status code as healthy
      const isHealthy = res.statusCode >= 200 && res.statusCode < 400;
      resolve(isHealthy);
      res.resume(); // Consume response data
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

/**
 * Check a single service
 */
async function checkService(service) {
  let isHealthy = false;
  
  if (service.type === 'tcp') {
    isHealthy = await checkTcpPort(service.host, service.port);
  } else if (service.type === 'http' || service.type === 'https') {
    isHealthy = await checkHttpEndpoint(service.host, service.port, service.path);
  }
  
  return isHealthy;
}

/**
 * Format service name with padding
 */
function formatServiceName(name, maxLength = 20) {
  return name.padEnd(maxLength, ' ');
}

/**
 * Print service status
 */
function printServiceStatus(service, isHealthy) {
  const icon = isHealthy ? '✓' : '✗';
  const color = isHealthy ? colors.green : colors.red;
  const status = isHealthy ? 'HEALTHY' : 'UNHEALTHY';
  
  const endpoint = service.type === 'tcp' 
    ? `${service.host}:${service.port}`
    : `http://${service.host}:${service.port}${service.path}`;
  
  console.log(
    `${color}${icon}${colors.reset} ${formatServiceName(service.name)} [${status.padEnd(10)}] ${colors.cyan}${endpoint}${colors.reset}`
  );
}

/**
 * Main health check function
 */
async function runHealthCheck() {
  console.log(`\n${colors.blue}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}NIRVANA Infrastructure Health Check${colors.reset}`);
  console.log(`${colors.blue}${'═'.repeat(70)}${colors.reset}\n`);
  
  const results = [];
  
  // Check all services
  for (const service of services) {
    const isHealthy = await checkService(service);
    results.push({ service, isHealthy });
    printServiceStatus(service, isHealthy);
  }
  
  console.log(`\n${colors.blue}${'═'.repeat(70)}${colors.reset}\n`);
  
  // Summary
  const totalServices = results.length;
  const healthyServices = results.filter(r => r.isHealthy).length;
  const unhealthyServices = totalServices - healthyServices;
  
  const criticalUnhealthy = results.filter(
    r => !r.isHealthy && r.service.critical
  ).length;
  
  console.log(`${colors.blue}Summary:${colors.reset}`);
  console.log(`  Total services:     ${totalServices}`);
  console.log(`  ${colors.green}✓${colors.reset} Healthy:          ${healthyServices}`);
  
  if (unhealthyServices > 0) {
    console.log(`  ${colors.red}✗${colors.reset} Unhealthy:        ${unhealthyServices}`);
  }
  
  if (criticalUnhealthy > 0) {
    console.log(`  ${colors.red}✗${colors.reset} Critical issues:  ${criticalUnhealthy}`);
  }
  
  console.log('');
  
  // Determine exit code
  if (criticalUnhealthy > 0) {
    console.log(`${colors.red}[ERROR] Critical services are unhealthy!${colors.reset}`);
    console.log(`${colors.yellow}[TIP] Run 'docker-compose ps' to check container status${colors.reset}`);
    console.log(`${colors.yellow}[TIP] Run 'docker-compose logs <service>' to view logs${colors.reset}\n`);
    process.exit(1);
  } else if (unhealthyServices > 0) {
    console.log(`${colors.yellow}[WARNING] Some non-critical services are unhealthy${colors.reset}`);
    console.log(`${colors.blue}[INFO] Core infrastructure is operational${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.green}[SUCCESS] All services are healthy!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run the health check
runHealthCheck().catch((error) => {
  console.error(`${colors.red}[ERROR] Health check failed:${colors.reset}`, error.message);
  process.exit(1);
});

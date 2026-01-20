#!/usr/bin/env node

const { createServer } = require('net');
const { spawn } = require('child_process');

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

async function findAvailablePort(startPort = 8081, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);
    if (available) {
      if (i > 0) {
        console.log(`Port ${startPort} is in use, using port ${port} instead`);
      }
      return port;
    }
  }
  throw new Error(`Could not find an available port after ${maxAttempts} attempts starting from ${startPort}`);
}

(async () => {
  try {
    const port = await findAvailablePort();
    const expoProcess = spawn('npx', ['expo', 'start', '--port', port.toString()], {
      stdio: 'inherit',
      shell: true,
    });
    
    expoProcess.on('error', (error) => {
      console.error('Failed to start Expo:', error);
      process.exit(1);
    });
    
    expoProcess.on('exit', (code) => {
      process.exit(code || 0);
    });
  } catch (error) {
    console.error('Error starting Expo:', error);
    process.exit(1);
  }
})();

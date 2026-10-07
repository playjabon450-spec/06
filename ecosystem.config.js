module.exports = { apps: [{ name: 'storebot', cwd: './bot', script: 'index.js', autorestart: true, max_restarts: 1000, restart_delay: 3000, max_memory_restart: '400M', time: true }] };

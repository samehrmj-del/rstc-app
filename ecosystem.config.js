module.exports = {
    apps: [
        {
            name: 'rstc-app',
            script: 'server.js',
            exec_mode: 'cluster',
            instances: 'max',
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
            },
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            merge_logs: true,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 4000,
        },
    ],
};

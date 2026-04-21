module.exports = {
  apps: [
    {
      name: "cryptopilot-worker",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "logs/worker-error.log",
      out_file: "logs/worker-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};

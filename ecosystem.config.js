// ecosystem.config.js
module.exports = {
    apps: [
      {
        name: "mci-bot",
        script: "src/index.js",
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: "500M",
        env: {
          NODE_ENV: "production"
        }
      }
    ]
  };
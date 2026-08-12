# TheCrossWild API — production image (Coolify / prod01)
#
# Coolify settings that go with this file:
#   Build Pack ............ Dockerfile
#   Base Directory ........ /
#   Dockerfile Location ... /Dockerfile
#   Ports Exposes ......... 5000
#   Health Check .......... /api/health on port 5000
FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=5000

WORKDIR /app

# curl is only here for the container HEALTHCHECK below — alpine ships without it
RUN apk add --no-cache curl

# Install deps first so this layer is reused when only app code changes.
# npm ci needs package-lock.json committed (see .gitignore).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Drop privileges — the `node` user ships with the base image
USER node

EXPOSE 5000

# Container-level check. Coolify's own health check (configured in the UI) is what
# gates a deploy; this one makes `docker ps` honest for anyone on the host.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1

# server.js installs SIGTERM/SIGINT handlers, so running node as PID 1 is fine —
# `docker stop` and Coolify redeploys shut down gracefully.
CMD ["node", "server.js"]

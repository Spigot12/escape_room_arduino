
# Stage 1: Build frontend mit Vite
FROM node:22-bullseye-slim AS build

WORKDIR /app

# Installiere Dependencies (inkl. Dev-Tools fuer Vite)
COPY package*.json ./
RUN npm ci

# Projektdateien (ohne node_modules) fuer den Build
COPY vite.config.js ./
COPY src ./src
COPY server ./server

# Baue Frontend und entferne Dev-Dependencies
RUN npm run build
RUN npm prune --omit=dev

# Stage 2: Production Server
FROM node:22-bullseye-slim

WORKDIR /app
ENV NODE_ENV=production

# Runtime-Dateien und Production-Dependencies
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src

# Expose Port
EXPOSE 3000

# Health Check (optional aber empfohlen)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Starte Server
CMD ["node", "server/server.js"]
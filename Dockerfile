
# Stage 1: Build Frontend mit Vite
FROM node:18-alpine AS build

WORKDIR /app

# Installiere Dependencies
COPY package*.json ./
RUN npm ci

# Baue Frontend mit Vite
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:18-alpine

WORKDIR /app

# Installiere nur Production Dependencies
COPY package*.json ./
RUN npm ci --only=production

# Kopiere nur notwendige Dateien vom Build
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/pages ./src/pages
COPY src/scripts ./src/scripts
COPY src/styles ./src/styles
COPY src/assets ./src/assets

# Expose Port
EXPOSE 3000

# Health Check (optional aber empfohlen)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Starte Server
CMD ["node", "server/server.js"]
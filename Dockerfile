# --- Build Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Build Backend ---
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# --- Final Image ---
FROM node:20-alpine
WORKDIR /app

# Copy backend
COPY --from=backend-builder /app/backend/package*.json ./
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=backend-builder /app/backend/node_modules ./node_modules

# Copy frontend build to be served by backend
COPY --from=frontend-builder /app/frontend/dist ./frontend-dist

# Env vars
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/dev.db"

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3000

# Start script
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/server.js"]

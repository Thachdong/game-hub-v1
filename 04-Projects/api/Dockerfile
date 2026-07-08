# syntax=docker/dockerfile:1
# Game Hub API (NestJS) container image.
#
# Build context must be this directory (04-Projects/api). When the API's own
# code lives on the develop-api branch only, use 04-Projects/scripts/api-container.sh
# from any branch to build/run this image via a git worktree checkout of develop-api.

ARG NODE_VERSION=22-alpine

# ---- deps: full deps for building ----
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --legacy-peer-deps: package.json currently mixes @nestjs/websockets@^11 with
# @nestjs/core@^10, which npm's strict resolver rejects; matches how deps are
# installed locally.
RUN npm ci --legacy-peer-deps

# ---- build: compile Nest + resolve tsconfig path aliases ----
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- dev: hot-reload target for iterating on the API itself ----
FROM node:${NODE_VERSION} AS dev
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ---- prod-deps: production-only node_modules ----
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# ---- runtime: minimal final image ----
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# main.ts writes the generated openapi.yml to cwd on boot, so /app must stay
# writable by the runtime user.
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs && chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "require('net').createConnection(process.env.PORT||3000,'127.0.0.1').on('connect',function(){process.exit(0)}).on('error',function(){process.exit(1)})"

CMD ["node", "dist/main"]

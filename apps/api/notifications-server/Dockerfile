# Bun + Hono + Socket.io Notifications Server
FROM oven/bun:1-deps AS base
WORKDIR /app

FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN bun install --frozen-lockfile

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER appuser

EXPOSE 3098

CMD ["bun", "run", "src/index.ts"]

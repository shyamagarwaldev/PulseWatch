FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
RUN bun install
COPY prisma ./prisma
COPY prisma.config.ts .
COPY src ./src
RUN bun prisma generate
# RUN bun run build

# FROM oven/bun:1
# WORKDIR /app
# COPY --from=builder /app/dist /app/dist
# COPY --from=builder /app/package.json /app/
# COPY --from=builder /app/node_modules /app/node_modules
EXPOSE 3000
CMD ["bun","run","dev"]


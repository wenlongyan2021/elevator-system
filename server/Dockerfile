FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npx tsc prisma/seed.ts --outDir prisma --esModuleInterop --skipLibCheck --resolveJsonModule
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache tzdata curl openssl
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && mkdir -p uploads
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]

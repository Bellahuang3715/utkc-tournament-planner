# Install dependencies only when needed
FROM node:18-alpine AS deps

WORKDIR /app

COPY package.json yarn.lock ./

RUN apk add --no-cache bash && yarn install --network-timeout 1000000

# Rebuild the source code only when needed
FROM node:18-alpine AS builder

WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules ./node_modules

RUN NEXT_PUBLIC_API_BASE_URL=http://localhost:8400 \
    NEXT_PUBLIC_HCAPTCHA_SITE_KEY=b29c81e4-ab9c-423e-8ca2-01c882e60c9c \
    yarn build

# Development runner (includes yarn)
FROM node:18-alpine AS runner

WORKDIR /app

# Install yarn explicitly in the runner stage
RUN apk add --no-cache bash curl yarn

ENV NODE_ENV=development

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/next-i18next.config.js ./next-i18next.config.js

RUN chmod +x /app/docker-entrypoint.sh

USER node

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]

HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
    CMD wget --spider http://localhost:3000 || exit 1

# Use yarn start for development server
CMD ["yarn", "dev"]

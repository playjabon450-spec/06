FROM node:20-alpine

RUN apk add --no-cache openssl
WORKDIR /app

COPY dashboard/package.json ./package.json
COPY dashboard/prisma ./prisma
RUN npm install

COPY dashboard/ ./
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 CMD wget -qO- http://127.0.0.1:3000/api/auth/providers || exit 1
CMD ["npm", "start"]
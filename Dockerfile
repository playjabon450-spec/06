FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY prisma ./prisma
COPY bot/package.json ./bot/package.json
RUN cd bot && npm install --omit=dev && npm i prisma@5 && npx prisma generate --schema=../prisma/schema.prisma
COPY bot ./bot
ENV NODE_ENV=production
EXPOSE 3001
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "bot/index.js"]

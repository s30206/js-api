FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma.config.js ./
COPY prisma ./prisma
RUN npx prisma generate

FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional

COPY . .
COPY --from=build /app/src/generated ./src/generated

USER node
EXPOSE 3000

CMD ["node", "src/server.js"]

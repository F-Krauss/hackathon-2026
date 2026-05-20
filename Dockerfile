FROM node:24-slim AS deps

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npm run build -w @eco-carpool/shared && npm run build -w @eco-carpool/api

FROM node:24-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist

CMD ["npm", "run", "start:api"]

FROM node:20-bookworm-slim AS build
WORKDIR /app
# better-sqlite3 is a native addon; these let npm compile it if no
# prebuilt binary matches the image's platform/arch.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# SQLite database lives here; mount a persistent volume at this path.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 4000
CMD ["node", "dist/index.js"]

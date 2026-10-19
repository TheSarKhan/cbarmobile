FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_DEPLOYED=true
RUN npm run export:web
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY web.Caddyfile /etc/caddy/Caddyfile
EXPOSE 8082

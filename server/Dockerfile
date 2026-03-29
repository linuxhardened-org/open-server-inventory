# Build context must be the repository root (see docker-compose.yml).
FROM node:18-alpine AS client-build
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build
COPY --from=client-build /client/dist ./client-dist
EXPOSE 3000
CMD ["npm", "start"]

# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Built server + frontend
COPY --from=builder /app/dist ./dist

# Static data files (categories, vendors, products)
COPY server/data_categories.json ./server/
COPY server/data_vendors.json ./server/
COPY server/data_products.json ./server/

ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "dist/index.cjs"]

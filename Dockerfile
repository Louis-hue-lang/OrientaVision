# Build stage
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/nginx.conf ./nginx.conf 
# Note: In this simple setup we might not strictly need nginx if node serves static, 
# but for scale we usually use nginx. 
# SIMPLIFICATION: Let's have Node serve the static files for a single container deployment without complex Nginx config in the container.
# We will modify server/index.js to serve static files in production.

EXPOSE 3001
CMD ["node", "server/index.js"]

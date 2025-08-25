# Base image
FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build phase
RUN rm -rf /app/node_modules/.cache
RUN npm run build

# Production image
FROM node:18-alpine AS prod
WORKDIR /app

# Only copy production node_modules and build
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY package*.json ./

# Start the app
CMD ["npm", "start"]
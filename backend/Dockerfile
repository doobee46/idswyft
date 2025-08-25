# Ultra-simple Railway Dockerfile - avoid Alpine and heavy deps
FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only core dependencies, skip optional ones
RUN npm ci --production --ignore-optional --no-audit

# Copy source code
COPY . .

# Build application
RUN npm run build

EXPOSE 3001
ENV NODE_ENV=production

CMD ["npm", "start"]
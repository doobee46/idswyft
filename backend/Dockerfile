FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --production --omit=optional

# Copy source
COPY . .

# Build
RUN npm run build

# Start
EXPOSE 3001
CMD ["npm", "start"]
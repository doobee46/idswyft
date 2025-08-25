FROM node:18-slim

WORKDIR /app

# Copy only production package.json
COPY package.json ./

# Install only runtime dependencies - NO BUILD STEP
RUN npm install --production --omit=optional --omit=dev

# Copy pre-built dist folder and other runtime files
COPY dist/ ./dist/
COPY uploads/ ./uploads/ 2>/dev/null || true

# Expose port
EXPOSE 3001

# Start the pre-built app
CMD ["node", "dist/server.js"]
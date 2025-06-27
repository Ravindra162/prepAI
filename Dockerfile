# Dockerfile for backend-only deploy
FROM node:20

WORKDIR /app

# Copy root package.json (since it includes both frontend + backend deps)
COPY package.json package-lock.json* ./

# Install only server-related deps
RUN npm install --omit=dev

# Copy only server code (not frontend)
COPY server/ ./server/

# Set environment variable
ENV NODE_ENV=production

# Expose the port your server listens on
EXPOSE 5000

# Start the server
CMD ["node", "server/index.js"]

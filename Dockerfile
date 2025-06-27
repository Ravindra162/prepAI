# Dockerfile (backend-only)
FROM node:20

WORKDIR /app

# Copy only server files
COPY server/ ./server/
COPY server/package.json ./package.json
COPY server/package-lock.json* ./package-lock.json

# Install only production dependencies
RUN npm install --omit=dev

# Environment
ENV NODE_ENV=production

# Expose backend port
EXPOSE 5000

CMD ["node", "server/index.js"]

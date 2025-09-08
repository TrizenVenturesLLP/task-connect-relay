# Use Node.js 18 LTS Alpine image for smaller size
FROM node:18-alpine AS base

# Install security updates and necessary packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

# Create app directory with proper permissions
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Dependencies stage
FROM base AS dependencies

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS build

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Remove dev dependencies for production
RUN npm prune --production

# Production stage
FROM base AS production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy application code from build stage
COPY --from=build --chown=nodeuser:nodejs /app/ ./

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R nodeuser:nodejs logs

# Remove unnecessary files for production
RUN rm -rf \
    .git \
    .gitignore \
    .env.example \
    *.md \
    .dockerignore \
    Dockerfile

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 4000

# ✅ FIXED HEALTH CHECK - Check localhost inside container
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f https://extrahandbackend.llp.trizenventures.com//api/v1/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]

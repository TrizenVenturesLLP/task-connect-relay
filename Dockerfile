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

# Accept build arguments
ARG NODE_ENV=production
ARG PORT=4000
ARG FORCE_PRODUCTION=true
ARG LOG_LEVEL=info
ARG RATE_LIMIT_WINDOW_MS=900000
ARG RATE_LIMIT_MAX_REQUESTS=100
ARG CORS_ORIGIN
ARG MONGODB_URI
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_PRIVATE_KEY_ID
ARG FIREBASE_PRIVATE_KEY
ARG FIREBASE_CLIENT_EMAIL
ARG FIREBASE_CLIENT_ID
ARG FIREBASE_AUTH_URI
ARG FIREBASE_TOKEN_URI
ARG FIREBASE_AUTH_PROVIDER_X509_CERT_URL
ARG FIREBASE_CLIENT_X509_CERT_URL

# Set environment variables from build arguments
ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}
ENV FORCE_PRODUCTION=${FORCE_PRODUCTION}
ENV LOG_LEVEL=${LOG_LEVEL}
ENV RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS}
ENV RATE_LIMIT_MAX_REQUESTS=${RATE_LIMIT_MAX_REQUESTS}
ENV CORS_ORIGIN=${CORS_ORIGIN}
ENV MONGODB_URI=${MONGODB_URI}
ENV FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
ENV FIREBASE_PRIVATE_KEY_ID=${FIREBASE_PRIVATE_KEY_ID}
ENV FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
ENV FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}
ENV FIREBASE_CLIENT_ID=${FIREBASE_CLIENT_ID}
ENV FIREBASE_AUTH_URI=${FIREBASE_AUTH_URI}
ENV FIREBASE_TOKEN_URI=${FIREBASE_TOKEN_URI}
ENV FIREBASE_AUTH_PROVIDER_X509_CERT_URL=${FIREBASE_AUTH_PROVIDER_X509_CERT_URL}
ENV FIREBASE_CLIENT_X509_CERT_URL=${FIREBASE_CLIENT_X509_CERT_URL}

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

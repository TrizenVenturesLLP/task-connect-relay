# Production Deployment Guide for CapRover

This guide explains how to deploy the Extrahand Backend API to CapRover in a production-ready configuration.

## Prerequisites

1. CapRover server set up and running
2. MongoDB database (MongoDB Atlas or self-hosted)
3. Firebase project with Admin SDK credentials
4. Domain name (optional but recommended)

## Environment Variables

Configure these environment variables in your CapRover app settings:

### Required Environment Variables

```bash
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://username:password@host:port/database
```

### Firebase Configuration (Choose One Method)

**Method 1: Environment Variables (Recommended for CapRover)**
```bash
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_WEB_API_KEY=your-web-api-key
```

**Method 2: Service Account File**
```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

**Method 3: Application Default Credentials**
```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

### Optional Configuration

```bash
# Logging
LOG_LEVEL=info

# Security & Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS (comma-separated URLs)
CORS_ORIGIN=https://yourdomain.com,https://anotherdomain.com

# Health Check
HEALTH_CHECK_PATH=/api/v1/health
```

## Deployment Steps

### 1. Prepare Your Code

Ensure all production-ready files are in place:
- ✅ `Dockerfile` - Optimized production container
- ✅ `captain-definition` - CapRover deployment configuration
- ✅ `.dockerignore` - Excludes unnecessary files
- ✅ Production dependencies in `package.json`
- ✅ Environment validation in `config/env.js`
- ✅ Logging configuration in `config/logger.js`

### 2. Create New App in CapRover

1. Open CapRover dashboard
2. Go to "Apps" → "Create New App"
3. Enter app name: `extrahand-backend`
4. Click "Create New App"

### 3. Configure Environment Variables

In your app settings, add the required environment variables listed above.

**Important Notes:**
- For `FIREBASE_PRIVATE_KEY`, ensure newlines are properly escaped as `\n`
- Use CapRover's bulk environment variable editor for easier setup
- Consider using secrets for sensitive data

### 4. Deploy Your Code

**Option A: Git Integration**
1. Connect your GitHub repository
2. Set branch to deploy from
3. Enable automatic deployments

**Option B: Manual Deployment**
1. Create a deployment archive:
   ```bash
   cd BackendEH
   tar -czf extrahand-backend.tar.gz .
   ```
2. Upload the archive to CapRover

### 5. Configure Domain (Optional)

1. In app settings, go to "HTTP Settings"
2. Add your custom domain
3. Enable "Force HTTPS redirect"
4. Configure SSL certificate

### 6. Monitor Health

After deployment, monitor your application:

- Health check endpoint: `https://your-domain.com/api/v1/health`
- View logs in CapRover dashboard
- Monitor performance and error rates

## Production Features Included

### Security
- ✅ Helmet.js for security headers
- ✅ Rate limiting to prevent abuse
- ✅ CORS configuration
- ✅ Data sanitization (MongoDB injection protection)
- ✅ Environment variable validation

### Monitoring & Logging
- ✅ Winston logger with file rotation
- ✅ Morgan HTTP request logging
- ✅ Comprehensive health checks
- ✅ Error tracking and reporting

### Performance
- ✅ Gzip compression
- ✅ Optimized Docker image with Alpine Linux
- ✅ Multi-stage build for smaller image size
- ✅ Production-only dependencies

### Reliability
- ✅ Graceful shutdown handling
- ✅ Process signal handling (SIGTERM, SIGINT)
- ✅ Uncaught exception handling
- ✅ Health check with dependency verification

## Troubleshooting

### Common Issues

1. **Firebase Connection Errors**
   - Verify environment variables are correctly set
   - Check private key format (newlines should be `\n`)
   - Ensure service account has proper permissions

2. **MongoDB Connection Issues**
   - Verify MONGODB_URI format
   - Check network connectivity
   - Ensure MongoDB allows connections from CapRover server

3. **App Won't Start**
   - Check CapRover logs for startup errors
   - Verify all required environment variables are set
   - Review health check endpoint response

### Useful Commands

```bash
# View app logs
docker logs -f extrahand-backend

# Check health status
curl https://your-domain.com/api/v1/health

# Monitor resource usage
docker stats extrahand-backend
```

## Security Recommendations

1. **Use HTTPS only** - Enable "Force SSL" in CapRover
2. **Regular updates** - Keep dependencies updated
3. **Monitor logs** - Set up log monitoring and alerting
4. **Backup database** - Regular MongoDB backups
5. **Rate limiting** - Adjust rate limits based on usage patterns
6. **Firewall rules** - Restrict database access to CapRover server only

## Scaling

For high-traffic production environments:

1. **Horizontal scaling**: Increase instance count in captain-definition
2. **Database optimization**: Use MongoDB replica sets
3. **Caching**: Add Redis for session/data caching
4. **Load balancing**: CapRover handles this automatically
5. **Monitoring**: Set up application monitoring (e.g., New Relic, DataDog)

## Support

- Health check: `/api/v1/health`
- API documentation: Available at deployed endpoint
- Logs: Available in CapRover dashboard
- Metrics: Monitor via health check endpoint

@echo off
REM Production Deployment Script for ExtraHand Backend
REM This script ensures proper CORS configuration and environment setup

echo 🚀 Starting ExtraHand Backend Production Deployment...

REM Set production environment
set NODE_ENV=production

REM Ensure CORS origins are set
set CORS_ORIGIN=https://extrahand.in,https://www.extrahand.in

REM Log the configuration
echo 📋 Deployment Configuration:
echo    NODE_ENV: %NODE_ENV%
echo    CORS_ORIGIN: %CORS_ORIGIN%
echo    PORT: %PORT%

REM Install dependencies
echo 📦 Installing dependencies...
npm ci --production

REM Run CORS test
echo 🧪 Testing CORS configuration...
node test-cors.js

REM Start the server
echo 🎯 Starting production server...
npm start

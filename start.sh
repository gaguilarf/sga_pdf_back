#!/bin/bash

# SGA PDF Backend - Start Script
# This script starts the NestJS backend in production mode

echo "🚀 Starting SGA PDF Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Ensuring base configuration..."
    # If no .env exists, we might need a template, but for now we rely on ecosystem/defaults
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci --omit=dev --legacy-peer-deps
fi

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "🔨 Building application..."
    npm run build
fi

# Start the application using PM2 if available, otherwise node
if command -v pm2 &> /dev/null
then
    echo "✅ Starting with PM2..."
    pm2 start ecosystem.config.json
else
    echo "✅ Starting with Node..."
    npm run start:prod
fi

#!/bin/bash

# 1. Activate Node Virtual Environment (Banahost/cPanel)
source /home/payxiohs/nodevenv/api2.brittanygroup.edu.pe/20/bin/activate && cd /home/payxiohs/api2.brittanygroup.edu.pe

echo "🚀 Starting SGA PDF Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Ensuring base configuration..."
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing ALL dependencies (including dev for building)..."
    npm install --legacy-peer-deps
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

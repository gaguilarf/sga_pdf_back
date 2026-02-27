#!/bin/bash

# SGA PDF Backend - Stop Script
# This script stops the running NestJS backend

echo "🛑 Stopping SGA PDF Backend..."

# Try PM2 first
if command -v pm2 &> /dev/null
then
    echo "🔍 Stopping via PM2..."
    pm2 stop sga-pdf-back
else
    # Find and kill the process running on port 3003
    PID=$(lsof -ti:3003)

    if [ -z "$PID" ]; then
        echo "⚠️  No process found running on port 3003"
    else
        echo "🔍 Found process $PID running on port 3003"
        kill -9 $PID
        echo "✅ Process stopped successfully"
    fi
fi

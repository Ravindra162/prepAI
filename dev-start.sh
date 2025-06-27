#!/bin/bash

# Simple development test script

echo "🚀 Starting Interview Prep Platform Development Server..."
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please update the .env file with your configuration"
    echo ""
fi

# Start the development servers
echo "🔥 Starting development servers..."
echo "   - Frontend: http://localhost:5173"
echo "   - Backend API: https://docvault-hzj4.onrender.com"
echo "   - Email scheduler: Active"
echo ""

npm run dev

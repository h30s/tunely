#!/bin/bash

# Tunely App Start Script
echo "🎵 Starting Tunely App..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local file not found. Please run setup.sh first."
  exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Start the development server
echo "🚀 Starting development server..."
npm run dev 
#!/bin/bash

# Tunely App Setup Script
echo "🎵 Setting up Tunely App..."

# Check if .env.local exists, if not create it
if [ ! -f .env.local ]; then
  echo "Creating .env.local file..."
  cat > .env.local << EOL
# Authentication (Google OAuth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# YouTube API
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
EOL
  echo "✅ Created .env.local file - please update it with your API keys"
else
  echo "✅ .env.local file already exists"
fi

# Install dependencies
echo "Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Run type checking
echo "Running type checking..."
npx tsc --noEmit
echo "✅ Type checking completed"

# Run linting
echo "Running linting..."
npm run lint
echo "✅ Linting completed"

echo "🎉 Setup complete! You can now run the app with:"
echo "npm run dev"
echo ""
echo "⚠️  Don't forget to update your .env.local file with your API keys!"
echo "⚠️  Make sure your Supabase database is set up with the schema from schema.sql" 
#!/usr/bin/env node

/**
 * Tunely App Debug Script
 * 
 * This script helps diagnose common issues with the Tunely app.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Running Tunely App Diagnostics...\n');

// Check environment variables
console.log('Checking environment variables...');
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const envVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_YOUTUBE_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = [];
  const placeholderVars = [];
  
  envVars.forEach(varName => {
    if (!envFile.includes(varName)) {
      missingVars.push(varName);
    } else {
      const regex = new RegExp(`${varName}=([^\\n]+)`);
      const match = envFile.match(regex);
      if (match && (match[1].includes('your_') || match[1] === '')) {
        placeholderVars.push(varName);
      }
    }
  });
  
  if (missingVars.length > 0) {
    console.log('❌ Missing environment variables:', missingVars.join(', '));
  }
  
  if (placeholderVars.length > 0) {
    console.log('⚠️  Environment variables with placeholder values:', placeholderVars.join(', '));
  }
  
  if (missingVars.length === 0 && placeholderVars.length === 0) {
    console.log('✅ All environment variables are present');
  }
} catch (error) {
  console.log('❌ .env.local file not found. Please run setup.sh to create it.');
}

// Check dependencies
console.log('\nChecking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'next',
    'react',
    'react-dom',
    'next-auth',
    '@supabase/supabase-js',
    'youtube-player'
  ];
  
  const missingDeps = [];
  
  requiredDeps.forEach(dep => {
    if (!packageJson.dependencies[dep]) {
      missingDeps.push(dep);
    }
  });
  
  if (missingDeps.length > 0) {
    console.log('❌ Missing dependencies:', missingDeps.join(', '));
  } else {
    console.log('✅ All required dependencies are present');
  }
} catch (error) {
  console.log('❌ Error checking package.json:', error.message);
}

// Check for TypeScript errors
console.log('\nChecking for TypeScript errors...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ No TypeScript errors found');
} catch (error) {
  console.log('❌ TypeScript errors found:');
  console.log(error.stdout.toString());
}

// Check for critical files
console.log('\nChecking for critical files...');
const criticalFiles = [
  'app/api/auth/[...nextauth]/route.ts',
  'app/room/[roomId]/page.tsx',
  'components/room/youtube-player.tsx',
  'components/room/song-queue.tsx',
  'lib/supabase/client.ts',
  'lib/youtube/api.ts',
  'schema.sql'
];

const missingFiles = [];

criticalFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log('❌ Missing critical files:', missingFiles.join(', '));
} else {
  console.log('✅ All critical files are present');
}

// Check network connectivity to external services
console.log('\nChecking network connectivity...');
const services = [
  { name: 'YouTube API', url: 'https://www.googleapis.com/youtube/v3' },
  { name: 'Supabase', url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.io' }
];

services.forEach(service => {
  try {
    execSync(`curl -s --head ${service.url}`);
    console.log(`✅ ${service.name} is accessible`);
  } catch (error) {
    console.log(`❌ Cannot access ${service.name} at ${service.url}`);
  }
});

console.log('\n🎵 Diagnostics complete!');
console.log('\nIf you are experiencing issues:');
console.log('1. Make sure all environment variables are correctly set in .env.local');
console.log('2. Ensure your Supabase database is set up with the schema from schema.sql');
console.log('3. Check that your YouTube API key has the necessary permissions');
console.log('4. Try clearing your browser cache and cookies');
console.log('5. Restart the development server with npm run dev'); 
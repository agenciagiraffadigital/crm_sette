#!/bin/bash

# Deploy Supabase Edge Functions
echo "🚀 Deploying Supabase Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Login to Supabase (if not already logged in)
echo "🔐 Checking Supabase authentication..."
supabase status 2>/dev/null || {
    echo "Please login to Supabase first:"
    echo "supabase login"
    exit 1
}

# Deploy webhook handler function
echo "📦 Deploying webhook-handler function..."
supabase functions deploy webhook-handler --project-ref YOUR_PROJECT_REF

# Deploy notification function
echo "📦 Deploying send-notification function..."
supabase functions deploy send-notification --project-ref YOUR_PROJECT_REF

# Set secrets (you'll need to run these manually with your actual values)
echo "🔑 Setting up secrets..."
echo "Run these commands with your actual values:"
echo "supabase secrets set PROJECT_URL=https://your-project.supabase.co"
echo "supabase secrets set SERVICE_ROLE_KEY=your-service-role-key"

echo "✅ Edge Functions deployed successfully!"
echo ""
echo "📋 Your webhook URL will be:"
echo "https://your-project.supabase.co/functions/v1/webhook-handler"
echo ""
echo "📋 Your notification URL will be:"
echo "https://your-project.supabase.co/functions/v1/send-notification"
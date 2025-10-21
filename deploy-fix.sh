#!/bin/bash

echo "🔧 Deploying CSP and API fixes..."

# Add all changes
git add .

# Commit with fix message
git commit -m "Fix: CSP policy and API URL issues for production deployment"

# Push to main
git push origin main

echo "✅ Fixes deployed!"
echo "🔄 Render will automatically redeploy your service"
echo "⏱️  Wait 2-3 minutes for deployment to complete"
#!/bin/bash

echo "🚀 Deploying SuperCall to GitHub..."

# Add all files
git add .

# Commit with timestamp
git commit -m "Deploy SuperCall - $(date)"

# Push to main branch
git branch -M main
git remote add origin https://github.com/samsanjay99/SuperCall.git
git push -u origin main

echo "✅ Deployed to GitHub!"
echo "🌐 Now deploy on Render:"
echo "1. Go to https://render.com"
echo "2. Connect your GitHub repo"
echo "3. Use the render.yaml configuration"
echo "4. Set your DATABASE_URL environment variable"
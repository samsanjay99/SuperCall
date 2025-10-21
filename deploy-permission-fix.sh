#!/bin/bash

echo "🔐 Deploying mobile permission fixes..."

# Add all changes
git add .

# Commit with permission fix message
git commit -m "Fix: Enhanced mobile permissions - explicit permission requests, fallback constraints, permission guide"

# Push to main
git push origin main

echo "✅ Permission fixes deployed!"
echo "📱 New features:"
echo "   - 'Enable Camera & Microphone' button for explicit permission requests"
echo "   - Permission guide with browser-specific instructions"
echo "   - Fallback media constraints (video -> audio-only if needed)"
echo "   - Better error messages for permission issues"
echo "   - Initial permission status check on app load"
echo ""
echo "🧪 Testing instructions:"
echo "   1. Open app on mobile device"
echo "   2. Click 'Enable Camera & Microphone' button BEFORE making calls"
echo "   3. Grant permissions when browser prompts"
echo "   4. Click 'Help' button if you need browser-specific instructions"
echo "   5. Try making calls after permissions are granted"
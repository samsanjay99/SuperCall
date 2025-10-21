#!/bin/bash

echo "📱 Deploying mobile device fixes..."

# Add all changes
git add .

# Commit with mobile fix message
git commit -m "Fix: Enhanced WebRTC for mobile devices - multiple TURN servers, better error handling, mobile-optimized constraints"

# Push to main
git push origin main

echo "✅ Mobile fixes deployed!"
echo "📱 Changes include:"
echo "   - Multiple TURN servers for better connectivity"
echo "   - Mobile-optimized media constraints"
echo "   - Better error handling and debugging"
echo "   - ICE restart on connection failure"
echo "   - TURN server connectivity testing"
echo ""
echo "🧪 After deployment, test with:"
echo "   1. Two different phones on different networks"
echo "   2. Use the 'Test TURN Servers' button for debugging"
echo "   3. Check browser console for connection logs"
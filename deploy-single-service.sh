#!/bin/bash

echo "🚀 Deploying SuperCall as Single Service"

# Build the client
echo "📦 Building client..."
cd client
npm install
npm run build
cd ..

# Install server dependencies
echo "📦 Installing server dependencies..."
npm install

echo "✅ Build complete!"
echo ""
echo "📋 Render Configuration:"
echo "   Runtime: Node"
echo "   Build Command: npm install && npm run build"
echo "   Start Command: npm start"
echo ""
echo "🌍 Environment Variables needed:"
echo "   NODE_ENV=production"
echo "   PORT=10000"
echo "   DATABASE_URL=your-neon-postgresql-url"
echo "   JWT_SECRET=your-random-secret-key"
echo "   JWT_REFRESH_SECRET=your-random-refresh-key"
echo ""
echo "🔗 After deployment, your app will be available at:"
echo "   https://supercall.onrender.com"
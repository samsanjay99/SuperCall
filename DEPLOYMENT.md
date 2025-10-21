# 🚀 SuperCall Deployment Guide

## **Render Deployment (Recommended)**

### **Step 1: Push to GitHub**
```bash
git init
git add .
git commit -m "SuperCall - Ready for deployment"
git branch -M main
git remote add origin https://github.com/samsanjay99/SuperCall.git
git push -u origin main
```

### **Step 2: Create 3 Render Services**

#### **Service 1: Backend API**
1. **New Web Service**
2. **Connect Repository**: `samsanjay99/SuperCall`
3. **Settings**:
   - **Name**: `supercall-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     ```
     NODE_ENV=production
     PORT=10000
     DATABASE_URL=your-neon-postgresql-url
     JWT_SECRET=your-random-secret-key
     JWT_REFRESH_SECRET=your-random-refresh-key
     ```

#### **Service 2: WebSocket Signaling**
1. **New Web Service**
2. **Connect Repository**: `samsanjay99/SuperCall`
3. **Settings**:
   - **Name**: `supercall-signaling`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run signaling`
   - **Environment Variables**:
     ```
     NODE_ENV=production
     WS_PORT=10000
     DATABASE_URL=your-neon-postgresql-url
     JWT_SECRET=same-as-api-service
     ```

#### **Service 3: Frontend**
1. **New Static Site**
2. **Connect Repository**: `samsanjay99/SuperCall`
3. **Settings**:
   - **Name**: `supercall-frontend`
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/dist`

### **Step 3: Update Frontend URLs**

After services are deployed, update `client/.env.production`:
```env
VITE_API_URL=https://supercall-api.onrender.com
VITE_WS_URL=wss://supercall-signaling.onrender.com
```

Then redeploy the frontend.

## **Alternative: Single Service with Docker**

### **Option A: Docker Runtime**
1. **New Web Service**
2. **Runtime**: `Docker`
3. **Dockerfile**: Already included in repo
4. **Environment Variables**: Same as above

### **Option B: Node Runtime (Simpler)**
1. **New Web Service**
2. **Runtime**: `Node`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`

## **Environment Variables You Need**

### **Required**:
- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `JWT_SECRET`: Random 32+ character string
- `JWT_REFRESH_SECRET`: Different random 32+ character string

### **Optional**:
- `NODE_ENV`: `production`
- `PORT`: `10000` (Render default)

## **Generate Secrets**
```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## **Final URLs**
- **App**: `https://supercall-frontend.onrender.com`
- **API**: `https://supercall-api.onrender.com`
- **WebSocket**: `wss://supercall-signaling.onrender.com`

## **Testing After Deployment**
1. Open app in two different browsers/devices
2. Register two accounts
3. Use UIDs to call each other
4. Audio should work with TURN servers! 🎉
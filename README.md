# SuperCall 📞

A modern WebRTC-based calling application where users get unique 10-digit UIDs and can make direct peer-to-peer calls. Built with React, Node.js, and PostgreSQL.

## ✨ Features

- 🔐 **Secure Authentication**: Email/password with JWT tokens
- 📱 **Unique 10-Digit UIDs**: Each user gets a memorable identifier
- 📞 **HD Audio/Video Calls**: Direct P2P calls via WebRTC with TURN relay
- 🔌 **Real-time Signaling**: WebSocket for instant connectivity
- 📊 **Call History**: Complete call logs with duration tracking
- 🟢 **Live Presence**: Online/offline status indicators
- 🎨 **Modern UI**: Clean, responsive interface with Tailwind CSS
- 🌐 **Production Ready**: Deployed on Render with PostgreSQL

## 🚀 Live Demo

Visit: **https://supercall-frontend.onrender.com**

## 🏗️ Architecture

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + WebSocket
- **Database**: PostgreSQL (Neon)
- **WebRTC**: P2P with TURN relay support
- **Deployment**: Render (Frontend + API + Signaling)

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database (or use Neon)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/samsanjay99/SuperCall.git
cd SuperCall
```

2. **Install dependencies**
```bash
npm install
cd client && npm install && cd ..
```

3. **Environment setup**
```bash
cp .env.example .env
# Update DATABASE_URL and JWT secrets
```

4. **Run migrations**
```bash
npm run migrate
```

5. **Start development servers**
```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: Signaling Server  
npm run signaling

# Terminal 3: Frontend
cd client && npm run dev
```

## 📱 How to Use

1. **Register**: Create account with email/password
2. **Get UID**: You'll receive a unique 10-digit identifier
3. **Share UID**: Give your UID to friends so they can call you
4. **Make Calls**: Enter someone's UID and click Audio/Video Call
5. **Accept Calls**: Incoming calls show as modal with ringtone

## 🔧 Production Deployment

### Render Deployment

1. **Fork this repository**
2. **Connect to Render**
3. **Deploy using render.yaml** (included)
4. **Set environment variables**:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: Random secure string
   - `JWT_REFRESH_SECRET`: Another random secure string

### Manual Deployment

```bash
# Build frontend
npm run build

# Start production servers
NODE_ENV=production npm start
NODE_ENV=production npm run signaling
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login

### Users
- `GET /api/users/:uid` - Get user by UID (public)
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update profile

### Calls
- `GET /api/calls` - Get call history
- `POST /api/calls` - Create call log
- `PATCH /api/calls/:id` - Update call status

### Health
- `GET /health` - Health check

## WebSocket Signaling

Connect to `ws://localhost:3001` and send JSON messages:

### Authentication
```json
{
  "type": "auth",
  "token": "your-jwt-token"
}
```

### Call Flow
```json
// 1. Request call
{
  "type": "call.request",
  "to_uid": "1234567890",
  "media": "video"
}

// 2. Accept/reject call
{
  "type": "call.accept",
  "callId": "uuid"
}

// 3. WebRTC signaling
{
  "type": "call.offer",
  "to_uid": "1234567890",
  "callId": "uuid",
  "sdp": "..."
}
```

## Database Schema

### Users Table
- `id` - UUID primary key
- `uid` - 10-digit unique identifier
- `email` - User email
- `password_hash` - Bcrypt hash
- `display_name` - Display name
- `last_seen` - Last activity timestamp

### Call Logs Table
- `caller_id` / `callee_id` - User references
- `caller_uid` / `callee_uid` - UID references
- `status` - missed, accepted, declined, busy, failed
- `duration_seconds` - Call duration
- `start_time` / `end_time` - Timestamps

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL=your-neon-postgres-url
JWT_SECRET=your-secret-key
PORT=3000
WS_PORT=3001
```

## Next Steps

1. **Frontend**: Create React app with WebRTC integration
2. **TURN Server**: Setup coturn for NAT traversal
3. **Push Notifications**: Add mobile notifications
4. **Group Calls**: Implement SFU for multi-party calls
5. **Security**: Add rate limiting and abuse protection

## Architecture

```
Client (React) <-> REST API (Express) <-> PostgreSQL (Neon)
       ↓
WebSocket Signaling <-> WebRTC P2P Connection
```

## Testing

The app includes:
- Database migrations
- API endpoint testing
- WebSocket message validation
- JWT authentication
- UID generation with collision handling

## Production Deployment

1. Set `NODE_ENV=production`
2. Use proper JWT secrets
3. Configure CORS for your domain
4. Setup SSL/TLS certificates
5. Use managed Redis for presence
6. Setup monitoring and logging

## Security Features

- Bcrypt password hashing (12 rounds)
- JWT with refresh tokens
- Input validation with Joi
- SQL injection protection
- CORS configuration
- Helmet security headers
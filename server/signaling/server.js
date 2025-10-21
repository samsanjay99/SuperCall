const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/connection');
require('dotenv').config();

class SignalingServer {
  constructor(serverOrPort = 3001) {
    if (typeof serverOrPort === 'number') {
      // Standalone mode
      this.port = serverOrPort;
      this.wss = new WebSocket.Server({ port: this.port });
    } else {
      // Integrated mode with HTTP server
      this.server = serverOrPort;
      this.wss = new WebSocket.Server({ server: this.server });
    }
    
    this.connections = new Map(); // uid -> { ws, user }
    this.activeCalls = new Map(); // callId -> { caller, callee, status }
    
    this.setupServer();
  }

  setupServer() {
    if (this.port) {
      console.log(`🔌 WebSocket signaling server starting on port ${this.port}`);
    } else {
      console.log(`🔌 WebSocket signaling integrated with HTTP server`);
    }
    
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('Message handling error:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    if (this.port) {
      console.log(`✅ Signaling server running on ws://localhost:${this.port}`);
    } else {
      console.log(`✅ Signaling server integrated`);
    }
  }

  async handleMessage(ws, data) {
    const { type } = data;

    switch (type) {
      case 'auth':
        await this.handleAuth(ws, data);
        break;
      case 'presence.update':
        await this.handlePresenceUpdate(ws, data);
        break;
      case 'call.request':
        await this.handleCallRequest(ws, data);
        break;
      case 'call.offer':
        await this.handleCallOffer(ws, data);
        break;
      case 'call.answer':
        await this.handleCallAnswer(ws, data);
        break;
      case 'call.ice':
        await this.handleIceCandidate(ws, data);
        break;
      case 'call.accept':
        await this.handleCallAccept(ws, data);
        break;
      case 'call.reject':
        await this.handleCallReject(ws, data);
        break;
      case 'call.hangup':
        await this.handleCallHangup(ws, data);
        break;
      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  async handleAuth(ws, data) {
    try {
      const { token } = data;
      
      if (!token) {
        return this.sendError(ws, 'Token required');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query(
        'SELECT id, uid, email, display_name FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return this.sendError(ws, 'User not found');
      }

      const user = result.rows[0];
      ws.user = user;
      
      // Store connection
      this.connections.set(user.uid, { ws, user });
      
      // Update last seen
      await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]);

      this.send(ws, {
        type: 'auth.success',
        user: {
          uid: user.uid,
          displayName: user.display_name
        }
      });

      console.log(`User ${user.uid} authenticated and connected`);

    } catch (error) {
      console.error('Auth error:', error);
      this.sendError(ws, 'Authentication failed');
    }
  }

  async handlePresenceUpdate(ws, data) {
    if (!ws.user) {
      return this.sendError(ws, 'Not authenticated');
    }

    const { status } = data;
    
    if (!['online', 'offline', 'busy'].includes(status)) {
      return this.sendError(ws, 'Invalid status');
    }

    // Update database
    await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [ws.user.id]);

    console.log(`User ${ws.user.uid} status updated to ${status}`);
  }

  async handleCallRequest(ws, data) {
    if (!ws.user) {
      return this.sendError(ws, 'Not authenticated');
    }

    const { to_uid, media = 'video' } = data;
    const callId = uuidv4();

    // Validate target UID
    if (!/^\d{10}$/.test(to_uid)) {
      return this.sendError(ws, 'Invalid UID format');
    }

    if (to_uid === ws.user.uid) {
      return this.sendError(ws, 'Cannot call yourself');
    }

    // Check if target user exists and is online
    const targetConnection = this.connections.get(to_uid);
    if (!targetConnection) {
      // User is offline, create missed call log
      await this.createCallLog(ws.user.uid, to_uid, 'missed');
      return this.send(ws, {
        type: 'call.failed',
        reason: 'user_offline',
        callId
      });
    }

    // Check if target user is busy
    const existingCall = Array.from(this.activeCalls.values())
      .find(call => call.caller === to_uid || call.callee === to_uid);
    
    if (existingCall) {
      await this.createCallLog(ws.user.uid, to_uid, 'busy');
      return this.send(ws, {
        type: 'call.failed',
        reason: 'user_busy',
        callId
      });
    }

    // Create active call record
    this.activeCalls.set(callId, {
      caller: ws.user.uid,
      callee: to_uid,
      status: 'ringing',
      startTime: new Date(),
      media
    });

    // Send call request to target user
    this.send(targetConnection.ws, {
      type: 'call.incoming',
      from_uid: ws.user.uid,
      from_name: ws.user.display_name,
      callId,
      media
    });

    // Confirm to caller
    this.send(ws, {
      type: 'call.ringing',
      callId,
      to_uid
    });

    console.log(`Call initiated: ${ws.user.uid} -> ${to_uid} (${callId})`);

    // Set timeout for unanswered calls
    setTimeout(() => {
      const call = this.activeCalls.get(callId);
      if (call && call.status === 'ringing') {
        this.handleCallTimeout(callId);
      }
    }, 30000); // 30 second timeout
  }

  async handleCallAccept(ws, data) {
    if (!ws.user) {
      return this.sendError(ws, 'Not authenticated');
    }

    const { callId } = data;
    const call = this.activeCalls.get(callId);

    if (!call || call.callee !== ws.user.uid) {
      return this.sendError(ws, 'Call not found');
    }

    call.status = 'accepted';
    call.acceptTime = new Date();

    // Notify caller that call was accepted and they should send offer
    const callerConnection = this.connections.get(call.caller);
    if (callerConnection) {
      this.send(callerConnection.ws, {
        type: 'call.accepted',
        callId,
        shouldSendOffer: true // Signal caller to send offer now
      });
    }

    console.log(`Call accepted: ${callId}`);
  }

  async handleCallReject(ws, data) {
    if (!ws.user) {
      return this.sendError(ws, 'Not authenticated');
    }

    const { callId, reason = 'declined' } = data;
    const call = this.activeCalls.get(callId);

    if (!call || call.callee !== ws.user.uid) {
      return this.sendError(ws, 'Call not found');
    }

    // Create call log
    await this.createCallLog(call.caller, call.callee, 'declined');

    // Notify caller
    const callerConnection = this.connections.get(call.caller);
    if (callerConnection) {
      this.send(callerConnection.ws, {
        type: 'call.rejected',
        callId,
        reason
      });
    }

    // Clean up
    this.activeCalls.delete(callId);

    console.log(`Call rejected: ${callId} (${reason})`);
  }

  async handleCallOffer(ws, data) {
    const { callId, to_uid, sdp } = data;
    const targetConnection = this.connections.get(to_uid);

    if (!targetConnection) {
      return this.sendError(ws, 'Target user not connected');
    }

    this.send(targetConnection.ws, {
      type: 'call.offer',
      from_uid: ws.user.uid,
      callId,
      sdp
    });
  }

  async handleCallAnswer(ws, data) {
    const { callId, to_uid, sdp } = data;
    const targetConnection = this.connections.get(to_uid);

    if (!targetConnection) {
      return this.sendError(ws, 'Target user not connected');
    }

    this.send(targetConnection.ws, {
      type: 'call.answer',
      from_uid: ws.user.uid,
      callId,
      sdp
    });
  }

  async handleIceCandidate(ws, data) {
    const { callId, to_uid, candidate } = data;
    const targetConnection = this.connections.get(to_uid);

    if (!targetConnection) {
      return this.sendError(ws, 'Target user not connected');
    }

    this.send(targetConnection.ws, {
      type: 'call.ice',
      from_uid: ws.user.uid,
      callId,
      candidate
    });
  }

  async handleCallHangup(ws, data) {
    if (!ws.user) {
      return this.sendError(ws, 'Not authenticated');
    }

    const { callId, reason = 'user' } = data;
    const call = this.activeCalls.get(callId);

    if (!call) {
      return this.sendError(ws, 'Call not found');
    }

    const otherUserUid = call.caller === ws.user.uid ? call.callee : call.caller;
    const otherConnection = this.connections.get(otherUserUid);

    // Calculate duration if call was accepted
    let duration = 0;
    if (call.acceptTime) {
      duration = Math.floor((new Date() - call.acceptTime) / 1000);
    }

    // Create call log
    const status = call.status === 'accepted' ? 'accepted' : 'missed';
    await this.createCallLog(call.caller, call.callee, status, duration);

    // Notify other user
    if (otherConnection) {
      this.send(otherConnection.ws, {
        type: 'call.ended',
        callId,
        reason
      });
    }

    // Clean up
    this.activeCalls.delete(callId);

    console.log(`Call ended: ${callId} (${reason}, ${duration}s)`);
  }

  async handleCallTimeout(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) return;

    // Create missed call log
    await this.createCallLog(call.caller, call.callee, 'missed');

    // Notify both users
    const callerConnection = this.connections.get(call.caller);
    const calleeConnection = this.connections.get(call.callee);

    if (callerConnection) {
      this.send(callerConnection.ws, {
        type: 'call.timeout',
        callId
      });
    }

    if (calleeConnection) {
      this.send(calleeConnection.ws, {
        type: 'call.timeout',
        callId
      });
    }

    this.activeCalls.delete(callId);
    console.log(`Call timeout: ${callId}`);
  }

  async createCallLog(callerUid, calleeUid, status, duration = 0) {
    try {
      // Get user IDs
      const callerResult = await pool.query('SELECT id FROM users WHERE uid = $1', [callerUid]);
      const calleeResult = await pool.query('SELECT id FROM users WHERE uid = $1', [calleeUid]);

      if (callerResult.rows.length === 0 || calleeResult.rows.length === 0) {
        console.error('User not found for call log');
        return;
      }

      await pool.query(`
        INSERT INTO call_logs (caller_id, callee_id, caller_uid, callee_uid, status, duration_seconds, end_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        callerResult.rows[0].id,
        calleeResult.rows[0].id,
        callerUid,
        calleeUid,
        status,
        duration,
        duration > 0 ? new Date() : null
      ]);

    } catch (error) {
      console.error('Error creating call log:', error);
    }
  }

  handleDisconnection(ws) {
    if (ws.user) {
      console.log(`User ${ws.user.uid} disconnected`);
      this.connections.delete(ws.user.uid);

      // End any active calls for this user
      for (const [callId, call] of this.activeCalls.entries()) {
        if (call.caller === ws.user.uid || call.callee === ws.user.uid) {
          this.handleCallHangup(ws, { callId, reason: 'disconnect' });
        }
      }
    }
  }

  send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  sendError(ws, message) {
    this.send(ws, {
      type: 'error',
      message
    });
  }
}

// Start signaling server if run directly
if (require.main === module) {
  const server = new SignalingServer(process.env.WS_PORT || 3001);
}

module.exports = SignalingServer;
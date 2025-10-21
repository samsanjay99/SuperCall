# TURN Server Setup Guide

## 🎯 Why You Need TURN Servers

**STUN vs TURN:**
- **STUN**: Helps discover your public IP address (NAT traversal discovery)
- **TURN**: Relays media traffic when direct P2P connection fails

**When TURN is Required:**
- Both users behind symmetric NATs
- Corporate firewalls blocking P2P traffic
- Mobile networks with strict NAT policies
- **Result without TURN**: Calls connect but no audio/video flows

## 🆓 Current Setup (Free Public TURN)

I've added free public TURN servers from `openrelay.metered.ca`:

```javascript
iceServers: [
  // STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  
  // Free TURN servers (limited bandwidth)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
]
```

**Limitations of Free TURN:**
- ⚠️ Limited bandwidth (may be slow)
- ⚠️ Shared with many users
- ⚠️ No SLA or reliability guarantee
- ⚠️ May have usage limits

## 🚀 Production TURN Server Setup

### Option 1: Self-Hosted with Coturn

**Install Coturn (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install coturn
```

**Configure `/etc/turnserver.conf`:**
```bash
# Basic configuration
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0

# Your domain
realm=your-domain.com
server-name=your-domain.com

# Authentication
lt-cred-mech
user=myuser:mypassword

# Security
fingerprint
no-multicast-peers
no-cli
no-tlsv1
no-tlsv1_1

# Logging
log-file=/var/log/turnserver.log
verbose
```

**Start Coturn:**
```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

**Update your app:**
```javascript
iceServers: [
  { urls: 'stun:stun.your-domain.com:3478' },
  {
    urls: 'turn:turn.your-domain.com:3478',
    username: 'myuser',
    credential: 'mypassword'
  },
  {
    urls: 'turns:turn.your-domain.com:5349',
    username: 'myuser',
    credential: 'mypassword'
  }
]
```

### Option 2: Cloud TURN Services

**Twilio STUN/TURN:**
```javascript
// Get credentials from Twilio API
const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/YOUR_SID/Tokens.json', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa('YOUR_SID:YOUR_TOKEN')
  }
})
const token = await response.json()

// Use dynamic credentials
iceServers: token.ice_servers
```

**Xirsys (Managed TURN):**
```javascript
iceServers: [
  {
    urls: 'turn:xirsys-turn-server.com:80?transport=udp',
    username: 'your-username',
    credential: 'your-credential'
  }
]
```

### Option 3: AWS/GCP TURN

**AWS EC2 with Coturn:**
1. Launch EC2 instance with public IP
2. Install coturn
3. Configure security groups (ports 3478, 5349, 49152-65535)
4. Use Elastic IP for stability

**GCP Compute Engine:**
1. Create VM with external IP
2. Install coturn
3. Configure firewall rules
4. Use static IP

## 🧪 Testing TURN Connectivity

**Test TURN Server:**
```bash
# Test STUN
stun-client stun.your-domain.com 3478

# Test TURN
turnutils_uclient -T -u myuser -w mypassword turn.your-domain.com
```

**Browser Test:**
```javascript
// Test ICE connectivity
const pc = new RTCPeerConnection({
  iceServers: [/* your servers */]
})

pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('Candidate type:', event.candidate.type)
    // Look for 'relay' type candidates (TURN)
  }
}

// Create offer to trigger ICE gathering
pc.createOffer().then(offer => pc.setLocalDescription(offer))
```

## 💰 Cost Considerations

**Self-Hosted Coturn:**
- Server costs: $5-20/month (small VPS)
- Bandwidth costs: Variable based on usage
- Maintenance: Your responsibility

**Managed Services:**
- Twilio: ~$0.0015 per minute
- Xirsys: ~$0.99/month + usage
- AWS/GCP: Server + bandwidth costs

**Bandwidth Usage:**
- Audio call: ~64 kbps (both directions)
- Video call: ~500 kbps - 2 Mbps (both directions)
- TURN relay doubles bandwidth usage on server

## 🔧 Current Implementation Status

✅ **Added free TURN servers for immediate testing**
✅ **Enhanced ICE candidate logging**
✅ **Better connection state tracking**

**Next Steps for Production:**
1. Set up your own TURN server
2. Configure proper authentication
3. Monitor bandwidth usage
4. Set up SSL certificates for TURNS

## 🚨 Security Notes

- Always use authentication for TURN servers
- Use TURNS (TLS) in production
- Rotate credentials regularly
- Monitor for abuse/excessive usage
- Consider rate limiting per user

Your calling app should now work much better with the added TURN servers! 🎉
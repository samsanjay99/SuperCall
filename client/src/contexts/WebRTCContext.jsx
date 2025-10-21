import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const WebRTCContext = createContext()

export function useWebRTC() {
  const context = useContext(WebRTCContext)
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider')
  }
  return context
}

export function WebRTCProvider({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [ws, setWs] = useState(null)
  const [connected, setConnected] = useState(false)
  const [currentCall, setCurrentCall] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [connectionState, setConnectionState] = useState('new')
  
  const peerConnection = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const ringtoneInterval = useRef(null)
  const audioContext = useRef(null)

  // WebSocket connection
  useEffect(() => {
    if (user && !ws) {
      connectWebSocket()
    }
    
    return () => {
      if (ws) {
        ws.close()
      }
      stopRingtone()
      cleanup()
    }
  }, [user])

  const connectWebSocket = () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    // Use same-origin WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}`
    console.log('🔌 Connecting to WebSocket:', wsUrl)
    const websocket = new WebSocket(wsUrl)
    
    websocket.onopen = () => {
      console.log('WebSocket connected')
      websocket.send(JSON.stringify({
        type: 'auth',
        token
      }))
    }

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleWebSocketMessage(data)
    }

    websocket.onclose = () => {
      console.log('WebSocket disconnected')
      setConnected(false)
      setWs(null)
      
      // Reconnect after 3 seconds if user is still logged in
      if (user) {
        setTimeout(connectWebSocket, 3000)
      }
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    setWs(websocket)
  }

  const handleWebSocketMessage = async (data) => {
    console.log('📨 WebSocket message:', data.type, data)

    switch (data.type) {
      case 'auth.success':
        setConnected(true)
        toast.success('Connected to calling service')
        break

      case 'call.ringing':
        // Update current call with server-generated callId
        setCurrentCall(prev => {
          const updated = { ...prev, callId: data.callId, status: 'ringing' }
          
          // Update peer connection call info
          if (peerConnection.current) {
            peerConnection.current.callInfo = {
              callId: data.callId,
              otherUid: updated.otherUid
            }
          }
          
          return updated
        })
        toast.success('Ringing...')
        
        // Navigate to call page for outgoing calls
        if (location.pathname !== '/call') {
          navigate('/call')
        }
        break

      case 'call.incoming':
        setIncomingCall({
          callId: data.callId,
          fromUid: data.from_uid,
          fromName: data.from_name,
          media: data.media
        })
        // Play ringtone
        playRingtone()
        break

      case 'call.accepted':
        console.log('🎉 CALL ACCEPTED MESSAGE RECEIVED!')
        console.log('📋 Data:', data)
        console.log('📋 Current call before update:', currentCall)
        
        // FORCE status update - no conditions
        setCurrentCall(prev => {
          if (!prev) {
            console.log('❌ No current call state!')
            return prev
          }
          
          const updated = {
            ...prev,
            callId: data.callId,
            status: 'connected' // DIRECTLY to connected
          }
          
          console.log('✅ FORCED NEW STATE:', updated)
          return updated
        })
        
        toast.success('Call connected!')
        
        // Navigate to call page
        if (location.pathname !== '/call') {
          navigate('/call')
        }
        
        // Handle WebRTC offer if needed
        if (data.shouldSendOffer && peerConnection.current) {
          setTimeout(async () => {
            try {
              const offer = await peerConnection.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
              })
              await peerConnection.current.setLocalDescription(offer)
              
              ws.send(JSON.stringify({
                type: 'call.offer',
                callId: data.callId,
                to_uid: currentCall?.otherUid,
                sdp: offer
              }))
            } catch (error) {
              console.error('❌ Offer error:', error)
            }
          }, 100)
        }
        break

      case 'call.rejected':
        if (currentCall?.callId === data.callId) {
          setCurrentCall(null)
          toast.error('Call rejected')
          cleanup()
          
          // Navigate back to dashboard
          if (location.pathname === '/call') {
            navigate('/dashboard')
          }
        }
        break

      case 'call.offer':
        await handleOffer(data)
        break

      case 'call.answer':
        await handleAnswer(data)
        break

      case 'call.ice':
        await handleIceCandidate(data)
        break

      case 'call.ended':
        setCurrentCall(null)
        setIncomingCall(null)
        toast.info('Call ended')
        cleanup()
        
        // Navigate back to dashboard
        if (location.pathname === '/call') {
          navigate('/dashboard')
        }
        break

      case 'call.timeout':
        setCurrentCall(null)
        setIncomingCall(null)
        toast.error('Call timeout')
        cleanup()
        
        // Navigate back to dashboard
        if (location.pathname === '/call') {
          navigate('/dashboard')
        }
        break

      case 'call.failed':
        setCurrentCall(null)
        if (data.reason === 'user_offline') {
          toast.error('User is offline')
        } else if (data.reason === 'user_busy') {
          toast.error('User is busy')
        }
        cleanup()
        
        // Navigate back to dashboard
        if (location.pathname === '/call') {
          navigate('/dashboard')
        }
        break

      case 'error':
        toast.error(data.message)
        break
    }
  }

  const initializePeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        // STUN servers for NAT discovery
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        
        // Free public TURN servers for media relay
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10
    })

    // Store call info in the peer connection for ICE candidates
    pc.callInfo = null
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE candidate generated:', event.candidate.type, event.candidate.protocol, event.candidate.address)
        
        if (ws && pc.callInfo) {
          console.log('📤 Sending ICE candidate for call:', pc.callInfo.callId)
          ws.send(JSON.stringify({
            type: 'call.ice',
            callId: pc.callInfo.callId,
            to_uid: pc.callInfo.otherUid,
            candidate: event.candidate
          }))
        } else {
          console.log('⏳ ICE candidate generated but no call info yet')
        }
      } else {
        console.log('🏁 ICE candidate gathering complete')
      }
    }

    pc.ontrack = (event) => {
      console.log('🎵 Received remote stream:', event.streams[0])
      const stream = event.streams[0]
      setRemoteStream(stream)
      
      // IMMEDIATELY update call status when we receive media
      setCurrentCall(prev => {
        if (prev) {
          console.log('🎵 Media received - updating to connected!')
          return { ...prev, status: 'connected' }
        }
        return null
      })
      
      // Set up remote media element
      setTimeout(() => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
          // Ensure audio plays
          remoteVideoRef.current.play().catch(e => {
            console.log('Auto-play prevented, user interaction required:', e)
            // Try to enable audio on user interaction
            document.addEventListener('click', () => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.play()
              }
            }, { once: true })
          })
        }
      }, 100)
      
      // Log track info for debugging
      stream.getTracks().forEach(track => {
        console.log('🎵 Remote track received:', track.kind, 'enabled:', track.enabled, 'state:', track.readyState)
      })
      
      toast.success('🎉 Media connected!')
    }

    pc.onconnectionstatechange = () => {
      console.log('Connection state changed to:', pc.connectionState)
      setConnectionState(pc.connectionState)
      
      // Update call status when connection is established
      if (pc.connectionState === 'connected') {
        console.log('🎉 WebRTC connection established!')
        setCurrentCall(prev => prev ? { ...prev, status: 'connected' } : null)
        toast.success('Connected!')
      } else if (pc.connectionState === 'failed') {
        console.log('❌ WebRTC connection failed')
        toast.error('Connection failed')
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state changed to:', pc.iceConnectionState)
      
      // Track ICE connection state - this is often more reliable than connection state
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('🎉 ICE connection established!')
        setCurrentCall(prev => {
          if (prev) {
            console.log('✅ Updating call status to connected via ICE')
            return { ...prev, status: 'connected' }
          }
          return null
        })
        toast.success('Connected!')
      } else if (pc.iceConnectionState === 'failed') {
        console.log('❌ ICE connection failed')
        toast.error('Connection failed - please try again')
      } else if (pc.iceConnectionState === 'checking') {
        console.log('🔄 ICE connection checking...')
        setCurrentCall(prev => prev ? { ...prev, status: 'connecting' } : null)
      }
    }

    pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', pc.iceGatheringState)
    }

    peerConnection.current = pc
    return pc
  }

  const startCall = async (targetUid, mediaType = 'video') => {
    try {
      if (!ws || !connected) {
        toast.error('Not connected to calling service')
        return
      }

      // Get user media first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: mediaType === 'video',
        audio: true
      })

      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Initialize peer connection
      const pc = initializePeerConnection()
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind, track.enabled, track.readyState)
        pc.addTrack(track, stream)
      })

      // Set initial call state (callId will be updated when server responds)
      const callState = {
        callId: null, // Will be set by server
        otherUid: targetUid,
        status: 'calling',
        mediaType,
        isOutgoing: true
      }
      setCurrentCall(callState)
      
      // Store call info in peer connection for ICE candidates
      if (pc.callInfo) {
        pc.callInfo = { ...pc.callInfo, otherUid: targetUid }
      }

      // Navigate to call page immediately for caller
      if (location.pathname !== '/call') {
        navigate('/call')
      }

      // Send call request (server will generate callId)
      ws.send(JSON.stringify({
        type: 'call.request',
        to_uid: targetUid,
        media: mediaType
      }))

    } catch (error) {
      console.error('Error starting call:', error)
      toast.error('Failed to start call')
      cleanup()
    }
  }

  const acceptCall = async () => {
    if (!incomingCall) return

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingCall.media === 'video',
        audio: true
      })

      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Initialize peer connection
      const pc = initializePeerConnection()
      
      // Add local stream
      stream.getTracks().forEach(track => {
        console.log('Adding local track (callee):', track.kind, track.enabled, track.readyState)
        pc.addTrack(track, stream)
      })

      const callState = {
        callId: incomingCall.callId,
        otherUid: incomingCall.fromUid,
        status: 'connected', // DIRECTLY to connected
        mediaType: incomingCall.media,
        isOutgoing: false
      }
      
      console.log('📱 RECEIVER: Setting call state to CONNECTED:', callState)
      setCurrentCall(callState)
      
      // Store call info in peer connection for ICE candidates
      if (pc) {
        pc.callInfo = { callId: incomingCall.callId, otherUid: incomingCall.fromUid }
      }

      // Send accept message (don't send offer yet, wait for caller's offer)
      ws.send(JSON.stringify({
        type: 'call.accept',
        callId: incomingCall.callId
      }))

      setIncomingCall(null)
      stopRingtone()
      
      // Navigate to call page
      navigate('/call')

    } catch (error) {
      console.error('Error accepting call:', error)
      toast.error('Failed to accept call')
      rejectCall()
    }
  }

  const rejectCall = () => {
    if (!incomingCall) return

    ws.send(JSON.stringify({
      type: 'call.reject',
      callId: incomingCall.callId,
      reason: 'declined'
    }))

    setIncomingCall(null)
    stopRingtone()
  }

  const endCall = () => {
    if (!currentCall) return

    ws.send(JSON.stringify({
      type: 'call.hangup',
      callId: currentCall.callId,
      reason: 'user'
    }))

    setCurrentCall(null)
    cleanup()
    
    // Navigate back to dashboard
    if (location.pathname === '/call') {
      navigate('/dashboard')
    }
  }

  const handleOffer = async (data) => {
    if (!peerConnection.current) {
      console.error('No peer connection available for offer')
      return
    }

    try {
      console.log('Handling offer from:', data.from_uid)
      
      // Update call status to connecting
      setCurrentCall(prev => prev ? { ...prev, status: 'connecting' } : null)
      
      // Set remote description
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
      console.log('Remote description set successfully')
      
      // Create and set local answer
      const answer = await peerConnection.current.createAnswer()
      await peerConnection.current.setLocalDescription(answer)
      console.log('Local answer created and set')

      console.log('Sending answer to:', data.from_uid)
      ws.send(JSON.stringify({
        type: 'call.answer',
        callId: data.callId,
        to_uid: data.from_uid,
        sdp: answer
      }))
    } catch (error) {
      console.error('Error handling offer:', error)
      toast.error('Failed to establish connection')
    }
  }

  const handleAnswer = async (data) => {
    if (!peerConnection.current) {
      console.error('No peer connection available for answer')
      return
    }

    try {
      console.log('Handling answer from:', data.from_uid)
      
      // Update call status to connecting
      setCurrentCall(prev => prev ? { ...prev, status: 'connecting' } : null)
      
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp))
      console.log('Answer set successfully - connection should establish soon')
    } catch (error) {
      console.error('Error handling answer:', error)
      toast.error('Failed to establish connection')
    }
  }

  const handleIceCandidate = async (data) => {
    if (!peerConnection.current) {
      console.error('No peer connection available for ICE candidate')
      return
    }

    try {
      const candidate = new RTCIceCandidate(data.candidate)
      console.log('📥 Adding ICE candidate from:', data.from_uid, 'type:', candidate.type, candidate.protocol)
      await peerConnection.current.addIceCandidate(candidate)
      console.log('✅ ICE candidate added successfully')
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error)
    }
  }

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    
    if (remoteStream) {
      setRemoteStream(null)
    }
    
    if (peerConnection.current) {
      peerConnection.current.close()
      peerConnection.current = null
    }
    
    stopRingtone()
  }

  const generateCallId = () => {
    return Math.random().toString(36).substring(2, 11)
  }

  const playRingtone = () => {
    try {
      // Stop any existing ringtone
      stopRingtone()
      
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      
      audioContext.current = new AudioContextClass()
      
      const playRingSound = () => {
        if (!audioContext.current) return
        
        const oscillator = audioContext.current.createOscillator()
        const gainNode = audioContext.current.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.current.destination)
        
        // Create a more realistic ringtone pattern
        oscillator.frequency.setValueAtTime(800, audioContext.current.currentTime)
        oscillator.frequency.setValueAtTime(1000, audioContext.current.currentTime + 0.1)
        oscillator.frequency.setValueAtTime(800, audioContext.current.currentTime + 0.2)
        
        gainNode.gain.setValueAtTime(0, audioContext.current.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.current.currentTime + 0.05)
        gainNode.gain.linearRampToValueAtTime(0, audioContext.current.currentTime + 0.4)
        
        oscillator.start(audioContext.current.currentTime)
        oscillator.stop(audioContext.current.currentTime + 0.4)
      }
      
      // Play initial ring
      playRingSound()
      
      // Set up repeating ringtone every 2 seconds
      ringtoneInterval.current = setInterval(() => {
        playRingSound()
      }, 2000)
      
    } catch (error) {
      console.log('Could not play ringtone:', error)
    }
  }

  const stopRingtone = () => {
    if (ringtoneInterval.current) {
      clearInterval(ringtoneInterval.current)
      ringtoneInterval.current = null
    }
    
    if (audioContext.current) {
      try {
        audioContext.current.close()
      } catch (error) {
        console.log('Error closing audio context:', error)
      }
      audioContext.current = null
    }
  }

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        console.log('Audio track enabled:', audioTrack.enabled)
        return !audioTrack.enabled
      }
    }
    return false
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        console.log('Video track enabled:', videoTrack.enabled)
        return !videoTrack.enabled
      }
    }
    return false
  }

  // Debug function to manually trigger connection
  const forceConnect = () => {
    console.log('🔧 Manually forcing connection status')
    setCurrentCall(prev => prev ? { ...prev, status: 'connected' } : null)
    toast.success('Manually connected!')
  }

  const value = {
    connected,
    currentCall,
    incomingCall,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    connectionState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    forceConnect // For debugging
  }

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  )
}
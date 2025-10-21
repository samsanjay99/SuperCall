import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebRTC } from '../contexts/WebRTCContext'
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  User,
  Maximize2
} from 'lucide-react'

export default function CallPage() {
  const navigate = useNavigate()
  const { 
    currentCall, 
    localStream, 
    remoteStream, 
    localVideoRef, 
    remoteVideoRef,
    endCall,
    toggleMute,
    toggleVideo,
    forceConnect
  } = useWebRTC()
  
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Redirect if no active call after a short delay (to allow for state updates)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!currentCall) {
        navigate('/dashboard')
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [currentCall, navigate])

  // Call duration timer - start when connection is established
  useEffect(() => {
    if (currentCall?.status === 'connected') {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
      
      return () => clearInterval(interval)
    } else {
      // Reset duration if not connected
      setCallDuration(0)
    }
  }, [currentCall?.status])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setCallDuration(0)
    }
  }, [])

  const handleEndCall = () => {
    endCall()
    // Navigation will be handled by the WebRTC context
  }

  const handleToggleMute = () => {
    const muted = toggleMute()
    setIsMuted(muted)
  }

  const handleToggleVideo = () => {
    const videoOff = toggleVideo()
    setIsVideoOff(videoOff)
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getCallStatus = () => {
    if (!currentCall) return 'No call'
    
    switch (currentCall.status) {
      case 'calling':
        return 'Calling...'
      case 'ringing':
        return 'Ringing...'
      case 'connecting':
        return 'Connecting...'
      case 'connected':
        return formatDuration(callDuration)
      default:
        return currentCall.status
    }
  }

  if (!currentCall) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Remote Video */}
      <div className="absolute inset-0">
        {remoteStream && currentCall.mediaType === 'video' ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : remoteStream && currentCall.mediaType === 'audio' ? (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="h-32 w-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-16 w-16 text-green-400" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Audio Call</h2>
              <p className="text-gray-400 font-mono text-lg">
                {currentCall.otherUid}
              </p>
              {/* Hidden audio element for remote audio */}
              <audio
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="hidden"
              />
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="h-32 w-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-16 w-16 text-gray-400" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                {currentCall.status === 'connected' 
                  ? 'Connected'
                  : currentCall.status === 'connecting'
                  ? 'Connecting...'
                  : currentCall.status === 'ringing'
                  ? 'Ringing...'
                  : 'Calling...'
                }
              </h2>
              <p className="text-gray-400 font-mono text-lg">
                {currentCall.otherUid}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      {localStream && currentCall.mediaType === 'video' && (
        <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted={true} // Always mute local video to prevent feedback
            className="w-full h-full object-cover"
          />
          {isVideoOff && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
      )}

      {/* Audio-only local indicator */}
      {localStream && currentCall.mediaType === 'audio' && (
        <div className="absolute top-4 right-4 w-16 h-16 bg-gray-800 rounded-full border-2 border-gray-600 flex items-center justify-center">
          {isMuted ? (
            <MicOff className="h-6 w-6 text-red-400" />
          ) : (
            <Mic className="h-6 w-6 text-green-400" />
          )}
        </div>
      )}

      {/* Call Info Overlay */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-1">
            {currentCall.status === 'connected' 
              ? `Call with ${currentCall.otherUid}`
              : `${currentCall.isOutgoing ? 'Calling' : 'Call with'} ${currentCall.otherUid}`
            }
          </h1>
          <p className="text-gray-300">
            {getCallStatus()}
          </p>
          
          {currentCall.status === 'calling' && (
            <div className="mt-2">
              <div className="animate-pulse flex justify-center space-x-1">
                <div className="h-2 w-2 bg-white rounded-full"></div>
                <div className="h-2 w-2 bg-white rounded-full animation-delay-200"></div>
                <div className="h-2 w-2 bg-white rounded-full animation-delay-400"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Call Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
        <div className="flex justify-center space-x-6">
          {/* Mute Button */}
          <button
            onClick={handleToggleMute}
            className={`p-4 rounded-full transition-colors ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {isMuted ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </button>

          {/* Video Toggle (only for video calls) */}
          {currentCall.mediaType === 'video' && (
            <button
              onClick={handleToggleVideo}
              className={`p-4 rounded-full transition-colors ${
                isVideoOff 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {isVideoOff ? (
                <VideoOff className="h-6 w-6" />
              ) : (
                <Video className="h-6 w-6" />
              )}
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>

        {/* Call Type Indicator */}
        <div className="text-center mt-4">
          <div className="inline-flex items-center space-x-2 bg-black/30 px-3 py-1 rounded-full">
            {currentCall.mediaType === 'video' ? (
              <Video className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            <span className="text-sm">
              {currentCall.mediaType === 'video' ? 'Video Call' : 'Audio Call'}
            </span>
          </div>
          
          {/* Same device testing warning */}
          <div className="mt-2 text-xs text-yellow-300 bg-yellow-900/20 px-2 py-1 rounded">
            💡 Testing on same device? Use headphones to prevent audio feedback
          </div>
          
          {/* Debug button for testing */}
          {currentCall?.status !== 'connected' && (
            <button
              onClick={forceConnect}
              className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
            >
              🔧 Force Connect (Debug)
            </button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      {currentCall.status !== 'connected' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg">
              {currentCall.status === 'calling' && 'Connecting...'}
              {currentCall.status === 'ringing' && 'Ringing...'}
              {currentCall.status === 'connecting' && 'Establishing connection...'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
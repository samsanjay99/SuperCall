import { useWebRTC } from '../contexts/WebRTCContext'
import { Phone, PhoneOff, Video, User } from 'lucide-react'

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useWebRTC()

  if (!incomingCall) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        {/* Caller Info */}
        <div className="mb-6">
          <div className="h-24 w-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <User className="h-12 w-12 text-primary-600" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-1">
            {incomingCall.fromName || 'Unknown Caller'}
          </h3>
          
          <p className="text-gray-600 font-mono text-lg">
            {incomingCall.fromUid}
          </p>
          
          <div className="flex items-center justify-center space-x-2 mt-3">
            {incomingCall.media === 'video' ? (
              <>
                <Video className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">Video Call</span>
              </>
            ) : (
              <>
                <Phone className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">Audio Call</span>
              </>
            )}
          </div>
        </div>

        {/* Incoming call animation */}
        <div className="mb-8">
          <div className="flex justify-center items-center space-x-1 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
          <p className="text-sm text-gray-600 font-medium">Incoming call...</p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={rejectCall}
            className="flex-1 bg-red-600 text-white py-4 px-6 rounded-full hover:bg-red-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <PhoneOff className="h-5 w-5" />
            <span className="font-medium">Decline</span>
          </button>
          
          <button
            onClick={acceptCall}
            className="flex-1 bg-green-600 text-white py-4 px-6 rounded-full hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Phone className="h-5 w-5" />
            <span className="font-medium">Accept</span>
          </button>
        </div>
      </div>
    </div>
  )
}
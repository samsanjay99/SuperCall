import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWebRTC } from '../contexts/WebRTCContext'
import { 
  Phone, 
  Video, 
  Copy, 
  LogOut, 
  User, 
  Clock,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Settings
} from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'


export default function Dashboard() {
  const { user, logout } = useAuth()
  const { connected, startCall, incomingCall } = useWebRTC()
  const [targetUid, setTargetUid] = useState('')
  const [callHistory, setCallHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCallHistory()
  }, [])

  const fetchCallHistory = async () => {
    try {
      const response = await axios.get('/api/calls')
      setCallHistory(response.data.calls)
    } catch (error) {
      console.error('Failed to fetch call history:', error)
    }
  }

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid)
    toast.success('UID copied to clipboard!')
  }

  const handleCall = async (mediaType) => {
    if (!targetUid.trim()) {
      toast.error('Please enter a UID to call')
      return
    }

    if (!/^\d{10}$/.test(targetUid.trim())) {
      toast.error('UID must be exactly 10 digits')
      return
    }

    if (targetUid.trim() === user.uid) {
      toast.error('You cannot call yourself')
      return
    }

    setLoading(true)
    await startCall(targetUid.trim(), mediaType)
    setLoading(false)
  }

  const formatCallTime = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const getCallIcon = (direction, status) => {
    if (direction === 'outgoing') {
      return <PhoneOutgoing className="h-4 w-4 text-blue-500" />
    } else if (status === 'missed') {
      return <PhoneCall className="h-4 w-4 text-red-500" />
    } else {
      return <PhoneIncoming className="h-4 w-4 text-green-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'text-green-600'
      case 'missed': return 'text-red-600'
      case 'declined': return 'text-yellow-600'
      case 'busy': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                <Phone className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">WebRTC Calling</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <button
                onClick={logout}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile & Call Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="card">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {user?.displayName || 'User'}
                  </h2>
                  <p className="text-gray-600">{user?.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-2xl font-mono font-bold text-primary-600">
                      {user?.uid}
                    </span>
                    <button
                      onClick={handleCopyUid}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Copy UID"
                    >
                      <Copy className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Share this UID with others so they can call you
                  </p>
                </div>
              </div>
            </div>

            {/* Make Call Card */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Make a Call</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter UID to call
                  </label>
                  <input
                    type="text"
                    placeholder="Enter 10-digit UID"
                    className="input"
                    value={targetUid}
                    onChange={(e) => setTargetUid(e.target.value)}
                    maxLength={10}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleCall('audio')}
                    disabled={loading || !connected}
                    className="btn btn-secondary flex-1 flex items-center justify-center space-x-2"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Audio Call</span>
                  </button>
                  
                  <button
                    onClick={() => handleCall('video')}
                    disabled={loading || !connected}
                    className="btn btn-primary flex-1 flex items-center justify-center space-x-2"
                  >
                    <Video className="h-4 w-4" />
                    <span>Video Call</span>
                  </button>
                </div>

                {!connected && (
                  <p className="text-sm text-red-600 text-center">
                    Connecting to calling service...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Call History */}
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
                <Clock className="h-5 w-5 text-gray-400" />
              </div>

              <div className="space-y-3">
                {callHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No calls yet</p>
                ) : (
                  callHistory.slice(0, 10).map((call) => (
                    <div key={call.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        {getCallIcon(call.direction, call.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {call.other_party_name || call.other_party_uid}
                          </p>
                          <span className={`text-xs ${getStatusColor(call.status)}`}>
                            {call.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {call.other_party_uid}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDuration(call.duration_seconds)}
                          </p>
                        </div>
                        
                        <p className="text-xs text-gray-400">
                          {formatCallTime(call.start_time)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {callHistory.length > 10 && (
                <button className="w-full text-sm text-primary-600 hover:text-primary-700 mt-3">
                  View all calls
                </button>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}
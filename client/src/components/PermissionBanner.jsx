import { useState, useEffect } from 'react'
import { Camera, Mic, X, AlertCircle } from 'lucide-react'

export default function PermissionBanner({ onRequestPermissions, onDismiss }) {
  const [permissionStatus, setPermissionStatus] = useState({
    camera: 'unknown',
    microphone: 'unknown'
  })

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    try {
      const [micPermission, cameraPermission] = await Promise.all([
        navigator.permissions.query({ name: 'microphone' }),
        navigator.permissions.query({ name: 'camera' })
      ])

      setPermissionStatus({
        microphone: micPermission.state,
        camera: cameraPermission.state
      })
    } catch (error) {
      console.log('Permission check not supported')
    }
  }

  const needsPermissions = permissionStatus.microphone === 'prompt' || 
                          permissionStatus.camera === 'prompt' ||
                          permissionStatus.microphone === 'denied' || 
                          permissionStatus.camera === 'denied'

  if (!needsPermissions) return null

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Camera & Microphone Access Required
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>To make calls, please enable camera and microphone permissions.</p>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-1">
                <Mic className="h-4 w-4" />
                <span className={`text-xs ${
                  permissionStatus.microphone === 'granted' ? 'text-green-600' : 'text-red-600'
                }`}>
                  Microphone: {permissionStatus.microphone}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Camera className="h-4 w-4" />
                <span className={`text-xs ${
                  permissionStatus.camera === 'granted' ? 'text-green-600' : 'text-red-600'
                }`}>
                  Camera: {permissionStatus.camera}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <button
              onClick={onRequestPermissions}
              className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700"
            >
              Enable Permissions
            </button>
            <button
              onClick={onDismiss}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300"
            >
              Dismiss
            </button>
          </div>
        </div>
        <div className="flex-shrink-0 ml-4">
          <button
            onClick={onDismiss}
            className="text-yellow-400 hover:text-yellow-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
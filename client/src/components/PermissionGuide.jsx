import { useState } from 'react'
import { X, Camera, Mic, Smartphone, Monitor } from 'lucide-react'

export default function PermissionGuide({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: "Enable Camera & Microphone",
      icon: <Camera className="h-8 w-8 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p>To make calls, we need access to your camera and microphone.</p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              When you click "Make Call", your browser will ask for permission. 
              Please click "Allow" to enable calling features.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Mobile Browser Instructions",
      icon: <Smartphone className="h-8 w-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <p className="font-medium">If permissions are blocked:</p>
          <div className="space-y-2 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium">Chrome Mobile:</p>
              <p>Tap the 🔒 icon → Site settings → Allow Camera & Microphone</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium">Safari Mobile:</p>
              <p>Tap AA icon → Website Settings → Allow Camera & Microphone</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Desktop Browser Instructions",
      icon: <Monitor className="h-8 w-8 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <p className="font-medium">If permissions are blocked:</p>
          <div className="space-y-2 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium">Chrome/Edge:</p>
              <p>Click 🔒 icon in address bar → Allow Camera & Microphone</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium">Firefox:</p>
              <p>Click 🛡️ icon → Permissions → Allow Camera & Microphone</p>
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Permission Setup</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex justify-center mb-4">
            {steps[currentStep].icon}
          </div>
          <h3 className="text-lg font-medium text-center mb-4">
            {steps[currentStep].title}
          </h3>
          {steps[currentStep].content}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex space-x-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Back
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Got it!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
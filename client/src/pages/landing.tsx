import { useState } from 'react'
import { useLocation } from 'wouter'
// Import custom icons
import labIcon from '@assets/generated_images/The_Lab_AI_content_creation_icon_f26cd1d3.png'
import syncIcon from '@assets/generated_images/CRM_synchronization_workflow_icon_8587610e.png'
import reportsIcon from '@assets/generated_images/Analytics_reports_dashboard_icon_aa8cffd8.png'
import dashboardIcon from '@assets/generated_images/KPI_dashboard_interface_icon_1c62cc62.png'
import { LoginModal } from '@/components/LoginModal'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { signOutUser } from '@/lib/firebase'

export default function Landing() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)
  const { user, isAuthenticated, isLoading } = useAuth()
  const [, setLocation] = useLocation()

  // Debug logging
  console.log('Landing page render:', { 
    user: user ? { email: user.email, displayName: user.displayName } : null, 
    isAuthenticated, 
    isLoading 
  })

  const openLoginModal = (featureName?: string) => {
    setSelectedFeature(featureName || null)
    setIsLoginModalOpen(true)
    // Store which feature was clicked for after-login redirect
    if (featureName) {
      localStorage.setItem('pendingFeature', featureName)
    }
  }

  const handleFeatureClick = (featureName: string, route: string) => {
    if (isAuthenticated) {
      // User is authenticated, go directly to the feature
      setLocation(route)
    } else {
      // User needs to authenticate first
      openLoginModal(featureName)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOutUser()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Login Button */}
      <div className="absolute top-6 right-6">
        {isAuthenticated ? (
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">
              Welcome, {user?.displayName || user?.email || 'User'}!
            </span>
            <Button 
              onClick={handleSignOut}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2"
              data-testid="button-signout-header"
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <Button 
            onClick={() => openLoginModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            data-testid="button-login-header"
          >
            Sign In
          </Button>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Main Title */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            CreateAI
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Generate podcasts, blogs, and e-books with AI assistance. Sync with your CRM automatically. Track performance with beautiful analytics.
          </p>
        </div>

        {/* Section Title */}
        <div className="text-center mb-4">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Everything you need for content creation
          </h2>
          <p className="text-lg text-gray-500">
            Powered by AI, designed for creators
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid grid-cols-4 gap-12">
          {/* The Lab */}
          <button 
            onClick={() => handleFeatureClick('The Lab', '/lab')}
            className="text-center border border-gray-200 rounded-lg p-8 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <div className="mb-6">
              <img 
                src={labIcon} 
                alt="The Lab" 
                className="w-[110px] h-[110px] mx-auto"
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">The Lab</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              AI-powered content creation for podcasts, blogs, and e-books with guided workflows
            </p>
          </button>

          {/* CRM Sync */}
          <button 
            onClick={() => handleFeatureClick('CRM Sync', '/sync')}
            className="text-center border border-gray-200 rounded-lg p-8 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <div className="mb-6">
              <img 
                src={syncIcon} 
                alt="CRM Sync" 
                className="w-[110px] h-[110px] mx-auto"
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">CRM Sync</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Automatically sync meeting intelligence and voice updates into HubSpot CRM
            </p>
          </button>

          {/* Reports */}
          <button 
            onClick={() => handleFeatureClick('Reports', '/reports')}
            className="text-center border border-gray-200 rounded-lg p-8 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <div className="mb-6">
              <img 
                src={reportsIcon} 
                alt="Reports" 
                className="w-[110px] h-[110px] mx-auto"
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Reports</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Weekly and monthly performance summaries with custom report builder
            </p>
          </button>

          {/* Dashboard */}
          <button 
            onClick={() => handleFeatureClick('Dashboard', '/dashboard')}
            className="text-center border border-gray-200 rounded-lg p-8 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <div className="mb-6">
              <img 
                src={dashboardIcon} 
                alt="Dashboard" 
                className="w-[110px] h-[110px] mx-auto"
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Dashboard</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Real-time KPIs and performance metrics in a clean, customizable interface
            </p>
          </button>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        featureName={selectedFeature || undefined}
      />
    </div>
  );
}
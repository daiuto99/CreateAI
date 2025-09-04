// Debug helpers for CreateAI troubleshooting

export const debugCreateAI = () => {
  console.log('🔍 ===== CreateAI Debug Report =====');
  
  // Basic environment info
  console.log('📊 Environment:', {
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
  
  // Check stored debug data
  const authState = sessionStorage.getItem('debug-auth-state');
  if (authState) {
    console.log('🔥 Firebase Auth State:', JSON.parse(authState));
  } else {
    console.log('❌ No Firebase auth state found');
  }
  
  const backendUser = sessionStorage.getItem('debug-backend-user');
  if (backendUser) {
    const userData = JSON.parse(backendUser);
    console.log('👤 Backend User Data:', userData);
    
    // Highlight organization issue
    if (!userData.userData?.organizations?.length) {
      console.warn('⚠️  ISSUE FOUND: User has no organizations!');
      console.log('This explains why project creation fails with "No organization found"');
    }
  } else {
    console.log('❌ No backend user data found');
  }
  
  // Check for stored errors
  const projectError = sessionStorage.getItem('debug-project-creation-error');
  if (projectError) {
    console.log('🚨 Last Project Creation Error:', JSON.parse(projectError));
  }
  
  const apiError = sessionStorage.getItem('debug-last-api-error');
  if (apiError) {
    console.log('🌍 Last API Error:', JSON.parse(apiError));
  }
  
  const lastError = sessionStorage.getItem('last-error');
  if (lastError) {
    console.log('💥 Last React Error:', JSON.parse(lastError));
  }
  
  // Storage info
  console.log('💾 Local Storage Keys:', Object.keys(localStorage));
  console.log('💾 Session Storage Keys:', Object.keys(sessionStorage));
  
  console.log('🔍 ===== End Debug Report =====');
  
  return {
    summary: 'Debug report logged to console',
    hasOrganizations: backendUser ? JSON.parse(backendUser).userData?.organizations?.length > 0 : false,
    authState: authState ? 'Found' : 'Missing',
    backendUser: backendUser ? 'Found' : 'Missing'
  };
};

// Helper to create organization if missing
export const fixMissingOrganization = async () => {
  console.log('🔧 Attempting to create missing organization...');
  
  try {
    const response = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: 'My Workspace',
        billingPlan: 'starter'
      })
    });
    
    if (response.ok) {
      const org = await response.json();
      console.log('✅ Organization created successfully:', org);
      console.log('Please refresh the page to see the updated organization data');
      return org;
    } else {
      const error = await response.text();
      console.error('❌ Failed to create organization:', error);
      throw new Error(error);
    }
  } catch (error) {
    console.error('❌ Error creating organization:', error);
    throw error;
  }
};

// Make functions globally available for console debugging
(window as any).debugCreateAI = debugCreateAI;
(window as any).fixMissingOrganization = fixMissingOrganization;

// Auto-run debug on script load
console.log('🔍 CreateAI Debug Tools Loaded');
console.log('Run debugCreateAI() in console for detailed debug info');
console.log('Run fixMissingOrganization() to create a default organization');
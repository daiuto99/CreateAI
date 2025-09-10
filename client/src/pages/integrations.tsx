import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

// Import service logos
import openaiLogo from '@assets/openai_1756919666153.png';
import freshdeskLogo from '@assets/generated_images/Freshdesk_professional_logo_icon_91284b50.png';
import airtableLogo from '@assets/airtable-logo.jpeg';
import wordpressLogo from '@assets/wordPress_1756919666154.png';
import transistorLogo from '@assets/transister_1756919666154.jpg';
import elevenlabsLogo from '@assets/elevenlabs_1756919666154.png';
import adobeStockLogo from '@assets/Adobe_1756919666154.png';
import otterLogo from '@assets/generated_images/Otter.AI_professional_logo_f69f2acd.png';
import outlookLogo from '@assets/generated_images/Microsoft_Outlook_professional_icon_d90a7b40.png';

interface Integration {
  id: string;
  provider: string;
  status: 'connected' | 'error' | 'needs_oauth' | 'expired' | 'disabled' | 'setup_required';
  credentials?: any;
  settings?: any;
  lastSync?: string;
  last_validated?: string;
  createdAt: string;
  updatedAt: string;
}


interface ServiceConfig {
  name: string;
  description: string;
  logo: string;
  helpText: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'url';
    placeholder: string;
    required: boolean;
  }>;
}

const serviceConfigs: Record<string, ServiceConfig> = {
  openai: {
    name: 'OpenAI',
    description: 'AI-powered content generation for blogs, podcasts, and ebooks',
    logo: openaiLogo,
    helpText: 'Create an API key at platform.openai.com → API keys. You\'ll need a paid OpenAI account with available credits.',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true }
    ]
  },
  airtable: {
    name: 'Airtable',
    description: 'Sync meeting intelligence and contact management with your Airtable bases',
    logo: airtableLogo,
    helpText: 'In Airtable, go to your account → Generate API key. Also provide your base ID from the URL (e.g., "appXXXXXXXXXX").',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your Airtable API key', required: true },
      { key: 'baseId', label: 'Base ID', type: 'text', placeholder: 'appXXXXXXXXXX (from Airtable URL)', required: true }
    ]
  },
  wordpress: {
    name: 'WordPress',
    description: 'Automatically publish blog posts to your WordPress site',
    logo: wordpressLogo,
    helpText: 'In WordPress admin: Users → Profile → Application Passwords → Add New. Enter a name and copy the generated password (format: xxxx xxxx xxxx xxxx).',
    fields: [
      { key: 'siteUrl', label: 'Site URL', type: 'url', placeholder: 'https://yoursite.com', required: true },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'admin', required: true },
      { key: 'applicationPassword', label: 'Application Password', type: 'password', placeholder: 'xxxx xxxx xxxx xxxx', required: true }
    ]
  },
  transistor: {
    name: 'Transistor FM',
    description: 'Upload and distribute podcasts with automated publishing',
    logo: transistorLogo,
    helpText: 'Log into Transistor.fm → Settings → API Access → Generate new API key. You\'ll need a Transistor account with an active podcast.',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your API key', required: true }
    ]
  },
  elevenlabs: {
    name: 'ElevenLabs',
    description: 'Generate realistic voices for podcasts and audio content',
    logo: elevenlabsLogo,
    helpText: 'Visit elevenlabs.io → Profile (top right) → API Key tab → Copy your API key. You need an ElevenLabs account (free tier available).',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your ElevenLabs API key', required: true }
    ]
  },
  adobe_stock: {
    name: 'Adobe Stock',
    description: 'Access millions of high-quality images and assets',
    logo: adobeStockLogo,
    helpText: 'Create an Adobe Developer account → Console → Create Project → Add API (Creative SDK) → Generate credentials. Requires Adobe Stock subscription.',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Your Adobe client ID', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Your Adobe client secret', required: true }
    ]
  },
  otter: {
    name: 'Otter.ai',
    description: 'Sync CRM contacts with AI-powered meeting notes and transcriptions',
    logo: otterLogo,
    helpText: 'In Otter.ai, go to Settings → Integrations tab → click "API Key" button (top right). Generate an API key to access meeting transcriptions. Also supports direct Salesforce and HubSpot integrations.',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'otter_api_key_here', required: true }
    ]
  },
  outlook: {
    name: 'Microsoft Outlook',
    description: 'Import calendar events and meeting data for intelligence sync',
    logo: outlookLogo,
    helpText: 'In Outlook.com, go to Calendar → Settings (gear icon) → Shared calendars → Publish a calendar → Select your calendar → Copy the ICS URL. Or use your organization\'s public calendar feed URL.',
    fields: [
      { key: 'feedUrl', label: 'Calendar Feed URL (ICS)', type: 'text', placeholder: 'https://outlook.live.com/owa/calendar/xxx/calendar.ics', required: true }
    ]
  }
};

export default function Integrations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle OAuth callback success/error messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const details = urlParams.get('details');

    if (success === 'freshdesk_connected') {
      toast({
        title: 'Freshdesk Connected!',
        description: 'Your Freshdesk integration has been successfully connected.'
      });
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh integrations list
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    } else if (error) {
      let errorMessage = 'Integration connection failed';
      switch (error) {
        case 'oauth_failed':
          errorMessage = `OAuth authorization failed: ${details || 'Unknown error'}`;
          break;
        case 'invalid_callback':
          errorMessage = 'Invalid OAuth callback - missing authorization code';
          break;
        case 'invalid_state':
          errorMessage = 'Security validation failed - please try again';
          break;
        case 'missing_credentials':
          errorMessage = 'API credentials not found - please configure Freshdesk first';
          break;
        case 'token_exchange_failed':
          errorMessage = `Token exchange failed: ${details || 'Unknown error'}`;
          break;
        case 'callback_failed':
          errorMessage = `OAuth process failed: ${details || 'Unknown error'}`;
          break;
        default:
          errorMessage = details || error;
      }
      
      toast({
        title: 'OAuth Connection Failed',
        description: errorMessage,
        variant: 'destructive'
      });
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast, queryClient]);

  const { data: integrations = [], isLoading } = useQuery<Integration[]>({
    queryKey: ['/api/integrations'],
  });

  const connectMutation = useMutation({
    mutationFn: async (data: { provider: string; credentials: Record<string, string> }) => {
      // First save the credentials
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save credentials');
      
      // Then test the connection
      const testResponse = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: data.provider }),
      });
      
      const testResult = await testResponse.json();
      return { integration: await response.json(), testResult };
    },
    onSuccess: ({ testResult }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      if (testResult.success) {
        toast({ title: 'Service connected and verified!', description: testResult.message });
      } else {
        toast({ 
          title: 'Credentials saved but connection failed', 
          description: testResult.error,
          variant: 'destructive' 
        });
      }
      setIsModalOpen(false);
      setFormData({});
    },
    onError: (error) => {
      toast({ title: 'Failed to connect service', description: error.message, variant: 'destructive' });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Connection test successful!', description: result.message });
        queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      } else {
        toast({ title: 'Connection test failed', description: result.error, variant: 'destructive' });
      }
    },
    onError: (error) => {
      toast({ title: 'Test failed', description: error.message, variant: 'destructive' });
    },
  });


  const getIntegrationByProvider = (provider: string) => {
    return integrations.find(integration => integration.provider === provider);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'needs_oauth': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      case 'disabled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status: string, lastValidated?: string) => {
    const getTimeAgo = (dateStr?: string) => {
      if (!dateStr) return '';
      const diff = Date.now() - new Date(dateStr).getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (days > 0) return ` (${days}d ago)`;
      if (hours > 0) return ` (${hours}h ago)`;
      return ' (Recent)';
    };

    const timeAgo = getTimeAgo(lastValidated);
    
    switch (status) {
      case 'connected': return `Connected${timeAgo}`;
      case 'needs_oauth': return 'Needs Authorization';
      case 'error': return 'Connection Error';
      case 'expired': return 'Credentials Expired';
      case 'disabled': return 'Disabled';
      case 'setup_required': return 'Needs Testing';
      default: return 'Setup Required';
    }
  };

  // Connection handling for integrations

  const handleConnect = (provider: string) => {
    setSelectedService(provider);
    setFormData({});
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    connectMutation.mutate({
      provider: selectedService,
      credentials: formData,
    });
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center space-x-2"
            data-testid="button-back"
          >
            <i className="fas fa-arrow-left"></i>
            <span>Back</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-600">
          Connect external services to automate your content creation workflow
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(serviceConfigs).map(([provider, config]) => {
          const integration = getIntegrationByProvider(provider);
          const isConnected = integration?.status === 'connected';

          return (
            <Card key={provider} className="relative">
              {/* Service name and help icon in upper right corner */}
              <div className="absolute top-3 right-3 flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-500">{config.name}</span>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        type="button"
                      >
                        <span className="text-xs font-bold">?</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top" 
                      className="max-w-sm z-50 p-3 text-sm bg-slate-900 text-white border border-slate-600"
                      sideOffset={8}
                    >
                      <p>{config.helpText}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-[70px] h-[70px] flex items-center justify-center">
                    <img 
                      src={config.logo} 
                      alt={`${config.name} logo`} 
                      className="w-[70px] h-[70px] rounded object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                  </div>
                  {integration && (
                    <Badge className={getStatusColor(integration.status)}>
                      {getStatusText(integration.status, integration.last_validated)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Last validated:</span>
                      <span className="font-medium">
                        {integration?.last_validated 
                          ? new Date(integration.last_validated).toLocaleDateString()
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => testConnectionMutation.mutate(provider)}
                        disabled={testConnectionMutation.isPending}
                        data-testid={`button-test-${provider}`}
                      >
                        {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : integration?.status === 'needs_oauth' || !integration ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Configuration required to access {config.name} API.
                    </p>
                    <Button 
                      onClick={() => handleConnect(provider)}
                      className="w-full"
                      data-testid={`button-connect-${provider}`}
                    >
                      Connect {config.name}
                    </Button>
                  </div>
                ) : integration?.status === 'error' ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        Connection failed. Please check your credentials and try connecting again.
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleConnect(provider)}
                      className="w-full"
                      data-testid={`button-reconnect-${provider}`}
                    >
                      Reconnect {config.name}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => handleConnect(provider)}
                    className="w-full"
                    data-testid={`button-connect-${provider}`}
                  >
                    Connect {config.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connection Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Connect {selectedService ? serviceConfigs[selectedService]?.name : ''}
            </DialogTitle>
            <DialogDescription>
              Configure your {selectedService ? serviceConfigs[selectedService]?.name : 'service'} integration to enable seamless content synchronization.
            </DialogDescription>
          </DialogHeader>
          
          {selectedService && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {serviceConfigs[selectedService].fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Input
                    id={field.key}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      [field.key]: e.target.value
                    }))}
                    required={field.required}
                  />
                </div>
              ))}
              
              <div className="flex space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
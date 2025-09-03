import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Integration {
  id: string;
  provider: string;
  status: 'connected' | 'error' | 'expired' | 'disabled' | 'setup_required';
  settings?: any;
  lastSync?: string;
}

interface IntegrationStatusProps {
  integrations: Integration[];
}

const integrationInfo = {
  hubspot: {
    name: 'HubSpot CRM',
    icon: 'fas fa-hubspot',
    color: 'bg-orange-500',
  },
  wordpress: {
    name: 'WordPress',
    icon: 'fas fa-wordpress',
    color: 'bg-blue-500',
  },
  transistor: {
    name: 'Transistor',
    icon: 'fas fa-podcast',
    color: 'bg-purple-500',
  },
  elevenlabs: {
    name: 'ElevenLabs',
    icon: 'fas fa-microphone-alt',
    color: 'bg-green-500',
  },
  openai: {
    name: 'OpenAI',
    icon: 'fas fa-robot',
    color: 'bg-red-500',
  },
  adobe_stock: {
    name: 'Adobe Stock',
    icon: 'fas fa-image',
    color: 'bg-pink-500',
  },
};

const defaultIntegrations = ['hubspot', 'wordpress', 'transistor'];

export default function IntegrationStatus({ integrations }: IntegrationStatusProps) {
  // Merge user integrations with default ones
  const allIntegrations = defaultIntegrations.map(provider => {
    const userIntegration = integrations.find(i => i.provider === provider);
    return userIntegration || { 
      id: provider, 
      provider, 
      status: 'setup_required' as const 
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'expired':
        return 'bg-orange-500';
      case 'disabled':
        return 'bg-gray-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'expired':
        return 'Expired';
      case 'disabled':
        return 'Disabled';
      default:
        return 'Setup Required';
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Integration Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allIntegrations.map((integration) => {
            const info = integrationInfo[integration.provider as keyof typeof integrationInfo];
            if (!info) return null;

            return (
              <div
                key={integration.id}
                className="flex items-center p-4 rounded-lg border border-border hover:border-primary transition-colors"
                data-testid={`integration-${integration.provider}`}
              >
                <div className={`w-10 h-10 ${info.color} rounded-lg flex items-center justify-center mr-4`}>
                  <i className={`${info.icon} text-white`}></i>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground" data-testid={`text-integration-name-${integration.provider}`}>
                    {info.name}
                  </h4>
                  <div className="flex items-center mt-1">
                    <div className={`w-2 h-2 ${getStatusColor(integration.status)} rounded-full mr-2`}></div>
                    <span 
                      className="text-sm text-muted-foreground"
                      data-testid={`text-integration-status-${integration.provider}`}
                    >
                      {getStatusText(integration.status)}
                    </span>
                  </div>
                  {integration.lastSync && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last sync: {new Date(integration.lastSync).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

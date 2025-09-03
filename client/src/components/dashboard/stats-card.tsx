import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: string;
  color: 'primary' | 'blue' | 'green' | 'purple' | 'orange' | 'red';
  testId?: string;
}

export default function StatsCard({ title, value, change, icon, color, testId }: StatsCardProps) {
  const getIconColor = (color: string) => {
    switch (color) {
      case 'primary':
        return 'text-primary';
      case 'blue':
        return 'text-blue-500';
      case 'green':
        return 'text-green-500';
      case 'purple':
        return 'text-purple-500';
      case 'orange':
        return 'text-orange-500';
      case 'red':
        return 'text-red-500';
      default:
        return 'text-primary';
    }
  };

  const getBackgroundColor = (color: string) => {
    switch (color) {
      case 'primary':
        return 'bg-primary/20';
      case 'blue':
        return 'bg-blue-500/20';
      case 'green':
        return 'bg-green-500/20';
      case 'purple':
        return 'bg-purple-500/20';
      case 'orange':
        return 'bg-orange-500/20';
      case 'red':
        return 'bg-red-500/20';
      default:
        return 'bg-primary/20';
    }
  };

  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" data-testid={`${testId}-title`}>
          {title}
        </CardTitle>
        <div className={`w-8 h-8 ${getBackgroundColor(color)} rounded-lg flex items-center justify-center`}>
          <i className={`${icon} ${getIconColor(color)}`}></i>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground" data-testid={`${testId}-value`}>
          {value}
        </div>
        {change && (
          <p className="text-xs text-muted-foreground" data-testid={`${testId}-change`}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

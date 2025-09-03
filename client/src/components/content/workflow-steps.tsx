import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const workflowSteps = [
  {
    number: 1,
    title: 'Outline',
    description: 'AI generates structured content outline',
    icon: 'fas fa-lightbulb',
    color: 'bg-yellow-500/20 text-yellow-500',
  },
  {
    number: 2,
    title: 'Script',
    description: 'Convert outline to full script with SSML',
    icon: 'fas fa-file-alt',
    color: 'bg-blue-500/20 text-blue-500',
  },
  {
    number: 3,
    title: 'Voice Gen',
    description: 'ElevenLabs TTS with voice profiles',
    icon: 'fas fa-microphone',
    color: 'bg-green-500/20 text-green-500',
  },
  {
    number: 4,
    title: 'Publish',
    description: 'Auto-publish to platforms & CRM sync',
    icon: 'fas fa-upload',
    color: 'bg-purple-500/20 text-purple-500',
  },
];

export default function WorkflowSteps() {
  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            AI Workflow Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {workflowSteps.map((step) => (
              <div key={step.number} className="text-center p-4 rounded-lg bg-muted/50" data-testid={`workflow-step-${step.number}`}>
                <div className={`w-12 h-12 ${step.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                  <i className={`${step.icon}`}></i>
                </div>
                <h4 className="font-medium text-foreground mb-2" data-testid={`text-step-title-${step.number}`}>
                  {step.number}. {step.title}
                </h4>
                <p className="text-sm text-muted-foreground" data-testid={`text-step-description-${step.number}`}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

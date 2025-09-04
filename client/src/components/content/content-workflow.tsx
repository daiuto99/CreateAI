import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ContentProject } from '@shared/schema';

interface ContentWorkflowProps {
  project: ContentProject;
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

interface ContentOutline {
  title: string;
  sections: Array<{
    title: string;
    keyPoints: string[];
    estimatedDuration?: number;
  }>;
  estimatedDuration?: number;
  targetAudience: string;
  keyTakeaways: string[];
}

export default function ContentWorkflow({ project }: ContentWorkflowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Workflow state
  const [currentStep, setCurrentStep] = useState(1);
  const [outline, setOutline] = useState<ContentOutline | null>(null);
  const [content, setContent] = useState<any>(null);
  const [audioFile, setAudioFile] = useState<string | null>(null);
  
  // Form state
  const [prompt, setPrompt] = useState('');
  const [contentSettings, setContentSettings] = useState({
    hostType: 'single',
    targetLength: 10,
    audience: 'General audience',
    tone: 'Professional'
  });

  const workflowSteps: WorkflowStep[] = [
    {
      id: 'outline',
      title: 'Outline',
      description: 'AI generates structured content outline',
      icon: '💡',
      color: 'bg-yellow-500/20 text-yellow-600',
      status: outline ? 'completed' : 'pending'
    },
    {
      id: 'script',
      title: project.type === 'podcast' ? 'Script' : project.type === 'blog' ? 'Draft' : 'Chapter',
      description: project.type === 'podcast' 
        ? 'Convert outline to podcast script with SSML' 
        : project.type === 'blog' 
        ? 'Create SEO-optimized blog post'
        : 'Generate detailed chapter content',
      icon: '📝',
      color: 'bg-blue-500/20 text-blue-600',
      status: content ? 'completed' : outline ? 'pending' : 'pending'
    },
    {
      id: 'voice',
      title: project.type === 'podcast' ? 'Voice Gen' : 'Enhancement',
      description: project.type === 'podcast' 
        ? 'ElevenLabs TTS with voice profiles'
        : project.type === 'blog'
        ? 'SEO optimization & media assets'
        : 'Format & illustrations',
      icon: project.type === 'podcast' ? '🎤' : project.type === 'blog' ? '🔍' : '🎨',
      color: 'bg-green-500/20 text-green-600',
      status: audioFile ? 'completed' : 'pending'
    },
    {
      id: 'publish',
      title: 'Publish',
      description: 'Auto-publish to platforms & CRM sync',
      icon: '🚀',
      color: 'bg-purple-500/20 text-purple-600',
      status: project.status === 'published' ? 'completed' : 'pending'
    }
  ];

  // Generate outline mutation
  const generateOutlineMutation = useMutation({
    mutationFn: async (data: { prompt: string; settings: any }) => {
      console.log('🤖 Generating outline for', project.type, 'project:', project.id);
      const response = await fetch(`/api/content/${project.id}/generate-outline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: project.type,
          prompt: data.prompt,
          settings: data.settings
        })
      });
      if (!response.ok) throw new Error('Failed to generate outline');
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Outline generated:', data);
      setOutline(data);
      setCurrentStep(2);
      toast({
        title: "Outline Generated",
        description: `AI has created a structured outline for your ${project.type}.`
      });
    },
    onError: (error) => {
      console.error('❌ Outline generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate outline. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Generate content mutation
  const generateContentMutation = useMutation({
    mutationFn: async () => {
      console.log('🤖 Generating content for', project.type, 'from outline');
      const response = await fetch(`/api/content/${project.id}/generate-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: project.type,
          outline,
          settings: contentSettings
        })
      });
      if (!response.ok) throw new Error('Failed to generate content');
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Content generated:', data);
      setContent(data);
      setCurrentStep(3);
      toast({
        title: "Content Generated",
        description: `Your ${project.type} content is ready for the next step.`
      });
    },
    onError: (error) => {
      console.error('❌ Content generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Generate voice/enhancement mutation
  const generateEnhancementMutation = useMutation({
    mutationFn: async () => {
      console.log('🤖 Generating enhancement for', project.type);
      const response = await fetch(`/api/content/${project.id}/generate-enhancement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: project.type,
          content,
          settings: contentSettings
        })
      });
      if (!response.ok) throw new Error('Failed to generate enhancement');
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Enhancement generated:', data);
      if (project.type === 'podcast') {
        setAudioFile(data.audioUrl);
      }
      setCurrentStep(4);
      toast({
        title: `${project.type === 'podcast' ? 'Voice' : 'Enhancement'} Generated`,
        description: `Your ${project.type} is enhanced and ready to publish.`
      });
    },
    onError: (error) => {
      console.error('❌ Enhancement generation failed:', error);
      toast({
        title: "Enhancement Failed",
        description: "Failed to enhance content. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 Publishing', project.type, 'to platforms');
      const response = await fetch(`/api/content/${project.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: project.type,
          content,
          audioFile,
          settings: contentSettings
        })
      });
      if (!response.ok) throw new Error('Failed to publish content');
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Content published:', data);
      toast({
        title: "Published Successfully",
        description: `Your ${project.type} has been published to all configured platforms.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/content-projects/detail', project.id] });
    },
    onError: (error) => {
      console.error('❌ Publishing failed:', error);
      toast({
        title: "Publishing Failed",
        description: "Failed to publish content. Please check your integrations.",
        variant: "destructive"
      });
    }
  });

  const handleGenerateOutline = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please provide a description for your content.",
        variant: "destructive"
      });
      return;
    }
    generateOutlineMutation.mutate({ prompt, settings: contentSettings });
  };

  const getStepProgress = () => {
    return (currentStep / workflowSteps.length) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{project.type === 'podcast' ? '🎙️' : project.type === 'blog' ? '📝' : '📚'}</span>
                {project.name} - AI Workflow
              </CardTitle>
              <CardDescription>
                Step {currentStep} of {workflowSteps.length} - {workflowSteps[currentStep - 1]?.title}
              </CardDescription>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              {Math.round(getStepProgress())}% Complete
            </Badge>
          </div>
          <Progress value={getStepProgress()} className="w-full" />
        </CardHeader>
      </Card>

      {/* Workflow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {workflowSteps.map((step, index) => {
          const isActive = currentStep === index + 1;
          const isCompleted = index + 1 < currentStep;
          
          return (
            <Card 
              key={step.id} 
              className={`transition-all ${
                isActive ? 'ring-2 ring-primary shadow-md' : ''
              } ${isCompleted ? 'bg-muted/50' : ''}`}
            >
              <CardContent className="p-4 text-center">
                <div className={`w-12 h-12 ${step.color} rounded-lg flex items-center justify-center mx-auto mb-3 text-xl`}>
                  {step.icon}
                </div>
                <h4 className="font-medium text-sm mb-1">
                  {index + 1}. {step.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
                {isCompleted && (
                  <Badge className="mt-2 text-xs" variant="secondary">
                    ✓ Completed
                  </Badge>
                )}
                {isActive && (
                  <Badge className="mt-2 text-xs">
                    In Progress
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Step Content */}
      <Tabs value={`step-${currentStep}`} className="w-full">
        {/* Step 1: Outline Generation */}
        <TabsContent value="step-1" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Generate Content Outline</CardTitle>
              <CardDescription>
                Describe what you want to create and AI will generate a structured outline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Content Description</label>
                <Textarea
                  placeholder={`Describe your ${project.type}... e.g., "A comprehensive guide about sustainable living practices for beginners"`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-20"
                  data-testid="input-content-prompt"
                />
              </div>

              {/* Content Type Specific Settings */}
              {project.type === 'podcast' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Host Type</label>
                    <Select value={contentSettings.hostType} onValueChange={(value) => 
                      setContentSettings(prev => ({ ...prev, hostType: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Host</SelectItem>
                        <SelectItem value="morning_show">Morning Show</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Length (minutes)</label>
                    <Input
                      type="number"
                      value={contentSettings.targetLength}
                      onChange={(e) => setContentSettings(prev => ({ 
                        ...prev, 
                        targetLength: parseInt(e.target.value) || 10 
                      }))}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Audience</label>
                  <Select value={contentSettings.audience} onValueChange={(value) => 
                    setContentSettings(prev => ({ ...prev, audience: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General audience">General Audience</SelectItem>
                      <SelectItem value="Beginners">Beginners</SelectItem>
                      <SelectItem value="Professionals">Professionals</SelectItem>
                      <SelectItem value="Technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tone</label>
                  <Select value={contentSettings.tone} onValueChange={(value) => 
                    setContentSettings(prev => ({ ...prev, tone: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Professional">Professional</SelectItem>
                      <SelectItem value="Casual">Casual</SelectItem>
                      <SelectItem value="Educational">Educational</SelectItem>
                      <SelectItem value="Entertaining">Entertaining</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleGenerateOutline}
                disabled={generateOutlineMutation.isPending}
                className="w-full"
                data-testid="button-generate-outline"
              >
                {generateOutlineMutation.isPending ? 'Generating Outline...' : 'Generate AI Outline'}
              </Button>

              {outline && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Generated Outline:</h4>
                  <div className="space-y-2">
                    <h5 className="font-medium">{outline.title}</h5>
                    <p className="text-sm text-muted-foreground">Target: {outline.targetAudience}</p>
                    {outline.estimatedDuration && (
                      <p className="text-sm text-muted-foreground">
                        Estimated Duration: {outline.estimatedDuration} minutes
                      </p>
                    )}
                    <div className="space-y-1">
                      {outline.sections.map((section, index) => (
                        <div key={index} className="text-sm">
                          <strong>{index + 1}. {section.title}</strong>
                          <ul className="ml-4 list-disc">
                            {section.keyPoints.map((point, pointIndex) => (
                              <li key={pointIndex} className="text-muted-foreground">{point}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Content Generation */}
        <TabsContent value="step-2" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Generate {project.type === 'podcast' ? 'Script' : project.type === 'blog' ? 'Blog Draft' : 'Chapter Content'}</CardTitle>
              <CardDescription>
                AI will convert your outline into detailed {project.type} content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!outline ? (
                <p className="text-muted-foreground">Complete Step 1 to generate content.</p>
              ) : (
                <>
                  <Button 
                    onClick={() => generateContentMutation.mutate()}
                    disabled={generateContentMutation.isPending}
                    className="w-full"
                    data-testid="button-generate-content"
                  >
                    {generateContentMutation.isPending ? 
                      `Generating ${project.type === 'podcast' ? 'Script' : project.type === 'blog' ? 'Blog Post' : 'Chapter'}...` : 
                      `Generate AI ${project.type === 'podcast' ? 'Script' : project.type === 'blog' ? 'Blog Post' : 'Chapter'}`
                    }
                  </Button>

                  {content && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Generated Content Preview:</h4>
                      <div className="max-h-60 overflow-y-auto text-sm">
                        {project.type === 'blog' && content.title && (
                          <div className="mb-4">
                            <h5 className="font-medium">{content.title}</h5>
                            <p className="text-muted-foreground">{content.metaDescription}</p>
                            {content.seoScore && (
                              <Badge className="mt-1">SEO Score: {content.seoScore}/100</Badge>
                            )}
                          </div>
                        )}
                        <pre className="whitespace-pre-wrap text-xs">
                          {typeof content === 'string' ? content : 
                           content.content || JSON.stringify(content, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: Enhancement */}
        <TabsContent value="step-3" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 3: {project.type === 'podcast' ? 'Voice Generation' : project.type === 'blog' ? 'SEO Enhancement' : 'Format & Illustrations'}</CardTitle>
              <CardDescription>
                {project.type === 'podcast' ? 'Generate realistic voice audio using ElevenLabs' :
                 project.type === 'blog' ? 'Optimize for SEO and add media assets' :
                 'Format content and add illustrations'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!content ? (
                <p className="text-muted-foreground">Complete Step 2 to continue.</p>
              ) : (
                <>
                  <Button 
                    onClick={() => generateEnhancementMutation.mutate()}
                    disabled={generateEnhancementMutation.isPending}
                    className="w-full"
                    data-testid="button-generate-enhancement"
                  >
                    {generateEnhancementMutation.isPending ? 
                      `${project.type === 'podcast' ? 'Generating Voice...' : project.type === 'blog' ? 'Optimizing SEO...' : 'Formatting...'}` : 
                      `${project.type === 'podcast' ? 'Generate Voice Audio' : project.type === 'blog' ? 'Optimize & Enhance' : 'Format & Illustrate'}`
                    }
                  </Button>

                  {project.type === 'podcast' && audioFile && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Generated Audio:</h4>
                      <audio controls className="w-full">
                        <source src={audioFile} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 4: Publishing */}
        <TabsContent value="step-4" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Publish Content</CardTitle>
              <CardDescription>
                Automatically publish to configured platforms and sync with CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStep < 4 ? (
                <p className="text-muted-foreground">Complete all previous steps to publish.</p>
              ) : (
                <>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Ready to publish to your configured platforms:
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {project.type === 'podcast' && <Badge variant="outline">Transistor FM</Badge>}
                      {project.type === 'blog' && <Badge variant="outline">WordPress</Badge>}
                      <Badge variant="outline">Bigin CRM</Badge>
                      <Badge variant="outline">Analytics</Badge>
                    </div>
                  </div>

                  <Button 
                    onClick={() => publishMutation.mutate()}
                    disabled={publishMutation.isPending}
                    className="w-full"
                    data-testid="button-publish-content"
                  >
                    {publishMutation.isPending ? 'Publishing...' : 'Publish to All Platforms'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
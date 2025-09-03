import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Import custom icons
import labIcon from '@assets/generated_images/The_Lab_AI_content_creation_icon_f26cd1d3.png'
import syncIcon from '@assets/generated_images/CRM_synchronization_workflow_icon_8587610e.png'
import reportsIcon from '@assets/generated_images/Analytics_reports_dashboard_icon_aa8cffd8.png'
import dashboardIcon from '@assets/generated_images/KPI_dashboard_interface_icon_1c62cc62.png'

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-5"></div>
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center">
                <i className="fas fa-robot text-white text-xl"></i>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-foreground">
                CreateAI
              </h1>
            </div>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              A minimalist workspace for content creation, CRM sync, and performance analytics
            </p>
            
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Generate podcasts, blogs, and e-books with AI assistance. Sync with your CRM automatically. 
              Track performance with beautiful analytics.
            </p>
            
            <Button 
              onClick={() => window.location.href = '/api/login'}
              size="lg"
              className="text-lg px-8 py-4"
              data-testid="button-login"
            >
              Get Started
              <i className="fas fa-arrow-right ml-2"></i>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything you need for content creation
          </h2>
          <p className="text-lg text-muted-foreground">
            Powered by AI, designed for creators
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 gradient-bg rounded-lg flex items-center justify-center mx-auto mb-4">
                <img src={labIcon} alt="The Lab icon" className="w-6 h-6" />
              </div>
              <CardTitle>The Lab</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                AI-powered content creation for podcasts, blogs, and e-books with guided workflows
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <img src={syncIcon} alt="CRM Sync icon" className="w-6 h-6" />
              </div>
              <CardTitle>CRM Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Automatically sync meeting intelligence and voice updates into HubSpot CRM
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <img src={reportsIcon} alt="Reports icon" className="w-6 h-6" />
              </div>
              <CardTitle>Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Weekly and monthly performance summaries with custom report builder
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <img src={dashboardIcon} alt="Dashboard icon" className="w-6 h-6" />
              </div>
              <CardTitle>Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Real-time KPIs and performance metrics in a clean, customizable interface
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Workflow Section */}
      <div className="bg-muted/50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              AI-Powered Workflow
            </h2>
            <p className="text-lg text-muted-foreground">
              From idea to published content in four simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-lightbulb text-yellow-500 text-xl"></i>
              </div>
              <h3 className="font-semibold text-foreground mb-2">1. Outline</h3>
              <p className="text-sm text-muted-foreground">
                AI generates structured content outline based on your prompt
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-file-alt text-blue-500 text-xl"></i>
              </div>
              <h3 className="font-semibold text-foreground mb-2">2. Draft</h3>
              <p className="text-sm text-muted-foreground">
                Convert outline to full content with SEO optimization
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-microphone text-green-500 text-xl"></i>
              </div>
              <h3 className="font-semibold text-foreground mb-2">3. Generate</h3>
              <p className="text-sm text-muted-foreground">
                AI voice generation for podcasts or image suggestions for blogs
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-upload text-purple-500 text-xl"></i>
              </div>
              <h3 className="font-semibold text-foreground mb-2">4. Publish</h3>
              <p className="text-sm text-muted-foreground">
                Auto-publish to platforms and sync with CRM systems
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to transform your content creation?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of creators using AI to scale their content production
          </p>
          
          <Button 
            onClick={() => window.location.href = '/api/login'}
            size="lg"
            className="text-lg px-8 py-4"
            data-testid="button-cta-login"
          >
            Start Creating Now
            <i className="fas fa-rocket ml-2"></i>
          </Button>
        </div>
      </div>
    </div>
  );
}

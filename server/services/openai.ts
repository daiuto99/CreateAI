import OpenAI from "openai";
import type { IStorage } from '../storage.js';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user

export interface ContentOutline {
  title: string;
  sections: {
    title: string;
    duration?: number; // for podcasts
    keyPoints: string[];
  }[];
  estimatedDuration?: number;
  targetAudience: string;
  keyTakeaways: string[];
}

export interface BlogDraft {
  title: string;
  metaDescription: string;
  content: string;
  tags: string[];
  readingTime: number;
  seoScore: number;
}

export interface PodcastScript {
  title: string;
  sections: {
    title: string;
    speakerTag: string;
    content: string;
    ssmlContent: string;
    duration: number;
  }[];
  totalDuration: number;
  showNotes: string;
}

export class OpenAIService {
  private openai: OpenAI;
  
  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
    });
  }
  
  static async createWithUserIntegration(storage: IStorage, userId: string): Promise<OpenAIService> {
    try {
      // Fetch user's OpenAI integration
      const integrations = await storage.getUserIntegrations(userId);
      const openaiIntegration = integrations.find(i => i.provider === 'openai');
      
      if (openaiIntegration && openaiIntegration.credentials) {
        const apiKey = (openaiIntegration.credentials as any).apiKey;
        if (apiKey) {
          console.log('✅ Using user\'s OpenAI API key from integrations');
          return new OpenAIService(apiKey);
        }
      }
      
      console.warn('⚠️ No OpenAI integration found, using default key');
      return new OpenAIService();
    } catch (error) {
      console.error('❌ Error fetching OpenAI integration, using default key:', error);
      return new OpenAIService();
    }
  }
  async generateContentOutline(
    type: 'podcast' | 'blog' | 'ebook',
    prompt: string,
    settings: {
      hostType?: 'single' | 'morning_show' | 'interview';
      targetLength?: number;
      audience?: string;
      tone?: string;
    } = {}
  ): Promise<ContentOutline> {
    try {
      const systemPrompt = this.getSystemPrompt(type, 'outline', settings);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content!);
      
      return {
        title: result.title || "Untitled Content",
        sections: result.sections || [],
        estimatedDuration: result.estimatedDuration,
        targetAudience: result.targetAudience || settings.audience || "General audience",
        keyTakeaways: result.keyTakeaways || [],
      };
    } catch (error) {
      throw new Error(`Failed to generate content outline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateBlogDraft(outline: ContentOutline, settings: any = {}): Promise<BlogDraft> {
    try {
      const systemPrompt = `You are an expert content writer. Create a comprehensive blog post based on the provided outline. 
      The content should be engaging, SEO-optimized, and well-structured with proper headings.
      
      Respond with JSON in this format:
      {
        "title": "SEO-optimized title",
        "metaDescription": "Compelling meta description under 160 characters",
        "content": "Full blog post content in markdown format",
        "tags": ["relevant", "seo", "tags"],
        "readingTime": estimated_reading_time_in_minutes,
        "seoScore": score_out_of_100
      }`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Create a blog post based on this outline: ${JSON.stringify(outline)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      });

      return JSON.parse(response.choices[0].message.content!);
    } catch (error) {
      throw new Error(`Failed to generate blog draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generatePodcastScript(
    outline: ContentOutline, 
    hostType: 'single' | 'morning_show' | 'interview',
    hostProfile?: any
  ): Promise<PodcastScript> {
    try {
      const systemPrompt = this.getSystemPrompt('podcast', 'script', { hostType, hostProfile });
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Create a podcast script based on this outline: ${JSON.stringify(outline)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      return JSON.parse(response.choices[0].message.content!);
    } catch (error) {
      throw new Error(`Failed to generate podcast script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateEbookChapter(
    outline: ContentOutline,
    chapterIndex: number,
    settings: any = {}
  ): Promise<{ title: string; content: string; summary: string }> {
    try {
      const section = outline.sections[chapterIndex];
      if (!section) {
        throw new Error(`Chapter ${chapterIndex} not found in outline`);
      }

      const systemPrompt = `You are an expert ebook author. Create a comprehensive chapter based on the provided section outline.
      The content should be educational, well-structured, and engaging for readers.
      
      Respond with JSON in this format:
      {
        "title": "Chapter title",
        "content": "Full chapter content in markdown format",
        "summary": "Brief chapter summary"
      }`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Create a chapter for: ${section.title}\nKey points: ${section.keyPoints.join(', ')}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      });

      return JSON.parse(response.choices[0].message.content!);
    } catch (error) {
      throw new Error(`Failed to generate ebook chapter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractCRMFields(text: string): Promise<{
    contacts: any[];
    companies: any[];
    actionItems: any[];
    sentiment: string;
  }> {
    try {
      const systemPrompt = `You are a CRM data extraction expert. Analyze the provided text and extract relevant CRM information.
      
      Respond with JSON in this format:
      {
        "contacts": [{"name": "John Doe", "email": "john@example.com", "phone": "+1234567890"}],
        "companies": [{"name": "Acme Corp", "domain": "acme.com", "industry": "Technology"}],
        "actionItems": [{"task": "Follow up on proposal", "priority": "high", "dueDate": "2024-01-15"}],
        "sentiment": "positive|neutral|negative"
      }`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0].message.content!);
    } catch (error) {
      throw new Error(`Failed to extract CRM fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getSystemPrompt(
    type: 'podcast' | 'blog' | 'ebook',
    stage: 'outline' | 'script' | 'draft',
    settings: any = {}
  ): string {
    const basePrompts = {
      podcast: {
        outline: `You are a podcast production expert. Create a structured outline for a podcast episode.
        Consider the host type: ${settings.hostType || 'single'} and target duration: ${settings.targetLength || 30} minutes.
        
        Respond with JSON in this format:
        {
          "title": "Episode title",
          "sections": [
            {
              "title": "Section name",
              "duration": estimated_duration_in_minutes,
              "keyPoints": ["point1", "point2", "point3"]
            }
          ],
          "estimatedDuration": total_duration_in_minutes,
          "targetAudience": "Target audience description",
          "keyTakeaways": ["takeaway1", "takeaway2", "takeaway3"]
        }`,
        
        script: `You are a podcast script writer. Create an engaging script with proper speaker tags and SSML markup for TTS.
        Host type: ${settings.hostType || 'single'}. Include natural conversation flow, transitions, and calls-to-action.
        
        Respond with JSON in this format:
        {
          "title": "Episode title",
          "sections": [
            {
              "title": "Section name",
              "speakerTag": "HOST1|HOST2|GUEST",
              "content": "Natural speaking content",
              "ssmlContent": "SSML-formatted content with pauses and emphasis",
              "duration": estimated_duration_in_minutes
            }
          ],
          "totalDuration": total_duration_in_minutes,
          "showNotes": "Formatted show notes with timestamps"
        }`
      },
      
      blog: {
        outline: `You are a content marketing expert. Create a comprehensive blog post outline that's SEO-optimized and engaging.
        Target length: ${settings.targetLength || 1500} words. Tone: ${settings.tone || 'professional'}.
        
        Respond with JSON in this format:
        {
          "title": "SEO-optimized blog title",
          "sections": [
            {
              "title": "H2 or H3 heading",
              "keyPoints": ["point1", "point2", "point3"]
            }
          ],
          "targetAudience": "Target reader description",
          "keyTakeaways": ["takeaway1", "takeaway2", "takeaway3"]
        }`
      },
      
      ebook: {
        outline: `You are an expert ebook author. Create a comprehensive outline for a ${settings.targetLength || 10}-page ebook.
        Structure should be logical and educational.
        
        Respond with JSON in this format:
        {
          "title": "Ebook title",
          "sections": [
            {
              "title": "Chapter title",
              "keyPoints": ["point1", "point2", "point3"]
            }
          ],
          "targetAudience": "Target reader description",
          "keyTakeaways": ["takeaway1", "takeaway2", "takeaway3"]
        }`
      }
    };

    const typePrompts = basePrompts[type];
    if (typePrompts && stage in typePrompts) {
      return typePrompts[stage as keyof typeof typePrompts];
    }
    return "You are a helpful content creation assistant.";
  }
}

export const openaiService = new OpenAIService();

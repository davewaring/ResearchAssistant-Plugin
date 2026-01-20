import React from 'react';
import './ResearchAssistant.css';
import { ResearchAssistantProps, ResearchAssistantState, ProjectContext, AnalysisResult, ModelInfo } from './types';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * Research Assistant Plugin
 *
 * Helps triage articles and resources against BrainDrive-Library project context.
 * MVP: Paste text, select project, analyze, get recommendations.
 */
class ResearchAssistant extends React.Component<ResearchAssistantProps, ResearchAssistantState> {
  private themeChangeListener: ((theme: string) => void) | null = null;

  constructor(props: ResearchAssistantProps) {
    super(props);

    this.state = {
      isLoading: false,
      error: '',
      currentTheme: 'light',
      isInitializing: false,
      // Article input
      articleText: '',
      // Project selection
      selectedProject: '',
      projects: [],
      // Model selection
      models: [],
      selectedModel: null,
      isLoadingModels: false,
      // Analysis results
      analysisResult: null,
      // Chat
      chatMessages: [],
      chatInput: '',
      isChatLoading: false,
      // Save status
      saveSuccess: '',
      isSaving: false
    };

    // Will be set after fetching from /api/v1/auth/me
    this.currentUserId = null;
  }

  private currentUserId: string | null = null;

  async componentDidMount() {
    await this.initializeServices();
    await this.loadProjects();
    await this.loadModels();
  }

  componentWillUnmount() {
    this.cleanupServices();
  }

  private async initializeServices(): Promise<void> {
    const { services } = this.props;

    // Initialize theme
    if (services.theme) {
      const currentTheme = services.theme.getCurrentTheme();
      this.setState({ currentTheme });

      this.themeChangeListener = (theme: string) => {
        this.setState({ currentTheme: theme });
      };
      services.theme.addThemeChangeListener(this.themeChangeListener);
    }

    // Get current user ID for API calls
    if (services.api) {
      try {
        const response = await services.api.get('/api/v1/auth/me');
        if (response && (response as any).id) {
          this.currentUserId = (response as any).id;
        }
      } catch (error) {
        console.warn('Research Assistant: Could not get current user ID:', error);
      }
    }
  }

  private cleanupServices(): void {
    const { services } = this.props;
    if (services.theme && this.themeChangeListener) {
      services.theme.removeThemeChangeListener(this.themeChangeListener);
    }
  }

  private async loadProjects(): Promise<void> {
    const { services } = this.props;

    if (!services.api) {
      console.warn('Research Assistant: API service not available, using fallback projects');
      this.setState({
        projects: [
          { slug: 'no-api', name: '(API not available)' }
        ]
      });
      return;
    }

    try {
      // Call the Library API to get real projects
      const response = await services.api.get('/api/v1/library/projects?category=active');

      // Handle both direct array and wrapped response
      const projects = Array.isArray(response) ? response : (response.data || []);

      if (projects.length === 0) {
        this.setState({
          projects: [{ slug: '', name: '(No projects found in Library)' }]
        });
        return;
      }

      // Map API response to Project interface
      this.setState({
        projects: projects.map((p: any) => ({
          slug: p.slug,
          name: p.status ? `${p.name} (${p.status})` : p.name,
          path: p.path,
          has_agent_md: p.has_agent_md,
          has_spec_md: p.has_spec_md,
          has_build_plan: p.has_build_plan,
          status: p.status
        }))
      });
    } catch (error) {
      console.error('Research Assistant: Failed to load projects:', error);
      this.setState({
        projects: [{ slug: '', name: '(Error loading projects)' }],
        error: 'Failed to load projects from Library'
      });
    }
  }

  private async loadModels(): Promise<void> {
    const { services } = this.props;

    if (!services.api) {
      console.warn('Research Assistant: API service not available for loading models');
      return;
    }

    this.setState({ isLoadingModels: true });

    // Provider settings ID mapping
    const PROVIDER_SETTINGS_MAP: Record<string, string> = {
      ollama: 'ollama_servers_settings',
      openai: 'openai_api_keys_settings',
      openrouter: 'openrouter_api_keys_settings',
      claude: 'claude_api_keys_settings',
      groq: 'groq_api_keys_settings'
    };

    try {
      const response = await services.api.get('/api/v1/ai/providers/all-models');

      // Handle multiple response formats (same as BrainDriveChat)
      const raw = (response && (response as any).models)
        || (response && (response as any).data && (response as any).data.models)
        || (Array.isArray(response) ? response : []);

      const loadedModels: ModelInfo[] = Array.isArray(raw)
        ? raw.map((m: any) => {
            const provider = m.provider || 'ollama';
            const providerId = PROVIDER_SETTINGS_MAP[provider] || provider;
            const serverId = m.server_id || m.serverId || 'unknown';
            const serverName = m.server_name || m.serverName || 'Unknown Server';
            const name = m.name || m.id || '';
            return {
              name,
              provider,
              providerId,
              serverName,
              serverId,
            } as ModelInfo;
          })
        : [];

      this.setState({
        models: loadedModels,
        selectedModel: loadedModels.length > 0 ? loadedModels[0] : null,
        isLoadingModels: false
      });

    } catch (error) {
      console.error('Research Assistant: Failed to load models:', error);
      this.setState({
        models: [],
        selectedModel: null,
        isLoadingModels: false
      });
    }
  }

  private handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const { models } = this.state;

    // Find the model by composite key: provider_serverId_name
    const selected = models.find(m => `${m.provider}_${m.serverId}_${m.name}` === value);
    this.setState({ selectedModel: selected || null });
  };

  private handleArticleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ articleText: e.target.value });
  };

  private handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({ selectedProject: e.target.value });
  };

  /**
   * Fetch project context from the Library API
   */
  private async getProjectContext(projectSlug: string): Promise<ProjectContext | null> {
    const { services } = this.props;
    if (!services.api || !projectSlug) return null;

    try {
      const response = await services.api.get(`/api/v1/library/project/${projectSlug}/context`);
      return response as ProjectContext;
    } catch (error) {
      console.error('Failed to load project context:', error);
      return null;
    }
  }

  /**
   * Build the analysis prompt for the LLM
   */
  private buildAnalysisPrompt(articleText: string, projectContext: ProjectContext | null): string {
    let contextSection = '';

    if (projectContext) {
      contextSection = `
## Project Context

**Project:** ${projectContext.project_slug}

### Project Overview (from AGENT.md):
${projectContext.agent_md || 'No AGENT.md found'}

### Project Specification (from spec.md):
${projectContext.spec_md ? projectContext.spec_md.substring(0, 2000) + '...' : 'No spec.md found'}

### Existing Research (from research-findings.md):
${projectContext.research_findings_md ? projectContext.research_findings_md.substring(0, 1000) + '...' : 'No existing research findings'}
`;
    }

    return `You are a research assistant helping to triage articles and resources for relevance to a project.

${contextSection}

## Article to Analyze

${articleText.substring(0, 15000)}

## Your Task

Analyze this article and determine its relevance to the project (if provided) or general usefulness.

Respond in the following JSON format ONLY (no other text):
{
  "recommendation": "integrate" | "save" | "skip",
  "confidence": 0.0-1.0,
  "insights": ["insight 1", "insight 2", "insight 3"],
  "explanation": "2-3 sentence explanation of your recommendation"
}

**Recommendation meanings:**
- "integrate": Highly relevant, should be integrated into the project now
- "save": Potentially useful, save for future reference
- "skip": Not relevant to this project

Be concise but specific in your insights.`;
  }

  /**
   * Parse LLM response into AnalysisResult
   */
  private parseAnalysisResponse(content: string): AnalysisResult | null {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in LLM response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.recommendation || !parsed.insights || !parsed.explanation) {
        console.error('Missing required fields in LLM response');
        return null;
      }

      // Normalize recommendation
      const validRecs = ['integrate', 'save', 'skip'];
      const rec = parsed.recommendation.toLowerCase();

      return {
        recommendation: validRecs.includes(rec) ? rec as 'integrate' | 'save' | 'skip' : 'save',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 5) : [parsed.insights],
        explanation: String(parsed.explanation)
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return null;
    }
  }

  private handleAnalyze = async () => {
    const { articleText, selectedProject } = this.state;
    const { services, config } = this.props;

    if (!articleText.trim()) {
      this.setState({ error: 'Please paste article text to analyze' });
      return;
    }

    if (!services.api) {
      this.setState({ error: 'API service not available' });
      return;
    }

    this.setState({ isLoading: true, error: '', analysisResult: null });

    try {
      // 1. Get project context if a project is selected
      let projectContext: ProjectContext | null = null;
      if (selectedProject) {
        projectContext = await this.getProjectContext(selectedProject);
      }

      // 2. Build the analysis prompt
      const prompt = this.buildAnalysisPrompt(articleText, projectContext);

      // 3. Get AI provider settings from selected model
      const { selectedModel } = this.state;

      if (!selectedModel) {
        throw new Error('No AI model selected. Please select a model from the dropdown.');
      }

      // 4. Call the LLM API
      const response = await services.api.post('/api/v1/ai/providers/chat', {
        provider: selectedModel.provider,
        settings_id: selectedModel.providerId,
        server_id: selectedModel.serverId,
        model: selectedModel.name,
        messages: [
          { role: 'user', content: prompt }
        ],
        user_id: this.currentUserId || 'current',
        stream: false,
        params: {
          temperature: 0.3,
          max_tokens: 2000
        }
      });

      // 5. Extract and parse the response
      const content = response?.choices?.[0]?.message?.content || response?.data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from LLM');
      }

      const analysisResult = this.parseAnalysisResponse(content);

      if (!analysisResult) {
        throw new Error('Failed to parse LLM response');
      }

      this.setState({
        isLoading: false,
        analysisResult
      });

    } catch (error: any) {
      console.error('Analysis failed:', error);
      this.setState({
        isLoading: false,
        error: `Analysis failed: ${error.message || 'Unknown error'}. Check that your AI provider is configured in BrainDrive.`
      });
    }
  };

  /**
   * Format content for saving to Library files
   */
  private formatSaveContent(action: 'integrate' | 'save'): string {
    const { articleText, analysisResult, selectedProject } = this.state;
    const timestamp = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString();

    // Extract a title from the first line of the article (truncated)
    const firstLine = articleText.split('\n')[0].trim();
    const title = firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;

    let content = `\n\n## ${timestamp} ${time} - ${title || 'Untitled Research'}\n\n`;

    if (analysisResult) {
      content += `**Recommendation:** ${analysisResult.recommendation} (${Math.round(analysisResult.confidence * 100)}% confidence)\n\n`;

      content += `**Key Insights:**\n`;
      analysisResult.insights.forEach(insight => {
        content += `- ${insight}\n`;
      });
      content += '\n';

      content += `**Analysis:** ${analysisResult.explanation}\n\n`;
    }

    // Add article excerpt for context
    const articleExcerpt = articleText.length > 500
      ? articleText.substring(0, 500) + '...'
      : articleText;
    content += `<details>\n<summary>Article Excerpt</summary>\n\n${articleExcerpt}\n\n</details>\n`;

    content += `\n---\n`;

    return content;
  }

  private handleAction = async (action: 'integrate' | 'save' | 'dismiss') => {
    const { selectedProject } = this.state;
    const { services } = this.props;

    // Handle dismiss
    if (action === 'dismiss') {
      this.setState({
        articleText: '',
        analysisResult: null,
        chatMessages: [],
        saveSuccess: ''
      });
      return;
    }

    // For integrate/save, we need a project selected
    if (!selectedProject) {
      this.setState({ error: 'Please select a project to save findings to.' });
      return;
    }

    if (!services.api) {
      this.setState({ error: 'API service not available' });
      return;
    }

    this.setState({ isSaving: true, error: '', saveSuccess: '' });

    try {
      const filename = action === 'integrate' ? 'research-findings.md' : 'ideas.md';
      const content = this.formatSaveContent(action);

      const response = await services.api.post('/api/v1/library/append-file', {
        project_slug: selectedProject,
        filename,
        content
      });

      const success = response?.success ?? (response as any)?.data?.success;

      if (success) {
        const actionLabel = action === 'integrate' ? 'research-findings.md' : 'ideas.md';
        this.setState({
          isSaving: false,
          saveSuccess: `Saved to ${selectedProject}/${actionLabel}`,
          // Clear the form after successful save
          articleText: '',
          analysisResult: null,
          chatMessages: []
        });

        // Clear success message after 5 seconds
        setTimeout(() => {
          this.setState({ saveSuccess: '' });
        }, 5000);
      } else {
        throw new Error('Save operation returned unsuccessful');
      }

    } catch (error: any) {
      console.error('Save failed:', error);
      this.setState({
        isSaving: false,
        error: `Failed to save: ${error.message || 'Unknown error'}`
      });
    }
  };

  /**
   * Build the chat system prompt with article and analysis context
   */
  private buildChatSystemPrompt(): string {
    const { articleText, analysisResult, selectedProject } = this.state;

    let systemPrompt = `You are a helpful research assistant. The user has been analyzing an article and may have questions about it.

## Article Being Analyzed

${articleText.substring(0, 10000)}

`;

    if (analysisResult) {
      systemPrompt += `## Previous Analysis

**Recommendation:** ${analysisResult.recommendation}
**Confidence:** ${Math.round(analysisResult.confidence * 100)}%
**Insights:**
${analysisResult.insights.map(i => `- ${i}`).join('\n')}
**Explanation:** ${analysisResult.explanation}

`;
    }

    if (selectedProject) {
      systemPrompt += `**Project Context:** ${selectedProject}\n\n`;
    }

    systemPrompt += `Answer the user's questions about this article concisely and helpfully. Reference specific parts of the article when relevant.`;

    return systemPrompt;
  }

  private handleChatSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const { chatInput, chatMessages, selectedModel } = this.state;
    const { services } = this.props;

    if (!chatInput.trim()) return;

    if (!services.api) {
      this.setState({ error: 'API service not available' });
      return;
    }

    if (!selectedModel) {
      this.setState({ error: 'Please select an AI model' });
      return;
    }

    // Add user message immediately
    const userMessage = { role: 'user' as const, content: chatInput };
    const updatedMessages = [...chatMessages, userMessage];

    this.setState({
      chatMessages: updatedMessages,
      chatInput: '',
      isChatLoading: true
    });

    try {
      // Build messages for LLM
      const systemPrompt = this.buildChatSystemPrompt();

      // Convert chat history to LLM format
      const llmMessages = [
        { role: 'system', content: systemPrompt },
        ...updatedMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      ];

      // Call LLM
      const response = await services.api.post('/api/v1/ai/providers/chat', {
        provider: selectedModel.provider,
        settings_id: selectedModel.providerId,
        server_id: selectedModel.serverId,
        model: selectedModel.name,
        messages: llmMessages,
        user_id: this.currentUserId || 'current',
        stream: false,
        params: {
          temperature: 0.5,
          max_tokens: 500
        }
      });

      // Extract response
      const content = response?.choices?.[0]?.message?.content
        || response?.data?.choices?.[0]?.message?.content
        || 'Sorry, I could not generate a response.';

      // Add assistant message
      this.setState({
        chatMessages: [...updatedMessages, { role: 'assistant' as const, content }],
        isChatLoading: false
      });

    } catch (error: any) {
      console.error('Chat failed:', error);
      this.setState({
        chatMessages: [
          ...updatedMessages,
          { role: 'assistant' as const, content: `Error: ${error.message || 'Failed to get response'}` }
        ],
        isChatLoading: false
      });
    }
  };

  private renderArticleInput(): JSX.Element {
    const { articleText } = this.state;
    const charCount = articleText.length;

    return (
      <div className="ra-section ra-article-input">
        <h4>Article Text</h4>
        <textarea
          value={articleText}
          onChange={this.handleArticleChange}
          placeholder="Paste article text here..."
          rows={10}
        />
        <div className="ra-char-count">
          {charCount.toLocaleString()} characters
          {charCount > 50000 && <span className="ra-warning"> (large article - may be truncated)</span>}
        </div>
      </div>
    );
  }

  private renderProjectSelector(): JSX.Element {
    const { selectedProject, projects } = this.state;

    return (
      <div className="ra-section ra-project-selector">
        <h4>Project Context (Optional)</h4>
        <select value={selectedProject} onChange={this.handleProjectChange}>
          <option value="">-- No project selected --</option>
          {projects.map(p => (
            <option key={p.slug} value={p.slug}>{p.name}</option>
          ))}
        </select>
      </div>
    );
  }

  private renderModelSelector(): JSX.Element {
    const { models, selectedModel, isLoadingModels } = this.state;

    const selectedValue = selectedModel
      ? `${selectedModel.provider}_${selectedModel.serverId}_${selectedModel.name}`
      : '';

    return (
      <div className="ra-section ra-model-selector">
        <h4>AI Model</h4>
        {isLoadingModels ? (
          <select disabled>
            <option>Loading models...</option>
          </select>
        ) : models.length === 0 ? (
          <select disabled>
            <option>No models available</option>
          </select>
        ) : (
          <select value={selectedValue} onChange={this.handleModelChange}>
            {models.map(m => {
              const value = `${m.provider}_${m.serverId}_${m.name}`;
              const label = `${m.name} (${m.serverName})`;
              return (
                <option key={value} value={value}>{label}</option>
              );
            })}
          </select>
        )}
      </div>
    );
  }

  private renderAnalyzeButton(): JSX.Element {
    const { isLoading, articleText } = this.state;

    return (
      <div className="ra-section ra-analyze">
        <button
          onClick={this.handleAnalyze}
          disabled={isLoading || !articleText.trim()}
          className="ra-button ra-button-primary"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Article'}
        </button>
      </div>
    );
  }

  private renderAnalysisResult(): JSX.Element | null {
    const { analysisResult } = this.state;
    if (!analysisResult) return null;

    const recommendationLabels = {
      integrate: 'Integrate Now',
      save: 'Save for Future',
      skip: 'Not Relevant'
    };

    const recommendationColors = {
      integrate: 'ra-rec-integrate',
      save: 'ra-rec-save',
      skip: 'ra-rec-skip'
    };

    return (
      <div className="ra-section ra-analysis-result">
        <h4>Analysis Result</h4>

        <div className={`ra-recommendation ${recommendationColors[analysisResult.recommendation]}`}>
          <span className="ra-rec-label">Recommendation:</span>
          <span className="ra-rec-value">{recommendationLabels[analysisResult.recommendation]}</span>
          <span className="ra-rec-confidence">({Math.round(analysisResult.confidence * 100)}% confidence)</span>
        </div>

        <div className="ra-insights">
          <h5>Key Insights:</h5>
          <ul>
            {analysisResult.insights.map((insight, i) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        </div>

        <div className="ra-explanation">
          <h5>Explanation:</h5>
          <p>{analysisResult.explanation}</p>
        </div>

        <div className="ra-actions">
          <button
            className="ra-button ra-button-success"
            onClick={() => this.handleAction('integrate')}
            disabled={this.state.isSaving}
          >
            {this.state.isSaving ? 'Saving...' : 'Integrate Now'}
          </button>
          <button
            className="ra-button ra-button-secondary"
            onClick={() => this.handleAction('save')}
            disabled={this.state.isSaving}
          >
            {this.state.isSaving ? 'Saving...' : 'Save for Future'}
          </button>
          <button
            className="ra-button ra-button-muted"
            onClick={() => this.handleAction('dismiss')}
            disabled={this.state.isSaving}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  private renderChat(): JSX.Element | null {
    const { analysisResult, chatMessages, chatInput, isChatLoading } = this.state;
    if (!analysisResult) return null;

    return (
      <div className="ra-section ra-chat">
        <h4>Ask Questions About This Article</h4>

        <div className="ra-chat-messages">
          {chatMessages.length === 0 && !isChatLoading && (
            <p className="ra-chat-empty">Ask a question about the article...</p>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`ra-chat-message ra-chat-${msg.role}`}>
              <span className="ra-chat-role">{msg.role === 'user' ? 'You' : 'Assistant'}:</span>
              <span className="ra-chat-content">{msg.content}</span>
            </div>
          ))}
          {isChatLoading && (
            <div className="ra-chat-message ra-chat-assistant">
              <span className="ra-chat-role">Assistant:</span>
              <span className="ra-chat-content ra-chat-loading">Thinking...</span>
            </div>
          )}
        </div>

        <div className="ra-chat-form">
          <textarea
            className="ra-chat-input"
            value={chatInput}
            onChange={(e) => this.setState({ chatInput: e.target.value })}
            placeholder="Type your question..."
            disabled={isChatLoading}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleChatSubmit(e);
              }
            }}
          />
          <button
            type="button"
            className="ra-button ra-button-primary"
            disabled={isChatLoading || !chatInput.trim()}
            onClick={(e) => this.handleChatSubmit(e)}
          >
            {isChatLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    );
  }

  render(): JSX.Element {
    const { currentTheme, error } = this.state;

    return (
      <ErrorBoundary>
        <div className={`research-assistant ${currentTheme === 'dark' ? 'dark-theme' : ''}`}>
          <div className="ra-header">
            <h3>Research Assistant</h3>
            <p>Analyze articles for relevance to your projects</p>
          </div>

          {error && (
            <div className="ra-error">
              {error}
              <button onClick={() => this.setState({ error: '' })}>Dismiss</button>
            </div>
          )}

          {this.state.saveSuccess && (
            <div className="ra-success">
              {this.state.saveSuccess}
              <button onClick={() => this.setState({ saveSuccess: '' })}>Dismiss</button>
            </div>
          )}

          {this.renderArticleInput()}
          {this.renderProjectSelector()}
          {this.renderModelSelector()}
          {this.renderAnalyzeButton()}
          {this.renderAnalysisResult()}
          {this.renderChat()}
        </div>
      </ErrorBoundary>
    );
  }
}

export default ResearchAssistant;

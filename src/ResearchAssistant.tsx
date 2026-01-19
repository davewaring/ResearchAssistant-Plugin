import React from 'react';
import './ResearchAssistant.css';
import { ResearchAssistantProps, ResearchAssistantState } from './types';
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
      // Analysis results
      analysisResult: null,
      // Chat
      chatMessages: [],
      chatInput: ''
    };
  }

  async componentDidMount() {
    await this.initializeServices();
    await this.loadProjects();
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
  }

  private cleanupServices(): void {
    const { services } = this.props;
    if (services.theme && this.themeChangeListener) {
      services.theme.removeThemeChangeListener(this.themeChangeListener);
    }
  }

  private async loadProjects(): Promise<void> {
    // TODO: Phase 2 - Load projects from BrainDrive-Library
    // For now, use placeholder projects
    this.setState({
      projects: [
        { slug: 'davew-plugin', name: 'DaveW Plugin (this project)' },
        { slug: 'scout', name: 'Scout' },
        { slug: 'rag-system', name: 'RAG System' },
        { slug: 'security-audit', name: 'Security Audit' }
      ]
    });
  }

  private handleArticleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ articleText: e.target.value });
  };

  private handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({ selectedProject: e.target.value });
  };

  private handleAnalyze = async () => {
    const { articleText, selectedProject } = this.state;

    if (!articleText.trim()) {
      this.setState({ error: 'Please paste article text to analyze' });
      return;
    }

    this.setState({ isLoading: true, error: '', analysisResult: null });

    // TODO: Phase 2 - Implement actual LLM analysis
    // For now, show mock result
    setTimeout(() => {
      this.setState({
        isLoading: false,
        analysisResult: {
          recommendation: 'integrate',
          confidence: 0.85,
          insights: [
            'Article discusses plugin architecture patterns relevant to current development',
            'Contains examples of service bridge integration',
            'References React component patterns used in BrainDrive'
          ],
          explanation: 'This article is highly relevant to the plugin development project. It covers patterns and practices that could improve the Research Assistant implementation.'
        }
      });
    }, 1500);
  };

  private handleAction = (action: 'integrate' | 'save' | 'dismiss') => {
    // TODO: Phase 3 - Implement save to Library
    console.log('Action:', action, 'Project:', this.state.selectedProject);

    if (action === 'dismiss') {
      this.setState({
        articleText: '',
        analysisResult: null,
        chatMessages: []
      });
    } else {
      alert(`[Phase 3] Would ${action === 'integrate' ? 'add to research-findings.md' : 'add to ideas.md'}`);
    }
  };

  private handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { chatInput, chatMessages } = this.state;

    if (!chatInput.trim()) return;

    // TODO: Phase 3 - Implement actual chat with LLM
    const newMessages = [
      ...chatMessages,
      { role: 'user' as const, content: chatInput },
      { role: 'assistant' as const, content: '[Phase 3] Chat functionality will be implemented here. Your question: ' + chatInput }
    ];

    this.setState({
      chatMessages: newMessages,
      chatInput: ''
    });
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
          >
            Integrate Now
          </button>
          <button
            className="ra-button ra-button-secondary"
            onClick={() => this.handleAction('save')}
          >
            Save for Future
          </button>
          <button
            className="ra-button ra-button-muted"
            onClick={() => this.handleAction('dismiss')}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  private renderChat(): JSX.Element | null {
    const { analysisResult, chatMessages, chatInput } = this.state;
    if (!analysisResult) return null;

    return (
      <div className="ra-section ra-chat">
        <h4>Ask Questions About This Article</h4>

        <div className="ra-chat-messages">
          {chatMessages.length === 0 && (
            <p className="ra-chat-empty">Ask a question about the article...</p>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`ra-chat-message ra-chat-${msg.role}`}>
              <span className="ra-chat-role">{msg.role === 'user' ? 'You' : 'Assistant'}:</span>
              <span className="ra-chat-content">{msg.content}</span>
            </div>
          ))}
        </div>

        <form onSubmit={this.handleChatSubmit} className="ra-chat-form">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => this.setState({ chatInput: e.target.value })}
            placeholder="Type your question..."
          />
          <button type="submit" className="ra-button ra-button-primary">
            Send
          </button>
        </form>
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

          {this.renderArticleInput()}
          {this.renderProjectSelector()}
          {this.renderAnalyzeButton()}
          {this.renderAnalysisResult()}
          {this.renderChat()}
        </div>
      </ErrorBoundary>
    );
  }
}

export default ResearchAssistant;

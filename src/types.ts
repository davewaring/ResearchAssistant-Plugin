// TEMPLATE: Core type definitions for BrainDrive plugins
// TODO: Customize these types based on your plugin's specific needs

// Service interfaces - these match the BrainDrive service contracts
export interface ApiService {
  get: (url: string, options?: any) => Promise<ApiResponse>;
  post: (url: string, data: any, options?: any) => Promise<ApiResponse>;
  put: (url: string, data: any, options?: any) => Promise<ApiResponse>;
  delete: (url: string, options?: any) => Promise<ApiResponse>;
  postStreaming?: (url: string, data: any, onChunk: (chunk: string) => void, options?: any) => Promise<ApiResponse>;
}

export interface EventService {
  sendMessage: (target: string, message: any, options?: any) => void;
  subscribeToMessages: (target: string, callback: (message: any) => void) => void;
  unsubscribeFromMessages: (target: string, callback: (message: any) => void) => void;
}

export interface ThemeService {
  getCurrentTheme: () => string;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
  addThemeChangeListener: (callback: (theme: string) => void) => void;
  removeThemeChangeListener: (callback: (theme: string) => void) => void;
}

export interface SettingsService {
  get: (key: string) => any;
  set: (key: string, value: any) => Promise<void>;
  getSetting?: (id: string) => Promise<any>;
  setSetting?: (id: string, value: any) => Promise<any>;
  getSettingDefinitions?: () => Promise<any>;
}

export interface PageContextService {
  getCurrentPageContext(): {
    pageId: string;
    pageName: string;
    pageRoute: string;
    isStudioPage: boolean;
  } | null;
  onPageContextChange(callback: (context: any) => void): () => void;
}

// Services container
export interface Services {
  api?: ApiService;
  event?: EventService;
  theme?: ThemeService;
  settings?: SettingsService;
  pageContext?: PageContextService;
}

// API Response interface
export interface ApiResponse {
  data?: any;
  status?: number;
  id?: string;
  [key: string]: any;
}

// Research Assistant Plugin Types

export interface ResearchAssistantProps {
  moduleId?: string;
  pluginId?: string;
  instanceId?: string;
  services: Services;
  title?: string;
  description?: string;
  config?: ResearchAssistantConfig;
}

export interface ResearchAssistantState {
  isLoading: boolean;
  error: string;
  currentTheme: string;
  isInitializing: boolean;
  // Article input
  articleText: string;
  // Project selection
  selectedProject: string;
  projects: Project[];
  // Model selection
  models: ModelInfo[];
  selectedModel: ModelInfo | null;
  isLoadingModels: boolean;
  // Analysis results
  analysisResult: AnalysisResult | null;
  // Chat
  chatMessages: ChatMessage[];
  chatInput: string;
  isChatLoading: boolean;
  // Save status
  saveSuccess: string;
  isSaving: boolean;
}

export interface ResearchAssistantConfig {
  libraryPath?: string;
  // AI Provider settings
  aiProvider?: string;       // e.g., 'openrouter', 'ollama', 'openai'
  aiSettingsId?: string;     // e.g., 'openrouter_settings'
  aiServerId?: string;       // e.g., 'default'
  aiModel?: string;          // e.g., 'anthropic/claude-3-haiku'
}

export interface ProjectContext {
  project_slug: string;
  agent_md: string;
  spec_md: string;
  build_plan_md: string;
  research_findings_md: string;
}

export interface ModelInfo {
  name: string;
  provider: string;
  providerId: string;
  serverName: string;
  serverId: string;
}

export interface Project {
  slug: string;
  name: string;
  path?: string;
  has_agent_md?: boolean;
  has_spec_md?: boolean;
  has_build_plan?: boolean;
  status?: string;
}

export interface AnalysisResult {
  recommendation: 'integrate' | 'save' | 'skip';
  confidence: number;
  insights: string[];
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Legacy exports for compatibility
export interface PluginTemplateProps extends ResearchAssistantProps {}
export interface PluginTemplateState {
  isLoading: boolean;
  error: string;
  currentTheme: string;
  isInitializing: boolean;
  data: any;
  lastError: Error | null;
  retryAvailable: boolean;
}
export interface PluginConfig extends ResearchAssistantConfig {}
export interface PluginData {
  id: string;
  name: string;
  value: any;
  timestamp: string;
}
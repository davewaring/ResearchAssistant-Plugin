# Research Assistant Plugin

A BrainDrive plugin that helps triage articles and resources for relevance to your active projects. Paste article text, select a project, and get AI-powered recommendations on whether to integrate findings now, save for later, or skip.

## Features

- **AI-Powered Analysis** - Analyzes articles against your project context using your configured LLM
- **Smart Recommendations** - Get clear recommendations: Integrate Now, Save for Later, or Skip
- **Key Insights Extraction** - Automatically extracts 3-5 key insights from each article
- **One-Click Save** - Save relevant findings directly to your BrainDrive Library
- **Follow-Up Chat** - Ask questions about the article with full context
- **Theme Support** - Full light and dark mode support matching BrainDrive's design

## Requirements

- [BrainDrive](https://github.com/BrainDriveAI/BrainDrive) installed locally
- BrainDrive-Library set up at `~/BrainDrive-Library`
- At least one AI model configured in BrainDrive

## Installation

### Option 1: Build from Source

1. Clone this repository:
   ```bash
   git clone https://github.com/davewaring/ResearchAssistant-Plugin.git
   cd ResearchAssistant-Plugin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

   This automatically outputs to your BrainDrive plugins folder (`~/BrainDrive/plugins/research-assistant/`).

4. Restart BrainDrive or refresh the plugins list.

### Option 2: Copy Pre-built Plugin

Copy the `dist/` folder contents to `~/BrainDrive/plugins/research-assistant/`.

## Usage

### Basic Workflow

1. **Open the Plugin** - Find "Research Assistant" in your BrainDrive plugin panel

2. **Paste Article Content** - Copy the text from any article, blog post, or documentation and paste it into the text area

3. **Select a Project** - Choose which project to evaluate the article against from the dropdown

4. **Choose an AI Model** - Select which configured model to use for analysis

5. **Click Analyze** - The AI will analyze the article and provide:
   - A recommendation (Integrate Now / Save for Later / Skip)
   - Key insights extracted from the article
   - An explanation of why it's relevant or not

6. **Take Action**:
   - **Integrate Now** - Saves insights to `research-findings.md` in your project folder
   - **Save for Future** - Saves to `ideas.md` for later consideration
   - **Dismiss** - Clears the analysis and resets for a new article

7. **Ask Follow-Up Questions** - Use the chat interface to ask questions about the article

### Tips

- For best results, include the full article text rather than just excerpts
- The AI uses your project's `spec.md`, `build-plan.md`, and other context files to understand relevance
- Very long articles (50,000+ characters) may be truncated to fit LLM context limits
- "Thinking" models (like qwen3) work well but may take longer to respond

## Project Structure

```
ResearchAssistant-Plugin/
├── src/
│   ├── ResearchAssistant.tsx    # Main React component
│   ├── ResearchAssistant.css    # Styles (light/dark theme)
│   └── types.ts                 # TypeScript interfaces
├── webpack.config.js            # Build configuration
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
```

## Development

### Build Commands

```bash
# Production build
npm run build

# Development build with watch mode
npm run dev

# Clean build artifacts
npm run clean
```

### Customizing the Output Path

Edit `webpack.config.js` to change where the plugin builds to:

```javascript
output: {
  path: path.resolve(os.homedir(), 'BrainDrive/plugins/research-assistant'),
  // ...
}
```

## How It Works

1. **Project Loading** - Fetches active projects from `~/BrainDrive-Library/projects/active/`

2. **Context Building** - Reads project files (spec.md, build-plan.md, decisions.md, research-findings.md) to understand what the project is about

3. **LLM Analysis** - Sends the article text and project context to your configured AI model with a structured prompt

4. **Recommendation** - Parses the AI response to extract recommendation, insights, and explanation

5. **Saving** - Appends formatted findings to the appropriate Library file with timestamp and source context

## Configuration

No additional configuration required. The plugin uses:
- Your BrainDrive's configured AI models
- Your BrainDrive-Library for project context and saving
- BrainDrive's authentication for API access

## Roadmap

### Current (v1.0)
- [x] Text paste input
- [x] Project selection
- [x] AI analysis with recommendations
- [x] Save to Library
- [x] Follow-up chat
- [x] Light/dark theme support

### Future (v2)
- [ ] PDF upload with text extraction
- [ ] URL input with automatic content fetching
- [ ] Multi-project tagging
- [ ] Improved error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See [LICENSE](LICENSE) for details.

## Support

- [BrainDrive Documentation](https://docs.braindrive.ai)
- [Community Forum](https://community.braindrive.ai)

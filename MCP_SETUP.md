# Model Context Protocol (MCP) Setup

This document explains the MCP (Model Context Protocol) configuration for your project and how to set up API keys for the various servers.

## What is MCP?

MCP is an open standard that allows AI assistants like Claude, Cursor, and others to securely connect to external data sources and tools. It provides a standardized way for AI models to access:

- File systems
- Databases  
- Web search
- APIs and services
- Version control systems
- And much more

## Configured MCP Servers

Your project now includes the following MCP servers:

### 1. Task Master AI (`taskmaster-ai`)
- **Purpose**: Advanced task management and project planning
- **Capabilities**: Create tasks, manage projects, generate PRDs, analyze complexity
- **API Keys Required**: Multiple AI providers (Anthropic, OpenAI, Google, etc.)

### 2. Filesystem (`filesystem`)
- **Purpose**: File and directory operations
- **Capabilities**: Read, write, search files and directories
- **API Keys Required**: None (local access)
- **Scope**: Limited to your project directory for security

### 3. Brave Search (`brave-search`)
- **Purpose**: Web search capabilities
- **Capabilities**: Search the web, get real-time information
- **API Keys Required**: Brave Search API key

### 4. GitHub (`github`)
- **Purpose**: GitHub repository management
- **Capabilities**: Manage repos, issues, PRs, releases
- **API Keys Required**: GitHub Personal Access Token

### 5. SQLite (`sqlite`)
- **Purpose**: Database operations
- **Capabilities**: Query and manage SQLite databases
- **API Keys Required**: None (local database access)
- **Database Path**: `./data` directory

### 6. Fetch (`fetch`)
- **Purpose**: Web content fetching
- **Capabilities**: Fetch and process web pages
- **API Keys Required**: None

## Configuration Files

Your MCP servers are configured in multiple files for different AI tools:

- `cline.mcp.json` - For Cline/Claude integration
- `.cursor/mcp.json` - For Cursor IDE integration  
- `.gemini/settings.json` - For Gemini integration

## Setting Up API Keys

### Required API Keys

1. **Brave Search API Key**
   - Get it from: https://api.search.brave.com/
   - Free tier available with 2,000 queries/month
   - Replace `""` with your key in the `BRAVE_API_KEY` field

2. **GitHub Personal Access Token**
   - Create at: https://github.com/settings/tokens
   - Permissions needed: `repo`, `read:user`, `read:org`
   - Replace `""` with your token in the `GITHUB_PERSONAL_ACCESS_TOKEN` field

3. **Task Master AI Keys** (Optional but recommended)
   - **Anthropic API Key**: https://console.anthropic.com/
   - **OpenAI API Key**: https://platform.openai.com/api-keys
   - **Google API Key**: https://makersuite.google.com/app/apikey
   - **Perplexity API Key**: https://www.perplexity.ai/settings/api

### How to Add API Keys

1. **For Cline**: Edit `cline.mcp.json`
2. **For Cursor**: Edit `.cursor/mcp.json`  
3. **For Gemini**: Edit `.gemini/settings.json`

Replace the empty strings (`""`) with your actual API keys:

```json
"env": {
  "BRAVE_API_KEY": "your-actual-brave-api-key-here",
  "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-token-here"
}
```

## Testing Your Setup

After adding API keys, restart your AI assistant and test the MCP servers:

1. **Test Filesystem**: Ask to list files in your project
2. **Test Web Search**: Ask to search for recent news
3. **Test GitHub**: Ask about your repositories
4. **Test Task Master**: Ask to create a simple task

## Security Notes

- API keys are stored locally in configuration files
- The filesystem server is restricted to your project directory
- Never commit API keys to version control
- Consider using environment variables for sensitive keys

## Troubleshooting

### Common Issues

1. **Server not connecting**: Check API key format and validity
2. **Permission errors**: Ensure GitHub token has correct permissions
3. **File access issues**: Verify filesystem server path is correct

### Getting Help

- Check the MCP documentation: https://modelcontextprotocol.io/
- Review server-specific documentation on GitHub
- Test individual servers using MCP debugging tools

## Next Steps

1. Add your API keys to the configuration files
2. Restart your AI assistant
3. Test each MCP server functionality
4. Explore additional MCP servers from the awesome-mcp-servers list
5. Consider creating custom MCP servers for your specific needs

<!-- Powered by BMAD™ Core -->

# MCP Best Practices for Domain Knowledge & Multi-Agent Systems

## Executive Summary

When building MCP (Model Context Protocol) servers that store domain knowledge, **use specialized sub-agents with exclusive MCP access** rather than giving all agents access to all MCPs. This approach:

- ✅ Preserves main agent context (reduces token usage by ~4x)
- ✅ Improves output quality through specialized prompts
- ✅ Prevents "game of telephone" information loss
- ✅ Enables better separation of concerns

**Key Pattern:** Main Agent → Spawns Specialist Sub-Agent → Queries Domain MCP → Writes to Filesystem → Returns Compressed Summary

---

## Core Architecture Pattern

### Recommended: Specialist Sub-Agent with Exclusive MCP Access

```
Main Agent (Coordinator)
    ↓
    Detects domain question
    ↓
    Spawns → Domain Specialist Sub-Agent
                ↓
                Has exclusive access to → Domain Knowledge MCP Server
                ↓
                Queries MCP → Processes → Compresses
                ↓
                Writes detailed output → .bmad-state/domain-insights.json
                ↓
                Returns → 3-sentence summary to Main Agent
```

### Why This Works

1. **Context Preservation**: Main agent doesn't burn tokens on raw domain data
2. **Token Efficiency**: Anthropic research shows ~4x reduction in token usage
3. **Better Results**: Specialist prompts tuned for domain produce higher quality
4. **Information Fidelity**: Filesystem artifacts prevent information loss
5. **Separation of Concerns**: Each agent has clear, focused responsibility

---

## Key Principles from Anthropic Research

### 1. Subagent Output to Filesystem (Critical!)

> "Subagent output to a filesystem to minimize the 'game of telephone.' Direct subagent outputs can bypass the main coordinator for certain types of results, improving both fidelity and performance."
> — Anthropic Engineering Blog

**Implementation Pattern:**

```typescript
// Specialist sub-agent with domain MCP access
const domainSpecialist = {
  mcpServers: ['domain-knowledge-server'], // Exclusive access
  
  async query(question: string) {
    // 1. Query domain knowledge MCP
    const rawKnowledge = await mcp.query(question)
    
    // 2. Process and compress
    const insights = this.synthesize(rawKnowledge)
    
    // 3. Write to filesystem (not back through coordinator!)
    await fs.writeFile('.bmad-state/domain-insights.json', insights)
    
    // 4. Return lightweight reference
    return {
      type: 'domain-analysis-complete',
      artifactPath: '.bmad-state/domain-insights.json',
      summary: '3-sentence summary here'
    }
  }
}
```

**Benefits:**
- Prevents information loss during multi-stage processing
- Reduces token overhead from copying large outputs
- Main agent gets compressed summary, can read full details if needed
- Enables async processing and caching

### 2. Tool Design is Critical

> "Agent-tool interfaces are as critical as human-computer interfaces. Bad tool descriptions can send agents down completely wrong paths."
> — Anthropic Engineering Blog

**Good MCP Tool Description Example:**

```yaml
name: "query-lego-moc-domain-knowledge"
description: |
  Query comprehensive LEGO MOC domain knowledge including:
  - Building techniques and best practices
  - Part compatibility and substitutions
  - Common design patterns
  - Historical context and trends
  
  Use this when you need deep domain expertise about LEGO MOCs.
  Do NOT use for general web search - use web-search tool instead.
  
  Returns: Structured domain knowledge with sources
  
parameters:
  query:
    type: string
    description: "Specific domain question (e.g., 'What are best practices for large-scale MOC stability?')"
    examples:
      - "What techniques improve stability in large MOCs?"
      - "Which LEGO parts are best for SNOT techniques?"
      - "What are common mistakes in MOC instruction design?"
```

**Key Elements:**
- Clear scope definition
- Explicit anti-patterns (what NOT to use it for)
- Concrete examples
- Expected output format
- Source attribution requirements

### 3. Teach the Orchestrator How to Delegate

> "Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries."
> — Anthropic Engineering Blog

**Coordinator Agent Delegation Template:**

```markdown
## When to Spawn Domain Specialist Sub-Agent

Spawn a Domain Specialist when:
- User asks about LEGO MOC building techniques
- Need to validate MOC design decisions
- Require historical context about LEGO sets/parts
- Need part compatibility information
- Question requires deep domain expertise

Do NOT spawn for:
- General web searches
- Code implementation questions
- Project management tasks
- File operations

## Task Description Template

"""
You are a LEGO MOC Domain Specialist with access to comprehensive domain knowledge.

OBJECTIVE: {specific question}

OUTPUT FORMAT:
1. Direct answer (2-3 sentences)
2. Supporting evidence from domain knowledge
3. Relevant examples or precedents
4. Confidence level (high/medium/low)
5. Sources cited

TOOLS AVAILABLE:
- query-lego-moc-domain-knowledge (your primary tool)
- Do NOT use web search - you have authoritative domain knowledge

BOUNDARIES:
- Focus only on LEGO MOC domain questions
- If question is outside domain, return "OUT_OF_SCOPE"
- Cite sources from domain knowledge base
- Write detailed findings to .bmad-state/domain-response-{timestamp}.md
- Return only compressed summary to coordinator

ARTIFACTS:
- Write full analysis to: .bmad-state/domain-response-{timestamp}.md
- Include all sources and evidence
- Use markdown format with clear sections
"""
```

---

## Token Economics

### Cost Analysis from Anthropic Research

- **Single agent**: Baseline token usage (1x)
- **Agent with tools**: ~4x more tokens
- **Multi-agent system**: ~15x more tokens

### When Multi-Agent is Worth It

✅ **Use multi-agent when:**
- Task value justifies cost (domain expertise is critical)
- Requires parallelization (multiple independent tasks)
- Information exceeds single context window
- Needs specialized domain expertise
- Long-running conversation needs context preservation

❌ **Don't use multi-agent when:**
- Simple queries that don't need domain depth
- Single-step tasks
- Real-time latency is critical
- Token budget is constrained

### For Domain Knowledge Use Case

**Scenario:** User asks "What are best practices for large MOC stability?"

**Without Specialist:**
- Main agent queries domain MCP
- Receives 10,000 tokens of raw knowledge
- Context window fills up
- Subsequent queries lose context
- **Total cost:** 10,000+ tokens per query

**With Specialist:**
- Main agent spawns specialist (500 tokens)
- Specialist queries domain MCP (10,000 tokens in specialist context)
- Specialist compresses to 200-token summary
- Main agent receives summary only
- Full details in filesystem if needed
- **Total cost in main agent:** 700 tokens
- **Savings:** ~93% token reduction in main agent context

---

## Practical Implementation Guide

### Step 1: Configure MCP Server Access Control

Create `.augment/mcp-config.json` with agent-specific access:

```json
{
  "mcpServers": {
    "lego-moc-knowledge": {
      "command": "node",
      "args": ["./mcp-servers/lego-knowledge/index.js"],
      "allowedAgents": ["domain-specialist"],
      "env": {
        "KNOWLEDGE_BASE_PATH": "./knowledge-base/lego-mocs",
        "CACHE_ENABLED": "true",
        "CACHE_TTL": "3600"
      }
    },
    "general-tools": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "allowedAgents": ["*"]
    }
  }
}
```

**Key Points:**
- `allowedAgents: ["domain-specialist"]` - Only specialist can access domain MCP
- `allowedAgents: ["*"]` - All agents can access general tools
- Environment variables configure MCP behavior

### Step 2: Create Domain Specialist Agent Definition

Create `.bmad-core/agents/specialists/domain-expert.md`:

```markdown
# Domain Expert Specialist

## Purpose
Provides deep LEGO MOC domain knowledge using exclusive access to domain knowledge MCP server.

## MCP Access
- `lego-moc-knowledge-server` (exclusive access)
- `filesystem` (for writing artifacts)

## Capabilities
- Answer domain-specific questions about LEGO MOCs
- Validate design decisions against best practices
- Provide historical context and precedents
- Suggest part alternatives and substitutions

## Output Format
- Summary: 2-4 sentences (< 200 tokens)
- Artifact: Full analysis in `.bmad-state/domain-response-{timestamp}.md`
- Confidence: high|medium|low
- Sources: Cited from knowledge base
```

### Step 3: Implement Coordinator Delegation Logic

```typescript
function isDomainQuestion(query: string): boolean {
  const domainKeywords = ['lego', 'moc', 'building technique', 'stability']
  return domainKeywords.some(kw => query.toLowerCase().includes(kw))
}

async function handleUserQuery(query: string) {
  if (isDomainQuestion(query)) {
    const specialist = await spawnSubAgent({
      type: 'domain-specialist',
      mcpServers: ['lego-moc-knowledge'],
      task: { question: query, outputPath: `.bmad-state/domain-${Date.now()}.md` }
    })
    return await specialist.complete() // Returns compressed summary
  }
  return await this.handleDirectly(query)
}
```

---

## Best Practices Summary

### ✅ DO

1. **Create specialist sub-agents with exclusive MCP access**
   - Prevents context pollution in main agent
   - Enables specialized prompts for better results

2. **Have specialist write detailed output to filesystem**
   - Prevents "game of telephone" information loss
   - Main agent can read full details if needed

3. **Return compressed summary to main agent**
   - Preserves main agent context window
   - Reduces token usage by ~4x

4. **Use clear tool descriptions and task boundaries**
   - Prevents agents from using wrong tools
   - Improves delegation decisions

5. **Monitor token usage and adjust compression**
   - Track costs per query type
   - Optimize summary length

### ❌ DON'T

1. **Give all agents access to all MCPs**
   - Causes context pollution
   - Increases token usage unnecessarily

2. **Pass large domain knowledge through coordinator**
   - Creates "game of telephone" effect
   - Wastes tokens copying data

3. **Use domain MCP for general questions**
   - Wrong tool for the job
   - Wastes specialized resources

4. **Skip the filesystem artifact pattern**
   - Loses detailed information
   - Forces re-querying for details

5. **Ignore token economics**
   - Multi-agent can be 15x more expensive
   - Need to justify cost with value

---

## Integration with BMAD Architecture

This integrates with your existing sub-agent patterns:

### Existing Patterns
- **Coordinator-Worker**: Main agent = Coordinator, Domain specialist = Worker
- **Specialist Swarm**: Multiple specialists with different MCP access
- **Message Storage**: Follows `.bmad-state/messages/` conventions

### New Additions
- **MCP Access Control**: `allowedAgents` field in config
- **Artifact Pattern**: `.bmad-state/domain-insights/` directory
- **Token Tracking**: Monitor per-specialist costs

---

## References

### Anthropic Research
- **Article**: "How we built our multi-agent research system"
- **Key Findings**: Filesystem artifacts, tool design critical, 15x token cost justified for complex tasks

### BMAD Architecture
- `.bmad-core/data/sub-agent-architecture.md`
- `.bmad-core/data/sub-agent-usage-guide.md`

---

## Next Steps

1. **Identify domain knowledge sources** - What to store in MCP?
2. **Build or configure MCP server** - Custom or existing?
3. **Create domain specialist agent** - Define persona and capabilities
4. **Test and optimize** - Monitor tokens and quality
5. **Scale to multiple specialists** - Security, performance, etc.

---

**Document Version**: 1.0
**Last Updated**: 2025-12-21
**Author**: BMAD Agent (based on Anthropic research)



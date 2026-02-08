# MCP Tools Reference

This document describes the MCP (Model Context Protocol) tools available for agents and commands.

## Quick Reference

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **Context7** | Library documentation | API syntax, code examples |
| **Perplexity** | Web search & research | Comparisons, troubleshooting |
| **Playwright MCP** | Browser automation | E2E testing, form filling, screenshots |
| **Chrome DevTools** | Browser debugging | Performance, network, DOM inspection |
| **PostgreSQL MCP** | Database operations | Queries, schema, optimization |
| **kb_search** | Project knowledge | Past decisions, patterns |

---

## Documentation Tools

### Context7

**Purpose:** Fetch up-to-date, version-specific library documentation and code examples.

**When to use:**
- Looking up current API syntax for libraries (React 19, Vitest, Playwright, etc.)
- Getting accurate code examples for specific framework versions
- Verifying correct usage of library functions

**How to invoke:**
Add `use context7` to your query when you need current documentation:

```
How do I use useState in React 19? use context7
```

```
Show me Playwright locator examples. use context7
```

**Best for:**
| Use Case | Example |
|----------|---------|
| Framework APIs | React hooks, Tailwind classes, Zod schemas |
| Testing syntax | Vitest matchers, Playwright selectors |
| Library patterns | shadcn/ui components, Framer Motion |
| Version-specific features | React 19 server components |

---

### Perplexity

**Purpose:** Web search with AI reasoning for research, troubleshooting, and comparisons.

**When to use:**
- Researching best practices or comparing approaches
- Debugging obscure errors (searches GitHub issues, Stack Overflow)
- Understanding recent changes or announcements
- Getting opinions or recommendations

**Available tools:**
| Tool | Purpose |
|------|---------|
| `perplexity_ask` | Web search with Sonar Pro model |
| `perplexity_reason` | Advanced reasoning for complex problems |
| `perplexity_research` | Deep research on comprehensive topics |

**Best for:**
| Use Case | Example |
|----------|---------|
| Comparisons | "Zod vs Yup vs TypeBox performance" |
| Troubleshooting | "Why is my Playwright test flaky?" |
| Best practices | "How do teams structure monorepos?" |
| Recent info | "What changed in React 19?" |

---

## Browser Automation Tools

### Playwright MCP

**Purpose:** Browser automation using Playwright's accessibility tree (structured, not pixel-based).

**Key capabilities:**
- Navigate and interact with web pages
- Fill forms, click buttons, select options
- Take screenshots and generate PDFs
- Monitor network requests and console logs
- Generate reusable test scripts

**Core tools:**

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Navigate to URL with viewport settings |
| `browser_click` | Click elements by CSS selector |
| `browser_type` | Type text into input fields |
| `browser_select_option` | Select dropdown options |
| `browser_snapshot` | Get accessibility tree (structured DOM) |
| `browser_take_screenshot` | Capture page or element screenshots |
| `browser_wait_for` | Wait for text/conditions to appear |
| `browser_file_upload` | Upload files to inputs |
| `browser_console_messages` | Get console logs and errors |
| `browser_network_requests` | Monitor HTTP requests/responses |
| `browser_generate_playwright_test` | Generate test code from interactions |

**Tab management:**
| Tool | Purpose |
|------|---------|
| `browser_tab_list` | List all open tabs |
| `browser_tab_new` | Open new tab |
| `browser_tab_select` | Switch to specific tab |
| `browser_tab_close` | Close a tab |

**Best for:**
| Use Case | Example |
|----------|---------|
| E2E test automation | Form submission, user flows |
| Screenshot capture | Visual regression, documentation |
| Form filling | Data entry automation |
| Multi-tab workflows | Testing complex user journeys |

---

### Chrome DevTools MCP

**Purpose:** Deep browser debugging, performance analysis, and inspection via Chrome DevTools Protocol.

**Key capabilities:**
- Real-time debugging of web applications
- Performance profiling and metrics
- Network request inspection
- DOM and CSS inspection
- Console monitoring and JavaScript execution
- Storage and cookie management

**Browser control:**
| Tool | Purpose |
|------|---------|
| `start_chrome` | Launch Chrome with remote debugging |
| `connect_to_browser` | Connect to existing Chrome instance |
| `navigate_to_url` | Navigate to webpage |
| `disconnect_from_browser` | Terminate session |

**Network analysis:**
| Tool | Purpose |
|------|---------|
| `get_network_requests` | Capture HTTP requests/responses |
| `get_network_response` | Get detailed response data |

**Console & JavaScript:**
| Tool | Purpose |
|------|---------|
| `get_console_logs` | Retrieve console output |
| `get_console_error_summary` | Organized error summary |
| `execute_javascript` | Run code in browser context |
| `inspect_console_object` | Deep inspect JS objects |
| `monitor_console_live` | Real-time console tracking |

**Performance:**
| Tool | Purpose |
|------|---------|
| `get_page_info` | Page metrics |
| `get_performance_metrics` | Timing and resource data |

**DOM & CSS:**
| Tool | Purpose |
|------|---------|
| `get_document` | DOM document structure |
| `query_selector` | Find element by CSS selector |
| `get_computed_styles` | Calculated CSS properties |
| `get_matched_styles` | All applicable CSS rules |
| `start_css_coverage_tracking` | CSS coverage analysis |

**Storage:**
| Tool | Purpose |
|------|---------|
| `get_cookies` | Retrieve cookies |
| `set_cookie` | Create cookies |
| `get_storage_usage_and_quota` | Check storage limits |

**Best for:**
| Use Case | Example |
|----------|---------|
| Performance debugging | Slow page loads, memory leaks |
| Network inspection | API calls, response timing |
| Error tracking | Console errors, exceptions |
| CSS debugging | Style issues, coverage gaps |

---

## Database Tools

### PostgreSQL MCP

**Purpose:** PostgreSQL database operations, schema inspection, and query optimization.

**Key capabilities:**
- Schema discovery and introspection
- SQL query execution
- Query performance analysis
- Index optimization recommendations
- Database health monitoring

**Core tools:**

| Tool | Purpose |
|------|---------|
| `list_schemas` | List all database schemas |
| `list_objects` | Enumerate tables, views, sequences |
| `get_object_details` | Column, constraint, index metadata |
| `execute_sql` | Run SQL statements |
| `explain_query` | Execution plans and cost analysis |
| `get_top_queries` | Slowest queries (pg_stat_statements) |
| `analyze_workload_indexes` | Recommend indexes for workload |
| `analyze_query_indexes` | Recommend indexes for specific queries |
| `analyze_db_health` | Comprehensive health assessment |

**Health checks include:**
- Buffer cache efficiency
- Connection pool status
- Constraint validity
- Index integrity
- Vacuum/analyze status

**Best for:**
| Use Case | Example |
|----------|---------|
| Schema exploration | Understanding table structure |
| Query debugging | Slow query analysis |
| Index optimization | Performance tuning |
| Health monitoring | Database maintenance |

---

## Internal Knowledge Tools

### Knowledge Base (kb_search / kb_write)

**Purpose:** Query and store institutional knowledge specific to this project.

**See:** [KB-AGENT-INTEGRATION.md](./KB-AGENT-INTEGRATION.md) for detailed integration patterns.

**When to use:**
- Before making architectural decisions
- When encountering domain-specific patterns
- To record lessons learned and findings

---

## Decision Guide

```
Need current library docs or API syntax?
  → Context7

Need to research, compare, or debug?
  → Perplexity

Need to automate browser interactions or run E2E tests?
  → Playwright MCP

Need to debug browser performance or inspect network/DOM?
  → Chrome DevTools MCP

Need to query database or optimize queries?
  → PostgreSQL MCP

Need project-specific patterns or past decisions?
  → kb_search

Recording findings or lessons learned?
  → kb_write (via kb-writer agent)
```

## Playwright MCP vs Chrome DevTools MCP

| Scenario | Use |
|----------|-----|
| Running E2E tests | Playwright MCP |
| Filling forms, clicking buttons | Playwright MCP |
| Taking screenshots for tests | Playwright MCP |
| Debugging slow page loads | Chrome DevTools |
| Inspecting network requests in detail | Chrome DevTools |
| Analyzing CSS coverage | Chrome DevTools |
| Checking console errors | Either (DevTools has more detail) |
| Generating test code | Playwright MCP |

---

## Agent Integration Patterns

### For E2E Testing Agents

```markdown
## Browser Automation (Playwright MCP)

For E2E test implementation:
- `browser_navigate` to load pages
- `browser_click`, `browser_type` for interactions
- `browser_snapshot` for accessibility tree
- `browser_take_screenshot` for visual evidence
- `browser_wait_for` for async content
```

### For Debugging Agents

```markdown
## Browser Debugging (Chrome DevTools MCP)

For performance and debugging:
- `get_performance_metrics` for timing data
- `get_network_requests` for API inspection
- `get_console_error_summary` for error tracking
- `execute_javascript` for runtime inspection
```

### For Database Agents

```markdown
## Database Operations (PostgreSQL MCP)

For database work:
- `list_schemas`, `list_objects` for discovery
- `execute_sql` for queries
- `explain_query` for performance analysis
- `analyze_db_health` for maintenance checks
```

### For Implementation Agents

```markdown
## External Documentation (Context7)

Before implementing, use Context7 for current API documentation:
- React 19 hooks and patterns: `use context7`
- Testing patterns (Vitest/Playwright): `use context7`
- UI library usage (@repo/ui, shadcn): `use context7`
```

### For Research/Planning Agents

```markdown
## Research Tools (Perplexity)

For architectural decisions or troubleshooting:
- Use `perplexity_ask` for quick web search
- Use `perplexity_reason` for complex analysis
- Use `perplexity_research` for comprehensive topics
```

---

## Tool Availability

| Tool | Requires API Key | Notes |
|------|-----------------|-------|
| Context7 | Optional | Free tier available (rate limited) |
| Perplexity | Required | Paid API |
| Playwright MCP | No | Local browser required |
| Chrome DevTools | No | Chrome must be running |
| PostgreSQL MCP | No | Database connection required |
| kb_search | No | Internal MCP |
| kb_write | No | Internal MCP |

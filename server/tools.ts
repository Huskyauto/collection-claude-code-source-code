import path from "path";
import { EventEmitter } from "events";
import { storage } from "./storage";
import { getAvailableModels, PROVIDER_CONFIG, getClientForModel } from "./providers";
import { isHeartbeatRunning, delegateTaskFromChat } from "./heartbeat";
import { generateEmbedding } from "./embeddings";
import { wrapExternalContent } from "./external-content-security";
import { sessionsList, sessionsHistory, sessionsSend } from "./sessions";

export const orchestrationProgressEmitter = new EventEmitter();

async function retryWithBackoff<T>(fn: () => Promise<T>, opts?: { retries?: number; delayMs?: number; label?: string }): Promise<T> {
  const { retries = 2, delayMs = 1000, label = "operation" } = opts || {};
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (i < retries) {
        const wait = delayMs * Math.pow(2, i);
        console.warn(`[retry] ${label} attempt ${i + 1} failed: ${err.message?.slice(0, 120)}, retrying in ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}
let _subagentModule: typeof import("./subagents") | null = null;
async function getSubagentModule() {
  if (!_subagentModule) _subagentModule = await import("./subagents");
  return _subagentModule;
}
import { isFirecrawlAvailable, firecrawlScrape, firecrawlSearch as firecrawlSearchFn, firecrawlScrapeAndStore, firecrawlCrawlSite, firecrawlMapSite, queryScrapedPages, getScrapedPageContent, deleteScrapedPages } from "./firecrawl";
import { extractPdfText } from "./pdf-tool";
import { createPdf, fillPdf, editPdf, listPdfFields } from "./pdf-create";
import { fileStorage } from "@shared/schema";
import fs from "fs";
import { uploadAndShare, listDriveFiles, downloadFromDrive, deleteDriveFile, getDriveFolderInfo, makeFileShareable } from "./google-drive";
import { generateDiff, wordDiff } from "./diff-tool";
import { executeCommand } from "./exec-tool";
import { runLlmTask } from "./llm-task";
import { isPerplexityAvailable, perplexitySearch } from "./perplexity-search";
import { executeBrowserAction } from "./browser-tool";
import { runLobster } from "./lobster";
import {
  gmailSearch, gmailGetMessage, gmailSend, gmailModifyLabels,
  calendarListEvents, calendarCreateEvent, calendarDeleteEvent,
  contactsList, contactsCreate,
  sheetsGet, sheetsUpdate, sheetsAppend, sheetsClear, sheetsMetadata,
  docsGet, docsCreate,
} from "./google-workspace";
import {
  createCollection, listCollections, deleteCollection,
  addDocument, removeDocument, addContext, generateCollectionEmbeddings,
  searchDocuments, getDocument, getCollectionStatus,
} from "./doc-collections";
import {
  sendWhatsAppMessage, getWhatsAppStatus,
} from "./whatsapp";
import { planAndExecute } from "./task-planner";
import { executeCode as runSandboxCode } from "./code-sandbox";
import { deepResearch } from "./research-pipeline";
import { db } from "./db";
import { messages as messagesTable } from "@shared/schema";
import { sql } from "drizzle-orm";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "test_api_keys",
      description: "Test all configured AI provider API keys for connectivity. Returns status, latency, and details for each provider (OpenAI, Anthropic, xAI, Google, Perplexity, OpenRouter, Replit).",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "check_system_status",
      description: "Get full system health: uptime, conversation count, message count, memory stats, heartbeat status, and active persona info.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_models",
      description: "List all currently available AI models based on configured API keys. Shows model name, provider, tier, and description.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_memory",
      description: "Search the agent's long-term memory for facts about the user. Use when the user asks 'do you remember...' or when you need to recall stored information.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query - keywords or phrase to match against stored memories" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_memory",
      description: "Store a new fact about the user in long-term memory. Automatically checks for duplicates and resolves contradictions with existing memories. Use for important preferences, personal details, or things the user explicitly asks you to remember.",
      parameters: {
        type: "object",
        properties: {
          fact: { type: "string", description: "The fact to remember (concise, specific, third-person)" },
          category: { type: "string", enum: ["identity", "preference", "relationship", "goal", "context", "skill", "milestone", "status"], description: "Category of the memory" },
        },
        required: ["fact", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "Search the permanent knowledge base for reference material, guides, or documentation the agent has stored.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query to match against knowledge entries" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_knowledge",
      description: "Add a new entry to the permanent knowledge base. Use for storing reference material, guides, or important documentation.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the knowledge entry" },
          content: { type: "string", description: "The knowledge content" },
          category: { type: "string", description: "Category (e.g. 'reference', 'guide', 'skill')" },
          priority: { type: "number", description: "Priority 1-5 (5=highest)" },
        },
        required: ["title", "content", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_notes",
      description: "Retrieve the agent's activity log and notes for a specific date or recent days. Useful for recalling what happened on a given day.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format. If omitted, returns last 7 days." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_conversations",
      description: "List recent conversations with titles, dates, and models used. Useful for finding past discussions.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max conversations to return (default 20)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_fetch",
      description: "Fetch and read content from a URL. Uses multi-tier extraction: Readability (Jina AI) → Firecrawl (stealth/cached, if configured) → basic HTML cleanup. Handles JS-heavy sites and bot-protected pages.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to fetch content from" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information. Uses Perplexity Sonar (when configured) for AI-powered research with citations, with Wikipedia and Jina AI as fallbacks. Use when the user asks a factual question, needs current information, or you need to research a topic before responding.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query — keywords or question to search for" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "firecrawl_search",
      description: "Search the web using Firecrawl and get clean, LLM-ready markdown results. Better than web_search for getting actual page content — returns full scraped markdown from top results. Use for deep research when you need the actual content of web pages, not just summaries.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query — keywords or question" },
          limit: { type: "number", description: "Number of results to return (1-10, default 5)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "firecrawl_scrape",
      description: "Scrape a single URL using Firecrawl, extract clean markdown content, and save it to the scraped pages database for later retrieval. Returns the page content and a database ID. Use when you need to capture and store a specific web page.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to scrape" },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags to organize this page (e.g. ['competitor', 'pricing'])" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "firecrawl_crawl",
      description: "Crawl an entire website using Firecrawl — follows links from a starting URL, scrapes multiple pages, and stores all content in the database. Great for indexing competitor sites, documentation portals, or any multi-page site. Returns list of all pages found and stored.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Starting URL to crawl from" },
          limit: { type: "number", description: "Max pages to crawl (1-100, default 20)" },
          maxDepth: { type: "number", description: "Max link depth from starting URL (default 3)" },
          includePaths: { type: "array", items: { type: "string" }, description: "Only crawl URLs matching these path patterns (e.g. ['/blog/*', '/docs/*'])" },
          excludePaths: { type: "array", items: { type: "string" }, description: "Skip URLs matching these path patterns (e.g. ['/login', '/admin/*'])" },
          tags: { type: "array", items: { type: "string" }, description: "Tags to apply to all crawled pages" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "firecrawl_map",
      description: "Quickly discover all URLs on a website without scraping them. Returns a sitemap-like list of all reachable pages. Use to plan a targeted crawl or understand a site's structure before scraping.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The website URL to map" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scraped_pages_query",
      description: "Search and browse the database of previously scraped/crawled web pages. Filter by domain, search content, or browse by tags. Returns page summaries with content previews.",
      parameters: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Filter by domain (e.g. 'example.com')" },
          search: { type: "string", description: "Search term to find in page content or titles" },
          limit: { type: "number", description: "Results per page (default 20, max 50)" },
          offset: { type: "number", description: "Offset for pagination (default 0)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scraped_page_read",
      description: "Read the full content of a specific scraped page by its database ID. Use after scraped_pages_query to get the complete markdown content of a page.",
      parameters: {
        type: "object",
        properties: {
          pageId: { type: "number", description: "The page ID from scraped_pages_query results" },
        },
        required: ["pageId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scraped_pages_delete",
      description: "Delete scraped pages from the database. Can delete specific pages by ID, all pages from a domain, or pages older than N days.",
      parameters: {
        type: "object",
        properties: {
          pageIds: { type: "array", items: { type: "number" }, description: "Specific page IDs to delete" },
          domain: { type: "string", description: "Delete all pages from this domain" },
          olderThanDays: { type: "number", description: "Delete pages scraped more than N days ago" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_daily_note",
      description: "Write or append to today's daily notes. Use to log important events, decisions, lessons learned, or anything worth recording during the conversation. Memory rule: if you want to remember it, write it down NOW.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Content to write — events, decisions, lessons, or notes" },
          section: { type: "string", enum: ["events", "decisions", "lessons", "tomorrow"], description: "Which section to write to (default: events)" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_memory",
      description: "Update an existing memory entry — change the fact text, category, or archive it. Use when information about the user changes or becomes outdated.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "ID of the memory entry to update" },
          fact: { type: "string", description: "Updated fact text (optional — omit to keep current)" },
          category: { type: "string", enum: ["preference", "relationship", "milestone", "status"], description: "Updated category (optional)" },
          status: { type: "string", enum: ["active", "archived"], description: "Set to 'archived' to retire outdated memories" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_chart",
      description: "Generate an interactive chart that will be rendered inline in the chat. Use when the user asks for data visualization, comparisons, trends, or any visual representation of data.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["bar", "line", "pie", "area"], description: "Type of chart to generate" },
          title: { type: "string", description: "Chart title" },
          data: {
            type: "array",
            items: { type: "object" },
            description: "Array of data objects. Each object should have keys matching xKey and yKey. For pie charts, use 'name' and 'value' keys.",
          },
          xKey: { type: "string", description: "Key in data objects for x-axis (or 'name' for pie charts)" },
          yKey: { type: "string", description: "Key in data objects for y-axis values (or 'value' for pie charts). Can be comma-separated for multiple series." },
          colors: { type: "array", items: { type: "string" }, description: "Optional array of hex color codes for the chart" },
        },
        required: ["type", "title", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "render_diagram",
      description: "Render a Mermaid diagram (flowchart, sequence diagram, architecture map, state diagram, class diagram, gantt chart, etc.) as a PNG image, upload it to Google Drive, and return a shareable link. Use this for system architecture diagrams, process flows, data flow maps, org charts, and technical documentation visuals. Supports all Mermaid diagram types.",
      parameters: {
        type: "object",
        properties: {
          mermaid_code: { type: "string", description: "Mermaid diagram definition code. Example: 'graph TD\\nA[Start] --> B[Process]\\nB --> C[End]'" },
          title: { type: "string", description: "Title for the diagram (used for filename and Drive folder)" },
          theme: { type: "string", enum: ["default", "dark", "forest", "neutral"], description: "Mermaid theme (default: neutral)" },
          background_color: { type: "string", description: "Background color hex code (default: white '#ffffff')" },
          folder_label: { type: "string", description: "Google Drive folder name (default: 'Diagrams')" },
        },
        required: ["mermaid_code", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "vibevoice_transcribe",
      description: "Transcribe audio using Microsoft VibeVoice ASR — a frontier speech-to-text model that handles up to 60 minutes of audio in a single pass. Returns structured transcriptions with speaker diarization (who said what), timestamps, and content. Supports 50+ languages, custom hotwords, and code-switching. Best for meeting recordings, interviews, podcasts, and long-form audio.",
      parameters: {
        type: "object",
        properties: {
          audio_path: { type: "string", description: "Local file path to the audio file (WAV, MP3, FLAC, WebM, etc.)" },
          audio_url: { type: "string", description: "URL to download the audio file from" },
          language: { type: "string", description: "Primary language hint (e.g., 'en', 'zh', 'fr'). Auto-detected if omitted." },
          hotwords: { type: "array", items: { type: "string" }, description: "Custom hotwords to improve recognition accuracy (e.g., names, technical terms, product names)" },
          enable_diarization: { type: "boolean", description: "Enable speaker diarization to identify who said what (default: true)" },
          enable_timestamps: { type: "boolean", description: "Include timestamps in the output (default: true)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "vibevoice_speak",
      description: "Generate speech audio using Microsoft VibeVoice TTS — a frontier text-to-speech model supporting up to 90 minutes of expressive conversational audio with up to 4 distinct speakers. Best for generating podcast-style conversations, multi-speaker dialogues, narrations, and long-form audio content. Available speakers include Carter, Alyssa, Angelo, Bella, Davis, Elijah, Evelyn, James, Joanna, Kenji, Madeline, Nova.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to convert to speech. For single-speaker output." },
          speakers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Speaker name (e.g., Carter, Alyssa)" },
                text: { type: "string", description: "What this speaker says" },
              },
              required: ["name", "text"],
            },
            description: "Multi-speaker dialogue. Each entry is a speaker turn. Supports up to 4 speakers.",
          },
          voice: { type: "string", description: "Voice/speaker name for single-speaker mode (default: Carter)" },
          output_path: { type: "string", description: "Optional local file path to save the audio output" },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_dashboard",
      description: "Generate an interactive HTML dashboard that will be rendered in a live canvas inside the chat. Use for rich visualizations, status boards, KPI displays, data tables, or any complex visual output that goes beyond a simple chart. The HTML can include inline CSS and JavaScript. Use semantic HTML with the built-in utility classes: .card, .metric, .metric-value, .metric-label, .grid, .badge, .badge-green, .badge-red, .badge-blue, .badge-yellow.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Dashboard title shown in the canvas header" },
          html: { type: "string", description: "HTML content for the dashboard. Can include inline styles and scripts. Use semantic HTML elements and the built-in utility classes for consistent styling." },
        },
        required: ["title", "html"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delegate_task",
      description: "Delegate a task to another agent (persona). One-shot tasks (schedule='once') execute INLINE — the specialist runs immediately and returns their result in this conversation. Recurring tasks (cron schedule) are queued for approval. Use this to dispatch work to specialists like Neptune (audio/video), Scribe (writing), Forge (code), Radar (research), Chief of Staff (diagnostics), etc.",
      parameters: {
        type: "object",
        properties: {
          targetAgent: { type: "string", description: "Name of the agent to delegate to (must match an existing persona name)" },
          taskName: { type: "string", description: "Short name for the task" },
          description: { type: "string", description: "What needs to be done" },
          prompt: { type: "string", description: "Detailed instructions for the agent" },
          schedule: { type: "string", description: "'once' for one-shot tasks, or a cron expression like '0 8 * * *' for recurring" },
        },
        required: ["targetAgent", "taskName", "prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email from the VisionClaw corporate inbox (visionclaw@agentmail.to). Use for outreach, notifications, customer communication, or automated correspondence. IMPORTANT: If you're delivering a file to a customer, prefer using deliver_product instead — it handles Drive upload, link generation, and branded email in one step. If you must use send_email manually, always include the Google Drive shareableLink (from create_pdf or google_drive) in the email body so the recipient can download the file. Never send a file delivery email without the Drive link.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          text: { type: "string", description: "Plain text email body" },
          html: { type: "string", description: "Optional HTML email body for rich formatting" },
        },
        required: ["to", "subject", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_inbox",
      description: "Check the VisionClaw corporate email inbox for recent messages. Returns the latest emails received at visionclaw@agentmail.to.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of messages to retrieve (default 10, max 50)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_info",
      description: "Get the current user's account information including their name, email, and plan. Use this when you need to send files, reports, or communications to the current user and need their email address.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sessions_list",
      description: "List active agent sessions (conversations) across the VisionClaw platform. Use to discover other agents/personas and their active sessions before sending inter-agent messages. Returns session keys, persona info, models, and activity timestamps.",
      parameters: {
        type: "object",
        properties: {
          kinds: {
            type: "array",
            items: { type: "string", enum: ["main", "group", "cron", "hook", "node", "other"] },
            description: "Filter by session kind(s). Omit to list all.",
          },
          limit: { type: "number", description: "Max sessions to return (default 50, max 200)" },
          activeMinutes: { type: "number", description: "Only sessions updated within the last N minutes" },
          messageLimit: { type: "number", description: "Include last N messages per session (0 = none, default 0)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sessions_history",
      description: "Fetch the transcript/message history of another agent session. Use to review what another agent has been doing, check conversation context, or audit inter-agent communication.",
      parameters: {
        type: "object",
        properties: {
          sessionKey: { type: "string", description: "Session key (e.g. 'agent:1:webchat:conv:5') or session ID (conversation number)" },
          limit: { type: "number", description: "Max messages to return (default 100, max 500)" },
          includeTools: { type: "boolean", description: "Include tool call/result messages (default false)" },
        },
        required: ["sessionKey"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sessions_send",
      description: "Send a message to another agent session. The target session's persona will process the message and generate a reply. Use for inter-agent coordination, delegation, and cross-persona collaboration. Reply with REPLY_SKIP to end any ping-pong follow-up.",
      parameters: {
        type: "object",
        properties: {
          sessionKey: { type: "string", description: "Target session key or session ID" },
          message: { type: "string", description: "The message to send to the target agent" },
        },
        required: ["sessionKey", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sessions_spawn",
      description: "Spawn a background sub-agent run to perform a task asynchronously. The sub-agent runs in its own session and announces results back when finished. Use for parallelizing research, long tasks, or slow tool work without blocking the main conversation. Each sub-agent gets its own context and tools.",
      parameters: {
        type: "object",
        properties: {
          task: { type: "string", description: "The task for the sub-agent to perform (required)" },
          label: { type: "string", description: "Optional human-readable label for the run (e.g. 'research-competitor', 'summarize-logs')" },
          agentId: { type: "number", description: "Persona ID to use for the sub-agent (default: inherit from parent)" },
          model: { type: "string", description: "Model override for the sub-agent (default: inherit from parent)" },
          thinkingLevel: { type: "string", enum: ["off", "low", "medium", "high"], description: "Thinking level override (default: inherit)" },
          runTimeoutSeconds: { type: "number", description: "Timeout in seconds (default: 900, 0 = no timeout)" },
          mode: { type: "string", enum: ["run", "session"], description: "run = one-shot (announces result and archives), session = persistent (stays active). Default: run" },
        },
        required: ["task"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "subagents",
      description: "Inspect and control sub-agent runs. List active/completed runs, kill running sub-agents, or get detailed info about a specific run.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            enum: ["list", "kill", "killAll", "info"],
            description: "list: show all sub-agent runs. kill: stop a specific run by ID. killAll: stop all running sub-agents. info: detailed info about a specific run.",
          },
          runId: { type: "string", description: "Run ID (required for kill and info commands)" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a local file. Use this to read scripts, text files, configs, or any file in the workspace. Safe — read-only, cannot modify files. Supports text files only.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to workspace root (e.g. 'project-assets/script.txt', 'uploads/notes.md')" },
          maxLines: { type: "number", description: "Maximum number of lines to return (default: 200). Use for large files." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recall_context",
      description: "Recall earlier conversation history that was compacted (summarized) to save context space. Use this when you need to remember details from earlier in a conversation or from OTHER conversations in the same project. Search by keyword to find specific topics. This is your long-term conversation memory — it works ACROSS conversations within the same project.",
      parameters: {
        type: "object",
        properties: {
          conversationId: { type: "number", description: "The conversation ID to recall from. Use the current conversation ID, or omit to search across the entire project." },
          query: { type: "string", description: "Optional keyword to search for in archived messages (e.g. 'pdf', 'email', 'logo', a customer name). Omit to get the most recent archives." },
          limit: { type: "number", description: "Max number of archive chunks to return (default 3)" },
          projectWide: { type: "boolean", description: "If true, search across ALL conversations in the current project, not just the specified one. Default: false." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_pdf",
      description: "Extract and analyze text from a PDF document. Accepts a URL or local file path. Returns extracted text, page count, and metadata. Use for reading documents, reports, contracts, or any PDF content.",
      parameters: {
        type: "object",
        properties: {
          pdf: { type: "string", description: "PDF URL (https://...) or local file path" },
          pages: { type: "string", description: "Optional page filter like '1-5' or '1,3,7-9'. Omit to extract all pages." },
          prompt: { type: "string", description: "Optional analysis prompt — what to focus on or extract from the PDF" },
          maxBytesMb: { type: "number", description: "Max PDF size in MB (default 10)" },
        },
        required: ["pdf"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_pdf",
      description: "Create a PDF document — supports MULTI-PAGE documents (pages auto-created as content flows), header logo on first page, and fillable form fields. AUTOMATICALLY uploads to Google Drive and returns a shareable link. To create a long document (e.g. 9 pages), use the 'sections' array with multiple {heading, body} entries — each section has a heading and body text, and pages are created automatically as needed. To include a logo, use headerImage with the path from list_uploads. NEVER write Python/ReportLab code — this tool handles all PDF generation. Just pass your content as structured sections.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Document title (appears at top and in metadata)" },
          content: { type: "string", description: "Main text content. Use \\n for line breaks and paragraphs." },
          sections: {
            type: "array",
            description: "Optional structured sections with headings and body text",
            items: {
              type: "object",
              properties: {
                heading: { type: "string", description: "Section heading" },
                body: { type: "string", description: "Section body text" },
              },
              required: ["body"],
            },
          },
          fields: {
            type: "array",
            description: "Fillable form fields — makes the PDF interactive and editable",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Unique field name (used to reference the field)" },
                type: { type: "string", enum: ["text", "checkbox", "dropdown"], description: "Field type" },
                label: { type: "string", description: "Label shown above the field" },
                x: { type: "number", description: "X position from left edge (points, 72 = 1 inch)" },
                y: { type: "number", description: "Y position from bottom edge (points)" },
                width: { type: "number", description: "Field width in points (default 200)" },
                height: { type: "number", description: "Field height in points (default 24)" },
                value: { type: "string", description: "Default value" },
                options: { type: "array", items: { type: "string" }, description: "Options for dropdown fields" },
                required: { type: "boolean", description: "Whether the field is required" },
                multiline: { type: "boolean", description: "Whether text field supports multiple lines" },
              },
              required: ["name", "type", "x", "y"],
            },
          },
          headerImage: {
            type: "object",
            description: "Logo or image to display at the top of the first page. Supports PNG and JPG. Use list_uploads to find previously uploaded images.",
            properties: {
              path: { type: "string", description: "Path to the image file (e.g. 'uploads/abc123.png' or just the filename)" },
              width: { type: "number", description: "Display width in points (72 = 1 inch). Height auto-calculated to maintain aspect ratio." },
              height: { type: "number", description: "Display height in points (optional, overrides auto-calculation)" },
              alignment: { type: "string", enum: ["left", "center", "right"], description: "Horizontal alignment (default center)" },
            },
            required: ["path"],
          },
          fontSize: { type: "number", description: "Base font size (default 12)" },
          pageSize: { type: "string", enum: ["letter", "a4", "legal"], description: "Page size (default letter)" },
          outputPath: { type: "string", description: "Output filename (default auto-generated)" },
          customerName: { type: "string", description: "Customer name — used to label the Google Drive dated folder (e.g. '2026-03-15_14-30-00_JohnSmith')" },
          folderLabel: { type: "string", description: "Custom label for the Drive subfolder. If omitted, uses customerName or title." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fill_pdf",
      description: "Fill in form fields of an existing fillable PDF. Set values for text fields, check/uncheck checkboxes, and select dropdown options. Optionally flatten the form (make it non-editable). Use for completing forms, applications, or any fillable PDF.",
      parameters: {
        type: "object",
        properties: {
          inputPath: { type: "string", description: "Path to the fillable PDF file" },
          fields: {
            type: "object",
            description: "Field name-value pairs. Use strings for text/dropdown, true/false for checkboxes.",
            additionalProperties: true,
          },
          outputPath: { type: "string", description: "Output filename (default adds _filled suffix)" },
          flatten: { type: "boolean", description: "If true, flattens the form — fields become static text and can no longer be edited" },
        },
        required: ["inputPath", "fields"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_pdf",
      description: "Edit an existing PDF — add text, add fillable form fields, add blank pages, or remove pages. The output remains editable. Use for modifying, annotating, or extending existing PDFs.",
      parameters: {
        type: "object",
        properties: {
          inputPath: { type: "string", description: "Path to the PDF file to edit" },
          addText: {
            type: "array",
            description: "Text overlays to add to the PDF",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                x: { type: "number", description: "X position from left (points)" },
                y: { type: "number", description: "Y position from bottom (points)" },
                page: { type: "number", description: "Page number (1-based, default 1)" },
                fontSize: { type: "number", description: "Font size (default 12)" },
                color: { type: "string", description: "Hex color like #FF0000 (default black)" },
              },
              required: ["text", "x", "y"],
            },
          },
          addFields: {
            type: "array",
            description: "Fillable form fields to add",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string", enum: ["text", "checkbox", "dropdown"] },
                x: { type: "number" },
                y: { type: "number" },
                width: { type: "number" },
                height: { type: "number" },
                options: { type: "array", items: { type: "string" } },
              },
              required: ["name", "type", "x", "y"],
            },
          },
          addPages: { type: "number", description: "Number of blank pages to append" },
          removePages: { type: "array", items: { type: "number" }, description: "Page numbers to remove (1-based)" },
          outputPath: { type: "string", description: "Output filename" },
        },
        required: ["inputPath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_pdf_fields",
      description: "List all fillable form fields in a PDF — their names, types, and current values. Use to inspect a form before filling it.",
      parameters: {
        type: "object",
        properties: {
          inputPath: { type: "string", description: "Path to the PDF file" },
        },
        required: ["inputPath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "project",
      description: "Manage projects — the filing cabinet system. Every customer/job gets a project folder. All files, conversations, notes, and assets are linked to the project so agents can pick up where they left off. Commands: create, get, list, update, add_file, add_note, link_conversation, search. ALWAYS create or find a project before starting work for a customer.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", enum: ["create", "get", "list", "update", "add_file", "add_note", "link_conversation", "search"], description: "Operation to perform" },
          id: { type: "number", description: "Project ID (for get, update, add_file, add_note, link_conversation)" },
          name: { type: "string", description: "Project name (for create, search)" },
          description: { type: "string", description: "Project description (for create, update)" },
          status: { type: "string", enum: ["active", "paused", "completed", "archived"], description: "Project status (for create, update)" },
          customerName: { type: "string", description: "Customer name (for create, update)" },
          customerEmail: { type: "string", description: "Customer email (for create, update)" },
          tags: { type: "array", items: { type: "string" }, description: "Tags for categorization (for create, update)" },
          filename: { type: "string", description: "Filename to link to project (for add_file)" },
          filePath: { type: "string", description: "File path (for add_file)" },
          fileType: { type: "string", description: "File type: logo, document, pdf, image, asset, draft, final (for add_file)" },
          fileDescription: { type: "string", description: "Description of the file (for add_file)" },
          driveLink: { type: "string", description: "Google Drive shareable link (for add_file)" },
          driveFileId: { type: "string", description: "Google Drive file ID (for add_file)" },
          note: { type: "string", description: "Note content (for add_note)" },
          conversationId: { type: "number", description: "Conversation ID to link (for link_conversation)" },
          query: { type: "string", description: "Search query (for search)" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_uploads",
      description: "List all previously uploaded files (images, PDFs, etc.) stored in the system. Use this to find uploaded logos, images, or documents before referencing them in create_pdf headerImage or other tools. Returns filename, original name, type, and size.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", description: "Filter by MIME type prefix (e.g. 'image' for images only, 'application/pdf' for PDFs). Omit to list all." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "google_drive",
      description: "Manage files in Google Drive. All operations are scoped to the 'VisionClaw' folder (auto-created). Files are automatically made shareable with public links on upload. Use to upload generated files (PDFs, reports, digital products, etc.) so anyone with the link can view/download them. Returns both a shareable view link and a direct download link — use these for digital product delivery.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", enum: ["upload", "list", "download", "delete", "share", "info"], description: "Operation: upload (auto-shares), list, download, delete, share (make existing file public), or info" },
          filePath: { type: "string", description: "Local file path to upload (for 'upload'). Can be relative like 'uploads/my_file.pdf'" },
          fileName: { type: "string", description: "Name for the file in Drive (for 'upload'). If omitted, uses the local filename" },
          mimeType: { type: "string", description: "MIME type (for 'upload'). Default: application/pdf. Common: application/pdf, text/plain, text/csv, image/png, image/jpeg" },
          description: { type: "string", description: "Optional description for the uploaded file" },
          share: { type: "boolean", description: "Whether to make the file publicly shareable (default: true). Set false to keep private." },
          customerName: { type: "string", description: "Customer name for the delivery subfolder (e.g. 'John Smith'). Creates a dated subfolder like '2026-03-14_14-30-00_John Smith'" },
          folderLabel: { type: "string", description: "Custom label for the delivery subfolder. Overrides customerName for folder naming." },
          fileId: { type: "string", description: "Google Drive file ID (for 'download', 'delete', and 'share')" },
          query: { type: "string", description: "Search query to filter files by name (for 'list')" },
          savePath: { type: "string", description: "Local path to save downloaded file (for 'download'). Default: uploads/<filename>" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "google_workspace",
      description: "Access Google Workspace services: Gmail, Calendar, Contacts, Sheets, and Docs. Requires Google account to be connected via Settings > General > Connect Subscription. Use this for reading/sending emails, managing calendar events, looking up contacts, reading/writing spreadsheets, and reading/creating documents.",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string", enum: ["gmail", "calendar", "contacts", "sheets", "docs"], description: "Which Google service to use" },
          action: { type: "string", description: "Action to perform. Gmail: search, read, send, label. Calendar: list, create, delete. Contacts: list, create. Sheets: get, update, append, clear, metadata. Docs: get, create." },
          query: { type: "string", description: "Gmail: search query (e.g. 'newer_than:7d from:boss@company.com'). Contacts: search name/email." },
          messageId: { type: "string", description: "Gmail message ID for read/label actions" },
          to: { type: "string", description: "Gmail send: recipient email address" },
          cc: { type: "string", description: "Gmail send: CC recipients" },
          bcc: { type: "string", description: "Gmail send: BCC recipients" },
          subject: { type: "string", description: "Gmail send: email subject. Docs create: document title. Calendar create: event title." },
          body: { type: "string", description: "Gmail send: email body (HTML supported). Docs create: initial text content." },
          addLabels: { type: "array", items: { type: "string" }, description: "Gmail label: label IDs to add (e.g. ['STARRED', 'IMPORTANT'])" },
          removeLabels: { type: "array", items: { type: "string" }, description: "Gmail label: label IDs to remove (e.g. ['UNREAD'])" },
          timeMin: { type: "string", description: "Calendar list: start time ISO 8601 (e.g. '2026-03-20T00:00:00Z')" },
          timeMax: { type: "string", description: "Calendar list: end time ISO 8601" },
          start: { type: "string", description: "Calendar create: event start (ISO 8601 datetime or YYYY-MM-DD for all-day)" },
          end: { type: "string", description: "Calendar create: event end (ISO 8601 datetime or YYYY-MM-DD for all-day)" },
          description: { type: "string", description: "Calendar create: event description" },
          location: { type: "string", description: "Calendar create: event location" },
          attendees: { type: "array", items: { type: "string" }, description: "Calendar create: attendee email addresses" },
          eventId: { type: "string", description: "Calendar delete: event ID" },
          calendarId: { type: "string", description: "Calendar: calendar ID (default: 'primary')" },
          name: { type: "string", description: "Contacts create: full name" },
          email: { type: "string", description: "Contacts create: email address" },
          phone: { type: "string", description: "Contacts create: phone number" },
          organization: { type: "string", description: "Contacts create: company/organization name" },
          spreadsheetId: { type: "string", description: "Sheets: Google Sheets spreadsheet ID" },
          documentId: { type: "string", description: "Docs: Google Docs document ID" },
          range: { type: "string", description: "Sheets: cell range (e.g. 'Sheet1!A1:D10')" },
          values: { type: "array", items: { type: "array", items: { type: "string" } }, description: "Sheets update/append: 2D array of values" },
          inputOption: { type: "string", enum: ["RAW", "USER_ENTERED"], description: "Sheets: how to interpret input values (default: USER_ENTERED)" },
          maxResults: { type: "number", description: "Max results to return (default varies by service)" },
        },
        required: ["service", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "whatsapp",
      description: "Send messages via WhatsApp. Use this to send text messages to phone numbers through the connected WhatsApp account. Can also check connection status.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["send", "status"], description: "Action: 'send' to send a message, 'status' to check connection" },
          to: { type: "string", description: "Phone number to send to (with country code, e.g. '14155551234'). Required for 'send'" },
          message: { type: "string", description: "Message text to send. Required for 'send'" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "doc_search",
      description: "Search indexed document collections (like QMD). Supports keyword search (BM25-style), semantic vector search, and hybrid mode. Use for searching notes, docs, knowledge bases, meeting transcripts, or any uploaded markdown/text documents. Users can organize documents into named collections and search across all or specific collections.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["search", "get", "add_doc", "remove_doc", "create_collection", "delete_collection", "list_collections", "add_context", "embed", "status"], description: "Action to perform" },
          query: { type: "string", description: "Search query (for 'search' action)" },
          mode: { type: "string", enum: ["keyword", "semantic", "hybrid"], description: "Search mode. keyword: fast BM25-style (default). semantic: vector similarity (requires embeddings). hybrid: combined keyword+vector." },
          collection: { type: "string", description: "Collection name to scope search or operations to" },
          collectionId: { type: "number", description: "Collection ID (for add_doc, remove_doc, add_context, embed, delete_collection)" },
          docPath: { type: "string", description: "Document path/name identifier (for add_doc, remove_doc, get)" },
          content: { type: "string", description: "Document content to index (for add_doc)" },
          context: { type: "string", description: "Contextual description attached to chunks (for add_context, add_doc). Helps search relevance." },
          name: { type: "string", description: "Collection name (for create_collection)" },
          description: { type: "string", description: "Collection description (for create_collection)" },
          topK: { type: "number", description: "Max results to return (default: 10)" },
          minScore: { type: "number", description: "Minimum similarity score threshold (default: 0.1)" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deliver_product",
      description: "Full automated digital product delivery pipeline. Creates a dated subfolder in Google Drive, uploads the file, makes it publicly shareable, sends a branded delivery email to the customer, and logs the entire transaction. Use this for any order fulfillment or digital product delivery. Returns working download/folder links and delivery tracking ID. If no filePath is given, looks in uploads/ for the fileName.",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string", description: "Customer's full name (used for subfolder naming and email)" },
          customerEmail: { type: "string", description: "Customer's email address for delivery notification. If omitted, no email is sent but upload still happens." },
          productName: { type: "string", description: "Name of the product being delivered (shown in email and logs)" },
          fileName: { type: "string", description: "Name of the file to deliver (e.g. 'Contract.pdf')" },
          filePath: { type: "string", description: "Local file path. If omitted, looks in uploads/ for fileName" },
          orderId: { type: "string", description: "Optional order/invoice ID for tracking" },
          stripePaymentId: { type: "string", description: "Optional Stripe payment ID to link delivery to payment" },
          emailSubject: { type: "string", description: "Custom email subject line. Default: 'Your order is ready: {productName}'" },
          emailBody: { type: "string", description: "Custom email body text. Default: branded template with download link" },
        },
        required: ["customerName", "productName", "fileName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delivery_status",
      description: "Check delivery status, list recent deliveries, get stats, or retry a failed delivery. Use to audit deliveries or troubleshoot delivery issues.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", enum: ["status", "list", "stats", "retry"], description: "Operation: status (check one), list (recent deliveries), stats (counts), retry (retry failed)" },
          deliveryId: { type: "number", description: "Delivery ID (for 'status' and 'retry')" },
          limit: { type: "number", description: "Max results for 'list' (default 50)" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_diff",
      description: "Generate a diff between two texts, or format a unified patch. Shows additions, deletions, and change statistics. Use when comparing versions of text, code, configs, or any content.",
      parameters: {
        type: "object",
        properties: {
          before: { type: "string", description: "Original text (required with 'after')" },
          after: { type: "string", description: "Updated text (required with 'before')" },
          patch: { type: "string", description: "Unified diff/patch text (alternative to before/after)" },
          path: { type: "string", description: "Display filename for the diff header" },
          context: { type: "number", description: "Lines of context around changes (default 3)" },
          mode: { type: "string", enum: ["unified", "word"], description: "Diff mode: 'unified' (default) shows line-by-line, 'word' shows inline word changes" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "exec",
      description: "Execute a shell command in the workspace. Security-gated: only allowlisted commands run by default. Use for system inspection, file operations, data processing, or running scripts. Must be enabled in Settings → Exec Tool.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to execute" },
          workdir: { type: "string", description: "Working directory (default: project root)" },
          timeout: { type: "number", description: "Timeout in seconds (capped by config, default 30)" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "llm_task",
      description: "Run a focused JSON-only LLM sub-task with optional schema validation. Ideal for structured extraction, classification, summarization, or drafting within workflows. The sub-model returns only valid JSON — no commentary.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Task instruction for the sub-model" },
          input: { description: "Optional input data (any JSON value) to include with the prompt" },
          schema: { type: "object", description: "Optional JSON Schema to validate the output against" },
          model: { type: "string", description: "Model to use (default: gpt-5-mini). Must be an available model." },
          thinking: { type: "string", enum: ["off", "low", "medium", "high"], description: "Reasoning depth preset (default: off)" },
          temperature: { type: "number", description: "Temperature (0-2, default 0.1 for consistency)" },
          maxTokens: { type: "number", description: "Max output tokens (default 800)" },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser",
      description: "Control a remote browser via Chrome DevTools Protocol. Each user gets isolated browser sessions. Actions: navigate, screenshot, content, click, type, evaluate, smart_browse (navigate+screenshot+extract in one step), form_fill (fill multiple fields at once), vision_browse (Set-of-Mark: annotate page with numbered marks over all interactable elements + screenshot — use for autonomous visual browsing), vision_act (click/type/hover/select a numbered mark from vision_browse), tabs, snapshot, open_tab, close_tab, focus_tab, wait, pdf, select, health, close_session. Must be enabled in Settings → Browser Tool.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["navigate", "screenshot", "content", "click", "type", "evaluate", "tabs", "snapshot", "open_tab", "close_tab", "focus_tab", "wait", "pdf", "select", "health", "smart_browse", "form_fill", "vision_browse", "vision_act", "scroll_down", "scroll_up", "close_session"],
            description: "navigate: go to URL. screenshot: capture page/element. content: extract text. click/type/select: interact with elements. evaluate: run JS. smart_browse: navigate+screenshot+extract content+find links in one step. form_fill: fill multiple form fields at once. vision_browse: AUTONOMOUS VISUAL MODE — injects numbered red marks (Set-of-Mark) over all interactable elements on the page and takes an annotated screenshot. Returns element map with mark numbers, scroll position, visual diff warnings, and overlay detection. Use this + vision_act for goal-oriented autonomous web interaction. vision_act: execute an action on a specific numbered mark from vision_browse (click, type, hover, select). Returns pageChanged boolean — if false, your action had no effect, try something different. scroll_down: scroll viewport down by 80% and re-annotate with SoM (use when target element is below the fold). scroll_up: scroll viewport up by 80% and re-annotate. tabs: list tabs. snapshot: DOM tree. open_tab/close_tab/focus_tab: tab management. wait: pause N ms. pdf: save as PDF. health: check connection. close_session: end your browser session.",
          },
          url: { type: "string", description: "URL (for navigate, open_tab, smart_browse, vision_browse)" },
          selector: { type: "string", description: "CSS selector (for click, type, content, screenshot, select)" },
          text: { type: "string", description: "Text to type (for type action and vision_act type action)" },
          value: { type: "string", description: "Value to select (for select action on <select> elements)" },
          script: { type: "string", description: "JavaScript to evaluate (for evaluate action). No fetch/eval/import." },
          fullPage: { type: "boolean", description: "Full page screenshot (default: false)" },
          returnBase64: { type: "boolean", description: "Include base64 screenshot data in response (for screenshot and vision_browse)" },
          tabIndex: { type: "number", description: "Target tab index (for actions on specific tabs)" },
          ms: { type: "number", description: "Wait duration in milliseconds (for wait action, max 10000)" },
          mark: { type: "number", description: "For vision_act: the mark number from the annotated screenshot to interact with" },
          type: { type: "string", enum: ["click", "type", "hover", "select"], description: "For vision_act: the interaction type to perform on the marked element" },
          scrollY: { type: "number", description: "For vision_browse: scroll to Y position before annotating (pixels from top)" },
          profile: { type: "string", description: "Browser profile name (default: uses default profile)" },
          fields: {
            type: "array",
            description: "For form_fill: array of fields to fill. Each has selector, value, and optional type ('type'|'select'|'click')",
            items: {
              type: "object",
              properties: {
                selector: { type: "string" },
                value: { type: "string" },
                type: { type: "string", enum: ["type", "select", "click"] },
              },
              required: ["selector", "value"],
            },
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "site_login",
      description: "Log into a website using credentials stored in the Credential Vault. Navigates to the site, finds the login form, auto-fills username/password from the vault, and submits. If no vault entry exists for the site, returns an error asking the user to add credentials first. Supports password-based logins. For OAuth/SSO logins, use the browser tool directly after retrieving credentials.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The login page URL to authenticate on" },
          usernameSelector: { type: "string", description: "Optional CSS selector for the username/email field. Auto-detected if omitted." },
          passwordSelector: { type: "string", description: "Optional CSS selector for the password field. Auto-detected if omitted." },
          submitSelector: { type: "string", description: "Optional CSS selector for the submit/login button. Auto-detected if omitted." },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "youtube",
      description: "Manage YouTube channel via YouTube Data API v3. Requires YouTube OAuth to be connected. Actions: channel_info (get channel stats), list_videos (recent uploads), video_details (get info about a specific video), search_videos (search channel), list_comments (get comments on a video), reply_comment (reply to a comment), update_video (update title/description/tags), list_playlists (get playlists), upload_video (upload a video file from Google Drive or local path).",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["channel_info", "list_videos", "video_details", "search_videos", "list_comments", "reply_comment", "update_video", "list_playlists", "upload_video"],
            description: "The YouTube API action to perform",
          },
          videoId: { type: "string", description: "Video ID (for video_details, list_comments, reply_comment, update_video)" },
          query: { type: "string", description: "Search query (for search_videos)" },
          commentId: { type: "string", description: "Comment ID (for reply_comment)" },
          text: { type: "string", description: "Reply text (for reply_comment) or video description (for update_video)" },
          title: { type: "string", description: "Video title (for update_video, upload_video)" },
          tags: { type: "array", items: { type: "string" }, description: "Video tags (for update_video)" },
          maxResults: { type: "number", description: "Max results to return (default 10, max 50)" },
          filePath: { type: "string", description: "Path to video file (for upload_video)" },
          description: { type: "string", description: "Video description (for upload_video)" },
          privacyStatus: { type: "string", enum: ["public", "unlisted", "private"], description: "Privacy status (for upload_video, default: private)" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lobster",
      description: "Run deterministic multi-step workflows with approval gates and resume tokens. Chain commands/tools into pipelines. Supports inline pipelines (pipe-separated commands), .lobster workflow files (YAML), and approval checkpoints that pause execution until approved. Use for complex multi-step operations that should run as one atomic sequence.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["run", "resume", "list", "get"],
            description: "run: execute a pipeline or workflow file. resume: continue a paused workflow after approval. list: show available workflow files and pending approvals. get: show details of a specific workflow file.",
          },
          pipeline: {
            type: "string",
            description: "For run: inline pipeline (pipe-separated commands) or .lobster workflow file path. Examples: 'echo hello | jq .' or 'inbox-triage.lobster'",
          },
          token: {
            type: "string",
            description: "For resume: the resumeToken from a needs_approval response",
          },
          approve: {
            type: "boolean",
            description: "For resume: true to approve and continue, false to cancel (default: true)",
          },
          argsJson: {
            type: "string",
            description: "JSON string of arguments for workflow files (e.g. '{\"tag\":\"family\"}')",
          },
          timeoutMs: {
            type: "number",
            description: "Per-step timeout in milliseconds (default: 20000)",
          },
          maxStdoutBytes: {
            type: "number",
            description: "Max stdout bytes per step (default: 512000)",
          },
          workflowId: {
            type: "string",
            description: "For get: workflow file name to inspect",
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_and_execute",
      description: "Autonomously break a complex goal into ordered steps and execute them. The planner decomposes the goal, runs each step (using tools or LLM sub-tasks), handles dependencies between steps, and returns a structured report. Use for multi-step tasks that require coordination: research → analyze → act, build → test → deploy, etc.",
      parameters: {
        type: "object",
        properties: {
          goal: { type: "string", description: "The complex goal to accomplish (be specific)" },
          context: { type: "string", description: "Optional additional context, constraints, or preferences" },
        },
        required: ["goal"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_code",
      description: "Execute JavaScript code in a secure sandbox. Supports math, data transforms, JSON processing, string manipulation, regex, and logic. No file system, network, or module access. Use for calculations, data analysis, format conversions, algorithm testing, or any computation the user needs. Returns stdout output and execution time.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "JavaScript code to execute. Use console.log() for output. Has access to Math, Date, JSON, Array, Object, Map, Set, RegExp, BigInt, Intl, and standard built-ins." },
          description: { type: "string", description: "Brief description of what the code does (for logging)" },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deep_research",
      description: "Conduct multi-source research on a topic. Generates diverse search queries, searches the web, fetches top sources, and synthesizes findings into a structured report with sources, confidence level, and follow-up questions. Use for thorough investigation requiring multiple perspectives, fact verification, or comprehensive analysis.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The research question to investigate" },
          depth: { type: "string", enum: ["quick", "standard", "thorough"], description: "Research depth: quick (1 search), standard (2 searches + source fetching), thorough (3 searches + deep analysis). Default: standard" },
        },
        required: ["question"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_tool",
      description: "Create a new custom tool that the AI agent can use in future conversations. Describe what the tool should do and the system will generate a safe, sandboxed implementation. Created tools persist across conversations. Use when a recurring task would benefit from a dedicated tool rather than repeated manual steps.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "What the tool should do — be specific about inputs, outputs, and behavior" },
        },
        required: ["description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_custom_tools",
      description: "List all custom tools that have been created through the tool learning system. Shows name, description, usage count, and active status.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_custom_tool",
      description: "Delete a custom tool by name. Permanently removes it from the tool registry.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name of the custom tool to delete (e.g., custom_calculator)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_skills",
      description: "Create, list, update, enable/disable, or delete skills. Skills are reusable prompt instructions that teach you (or other agents) how to handle specific workflows, domains, or capabilities. Use 'create' to build a new skill when you encounter a task type you'll need again. Use 'list' to see what skills exist. Use 'update' to improve an existing skill's instructions. Use 'enable'/'disable' to toggle skills. Use 'delete' to remove a skill.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", enum: ["create", "list", "update", "enable", "disable", "delete"], description: "The operation to perform" },
          id: { type: "number", description: "Skill ID (required for update, enable, disable, delete)" },
          name: { type: "string", description: "Skill name (required for create)" },
          description: { type: "string", description: "Short description of what the skill teaches (required for create)" },
          promptContent: { type: "string", description: "The full skill instructions — what to do, step-by-step, tool usage patterns, examples. This gets injected into the system prompt when the skill is active. (required for create, optional for update)" },
          category: { type: "string", description: "Category for organization (e.g., 'writing', 'coding', 'research', 'automation'). Default: 'general'" },
          icon: { type: "string", description: "Lucide icon name (e.g., 'Wrench', 'FileText', 'Code'). Default: 'Zap'" },
          personaId: { type: "number", description: "Optional: assign skill to a specific persona. Omit for global skills." },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_experiment",
      description: "Log a self-improvement experiment with hypothesis, approach, and results. Used to track what the agent has tried and whether it worked.",
      parameters: {
        type: "object",
        properties: {
          hypothesis: { type: "string", description: "What you hypothesize will improve (e.g., 'Adding chain-of-thought will improve accuracy')" },
          approach: { type: "string", description: "The specific change or technique applied" },
          category: { type: "string", description: "Category: prompt_optimization, response_quality, tool_usage, persona_tuning, or general" },
          metric: { type: "string", description: "What metric was measured (e.g., accuracy, completeness)" },
          baselineValue: { type: "string", description: "Baseline measurement before the experiment" },
          resultValue: { type: "string", description: "Result measurement after the experiment" },
          status: { type: "string", enum: ["kept", "reverted", "inconclusive", "running"], description: "Outcome status" },
          outcome: { type: "string", description: "Human-readable summary of what happened" },
        },
        required: ["hypothesis", "approach", "category", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_experiments",
      description: "Retrieve experiment history — a log of self-improvement attempts, their hypotheses, approaches, and outcomes.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Filter by category (prompt_optimization, response_quality, tool_usage, persona_tuning, general)" },
          limit: { type: "number", description: "Max experiments to return (default 20)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_self_improvement",
      description: "Launch an autonomous self-improvement cycle with signal extraction and stagnation detection. Scans runtime logs for error patterns, detects repeated failures, auto-selects evolution strategy (balanced/innovate/harden/repair-only), then runs A/B experiments. Inspired by Karpathy's autoresearch + EvoMap's Capability Evolver.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["prompt_optimization", "response_quality", "tool_usage", "persona_tuning"], description: "What area to optimize (default: response_quality)" },
          personaId: { type: "number", description: "Optional persona ID to optimize for a specific agent" },
          strategy: { type: "string", enum: ["balanced", "innovate", "harden", "repair-only"], description: "Evolution strategy preset. If omitted, auto-selects based on runtime signals and stagnation detection." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_social_post",
      description: "Draft a social media post for VisionClaw Health marketing. Generates platform-optimized content using AI with brand voice guidelines. Returns draft text ready for review/posting.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["x", "linkedin", "tiktok", "instagram"], description: "Target social media platform" },
          topic: { type: "string", description: "What the post should be about" },
          style: { type: "string", enum: ["announcement", "insight", "question", "thread", "hot-take", "build-in-public", "educational", "user-success"], description: "Content style/format" },
          include_cta: { type: "boolean", description: "Include a call-to-action (default true)" },
          include_hashtags: { type: "boolean", description: "Include relevant hashtags (default true)" },
        },
        required: ["platform", "topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_content_calendar",
      description: "Manage the social media content calendar. Add scheduled posts, view upcoming posts, or remove scheduled items.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "list", "remove", "clear_past"], description: "Calendar action" },
          platform: { type: "string", enum: ["x", "linkedin", "tiktok", "instagram", "all"], description: "Platform filter" },
          content: { type: "string", description: "Post content (for add action)" },
          scheduled_date: { type: "string", description: "ISO date string for scheduling (for add action)" },
          post_id: { type: "string", description: "Post ID to remove (for remove action)" },
          style: { type: "string", description: "Content style tag" },
          campaign: { type: "string", description: "Campaign name to group posts" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marketing_analytics",
      description: "Track and analyze social media marketing performance. Log post results, view campaign analytics, and get optimization recommendations.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["log_result", "view_analytics", "top_performers", "recommendations"], description: "Analytics action" },
          platform: { type: "string", description: "Platform filter" },
          post_content: { type: "string", description: "The post content (for log_result)" },
          metrics: {
            type: "object",
            description: "Post performance metrics",
            properties: {
              views: { type: "number" },
              likes: { type: "number" },
              replies: { type: "number" },
              reposts: { type: "number" },
              clicks: { type: "number" },
              bookmarks: { type: "number" },
            },
          },
          date_range: { type: "string", enum: ["today", "week", "month", "all"], description: "Time period for analytics" },
          campaign: { type: "string", description: "Campaign filter" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marketing_experiment",
      description: "Run and track marketing A/B experiments. Create hypotheses, log variants, record results, and determine winners.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["create", "log_result", "get_winner", "list"], description: "Experiment action" },
          experiment_name: { type: "string", description: "Name of the experiment" },
          hypothesis: { type: "string", description: "What you expect to happen" },
          variant_a: { type: "string", description: "First variant content/approach" },
          variant_b: { type: "string", description: "Second variant content/approach" },
          variant_a_metrics: { type: "object", description: "Metrics for variant A" },
          variant_b_metrics: { type: "object", description: "Metrics for variant B" },
          learning: { type: "string", description: "Key takeaway from the experiment" },
          next_action: { type: "string", description: "What to do based on results" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_audio",
      description: "Generate audio narration from text using text-to-speech. Default provider is VibeVoice (free, no token costs). Saves the audio file and uploads to Google Drive. Use this to create voiceover narration for videos, podcasts, or audio content. ALWAYS use the default VibeVoice provider unless the user specifically requests ElevenLabs or OpenAI.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "The text to convert to speech. Can be a full script or narration." },
          voice: { type: "string", description: "Voice to use. For VibeVoice: Carter, Alyssa, Angelo, Bella, Davis, Elijah, Evelyn, James, Joanna, Kenji, Madeline, Nova. For ElevenLabs: any voice ID. For OpenAI: alloy, echo, fable, onyx, nova, shimmer. Default: Carter." },
          provider: { type: "string", enum: ["vibevoice", "elevenlabs", "openai"], description: "TTS provider. Default: vibevoice (free). Use elevenlabs or openai only as fallback." },
          filename: { type: "string", description: "Output filename (without extension). Default: 'narration'" },
          project_id: { type: "number", description: "Project ID to attach the audio file to (optional)" },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "produce_video",
      description: "ONE-SHOT video production: generates TTS audio from script text, assembles MP4 with slides + audio, uploads to Google Drive, and optionally emails the link. If pdf_path is provided and valid it uses those slides; otherwise it AUTO-GENERATES text slides from the script. Use this instead of chaining generate_audio + create_slideshow_video separately. This is the PREFERRED way to make videos — works even without a PDF.",
      parameters: {
        type: "object",
        properties: {
          script: { type: "string", description: "The narration script text. Will be converted to audio via TTS." },
          pdf_path: { type: "string", description: "Path to PDF slide deck (optional). If missing or corrupt, text slides are auto-generated from the script." },
          title: { type: "string", description: "Video title (used in filename and metadata). Default: 'video'" },
          voice_provider: { type: "string", enum: ["vibevoice", "elevenlabs", "openai"], description: "TTS provider for narration. Default: vibevoice (free). Use elevenlabs or openai only if user requests." },
          email_to: { type: "string", description: "Email address to send the Drive link to (optional)" },
          project_id: { type: "number", description: "Project ID to register the video file (optional)" },
        },
        required: ["script"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_slideshow_video",
      description: "Create a video from a PDF slide deck or images + optional audio narration using FFmpeg. Automatically converts PDF pages to images. Upload results to Google Drive. PREFERRED: pass pdf_path to auto-convert a PDF deck into video slides.",
      parameters: {
        type: "object",
        properties: {
          pdf_path: { type: "string", description: "Path to a PDF slide deck. Pages will be auto-converted to images. Use this instead of slides array when you have a PDF." },
          slides: {
            type: "array",
            items: { type: "object", properties: { image_path: { type: "string", description: "Path to image file" }, duration: { type: "number", description: "Duration in seconds for this slide (default: calculated from audio or 5s)" } } },
            description: "Array of slide objects with image paths. Alternative to pdf_path.",
          },
          audio_path: { type: "string", description: "Path to audio narration file (mp3/wav). If provided, video length matches audio." },
          output_filename: { type: "string", description: "Output video filename (without extension). Default: 'slideshow_video'" },
          project_id: { type: "number", description: "Project ID to attach the video file to (optional)" },
          title: { type: "string", description: "Title for the video (used in metadata)" },
          duration_per_slide: { type: "number", description: "Duration in seconds per slide when using pdf_path. Default: auto-calculated from audio length." },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_social_image",
      description: "Generate an AI image for social media posts, marketing materials, or visual content. Creates the image using AI, uploads it to Google Drive, and returns a shareable link. Use this when you need a visual to accompany a social media post, blog, or marketing campaign.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed description of the image to generate. Be specific about style, colors, composition, and subject matter. For social media, include the platform dimensions (e.g., 'square format for Instagram', '16:9 for Twitter header')." },
          style: { type: "string", enum: ["professional", "minimalist", "vibrant", "tech", "corporate", "creative", "photorealistic", "illustration", "infographic"], description: "Visual style for the image" },
          platform: { type: "string", enum: ["x", "linkedin", "instagram", "facebook", "blog", "general"], description: "Target platform (affects recommended dimensions/style)" },
          folder_label: { type: "string", description: "Google Drive folder name for organization (default: 'Social Media Images')" },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compose_social_post",
      description: "Create a complete social media post with both text content AND a matching AI-generated image. Returns a ready-to-publish package with the drafted text, generated image (uploaded to Google Drive), and a preview. This is the all-in-one tool for creating complete social media content.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["x", "linkedin", "instagram", "facebook"], description: "Target social media platform" },
          topic: { type: "string", description: "What the post should be about" },
          style: { type: "string", enum: ["announcement", "insight", "question", "thread", "hot-take", "build-in-public", "educational", "user-success"], description: "Content style/format" },
          image_style: { type: "string", enum: ["professional", "minimalist", "vibrant", "tech", "corporate", "creative", "photorealistic", "illustration"], description: "Visual style for the accompanying image" },
          image_prompt: { type: "string", description: "Optional custom image prompt. If not provided, one will be auto-generated from the post topic." },
          campaign: { type: "string", description: "Campaign name for tracking" },
          save_draft: { type: "boolean", description: "Save as draft post for later publishing (default true)" },
        },
        required: ["platform", "topic"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "publish_social_post",
      description: "Publish a social media post to a connected platform account (X/Twitter, LinkedIn, or Instagram). Requires the platform account to be connected via Settings → Social Media. Can publish text-only or text+image posts.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["x", "linkedin", "instagram"], description: "Platform to publish to" },
          content: { type: "string", description: "Post text content" },
          image_drive_url: { type: "string", description: "Google Drive URL of the image to include (from generate_social_image)" },
          campaign: { type: "string", description: "Campaign name for tracking" },
        },
        required: ["platform", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "manage_social_accounts",
      description: "View and manage connected social media accounts for publishing. List connected platforms, check connection status, or get setup instructions.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "status", "platforms"], description: "Action to perform" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "orchestrate",
      description: "CEO Orchestrator: Break a complex, multi-step objective into a DAG execution plan and delegate each step to the right specialist persona. Use this when a request requires multiple departments (research + writing, analysis + reporting, etc.). The CEO plans and delegates — never does the work directly.",
      parameters: {
        type: "object",
        properties: {
          objective: { type: "string", description: "The full objective to orchestrate (e.g., 'Research AI browser agents, write a blog post, and draft an investor email')" },
        },
        required: ["objective"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "critique_response",
      description: "Request a quality critique of content before sending it. A specialized Critique Agent evaluates accuracy, completeness, relevance, and clarity on a 1-10 scale and provides improvement suggestions. Use this for important deliverables — reports, analyses, recommendations — before presenting to the user.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The content to critique (draft response, report, analysis, etc.)" },
          context: { type: "string", description: "Context about what this content is for (e.g., 'financial analysis for Q4 report')" },
        },
        required: ["content", "context"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "debate",
      description: "Initiate a Chain of Debates — convene 3-4 relevant specialist personas to deliberate on a complex question from their unique perspectives (financial, legal, technical, strategic, etc.). Each persona argues their position, then a synthesis produces a final recommendation with consensus level. Use for major decisions requiring multi-disciplinary analysis.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The question or decision to deliberate (e.g., 'Should we expand into the European market this quarter?')" },
          participantCount: { type: "number", description: "Number of debaters (3-6, default 4)" },
        },
        required: ["question"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "tree_of_thought",
      description: "Apply Tree-of-Thought reasoning — generate multiple distinct reasoning paths for a complex question, score each branch on soundness/completeness, and select or synthesize the best answer. Use when a problem has multiple valid approaches and you want to explore them systematically before committing to an answer.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The question or problem to reason about with multiple branches" },
          branchCount: { type: "number", description: "Number of reasoning branches to explore (2-5, default 3)" },
          context: { type: "string", description: "Additional context or constraints to consider" },
        },
        required: ["question"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "estimate_cost",
      description: "Predict resource consumption before executing a plan — estimate token usage, API costs, time, and risk level. Use before plan_and_execute or orchestrate to give the user visibility into what an operation will cost.",
      parameters: {
        type: "object",
        properties: {
          steps: {
            type: "array",
            description: "Array of planned steps with optional tool names",
            items: {
              type: "object",
              properties: {
                tool: { type: "string", description: "Tool name if step uses a tool" },
                description: { type: "string", description: "What this step does" },
              },
            },
          },
          modelId: { type: "string", description: "Model ID to estimate costs for (default: gpt-5-mini)" },
        },
        required: ["steps"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "manage_desk",
      description: "Manage your persistent working state — update task progress, add items to your desk, mark things as blocked or completed. Your desk persists across conversations and heartbeat cycles so you always know what you were working on.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add_task", "update_task", "complete_task", "block_task", "unblock_task", "add_to_queue", "pick_from_queue", "set_focus", "set_status", "add_waiting", "resolve_waiting", "view_desk"], description: "Action to perform on your desk" },
          taskId: { type: "string", description: "Task ID for updates/complete/block/unblock" },
          title: { type: "string", description: "Task title for add_task or add_to_queue" },
          description: { type: "string", description: "Task description" },
          priority: { type: "string", enum: ["critical", "high", "medium", "low"], description: "Task priority" },
          progressNote: { type: "string", description: "Progress update note for update_task" },
          blockedBy: { type: "string", description: "What is blocking this task" },
          focusArea: { type: "string", description: "Current focus area for set_focus" },
          statusNote: { type: "string", description: "Status note for set_status" },
          waitingForPersona: { type: "string", description: "Persona name you are waiting on" },
          waitingDescription: { type: "string", description: "What you are waiting for" },
          source: { type: "string", enum: ["sprint_plan", "delegation", "event", "self_initiated"], description: "Where this task came from" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "post_to_channel",
      description: "Post a message to an internal communication channel. Other personas subscribed to the channel will receive and can act on your message. Use for briefs, alerts, status updates, and cross-team communication.",
      parameters: {
        type: "object",
        properties: {
          channel: { type: "string", description: "Channel name (e.g., '#content-pipeline', '#revenue-alerts', '#engineering', '#intelligence', '#general')" },
          content: { type: "string", description: "Message content" },
          messageType: { type: "string", enum: ["message", "brief", "alert", "request", "response", "status_update"], description: "Type of message" },
          metadata: { type: "object", description: "Structured data to attach" },
          threadId: { type: "number", description: "Reply to a specific message thread" },
        },
        required: ["channel", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_channels",
      description: "Read recent messages from internal communication channels. Use to stay updated on what other personas are communicating about.",
      parameters: {
        type: "object",
        properties: {
          channel: { type: "string", description: "Specific channel to read (omit for all subscribed channels)" },
          unreadOnly: { type: "boolean", description: "Only show unread messages (default: true)" },
          limit: { type: "number", description: "Max messages to return (default: 20)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "emit_event",
      description: "Emit a business event to the event bus. Other personas subscribed to this event type will be notified and can take action. Use this when you detect something that other departments should know about — new leads, content published, deals progressed, etc.",
      parameters: {
        type: "object",
        properties: {
          eventType: { type: "string", description: "Event type (e.g., 'lead.qualified', 'content.published', 'deal.stage_changed', 'agent.task.completed')" },
          data: { type: "object", description: "Event payload with relevant details" },
        },
        required: ["eventType", "data"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "track_outcome",
      description: "Track an action's expected outcome for later measurement. Use after performing trackable actions (emails sent, content published, deals proposed, outreach completed) to enable learning from results. You can also record measured outcomes when results become available.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["track", "record_result", "view", "view_patterns"], description: "Action to perform" },
          actionType: { type: "string", description: "Type: email_sent, content_published, outreach_sent, deal_proposal, task_completed" },
          actionRef: { type: "string", description: "Reference ID (email ID, URL, deal ID)" },
          description: { type: "string", description: "What was done" },
          expectedOutcome: { type: "string", description: "Expected result (e.g., 'prospect replies within 3 days')" },
          expectedMetric: { type: "string", description: "Metric to track: reply_rate, engagement, conversion, views" },
          expectedValue: { type: "number", description: "Predicted value" },
          outcomeId: { type: "number", description: "ID of outcome to update (for record_result)" },
          actualValue: { type: "number", description: "Measured value (for record_result)" },
          actualOutcome: { type: "string", description: "What actually happened (for record_result)" },
          status: { type: "string", enum: ["success", "partial", "failure", "unknown"], description: "Result status" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "manage_watchlist",
      description: "Manage persistent monitoring watchlists. Set up tracking for competitors, industry trends, customer mentions, technology changes, or regulatory updates. Items are automatically scanned on schedule and alerts are generated when changes are detected.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["add", "update", "remove", "list", "view_alerts", "scan_now"], description: "Action to perform" },
          name: { type: "string", description: "Watchlist item name (e.g., 'Competitor: ServiceTitan')" },
          category: { type: "string", enum: ["competitor", "industry", "customer", "technology", "regulation"], description: "Category" },
          searchQueries: { type: "array", items: { type: "string" }, description: "Search queries to monitor" },
          keywords: { type: "array", items: { type: "string" }, description: "Alert keywords within results" },
          checkFrequency: { type: "string", enum: ["hourly", "daily", "weekly"], description: "How often to check" },
          escalateTo: { type: "string", description: "Persona name to alert on findings" },
          watchlistItemId: { type: "number", description: "Item ID (for update/remove)" },
          alertId: { type: "number", description: "Alert ID (for acknowledging)" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "finance_news",
      description: "Fetch real-time financial and trending news from multiple global sources. Returns ranked headlines with links. Sources include Cailian Press, WallStreetCN, Xueqiu (Snowball), Hacker News, Weibo, Baidu, and more. Use for market research, trend monitoring, competitive intelligence, or staying current on financial markets.",
      parameters: {
        type: "object",
        properties: {
          sources: {
            type: "array",
            items: { type: "string", enum: ["cls", "wallstreetcn", "xueqiu", "weibo", "zhihu", "baidu", "toutiao", "thepaper", "36kr", "hackernews"] },
            description: "News sources to fetch from. Finance: cls (Cailian), wallstreetcn, xueqiu. Social: weibo, zhihu, baidu. Tech: 36kr, hackernews. Default: cls, wallstreetcn, hackernews",
          },
          count: { type: "number", description: "Number of headlines per source (1-20). Default: 10" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "finance_stock_price",
      description: "Get historical stock price data (OHLCV) for A-Share and Hong Kong stocks. Returns daily open/high/low/close/volume with change percentages and a summary. Use for stock analysis, price tracking, trend identification, or financial reporting.",
      parameters: {
        type: "object",
        properties: {
          ticker: { type: "string", description: "Stock ticker code (e.g., '600519' for Kweichow Moutai, '00700' for Tencent HK). Must be a numeric code." },
          days: { type: "number", description: "Number of days of history to retrieve (1-365). Default: 30" },
        },
        required: ["ticker"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "finance_stock_search",
      description: "Search for stock tickers by company name or code. Supports A-Share (Shanghai/Shenzhen) and Hong Kong markets. Returns matching ticker codes and company names. Use when you need to find the ticker code for a company before looking up its price.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Company name or partial ticker code to search for (e.g., 'Moutai', '600519', 'Tencent')" },
          market: { type: "string", enum: ["a", "hk"], description: "Market to search: 'a' for A-Share (default), 'hk' for Hong Kong" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "finance_market_overview",
      description: "Get a snapshot of major market indices with current values and daily change percentages. Covers Chinese A-share market indices. Use for quick market pulse checks, daily briefings, or as context for financial analysis.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "strategic_interview",
      description: "Conduct a structured Socratic interview to clarify vague or complex requests before execution. Asks focused questions across 7 business dimensions (goal, audience, constraints, differentiation, risks, metrics, scope), scores clarity in real-time, and produces a Strategic Brief when clarity threshold is met. Use when the user says something vague like 'build me an app', 'help with marketing', 'I have a business idea', or any request that needs clarification before diving in. Do NOT use for simple, clear requests.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["start", "answer", "abandon"], description: "start=begin new interview, answer=respond to a question, abandon=cancel interview" },
          topic: { type: "string", description: "The topic or idea to interview about (required for 'start')" },
          interview_id: { type: "string", description: "The interview ID (required for 'answer' and 'abandon')" },
          answer: { type: "string", description: "The user's answer to the current question (required for 'answer')" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "export_persona",
      description: "Export any VisionClaw persona as a portable agent definition file. Produces a comprehensive package with the persona's identity (SOUL), trust profile, skills, tools, governance rules, express lanes, and knowledge domains. Output in JSON or markdown format. Use when the user wants to save, share, document, or back up an agent's full configuration.",
      parameters: {
        type: "object",
        properties: {
          persona_id: { type: "number", description: "ID of the persona to export (1=VisionClaw, 2=Felix, etc.)" },
          format: { type: "string", enum: ["json", "markdown"], description: "Output format. json=structured data, markdown=human-readable document. Default: markdown" },
        },
        required: ["persona_id"],
      },
    },
  },
];

import { TEST_MODEL_IDS } from "./providers";
const testModels = TEST_MODEL_IDS;

async function testApiKeys() {
  const keys = await storage.getProviderKeys();
  const results: Record<string, any> = {};
  results["replit"] = { connected: true, provider: "Replit AI (Built-in)", detail: "Always available" };

  for (const key of keys) {
    if (!key.enabled) {
      results[key.provider] = { connected: false, provider: PROVIDER_CONFIG[key.provider]?.name || key.provider, detail: "Key disabled" };
      continue;
    }

    if (key.provider === "google_drive_token") {
      const start = Date.now();
      try {
        const { forceTokenRefresh, getDriveFolderInfo } = await import("./google-drive");
        await forceTokenRefresh();
        const info = await getDriveFolderInfo();
        const latencyMs = Date.now() - start;
        if (info.success) {
          results[key.provider] = { connected: true, provider: "Google Drive", detail: `OK - ${info.fileCount} files in backup folder (${latencyMs}ms)`, latencyMs };
        } else {
          results[key.provider] = { connected: false, provider: "Google Drive", detail: info.error || "Failed to connect", latencyMs };
        }
      } catch (err: any) {
        results[key.provider] = { connected: false, provider: "Google Drive", detail: err.message?.slice(0, 200) || "Unknown error", latencyMs: Date.now() - start };
      }
      continue;
    }

    const modelId = testModels[key.provider];
    if (!modelId) {
      results[key.provider] = { connected: false, provider: PROVIDER_CONFIG[key.provider]?.name || key.provider, detail: "Unknown provider" };
      continue;
    }
    const start = Date.now();
    try {
      if (key.provider === "xai") {
        const apiKey = key.apiKey;
        const resp = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: "Reply with only the word: connected" }], max_tokens: 10 }),
        });
        const latencyMs = Date.now() - start;
        if (!resp.ok) {
          const errBody = await resp.text().catch(() => "");
          throw new Error(`${resp.status} ${errBody.slice(0, 150)}`);
        }
        const data = await resp.json() as any;
        const reply = data.choices?.[0]?.message?.content?.trim() || "";
        results[key.provider] = { connected: true, provider: PROVIDER_CONFIG[key.provider]?.name || key.provider, detail: `OK - "${reply}" (${latencyMs}ms)`, latencyMs };
      } else {
        const { client, actualModelId } = await getClientForModel(modelId);
        const response = await client.chat.completions.create({
          model: actualModelId,
          messages: [{ role: "user", content: "Reply with only the word: connected" }],
          max_tokens: 10,
        });
        const latencyMs = Date.now() - start;
        const reply = response.choices?.[0]?.message?.content?.trim() || "";
        results[key.provider] = { connected: true, provider: PROVIDER_CONFIG[key.provider]?.name || key.provider, detail: `OK - "${reply}" (${latencyMs}ms)`, latencyMs };
      }
    } catch (err: any) {
      results[key.provider] = { connected: false, provider: PROVIDER_CONFIG[key.provider]?.name || key.provider, detail: err.message?.slice(0, 200) || "Error", latencyMs: Date.now() - start };
    }
  }

  if (!results["google_drive_token"]) {
    const start = Date.now();
    try {
      const { forceTokenRefresh, getDriveFolderInfo } = await import("./google-drive");
      await forceTokenRefresh();
      const info = await getDriveFolderInfo();
      const latencyMs = Date.now() - start;
      if (info.success) {
        results["google_drive_token"] = { connected: true, provider: "Google Drive", detail: `OK - ${info.fileCount} files in backup folder (${latencyMs}ms)`, latencyMs };
      } else {
        results["google_drive_token"] = { connected: false, provider: "Google Drive", detail: info.error || "Failed to connect", latencyMs };
      }
    } catch (err: any) {
      results["google_drive_token"] = { connected: false, provider: "Google Drive", detail: err.message?.slice(0, 200) || "Token unavailable", latencyMs: Date.now() - start };
    }
  }

  return results;
}

async function checkSystemStatus() {
  const [convResult, settings, persona, memStats, heartbeatRunning, tasks, logs] = await Promise.all([
    storage.getConversations(),
    storage.getSettings(),
    storage.getActivePersona(),
    storage.getMemoryStats(),
    Promise.resolve(isHeartbeatRunning()),
    storage.getHeartbeatTasks(),
    storage.getHeartbeatLogs(5),
  ]);
  const conversations = convResult.data;
  const [msgCountResult] = await db.select({ count: sql<number>`count(*)::int` }).from(messagesTable);

  return {
    uptime: process.uptime(),
    totalConversations: convResult.total,
    totalMessages: msgCountResult.count,
    activePersona: persona ? { name: persona.name, role: persona.role } : null,
    memory: memStats,
    heartbeat: {
      running: heartbeatRunning,
      totalTasks: tasks.length,
      enabledTasks: tasks.filter((t) => t.enabled).length,
      recentLogs: logs.map((l) => ({ task: l.taskName, status: l.status, ranAt: l.createdAt })),
    },
    agentName: settings?.agentName || "VisionClaw",
  };
}

async function searchMemory(query: string) {
  const persona = await storage.getActivePersona();
  try {
    const { vectorSearchMemory } = await import("./embeddings");
    const results = await vectorSearchMemory(query, { personaId: persona?.id, topK: 20 });
    if (results.length > 0) {
      return { count: results.length, searchType: "semantic", results: results.map((m) => ({ id: m.id, fact: m.fact, category: m.category, similarity: m.similarity })) };
    }
  } catch {}
  const memResult = await storage.getMemoryEntries(persona?.id);
  const q = query.toLowerCase();
  const matches = memResult.data
    .filter((m) => m.status === "active" && (m.fact.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)))
    .slice(0, 20);
  return { count: matches.length, searchType: "keyword", total: memResult.total, results: matches.map((m) => ({ id: m.id, fact: m.fact, category: m.category, lastAccessed: m.lastAccessed })) };
}

async function handleProject(params: Record<string, any>) {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  const tenantId = params._tenantId || 1;

  switch (params.command) {
    case "create": {
      if (!params.name) return { error: "name is required" };
      const tagArr = Array.isArray(params.tags) ? params.tags.map((t: string) => String(t).slice(0, 100)) : [];
      const cRes = await db.execute(sql`
        INSERT INTO projects (name, description, status, customer_name, customer_email, tags, tenant_id)
        VALUES (${params.name}, ${params.description || ''}, ${params.status || 'active'}, ${params.customerName || null}, ${params.customerEmail || null}, ${tagArr}::text[], ${tenantId})
        RETURNING *
      `);
      const cRows = (cRes as any).rows || cRes;
      const newProject = Array.isArray(cRows) ? cRows[0] : cRows;
      if (newProject?.id && params._conversationId) {
        try {
          await db.execute(sql`UPDATE conversations SET project_id = ${newProject.id} WHERE id = ${params._conversationId}`);
          await db.execute(sql`INSERT INTO project_conversations (project_id, conversation_id) VALUES (${newProject.id}, ${params._conversationId}) ON CONFLICT DO NOTHING`);
        } catch {}
      }
      return { created: true, project: newProject };
    }
    case "get": {
      if (!params.id) return { error: "id is required" };
      const pRes = await db.execute(sql`SELECT * FROM projects WHERE id = ${params.id} AND tenant_id = ${tenantId}`);
      const pRows = (pRes as any).rows || pRes;
      const project = Array.isArray(pRows) ? pRows[0] : pRows;
      if (!project) return { error: "Project not found" };
      const files = await db.execute(sql`SELECT * FROM project_files WHERE project_id = ${params.id} ORDER BY created_at DESC`);
      const notes = await db.execute(sql`SELECT * FROM project_notes WHERE project_id = ${params.id} ORDER BY created_at DESC`);
      const convs = await db.execute(sql`
        SELECT pc.conversation_id, c.title, c.created_at
        FROM project_conversations pc
        JOIN conversations c ON c.id = pc.conversation_id
        WHERE pc.project_id = ${params.id}
        ORDER BY pc.linked_at DESC
      `);
      return { project, files: (files as any).rows || files, notes: (notes as any).rows || notes, conversations: (convs as any).rows || convs };
    }
    case "list": {
      const projects = await db.execute(sql`
        SELECT p.*, 
          (SELECT COUNT(*) FROM project_files WHERE project_id = p.id) as file_count,
          (SELECT COUNT(*) FROM project_notes WHERE project_id = p.id) as note_count,
          (SELECT COUNT(*) FROM project_conversations WHERE project_id = p.id) as conversation_count
        FROM projects p
        WHERE p.status != 'archived' AND p.tenant_id = ${tenantId}
        ORDER BY p.updated_at DESC
      `);
      return { projects: (projects as any).rows || projects };
    }
    case "update": {
      if (!params.id) return { error: "id is required" };
      const updates: any = {};
      if (params.name !== undefined) updates.name = params.name;
      if (params.description !== undefined) updates.description = params.description;
      if (params.status !== undefined) updates.status = params.status;
      if (params.customerName !== undefined) updates.customer_name = params.customerName;
      if (params.customerEmail !== undefined) updates.customer_email = params.customerEmail;
      if (Object.keys(updates).length === 0) return { error: "Nothing to update" };
      const chunks = [sql`UPDATE projects SET updated_at = CURRENT_TIMESTAMP`];
      if (updates.name !== undefined) chunks.push(sql`, name = ${updates.name}`);
      if (updates.description !== undefined) chunks.push(sql`, description = ${updates.description}`);
      if (updates.status !== undefined) chunks.push(sql`, status = ${updates.status}`);
      if (updates.customer_name !== undefined) chunks.push(sql`, customer_name = ${updates.customer_name}`);
      if (updates.customer_email !== undefined) chunks.push(sql`, customer_email = ${updates.customer_email}`);
      chunks.push(sql` WHERE id = ${params.id} AND tenant_id = ${tenantId}`);
      await db.execute(sql.join(chunks, sql.raw("")));
      return { updated: true, id: params.id };
    }
    case "add_file": {
      if (!params.id) return { error: "project id is required" };
      if (!params.filePath) return { error: "filePath is required" };
      const fname = params.filename || params.filePath.split("/").pop() || "file";
      const fRes = await db.execute(sql`
        INSERT INTO project_files (project_id, filename, original_name, file_type, mime_type, description, file_path, drive_link, drive_file_id)
        VALUES (${params.id}, ${fname}, ${fname}, ${params.fileType || 'document'}, ${params.mimeType || null}, ${params.fileDescription || ''}, ${params.filePath}, ${params.driveLink || null}, ${params.driveFileId || null})
        RETURNING *
      `);
      await db.execute(sql`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ${params.id}`);
      const fRows = (fRes as any).rows || fRes;
      return { added: true, file: Array.isArray(fRows) ? fRows[0] : fRows };
    }
    case "add_note": {
      if (!params.id) return { error: "project id is required" };
      if (!params.note) return { error: "note content is required" };
      const nRes = await db.execute(sql`
        INSERT INTO project_notes (project_id, note, author)
        VALUES (${params.id}, ${params.note}, ${params.author || 'agent'})
        RETURNING *
      `);
      await db.execute(sql`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ${params.id}`);
      const nRows = (nRes as any).rows || nRes;
      return { added: true, note: Array.isArray(nRows) ? nRows[0] : nRows };
    }
    case "link_conversation": {
      if (!params.id) return { error: "project id is required" };
      if (!params.conversationId) return { error: "conversationId is required" };
      const existing = await db.execute(sql`SELECT id FROM project_conversations WHERE project_id = ${params.id} AND conversation_id = ${params.conversationId}`);
      const exRows = (existing as any).rows || existing;
      if (Array.isArray(exRows) && exRows.length > 0) return { alreadyLinked: true };
      await db.execute(sql`
        INSERT INTO project_conversations (project_id, conversation_id)
        VALUES (${params.id}, ${params.conversationId})
      `);
      await db.execute(sql`UPDATE conversations SET project_id = ${params.id} WHERE id = ${params.conversationId}`);
      await db.execute(sql`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ${params.id}`);
      return { linked: true, projectId: params.id, conversationId: params.conversationId };
    }
    case "search": {
      const q = params.query || params.name || "";
      if (!q) return { error: "query or name is required" };
      const projects = await db.execute(sql`
        SELECT p.*,
          (SELECT COUNT(*) FROM project_files WHERE project_id = p.id) as file_count,
          (SELECT COUNT(*) FROM project_notes WHERE project_id = p.id) as note_count
        FROM projects p
        WHERE p.tenant_id = ${tenantId}
          AND (p.name ILIKE ${'%' + q + '%'}
          OR p.description ILIKE ${'%' + q + '%'}
          OR p.customer_name ILIKE ${'%' + q + '%'}
          OR EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE ${'%' + q + '%'}))
        ORDER BY p.updated_at DESC
      `);
      return { results: (projects as any).rows || projects };
    }
    default:
      return { error: `Unknown project command: ${params.command}` };
  }
}

async function createMemory(fact: string, category: string, tenantId: number = 1) {
  const persona = await storage.getActivePersona();
  const personaId = persona?.id ?? null;

  try {
    const { findAndResolveContradictions } = await import("./memory-intelligence");
    const resolution = await findAndResolveContradictions(fact, category, personaId, tenantId);

    if (resolution.action === "skip") {
      return { skipped: true, fact, category, message: resolution.reason || "Duplicate memory detected" };
    }
    if (resolution.action === "update" && resolution.existingId) {
      await storage.updateMemoryEntry(resolution.existingId, { status: "superseded" });
      const entry = await storage.createMemoryEntry({ fact, category, source: "tool", status: "active", personaId, tenantId });
      const { generateEmbedding } = await import("./embeddings");
      generateEmbedding(fact).then(emb => { if (emb) storage.updateMemoryEmbedding(entry.id, emb).catch(() => {}); }).catch(() => {});
      return { updated: true, id: entry.id, fact, category, superseded: resolution.existingId, message: resolution.reason };
    }
  } catch {}

  const entry = await storage.createMemoryEntry({ fact, category, source: "tool", status: "active", personaId, tenantId });
  const { generateEmbedding } = await import("./embeddings");
  generateEmbedding(fact).then(emb => { if (emb) storage.updateMemoryEmbedding(entry.id, emb).catch(() => {}); }).catch(() => {});
  return { created: true, id: entry.id, fact: entry.fact, category: entry.category };
}

async function searchKnowledge(query: string) {
  const persona = await storage.getActivePersona();
  try {
    const { vectorSearchKnowledge } = await import("./embeddings");
    const results = await vectorSearchKnowledge(query, { personaId: persona?.id, topK: 10 });
    if (results.length > 0) {
      return { count: results.length, searchType: "semantic", results: results.map((k) => ({ id: k.id, title: k.title, category: k.category, content: k.content.slice(0, 500), similarity: k.similarity })) };
    }
  } catch {}
  const knResult = await storage.getKnowledge(persona?.id);
  const q = query.toLowerCase();
  const matches = knResult.data
    .filter((k) => k.title.toLowerCase().includes(q) || k.content.toLowerCase().includes(q) || k.category.toLowerCase().includes(q))
    .slice(0, 10);
  return { count: matches.length, searchType: "keyword", results: matches.map((k) => ({ id: k.id, title: k.title, category: k.category, content: k.content.slice(0, 500), priority: k.priority })) };
}

async function createKnowledge(title: string, content: string, category: string, priority?: number) {
  const persona = await storage.getActivePersona();
  const entry = await storage.createKnowledge({ title, content, category, priority: priority ?? 3, personaId: persona?.id ?? null });
  return { created: true, id: entry.id, title: entry.title };
}

async function getDailyNotes(date?: string) {
  const persona = await storage.getActivePersona();
  if (date) {
    const note = await storage.getDailyNote(date, persona?.id);
    return note ? { date, content: note.content } : { date, content: null, message: "No notes for this date" };
  }
  const notes = await storage.getRecentDailyNotes(7, persona?.id);
  return { days: notes.length, notes: notes.map((n) => ({ date: n.date, content: n.content?.slice(0, 500) })) };
}

async function listConversations(limit?: number) {
  const convResult = await storage.getConversations(limit || 20);
  return { total: convResult.total, conversations: convResult.data.map((c) => ({ id: c.id, title: c.title, model: c.model, thinking: c.thinking, updatedAt: c.updatedAt })) };
}

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "[::1]", "metadata.google.internal"]);

function isUrlSafe(urlStr: string): { safe: boolean; error?: string } {
  try {
    const parsed = new URL(urlStr);
    if (!["http:", "https:"].includes(parsed.protocol)) return { safe: false, error: "Only http/https URLs allowed" };
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return { safe: false, error: "Blocked host" };
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)) return { safe: false, error: "Private IP range blocked" };
    if (host.endsWith(".local") || host.endsWith(".internal")) return { safe: false, error: "Internal hostname blocked" };
    return { safe: true };
  } catch {
    return { safe: false, error: "Invalid URL" };
  }
}

async function webFetch(url: string) {
  const check = isUrlSafe(url);
  if (!check.safe) return { success: false, url, error: check.error };

  let extractionMethod = "readability";

  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const resp = await fetch(jinaUrl, {
      headers: { "Accept": "text/plain", "X-Return-Format": "text" },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`Jina HTTP ${resp.status}`);
    const text = await resp.text();
    if (text.trim().length < 100) throw new Error("Readability returned insufficient content");
    const truncated = text.slice(0, 8000);
    const { wrapped, suspicious } = wrapExternalContent(truncated, "web_fetch", { url });
    if (suspicious.length > 0) {
      console.log(`[security] Suspicious patterns in fetched content from ${url}:`, suspicious.map(s => s.label));
    }
    return { success: true, url, content: wrapped, truncated: text.length > 8000, suspiciousPatterns: suspicious.length, extractionMethod };
  } catch (jinaErr: any) {
    console.log(`[web_fetch] Readability failed for ${url}: ${jinaErr.message}`);
  }

  if (isFirecrawlAvailable()) {
    extractionMethod = "firecrawl";
    try {
      const result = await firecrawlScrape(url);
      if (result.success && result.content) {
        const truncated = result.content.slice(0, 8000);
        const { wrapped, suspicious } = wrapExternalContent(truncated, "web_fetch", { url });
        if (suspicious.length > 0) {
          console.log(`[security] Suspicious patterns in Firecrawl content from ${url}:`, suspicious.map(s => s.label));
        }
        return {
          success: true, url, content: wrapped,
          truncated: result.content.length > 8000,
          suspiciousPatterns: suspicious.length,
          extractionMethod,
          cached: result.cached || false,
          title: result.title,
        };
      }
      console.log(`[web_fetch] Firecrawl failed for ${url}: ${result.error}`);
    } catch (fcErr: any) {
      console.log(`[web_fetch] Firecrawl error for ${url}: ${fcErr.message}`);
    }
  }

  extractionMethod = "basic";
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VisionClaw/1.0)",
        "Accept": "text/html,text/plain,application/json",
      },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
    const truncated = cleaned.slice(0, 8000);
    const { wrapped, suspicious } = wrapExternalContent(truncated, "web_fetch", { url });
    if (suspicious.length > 0) {
      console.log(`[security] Suspicious patterns in basic-fetched content from ${url}:`, suspicious.map(s => s.label));
    }
    return { success: true, url, content: wrapped, truncated: cleaned.length > 8000, suspiciousPatterns: suspicious.length, extractionMethod };
  } catch (basicErr: any) {
    return { success: false, url, error: `All extraction methods failed. Last: ${basicErr.message}`, extractionMethod: "none" };
  }
}

async function webSearchLegacy(query: string) {
  const results: { source: string; content: string }[] = [];

  try {
    const wikiQuery = encodeURIComponent(query);
    const wikiResp = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${wikiQuery}&format=json&srlimit=3&utf8=`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (wikiResp.ok) {
      const wikiData = await wikiResp.json();
      const wikiResults = wikiData?.query?.search || [];
      for (const r of wikiResults) {
        const snippet = r.snippet?.replace(/<[^>]*>/g, "") || "";
        results.push({ source: `Wikipedia: ${r.title}`, content: `${snippet} — https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}` });
      }
    }
  } catch {}

  try {
    const jinaUrl = `https://s.jina.ai/${encodeURIComponent(query)}`;
    const jinaResp = await fetch(jinaUrl, {
      headers: { "Accept": "text/plain", "X-Return-Format": "text" },
      signal: AbortSignal.timeout(12000),
    });
    if (jinaResp.ok) {
      const text = await jinaResp.text();
      results.push({ source: "Web Search", content: text.slice(0, 5000) });
    }
  } catch {}

  if (results.length === 0) {
    return { success: false, query, error: "No results found", provider: "legacy" };
  }

  const wrappedResults = results.map(r => {
    const { wrapped } = wrapExternalContent(r.content, "web_search");
    return { source: r.source, content: wrapped };
  });

  return { success: true, query, resultCount: wrappedResults.length, results: wrappedResults, provider: "legacy" };
}

async function webSearch(query: string) {
  if (isPerplexityAvailable()) {
    const result = await perplexitySearch(query);
    if (result.success && result.answer) {
      const { wrapped } = wrapExternalContent(result.answer, "web_search");
      const citationList = result.citations?.length
        ? result.citations.map((c, i) => `[${i + 1}] ${c}`).join("\n")
        : "";
      return {
        success: true,
        query,
        provider: "perplexity",
        model: result.model,
        resultCount: 1,
        results: [
          {
            source: `Perplexity Sonar (${result.model})`,
            content: wrapped + (citationList ? `\n\nSources:\n${citationList}` : ""),
          },
        ],
      };
    }
    console.log(`[web_search] Perplexity failed (${result.error}), falling back to legacy search`);
  }

  return webSearchLegacy(query);
}

async function writeDailyNote(content: string, section?: string) {
  const persona = await storage.getActivePersona();
  const today = new Date().toISOString().split("T")[0];
  const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const existing = await storage.getDailyNote(today, persona?.id);

  const sectionHeader = section === "decisions" ? "## Decisions Made"
    : section === "lessons" ? "## Lessons Learned"
    : section === "tomorrow" ? "## Tomorrow"
    : "## What Happened";

  const entry = `- ${time}: ${content}`;
  let newContent: string;

  if (existing?.content) {
    if (existing.content.includes(sectionHeader)) {
      const idx = existing.content.indexOf(sectionHeader);
      const nextSection = existing.content.indexOf("\n## ", idx + sectionHeader.length);
      if (nextSection > -1) {
        newContent = existing.content.slice(0, nextSection) + `\n${entry}` + existing.content.slice(nextSection);
      } else {
        newContent = existing.content + `\n${entry}`;
      }
    } else {
      newContent = existing.content + `\n\n${sectionHeader}\n${entry}`;
    }
  } else {
    newContent = `# ${today}\n\n${sectionHeader}\n${entry}`;
  }

  await storage.upsertDailyNote({ date: today, content: newContent.slice(0, 10000), personaId: persona?.id ?? null });
  return { written: true, date: today, section: section || "events" };
}

async function updateMemory(id: number, fact?: string, category?: string, status?: string) {
  const persona = await storage.getActivePersona();
  const memResult = await storage.getMemoryEntries(persona?.id);
  const target = memResult.data.find((m) => m.id === id);
  if (!target) {
    return { updated: false, error: `Memory entry ${id} not found or does not belong to the active persona` };
  }

  const updates: Record<string, any> = {};
  if (fact) updates.fact = fact;
  if (category) updates.category = category;
  if (status) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return { updated: false, error: "No fields to update" };
  }

  await storage.updateMemoryEntry(id, updates);

  if (fact) {
    generateEmbedding(fact).then((emb) => {
      if (emb) storage.updateMemoryEmbedding(id, emb).catch(() => {});
    }).catch(() => {});
  }

  return { updated: true, id, changes: Object.keys(updates) };
}

async function handleSendEmail(to: string, subject: string, text: string, html?: string, tenantId?: number) {
  try {
    const { isEmailConfigured, getOrCreateTenantInbox, getOrCreatePrimaryInbox, sendEmail } = await import("./email");
    if (!isEmailConfigured()) return { error: "Email is not configured. AGENTMAIL_API_KEY is missing." };
    let inboxId: string;
    if (tenantId) {
      const tenantInbox = await getOrCreateTenantInbox(tenantId);
      inboxId = tenantInbox.inboxId;
    } else {
      const inbox = await getOrCreatePrimaryInbox();
      inboxId = (inbox as any).inboxId || (inbox as any).inbox_id;
    }
    const result = await sendEmail({ inboxId, to, subject, text, html });
    return { sent: true, to, subject, messageId: (result as any)?.messageId || (result as any)?.message_id || "sent" };
  } catch (err: any) {
    return { error: `Failed to send email: ${err.message}` };
  }
}

async function handleCheckInbox(limit: number, tenantId?: number) {
  try {
    const { isEmailConfigured, getOrCreateTenantInbox, getOrCreatePrimaryInbox, listMessages } = await import("./email");
    if (!isEmailConfigured()) return { error: "Email is not configured. AGENTMAIL_API_KEY is missing." };
    let inboxId: string;
    let inboxEmail: string;
    if (tenantId) {
      const tenantInbox = await getOrCreateTenantInbox(tenantId);
      inboxId = tenantInbox.inboxId;
      inboxEmail = tenantInbox.email;
    } else {
      const inbox = await getOrCreatePrimaryInbox();
      inboxId = (inbox as any).inboxId || (inbox as any).inbox_id;
      inboxEmail = "visionclaw@agentmail.to";
    }
    const result = await listMessages(inboxId, Math.min(limit, 50));
    const msgs = (result as any).messages || [];
    const wrappedMessages = msgs.map((m: any) => {
      const preview = (m.extractedText || m.text || "").slice(0, 200);
      const { wrapped, suspicious } = wrapExternalContent(preview, "email", {
        from: typeof m.from === "string" ? m.from : m.from?.[0],
        subject: m.subject,
      });
      if (suspicious.length > 0) {
        console.log(`[security] Suspicious patterns in email from ${m.from}:`, suspicious.map(s => s.label));
      }
      return {
        id: m.messageId || m.message_id || m.id,
        from: m.from,
        to: m.to,
        subject: m.subject,
        date: m.createdAt || m.created_at || m.date,
        preview: wrapped,
      };
    });
    return {
      inbox: inboxEmail,
      count: wrappedMessages.length,
      messages: wrappedMessages,
    };
  } catch (err: any) {
    return { error: `Failed to check inbox: ${err.message}` };
  }
}

async function delegateTask(targetAgent: string, taskName: string, description: string, prompt: string, schedule: string, tenantId?: number, callerContext?: string, currentDepth?: number) {
  if (callerContext === "heartbeat") {
    return { success: false, error: "Delegation is not allowed from heartbeat tasks. Only interactive chat can delegate." };
  }
  const combinedText = `${taskName} ${description} ${prompt}`.toLowerCase();
  const isVideoProduction = /\b(produce.video|create.video|make.video|generate.video|render.video|create.slideshow|produce.slideshow)\b/.test(combinedText)
    || (/\b(mp4|slideshow)\b/.test(combinedText) && /\b(creat|generat|produc|render|build|make)\b/.test(combinedText));
  if (isVideoProduction) {
    return {
      success: false,
      error: "VIDEO TASKS CANNOT BE DELEGATED. You must call produce_video directly with the script text. Example: produce_video({ script: '...narration text...', title: 'Video Title', email_to: 'user@email.com' }). Use read_file to get the script content first if needed.",
    };
  }
  const delegationDepth = (currentDepth ?? 0) + 1;
  const persona = await storage.getActivePersona();

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await delegateTaskFromChat(
        persona?.id ?? null,
        targetAgent,
        taskName,
        description || `Delegated from chat`,
        prompt,
        schedule || "once",
        attempt === 0 ? "gpt-5-mini" : "gemini-2.5-flash",
        tenantId || 1,
        delegationDepth
      );
      if (result.success) return result;
      if (attempt < MAX_RETRIES && result.error && !result.error.includes("not found") && !result.error.includes("Chain-of-command")) {
        console.log(`[delegation] Attempt ${attempt + 1} failed: ${result.error}. Retrying...`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      if (!result.success && result.error) {
        return {
          ...result,
          _fallbackHint: `Delegation to ${targetAgent} failed after ${attempt + 1} attempt(s). You should execute this task yourself using your available tools (system_status, recall_context, search_memory, project, etc.) instead of delegating. Do the work directly.`,
        };
      }
      return result;
    } catch (err: any) {
      console.error(`[delegation] Attempt ${attempt + 1} threw: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      return {
        success: false,
        error: `Delegation failed after ${MAX_RETRIES + 1} attempts: ${err.message}`,
        _fallbackHint: `Delegation to ${targetAgent} failed. You should execute this task yourself using your available tools (system_status, recall_context, search_memory, project, etc.) instead of delegating. Do the work directly.`,
      };
    }
  }
  return { success: false, error: "Delegation exhausted all retries" };
}

export async function executeTool(name: string, params: Record<string, any>): Promise<any> {
  switch (name) {
    case "read_file": {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = params.path;
      if (!filePath || typeof filePath !== "string") return { error: "path is required" };
      const safeParts = filePath.replace(/\.\./g, "").replace(/^\/+/, "");
      const absPath = path.resolve("/home/runner/workspace", safeParts);
      if (!absPath.startsWith("/home/runner/workspace")) return { error: "Access denied: path outside workspace" };
      if (!fs.existsSync(absPath)) return { error: `File not found: ${safeParts}` };
      const stat = fs.statSync(absPath);
      if (stat.isDirectory()) return { error: "Path is a directory, not a file" };
      if (stat.size > 500_000) return { error: `File too large (${Math.round(stat.size / 1024)}KB). Max 500KB.` };
      const content = fs.readFileSync(absPath, "utf-8");
      const lines = content.split("\n");
      const maxLines = params.maxLines || 200;
      const truncated = lines.length > maxLines;
      return {
        success: true,
        path: safeParts,
        content: truncated ? lines.slice(0, maxLines).join("\n") : content,
        lines: lines.length,
        truncated,
        size: stat.size,
      };
    }
    case "test_api_keys":
      return testApiKeys();
    case "check_system_status":
      return checkSystemStatus();
    case "list_models":
      return { models: await getAvailableModels() };
    case "project":
      return handleProject(params);
    case "search_memory":
      return searchMemory(params.query || "");
    case "create_memory":
      return createMemory(params.fact, params.category || "preference");
    case "search_knowledge":
      return searchKnowledge(params.query || "");
    case "create_knowledge":
      return createKnowledge(params.title, params.content, params.category || "reference", params.priority);
    case "get_daily_notes":
      return getDailyNotes(params.date);
    case "list_conversations":
      return listConversations(params.limit);
    case "web_fetch":
      return webFetch(params.url);
    case "web_search":
      return webSearch(params.query || "");
    case "firecrawl_search": {
      if (!isFirecrawlAvailable()) {
        return webSearch(params.query || "");
      }
      const fcResult = await firecrawlSearchFn(params.query || "", Math.min(params.limit || 5, 10));
      if (!fcResult.success || !fcResult.results?.length) {
        return webSearch(params.query || "");
      }
      const wrappedFcResults = fcResult.results.map(r => {
        const { wrapped } = wrapExternalContent(r.markdown, "firecrawl_search", { url: r.url });
        return { title: r.title, url: r.url, content: wrapped };
      });
      return { success: true, query: params.query, provider: "firecrawl", resultCount: wrappedFcResults.length, results: wrappedFcResults };
    }
    case "firecrawl_scrape": {
      if (!params._tenantId) return { error: "Tenant context required for firecrawl_scrape" };
      const tenantId = params._tenantId;
      try {
        const scrapeResult = await firecrawlScrapeAndStore(params.url, tenantId, params.tags);
        if (!scrapeResult.success) throw new Error(scrapeResult.error || "Firecrawl scrape failed");
        const fullPage = await getScrapedPageContent(scrapeResult.pageId!, tenantId);
        return {
          success: true,
          pageId: scrapeResult.pageId,
          title: scrapeResult.title,
          contentLength: scrapeResult.contentLength,
          content: fullPage.page?.content?.slice(0, 8000) || "",
          storedInDatabase: true,
        };
      } catch (fcErr: any) {
        console.warn(`[firecrawl_scrape] Firecrawl failed: ${fcErr.message}, falling back to web_fetch`);
        try {
          const fallbackResult = await executeTool("web_fetch", { url: params.url, _tenantId: tenantId }, tenantId);
          return { ...fallbackResult, _fallback: "web_fetch", _firecrawlError: fcErr.message?.slice(0, 100) };
        } catch (fbErr: any) {
          return { error: `Firecrawl failed: ${fcErr.message?.slice(0, 150)}. Fallback web_fetch also failed: ${fbErr.message?.slice(0, 150)}` };
        }
      }
    }
    case "firecrawl_crawl": {
      if (!params._tenantId) return { error: "Tenant context required for firecrawl_crawl" };
      const tenantId = params._tenantId;
      try {
        return await retryWithBackoff(
          () => firecrawlCrawlSite(params.url, tenantId, {
            limit: params.limit,
            maxDepth: params.maxDepth,
            includePaths: params.includePaths,
            excludePaths: params.excludePaths,
            tags: params.tags,
          }),
          { retries: 1, delayMs: 3000, label: "firecrawl_crawl" }
        );
      } catch (err: any) {
        return { error: `Firecrawl crawl failed after retry: ${err.message?.slice(0, 200)}` };
      }
    }
    case "firecrawl_map": {
      return firecrawlMapSite(params.url);
    }
    case "scraped_pages_query": {
      if (!params._tenantId) return { error: "Tenant context required for scraped_pages_query" };
      const tenantId = params._tenantId;
      return queryScrapedPages(tenantId, {
        domain: params.domain,
        search: params.search,
        limit: params.limit,
        offset: params.offset,
      });
    }
    case "scraped_page_read": {
      if (!params._tenantId) return { error: "Tenant context required for scraped_page_read" };
      const tenantId = params._tenantId;
      return getScrapedPageContent(params.pageId, tenantId);
    }
    case "scraped_pages_delete": {
      if (!params._tenantId) return { error: "Tenant context required for scraped_pages_delete" };
      const tenantId = params._tenantId;
      return deleteScrapedPages(tenantId, {
        pageIds: params.pageIds,
        domain: params.domain,
        olderThanDays: params.olderThanDays,
      });
    }
    case "write_daily_note":
      return writeDailyNote(params.content, params.section);
    case "update_memory":
      return updateMemory(params.id, params.fact, params.category, params.status);
    case "generate_chart":
      return { chartData: { type: params.type, title: params.title, data: params.data, xKey: params.xKey || "name", yKey: params.yKey || "value", colors: params.colors } };
    case "render_diagram": {
      const { uploadAndShare } = await import("./google-drive");
      const fsP = await import("fs/promises");
      const path = await import("path");

      const theme = params.theme || "neutral";
      const bgColor = (params.background_color || "#ffffff").replace("#", "");
      const mermaidCode = params.mermaid_code;
      const title = params.title || "diagram";

      try {
        let buffer: Buffer | null = null;

        const encoded = Buffer.from(JSON.stringify({
          code: mermaidCode,
          mermaid: { theme },
        })).toString("base64url");
        const mermaidUrl = `https://mermaid.ink/img/${encoded}?bgColor=!${bgColor}`;
        try {
          const response = await retryWithBackoff(
            () => fetch(mermaidUrl, { headers: { "Accept": "image/png" }, signal: AbortSignal.timeout(20000) }),
            { retries: 1, delayMs: 2000, label: "mermaid.ink" }
          );
          if (response.ok) {
            buffer = Buffer.from(await response.arrayBuffer());
            console.log(`[render_diagram] mermaid.ink succeeded (${buffer.length} bytes)`);
          }
        } catch (e: any) {
          console.warn(`[render_diagram] mermaid.ink failed: ${e.message}, trying Kroki fallback`);
        }

        if (!buffer) {
          try {
            const krokiResp = await retryWithBackoff(
              () => fetch("https://kroki.io/mermaid/png", {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: mermaidCode,
                signal: AbortSignal.timeout(30000),
              }),
              { retries: 1, delayMs: 2000, label: "kroki.io" }
            );
            if (krokiResp.ok) {
              buffer = Buffer.from(await krokiResp.arrayBuffer());
              console.log(`[render_diagram] Kroki fallback succeeded (${buffer.length} bytes)`);
            }
          } catch (e: any) {
            console.warn(`[render_diagram] Kroki fallback also failed: ${e.message}`);
          }
        }

        if (!buffer) {
          return { error: `Diagram rendering failed: Both mermaid.ink and Kroki.io are unavailable. Check your diagram syntax.` };
        }

        const filename = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()}.png`;
        const outputDir = path.join(process.cwd(), "project-assets");
        await fsP.mkdir(outputDir, { recursive: true });
        const filePath = path.join(outputDir, filename);
        await fsP.writeFile(filePath, buffer);

        console.log(`[render_diagram] Rendered "${title}" (${buffer.length} bytes)`);

        const folderLabel = params.folder_label || "Diagrams";
        let driveResult: any = null;
        try {
          driveResult = await uploadAndShare({ filePath, fileName: filename, mimeType: "image/png", folderLabel });
        } catch (driveErr: any) {
          console.warn(`[render_diagram] Drive upload failed: ${driveErr.message}, file saved locally`);
        }

        return {
          success: true,
          title,
          filename,
          local_path: filePath,
          drive_url: driveResult?.viewUrl || null,
          drive_id: driveResult?.fileId || null,
          image_url: driveResult?.imageUrl || null,
          size_bytes: buffer.length,
          mermaid_type: mermaidCode.trim().split(/[\s\n]/)[0],
        };
      } catch (err: any) {
        console.error(`[render_diagram] Failed:`, err.message);
        return { error: `Diagram rendering failed: ${err.message}` };
      }
    }
    case "vibevoice_transcribe": {
      const { vibevoiceTranscribe } = await import("./vibevoice");
      return await vibevoiceTranscribe({
        audio_path: params.audio_path,
        audio_base64: params.audio_base64,
        audio_url: params.audio_url,
        language: params.language,
        hotwords: params.hotwords,
        enable_diarization: params.enable_diarization,
        enable_timestamps: params.enable_timestamps,
      });
    }
    case "vibevoice_speak": {
      const { vibevoiceTTS } = await import("./vibevoice");
      const result = await vibevoiceTTS({
        text: params.text,
        speakers: params.speakers,
        voice: params.voice,
        output_path: params.output_path,
      });
      if (result.success && result.audio_base64) {
        const truncatedPreview = result.audio_base64.slice(0, 100) + "...";
        return {
          success: true,
          format: result.format,
          duration_seconds: result.duration_seconds,
          speakers_used: result.speakers_used,
          audio_preview: truncatedPreview,
          audio_size_bytes: Math.round((result.audio_base64.length * 3) / 4),
          provider: result.provider,
        };
      }
      return result;
    }
    case "generate_dashboard":
      return { dashboardContent: `\`\`\`html-canvas [${params.title}]\n${params.html}\n\`\`\`` };
    case "delegate_task":
      return delegateTask(params.targetAgent, params.taskName, params.description || "", params.prompt, params.schedule || "once", params._tenantId, params._callerContext, params._currentDepth);
    case "get_user_info": {
      if (!params._tenantId) return { error: "No user context available" };
      const tenant = await storage.getTenant(params._tenantId);
      if (!tenant) return { error: "User not found" };
      return {
        name: tenant.name,
        email: tenant.email,
        plan: tenant.plan || "trial",
        id: tenant.id,
      };
    }
    case "send_email":
      return handleSendEmail(params.to, params.subject, params.text, params.html, params._tenantId);
    case "check_inbox":
      return handleCheckInbox(params.limit || 10, params._tenantId);
    case "sessions_list":
      return sessionsList({
        kinds: params.kinds,
        limit: params.limit,
        activeMinutes: params.activeMinutes,
        messageLimit: params.messageLimit,
      });
    case "sessions_history":
      return sessionsHistory({
        sessionKey: params.sessionKey,
        limit: params.limit,
        includeTools: params.includeTools,
      });
    case "sessions_send":
      return sessionsSend({
        sessionKey: params.sessionKey,
        message: params.message,
        sourceSessionKey: params._sourceSessionKey,
        sourcePersonaName: params._sourcePersonaName,
      });
    case "sessions_spawn": {
      const subMod = await getSubagentModule();
      return subMod.spawnSubagent({
        parentConversationId: params._conversationId,
        task: params.task,
        label: params.label,
        agentId: params.agentId,
        model: params.model,
        thinkingLevel: params.thinkingLevel,
        runTimeoutSeconds: params.runTimeoutSeconds,
        mode: params.mode,
        depth: params._depth,
      });
    }
    case "subagents": {
      const subMod = await getSubagentModule();
      switch (params.command) {
        case "list":
          return subMod.getSubagentRuns(params._conversationId).map(r => ({
            id: r.id,
            label: r.label,
            status: r.status,
            task: r.task.slice(0, 120),
            runtime: r.finishedAt
              ? `${Math.round((r.finishedAt - r.createdAt) / 1000)}s`
              : `${Math.round((Date.now() - r.createdAt) / 1000)}s (running)`,
          }));
        case "kill":
          if (!params.runId) return { error: "runId required for kill" };
          return subMod.killSubagent(params.runId);
        case "killAll":
          return subMod.killAllSubagents(params._conversationId);
        case "info":
          if (!params.runId) return { error: "runId required for info" };
          return subMod.getSubagentInfo(params.runId) || { error: `Run ${params.runId} not found` };
        default:
          return { error: `Unknown subagents command: ${params.command}` };
      }
    }
    case "recall_context": {
      const { recallCompactionArchive } = await import("./compaction");

      if (params.projectWide && params._conversationId) {
        try {
          const projRes = await db.execute(sql`SELECT project_id FROM conversations WHERE id = ${params._conversationId}`);
          const projRows = (projRes as any).rows || projRes;
          const pid = projRows?.[0]?.project_id;
          if (pid) {
            const convRes = await db.execute(sql`
              SELECT DISTINCT conversation_id FROM project_conversations WHERE project_id = ${pid}
              UNION SELECT id AS conversation_id FROM conversations WHERE project_id = ${pid}
            `);
            const convRows = (convRes as any).rows || convRes;
            const allArchives: any[] = [];
            for (const row of (convRows || [])) {
              const result = await recallCompactionArchive({
                conversationId: row.conversation_id,
                tenantId: params._tenantId,
                query: params.query,
                limit: 1,
              });
              if (result.archives?.length) {
                allArchives.push(...result.archives.map((a: any) => ({ ...a, fromConversation: row.conversation_id })));
              }
            }
            if (!allArchives.length && params.query) {
              const msgRes = await db.execute(sql`
                SELECT m.conversation_id, m.role, m.content, m.created_at
                FROM messages m
                JOIN conversations c ON c.id = m.conversation_id
                WHERE (c.project_id = ${pid} OR c.id IN (SELECT conversation_id FROM project_conversations WHERE project_id = ${pid}))
                  AND m.content ILIKE ${'%' + params.query + '%'}
                ORDER BY m.created_at DESC LIMIT ${params.limit || 5}
              `);
              const msgRows = (msgRes as any).rows || msgRes;
              if (Array.isArray(msgRows) && msgRows.length > 0) {
                return { success: true, source: "project_messages", results: msgRows.map((m: any) => ({ conversationId: m.conversation_id, role: m.role, content: typeof m.content === "string" ? m.content.slice(0, 1000) : JSON.stringify(m.content).slice(0, 1000), createdAt: m.created_at })) };
              }
            }
            return { success: true, archives: allArchives };
          }
        } catch (e: any) {
          console.error("[recall_context] Project-wide search error:", e.message);
        }
      }

      return recallCompactionArchive({
        conversationId: params.conversationId || params._conversationId,
        tenantId: params._tenantId,
        query: params.query,
        limit: params.limit,
      });
    }
    case "analyze_pdf":
      return extractPdfText(params.pdf, {
        pages: params.pages,
        maxBytes: params.maxBytesMb,
      });
    case "create_pdf":
      return createPdf({
        title: params.title,
        content: params.content,
        sections: params.sections,
        fields: params.fields,
        headerImage: params.headerImage,
        fontSize: params.fontSize,
        pageSize: params.pageSize,
        outputPath: params.outputPath,
        customerName: params.customerName,
        folderLabel: params.folderLabel,
      });
    case "fill_pdf":
      return fillPdf({
        inputPath: params.inputPath,
        fields: params.fields,
        outputPath: params.outputPath,
        flatten: params.flatten,
      });
    case "edit_pdf":
      return editPdf({
        inputPath: params.inputPath,
        addText: params.addText,
        addFields: params.addFields,
        addPages: params.addPages,
        removePages: params.removePages,
        outputPath: params.outputPath,
      });
    case "list_pdf_fields":
      return listPdfFields(params.inputPath);
    case "list_uploads": {
      const uploadsDir = path.join(process.cwd(), "uploads");
      const dbFiles: { filename: string; originalName: string; mimeType: string; size: number }[] = [];
      try {
        const { db } = await import("./db");
        const all = await db.select({
          filename: fileStorage.filename,
          originalName: fileStorage.originalName,
          mimeType: fileStorage.mimeType,
          size: fileStorage.size,
        }).from(fileStorage);
        dbFiles.push(...all);
      } catch {}
      const localFiles: string[] = [];
      try {
        if (fs.existsSync(uploadsDir)) {
          localFiles.push(...fs.readdirSync(uploadsDir));
        }
      } catch {}
      const seen = new Set(dbFiles.map(f => f.filename));
      for (const lf of localFiles) {
        if (!seen.has(lf)) {
          const stat = fs.statSync(path.join(uploadsDir, lf));
          const ext = path.extname(lf).toLowerCase();
          const mimeMap: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf", ".svg": "image/svg+xml" };
          dbFiles.push({ filename: lf, originalName: lf, mimeType: mimeMap[ext] || "application/octet-stream", size: stat.size });
        }
      }
      let results = dbFiles;
      if (params.type) {
        results = results.filter(f => f.mimeType.startsWith(params.type));
      }
      return {
        files: results.map(f => ({
          filename: f.filename,
          originalName: f.originalName,
          type: f.mimeType,
          size: f.size,
          path: `uploads/${f.filename}`,
          url: `/uploads/${f.filename}`,
        })),
        count: results.length,
      };
    }
    case "google_drive": {
      switch (params.command) {
        case "upload": {
          if (!params.filePath && !params.fileData) return { error: "filePath or fileData is required for upload" };
          const fileName = params.fileName || (params.filePath ? path.basename(params.filePath) : "file");
          const shareResult = await uploadAndShare({
            filePath: params.filePath,
            fileData: params.fileData ? Buffer.from(params.fileData, "base64") : undefined,
            fileName,
            mimeType: params.mimeType,
            description: params.description,
            customerName: params.customerName,
            folderLabel: params.folderLabel,
          });
          if (!shareResult.success) return { error: shareResult.error };
          return {
            success: true,
            fileId: shareResult.fileId,
            shareableLink: shareResult.viewUrl,
            directDownloadLink: shareResult.downloadUrl,
            imageUrl: shareResult.imageUrl,
            folderLink: shareResult.folderUrl,
          };
        }
        case "list":
          return listDriveFiles({ query: params.query });
        case "download": {
          if (!params.fileId) return { error: "fileId is required for download" };
          return downloadFromDrive({ fileId: params.fileId, savePath: params.savePath });
        }
        case "delete": {
          if (!params.fileId) return { error: "fileId is required for delete" };
          return deleteDriveFile(params.fileId);
        }
        case "share": {
          if (!params.fileId) return { error: "fileId is required for share" };
          return makeFileShareable(params.fileId);
        }
        case "info":
          return getDriveFolderInfo();
        default:
          return { error: `Unknown google_drive command: ${params.command}. Use: upload, list, download, delete, share, info` };
      }
    }
    case "google_workspace": {
      const tenantId = params._tenantId || 1;
      const { service, action } = params;

      const execGws = async (): Promise<any> => {
        switch (service) {
          case "gmail":
            switch (action) {
              case "search": return await gmailSearch(tenantId, params.query || "newer_than:7d", params.maxResults);
              case "read": {
                if (!params.messageId) return { error: "messageId is required" };
                return await gmailGetMessage(tenantId, params.messageId);
              }
              case "send": {
                if (!params.to || !params.subject) return { error: "to and subject are required" };
                return await gmailSend(tenantId, params.to, params.subject, params.body || "", params.cc, params.bcc);
              }
              case "label": {
                if (!params.messageId) return { error: "messageId is required" };
                return await gmailModifyLabels(tenantId, params.messageId, params.addLabels, params.removeLabels);
              }
              default: return { error: `Unknown gmail action: ${action}. Use: search, read, send, label` };
            }
          case "calendar":
            switch (action) {
              case "list": return await calendarListEvents(tenantId, params.timeMin, params.timeMax, params.maxResults, params.calendarId);
              case "create": {
                if (!params.subject || !params.start || !params.end) return { error: "subject, start, and end are required" };
                return await calendarCreateEvent(tenantId, params.subject, params.start, params.end, {
                  description: params.description, location: params.location, attendees: params.attendees, calendarId: params.calendarId,
                });
              }
              case "delete": {
                if (!params.eventId) return { error: "eventId is required" };
                return await calendarDeleteEvent(tenantId, params.eventId, params.calendarId);
              }
              default: return { error: `Unknown calendar action: ${action}. Use: list, create, delete` };
            }
          case "contacts":
            switch (action) {
              case "list": return await contactsList(tenantId, params.query, params.maxResults);
              case "create": {
                if (!params.name) return { error: "name is required" };
                return await contactsCreate(tenantId, params.name, params.email, params.phone, params.organization);
              }
              default: return { error: `Unknown contacts action: ${action}. Use: list, create` };
            }
          case "sheets":
            switch (action) {
              case "get": {
                if (!params.spreadsheetId || !params.range) return { error: "spreadsheetId and range are required" };
                return await sheetsGet(tenantId, params.spreadsheetId, params.range);
              }
              case "update": {
                if (!params.spreadsheetId || !params.range || !params.values) return { error: "spreadsheetId, range, and values are required" };
                return await sheetsUpdate(tenantId, params.spreadsheetId, params.range, params.values, params.inputOption);
              }
              case "append": {
                if (!params.spreadsheetId || !params.range || !params.values) return { error: "spreadsheetId, range, and values are required" };
                return await sheetsAppend(tenantId, params.spreadsheetId, params.range, params.values, params.inputOption);
              }
              case "clear": {
                if (!params.spreadsheetId || !params.range) return { error: "spreadsheetId and range are required" };
                return await sheetsClear(tenantId, params.spreadsheetId, params.range);
              }
              case "metadata": {
                if (!params.spreadsheetId) return { error: "spreadsheetId is required" };
                return await sheetsMetadata(tenantId, params.spreadsheetId);
              }
              default: return { error: `Unknown sheets action: ${action}. Use: get, update, append, clear, metadata` };
            }
          case "docs":
            switch (action) {
              case "get": {
                if (!params.documentId) return { error: "documentId is required" };
                return await docsGet(tenantId, params.documentId);
              }
              case "create": {
                if (!params.subject) return { error: "subject (document title) is required" };
                return await docsCreate(tenantId, params.subject, params.body);
              }
              default: return { error: `Unknown docs action: ${action}. Use: get, create` };
            }
          default: return { error: `Unknown service: ${service}. Use: gmail, calendar, contacts, sheets, docs` };
        }
      };

      try {
        return await retryWithBackoff(execGws, { retries: 1, delayMs: 2000, label: `google_workspace/${service}/${action}` });
      } catch (err: any) {
        const msg = err.message || "";
        if (msg.includes("401") || msg.includes("403") || msg.includes("invalid_grant") || msg.includes("Token")) {
          return { error: `Google Workspace auth error (${service}/${action}): ${msg.slice(0, 200)}. Token may have expired — try reconnecting Google in Settings.` };
        }
        return { error: `Google Workspace error (${service}/${action}): ${msg.slice(0, 300)}` };
      }
    }
    case "whatsapp": {
      try {
        if (params.action === "status") {
          return getWhatsAppStatus();
        }
        if (params.action === "send") {
          if (!params.to || !params.message) return { error: "Both 'to' (phone number) and 'message' are required" };
          await retryWithBackoff(
            () => sendWhatsAppMessage(params.to, params.message),
            { retries: 2, delayMs: 2000, label: "whatsapp-send" }
          );
          return { success: true, to: params.to, messageLength: params.message.length };
        }
        return { error: `Unknown whatsapp action: ${params.action}` };
      } catch (err: any) {
        return { error: `WhatsApp failed after retries: ${err.message?.slice(0, 200)}` };
      }
    }
    case "doc_search": {
      const tenantId = params._tenantId || 1;
      try {
        switch (params.action) {
          case "search": {
            if (!params.query) return { error: "query is required for search" };
            return await searchDocuments(params.query, tenantId, {
              collection: params.collection, mode: params.mode || "keyword", topK: params.topK, minScore: params.minScore,
            });
          }
          case "get": {
            if (!params.docPath) return { error: "docPath is required" };
            return await getDocument(params.docPath, tenantId, params.collection);
          }
          case "add_doc": {
            if (!params.collectionId || !params.docPath || !params.content) return { error: "collectionId, docPath, and content are required" };
            return await addDocument(params.collectionId, params.docPath, params.content, params.context || "", tenantId);
          }
          case "remove_doc": {
            if (!params.collectionId || !params.docPath) return { error: "collectionId and docPath are required" };
            return await removeDocument(params.collectionId, params.docPath, tenantId);
          }
          case "create_collection": {
            if (!params.name) return { error: "name is required" };
            return await createCollection(params.name, params.description || "", tenantId);
          }
          case "delete_collection": {
            if (!params.collectionId) return { error: "collectionId is required" };
            return await deleteCollection(params.collectionId, tenantId);
          }
          case "list_collections":
            return await listCollections(tenantId);
          case "add_context": {
            if (!params.collectionId || !params.context) return { error: "collectionId and context are required" };
            return await addContext(params.collectionId, params.context, tenantId);
          }
          case "embed": {
            if (!params.collectionId) return { error: "collectionId is required" };
            return await generateCollectionEmbeddings(params.collectionId, tenantId);
          }
          case "status":
            return await getCollectionStatus(tenantId);
          default:
            return { error: `Unknown doc_search action: ${params.action}. Use: search, get, add_doc, remove_doc, create_collection, delete_collection, list_collections, add_context, embed, status` };
        }
      } catch (err: any) {
        return { error: err.message };
      }
    }
    case "show_diff":
      if (params.mode === "word" && params.before !== undefined && params.after !== undefined) {
        return wordDiff(params.before, params.after);
      }
      return generateDiff({
        before: params.before,
        after: params.after,
        patch: params.patch,
        path: params.path,
        context: params.context,
      });
    case "deliver_product": {
      const { deliverDigitalProduct } = await import("./delivery-pipeline");
      const filePath = params.filePath || `uploads/${params.fileName}`;
      let customerEmail = params.customerEmail;
      let customerName = params.customerName;
      if (!customerEmail && params._tenantId) {
        const t = await storage.getTenant(params._tenantId);
        if (t) {
          customerEmail = t.email;
          customerName = customerName || t.name;
        }
      }
      return deliverDigitalProduct({
        customerName,
        customerEmail,
        productName: params.productName,
        fileName: params.fileName,
        filePath,
        orderId: params.orderId,
        stripePaymentId: params.stripePaymentId,
        emailSubject: params.emailSubject,
        emailBody: params.emailBody,
        sendEmail: !!customerEmail,
      });
    }
    case "delivery_status": {
      const dp = await import("./delivery-pipeline");
      switch (params.command) {
        case "status":
          if (!params.deliveryId) return { error: "deliveryId required" };
          return dp.getDeliveryStatus(params.deliveryId);
        case "list":
          return dp.listDeliveries(params.limit || 50);
        case "stats":
          return dp.getDeliveryStats();
        case "retry":
          if (!params.deliveryId) return { error: "deliveryId required" };
          return dp.retryDelivery(params.deliveryId);
        default:
          return { error: "Unknown command. Use: status, list, stats, retry" };
      }
    }
    case "exec":
      return executeCommand(params.command, {
        workdir: params.workdir,
        timeout: params.timeout,
      });
    case "llm_task":
      return runLlmTask({
        prompt: params.prompt,
        input: params.input,
        schema: params.schema,
        model: params.model,
        thinking: params.thinking,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
      });
    case "browser":
      return executeBrowserAction(params as BrowserAction);
    case "site_login": {
      const { getLoginCredentials } = await import("./credential-vault");
      const loginUrl = params.url;
      if (!loginUrl) return { error: "URL is required" };
      const tenantId = params._tenantId;
      if (!tenantId) return { error: "Tenant context required for site_login" };
      const creds = await getLoginCredentials(loginUrl, tenantId);
      if (!creds) return { error: `No credentials found for ${loginUrl}. Ask the user to add credentials in the Credential Vault (Settings → Vault) before attempting login.` };
      try {
        await executeBrowserAction({ action: "navigate", url: loginUrl, _tenantId: tenantId } as BrowserAction);
        await executeBrowserAction({ action: "wait", ms: 2000, _tenantId: tenantId } as BrowserAction);
        const userSel = params.usernameSelector || 'input[type="email"], input[name="email"], input[name="username"], input[name="login"], input[id="email"], input[id="username"], input[type="text"][autocomplete="username"]';
        const passSel = params.passwordSelector || 'input[type="password"]';
        const submitSel = params.submitSelector || 'button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("Login")';
        await executeBrowserAction({ action: "type", selector: userSel, text: creds.username, _tenantId: tenantId } as BrowserAction);
        await executeBrowserAction({ action: "wait", ms: 500, _tenantId: tenantId } as BrowserAction);
        await executeBrowserAction({ action: "type", selector: passSel, text: creds.password, _tenantId: tenantId } as BrowserAction);
        await executeBrowserAction({ action: "wait", ms: 500, _tenantId: tenantId } as BrowserAction);
        await executeBrowserAction({ action: "click", selector: submitSel, _tenantId: tenantId } as BrowserAction);
        await executeBrowserAction({ action: "wait", ms: 3000, _tenantId: tenantId } as BrowserAction);
        const screenshot = await executeBrowserAction({ action: "screenshot", _tenantId: tenantId } as BrowserAction);
        return { success: true, message: `Logged into ${loginUrl} as ${creds.username}`, screenshot: (screenshot as any)?.screenshotPath };
      } catch (err: any) {
        return { error: `Login failed: ${err.message}. Try using the browser tool with vision_browse for more control.` };
      }
    }
    case "youtube": {
      if (params.action && typeof params.action === "string") {
        const allowedYtKeys = new Set(["maxResults", "videoId", "commentId", "query", "order", "pageToken", "title", "description", "tags", "text", "parentId", "playlistId", "categoryId", "privacyStatus"]);
        const matches = [...params.action.matchAll(/<arg_key>(\w+)<\/?\w*>(?:<arg_value>)?([^<]*)/g)];
        if (matches.length > 0) {
          const cleanAction = params.action.replace(/<arg_key>.*$/, "").trim();
          const extracted: Record<string, string> = {};
          for (const m of matches) {
            const key = m[1];
            const val = (m[2] || "").replace(/<\/?\w+>/g, "").trim();
            if (key && allowedYtKeys.has(key)) {
              extracted[key] = val;
              params[key] = val;
            }
          }
          params.action = cleanAction;
          console.log(`[youtube] Cleaned malformed params: action="${cleanAction}", extracted:`, extracted);
        }
      }

      const { getYouTubeAccessToken } = await import("./oauth-subscriptions");
      const ytTenantId = params._tenantId || 1;
      let ytToken = await getYouTubeAccessToken(ytTenantId);
      if (!ytToken) return { error: "YouTube is not connected. Connect via Settings or /api/youtube/connect." };

      const ytBase = "https://www.googleapis.com/youtube/v3";
      let ytHeaders: Record<string, string> = { Authorization: `Bearer ${ytToken}`, "Content-Type": "application/json" };
      const maxR = Math.min(params.maxResults || 10, 50);

      const ytFetch = async (url: string, init?: RequestInit): Promise<Response> => {
        const resp = await fetch(url, { ...init, headers: { ...ytHeaders, ...(init?.headers || {}) }, signal: AbortSignal.timeout(30000) });
        if (resp.status === 401) {
          console.warn(`[youtube] Got 401, refreshing token...`);
          const newToken = await getYouTubeAccessToken(ytTenantId, true);
          if (newToken && newToken !== ytToken) {
            ytToken = newToken;
            ytHeaders = { Authorization: `Bearer ${newToken}`, "Content-Type": "application/json" };
            const retry = await fetch(url, { ...init, headers: { ...ytHeaders, ...(init?.headers || {}) }, signal: AbortSignal.timeout(30000) });
            return retry;
          }
        }
        return resp;
      };

      if (!params.action) {
        const r = await ytFetch(`${ytBase}/channels?part=snippet,statistics&mine=true`);
        if (!r.ok) return { error: `YouTube API error: ${r.status}` };
        const d = await r.json();
        const ch = d.items?.[0];
        return {
          connected: true,
          channel: ch?.snippet?.title,
          subscribers: ch?.statistics?.subscriberCount,
          videoCount: ch?.statistics?.videoCount,
          viewCount: ch?.statistics?.viewCount,
          message: "YouTube is connected and working. Use 'action' parameter for specific operations: channel_info, list_videos, video_details, search_videos, list_comments, reply_comment, update_video, list_playlists, upload_video",
        };
      }

      switch (params.action) {
        case "channel_info": {
          const r = await ytFetch(`${ytBase}/channels?part=snippet,statistics,contentDetails&mine=true`);
          if (!r.ok) return { error: `YouTube API error: ${r.status} ${await r.text()}` };
          const d = await r.json();
          const ch = d.items?.[0];
          if (!ch) return { error: "No channel found" };
          return { channel: ch.snippet?.title, description: ch.snippet?.description, subscriberCount: ch.statistics?.subscriberCount, videoCount: ch.statistics?.videoCount, viewCount: ch.statistics?.viewCount, uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads, thumbnailUrl: ch.snippet?.thumbnails?.default?.url, publishedAt: ch.snippet?.publishedAt };
        }
        case "list_videos": {
          const chR = await ytFetch(`${ytBase}/channels?part=contentDetails&mine=true`);
          if (!chR.ok) return { error: `YouTube API error: ${chR.status}` };
          const chD = await chR.json();
          const uploadsId = chD.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
          if (!uploadsId) return { error: "No uploads playlist found" };
          const plR = await ytFetch(`${ytBase}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxR}`);
          if (!plR.ok) return { error: `YouTube API error: ${plR.status}` };
          const plD = await plR.json();
          return { videos: (plD.items || []).map((v: any) => ({ videoId: v.contentDetails?.videoId, title: v.snippet?.title, description: v.snippet?.description?.substring(0, 200), publishedAt: v.snippet?.publishedAt, thumbnailUrl: v.snippet?.thumbnails?.default?.url })), totalResults: plD.pageInfo?.totalResults };
        }
        case "video_details": {
          if (!params.videoId) return { error: "videoId is required" };
          const r = await ytFetch(`${ytBase}/videos?part=snippet,statistics,contentDetails&id=${params.videoId}`);
          if (!r.ok) return { error: `YouTube API error: ${r.status}` };
          const d = await r.json();
          const v = d.items?.[0];
          if (!v) return { error: "Video not found" };
          return { videoId: v.id, title: v.snippet?.title, description: v.snippet?.description, publishedAt: v.snippet?.publishedAt, tags: v.snippet?.tags, viewCount: v.statistics?.viewCount, likeCount: v.statistics?.likeCount, commentCount: v.statistics?.commentCount, duration: v.contentDetails?.duration, thumbnailUrl: v.snippet?.thumbnails?.default?.url };
        }
        case "search_videos": {
          if (!params.query) return { error: "query is required" };
          const r = await ytFetch(`${ytBase}/search?part=snippet&forMine=true&type=video&q=${encodeURIComponent(params.query)}&maxResults=${maxR}`);
          if (!r.ok) return { error: `YouTube API error: ${r.status}` };
          const d = await r.json();
          return { results: (d.items || []).map((v: any) => ({ videoId: v.id?.videoId, title: v.snippet?.title, description: v.snippet?.description?.substring(0, 200), publishedAt: v.snippet?.publishedAt })) };
        }
        case "list_comments": {
          if (!params.videoId) return { error: "videoId is required" };
          const r = await ytFetch(`${ytBase}/commentThreads?part=snippet&videoId=${params.videoId}&maxResults=${maxR}&order=time`);
          if (!r.ok) return { error: `YouTube API error: ${r.status}` };
          const d = await r.json();
          return { comments: (d.items || []).map((c: any) => ({ commentId: c.id, author: c.snippet?.topLevelComment?.snippet?.authorDisplayName, text: c.snippet?.topLevelComment?.snippet?.textDisplay, likeCount: c.snippet?.topLevelComment?.snippet?.likeCount, publishedAt: c.snippet?.topLevelComment?.snippet?.publishedAt, replyCount: c.snippet?.totalReplyCount })) };
        }
        case "reply_comment": {
          if (!params.commentId || !params.text) return { error: "commentId and text are required" };
          const r = await ytFetch(`${ytBase}/comments?part=snippet`, { method: "POST", body: JSON.stringify({ snippet: { parentId: params.commentId, textOriginal: params.text } }) });
          if (!r.ok) return { error: `YouTube API error: ${r.status} ${await r.text()}` };
          const d = await r.json();
          return { success: true, commentId: d.id, text: d.snippet?.textDisplay };
        }
        case "update_video": {
          if (!params.videoId) return { error: "videoId is required" };
          const getR = await ytFetch(`${ytBase}/videos?part=snippet&id=${params.videoId}`);
          if (!getR.ok) return { error: `YouTube API error: ${getR.status}` };
          const getD = await getR.json();
          const existing = getD.items?.[0];
          if (!existing) return { error: "Video not found" };
          const snippet = { ...existing.snippet };
          if (params.title) snippet.title = params.title;
          if (params.text) snippet.description = params.text;
          if (params.tags) snippet.tags = params.tags;
          const r = await ytFetch(`${ytBase}/videos?part=snippet`, { method: "PUT", body: JSON.stringify({ id: params.videoId, snippet }) });
          if (!r.ok) return { error: `YouTube API error: ${r.status} ${await r.text()}` };
          return { success: true, videoId: params.videoId, title: snippet.title };
        }
        case "list_playlists": {
          const r = await ytFetch(`${ytBase}/playlists?part=snippet,contentDetails&mine=true&maxResults=${maxR}`);
          if (!r.ok) return { error: `YouTube API error: ${r.status}` };
          const d = await r.json();
          return { playlists: (d.items || []).map((p: any) => ({ playlistId: p.id, title: p.snippet?.title, description: p.snippet?.description, videoCount: p.contentDetails?.itemCount, publishedAt: p.snippet?.publishedAt })) };
        }
        case "upload_video": {
          if (!params.filePath && !params.driveFileId) return { error: "filePath (local) or driveFileId (Google Drive file ID) is required" };
          if (!params.title) return { error: "title is required for video upload" };

          let videoBuffer: Buffer;

          if (params.driveFileId) {
            const { downloadFromDrive } = await import("./google-drive");
            const dlResult = await downloadFromDrive({ fileId: params.driveFileId });
            if (!dlResult.success || !dlResult.path) return { error: `Failed to download file from Google Drive: ${dlResult.error || params.driveFileId}` };
            const fsMod2 = await import("fs");
            videoBuffer = fsMod2.readFileSync(dlResult.path);
          } else {
            const fsMod = await import("fs");
            if (!fsMod.existsSync(params.filePath)) return { error: `File not found: ${params.filePath}` };
            videoBuffer = fsMod.readFileSync(params.filePath);
          }

          const metadata = {
            snippet: {
              title: params.title,
              description: params.text || params.description || "",
              tags: params.tags || [],
              categoryId: params.categoryId || "22",
            },
            status: {
              privacyStatus: params.privacyStatus || "private",
              selfDeclaredMadeForKids: false,
            },
          };

          const initResp = await retryWithBackoff(async () => {
            const resp = await fetch(
              "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${ytToken}`,
                  "Content-Type": "application/json; charset=UTF-8",
                  "X-Upload-Content-Length": String(videoBuffer.length),
                  "X-Upload-Content-Type": "video/*",
                },
                body: JSON.stringify(metadata),
                signal: AbortSignal.timeout(30000),
              }
            );
            if (resp.status === 401) {
              const newToken = await getYouTubeAccessToken(ytTenantId, true);
              if (newToken) { ytToken = newToken; ytHeaders = { Authorization: `Bearer ${newToken}`, "Content-Type": "application/json" }; }
              throw new Error("Token expired, retrying");
            }
            return resp;
          }, { retries: 1, delayMs: 2000, label: "youtube-upload-init" });

          if (!initResp.ok) {
            const errText = await initResp.text();
            return { error: `YouTube upload init failed: ${initResp.status} ${errText}` };
          }

          const uploadUrl = initResp.headers.get("location");
          if (!uploadUrl) return { error: "YouTube did not return a resumable upload URL" };

          const uploadResp = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "video/*",
              "Content-Length": String(videoBuffer.length),
            },
            body: videoBuffer,
          });

          if (!uploadResp.ok) {
            const errText = await uploadResp.text();
            return { error: `YouTube video upload failed: ${uploadResp.status} ${errText}` };
          }

          const uploadData = await uploadResp.json();
          return {
            success: true,
            videoId: uploadData.id,
            title: uploadData.snippet?.title,
            status: uploadData.status?.uploadStatus,
            privacyStatus: uploadData.status?.privacyStatus,
            url: `https://www.youtube.com/watch?v=${uploadData.id}`,
          };
        }
        default:
          return { error: `Unknown YouTube action: ${params.action}. Available: channel_info, list_videos, video_details, search_videos, list_comments, reply_comment, update_video, list_playlists` };
      }
    }
    case "lobster":
      return runLobster({
        action: params.action,
        pipeline: params.pipeline,
        token: params.token,
        approve: params.approve,
        argsJson: params.argsJson,
        cwd: params.cwd,
        timeoutMs: params.timeoutMs,
        maxStdoutBytes: params.maxStdoutBytes,
        workflowId: params.workflowId,
      });
    case "orchestrate": {
      console.log(`[ceo] Orchestrating: ${params.objective?.slice(0, 80)}`);
      const { generateExecutionPlan, executePlan, synthesizeResults } = await import("./ceo-orchestrator");
      const { estimatePlanCost } = await import("./resource-predictor");
      const convId = params._conversationId || 0;
      const tId = params._tenantId || 1;
      const callerDepth = params._currentDepth || 0;
      const plan = await generateExecutionPlan(params.objective, convId, tId, undefined, callerDepth);
      try {
        const preEstimate = estimatePlanCost(plan.steps?.map((s: any) => ({ tool: s.tool || s.type, description: s.description })) || []);
        console.log(`[resource-predictor] Orchestrate "${params.objective?.slice(0, 40)}": ${preEstimate.estimatedToolCalls} tools, ~$${preEstimate.estimatedCostUsd.toFixed(4)}, ~${preEstimate.estimatedTimeSeconds}s, risk: ${preEstimate.riskLevel}`);
      } catch {}

      const progressCallback = (p: any, step: any, event: string) => {
        const progressData = {
          planId: p.id,
          objective: p.objective,
          status: p.status,
          event,
          currentStep: step ? { taskId: step.taskId, description: step.description, persona: step.assignedPersona, status: step.status } : null,
          steps: p.steps.map((s: any) => ({ taskId: s.taskId, description: s.description, persona: s.assignedPersona, status: s.status })),
          completed: p.steps.filter((s: any) => s.status === "complete").length,
          total: p.steps.length,
        };
        orchestrationProgressEmitter.emit("progress", convId, progressData);
      };

      const executed = await executePlan(plan, progressCallback);
      const summary = synthesizeResults(executed);
      return {
        planId: executed.id,
        objective: executed.objective,
        status: executed.status,
        stepsCompleted: executed.steps.filter(s => s.status === "complete").length,
        totalSteps: executed.steps.length,
        summary,
        steps: executed.steps.map(s => ({
          taskId: s.taskId,
          description: s.description,
          persona: s.assignedPersona,
          status: s.status,
          result: s.result?.slice(0, 500),
          error: s.error,
        })),
      };
    }
    case "critique_response": {
      const { critiqueToolForAgent } = await import("./critique-agent");
      return critiqueToolForAgent(params.content, params.context);
    }
    case "tree_of_thought": {
      const { treeOfThought } = await import("./tree-of-thought");
      const totResult = await treeOfThought(params.question, params.branchCount || 3, params.context, params._tenantId);
      return {
        question: totResult.question,
        selectedBranch: totResult.selectedBranch,
        finalAnswer: totResult.finalAnswer,
        confidenceGain: totResult.confidenceGain,
        synthesized: totResult.synthesized,
        timingMs: totResult.timingMs,
        branches: totResult.branches.map(b => ({
          id: b.id,
          approach: b.approach,
          conclusion: b.conclusion,
          score: b.score,
          strengths: b.strengths,
          weaknesses: b.weaknesses,
        })),
      };
    }
    case "estimate_cost": {
      const { estimatePlanCost } = await import("./resource-predictor");
      const steps = Array.isArray(params.steps) ? params.steps : [];
      return estimatePlanCost(steps, params.modelId || "gpt-5-mini");
    }
    case "debate": {
      const { runDebate } = await import("./debate-engine");
      const count = Math.max(3, Math.min(6, params.participantCount || 4));
      const debateResult = await runDebate(params.question, params._tenantId || 1, count);
      return {
        question: debateResult.question,
        consensusLevel: debateResult.consensusLevel,
        finalRecommendation: debateResult.finalRecommendation,
        synthesis: debateResult.synthesis,
        dissents: debateResult.dissents,
        participants: debateResult.participants.map(p => ({
          name: p.personaName,
          role: p.role,
          perspective: p.perspective,
          recommendation: p.recommendation,
          confidence: p.confidence,
          keyPoints: p.keyPoints,
        })),
      };
    }
    case "plan_and_execute": {
      const plan = await planAndExecute(params.goal, params.context);
      return {
        goal: plan.goal,
        status: plan.status,
        summary: plan.summary,
        steps: plan.steps.map(s => ({
          id: s.id,
          action: s.action,
          status: s.status,
          result: s.result ? JSON.stringify(s.result).slice(0, 500) : undefined,
          error: s.error,
        })),
      };
    }
    case "execute_code": {
      console.log(`[sandbox] Executing: ${params.description || "code"}`);
      const result = runSandboxCode(params.code);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        executionTimeMs: result.executionTimeMs,
      };
    }
    case "deep_research": {
      console.log(`[research] Starting: ${params.question?.slice(0, 80)}`);
      const report = await deepResearch(params.question, params.depth || "standard");
      return {
        answer: report.answer,
        sources: report.sources,
        confidence: report.confidence,
        followUpQuestions: report.followUpQuestions,
        executionTimeMs: report.executionTimeMs,
      };
    }
    case "create_tool": {
      const { createCustomTool } = await import("./tool-learning");
      return createCustomTool(params.description);
    }
    case "list_custom_tools": {
      const { listCustomTools } = await import("./tool-learning");
      return { tools: await listCustomTools() };
    }
    case "delete_custom_tool": {
      const { deleteCustomTool } = await import("./tool-learning");
      return deleteCustomTool(params.name);
    }
    case "manage_skills": {
      switch (params.command) {
        case "list": {
          const allSkills = await storage.getSkills();
          return { skills: allSkills.map((s: any) => ({ id: s.id, name: s.name, description: s.description, enabled: s.enabled, category: s.category, icon: s.icon, personaId: s.personaId, hasPrompt: !!s.promptContent })), count: allSkills.length };
        }
        case "create": {
          if (!params.name) return { error: "name is required to create a skill" };
          if (!params.description) return { error: "description is required to create a skill" };
          if (!params.promptContent) return { error: "promptContent is required — this is the instruction set injected into the system prompt" };
          const skill = await storage.createSkill({
            name: params.name,
            description: params.description,
            promptContent: params.promptContent,
            category: params.category || "general",
            icon: params.icon || "Zap",
            enabled: true,
            personaId: params.personaId ?? null,
          });
          return { success: true, skill: { id: skill.id, name: skill.name, description: skill.description, enabled: skill.enabled, category: skill.category }, message: `Skill "${skill.name}" created and enabled. It will be injected into the system prompt for all future conversations.` };
        }
        case "update": {
          if (!params.id) return { error: "id is required to update a skill" };
          const updates: any = {};
          if (params.name !== undefined) updates.name = params.name;
          if (params.description !== undefined) updates.description = params.description;
          if (params.promptContent !== undefined) updates.promptContent = params.promptContent;
          if (params.category !== undefined) updates.category = params.category;
          if (params.icon !== undefined) updates.icon = params.icon;
          if ("personaId" in params) updates.personaId = params.personaId ?? null;
          if (Object.keys(updates).length === 0) return { error: "No fields provided to update. Provide at least one of: name, description, promptContent, category, icon, personaId" };
          const updated = await storage.updateSkill(params.id, updates);
          if (!updated) return { error: `Skill ${params.id} not found` };
          return { success: true, skill: { id: updated.id, name: updated.name, enabled: updated.enabled }, message: `Skill "${updated.name}" updated.` };
        }
        case "enable": {
          if (!params.id) return { error: "id is required" };
          const enabled = await storage.updateSkill(params.id, { enabled: true });
          return enabled ? { success: true, message: `Skill "${enabled.name}" enabled.` } : { error: `Skill ${params.id} not found` };
        }
        case "disable": {
          if (!params.id) return { error: "id is required" };
          const disabled = await storage.updateSkill(params.id, { enabled: false });
          return disabled ? { success: true, message: `Skill "${disabled.name}" disabled.` } : { error: `Skill ${params.id} not found` };
        }
        case "delete": {
          if (!params.id) return { error: "id is required" };
          const existingSkills = await storage.getSkills();
          const exists = existingSkills.find((s: any) => s.id === params.id);
          if (!exists) return { error: `Skill ${params.id} not found` };
          await storage.deleteSkill(params.id);
          return { success: true, message: `Skill "${exists.name}" (ID ${params.id}) deleted.` };
        }
        default:
          return { error: `Unknown manage_skills command: ${params.command}. Use: create, list, update, enable, disable, delete` };
      }
    }
    case "log_experiment": {
      const { logExperiment } = await import("./self-improvement");
      return logExperiment({
        hypothesis: params.hypothesis,
        approach: params.approach,
        category: params.category || "general",
        metric: params.metric,
        baselineValue: params.baselineValue,
        resultValue: params.resultValue,
        status: params.status,
        outcome: params.outcome,
        tenantId: params._tenantId || 1,
      });
    }
    case "get_experiments": {
      const { getExperimentHistory } = await import("./self-improvement");
      const exps = await getExperimentHistory(params.limit || 20, params.category, params._tenantId);
      return { experiments: exps, count: exps.length };
    }
    case "run_self_improvement": {
      const { runSelfImprovementCycle, extractSignalsFromLogs, detectStagnation, autoSelectStrategy } = await import("./self-improvement");
      const validCats = ["prompt_optimization", "response_quality", "tool_usage", "persona_tuning"];
      const validStrategies = ["balanced", "innovate", "harden", "repair-only"];
      const category = validCats.includes(params.category) ? params.category : "response_quality";
      const tenantId = params._tenantId || 1;
      const signals = extractSignalsFromLogs();
      const stagnation = await detectStagnation(category, tenantId);
      const manualOverride = validStrategies.includes(params.strategy);
      const strategy = manualOverride ? params.strategy : autoSelectStrategy(signals, stagnation);
      const results = await runSelfImprovementCycle({
        category,
        personaId: params.personaId ? parseInt(String(params.personaId)) : undefined,
        strategy,
        _manualStrategyOverride: manualOverride,
        _signals: signals,
        _stagnation: stagnation,
        tenantId,
      });
      return {
        strategy,
        signalsDetected: signals.length,
        signals: signals.slice(0, 5),
        stagnation: { isStagnant: stagnation.isStagnant, consecutiveFailures: stagnation.consecutiveFailures, recommendation: stagnation.recommendation },
        experimentsRun: results.length,
        kept: results.filter(r => r.status === "kept").length,
        reverted: results.filter(r => r.status === "reverted").length,
        inconclusive: results.filter(r => r.status === "inconclusive").length,
        results,
      };
    }
    case "draft_social_post": {
      const { draftSocialPost } = await import("./social-marketing");
      return draftSocialPost(params as any);
    }
    case "manage_content_calendar": {
      const { manageContentCalendar } = await import("./social-marketing");
      return manageContentCalendar(params as any);
    }
    case "marketing_analytics": {
      const { marketingAnalytics } = await import("./social-marketing");
      return marketingAnalytics(params as any);
    }
    case "marketing_experiment": {
      const { marketingExperiment } = await import("./social-marketing");
      return marketingExperiment(params as any);
    }
    case "generate_audio": {
      const provider = params.provider || "vibevoice";
      const text = params.text;
      if (!text) return { error: "text is required" };

      const filename = (params.filename || "narration").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fs = await import("fs");
      const path = await import("path");
      const outputDir = path.resolve(process.cwd(), "project-assets");
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      let audioBuffer: Buffer;
      let ext = "mp3";

      if (provider === "vibevoice") {
        try {
          const { vibevoiceTTS } = await import("./vibevoice");
          const vvResult = await vibevoiceTTS({ text, voice: params.voice || "Carter", output_path: path.join(outputDir, `${filename}.mp3`) });
          if (vvResult.success && vvResult.audio_base64) {
            audioBuffer = Buffer.from(vvResult.audio_base64, "base64");
            ext = vvResult.format || "mp3";
            console.log(`[generate_audio] VibeVoice TTS succeeded (${audioBuffer.length} bytes, $0 cost)`);
          } else {
            console.warn(`[generate_audio] VibeVoice failed: ${vvResult.error}, falling back to edge TTS`);
            const { synthesizeSpeech } = await import("./voice-utils");
            throw new Error("VibeVoice unavailable, will fall through to ElevenLabs path");
          }
        } catch (vvErr: any) {
          console.warn(`[generate_audio] VibeVoice failed (${vvErr.message}), falling back to edge/Google TTS`);
          try {
            const ttsGoogleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 200))}&tl=en&client=tw-ob`;
            const gResp = await fetch(ttsGoogleUrl, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://translate.google.com/" } });
            if (gResp.ok) {
              audioBuffer = Buffer.from(await gResp.arrayBuffer());
              console.log(`[generate_audio] Google TTS fallback succeeded (${audioBuffer.length} bytes, $0 cost)`);
            } else {
              return { error: `VibeVoice and Google TTS both failed. VibeVoice: ${vvErr.message}` };
            }
          } catch (gErr: any) {
            return { error: `VibeVoice and Google TTS both failed. Try provider 'elevenlabs' or 'openai' as a last resort.` };
          }
        }
      } else if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return { error: "OPENAI_API_KEY not configured" };
        try {
          const OpenAI = (await import("openai")).default;
          const client = new OpenAI({ apiKey });
          const voice = params.voice || "alloy";
          const response = await client.audio.speech.create({ model: "gpt-4o-mini-tts", voice: voice as any, input: text, response_format: "mp3" });
          const ab = await response.arrayBuffer();
          audioBuffer = Buffer.from(ab);
        } catch (ttsErr: any) {
          return { error: `OpenAI TTS failed: ${ttsErr.message?.slice(0, 200) || "Unknown error"}` };
        }
      } else {
        const ELEVENLABS_BASE = "https://api.elevenlabs.io";
        const key = process.env.ELEVENLABS_API_KEY;
        if (!key) return { error: "ELEVENLABS_API_KEY not configured" };
        const { loadTTSConfig } = await import("./tts-config");
        const ttsConfig = loadTTSConfig();
        const voiceId = params.voice || ttsConfig.elevenlabs.voiceId;

        let elResponse = await fetch(`${ELEVENLABS_BASE}/v1/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: { "xi-api-key": key, "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            model_id: ttsConfig.elevenlabs.modelId,
            output_format: "mp3_44100_128",
            voice_settings: { stability: ttsConfig.elevenlabs.stability, similarity_boost: ttsConfig.elevenlabs.similarityBoost },
          }),
        });

        if (!elResponse.ok && (elResponse.status === 404 || elResponse.status === 422)) {
          console.warn(`[generate_audio] ElevenLabs voice "${voiceId}" failed (${elResponse.status}), trying fallback voice "Sarah"`);
          const fallbackVoiceId = "EXAVITQu4vr4xnSDxMaL";
          elResponse = await fetch(`${ELEVENLABS_BASE}/v1/text-to-speech/${fallbackVoiceId}`, {
            method: "POST",
            headers: { "xi-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              model_id: ttsConfig.elevenlabs.modelId,
              output_format: "mp3_44100_128",
              voice_settings: { stability: ttsConfig.elevenlabs.stability, similarity_boost: ttsConfig.elevenlabs.similarityBoost },
            }),
          });
        }

        if (!elResponse.ok) {
          console.warn(`[generate_audio] ElevenLabs failed entirely, falling back to OpenAI TTS`);
          const oaiKey = process.env.OPENAI_API_KEY;
          if (oaiKey) {
            try {
              const OpenAI = (await import("openai")).default;
              const client = new OpenAI({ apiKey: oaiKey });
              const oaiResp = await client.audio.speech.create({ model: "gpt-4o-mini-tts", voice: "alloy" as any, input: text, response_format: "mp3" });
              const oaiAb = await oaiResp.arrayBuffer();
              audioBuffer = Buffer.from(oaiAb);
              console.log(`[generate_audio] OpenAI TTS fallback succeeded (${audioBuffer.length} bytes)`);
            } catch (fallbackErr: any) {
              return { error: `Both ElevenLabs and OpenAI TTS failed. ElevenLabs: voice error. OpenAI: ${fallbackErr.message?.slice(0, 200)}` };
            }
          } else {
            const errText = await elResponse.text();
            return { error: `ElevenLabs TTS failed (${elResponse.status}): ${errText.slice(0, 200)}` };
          }
        } else {
          const ab = await elResponse.arrayBuffer();
          audioBuffer = Buffer.from(ab);
        }
      }

      const outPath = path.join(outputDir, `${filename}.${ext}`);
      fs.writeFileSync(outPath, audioBuffer);
      console.log(`[generate_audio] Saved ${audioBuffer.length} bytes to ${outPath}`);

      let driveUrl: string | undefined;
      try {
        const { uploadAndShare } = await import("./google-drive");
        const driveResult = await uploadAndShare({
          filePath: outPath,
          fileName: `${filename}.${ext}`,
          mimeType: ext === "wav" ? "audio/wav" : "audio/mpeg",
          description: "Audio Narration",
          folderLabel: "VisionClaw Media/Audio",
        });
        if (driveResult.success && driveResult.viewUrl) {
          driveUrl = driveResult.viewUrl;
        }
      } catch (driveErr: any) {
        console.error(`[generate_audio] Drive upload failed:`, driveErr.message);
      }

      if (params.project_id) {
        try {
          await db.execute(sql`INSERT INTO project_files (project_id, file_name, file_path, file_url, file_type, file_size, uploaded_by) VALUES (${params.project_id}, ${filename + "." + ext}, ${outPath}, ${driveUrl || null}, ${"audio"}, ${audioBuffer.length}, ${"system"})`);
        } catch {}
      }

      return {
        success: true,
        file_path: outPath,
        drive_url: driveUrl || "Drive upload failed — file saved locally",
        size_bytes: audioBuffer.length,
        duration_estimate: `~${Math.round(text.split(/\s+/).length / 150 * 60)}s at 150 wpm`,
        provider,
      };
    }
    case "produce_video": {
      const fs = await import("fs");
      const path = await import("path");
      const { execSync, execFileSync } = await import("child_process");

      const outputDir = path.resolve(process.cwd(), "project-assets");
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      let ffmpegPath = "ffmpeg";
      try {
        ffmpegPath = execSync("which ffmpeg 2>/dev/null || command -v ffmpeg 2>/dev/null", { encoding: "utf-8", timeout: 5000 }).trim().split("\n")[0];
        if (!ffmpegPath) ffmpegPath = "ffmpeg";
      } catch { ffmpegPath = "ffmpeg"; }

      const title = (params.title || "video").replace(/[^a-zA-Z0-9_-]/g, "_");
      const steps: string[] = [];
      let audioPath: string | undefined;
      let driveVideoUrl: string | undefined;

      // Step 1: Generate audio
      console.log(`[produce_video] Step 1: Generating TTS audio...`);
      try {
        const audioResult = await executeTool("generate_audio", {
          text: params.script,
          provider: params.voice_provider || "vibevoice",
          filename: `${title}_narration`,
          project_id: params.project_id,
          _tenantId: params._tenantId,
        }, params._tenantId);
        if (audioResult?.file_path) {
          audioPath = audioResult.file_path;
          steps.push(`✅ Audio generated: ${audioResult.size_bytes} bytes, ${audioResult.duration_estimate}`);
        } else {
          steps.push(`❌ Audio generation failed: ${JSON.stringify(audioResult?.error || audioResult).slice(0, 200)}`);
          return { success: false, steps, error: "Audio generation failed" };
        }
      } catch (audioErr: any) {
        steps.push(`❌ Audio generation error: ${audioErr.message}`);
        return { success: false, steps, error: audioErr.message };
      }

      // Step 2: Create video from PDF + audio (with fallback to generated slides)
      console.log(`[produce_video] Step 2: Assembling video...`);
      let videoResult: any = null;

      // Try PDF-based video first
      const resolvedPdf = params.pdf_path ? path.resolve(process.cwd(), params.pdf_path) : undefined;
      if (resolvedPdf && fs.existsSync(resolvedPdf)) {
        try {
          videoResult = await executeTool("create_slideshow_video", {
            pdf_path: params.pdf_path,
            audio_path: audioPath,
            output_filename: title,
            project_id: params.project_id,
            title: params.title || title,
            _tenantId: params._tenantId,
          }, params._tenantId);
          if (!videoResult?.success) {
            console.log(`[produce_video] PDF video failed: ${videoResult?.error}. Falling back to generated slides.`);
            steps.push(`⚠️ PDF conversion failed (corrupt PDF), generating slides from script instead`);
            videoResult = null;
          }
        } catch (e: any) {
          console.log(`[produce_video] PDF video error: ${e.message}. Falling back.`);
          steps.push(`⚠️ PDF conversion error, generating slides from script instead`);
          videoResult = null;
        }
      } else {
        steps.push(`⚠️ No valid PDF found, generating slides from script`);
      }

      // Fallback: generate simple text-based slide images from the script
      if (!videoResult || !videoResult.success) {
        console.log(`[produce_video] Generating text slides from script...`);
        const slidesDir = path.join(outputDir, `text_slides_${Date.now()}`);
        fs.mkdirSync(slidesDir, { recursive: true });

        const scriptText = params.script || "";
        const sentences = scriptText.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 10);
        const slideCount = Math.min(Math.max(Math.ceil(sentences.length / 3), 3), 15);
        const sentencesPerSlide = Math.ceil(sentences.length / slideCount);

        const slideTexts: string[] = [];
        for (let i = 0; i < slideCount; i++) {
          const chunk = sentences.slice(i * sentencesPerSlide, (i + 1) * sentencesPerSlide).join(" ");
          if (chunk.trim()) slideTexts.push(chunk.trim());
        }
        if (slideTexts.length === 0) slideTexts.push(scriptText.slice(0, 200));

        // Generate simple colored slides with text using FFmpeg
        const slideFiles: string[] = [];
        const colors = ["#1a1a2e", "#16213e", "#0f3460", "#533483", "#2b2d42", "#1b263b", "#0d1b2a", "#161a30", "#1e3a5f", "#2c1654"];
        const escapeFFmpeg = (s: string) => s.replace(/[\\':;\[\]{}()]/g, " ").replace(/\s+/g, " ").trim();
        for (let i = 0; i < slideTexts.length; i++) {
          const slideFile = path.join(slidesDir, `slide_${String(i + 1).padStart(2, "0")}.png`);
          const bgColor = colors[i % colors.length];
          const text = escapeFFmpeg(slideTexts[i]).slice(0, 120);
          const slideTitle = i === 0 ? escapeFFmpeg(params.title || title).slice(0, 60) : "";
          const drawText = i === 0
            ? `drawtext=text='${slideTitle}':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h/3,drawtext=text='${text}':fontsize=28:fontcolor=#cccccc:x=(w-text_w)/2:y=h/2+40`
            : `drawtext=text='${text}':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`;
          try {
            execFileSync(ffmpegPath, [
              "-y", "-f", "lavfi", "-i", `color=c=${bgColor}:s=1920x1080:d=1`,
              "-vf", drawText,
              "-frames:v", "1", "-update", "1", slideFile
            ], { timeout: 10000, stdio: "pipe" });
            slideFiles.push(slideFile);
          } catch (slideErr: any) {
            console.error(`[produce_video] Slide ${i + 1} generation failed:`, slideErr.stderr?.toString().slice(-100) || slideErr.message);
            // Create a plain color slide as absolute fallback
            try {
              execFileSync(ffmpegPath, [
                "-y", "-f", "lavfi", "-i", `color=c=${bgColor}:s=1920x1080:d=1`,
                "-frames:v", "1", "-update", "1", slideFile
              ], { timeout: 5000, stdio: "pipe" });
              slideFiles.push(slideFile);
            } catch {}
          }
        }

        if (slideFiles.length === 0) {
          steps.push(`❌ Could not generate any slide images`);
          return { success: false, steps, error: "Failed to generate slide images" };
        }

        steps.push(`✅ Generated ${slideFiles.length} text slides from script`);

        // Build the video with generated slides
        try {
          const slidesArray = slideFiles.map(f => ({ image_path: f, duration: 0 }));
          videoResult = await executeTool("create_slideshow_video", {
            slides: slidesArray,
            audio_path: audioPath,
            output_filename: title,
            project_id: params.project_id,
            title: params.title || title,
            _tenantId: params._tenantId,
          }, params._tenantId);
        } catch (fallbackErr: any) {
          steps.push(`❌ Video assembly error: ${fallbackErr.message}`);
          return { success: false, steps, error: fallbackErr.message };
        }
      }

      if (videoResult?.success && videoResult?.drive_url && !videoResult.drive_url.includes("failed")) {
        driveVideoUrl = videoResult.drive_url;
        steps.push(`✅ Video assembled: ${videoResult.size_bytes} bytes, uploaded to Drive`);
      } else if (videoResult?.file_path) {
        steps.push(`⚠️ Video assembled locally but Drive upload failed. File: ${videoResult.file_path}`);
      } else {
        steps.push(`❌ Video assembly failed: ${JSON.stringify(videoResult?.error || videoResult).slice(0, 200)}`);
        return { success: false, steps, error: videoResult?.error || "Video assembly failed" };
      }

      // Step 3: Send email if requested
      if (params.email_to && driveVideoUrl) {
        console.log(`[produce_video] Step 3: Sending email to ${params.email_to}...`);
        try {
          await executeTool("send_email", {
            to: params.email_to,
            subject: `Your video is ready: ${params.title || title}`,
            text: `Your video "${params.title || title}" has been produced and uploaded to Google Drive.\n\nDownload link: ${driveVideoUrl}\n\n— VisionClaw Production Team`,
            _tenantId: params._tenantId,
          }, params._tenantId);
          steps.push(`✅ Email sent to ${params.email_to}`);
        } catch (emailErr: any) {
          steps.push(`⚠️ Email failed: ${emailErr.message}`);
        }
      }

      return {
        success: true,
        drive_url: driveVideoUrl,
        steps,
        title: params.title || title,
        instructions: driveVideoUrl ? `Video ready! Download: ${driveVideoUrl}` : "Video produced but Drive upload had issues. Check steps for details.",
      };
    }
    case "create_slideshow_video": {
      const fs = await import("fs");
      const path = await import("path");
      const { execFileSync } = await import("child_process");

      const { execSync } = await import("child_process");
      let ffmpegPath = "ffmpeg";
      try { 
        ffmpegPath = execSync("which ffmpeg 2>/dev/null || command -v ffmpeg 2>/dev/null || find /nix/store -name ffmpeg -type f 2>/dev/null | head -1", { encoding: "utf-8", timeout: 5000 }).trim().split("\n")[0]; 
        if (!ffmpegPath) throw new Error("not found");
        console.log(`[create_slideshow_video] Found ffmpeg at: ${ffmpegPath}`);
      } catch { 
        try {
          execSync("ffmpeg -version", { stdio: "pipe", timeout: 5000 });
          ffmpegPath = "ffmpeg";
          console.log(`[create_slideshow_video] ffmpeg available via PATH`);
        } catch {
          return { error: "FFmpeg is not available on this server" }; 
        }
      }

      const outputDir = path.resolve(process.cwd(), "project-assets");
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const workspaceRoot = path.resolve(process.cwd());
      const sanitizePath = (p: string) => {
        const resolved = path.resolve(workspaceRoot, p);
        if (!resolved.startsWith(workspaceRoot) && !resolved.startsWith("/tmp")) {
          throw new Error(`Path outside workspace: ${p}`);
        }
        return resolved;
      };

      let slides: { image_path: string; duration: number }[] = params.slides || [];
      const audioPath = params.audio_path ? sanitizePath(params.audio_path) : undefined;
      const outputFilename = (params.output_filename || "slideshow_video").replace(/[^a-zA-Z0-9_-]/g, "_");

      const pdfPath = params.pdf_path ? sanitizePath(params.pdf_path) : undefined;
      if (pdfPath && fs.existsSync(pdfPath)) {
        console.log(`[create_slideshow_video] Converting PDF to slide images: ${pdfPath}`);
        const pdfImagesDir = path.join(outputDir, `pdf_slides_${Date.now()}`);
        fs.mkdirSync(pdfImagesDir, { recursive: true });
        try {
          let pdftoppmPath = "pdftoppm";
          try { pdftoppmPath = execSync("which pdftoppm 2>/dev/null", { encoding: "utf-8", timeout: 3000 }).trim() || "pdftoppm"; } catch {}
          execFileSync(pdftoppmPath, ["-png", "-r", "150", pdfPath, path.join(pdfImagesDir, "slide")], { timeout: 30000, stdio: "pipe" });
          const slideFiles = fs.readdirSync(pdfImagesDir).filter((f: string) => f.endsWith(".png")).sort();
          console.log(`[create_slideshow_video] Extracted ${slideFiles.length} slides from PDF`);
          if (slideFiles.length > 0) {
            const perSlideDur = params.duration_per_slide || 0;
            slides = slideFiles.map((f: string) => ({ image_path: path.join(pdfImagesDir, f), duration: perSlideDur }));
          }
        } catch (pdfErr: any) {
          console.error(`[create_slideshow_video] PDF conversion failed:`, pdfErr.message);
          return { error: `PDF to images conversion failed: ${pdfErr.message}` };
        }
      }

      if (slides.length === 0) {
        if (pdfPath) return { error: `PDF conversion produced no slides from: ${pdfPath}` };
        return { error: "No slides provided. Pass slides array of { image_path, duration } objects, OR pass pdf_path to auto-convert a PDF deck." };
      }

      for (const s of slides) {
        if (!path.isAbsolute(s.image_path)) s.image_path = sanitizePath(s.image_path);
        if (!fs.existsSync(s.image_path)) return { error: `Slide image not found: ${s.image_path}` };
      }

      let totalDuration = 0;
      if (audioPath && fs.existsSync(audioPath)) {
        try {
          const ffprobePath = ffmpegPath.replace(/ffmpeg$/, "ffprobe");
          const probe = execFileSync(ffprobePath, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audioPath], { encoding: "utf-8" }).trim();
          totalDuration = parseFloat(probe) || 0;
        } catch {}
      }

      const defaultDur = totalDuration > 0 ? totalDuration / slides.length : 5;
      const slideList = slides.map((s) => ({
        image_path: s.image_path,
        duration: s.duration || defaultDur,
      }));

      const concatFile = path.join(outputDir, `${outputFilename}_concat.txt`);
      const escapePath = (p: string) => p.replace(/'/g, "'\\''");
      const concatLines = slideList.map(s => `file '${escapePath(s.image_path)}'\nduration ${s.duration}`).join("\n");
      fs.writeFileSync(concatFile, concatLines + `\nfile '${escapePath(slideList[slideList.length - 1].image_path)}'`);

      const outPath = path.join(outputDir, `${outputFilename}.mp4`);

      const ffArgs = ["-y", "-f", "concat", "-safe", "0", "-i", concatFile];
      const hasAudio = audioPath && fs.existsSync(audioPath);
      if (hasAudio) {
        ffArgs.push("-i", audioPath);
      }
      ffArgs.push("-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black", "-pix_fmt", "yuv420p");
      if (hasAudio) {
        ffArgs.push("-c:a", "aac", "-shortest");
      }
      ffArgs.push("-c:v", "libx264", "-r", "30", outPath);

      console.log(`[create_slideshow_video] Running ffmpeg with ${ffArgs.length} args`);
      try {
        execFileSync(ffmpegPath, ffArgs, { timeout: 120_000, stdio: "pipe" });
      } catch (ffErr: any) {
        return { error: `FFmpeg failed: ${ffErr.stderr?.toString().slice(-300) || ffErr.message}` };
      }

      const stats = fs.statSync(outPath);

      let driveUrl: string | undefined;
      try {
        const { uploadAndShare } = await import("./google-drive");
        const driveResult = await uploadAndShare({
          filePath: outPath,
          fileName: `${outputFilename}.mp4`,
          mimeType: "video/mp4",
          description: params.title || "Video Production",
          folderLabel: "VisionClaw Media/Videos",
        });
        if (driveResult.success && driveResult.viewUrl) {
          driveUrl = driveResult.viewUrl;
        }
      } catch (driveErr: any) {
        console.error(`[create_slideshow_video] Drive upload failed:`, driveErr.message);
      }

      if (params.project_id) {
        try {
          await db.execute(sql`INSERT INTO project_files (project_id, file_name, file_path, file_url, file_type, file_size, uploaded_by) VALUES (${params.project_id}, ${outputFilename + ".mp4"}, ${outPath}, ${driveUrl || null}, ${"video"}, ${stats.size}, ${"system"})`);
        } catch {}
      }

      try { fs.unlinkSync(concatFile); } catch {}

      return {
        success: true,
        file_path: outPath,
        drive_url: driveUrl || "Drive upload failed — file saved locally",
        size_bytes: stats.size,
        slides_count: slides.length,
        title: params.title || outputFilename,
      };
    }
    case "generate_social_image": {
      const { generateImage } = await import("./replit_integrations/image/client");
      const { uploadAndShare } = await import("./google-drive");
      const fsP = await import("fs/promises");
      
      const stylePrefix: Record<string, string> = {
        professional: "Clean, professional corporate style with modern design,",
        minimalist: "Minimalist design with ample white space and subtle colors,",
        vibrant: "Bold, vibrant colors with high contrast and energy,",
        tech: "Futuristic tech aesthetic with gradients, circuits, and digital elements,",
        corporate: "Polished corporate style suitable for business presentations,",
        creative: "Artistic, creative style with unique composition,",
        photorealistic: "Photorealistic, high-quality photograph-style,",
        illustration: "Modern digital illustration style,",
        infographic: "Clean infographic-style with data visualization elements,",
      };
      const platformHint: Record<string, string> = {
        x: "Optimized for Twitter/X (16:9 aspect ratio, bold text if any, eye-catching).",
        linkedin: "Professional LinkedIn post image (1200x627, clean and corporate).",
        instagram: "Square format (1:1) optimized for Instagram feed.",
        facebook: "Facebook post image (1200x630, engaging and shareable).",
        blog: "Blog header image (16:9, professional and relevant to topic).",
        general: "General-purpose marketing image.",
      };
      
      const style = params.style || "professional";
      const platform = params.platform || "general";
      const fullPrompt = `${stylePrefix[style] || ""} ${platformHint[platform] || ""} ${params.prompt}. No text overlays unless specifically requested.`;

      try {
        const dataUrl = await retryWithBackoff(() => generateImage(fullPrompt), { retries: 2, delayMs: 3000, label: "generate_social_image" });
        const base64Data = dataUrl.split(",")[1];
        const mimeMatch = dataUrl.match(/data:([^;]+);/);
        const mimeType = mimeMatch?.[1] || "image/png";
        const ext = mimeType.includes("jpeg") ? ".jpg" : ".png";
        const fileName = `social-image-${Date.now()}${ext}`;
        const pathMod = await import("path");
        const fsMod = await import("fs");
        const assetsDir = pathMod.resolve(process.cwd(), "project-assets");
        if (!fsMod.existsSync(assetsDir)) fsMod.mkdirSync(assetsDir, { recursive: true });
        const localPath = pathMod.join(assetsDir, fileName);
        await fsP.writeFile(localPath, Buffer.from(base64Data, "base64"));
        
        const folderLabel = params.folder_label || "VisionClaw Social Media/Generated Images";
        const driveResult = await uploadAndShare({ filePath: localPath, fileName, mimeType, folderLabel });
        
        const driveSuccess = driveResult?.success && driveResult?.viewUrl;
        return {
          success: true,
          imageUrl: driveSuccess ? driveResult.viewUrl : undefined,
          downloadUrl: driveSuccess ? (driveResult.downloadUrl || driveResult.viewUrl) : undefined,
          drive_url: driveSuccess ? driveResult.viewUrl : "Drive upload failed — file saved locally",
          local_path: localPath,
          fileName,
          platform,
          style,
          prompt: params.prompt,
          instructions: "Image generated. The local_path can be used as a slide image_path in create_slideshow_video.",
        };
      } catch (err: any) {
        return { error: `Image generation failed: ${err.message}` };
      }
    }
    case "compose_social_post": {
      const { draftSocialPost } = await import("./social-marketing");
      
      const draftResult = await draftSocialPost({
        platform: params.platform,
        topic: params.topic,
        style: params.style,
        include_cta: true,
        include_hashtags: true,
        _tenantId: (params as any)._tenantId,
      });
      
      if (draftResult.error) return draftResult;
      
      const imagePrompt = params.image_prompt || `Create a compelling visual for a ${params.platform} post about: ${params.topic}`;
      const imageResult = await executeTool("generate_social_image", {
        prompt: imagePrompt,
        style: params.image_style || "professional",
        platform: params.platform,
        folder_label: `VisionClaw Social Media/${params.campaign || "Posts"}`,
      });
      
      const tenantId = (params as any)._tenantId || 1;
      if (params.save_draft !== false) {
        const { saveDraftPost } = await import("./social-publisher");
        await saveDraftPost({
          tenantId,
          platform: params.platform,
          content: draftResult.draft,
          imageDriveUrl: imageResult?.imageUrl,
          campaign: params.campaign,
        }).catch(() => {});
      }
      
      return {
        success: true,
        platform: params.platform,
        post: {
          text: draftResult.draft,
          charCount: draftResult.char_count,
          ...(draftResult.warning ? { warning: draftResult.warning } : {}),
        },
        image: imageResult?.error ? { error: imageResult.error } : {
          driveUrl: imageResult?.imageUrl,
          downloadUrl: imageResult?.downloadUrl,
        },
        campaign: params.campaign || null,
        savedAsDraft: params.save_draft !== false,
        nextSteps: "Post is ready! Review the text and image. When approved, use publish_social_post to publish it, or edit as needed.",
      };
    }
    case "publish_social_post": {
      const { publishPost, getSocialConnections } = await import("./social-publisher");
      const tenantId = (params as any)._tenantId || 1;
      
      const connections = await getSocialConnections(tenantId);
      const conn = connections.find(c => c.platform === params.platform && c.enabled);
      if (!conn) {
        return {
          error: `No connected ${params.platform} account. Social media publishing requires connecting your ${params.platform} account first. This feature is being prepared — connect your account via Settings → Social Media when ready.`,
          status: "not_connected",
          setup_instructions: `To enable publishing to ${params.platform}: 1) Go to Settings → Social Media 2) Click "Connect ${params.platform}" 3) Authorize the app 4) Then use this tool to publish.`,
        };
      }
      
      return publishPost({
        tenantId,
        platform: params.platform,
        content: params.content,
        imageUrl: params.image_drive_url,
        campaign: params.campaign,
      });
    }
    case "manage_social_accounts": {
      const { getSocialConnections, getPlatformConfigs } = await import("./social-publisher");
      const tenantId = (params as any)._tenantId || 1;
      
      switch (params.action) {
        case "list": {
          const connections = await getSocialConnections(tenantId);
          return {
            connections: connections.map(c => ({
              platform: c.platform,
              accountName: c.accountName,
              enabled: c.enabled,
              connectedAt: c.connectedAt,
            })),
            total: connections.length,
          };
        }
        case "status": {
          const connections = await getSocialConnections(tenantId);
          const platforms = getPlatformConfigs();
          return {
            platforms: platforms.map(p => {
              const conn = connections.find(c => c.platform === p.platform);
              return {
                ...p,
                connected: !!conn?.enabled,
                accountName: conn?.accountName || null,
              };
            }),
          };
        }
        case "platforms": {
          return { supported_platforms: getPlatformConfigs() };
        }
        default:
          return { error: `Unknown action: ${params.action}` };
      }
    }
    case "manage_desk": {
      const deskMod = await import("./agent-desk");
      const tenantId = (params as any)._tenantId || 1;
      const personaId = (params as any)._personaId || 1;
      const action = params.action;

      switch (action) {
        case "view_desk": {
          const desk = await deskMod.getDesk(tenantId, personaId);
          return { desk, context: deskMod.buildDeskContext(desk) };
        }
        case "add_task":
          return await deskMod.addDeskTask(tenantId, personaId, {
            title: params.title, description: params.description, priority: params.priority, source: params.source,
          });
        case "update_task":
          return await deskMod.updateDeskTask(tenantId, personaId, params.taskId, {
            progressNote: params.progressNote, status: params.status, priority: params.priority,
          });
        case "complete_task":
          return { success: await deskMod.completeDeskTask(tenantId, personaId, params.taskId, params.progressNote) };
        case "block_task":
          return { success: await deskMod.blockDeskTask(tenantId, personaId, params.taskId, params.blockedBy || "Unknown") };
        case "unblock_task":
          return { success: await deskMod.unblockDeskTask(tenantId, personaId, params.taskId) };
        case "add_to_queue":
          return await deskMod.addToQueue(tenantId, personaId, {
            title: params.title, description: params.description, priority: params.priority, source: params.source,
          });
        case "pick_from_queue":
          return await deskMod.pickFromQueue(tenantId, personaId, params.taskId);
        case "set_focus":
          await deskMod.setDeskFocus(tenantId, personaId, params.focusArea || "");
          return { success: true, focusArea: params.focusArea };
        case "set_status":
          await deskMod.setDeskStatus(tenantId, personaId, params.statusNote || "");
          return { success: true, statusNote: params.statusNote };
        case "add_waiting": {
          const { db: deskDb } = await import("./db");
          const { sql: deskSql } = await import("drizzle-orm");
          const personaResult = await deskDb.execute(
            deskSql`SELECT id FROM personas WHERE name = ${params.waitingForPersona} LIMIT 1`
          );
          const wRows = (personaResult as any).rows || personaResult;
          const waitPersonaId = wRows[0]?.id || 0;
          return await deskMod.addWaiting(tenantId, personaId, {
            description: params.waitingDescription || params.description || "",
            waitingForPersonaId: waitPersonaId,
            relatedTaskId: params.taskId,
          });
        }
        case "resolve_waiting":
          return { success: await deskMod.resolveWaiting(tenantId, personaId, params.taskId) };
        default:
          return { error: `Unknown desk action: ${action}` };
      }
    }
    case "post_to_channel": {
      const channelsMod = await import("./agent-channels");
      const tenantId = (params as any)._tenantId || 1;
      const personaId = (params as any)._personaId || 0;
      const msg = await channelsMod.postMessage({
        tenantId,
        channelName: params.channel,
        fromPersonaId: personaId,
        content: params.content,
        messageType: params.messageType,
        metadata: params.metadata,
        threadId: params.threadId,
      });
      return msg ? { success: true, messageId: msg.id, channel: params.channel } : { error: `Channel ${params.channel} not found` };
    }
    case "read_channels": {
      const channelsMod = await import("./agent-channels");
      const tenantId = (params as any)._tenantId || 1;
      const personaId = (params as any)._personaId || 0;
      const messages = await channelsMod.readMessages({
        tenantId,
        channelName: params.channel,
        personaId,
        unreadOnly: params.unreadOnly !== false,
        limit: params.limit || 20,
      });
      if (personaId && messages.length > 0) {
        await channelsMod.markMessagesRead(tenantId, personaId, messages.map((m: any) => m.id));
      }
      return { messages, count: messages.length };
    }
    case "emit_event": {
      const eventBus = await import("./event-bus");
      const tenantId = (params as any)._tenantId || 1;
      const personaId = (params as any)._personaId || 0;
      const { db: evDb } = await import("./db");
      const { sql: evSql } = await import("drizzle-orm");
      const personaResult2 = await evDb.execute(
        evSql`SELECT name FROM personas WHERE id = ${personaId} LIMIT 1`
      );
      const pRows2 = (personaResult2 as any).rows || personaResult2;
      const source = pRows2[0]?.name ? `agent:${pRows2[0].name}` : "agent:unknown";
      const eventId = await eventBus.emitEvent({
        type: params.eventType,
        source,
        tenantId,
        data: params.data,
      });
      return { success: true, eventId, message: `Event ${params.eventType} emitted and routed to subscribers` };
    }
    case "track_outcome": {
      const tracker = await import("./outcome-tracker");
      const tenantId = (params as any)._tenantId || 1;
      const personaId = (params as any)._personaId || 0;
      switch (params.action) {
        case "track": {
          const id = await tracker.trackAction({
            tenantId, personaId,
            actionType: params.actionType || "general",
            actionRef: params.actionRef,
            description: params.description || "Action tracked",
            expectedOutcome: params.expectedOutcome,
            expectedMetric: params.expectedMetric,
            expectedValue: params.expectedValue,
          });
          return { success: true, outcomeId: id, message: `Action tracked as outcome #${id}` };
        }
        case "record_result": {
          if (!params.outcomeId) return { error: "outcomeId required for record_result" };
          await tracker.recordOutcome(params.outcomeId, tenantId, params.actualValue ?? null, params.actualOutcome || "", params.status || "unknown");
          return { success: true, message: `Outcome #${params.outcomeId} updated to ${params.status}` };
        }
        case "view": {
          const outcomes = await tracker.getOutcomes(tenantId, {
            personaId: params.personaId || personaId || undefined,
            actionType: params.actionType,
            status: params.status,
            limit: 20,
          });
          return { outcomes, count: outcomes.length };
        }
        case "view_patterns": {
          const patterns = await tracker.getPatterns(tenantId, personaId || undefined);
          return { patterns, count: patterns.length };
        }
        default:
          return { error: `Unknown action: ${params.action}` };
      }
    }
    case "manage_watchlist": {
      const wl = await import("./watchlist");
      const tenantId = (params as any)._tenantId || 1;
      const personaId = (params as any)._personaId || 0;
      switch (params.action) {
        case "add": {
          if (!params.name || !params.searchQueries?.length) return { error: "name and searchQueries required" };
          const personaMap: Record<string, number> = {
            visionclaw: 1, felix: 2, forge: 3, teagan: 4, blueprint: 5,
            "chief of staff": 6, scribe: 7, proof: 8, radar: 9, neptune: 10,
            apollo: 11, atlas: 12, cassandra: 13, luna: 14,
          };
          const escalateId = params.escalateTo ? personaMap[params.escalateTo.toLowerCase()] || undefined : undefined;
          const item = await wl.addWatchlistItem({
            tenantId, createdByPersonaId: personaId,
            name: params.name,
            category: params.category || "competitor",
            searchQueries: params.searchQueries,
            keywords: params.keywords,
            checkFrequency: params.checkFrequency || "daily",
            escalateToPersonaId: escalateId,
          });
          return { success: true, item, message: `Watchlist item "${params.name}" created` };
        }
        case "update": {
          if (!params.watchlistItemId) return { error: "watchlistItemId required" };
          await wl.updateWatchlistItem(tenantId, params.watchlistItemId, {
            name: params.name,
            category: params.category,
            searchQueries: params.searchQueries,
            keywords: params.keywords,
            checkFrequency: params.checkFrequency,
            enabled: params.enabled,
          });
          return { success: true, message: `Watchlist item #${params.watchlistItemId} updated` };
        }
        case "remove": {
          if (!params.watchlistItemId) return { error: "watchlistItemId required" };
          await wl.removeWatchlistItem(tenantId, params.watchlistItemId);
          return { success: true, message: `Watchlist item #${params.watchlistItemId} removed` };
        }
        case "list": {
          const items = await wl.getWatchlistItems(tenantId);
          return { items, count: items.length };
        }
        case "view_alerts": {
          const alerts = await wl.getAlerts(tenantId, {
            watchlistItemId: params.watchlistItemId,
            acknowledged: false,
            limit: 30,
          });
          return { alerts, count: alerts.length };
        }
        case "scan_now": {
          const result = await wl.scanDueWatchlistItems(tenantId);
          return { success: true, ...result, message: `Scanned ${result.scanned} items, created ${result.alerts} alerts` };
        }
        default:
          return { error: `Unknown action: ${params.action}` };
      }
    }
    case "finance_news": {
      const { fetchFinanceNews } = await import("./finance-tools");
      const sources = Array.isArray(params.sources) ? params.sources : undefined;
      const count = Math.min(Math.max(params.count || 10, 1), 20);
      return fetchFinanceNews(sources, count);
    }
    case "finance_stock_price": {
      const { fetchStockPrice } = await import("./finance-tools");
      if (!params.ticker) return { error: "ticker is required (e.g., '600519' for Moutai)" };
      const days = Math.min(Math.max(params.days || 30, 1), 365);
      return fetchStockPrice(params.ticker, days);
    }
    case "finance_stock_search": {
      const { searchStocks } = await import("./finance-tools");
      if (!params.query) return { error: "query is required (company name or ticker code)" };
      return searchStocks(params.query, params.market || "a");
    }
    case "finance_market_overview": {
      const { getMarketOverview } = await import("./finance-tools");
      return getMarketOverview();
    }
    case "strategic_interview": {
      const { startInterview, processInterviewAnswer, abandonInterview } = await import("./deep-interview");
      const tenantId = params._tenantId;
      if (!tenantId) return { error: "Authentication required" };
      const conversationId = params._conversationId || 0;

      if (params.action === "start") {
        if (!params.topic) return { error: "topic is required when action='start'" };
        const result = startInterview({ tenantId, conversationId, topic: params.topic });
        return { interview_id: result.interviewId, question: result.firstQuestion, status: "interviewing" };
      }
      if (params.action === "answer") {
        if (!params.interview_id || !params.answer) return { error: "interview_id and answer required when action='answer'" };
        const result = await processInterviewAnswer({ interviewId: params.interview_id, answer: params.answer, tenantId });
        if (result.complete) {
          return { status: "complete", strategic_brief: result.strategicBrief, clarity_scores: result.clarityScores, overall_clarity: result.overallClarity };
        }
        return { status: "interviewing", next_question: result.nextQuestion, clarity_scores: result.clarityScores, overall_clarity: result.overallClarity };
      }
      if (params.action === "abandon") {
        if (params.interview_id) abandonInterview(params.interview_id, tenantId);
        return { status: "abandoned" };
      }
      return { error: "action must be 'start', 'answer', or 'abandon'" };
    }
    case "export_persona": {
      const { exportPersona, exportToMarkdown } = await import("./persona-export");
      const tenantId = params._tenantId;
      if (!tenantId) return { error: "Authentication required" };
      if (!params.persona_id) return { error: "persona_id is required" };

      const exported = await exportPersona(params.persona_id, tenantId);
      if (!exported) return { error: `Persona ${params.persona_id} not found` };

      if (params.format === "json") return exported;
      return { markdown: exportToMarkdown(exported), format: "visionclaw-agent-v1" };
    }
    default: {
      if (name.startsWith("custom_")) {
        const { executeCustomTool } = await import("./tool-learning");
        return executeCustomTool(name, params);
      }
      return { error: `Unknown tool: "${name}". This tool does not exist yet. If you need this capability, use the create_tool tool to build it — describe what the tool should do and the system will generate, test, and register it automatically. Then call it in the next round.` };
    }
  }
}

export async function getAllToolDefinitions(): Promise<ToolDefinition[]> {
  try {
    const { getCustomToolDefinitions } = await import("./tool-learning");
    const customDefs = await getCustomToolDefinitions();
    return [...TOOL_DEFINITIONS, ...customDefs];
  } catch {
    return TOOL_DEFINITIONS;
  }
}

export const PROVIDERS_SUPPORTING_TOOLS = new Set(["replit", "openai", "anthropic", "google", "xai", "openrouter"]);

const SLOW_TOOLS = new Set(["web_fetch", "web_search", "firecrawl_search", "firecrawl_scrape", "firecrawl_crawl", "firecrawl_map", "browser", "analyze_pdf", "exec", "execute_code", "deep_research", "plan_and_execute", "draft_social_post", "orchestrate", "generate_social_image", "compose_social_post", "publish_social_post", "debate", "tree_of_thought", "estimate_cost", "generate_audio", "create_slideshow_video", "produce_video", "strategic_interview"]);
const DEFAULT_TOOL_TIMEOUT_MS = 60_000;
const SLOW_TOOL_TIMEOUT_MS = 120_000;
const VERY_SLOW_TOOLS = new Set(["produce_video", "deep_research", "orchestrate", "firecrawl_crawl"]);
const VERY_SLOW_TOOL_TIMEOUT_MS = 300_000;

export async function executeToolWithTimeout(name: string, params: Record<string, any>): Promise<any> {
  const timeoutMs = VERY_SLOW_TOOLS.has(name) ? VERY_SLOW_TOOL_TIMEOUT_MS : SLOW_TOOLS.has(name) ? SLOW_TOOL_TIMEOUT_MS : DEFAULT_TOOL_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await Promise.race([
      executeTool(name, params),
      new Promise((_, reject) => {
        controller.signal.addEventListener("abort", () =>
          reject(new Error(`Tool "${name}" timed out after ${timeoutMs / 1000}s`))
        );
      }),
    ]);
    return result;
  } finally {
    clearTimeout(timer);
  }
}

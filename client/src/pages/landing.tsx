import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Crown, Wrench, PenTool, Shield, Search, BarChart3,
  Brain, Mic, CreditCard, Activity, Users, Zap,
  MessageSquare, Database, ArrowRight, Check, Cpu,
  Clock, Globe, Layers, DollarSign, TrendingUp,
  CheckCircle2, ArrowRightLeft, Sparkles, Key, Scale, Gavel,
  Image, Share2, FileText, Code, Mail, Workflow,
  Eye, Palette, ShieldCheck, Target, Rocket, ChevronRight,
  Monitor, Smartphone, HeadphonesIcon, BookOpen, Lightbulb,
} from "lucide-react";

const PERSONA_LIST = [
  { name: "VisionClaw", role: "Personal AI Assistant", icon: Bot, description: "Your always-on personal assistant. Handles any task, remembers everything, and knows when to call in specialists." },
  { name: "Felix", role: "CEO & Orchestrator", icon: Crown, description: "Decomposes complex requests into multi-step execution plans, delegates to specialist agents, and synthesizes results." },
  { name: "Forge", role: "CTO & Staff Engineer", icon: Wrench, description: "Writes code, deploys integrations, debugs systems, reviews architecture, and builds technical solutions on demand." },
  { name: "Teagan", role: "CMO & Content Marketing", icon: PenTool, description: "Plans campaigns, creates email sequences, generates AI images, and drives marketing strategy across channels." },
  { name: "Blueprint", role: "VP Engineering", icon: Workflow, description: "Designs system architecture, plans engineering workflows, and manages multi-agent technical projects." },
  { name: "Chief of Staff", role: "Operations Director", icon: Crown, description: "Optimizes workflows, balances agent workloads, and ensures the entire corporate team runs smoothly." },
  { name: "Scribe", role: "Content Director", icon: PenTool, description: "Writes blog posts, newsletters, documentation, reports, presentations, and any long-form content." },
  { name: "Proof", role: "QA Director", icon: Shield, description: "Automatically reviews every deliverable for quality, accuracy, and completeness. Scores outputs on a 10-point scale." },
  { name: "Radar", role: "Intelligence Analyst", icon: Search, description: "Monitors competitors, scans for market opportunities, and delivers real-time intelligence briefings." },
  { name: "Neptune", role: "Wellness Specialist", icon: Globe, description: "Health and wellness guidance, emotional eating interventions, companion messaging, and deep research." },
  { name: "Apollo", role: "Strategy & Revenue", icon: BarChart3, description: "Business strategy, revenue optimization, pricing analysis, and financial pipeline management." },
  { name: "Atlas", role: "Finance & Analytics", icon: Activity, description: "Financial analysis, KPI dashboards, trend analysis, and data-driven business recommendations." },
  { name: "Cassandra", role: "Risk & Forecasting", icon: Scale, description: "Risk assessment, financial modeling, predictive analytics, and budget governance." },
  { name: "Luna", role: "Legal & Compliance", icon: Gavel, description: "Legal research, contract review, regulatory compliance, and governance framework management." },
];

const CAPABILITY_SECTIONS = [
  {
    title: "Autonomous Operations",
    subtitle: "Your AI team works 24/7 — researching, learning, and improving on its own",
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    features: [
      { icon: Clock, label: "Heartbeat Engine", detail: "13 scheduled tasks run autonomously — self-reflection, memory consolidation, cloud backups, model scouting, and more. 100% uptime." },
      { icon: Crown, label: "CEO Orchestrator", detail: "Complex requests get decomposed into DAG execution plans. Felix delegates to specialists and synthesizes results across 5 delegation levels." },
      { icon: ArrowRightLeft, label: "Live Delegation Feed", detail: "Watch agents work in real-time with animated activity bubbles, cost tracking, voice narration, and auto-QA quality scores." },
      { icon: ShieldCheck, label: "Human-in-the-Loop Safety", detail: "High-risk actions require your approval. 40 governance rules, trust scores, and earned autonomy keep your AI team operating safely." },
    ],
  },
  {
    title: "Nightly Autoresearch",
    subtitle: "Your AI team researches while you sleep — and injects what it learns",
    icon: Search,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    features: [
      { icon: Globe, label: "11 Research Programs", detail: "Nightly programs covering AI models, security, competitive analysis, architecture, and your specific business domain." },
      { icon: Lightbulb, label: "Smart Keep/Discard Loop", detail: "Each session runs 5-15 experiments. Findings scoring 6+ auto-inject into the knowledge base with vector embeddings." },
      { icon: Brain, label: "Self-Improving Knowledge", detail: "352 experiments in the last 4 days, 92 findings kept, 114 knowledge entries created. Your AI gets smarter every night." },
      { icon: Target, label: "Cross-Persona Intelligence", detail: "Research findings route to the right specialist. Legal research goes to Luna, competitive intel goes to Radar — automatically." },
    ],
  },
  {
    title: "97 Enterprise AI Tools",
    subtitle: "Everything a modern business needs, powered by 36+ AI models",
    icon: Layers,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    features: [
      { icon: FileText, label: "Documents & Slides", detail: "PDFs, PowerPoints, Mermaid diagrams, charts, dashboards — generated and uploaded to Google Drive automatically." },
      { icon: Code, label: "Code & Execution", detail: "Write code, execute it in a sandbox, review architecture, generate code proposals, and manage technical projects." },
      { icon: Globe, label: "Virtual Browser", detail: "Navigate websites, take screenshots, fill forms, extract data. Full web research and competitive monitoring." },
      { icon: Mail, label: "Multi-Channel Comms", detail: "Email (AgentMail), WhatsApp, Discord, Telegram — your AI team communicates across every channel." },
    ],
  },
  {
    title: "Memory & Intelligence",
    subtitle: "An AI that remembers, learns from experience, and self-improves",
    icon: Brain,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    features: [
      { icon: Database, label: "Three-Tier Memory", detail: "Episodic, semantic, and procedural memory with pgvector search. Your AI never forgets important details." },
      { icon: Sparkles, label: "Dream Consolidation", detail: "Every 6 hours, the system 'sleeps' — merging duplicates, archiving stale data, promoting important findings, and creating summaries." },
      { icon: Lightbulb, label: "Instinct Learning", detail: "Agents extract reusable patterns from successful tasks. After 3+ uses, patterns become permanent knowledge. They get better through experience." },
      { icon: Eye, label: "LLM-Judged Relevance", detail: "GPT-4.1 Mini picks the most relevant knowledge for each query in real-time. Not just similar — actually relevant to what you need." },
    ],
  },
  {
    title: "AI-Powered Content & Media",
    subtitle: "Create professional content across every format",
    icon: Share2,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    features: [
      { icon: Image, label: "AI Image Generation", detail: "Generate professional graphics for social media, presentations, and marketing. Platform-optimized sizing." },
      { icon: Mic, label: "Voice & Audio", detail: "Text-to-speech with OpenAI and ElevenLabs. Speech-to-text with speaker diarization. Real-time voice narration." },
      { icon: Monitor, label: "Video Production", detail: "End-to-end video creation with TTS narration, slide generation, and MP4 compilation. Auto-uploaded to Google Drive." },
      { icon: Palette, label: "36+ AI Models", detail: "Smart routing across OpenAI, Anthropic, Google, xAI, and more. OAuth-first for cost optimization. The right model for every task." },
    ],
  },
  {
    title: "Security & Governance",
    subtitle: "Enterprise-grade safety with earned autonomy and full audit trails",
    icon: Shield,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    features: [
      { icon: ShieldCheck, label: "40 Governance Rules", detail: "Based on NIST, OWASP, and Singapore IMDA standards. 7 categories covering data, comms, finance, code, and behavior." },
      { icon: Users, label: "Trust Score System", detail: "9 trust categories per agent. Earned autonomy progression — agents prove they can be trusted before getting independence." },
      { icon: Key, label: "Multi-Tenant Isolation", detail: "Complete data isolation between tenants. Admin PIN auth, timing-safe crypto, rate limiting, and circuit breakers." },
      { icon: CheckCircle2, label: "Auto-QA Pipeline", detail: "Every deliverable is automatically reviewed by Proof for quality. Color-coded scores on completeness, accuracy, and clarity." },
    ],
  },
];

const PRICING_TIERS = [
  {
    name: "Free Trial",
    price: 0,
    description: "Experience the full platform",
    features: [
      "5 free conversations",
      "All 14 AI agents",
      "Voice, tools & memory",
      "Full feature access",
    ],
    cta: "Try Free — No Credit Card",
    highlighted: false,
    trial: true,
  },
  {
    name: "Starter",
    price: 29,
    description: "For individuals getting started",
    features: [
      "3 AI personas",
      "200 messages/day",
      "100 conversations/mo",
      "Basic memory",
      "Email support",
    ],
    byokBonus: "BYOK: 1,000 msgs/day, unlimited convos",
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: 99,
    description: "Full AI toolkit for professionals",
    features: [
      "5 AI personas",
      "1,000 messages/day",
      "Unlimited conversations",
      "Full memory + knowledge",
      "Voice conversations",
      "Social media tools",
      "Priority support",
    ],
    byokBonus: "BYOK: 5,000 msgs/day, unlimited tools",
    cta: "Start Pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: 299,
    description: "Full autonomous AI operations",
    features: [
      "Full 14-agent team",
      "5,000 messages/day",
      "Autonomous heartbeat",
      "Advanced analytics",
      "Social media publishing",
      "Custom integrations",
      "Dedicated onboarding",
    ],
    byokBonus: "BYOK: Unlimited everything",
    cta: "Contact Sales",
    highlighted: false,
  },
];

interface PublicStats {
  totalConversations: number;
  totalMessages: number;
  totalAutonomousTasks: number;
  totalMemories: number;
  uptime: number;
}

type ActivityEvent = {
  id: number;
  agent: string;
  icon: any;
  action: string;
  detail: string;
  type: "task" | "revenue" | "delegation" | "memory" | "analysis" | "social";
  value?: string;
};

const ACTIVITY_EVENTS: Omit<ActivityEvent, "id">[] = [
  { agent: "Felix", icon: Crown, action: "Orchestration complete", detail: "Decomposed complex request into 5-step DAG — delegated to Radar, Scribe, and Proof", type: "delegation" },
  { agent: "Radar", icon: Search, action: "Nightly research complete", detail: "15 experiments run, 5 findings kept — competitive analysis knowledge auto-injected", type: "analysis", value: "+5 findings" },
  { agent: "Proof", icon: Shield, action: "Auto-QA review scored 9.2", detail: "Reviewed Scribe's deliverable — completeness: 10, accuracy: 9, clarity: 9, professionalism: 9", type: "delegation", value: "9.2/10" },
  { agent: "VisionClaw", icon: Bot, action: "Dream consolidation complete", detail: "Merged 8 duplicate memories, archived 12 stale entries, promoted 3 findings to permanent knowledge", type: "memory" },
  { agent: "Forge", icon: Wrench, action: "Code proposal generated", detail: "Research finding auto-generated code proposal for new agent architecture pattern", type: "task" },
  { agent: "Scribe", icon: PenTool, action: "Content published", detail: "Blog post: '5 Ways AI Agents Drive Revenue' — 2,400 words, auto-uploaded to Drive", type: "task" },
  { agent: "Luna", icon: Gavel, action: "Compliance scan complete", detail: "All 40 governance rules validated — zero violations. NIST/OWASP frameworks current", type: "task" },
  { agent: "Neptune", icon: Globe, action: "Deep research delivered", detail: "48-page wellness intervention analysis with crisis response scripts — 10 findings kept", type: "analysis", value: "+10 findings" },
  { agent: "Apollo", icon: BarChart3, action: "Revenue analysis complete", detail: "Pricing strategy research yielded 4 optimization recommendations — auto-injected to knowledge", type: "analysis", value: "+4 insights" },
  { agent: "Atlas", icon: Activity, action: "Model routing optimized", detail: "Smart routing saved $2,340 this month — OAuth-first routing cut API costs 41%", type: "analysis", value: "-$2.3K cost" },
  { agent: "Chief of Staff", icon: Crown, action: "Heartbeat 100% healthy", detail: "93/93 autonomous tasks completed successfully — self-reflection, backups, model scout all green", type: "delegation" },
  { agent: "Teagan", icon: PenTool, action: "Campaign created", detail: "Complete LinkedIn post with AI-generated image, hashtags, and CTA — ready to publish", type: "social", value: "Post Ready" },
  { agent: "Cassandra", icon: Scale, action: "Risk assessment complete", detail: "Financial model updated — AI spending under control: $340/month across all providers", type: "analysis", value: "Under budget" },
  { agent: "Blueprint", icon: Workflow, action: "Architecture research", detail: "Nightly agent architecture scan found 3 new patterns — instinct learning updated", type: "analysis", value: "+3 patterns" },
  { agent: "VisionClaw", icon: Bot, action: "Instinct graduated", detail: "Multi-tool pattern reached 70%+ confidence after 3 observations — promoted to permanent knowledge", type: "memory" },
  { agent: "Radar", icon: Search, action: "Security intelligence", detail: "Nightly security scan complete — 6 findings auto-injected into Luna's knowledge base", type: "analysis", value: "+6 alerts" },
];

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  task: { color: "text-blue-500", bg: "bg-blue-500/10", label: "Task" },
  revenue: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Revenue" },
  delegation: { color: "text-amber-500", bg: "bg-amber-500/10", label: "Delegation" },
  memory: { color: "text-purple-500", bg: "bg-purple-500/10", label: "Memory" },
  analysis: { color: "text-cyan-500", bg: "bg-cyan-500/10", label: "Intel" },
  social: { color: "text-pink-500", bg: "bg-pink-500/10", label: "Social" },
};

function LiveActivityDemo() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [tasksComplete, setTasksComplete] = useState(0);
  const nextIdRef = useRef(0);
  const eventIndexRef = useRef(0);

  useEffect(() => {
    const initial: ActivityEvent[] = [];
    for (let i = 0; i < 4; i++) {
      initial.push({ ...ACTIVITY_EVENTS[i], id: nextIdRef.current++ });
    }
    eventIndexRef.current = 4;
    setEvents(initial);
    setTasksComplete(4);
    setRevenue(18400);

    const interval = setInterval(() => {
      const idx = eventIndexRef.current % ACTIVITY_EVENTS.length;
      const evt = ACTIVITY_EVENTS[idx];
      eventIndexRef.current++;

      setEvents((prev) => {
        const next = [{ ...evt, id: nextIdRef.current++ }, ...prev];
        return next.slice(0, 8);
      });
      setTasksComplete((p) => p + 1);
      if (evt.type === "revenue") {
        const match = evt.value?.match(/[\d,.]+/);
        if (match) {
          const num = parseFloat(match[0].replace(",", "")) * 1000;
          setRevenue((p) => p + (evt.value?.includes("-") ? 0 : num));
        }
      }
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="section-demo" className="py-20 px-6 bg-muted/30 border-t border-border" data-testid="section-demo">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live Simulation
          </Badge>
          <h2 className="text-3xl font-bold mb-3" data-testid="text-demo-title">Watch Your AI Corporation Work</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            This is what VisionClaw looks like in action — agents completing tasks, delegating to specialists, 
            running research, and managing operations, all without human intervention.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Agent Activity Feed
                  </CardTitle>
                  <Badge variant="outline" className="text-xs gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    Running
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-0 overflow-hidden">
                <div className="space-y-2" role="log" aria-live="polite" aria-relevant="additions" data-testid="demo-activity-feed">
                  {events.map((event, i) => {
                    const Icon = event.icon;
                    const typeStyle = TYPE_CONFIG[event.type];
                    return (
                      <div
                        key={event.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border border-border/50 transition-all duration-500 ${
                          i === 0 ? "animate-in slide-in-from-top-2 motion-reduce:animate-none bg-primary/[0.03]" : "opacity-80"
                        }`}
                        data-testid={`demo-event-${event.id}`}
                      >
                        <div className={`w-8 h-8 rounded-md ${typeStyle.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className={`w-4 h-4 ${typeStyle.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{event.agent}</span>
                            <span className="text-xs text-muted-foreground">&middot;</span>
                            <span className="text-sm text-muted-foreground">{event.action}</span>
                            {event.value && (
                              <Badge variant="secondary" className={`text-xs ${typeStyle.color}`}>
                                {event.value}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.detail}</p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Revenue Generated</div>
                    <div className="text-2xl font-bold text-emerald-500" data-testid="text-demo-revenue">
                      ${revenue.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>+23% this quarter</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Tasks Completed</div>
                    <div className="text-2xl font-bold" data-testid="text-demo-tasks">{tasksComplete}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="w-3 h-3" />
                  <span>Fully autonomous</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-pink-500" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Social Posts Created</div>
                    <div className="text-2xl font-bold" data-testid="text-demo-social">
                      {Math.floor(tasksComplete * 0.25)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-pink-500">
                  <Image className="w-3 h-3" />
                  <span>With AI-generated images</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Memories Stored</div>
                    <div className="text-2xl font-bold" data-testid="text-demo-memories">
                      {Math.floor(tasksComplete * 1.8)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  <span>Learns from every task</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Sign Up & Meet Your Team",
      description: "Create your account and get instant access to all 14 AI agents. Each one is already trained with specialized expertise.",
      icon: Users,
    },
    {
      number: "02",
      title: "Give Instructions or Let Them Work",
      description: "Chat naturally, use voice, or set up autonomous tasks. Your AI team understands context and collaborates to get things done.",
      icon: MessageSquare,
    },
    {
      number: "03",
      title: "Review & Approve",
      description: "High-impact actions need your approval. Everything else runs autonomously. You stay in control without micromanaging.",
      icon: ShieldCheck,
    },
    {
      number: "04",
      title: "Scale Your Operations",
      description: "As your AI team learns your preferences, they work faster and smarter. Add your own API keys for unlimited capacity.",
      icon: Rocket,
    },
  ];

  return (
    <section className="py-20 px-6 border-t border-border" data-testid="section-how-it-works">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <Badge variant="secondary" className="mb-4">4 Simple Steps</Badge>
          <h2 className="text-3xl font-bold mb-3">How It Works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From sign-up to fully autonomous AI operations in minutes, not months.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative" data-testid={`step-${step.number}`}>
                <div className="text-5xl font-bold text-primary/10 mb-3">{step.number}</div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  const cases = [
    {
      title: "Startup Founder",
      description: "Let your AI team handle marketing, content, research, and operations while you focus on product and customers.",
      agents: ["Felix", "Scribe", "Radar", "Apollo"],
      result: "Save 40+ hours/week on operational work",
    },
    {
      title: "Marketing Agency",
      description: "Generate social media content with AI images, manage content calendars, run A/B tests, and track performance.",
      agents: ["Teagan", "Neptune", "Atlas", "Proof"],
      result: "10x content output with consistent brand voice",
    },
    {
      title: "Freelancer / Consultant",
      description: "Professional email management, research briefings, document generation, and client deliverables — automated.",
      agents: ["VisionClaw", "Scribe", "Neptune", "Apollo"],
      result: "Handle 3x more clients with the same hours",
    },
    {
      title: "Small Business Owner",
      description: "Customer support chatbot, automated bookkeeping insights, competitive monitoring, and compliance tracking.",
      agents: ["VisionClaw", "Cassandra", "Radar", "Luna"],
      result: "Run a leaner operation with AI-powered efficiency",
    },
  ];

  return (
    <section id="section-use-cases" className="py-20 px-6 bg-muted/30 border-t border-border" data-testid="section-use-cases">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Use Cases</Badge>
          <h2 className="text-3xl font-bold mb-3">Built for How You Work</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Whether you're a solo founder or a growing team, VisionClaw adapts to your workflow.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {cases.map((uc) => (
            <Card key={uc.title} data-testid={`card-usecase-${uc.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="pt-6 pb-6 px-6 space-y-4">
                <h3 className="font-semibold text-lg">{uc.title}</h3>
                <p className="text-sm text-muted-foreground">{uc.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {uc.agents.map((a) => (
                    <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium">
                  <TrendingUp className="w-4 h-4" />
                  <span>{uc.result}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [, navigate] = useLocation();

  const { data: stats } = useQuery<PublicStats>({
    queryKey: ["/api/public/stats"],
    refetchInterval: 30000,
  });

  const uptimeHours = stats ? Math.floor(stats.uptime / 3600) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between gap-4 h-14">
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg" data-testid="text-landing-logo">VisionClaw</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {[
              { id: "section-demo", label: "Demo" },
              { id: "section-capabilities", label: "Features" },
              { id: "section-agents", label: "Agents" },
              { id: "section-use-cases", label: "Use Cases" },
              { id: "section-pricing", label: "Pricing" },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById(tab.id)?.scrollIntoView({ behavior: "smooth" })}
                data-testid={`nav-tab-${tab.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              data-testid="button-landing-signin"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/signup")}
              data-testid="button-landing-signup"
            >
              Sign Up Free
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden py-28 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 dark:from-primary/10 dark:via-transparent dark:to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.07] via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="gap-1.5" data-testid="badge-hero-status">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Platform Online — 14 Agents, 97 Tools, 36+ Models
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight" data-testid="text-hero-title">
            Your Autonomous
            <br />
            <span className="text-primary">AI Corporation</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Deploy 14 specialized AI agents that research, learn, and improve autonomously 24/7.
            97 enterprise tools, 36+ AI models with smart routing, nightly autoresearch,
            and self-improving knowledge — governed by 40 safety rules.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-3">
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="gap-2"
              data-testid="button-hero-get-started"
            >
              Start Free — No Credit Card
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => document.getElementById("section-demo")?.scrollIntoView({ behavior: "smooth" })}
              data-testid="button-hero-view-demo"
            >
              Watch Live Demo
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> 97 built-in AI tools</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> 14 specialist agents</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Nightly autoresearch</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Self-improving memory</span>
          </div>
        </div>
      </section>

      <LiveActivityDemo />

      <section id="section-capabilities" className="py-20 px-6 border-t border-border" data-testid="section-capabilities">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">Platform Capabilities</Badge>
            <h2 className="text-3xl font-bold mb-3">Everything Your Business Needs</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Not just a chatbot — a self-improving AI corporation with 97 tools, 
              nightly autoresearch, autonomous governance, and enterprise-grade infrastructure.
            </p>
          </div>

          <div className="space-y-16">
            {CAPABILITY_SECTIONS.map((section, sIdx) => {
              const SectionIcon = section.icon;
              return (
                <div key={section.title} data-testid={`capability-section-${sIdx}`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 rounded-lg ${section.bg} flex items-center justify-center`}>
                      <SectionIcon className={`w-5 h-5 ${section.color}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{section.title}</h3>
                      <p className="text-sm text-muted-foreground">{section.subtitle}</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {section.features.map((feature) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <Card key={feature.label} className="border-border/60" data-testid={`card-capability-${feature.label.toLowerCase().replace(/\s+/g, "-")}`}>
                          <CardContent className="pt-5 pb-5 px-4 space-y-2">
                            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                              <FeatureIcon className="w-4 h-4 text-primary" />
                            </div>
                            <h4 className="font-semibold text-sm">{feature.label}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">{feature.detail}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="section-agents" className="py-20 px-6 bg-muted/30 border-t border-border" data-testid="section-agents">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Meet the Team</Badge>
            <h2 className="text-3xl font-bold mb-3">14 Specialized AI Agents</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each agent has unique expertise, personality, and tools. They collaborate as a coordinated team —
              delegating tasks, sharing knowledge, and escalating when needed.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {PERSONA_LIST.map((persona) => {
              const Icon = persona.icon;
              return (
                <Card key={persona.name} className="group hover:border-primary/30 transition-colors" data-testid={`card-persona-${persona.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  <CardContent className="pt-5 pb-5 px-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{persona.name}</div>
                        <div className="text-xs text-muted-foreground">{persona.role}</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{persona.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <HowItWorks />

      <UseCases />

      <section className="py-20 px-6 border-t border-border" data-testid="section-live-stats">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Real Numbers</Badge>
            <h2 className="text-3xl font-bold mb-3">Live Platform Stats</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Real data from a production system. Updated in real time.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: MessageSquare, label: "Conversations", value: stats?.totalConversations ?? "—" },
              { icon: Layers, label: "Messages Processed", value: stats?.totalMessages ?? "—" },
              { icon: Activity, label: "Autonomous Tasks", value: stats?.totalAutonomousTasks ?? "—" },
              { icon: Database, label: "Memories Stored", value: stats?.totalMemories ?? "—" },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} data-testid={`card-live-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="pt-5 pb-5 px-4 text-center space-y-2">
                  <Icon className="w-5 h-5 text-primary mx-auto" />
                  <div className="text-2xl sm:text-3xl font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          {stats && (
            <div className="text-center mt-6">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span data-testid="text-uptime">System uptime: {uptimeHours}+ hours</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="section-pricing" className="py-20 px-6 bg-muted/30 border-t border-border" data-testid="section-pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl font-bold mb-3">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start free. Scale as your AI corporation grows. Bring your own API keys for unlimited capacity.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRICING_TIERS.map((tier: any) => (
              <Card
                key={tier.name}
                className={`${tier.highlighted ? "border-primary shadow-sm" : ""} ${tier.trial ? "border-amber-500/50 bg-amber-500/[0.02]" : ""}`}
                data-testid={`card-pricing-${tier.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {tier.highlighted && (
                  <div className="px-5 pt-4">
                    <Badge data-testid="badge-most-popular">Most Popular</Badge>
                  </div>
                )}
                {tier.trial && (
                  <div className="px-5 pt-4">
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" data-testid="badge-free-trial">
                      <Sparkles className="w-3 h-3 mr-1" /> Free Trial
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-baseline gap-1">
                    {tier.price === 0 ? (
                      <span className="text-4xl font-bold">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">${tier.price}</span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {tier.features.map((feature: string) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {tier.byokBonus && (
                    <div className="flex items-start gap-2 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2 border border-emerald-500/20" data-testid={`byok-bonus-${tier.name.toLowerCase()}`}>
                      <Key className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{tier.byokBonus}</span>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    variant={tier.highlighted ? "default" : "outline"}
                    onClick={() => navigate("/signup")}
                    data-testid={`button-pricing-${tier.name.toLowerCase()}`}
                  >
                    {tier.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 space-y-3 text-center" data-testid="section-byok-info">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-5 py-2.5">
              <Key className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300">
                <strong>Bring Your Own Key (BYOK):</strong> Use your own AI provider API keys and get up to 5x more usage on any paid plan.
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto" data-testid="text-byok-disclosure">
              BYOK Disclosure: When using your own API keys, response quality, speed, and reliability depend on your chosen AI provider.
              VisionClaw provides the agent framework, tools, and orchestration.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-border" data-testid="section-cta">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to deploy your AI corporation?</h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Start with 5 free conversations. Experience all 14 agents, 97 tools, voice, nightly autoresearch,
            self-improving memory, and autonomous operations. No credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="gap-2"
              data-testid="button-cta-signup"
            >
              Start Free Now
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            <span>VisionClaw</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors" data-testid="link-footer-terms">Terms of Service</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors" data-testid="link-footer-privacy">Privacy Policy</button>
            <a href="mailto:huskyauto@gmail.com" className="hover:text-foreground transition-colors" data-testid="link-footer-contact">Contact</a>
          </div>
          <div className="flex items-center gap-4">
            <span data-testid="text-footer-copyright">&copy; {new Date().getFullYear()} AI Buddy LLC. All rights reserved.</span>
            <a
              href="https://replit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border hover:border-primary/30 hover:bg-muted transition-all text-xs"
              data-testid="link-powered-by-replit"
            >
              <svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 5.5C7 4.67157 7.67157 4 8.5 4H15.5C16.3284 4 17 4.67157 17 5.5V12H8.5C7.67157 12 7 11.3284 7 10.5V5.5Z" fill="currentColor" opacity="0.7"/>
                <path d="M17 12H25.5C26.3284 12 27 12.6716 27 13.5V18.5C27 19.3284 26.3284 20 25.5 20H17V12Z" fill="currentColor" opacity="0.85"/>
                <path d="M7 21.5C7 20.6716 7.67157 20 8.5 20H17V28H8.5C7.67157 28 7 27.3284 7 26.5V21.5Z" fill="currentColor"/>
              </svg>
              <span>Built on <strong>Replit</strong></span>
            </a>
          </div>
        </div>
      </footer>
      <CookieConsent />
    </div>
  );
}

function CookieConsent() {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem("cookie_consent_dismissed") === "true"
  );

  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4" data-testid="banner-cookie-consent">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-sm text-muted-foreground flex-1">
          We use essential cookies only to keep you logged in. No tracking or advertising cookies.
          See our{" "}
          <a href="/privacy" className="text-primary underline underline-offset-2">Privacy Policy</a>{" "}
          for details.
        </p>
        <Button
          size="sm"
          onClick={() => {
            localStorage.setItem("cookie_consent_dismissed", "true");
            setDismissed(true);
          }}
          data-testid="button-accept-cookies"
        >
          Got it
        </Button>
      </div>
    </div>
  );
}

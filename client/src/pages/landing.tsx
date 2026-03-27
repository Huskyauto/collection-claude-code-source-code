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
  { name: "Felix", role: "CEO & Strategist", icon: Crown, description: "Makes strategic decisions, approves major actions, and orchestrates complex multi-department operations." },
  { name: "Forge", role: "Staff Engineer", icon: Wrench, description: "Writes code, deploys integrations, debugs systems, and builds technical solutions on demand." },
  { name: "Teagan", role: "Content Marketing Lead", icon: PenTool, description: "Plans campaigns, creates email sequences, and drives marketing strategy across all channels." },
  { name: "Chief of Staff", role: "Operations Director", icon: Crown, description: "Optimizes workflows, balances agent workloads, and ensures the entire team runs smoothly." },
  { name: "Scribe", role: "Content Creator", icon: PenTool, description: "Writes blog posts, newsletters, documentation, landing pages, and any long-form content." },
  { name: "Proof", role: "Content Reviewer & QA", icon: Shield, description: "Reviews all content for quality, accuracy, brand voice, and compliance before publishing." },
  { name: "Radar", role: "Intelligence Analyst", icon: Search, description: "Monitors competitors, scans for opportunities, and delivers real-time intelligence briefings." },
  { name: "Neptune", role: "Deep Research Specialist", icon: Globe, description: "Conducts thorough multi-source research with full reports when Radar spots something worth investigating." },
  { name: "Apollo", role: "Revenue Manager", icon: BarChart3, description: "Tracks revenue, manages invoicing, processes payments, and optimizes your financial pipeline." },
  { name: "Atlas", role: "Metrics & Analytics", icon: Activity, description: "Builds dashboards, tracks KPIs, analyzes trends, and provides data-driven recommendations." },
  { name: "Blueprint", role: "Multi-Agent Operator", icon: Workflow, description: "Designs and executes complex agent workflows where multiple personas collaborate on big projects." },
  { name: "Cassandra", role: "Chief Financial Officer", icon: Scale, description: "Manages budgets, forecasts spending, tracks AI costs, and ensures financial governance." },
  { name: "Luna", role: "Legal & Compliance", icon: Gavel, description: "Reviews contracts, ensures regulatory compliance, and manages governance rules." },
];

const CAPABILITY_SECTIONS = [
  {
    title: "AI-Powered Social Media",
    subtitle: "Create, schedule, and publish — all handled by your AI team",
    icon: Share2,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    features: [
      { icon: Image, label: "AI Image Generation", detail: "Generate professional social media graphics using AI. Platform-optimized for X, LinkedIn, Instagram, and Facebook." },
      { icon: PenTool, label: "Smart Content Drafting", detail: "Brand-voice-aware post creation with platform-specific formatting, hashtags, and CTAs." },
      { icon: Target, label: "Complete Post Composer", detail: "One command creates both the text and matching image — a ready-to-publish package." },
      { icon: BarChart3, label: "A/B Testing & Analytics", detail: "Run marketing experiments, track engagement, and get AI-powered optimization recommendations." },
    ],
  },
  {
    title: "Autonomous Operations",
    subtitle: "Your AI team works 24/7 without you lifting a finger",
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    features: [
      { icon: Clock, label: "Heartbeat Engine", detail: "Scheduled tasks run automatically — daily reports, market scans, health checks, and more." },
      { icon: Crown, label: "CEO Orchestrator", detail: "Complex requests get broken into execution plans. The AI CEO delegates to specialists and synthesizes results." },
      { icon: ArrowRightLeft, label: "Agent-to-Agent Delegation", detail: "Agents hand off work to each other. Radar spots intel → Neptune researches → Scribe writes the report." },
      { icon: ShieldCheck, label: "Human-in-the-Loop Safety", detail: "High-risk actions (spending, publishing, deleting) require your approval. Full control when it matters." },
    ],
  },
  {
    title: "Enterprise AI Tools",
    subtitle: "Everything a modern business needs, powered by AI",
    icon: Layers,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    features: [
      { icon: FileText, label: "PDF Generation & Analysis", detail: "Create multi-page PDFs, fill forms, analyze documents — all uploaded to Google Drive automatically." },
      { icon: Mail, label: "Email Management", detail: "Full email inbox with AI-powered triage, drafting, and automated follow-ups." },
      { icon: Code, label: "Code Execution", detail: "Run Python, JavaScript, and shell commands. Build integrations, analyze data, and automate workflows." },
      { icon: Globe, label: "Web Research & Browsing", detail: "Deep web research with the virtual browser. Scrape data, monitor sites, and gather competitive intelligence." },
    ],
  },
  {
    title: "Memory & Intelligence",
    subtitle: "An AI that actually remembers and learns from every interaction",
    icon: Brain,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    features: [
      { icon: Database, label: "Persistent Memory", detail: "Three-tier memory system: short-term, working, and long-term. Your AI never forgets important details." },
      { icon: BookOpen, label: "Knowledge Base", detail: "Upload documents, create knowledge collections, and give your agents specialized expertise." },
      { icon: Lightbulb, label: "Self-Improvement Engine", detail: "Agents learn from failures, save lessons, and automatically improve their approach over time." },
      { icon: Eye, label: "Governance & Rules", detail: "31 built-in governance rules ensure agents operate within defined boundaries. Full audit trail." },
    ],
  },
  {
    title: "Voice & Communication",
    subtitle: "Talk to your AI team naturally — they talk back",
    icon: Mic,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    features: [
      { icon: HeadphonesIcon, label: "Voice Conversations", detail: "Real-time voice streaming with natural speech-to-text and text-to-speech. Hands-free AI collaboration." },
      { icon: Smartphone, label: "WhatsApp Integration", detail: "Chat with your AI team via WhatsApp. Get briefings, assign tasks, and receive alerts on the go." },
      { icon: Monitor, label: "Embeddable Chat Widget", detail: "Deploy a customizable chat widget on your website. Let visitors talk to your AI team directly." },
      { icon: Palette, label: "Multi-Model Intelligence", detail: "Choose from 40+ AI models across 6 providers. Fast, balanced, powerful, or reasoning — pick the right brain for each task." },
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
  { agent: "Apollo", icon: BarChart3, action: "Revenue report generated", detail: "Q1 revenue up 23% — $847K ARR projected", type: "revenue", value: "+$18.4K" },
  { agent: "Forge", icon: Wrench, action: "Deployed API integration", detail: "Stripe webhook handler v2.1 shipped to production", type: "task" },
  { agent: "Felix", icon: Crown, action: "Strategic decision made", detail: "Approved expansion into EU market based on Radar's intel", type: "task" },
  { agent: "Radar", icon: Search, action: "Competitive intelligence", detail: "Detected 3 competitor pricing changes — briefing sent to Felix", type: "analysis" },
  { agent: "Neptune", icon: Globe, action: "Social media image created", detail: "Generated LinkedIn post graphic for product launch announcement", type: "social", value: "AI Image" },
  { agent: "Scribe", icon: PenTool, action: "Content published", detail: "Blog post: '5 Ways AI Agents Drive Revenue' — 2,400 words", type: "task" },
  { agent: "Proof", icon: Shield, action: "Content approved", detail: "Reviewed and approved Scribe's blog post — zero revisions needed", type: "delegation" },
  { agent: "Neptune", icon: Globe, action: "Deep research complete", detail: "48-page market analysis on AI agent platforms delivered", type: "analysis" },
  { agent: "Atlas", icon: Activity, action: "Metrics dashboard updated", detail: "Customer churn down 12%, NPS score: 72 (+8 from last month)", type: "revenue", value: "-12% churn" },
  { agent: "Chief of Staff", icon: Crown, action: "Operations optimized", detail: "Reassigned 3 tasks to balance agent workload — 15% faster throughput", type: "delegation" },
  { agent: "Teagan", icon: PenTool, action: "Social post composed", detail: "Complete LinkedIn post with AI-generated image — ready to publish", type: "social", value: "Post Ready" },
  { agent: "VisionClaw", icon: Bot, action: "Memory consolidated", detail: "Archived 12 stale entries, created 3 new relationship summaries", type: "memory" },
  { agent: "Apollo", icon: BarChart3, action: "Invoice processed", detail: "Enterprise client invoice $12,500 — payment confirmed via Stripe", type: "revenue", value: "+$12.5K" },
  { agent: "Cassandra", icon: Scale, action: "Budget review complete", detail: "AI spending under control: $340/month across all providers, 41% below cap", type: "revenue", value: "-$240 saved" },
  { agent: "Luna", icon: Gavel, action: "Compliance check passed", detail: "All 31 governance rules validated — zero violations this quarter", type: "task" },
  { agent: "Atlas", icon: Activity, action: "Cost analysis complete", detail: "Model routing saved $2,340 this month — 41% reduction in API costs", type: "revenue", value: "-$2.3K cost" },
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
            This is what VisionClaw looks like in action — agents completing tasks, generating content with images, 
            analyzing markets, and delegating work to each other, all without human intervention.
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
    <section className="py-20 px-6 bg-muted/30 border-t border-border" data-testid="section-use-cases">
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
            Platform Online — 14 Agents Ready
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight" data-testid="text-hero-title">
            Your AI-Powered
            <br />
            <span className="text-primary">Corporate Team</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Deploy 14 specialized AI agents that handle marketing, research, finance, content, engineering, 
            and operations — autonomously, 24/7. Complete with AI image generation, social media publishing, 
            and enterprise-grade tools.
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
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> 5 free conversations</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> All 14 agents included</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> AI image generation</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Voice & tools</span>
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
              Not just a chatbot — a complete AI-powered business operations platform with 50+ tools, 
              social media automation, and enterprise-grade infrastructure.
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

      <section className="py-20 px-6 bg-muted/30 border-t border-border" data-testid="section-pricing">
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
            Start with 5 free conversations. Experience all 14 agents, voice, tools, AI image generation, 
            and autonomous operations. No credit card required.
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

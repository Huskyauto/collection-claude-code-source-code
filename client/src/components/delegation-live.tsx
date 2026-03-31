import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Zap, Search, FileText, Send, Brain, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Volume2, VolumeX } from "lucide-react";

interface DelegationEvent {
  id: string;
  conversationId: number;
  timestamp: number;
  type: "started" | "thinking" | "tool_call" | "sub_delegation" | "progress" | "completed" | "error";
  agentName: string;
  agentRole?: string;
  message: string;
  parentAgent?: string;
  depth: number;
  metadata?: Record<string, any>;
}

const AGENT_COLORS: Record<string, string> = {
  "Felix": "bg-blue-500",
  "VisionClaw": "bg-purple-600",
  "Forge": "bg-orange-500",
  "Teagan": "bg-pink-500",
  "Blueprint": "bg-cyan-500",
  "Chief of Staff": "bg-slate-600",
  "Scribe": "bg-emerald-500",
  "Proof": "bg-red-500",
  "Radar": "bg-yellow-500",
  "Neptune": "bg-teal-500",
  "Apollo": "bg-amber-500",
  "Atlas": "bg-indigo-500",
  "Cassandra": "bg-violet-500",
  "Luna": "bg-rose-500",
};

function getEventIcon(type: string) {
  switch (type) {
    case "started": return <Bot className="w-3.5 h-3.5" />;
    case "thinking": return <Brain className="w-3.5 h-3.5" />;
    case "tool_call": return <Zap className="w-3.5 h-3.5" />;
    case "sub_delegation": return <Send className="w-3.5 h-3.5" />;
    case "progress": return <Search className="w-3.5 h-3.5" />;
    case "completed": return <CheckCircle2 className="w-3.5 h-3.5" />;
    case "error": return <AlertCircle className="w-3.5 h-3.5" />;
    default: return <FileText className="w-3.5 h-3.5" />;
  }
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = "en-US";

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Google") && v.lang.startsWith("en")
    ) || voices.find(v =>
      v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Daniel")
    ) || voices.find(v =>
      v.lang.startsWith("en") && v.localService
    );

    if (preferred) utterance.voice = preferred;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

function generateNarration(event: DelegationEvent): string | null {
  switch (event.type) {
    case "started":
      return event.parentAgent
        ? `${event.parentAgent} is bringing in ${event.agentName} to help with this.`
        : `${event.agentName} is getting started.`;
    case "tool_call":
      return `${event.agentName} is ${event.message}.`;
    case "sub_delegation":
      return event.message.length > 5 ? event.message : `Bringing in another team member.`;
    case "completed":
      return `${event.agentName} finished their part.`;
    case "error":
      return `Small hiccup, but we're handling it.`;
    default:
      return null;
  }
}

interface DelegationLiveFeedProps {
  conversationId?: number;
  enabled?: boolean;
  position?: "bottom-right" | "bottom-left" | "top-right";
  maxVisible?: number;
}

export function DelegationLiveFeed({
  conversationId,
  enabled = true,
  position = "bottom-right",
  maxVisible = 5,
}: DelegationLiveFeedProps) {
  const [events, setEvents] = useState<DelegationEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [narrationOn, setNarrationOn] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const narrationQueueRef = useRef<string[]>([]);
  const isNarratingRef = useRef(false);
  const narrationOnRef = useRef(false);

  useEffect(() => { narrationOnRef.current = narrationOn; }, [narrationOn]);

  const processNarrationQueue = useCallback(async () => {
    if (isNarratingRef.current || narrationQueueRef.current.length === 0) return;
    if (!narrationOnRef.current) {
      narrationQueueRef.current = [];
      return;
    }
    isNarratingRef.current = true;
    const text = narrationQueueRef.current.shift()!;
    try {
      await speakText(text);
    } catch {}
    isNarratingRef.current = false;
    if (narrationQueueRef.current.length > 0) {
      processNarrationQueue();
    }
  }, []);

  useEffect(() => {
    if (!narrationOn) {
      narrationQueueRef.current = [];
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    }
  }, [narrationOn]);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let aborted = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (aborted) return;
      const es = new EventSource("/api/delegation-events/stream", { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!aborted) setIsConnected(true);
      };

      es.onmessage = (msg) => {
        if (aborted) return;
        try {
          const event: DelegationEvent = JSON.parse(msg.data);
          setEvents(prev => [...prev, event].slice(-20));

          if (narrationOnRef.current) {
            const narration = generateNarration(event);
            if (narration) {
              narrationQueueRef.current.push(narration);
              processNarrationQueue();
            }
          }
        } catch {}
      };

      es.onerror = () => {
        if (aborted) { es.close(); return; }
        setIsConnected(false);
        es.close();
        reconnectTimer = setTimeout(() => {
          if (!aborted) connect();
        }, 3000);
      };
    };

    connect();

    return () => {
      aborted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [enabled, processNarrationQueue]);

  if (!enabled || events.length === 0) return null;

  const visibleEvents = isExpanded ? events.slice(-maxVisible) : events.slice(-1);

  const positionClasses = {
    "bottom-right": "bottom-20 right-4",
    "bottom-left": "bottom-20 left-4",
    "top-right": "top-4 right-4",
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 w-80 max-w-[calc(100vw-2rem)]`}
      data-testid="delegation-live-feed"
    >
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-700 shadow-2xl overflow-hidden">
        <div className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/80">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            data-testid="delegation-feed-toggle"
          >
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            <span className="text-xs font-medium text-gray-300">Agent Activity</span>
            <span className="text-[10px] text-gray-500">({events.length})</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
          </button>
          <button
            onClick={() => setNarrationOn(!narrationOn)}
            className={`p-1 rounded transition-colors ${narrationOn ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
            title={narrationOn ? "Turn off voice narration" : "Turn on voice narration (free, uses browser speech)"}
            data-testid="narration-toggle"
          >
            {narrationOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>

        <AnimatePresence mode="popLayout">
          {visibleEvents.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, height: 0, y: 10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="border-t border-gray-800"
            >
              <div className="px-3 py-2 flex items-start gap-2">
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 ${AGENT_COLORS[event.agentName] || "bg-gray-600"}`}>
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">{event.agentName}</span>
                    {event.depth > 0 && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-gray-700 text-gray-400">L{event.depth}</span>
                    )}
                    <span className="text-[10px] text-gray-500 ml-auto">{timeAgo(event.timestamp)}</span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5 leading-relaxed truncate">
                    {event.message}
                  </p>
                  {event.type === "completed" && event.metadata?.costUsd != null && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-400 font-mono" data-testid={`cost-badge-${event.id}`}>
                        ${event.metadata.costUsd < 0.001 ? "<0.001" : event.metadata.costUsd.toFixed(4)}
                      </span>
                      {event.metadata.inputTokens != null && (
                        <span className="text-[10px] text-gray-500 font-mono">
                          {(event.metadata.inputTokens / 1000).toFixed(1)}k/{(event.metadata.outputTokens / 1000).toFixed(1)}k tok
                        </span>
                      )}
                      {event.metadata.durationMs != null && (
                        <span className="text-[10px] text-gray-500">
                          {event.metadata.durationMs < 1000 ? `${event.metadata.durationMs}ms` : `${(event.metadata.durationMs / 1000).toFixed(1)}s`}
                        </span>
                      )}
                    </div>
                  )}
                  {event.metadata?.qaResult && (
                    <div className="mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        event.metadata.qaResult.verdict === "approved" ? "bg-green-900/50 text-green-400" :
                        event.metadata.qaResult.verdict === "needs-revision" ? "bg-yellow-900/50 text-yellow-400" :
                        "bg-red-900/50 text-red-400"
                      }`} data-testid={`qa-badge-${event.id}`}>
                        QA: {event.metadata.qaResult.verdict} ({event.metadata.qaResult.score}/10)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function useDelegationEvents(conversationId?: number) {
  const [events, setEvents] = useState<DelegationEvent[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/delegation-events/stream", { withCredentials: true });

    es.onmessage = (msg) => {
      try {
        const event: DelegationEvent = JSON.parse(msg.data);
        setEvents(prev => [...prev, event].slice(-50));
        if (event.type === "started" || event.type === "sub_delegation") setIsActive(true);
        if (event.type === "completed" || event.type === "error") {
          setTimeout(() => setIsActive(false), 2000);
        }
      } catch {}
    };

    return () => es.close();
  }, [conversationId]);

  return { events, isActive, clearEvents: () => setEvents([]) };
}

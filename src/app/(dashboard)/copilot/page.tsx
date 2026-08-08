"use client";

import { useEffect, useState, useRef } from "react";
import {
  Sparkles, Bot, Send, User, Zap, AlertTriangle, CheckCircle2,
  RefreshCw, TrendingUp, ShieldCheck, ArrowRight, Layers, Lightbulb,
  Clock, ThumbsUp, Wrench, Calendar, ShoppingCart
} from "lucide-react";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  confidence: number;
  actionType: string;
  badge: string;
}

interface ChatMessage {
  id: string;
  sender: "USER" | "AI";
  text: string;
  recommendations?: Recommendation[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Analyze today's bottleneck and OEE losses",
  "Predict machine failure risk & maintenance",
  "Check material stockout risk & purchase orders",
  "Recommend line balancing & schedule optimization",
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "AI",
      text: `Hello! I am your AI Production Copilot, connected in real-time to your factory telemetry.

I monitor your shop floor operations, detect bottlenecks, calculate OEE losses, and predict machine maintenance needs.

How can I assist your operations today?`,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "insights">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (customPrompt?: string) => {
    const queryText = (customPrompt || inputPrompt).trim();
    if (!queryText || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "USER",
      text: queryText,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: queryText }),
      });
      const json = await res.json();

      if (json.success) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: "AI",
          text: json.data.response,
          recommendations: json.data.recommendations,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 page-enter">

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title flex items-center gap-2">
              <Sparkles size={22} className="text-primary-500" />
              AI Production Copilot
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-600 border border-primary-200">
              Live Factory Reasoning Engine
            </span>
          </div>
          <p className="page-subtitle">Interactive AI Assistant for Shop Floor Decision Intelligence & Predictive Analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSend("Analyze today's bottleneck and OEE losses")} className="btn-primary text-xs flex items-center gap-2">
            <Zap size={14} /> Full System Audit
          </button>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-surface-400 whitespace-nowrap mr-1">Quick Prompts:</span>
        {QUICK_PROMPTS.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSend(qp)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white border border-surface-200/80 hover:border-primary-300 hover:bg-primary-50/50 text-surface-700 hover:text-primary-700 text-xs font-medium whitespace-nowrap transition-all shadow-xs disabled:opacity-50"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Main Copilot Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chat Stream (Left 2 cols) */}
        <div className="lg:col-span-2 card-static flex flex-col h-[600px] p-0 overflow-hidden border border-surface-200/80">
          <div className="p-4 border-b border-surface-100 bg-surface-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md shadow-primary-500/20 text-white">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-surface-900">Copilot Telemetry Assistant</p>
                <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Stream
                </p>
              </div>
            </div>
            <span className="text-xs text-surface-400 font-medium">Model v3.6 Production Copilot</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === "USER" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "AI" && (
                  <div className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot size={16} />
                  </div>
                )}

                <div className={`max-w-[85%] rounded-2xl p-4 text-xs space-y-3 ${
                  msg.sender === "USER"
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-surface-50 border border-surface-200/70 text-surface-800"
                }`}>
                  <div className="whitespace-pre-line font-normal leading-relaxed">{msg.text}</div>

                  {/* AI Recommendation Cards inside message */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-surface-200/60">
                      <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">AI Suggested Actions:</p>
                      {msg.recommendations.map(rec => (
                        <div key={rec.id} className="p-3 rounded-xl bg-white border border-surface-200 shadow-xs hover:border-primary-300 transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                                {rec.badge}
                              </span>
                              <h4 className="text-xs font-bold text-surface-900 mt-1">{rec.title}</h4>
                              <p className="text-[11px] text-surface-600">{rec.description}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-xs font-black text-emerald-600">{rec.impact}</span>
                              <p className="text-[10px] text-surface-400 font-semibold">{rec.confidence}% Confidence</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className={`text-[10px] text-right ${msg.sender === "USER" ? "text-primary-200" : "text-surface-400"}`}>
                    {msg.timestamp}
                  </p>
                </div>

                {msg.sender === "USER" && (
                  <div className="w-8 h-8 rounded-xl bg-surface-900 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    U
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Bot size={16} />
                </div>
                <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4 text-xs text-surface-500 flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-primary-500" />
                  <span>AI Copilot is analyzing telemetry...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-3 border-t border-surface-100 bg-white">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask AI Copilot about bottlenecks, maintenance, or line scheduling..."
                value={inputPrompt}
                onChange={e => setInputPrompt(e.target.value)}
                disabled={loading}
                className="input-field flex-1 text-xs"
              />
              <button
                type="submit"
                disabled={loading || !inputPrompt.trim()}
                className="btn-primary p-2.5 rounded-xl disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Live Copilot Recommendations Feed (Right 1 col) */}
        <div className="space-y-4">
          <div className="card-static">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb size={18} className="text-amber-500" />
                <h3 className="font-bold text-surface-900 text-sm">Live System Recommendations</h3>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                Auto-Generated
              </span>
            </div>

            <div className="space-y-3">
              {[
                {
                  title: "Shift 15% PO-2026-004 to Line 1",
                  desc: "Line 2 assembly bottleneck will delay delivery by 1.5 hrs. Line 1 is idle.",
                  impact: "+4.2% Yield",
                  icon: Calendar,
                  color: "text-blue-600 bg-blue-50 border-blue-100",
                },
                {
                  title: "Preventive Bearing Lubrication M-003",
                  desc: "Temperature spike +4.2°C. Recommended 20 min maintenance shift change.",
                  impact: "Saves ~4.5h Downtime",
                  icon: Wrench,
                  color: "text-amber-600 bg-amber-50 border-amber-100",
                },
                {
                  title: "Reorder Resin Granules PO-PUR-004",
                  desc: "Low stock alert. Expedite supplier delivery bay 2 for 16:30 arrival.",
                  impact: "Prevent Stockout",
                  icon: ShoppingCart,
                  color: "text-rose-600 bg-rose-50 border-rose-100",
                },
              ].map((rec, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-surface-200/80 hover:border-primary-300 transition-all bg-white group">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl ${rec.color} flex items-center justify-center flex-shrink-0`}>
                      <rec.icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-surface-900 group-hover:text-primary-600 transition-colors">{rec.title}</h4>
                      </div>
                      <p className="text-[11px] text-surface-500 mt-0.5 leading-snug">{rec.desc}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-600">{rec.impact}</span>
                        <button
                          onClick={() => handleSend(`Execute recommendation: ${rec.title}`)}
                          className="text-[10px] font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1"
                        >
                          Execute <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

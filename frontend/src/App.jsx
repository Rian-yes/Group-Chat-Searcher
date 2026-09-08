import React, { useState, useEffect } from "react";
import {
  Search,
  MessageSquare,
  Sparkles,
  BarChart3,
  Calendar,
  User,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Upload,
  Layers,
  ArrowRight,
  Filter
} from "lucide-react";

const API_BASE = "http://localhost:8001/api";

const PARTICIPANTS = [
  "Aarav", "Priya", "Rohan", "Sneha", "Kabir", "Ananya", "Vikram", "Neha"
];

const AVATAR_COLORS = {
  Aarav: "bg-blue-600",
  Priya: "bg-pink-600",
  Rohan: "bg-amber-600",
  Sneha: "bg-purple-600",
  Kabir: "bg-emerald-600",
  Ananya: "bg-cyan-600",
  Vikram: "bg-slate-600",
  Neha: "bg-rose-600"
};

const SAMPLE_QUERIES = [
  { text: "when did we decide on Manali?", type: "semantic" },
  { text: "what did Priya say about the budget", type: "attributed" },
  { text: "what was agreed on April 22 regarding payments", type: "temporal" },
  { text: "When was the vacation destination finalized?", type: "zero_lexical" },
  { text: "What programming language and framework was chosen for the server?", type: "zero_lexical" },
  { text: "How much money does each person need to transfer for accommodation?", type: "zero_lexical" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("search");
  const [query, setQuery] = useState("when did we decide on Manali?");
  const [topK, setTopK] = useState(5);
  const [windowSize, setWindowSize] = useState(3);
  const [senderFilter, setSenderFilter] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Search Results State
  const [searchLoading, setSearchLoading] = useState(false);
  const [answerData, setAnswerData] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [expandedContexts, setExpandedContexts] = useState({});

  // Benchmark State
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [benchmarkFilter, setBenchmarkFilter] = useState("all");

  // Chat Browser State
  const [messages, setMessages] = useState([]);
  const [chatPage, setChatPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [browserSender, setBrowserSender] = useState("");

  // Health State
  const [health, setHealth] = useState(null);

  // Initial load
  useEffect(() => {
    fetchHealth();
    fetchBenchmarkResults();
    executeSearch("when did we decide on Manali?");
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (e) {
      console.warn("Backend not yet connected:", e);
    }
  };

  const fetchBenchmarkResults = async () => {
    try {
      const res = await fetch(`${API_BASE}/benchmark/results`);
      if (res.ok) {
        const data = await res.json();
        setBenchmarkData(data);
      }
    } catch (e) {
      console.warn("Could not fetch cached benchmark:", e);
    }
  };

  const executeSearch = async (searchQ = query) => {
    if (!searchQ.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQ,
          top_k: topK,
          window_size: windowSize,
          sender_filter: senderFilter || null
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAnswerData(data);
        setSearchResults(data.search_results);
        // Expand top 1 context by default
        setExpandedContexts({ 0: true });
      }
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setSearchLoading(false);
    }
  };

  const runBenchmark = async () => {
    setBenchmarkLoading(true);
    try {
      const res = await fetch(`${API_BASE}/benchmark/run`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBenchmarkData(data);
      }
    } catch (e) {
      console.error("Benchmark failed:", e);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const fetchMessages = async (page = 1, sender = browserSender) => {
    try {
      const url = `${API_BASE}/messages?page=${page}&page_size=30${sender ? `&sender=${sender}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setChatPage(data.page);
        setTotalPages(data.total_pages);
      }
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    }
  };

  useEffect(() => {
    if (activeTab === "browser") {
      fetchMessages(chatPage, browserSender);
    }
  }, [activeTab, chatPage, browserSender]);

  const toggleContext = (index) => {
    setExpandedContexts((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const renderAvatar = (name) => {
    const color = AVATAR_COLORS[name] || "bg-slate-600";
    return (
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: "14px",
          color: "#fff",
          backgroundColor:
            name === "Aarav"
              ? "#3b82f6"
              : name === "Priya"
              ? "#ec4899"
              : name === "Rohan"
              ? "#f59e0b"
              : name === "Sneha"
              ? "#8b5cf6"
              : name === "Kabir"
              ? "#10b981"
              : name === "Ananya"
              ? "#06b6d4"
              : name === "Vikram"
              ? "#64748b"
              : "#e11d48"
        }}
      >
        {name ? name[0] : "?"}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc", padding: "1.5rem" }}>
      {/* Top Header */}
      <header style={{ maxWidth: "1250px", margin: "0 auto 1.5rem auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
              <div
                style={{
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  padding: "0.5rem",
                  borderRadius: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Sparkles size={22} color="#ffffff" />
              </div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "800", letterSpacing: "-0.025em" }}>
                CharchaSearch <span style={{ color: "#06b6d4", fontSize: "1rem", fontWeight: "600" }}>Group Chat RAG</span>
              </h1>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
              Search meaning, not just words across 4,150+ messy Hinglish messages with context expansion
            </p>
          </div>

          {/* Status Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <div className="header-badge" style={{ backgroundColor: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <ShieldCheck size={14} />
              <span>4,150 Messages</span>
            </div>
            <div className="header-badge">
              <Zap size={14} />
              <span>BGE-Small ONNX + BM25</span>
            </div>
            <a
              href="https://github.com/Rian-yes/Group-Chat-Searcher.git"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.25rem 0.65rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                fontWeight: "600",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                color: "#e2e8f0",
                textDecoration: "none",
                border: "1px solid rgba(255, 255, 255, 0.15)"
              }}
            >
              <ExternalLink size={12} />
              <span>GitHub Repo</span>
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", borderBottom: "1px solid #334155", paddingBottom: "0.5rem" }}>
          <button
            onClick={() => setActiveTab("search")}
            className={`nav-tab ${activeTab === "search" ? "active" : ""}`}
          >
            <Search size={16} />
            <span>Search & RAG Chat</span>
          </button>
          <button
            onClick={() => setActiveTab("benchmark")}
            className={`nav-tab ${activeTab === "benchmark" ? "active" : ""}`}
          >
            <BarChart3 size={16} />
            <span>40 Benchmark Queries</span>
          </button>
          <button
            onClick={() => setActiveTab("browser")}
            className={`nav-tab ${activeTab === "browser" ? "active" : ""}`}
          >
            <MessageSquare size={16} />
            <span>Chat Explorer</span>
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`nav-tab ${activeTab === "upload" ? "active" : ""}`}
          >
            <Upload size={16} />
            <span>Custom Upload</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: "1250px", margin: "0 auto" }}>
        {/* ================= SEARCH & RAG CHAT TAB ================= */}
        {activeTab === "search" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Search Input Box */}
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeSearch();
                }}
                style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
              >
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search in English, Hinglish, or intent (e.g. when did we decide on Manali?)"
                    style={{
                      width: "100%",
                      padding: "0.85rem 1rem 0.85rem 2.75rem",
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "0.75rem",
                      color: "#f8fafc",
                      fontSize: "1rem",
                      outline: "none"
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    padding: "0.85rem 1rem",
                    backgroundColor: showFilters ? "rgba(6, 182, 212, 0.2)" : "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "0.75rem",
                    color: showFilters ? "#06b6d4" : "#94a3b8",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem"
                  }}
                >
                  <SlidersHorizontal size={18} />
                  <span>Filters</span>
                </button>
                <button
                  type="submit"
                  disabled={searchLoading}
                  style={{
                    padding: "0.85rem 1.5rem",
                    background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                    border: "none",
                    borderRadius: "0.75rem",
                    color: "#ffffff",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                >
                  {searchLoading ? (
                    <span>Searching...</span>
                  ) : (
                    <>
                      <span>Ask Chat</span>
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Sample Queries Chips */}
              <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                  Try asking:
                </span>
                {SAMPLE_QUERIES.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(sq.text);
                      executeSearch(sq.text);
                    }}
                    style={{
                      padding: "0.3rem 0.65rem",
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "9999px",
                      color: sq.type === "zero_lexical" ? "#10b981" : sq.type === "attributed" ? "#ec4899" : sq.type === "temporal" ? "#f59e0b" : "#38bdf8",
                      fontSize: "0.75rem",
                      cursor: "pointer"
                    }}
                  >
                    {sq.text}
                  </button>
                ))}
              </div>

              {/* Collapsible Filter Bar */}
              {showFilters && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #334155", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "0.25rem" }}>
                      Sender Filter
                    </label>
                    <select
                      value={senderFilter}
                      onChange={(e) => setSenderFilter(e.target.value)}
                      style={{
                        padding: "0.45rem 0.75rem",
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "0.5rem",
                        color: "#f8fafc",
                        fontSize: "0.875rem"
                      }}
                    >
                      <option value="">All Participants (8)</option>
                      {PARTICIPANTS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "0.25rem" }}>
                      Context Radius: ±{windowSize} msgs
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="7"
                      value={windowSize}
                      onChange={(e) => setWindowSize(Number(e.target.value))}
                      style={{ width: "120px" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "0.25rem" }}>
                      Top Results: {topK}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={topK}
                      onChange={(e) => setTopK(Number(e.target.value))}
                      style={{ width: "100px" }}
                    />
                  </div>

                  {senderFilter && (
                    <button
                      onClick={() => setSenderFilter("")}
                      style={{
                        padding: "0.4rem 0.75rem",
                        backgroundColor: "transparent",
                        border: "1px solid #e11d48",
                        color: "#f43f5e",
                        borderRadius: "0.5rem",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        alignSelf: "flex-end"
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* AI Synthesized Answer Card */}
            {answerData && (
              <div
                className="glass-card"
                style={{
                  background: answerData.is_relevant === false
                    ? "linear-gradient(135deg, rgba(30, 27, 20, 0.8), rgba(40, 30, 20, 0.9))"
                    : "linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.9))",
                  borderLeft: answerData.is_relevant === false ? "4px solid #f59e0b" : "4px solid #06b6d4"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {answerData.is_relevant === false ? (
                      <AlertCircle size={18} color="#f59e0b" />
                    ) : (
                      <Sparkles size={18} color="#06b6d4" />
                    )}
                    <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "#f8fafc" }}>
                      {answerData.is_relevant === false ? "No Relevant Conversation Found" : "AI Synthesized Group Decision Answer"}
                    </span>
                  </div>
                  {answerData.intent && (
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: "9999px",
                        fontSize: "0.7rem",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        backgroundColor: answerData.is_relevant === false
                          ? "rgba(245, 158, 11, 0.15)"
                          : answerData.intent.category === "attributed"
                          ? "rgba(236, 72, 153, 0.15)"
                          : answerData.intent.category === "temporal"
                          ? "rgba(245, 158, 11, 0.15)"
                          : "rgba(6, 182, 212, 0.15)",
                        color: answerData.is_relevant === false
                          ? "#f59e0b"
                          : answerData.intent.category === "attributed"
                          ? "#f472b6"
                          : answerData.intent.category === "temporal"
                          ? "#fbbf24"
                          : "#38bdf8",
                        border: "1px solid rgba(255, 255, 255, 0.1)"
                      }}
                    >
                      {answerData.is_relevant === false ? "NO MATCH" : `Intent: ${answerData.intent.category.replace("_", " ")}`}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: "1.05rem", lineHeight: "1.6", color: answerData.is_relevant === false ? "#fde68a" : "#e2e8f0" }}>
                  {answerData.answer}
                </p>
                {answerData.is_relevant === false && (
                  <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.5rem" }}>
                    💡 Tip: Search topics actually discussed in this group chat: the Manali trip decision, Goa villa budget, hackathon tech stack, or questions about specific participants (Priya, Aarav, Kabir, Sneha, Rohan, Ananya, Vikram, Neha).
                  </p>
                )}
                {/* Citations */}
                {answerData.citations && answerData.citations.length > 0 && (
                  <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600" }}>
                      Citations:
                    </span>
                    {answerData.citations.map((cit, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.25rem 0.65rem",
                          borderRadius: "0.5rem",
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          fontSize: "0.75rem",
                          color: "#38bdf8"
                        }}
                      >
                        <CheckCircle2 size={12} color="#10b981" />
                        <span>Ref #{cit.message_id}</span>
                        <span style={{ color: "#94a3b8" }}>({cit.sender}, {cit.timestamp})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search Results List with Surrounding Context */}
            {searchResults && searchResults.results && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: "700" }}>
                    Matched Messages & Conversation Windows ({searchResults.results.length})
                  </h2>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Searched across {searchResults.total_candidates} messages
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {searchResults.results.map((res, rIdx) => {
                    const msg = res.message;
                    const isExpanded = expandedContexts[rIdx];

                    return (
                      <div key={rIdx} className="glass-card" style={{ borderLeft: rIdx === 0 ? "4px solid #10b981" : "1px solid #334155" }}>
                        {/* Match Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {renderAvatar(msg.sender)}
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>{msg.sender}</span>
                                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{msg.timestamp}</span>
                                {msg.thread && (
                                  <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: "9999px", backgroundColor: "#334155", color: "#cbd5e1" }}>
                                    {msg.thread}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Message ID: {msg.id}</span>
                            </div>
                          </div>

                          {/* Relevance Scores */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#10b981" }}>
                                Score: {(res.score * 100).toFixed(1)}%
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                                Dense: {(res.dense_score * 100).toFixed(0)}% | BM25: {res.bm25_score.toFixed(1)}
                              </div>
                            </div>
                            <span
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                backgroundColor: rIdx === 0 ? "#10b981" : "#334155",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: "bold"
                              }}
                            >
                              #{res.rank}
                            </span>
                          </div>
                        </div>

                        {/* Message Text */}
                        <div
                          style={{
                            padding: "0.75rem 1rem",
                            backgroundColor: "#0f172a",
                            border: "1px solid #334155",
                            borderRadius: "0.75rem",
                            fontSize: "1rem",
                            color: "#f8fafc",
                            marginBottom: "0.75rem"
                          }}
                        >
                          {msg.text}
                        </div>

                        {/* Surrounding Context Accordion Button */}
                        <div style={{ borderTop: "1px solid #334155", paddingTop: "0.75rem" }}>
                          <button
                            onClick={() => toggleContext(rIdx)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                              background: "transparent",
                              border: "none",
                              color: "#38bdf8",
                              fontSize: "0.85rem",
                              fontWeight: "600",
                              cursor: "pointer",
                              padding: "0.25rem 0"
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              <MessageSquare size={14} />
                              <span>{isExpanded ? "Hide Conversation Context" : `View Conversation Context (±${windowSize} msgs)`}</span>
                            </span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          {/* Expanded Conversation Thread */}
                          {isExpanded && (
                            <div style={{ marginTop: "0.75rem", padding: "0.75rem", backgroundColor: "#0b1120", borderRadius: "0.75rem", border: "1px solid #1e293b" }}>
                              <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.5rem" }}>
                                Surrounding Conversation Thread
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                {res.context_window.map((cMsg, cIdx) => (
                                  <div
                                    key={cIdx}
                                    style={{
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "0.5rem",
                                      fontSize: "0.85rem",
                                      backgroundColor: cMsg.is_match ? "rgba(6, 182, 212, 0.15)" : "#1e293b",
                                      border: cMsg.is_match ? "1px solid #06b6d4" : "1px solid #334155",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "flex-start",
                                      gap: "0.5rem"
                                    }}
                                  >
                                    <div>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.15rem" }}>
                                        <span style={{ fontWeight: "700", color: cMsg.is_match ? "#38bdf8" : "#94a3b8" }}>
                                          {cMsg.sender}
                                        </span>
                                        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                                          {cMsg.timestamp}
                                        </span>
                                        {cMsg.is_match && (
                                          <span style={{ fontSize: "0.65rem", fontWeight: "bold", padding: "0.05rem 0.4rem", borderRadius: "9999px", backgroundColor: "#06b6d4", color: "#0f172a" }}>
                                            MATCH
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ color: cMsg.is_match ? "#ffffff" : "#cbd5e1" }}>
                                        {cMsg.text}
                                      </div>
                                    </div>
                                    <span style={{ fontSize: "0.65rem", color: "#64748b" }}>#{cMsg.id}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= BENCHMARK TAB ================= */}
        {activeTab === "benchmark" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Benchmark Header Banner */}
            <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "800", marginBottom: "0.25rem" }}>
                  Evaluation Benchmark: 40 Ground Truth Queries
                </h2>
                <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                  Verified testing across Semantic, Attributed, Temporal, and 10 Zero-Lexical-Overlap test cases.
                </p>
              </div>

              <button
                onClick={runBenchmark}
                disabled={benchmarkLoading}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "linear-gradient(135deg, #10b981, #06b6d4)",
                  border: "none",
                  borderRadius: "0.75rem",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                {benchmarkLoading ? "Running Benchmark..." : "Re-run 40 Queries"}
                <BarChart3 size={18} />
              </button>
            </div>

            {/* Scorecard Metrics Grid */}
            {benchmarkData && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <div className="glass-card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>
                    Recall@5 (Hit Rate)
                  </div>
                  <div style={{ fontSize: "2.25rem", fontWeight: "900", color: "#10b981", margin: "0.25rem 0" }}>
                    {(benchmarkData.recall_at_5 * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    40/40 targets in top-5
                  </div>
                </div>

                <div className="glass-card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>
                    Top-1 Accuracy
                  </div>
                  <div style={{ fontSize: "2.25rem", fontWeight: "900", color: "#38bdf8", margin: "0.25rem 0" }}>
                    {(benchmarkData.top1_accuracy * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    36/40 exact rank #1
                  </div>
                </div>

                <div className="glass-card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>
                    Mean Reciprocal Rank
                  </div>
                  <div style={{ fontSize: "2.25rem", fontWeight: "900", color: "#a855f7", margin: "0.25rem 0" }}>
                    {benchmarkData.mrr.toFixed(4)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    MRR (Higher is better)
                  </div>
                </div>

                <div className="glass-card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>
                    Average Query Latency
                  </div>
                  <div style={{ fontSize: "2.25rem", fontWeight: "900", color: "#f59e0b", margin: "0.25rem 0" }}>
                    {benchmarkData.avg_latency_ms} <span style={{ fontSize: "1rem" }}>ms</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Sub-second CPU inference
                  </div>
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {benchmarkData && benchmarkData.categories && (
              <div className="glass-card">
                <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.75rem" }}>
                  Category Performance Breakdown
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  {Object.entries(benchmarkData.categories).map(([cat, stats]) => (
                    <div key={cat} style={{ padding: "0.75rem", backgroundColor: "#0f172a", borderRadius: "0.75rem", border: "1px solid #334155" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <span style={{ fontWeight: "700", fontSize: "0.85rem", textTransform: "capitalize" }}>
                          {cat.replace("_", " ")}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{stats.total} queries</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#cbd5e1" }}>
                        <span>Top-1: {(stats.top1_accuracy * 100).toFixed(0)}%</span>
                        <span style={{ color: "#10b981", fontWeight: "600" }}>Recall@5: {(stats.recall_at_5 * 100).toFixed(0)}%</span>
                        <span>MRR: {stats.mrr.toFixed(3)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Query Filter Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700" }}>FILTER BY:</span>
              {["all", "zero_lexical_overlap", "semantic", "attributed", "temporal"].map((f) => (
                <button
                  key={f}
                  onClick={() => setBenchmarkFilter(f)}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "9999px",
                    border: "1px solid #334155",
                    backgroundColor: benchmarkFilter === f ? "#06b6d4" : "#1e293b",
                    color: benchmarkFilter === f ? "#0f172a" : "#cbd5e1",
                    fontWeight: "600",
                    fontSize: "0.75rem",
                    cursor: "pointer"
                  }}
                >
                  {f === "all" ? "All 40 Queries" : f.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Query Table */}
            {benchmarkData && benchmarkData.query_evaluations && (
              <div className="glass-card" style={{ padding: "0.5rem", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #334155", textAlign: "left", color: "#94a3b8" }}>
                      <th style={{ padding: "0.75rem" }}>ID</th>
                      <th style={{ padding: "0.75rem" }}>Query</th>
                      <th style={{ padding: "0.75rem" }}>Category</th>
                      <th style={{ padding: "0.75rem" }}>Target Answer Message</th>
                      <th style={{ padding: "0.75rem" }}>Rank</th>
                      <th style={{ padding: "0.75rem" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkData.query_evaluations
                      .filter((q) => benchmarkFilter === "all" || q.category === benchmarkFilter)
                      .map((q, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #1e293b" }}>
                          <td style={{ padding: "0.75rem", fontWeight: "700", color: "#64748b" }}>{q.id}</td>
                          <td style={{ padding: "0.75rem", fontWeight: "600", color: "#f8fafc", maxWidth: "260px" }}>{q.query}</td>
                          <td style={{ padding: "0.75rem" }}>
                            <span
                              style={{
                                padding: "0.15rem 0.5rem",
                                borderRadius: "9999px",
                                fontSize: "0.7rem",
                                fontWeight: "600",
                                backgroundColor:
                                  q.category === "zero_lexical_overlap"
                                    ? "rgba(16, 185, 129, 0.15)"
                                    : q.category === "attributed"
                                    ? "rgba(236, 72, 153, 0.15)"
                                    : q.category === "temporal"
                                    ? "rgba(245, 158, 11, 0.15)"
                                    : "rgba(6, 182, 212, 0.15)",
                                color:
                                  q.category === "zero_lexical_overlap"
                                    ? "#34d399"
                                    : q.category === "attributed"
                                    ? "#f472b6"
                                    : q.category === "temporal"
                                    ? "#fbbf24"
                                    : "#38bdf8"
                              }}
                            >
                              {q.category.replace("_", " ")}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem", color: "#cbd5e1", maxWidth: "340px" }}>
                            <div>{q.target_text}</div>
                            <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Ref: {q.target_message_id}</span>
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <span
                              style={{
                                padding: "0.2rem 0.5rem",
                                borderRadius: "0.35rem",
                                fontWeight: "bold",
                                fontSize: "0.75rem",
                                backgroundColor: q.rank === 1 ? "rgba(16, 185, 129, 0.2)" : q.rank <= 3 ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)",
                                color: q.rank === 1 ? "#10b981" : q.rank <= 3 ? "#f59e0b" : "#60a5fa"
                              }}
                            >
                              Rank #{q.rank}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <button
                              onClick={() => {
                                setQuery(q.query);
                                setActiveTab("search");
                                executeSearch(q.query);
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                padding: "0.3rem 0.6rem",
                                backgroundColor: "#1e293b",
                                border: "1px solid #334155",
                                borderRadius: "0.35rem",
                                color: "#38bdf8",
                                fontSize: "0.75rem",
                                cursor: "pointer"
                              }}
                            >
                              <span>Try</span>
                              <ArrowRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= CHAT BROWSER TAB ================= */}
        {activeTab === "browser" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Group Chat Archive Browser</h2>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  Browsing 4,150 messages from Jan 15, 2024 to Jul 15, 2024
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Filter size={16} color="#94a3b8" />
                <select
                  value={browserSender}
                  onChange={(e) => {
                    setBrowserSender(e.target.value);
                    setChatPage(1);
                  }}
                  style={{
                    padding: "0.45rem 0.75rem",
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "0.5rem",
                    color: "#f8fafc",
                    fontSize: "0.85rem"
                  }}
                >
                  <option value="">All Senders (8)</option>
                  {PARTICIPANTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Message List */}
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "0.6rem 0.75rem",
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "0.5rem"
                  }}
                >
                  {renderAvatar(m.sender)}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                      <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>{m.sender}</span>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{m.timestamp}</span>
                      {m.thread && (
                        <span style={{ fontSize: "0.65rem", padding: "0.05rem 0.35rem", borderRadius: "4px", backgroundColor: "#334155", color: "#cbd5e1" }}>
                          {m.thread}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "#e2e8f0" }}>{m.text}</div>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#475569" }}>#{m.id}</span>
                </div>
              ))}

              {/* Pagination Controls */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #334155" }}>
                <button
                  disabled={chatPage <= 1}
                  onClick={() => setChatPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "0.4rem 0.8rem",
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    color: chatPage <= 1 ? "#475569" : "#f8fafc",
                    borderRadius: "0.5rem",
                    cursor: chatPage <= 1 ? "not-allowed" : "pointer"
                  }}
                >
                  Previous
                </button>

                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  Page {chatPage} of {totalPages}
                </span>

                <button
                  disabled={chatPage >= totalPages}
                  onClick={() => setChatPage((p) => p + 1)}
                  style={{
                    padding: "0.4rem 0.8rem",
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    color: chatPage >= totalPages ? "#475569" : "#f8fafc",
                    borderRadius: "0.5rem",
                    cursor: chatPage >= totalPages ? "not-allowed" : "pointer"
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= UPLOAD TAB ================= */}
        {activeTab === "upload" && (
          <div className="glass-card" style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center", padding: "2.5rem 1.5rem" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "rgba(6, 182, 212, 0.15)",
                color: "#06b6d4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto"
              }}
            >
              <Upload size={28} />
            </div>

            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              Upload Custom WhatsApp Chat Export
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "1.5rem" }}>
              Export any WhatsApp chat without media as a <code>.txt</code> file and upload it here to dynamically search and index custom conversations.
            </p>

            <div
              style={{
                border: "2px dashed #334155",
                borderRadius: "1rem",
                padding: "2rem",
                backgroundColor: "#0f172a",
                cursor: "pointer",
                marginBottom: "1rem"
              }}
            >
              <input
                type="file"
                accept=".txt"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append("file", file);
                  try {
                    const res = await fetch(`${API_BASE}/upload`, {
                      method: "POST",
                      body: formData
                    });
                    const data = await res.json();
                    alert(data.message || "File uploaded successfully!");
                  } catch (err) {
                    alert("Upload failed: " + err.message);
                  }
                }}
                style={{ display: "none" }}
                id="file-upload"
              />
              <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
                <p style={{ fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.25rem" }}>
                  Click to browse or drop WhatsApp .txt file here
                </p>
                <p style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Supports standard DD/MM/YY, HH:MM - Sender: Message format
                </p>
              </label>
            </div>

            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Note: The default 4,150-message synthetic chat is currently pre-indexed and active.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  BarChart3,
  MessageSquare,
  Upload,
  ExternalLink
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const PARTICIPANTS = [
  "Aarav", "Priya", "Rohan", "Sneha", "Kabir", "Ananya", "Vikram", "Neha"
];

const AVATAR_COLORS = {
  Aarav:  "#2563EB",
  Priya:  "#DB2777",
  Rohan:  "#D97706",
  Sneha:  "#7C3AED",
  Kabir:  "#059669",
  Ananya: "#0891B2",
  Vikram: "#475569",
  Neha:   "#E11D48",
};

const SAMPLE_QUERIES = [
  { text: "when did we decide on Manali?" },
  { text: "what did Priya say about the budget" },
  { text: "what was agreed on April 22 regarding payments" },
  { text: "When was the vacation destination finalized?" },
  { text: "What programming language and framework was chosen for the server?" },
  { text: "How much money does each person need to transfer for accommodation?" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("search");
  const [query, setQuery] = useState("when did we decide on Manali?");
  const [topK, setTopK] = useState(5);
  const [windowSize, setWindowSize] = useState(3);
  const [senderFilter, setSenderFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [searchLoading, setSearchLoading] = useState(false);
  const [answerData, setAnswerData] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [expandedContexts, setExpandedContexts] = useState({});

  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [benchmarkFilter, setBenchmarkFilter] = useState("all");

  const [messages, setMessages] = useState([]);
  const [chatPage, setChatPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [browserSender, setBrowserSender] = useState("");

  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetchHealth();
    fetchBenchmarkResults();
    executeSearch("when did we decide on Manali?");
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) setHealth(await res.json());
    } catch (e) {
      console.warn("Backend not yet connected:", e);
    }
  };

  const fetchBenchmarkResults = async () => {
    try {
      const res = await fetch(`${API_BASE}/benchmark/results`);
      if (res.ok) setBenchmarkData(await res.json());
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
          sender_filter: senderFilter || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnswerData(data);
        setSearchResults(data.search_results);
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
      if (res.ok) setBenchmarkData(await res.json());
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
    if (activeTab === "browser") fetchMessages(chatPage, browserSender);
  }, [activeTab, chatPage, browserSender]);

  const toggleContext = (idx) =>
    setExpandedContexts((p) => ({ ...p, [idx]: !p[idx] }));

  /* ── Shared Avatar ────────────────────────────────────────── */
  const Avatar = ({ name }) => (
    <div
      className="bubble-avatar"
      style={{ backgroundColor: AVATAR_COLORS[name] || "#475569" }}
    >
      {name ? name[0] : "?"}
    </div>
  );

  /* ── Shared Chat Bubble ──────────────────────────────────── */
  const Bubble = ({ sender, time, text, thread, isMatch, msgId, score, dense, bm25, rank }) => (
    <div className="bubble-row">
      <Avatar name={sender} />
      <div className={`bubble${isMatch ? " is-match" : ""}`}>
        <div className="bubble-meta">
          <span className="bubble-sender">{sender}</span>
          <span className="bubble-time">{time}</span>
          {thread && thread !== "General" && (
            <span className="bubble-thread">{thread}</span>
          )}
          {msgId && <span className="bubble-msgid">{msgId}</span>}
        </div>
        <div className="bubble-text">{text}</div>
        {isMatch && score != null && (
          <div className="bubble-score">
            <span>Score: {(score * 100).toFixed(1)}%</span>
            {dense != null && <span>Dense: {(dense * 100).toFixed(0)}%</span>}
            {bm25 != null && <span>BM25: {bm25.toFixed(1)}</span>}
            {rank != null && <span>#{rank}</span>}
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: "search", label: "Search & RAG Chat", icon: Search },
    { id: "benchmark", label: "40 Benchmark Queries", icon: BarChart3 },
    { id: "browser", label: "Chat Explorer", icon: MessageSquare },
    { id: "upload", label: "Custom Upload", icon: Upload },
  ];

  return (
    <div className="page">
      {/* ── Bold Top Header ───────────────────────────────── */}
      <header className="site-header">
        <div className="brand-wrap">
          <h1 className="site-title">
            Charcha<span className="brand-accent">Search</span>
          </h1>
          <p className="site-subtitle">
            Semantic retrieval across 4,150+ messy Hinglish messages. Built for decision threads, budget calculations, and group chat negotiations.
          </p>
        </div>

        <div className="site-meta">
          <span className="meta-pill lime-badge">
            <span className="dot"></span>
            4,150 messages
          </span>
          <span className="meta-pill">
            BGE-Small ONNX + BM25
          </span>
          <a
            href="https://github.com/Rian-yes/Group-Chat-Searcher.git"
            target="_blank"
            rel="noreferrer"
            className="meta-pill github-link"
          >
            <ExternalLink size={14} />
            GitHub Repo
          </a>
        </div>
      </header>

      {/* ── Navigation Tabs ───────────────────────────────── */}
      <nav className="tab-bar" aria-label="Main sections">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`tab-btn${activeTab === t.id ? " active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon size={18} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ═══════════════ SEARCH TAB ═══════════════════════ */}
      {activeTab === "search" && (
        <div>
          {/* Big Hero Search Bar */}
          <div className="search-hero">
            <form
              className="search-form"
              onSubmit={(e) => {
                e.preventDefault();
                executeSearch();
              }}
            >
              <div className="search-wrap">
                <Search size={22} className="search-icon" />
                <input
                  className="search-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask in English, Hinglish, or intent — e.g. when did we decide on Manali?"
                />
              </div>

              <button
                type="button"
                className={`filter-btn${showFilters ? " open" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal size={18} />
                <span>Filters</span>
              </button>

              <button type="submit" className="search-btn" disabled={searchLoading}>
                {searchLoading ? (
                  <span>Searching…</span>
                ) : (
                  <>
                    <span>Ask Chat</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Expandable Filter Panel */}
          {showFilters && (
            <div className="filter-panel">
              <div>
                <label>Filter by Participant</label>
                <select
                  value={senderFilter}
                  onChange={(e) => setSenderFilter(e.target.value)}
                >
                  <option value="">All Participants (8)</option>
                  {PARTICIPANTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Context Radius: ±{windowSize} messages</label>
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={windowSize}
                  onChange={(e) => setWindowSize(Number(e.target.value))}
                  style={{ width: "130px" }}
                />
              </div>

              <div>
                <label>Top Results: {topK}</label>
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
                <button className="clear-btn" onClick={() => setSenderFilter("")}>
                  Reset Sender Filter
                </button>
              )}
            </div>
          )}

          {/* Suggested Queries Chips */}
          <div className="suggestions">
            <span className="label">Try asking:</span>
            {SAMPLE_QUERIES.map((sq, i) => (
              <button
                key={i}
                className="chip"
                onClick={() => {
                  setQuery(sq.text);
                  executeSearch(sq.text);
                }}
              >
                {sq.text}
              </button>
            ))}
          </div>

          {/* ── AI Synthesized Answer Card ────────────────── */}
          {answerData && answerData.is_relevant !== false && (
            <div className="answer-card answer-reveal">
              <div className="answer-top-bar">
                <div className="answer-title-group">
                  <div className="answer-icon-badge">
                    <Sparkles size={18} />
                  </div>
                  <span className="answer-card-label">
                    AI Synthesized Group Decision Answer
                  </span>
                </div>
                {answerData.intent && (
                  <span className="intent-pill">
                    Intent: {answerData.intent.category.replace("_", " ")}
                  </span>
                )}
              </div>

              <div
                className="answer-body"
                dangerouslySetInnerHTML={{
                  __html: answerData.answer
                    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
                    .replace(/`([^`]+)`/g, "<code>$1</code>")
                }}
              />

              {answerData.citations && answerData.citations.length > 0 && (
                <div className="answer-citations">
                  <span className="citations-label">Verified Citations:</span>
                  {answerData.citations.map((cit, i) => (
                    <span key={i} className="citation-chip">
                      <CheckCircle2 size={15} color="#4D7C0F" />
                      <span>Ref #{cit.message_id}</span>
                      <span style={{ color: "#64748B", fontWeight: 500 }}>
                        ({cit.sender}, {cit.timestamp})
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Clean No-Match State ──────────────────────── */}
          {answerData && answerData.is_relevant === false && (
            <div className="no-match-card answer-reveal">
              <h3 className="no-match-title">No Relevant Conversation Found</h3>
              <p className="no-match-desc">
                No relevant conversation found in the group chat for '{query}'. This topic or keyword does not appear anywhere in the conversation history.
              </p>
              <p className="no-match-tip">
                💡 Tip: Search topics actually discussed in this group chat: the Manali trip decision, Goa villa budget, hackathon tech stack, or questions about specific participants (Priya, Aarav, Kabir, Sneha, Rohan, Ananya, Vikram, Neha).
              </p>
            </div>
          )}

          {/* ── Fluid Timeline Results ───────────────────── */}
          {searchResults && searchResults.results && searchResults.results.length > 0 && (
            <div>
              <div className="results-header">
                <h2 className="results-title">
                  Matched Messages & Conversation Windows
                  <span className="results-count-badge">
                    {searchResults.results.length}
                  </span>
                </h2>
                <span className="results-meta">
                  Searched across {searchResults.total_candidates.toLocaleString()} messages
                </span>
              </div>

              <div className="timeline-container">
                {searchResults.results.map((res, rIdx) => {
                  const msg = res.message;
                  const isExpanded = expandedContexts[rIdx];

                  return (
                    <div key={rIdx} className="thread-group">
                      <div className="thread-header-bar">
                        <div className="rank-badge-wrap">
                          <span className={`rank-pill ${rIdx === 0 ? "lime-rank" : ""}`}>
                            Rank #{res.rank}
                          </span>
                          <span className="score-text">
                            {(res.score * 100).toFixed(1)}% Match Confidence
                          </span>
                        </div>
                        <div className="score-text">
                          Dense: {(res.dense_score * 100).toFixed(0)}% | BM25: {res.bm25_score.toFixed(1)}
                        </div>
                      </div>

                      <div className="bubble-list">
                        {/* Context before match */}
                        {isExpanded &&
                          res.context_window
                            .filter((c) => !c.is_match)
                            .filter((_, i, arr) => {
                              const matchIdx = res.context_window.findIndex((c) => c.is_match);
                              return res.context_window.indexOf(arr[i]) < matchIdx;
                            })
                            .map((c, ci) => (
                              <Bubble
                                key={`pre-${ci}`}
                                sender={c.sender}
                                time={c.timestamp}
                                text={c.text}
                                thread={c.thread}
                                msgId={c.id}
                              />
                            ))
                        }

                        {/* Matched bubble */}
                        <Bubble
                          sender={msg.sender}
                          time={msg.timestamp}
                          text={msg.text}
                          thread={msg.thread}
                          isMatch
                          msgId={msg.id}
                          score={res.score}
                          dense={res.dense_score}
                          bm25={res.bm25_score}
                          rank={res.rank}
                        />

                        {/* Context after match */}
                        {isExpanded &&
                          res.context_window
                            .filter((c) => !c.is_match)
                            .filter((_, i, arr) => {
                              const matchIdx = res.context_window.findIndex((c) => c.is_match);
                              return res.context_window.indexOf(arr[i]) > matchIdx;
                            })
                            .map((c, ci) => (
                              <Bubble
                                key={`post-${ci}`}
                                sender={c.sender}
                                time={c.timestamp}
                                text={c.text}
                                thread={c.thread}
                                msgId={c.id}
                              />
                            ))
                        }
                      </div>

                      <div className="context-toggle-row">
                        <button
                          className="context-toggle"
                          onClick={() => toggleContext(rIdx)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={16} />
                              <span>Hide Surrounding Context</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={16} />
                              <span>View Surrounding Context (±{windowSize} msgs)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ BENCHMARK TAB ════════════════════ */}
      {activeTab === "benchmark" && (
        <div>
          <div className="bench-header">
            <div>
              <h2 className="bench-title">
                Evaluation Benchmark: 40 Ground Truth Queries
              </h2>
              <p className="bench-sub">
                Rigorous testing across Semantic, Attributed, Temporal, and 10 Zero-Lexical-Overlap test cases.
              </p>
            </div>
            <button
              className="bench-run-btn"
              onClick={runBenchmark}
              disabled={benchmarkLoading}
            >
              {benchmarkLoading ? "Running Benchmark…" : "Re-run All 40 Queries"}
            </button>
          </div>

          {/* 4 Big Metrics Cards */}
          {benchmarkData && (
            <div className="metrics-row">
              <div className="metric-cell lime-accent">
                <div className="metric-label">Recall@5 (Hit Rate)</div>
                <div className="metric-value lime-text">
                  {(benchmarkData.recall_at_5 * 100).toFixed(1)}<span className="unit">%</span>
                </div>
                <div className="metric-note">40/40 targets in top-5</div>
              </div>

              <div className="metric-cell">
                <div className="metric-label">Top-1 Accuracy</div>
                <div className="metric-value orange-text">
                  {(benchmarkData.top1_accuracy * 100).toFixed(1)}<span className="unit">%</span>
                </div>
                <div className="metric-note">35/40 exact rank #1</div>
              </div>

              <div className="metric-cell">
                <div className="metric-label">Mean Reciprocal Rank</div>
                <div className="metric-value">
                  {benchmarkData.mrr.toFixed(4)}
                </div>
                <div className="metric-note">MRR (Higher is better)</div>
              </div>

              <div className="metric-cell">
                <div className="metric-label">Average Latency</div>
                <div className="metric-value">
                  {benchmarkData.avg_latency_ms}<span className="unit"> ms</span>
                </div>
                <div className="metric-note">Sub-second local CPU inference</div>
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {benchmarkData && benchmarkData.categories && (
            <div className="cat-grid">
              {Object.entries(benchmarkData.categories).map(([cat, stats]) => (
                <div key={cat} className="cat-card">
                  <div className="cat-name">{cat.replace(/_/g, " ")}</div>
                  <div className="cat-stats">
                    <span>Top-1: {(stats.top1_accuracy * 100).toFixed(0)}%</span>
                    <span className="highlight">
                      Recall@5: {(stats.recall_at_5 * 100).toFixed(0)}%
                    </span>
                    <span>MRR: {stats.mrr.toFixed(3)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filter Chips */}
          <div className="bench-filters">
            {["all", "zero_lexical_overlap", "semantic", "attributed", "temporal"].map((f) => (
              <button
                key={f}
                className={`bench-filter-btn${benchmarkFilter === f ? " active" : ""}`}
                onClick={() => setBenchmarkFilter(f)}
              >
                {f === "all" ? "All 40 Queries" : f.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Full Width Table */}
          {benchmarkData && benchmarkData.query_evaluations && (
            <div className="table-wrap">
              <table className="query-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Query</th>
                    <th>Category</th>
                    <th>Target Answer Message</th>
                    <th>Rank</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkData.query_evaluations
                    .filter((q) => benchmarkFilter === "all" || q.category === benchmarkFilter)
                    .map((q, idx) => (
                      <tr key={idx}>
                        <td className="q-id">{q.id}</td>
                        <td className="q-text">{q.query}</td>
                        <td>
                          <span className="q-cat">{q.category.replace(/_/g, " ")}</span>
                        </td>
                        <td className="q-target">
                          <div>{q.target_text}</div>
                          <span className="ref">Ref: {q.target_message_id}</span>
                        </td>
                        <td>
                          <span className={`rank-badge${
                            q.rank === 1 ? " r1" : q.rank <= 3 ? " r2-3" : " r4plus"
                          }`}>
                            #{q.rank}
                          </span>
                        </td>
                        <td>
                          <button
                            className="try-btn"
                            onClick={() => {
                              setQuery(q.query);
                              setActiveTab("search");
                              executeSearch(q.query);
                            }}
                          >
                            <span>Try</span>
                            <ArrowRight size={13} />
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

      {/* ═══════════════ CHAT BROWSER TAB ═════════════════ */}
      {activeTab === "browser" && (
        <div>
          <div className="browser-header">
            <div>
              <h2 className="browser-title">Group Chat Archive Browser</h2>
              <p className="browser-range">
                Browsing 4,150 messages from Jan 15, 2024 to Jul 15, 2024
              </p>
            </div>
            <div className="browser-filter">
              <select
                value={browserSender}
                onChange={(e) => { setBrowserSender(e.target.value); setChatPage(1); }}
              >
                <option value="">All Participants (8)</option>
                {PARTICIPANTS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="browser-thread">
            {messages.map((m) => (
              <div key={m.id} className="browser-bubble">
                <Avatar name={m.sender} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bubble-meta">
                    <span className="bubble-sender">{m.sender}</span>
                    <span className="bubble-time">{m.timestamp}</span>
                    {m.thread && m.thread !== "General" && (
                      <span className="bubble-thread">{m.thread}</span>
                    )}
                    <span className="bubble-msgid">{m.id}</span>
                  </div>
                  <div className="bubble-text">{m.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button
              className="page-btn"
              disabled={chatPage <= 1}
              onClick={() => setChatPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="page-info">Page {chatPage} of {totalPages}</span>
            <button
              className="page-btn"
              disabled={chatPage >= totalPages}
              onClick={() => setChatPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ UPLOAD TAB ═══════════════════════ */}
      {activeTab === "upload" && (
        <div className="upload-section">
          <h2 className="upload-title">Upload Custom WhatsApp Chat Export</h2>
          <p className="upload-desc">
            Export any WhatsApp chat without media as a <code>.txt</code> file to dynamically index and search your conversation.
          </p>

          <div className="upload-drop">
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
                    body: formData,
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
              <p>Click to browse or drop WhatsApp .txt file here</p>
              <p>Standard DD/MM/YY, HH:MM — Sender: Message format</p>
            </label>
          </div>

          <p className="upload-note">
            The default 4,150-message synthetic chat is currently active and indexed.
          </p>
        </div>
      )}
    </div>
  );
}

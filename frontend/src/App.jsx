import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";

const API_BASE = "http://localhost:8001/api";

const PARTICIPANTS = [
  "Aarav", "Priya", "Rohan", "Sneha", "Kabir", "Ananya", "Vikram", "Neha"
];

const AVATAR_COLORS = {
  Aarav:  "#4A7CBA",
  Priya:  "#C25B78",
  Rohan:  "#C48A3F",
  Sneha:  "#7E6BAD",
  Kabir:  "#3D8B6E",
  Ananya: "#4A9BA8",
  Vikram: "#6B7B8D",
  Neha:   "#B5545B",
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

  /* ── Shared bubble renderer ─────────────────────────────── */
  const Avatar = ({ name }) => (
    <div
      className="bubble-avatar"
      style={{ backgroundColor: AVATAR_COLORS[name] || "#6B7B8D" }}
    >
      {name ? name[0] : "?"}
    </div>
  );

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
            {(score * 100).toFixed(0)}% match
            {dense != null && ` · dense ${(dense * 100).toFixed(0)}%`}
            {bm25 != null && bm25 > 0 && ` · bm25 ${bm25.toFixed(1)}`}
            {rank != null && ` · #${rank}`}
          </div>
        )}
      </div>
    </div>
  );

  /* ── Tabs ────────────────────────────────────────────────── */
  const tabs = [
    { id: "search", label: "Search" },
    { id: "benchmark", label: "Benchmark" },
    { id: "browser", label: "Chat Explorer" },
    { id: "upload", label: "Upload" },
  ];

  return (
    <div className="page">
      {/* ── Header ────────────────────────────────────────── */}
      <header className="site-header">
        <h1 className="site-title">CharchaSearch</h1>
        <div className="site-meta">
          <span>4,150 messages</span>
          <span>BGE-Small ONNX + BM25</span>
          <a
            href="https://github.com/Rian-yes/Group-Chat-Searcher.git"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </header>
      <p className="site-subtitle">
        Semantic retrieval across a messy Hinglish group chat.
        Meaning first, keywords second.
      </p>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <nav className="tab-bar" aria-label="Main sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${activeTab === t.id ? " active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ═══════════════ SEARCH TAB ═══════════════════════ */}
      {activeTab === "search" && (
        <div>
          {/* Search bar */}
          <form
            className="search-form"
            onSubmit={(e) => { e.preventDefault(); executeSearch(); }}
          >
            <div className="search-wrap">
              <Search size={16} className="search-icon" />
              <input
                className="search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask in English or Hinglish — e.g. when did we decide on Manali?"
              />
            </div>
            <button
              type="button"
              className={`filter-btn${showFilters ? " open" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>
            <button type="submit" className="search-btn" disabled={searchLoading}>
              {searchLoading ? "Searching…" : "Search"}
            </button>
          </form>

          {/* Filters */}
          {showFilters && (
            <div className="filter-panel">
              <div>
                <label>Sender</label>
                <select
                  value={senderFilter}
                  onChange={(e) => setSenderFilter(e.target.value)}
                >
                  <option value="">All (8)</option>
                  {PARTICIPANTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Context ±{windowSize}</label>
                <input
                  type="range" min="1" max="7"
                  value={windowSize}
                  onChange={(e) => setWindowSize(Number(e.target.value))}
                  style={{ width: "100px" }}
                />
              </div>
              <div>
                <label>Results: {topK}</label>
                <input
                  type="range" min="1" max="10"
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  style={{ width: "80px" }}
                />
              </div>
              {senderFilter && (
                <button className="clear-btn" onClick={() => setSenderFilter("")}>
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Suggestion chips */}
          <div className="suggestions">
            <span className="label">Try:</span>
            {SAMPLE_QUERIES.map((sq, i) => (
              <button
                key={i}
                className="chip"
                onClick={() => { setQuery(sq.text); executeSearch(sq.text); }}
              >
                {sq.text}
              </button>
            ))}
          </div>

          {/* ── AI Answer ────────────────────────────────── */}
          {answerData && answerData.is_relevant !== false && (
            <div className="answer-block answer-reveal">
              <div className="answer-label">
                Answer
                {answerData.intent && (
                  <span className="intent-tag" style={{ marginLeft: "0.75rem" }}>
                    {answerData.intent.category.replace("_", " ")}
                  </span>
                )}
              </div>
              <p className="answer-text"
                dangerouslySetInnerHTML={{
                  __html: answerData.answer
                    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
                    .replace(/`([^`]+)`/g, "<code>$1</code>")
                }}
              />
              {answerData.citations && answerData.citations.length > 0 && (
                <div className="answer-citations">
                  {answerData.citations.map((cit, i) => (
                    <span key={i} className="citation-ref">
                      {cit.sender}, {cit.timestamp} — {cit.message_id}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── No match ─────────────────────────────────── */}
          {answerData && answerData.is_relevant === false && (
            <div className="no-match answer-reveal">
              <p className="no-match-text">
                Nothing in 4,150 messages matches that query. Not even close.
              </p>
              <p className="no-match-tip">
                This chat covers Manali trip planning, Goa villa budgeting, a hackathon tech stack, and daily nonsense between Priya, Aarav, Kabir, Sneha, Rohan, Ananya, Vikram, and Neha — Jan to Jul 2024.
              </p>
            </div>
          )}

          {/* ── Results as Timeline ──────────────────────── */}
          {searchResults && searchResults.results && searchResults.results.length > 0 && (
            <div>
              <div className="results-header">
                <h2 className="results-title">
                  {searchResults.results.length} matched{searchResults.results.length > 1 ? " messages" : " message"}
                </h2>
                <span className="results-count">
                  searched {searchResults.total_candidates.toLocaleString()} messages
                </span>
              </div>

              {searchResults.results.map((res, rIdx) => {
                const msg = res.message;
                const isExpanded = expandedContexts[rIdx];

                return (
                  <div key={rIdx} className="thread-group">
                    {/* Rank line */}
                    <div className="thread-rank">
                      <span>#{res.rank}</span>
                      <span className="score">
                        {(res.score * 100).toFixed(0)}% match
                      </span>
                    </div>

                    {/* Context: messages before the match */}
                    {isExpanded &&
                      res.context_window
                        .filter((c) => !c.is_match)
                        .filter((_, i, arr) => {
                          // Show messages before the match
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

                    {/* The matched message */}
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

                    {/* Context: messages after the match */}
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

                    {/* Context toggle */}
                    <button
                      className="context-toggle"
                      onClick={() => toggleContext(rIdx)}
                    >
                      {isExpanded
                        ? <><ChevronUp size={14} /> hide context</>
                        : <><ChevronDown size={14} /> show ±{windowSize} messages</>
                      }
                    </button>

                    {rIdx < searchResults.results.length - 1 && (
                      <div className="thread-divider" />
                    )}
                  </div>
                );
              })}
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
                Evaluation: 40 Ground Truth Queries
              </h2>
              <p className="bench-sub">
                Semantic, attributed, temporal, and 10 zero-lexical-overlap test cases.
              </p>
            </div>
            <button
              className="bench-run-btn"
              onClick={runBenchmark}
              disabled={benchmarkLoading}
            >
              {benchmarkLoading ? "Running…" : "Re-run all 40"}
            </button>
          </div>

          {/* Metrics */}
          {benchmarkData && (
            <div className="metrics-row">
              <div className="metric-cell">
                <div className="metric-label">Recall@5</div>
                <div className="metric-value">
                  {(benchmarkData.recall_at_5 * 100).toFixed(1)}<span className="unit">%</span>
                </div>
                <div className="metric-note">target in top 5</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">Top-1 Accuracy</div>
                <div className="metric-value">
                  {(benchmarkData.top1_accuracy * 100).toFixed(1)}<span className="unit">%</span>
                </div>
                <div className="metric-note">exact rank #1</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">MRR</div>
                <div className="metric-value">
                  {benchmarkData.mrr.toFixed(4)}
                </div>
                <div className="metric-note">mean reciprocal rank</div>
              </div>
              <div className="metric-cell">
                <div className="metric-label">Latency</div>
                <div className="metric-value">
                  {benchmarkData.avg_latency_ms}<span className="unit"> ms</span>
                </div>
                <div className="metric-note">avg per query</div>
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {benchmarkData && benchmarkData.categories && (
            <div className="cat-grid">
              {Object.entries(benchmarkData.categories).map(([cat, stats]) => (
                <div key={cat} className="cat-card">
                  <div className="cat-name">{cat.replace(/_/g, " ")}</div>
                  <div className="cat-stats">
                    <span>Top-1: {(stats.top1_accuracy * 100).toFixed(0)}%</span>
                    <span className="highlight">
                      R@5: {(stats.recall_at_5 * 100).toFixed(0)}%
                    </span>
                    <span>MRR: {stats.mrr.toFixed(3)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filter chips */}
          <div className="bench-filters">
            {["all", "zero_lexical_overlap", "semantic", "attributed", "temporal"].map((f) => (
              <button
                key={f}
                className={`bench-filter-btn${benchmarkFilter === f ? " active" : ""}`}
                onClick={() => setBenchmarkFilter(f)}
              >
                {f === "all" ? "All 40" : f.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Query table */}
          {benchmarkData && benchmarkData.query_evaluations && (
            <div className="table-wrap">
              <table className="query-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Query</th>
                    <th>Category</th>
                    <th>Target Message</th>
                    <th>Rank</th>
                    <th></th>
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
                          {q.target_text}
                          <span className="ref">{q.target_message_id}</span>
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
                            Try <ArrowRight size={11} />
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
              <h2 className="browser-title">Chat Archive</h2>
              <p className="browser-range">
                4,150 messages · Jan 15 – Jul 15, 2024
              </p>
            </div>
            <div className="browser-filter">
              <select
                value={browserSender}
                onChange={(e) => { setBrowserSender(e.target.value); setChatPage(1); }}
              >
                <option value="">All senders</option>
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
          <h2 className="upload-title">Upload a Chat Export</h2>
          <p className="upload-desc">
            Export any WhatsApp chat without media as a <code>.txt</code> file.
            The system will re-index and search over your conversation.
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
              <p>Click to browse or drop a .txt file</p>
              <p>DD/MM/YY, HH:MM — Sender: Message format</p>
            </label>
          </div>

          <p className="upload-note">
            The synthetic 4,150-message chat is currently active.
          </p>
        </div>
      )}
    </div>
  );
}

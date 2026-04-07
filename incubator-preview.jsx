import { useState } from "react";

const sampleData = {
  weeks: [
    { number: 1, title: "Inner Life & Personal Integrity", section: "character", days: 4 },
    { number: 2, title: "Leadership & Relational Maturity", section: "character", days: 4 },
    { number: 3, title: "Spiritual Maturity", section: "character", days: 5 },
    { number: 4, title: "Doctrine", section: "doctrine", days: 5 },
    { number: 5, title: "Theological Convictions", section: "convictions", days: 6 },
  ]
};

const sectionColors = { character: "#00C853", doctrine: "#2979FF", convictions: "#FF6D00" };
const sectionLabels = { character: "CHARACTER", doctrine: "DOCTRINE", convictions: "CONVICTIONS" };

const week1Day1 = {
  title: "Blameless",
  scripture: "1 Timothy 3:2",
  keyVerses: ["Titus 1:6-7", "Matthew 5:14-16", "1 Peter 2:12", "Proverbs 11:3", "1 Timothy 4:12", "Hebrews 13:7", "Psalm 119:11", "Proverbs 27:17", "1 Corinthians 10:13", "Galatians 5:16"],
  selfEval: [
    "In what areas of my life do I struggle most to maintain integrity? How can I work on these areas?",
    "Is there a continuous pattern of sin in my life that could damage my testimony as a Christian?",
    "Do my private actions match my public persona? Am I the same person in secret as I am in public?"
  ]
};

export default function IncubatorPreview() {
  const [weekIdx, setWeekIdx] = useState(0);
  const [dayIdx, setDayIdx] = useState(0);
  const [answers, setAnswers] = useState({});

  const week = sampleData.weeks[weekIdx];
  const color = sectionColors[week.section];
  const label = sectionLabels[week.section];

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", background: "#F7F8FA", minHeight: "100vh", display: "flex" }}>
      {/* Sidebar */}
      <div style={{ width: 240, background: "#0B1D3A", color: "white", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "28px 24px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>HouseChurch</h1>
          <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4, display: "block" }}>Church Management</span>
        </div>
        <nav style={{ padding: "20px 12px", display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {[
            { label: "Dashboard", icon: "🏠" },
            { label: "Discipleship", icon: "📖" },
            { label: "Pastor Incubator", icon: "🌱", active: true },
            { label: "House Churches", icon: "⛪" },
            { label: "Members", icon: "👥" },
            { label: "Attendance", icon: "📅" },
            { label: "Prayer Requests", icon: "❤️" },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "11px 14px", borderRadius: 8,
              cursor: "pointer", fontSize: 14, fontWeight: 500,
              background: item.active ? "rgba(91,209,132,0.12)" : "transparent",
              color: item.active ? "#5BD184" : "rgba(255,255,255,0.55)",
            }}>
              <span style={{ width: 20, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #00C853, #38E878)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>DT</div>
            <div>
              <strong style={{ fontSize: 13, display: "block" }}>Danny T</strong>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>Senior Pastor</span>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 14, background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            <button style={{ flex: 1, padding: "6px 0", textAlign: "center", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: "rgba(91,209,132,0.2)", color: "#5BD184", letterSpacing: 0.5 }}>EN</button>
            <button style={{ flex: 1, padding: "6px 0", textAlign: "center", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.55)", letterSpacing: 0.5 }}>ES</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "36px 40px", maxWidth: 960 }}>
        {/* Page Header */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "#0B1D3A", letterSpacing: -0.5, margin: 0 }}>Pastor Incubator</h2>
          <p style={{ fontSize: 15, color: "#5F6B7A", marginTop: 4 }}>House Church Pastor training — character, doctrine & convictions</p>
        </div>

        {/* Week Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {sampleData.weeks.map((w, i) => (
            <button key={i} onClick={() => { setWeekIdx(i); setDayIdx(0); }} style={{
              padding: "10px 20px", borderRadius: 100, border: "1px solid " + (weekIdx === i ? "#00C853" : "#E8EAED"),
              background: weekIdx === i ? "#00C853" : "white", color: weekIdx === i ? "white" : "#5F6B7A",
              fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>
              Week {w.number}
            </button>
          ))}
        </div>

        {/* Section Badge + Week Title */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #E8EAED", padding: 24, marginBottom: 20, borderLeft: `4px solid ${color}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ background: color, color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{label}</span>
          </div>
          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0B1D3A" }}>{week.title}</h4>
          <p style={{ color: "#5F6B7A", fontSize: 13, marginTop: 6 }}>
            {weekIdx === 0 ? "1 module today" : weekIdx >= 3 ? "2 modules today" : "1 module today"}
          </p>
        </div>

        {/* Day Buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {Array.from({ length: week.days }, (_, i) => (
            <button key={i} onClick={() => setDayIdx(i)} style={{
              padding: "10px 20px", borderRadius: 8,
              border: dayIdx === i ? `2px solid ${color}` : "1px solid #E8EAED",
              background: dayIdx === i ? color : "white",
              color: dayIdx === i ? "white" : "#5F6B7A",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Day {i + 1}
            </button>
          ))}
        </div>

        {/* Module Card (showing Week 1 Day 1 sample) */}
        {weekIdx === 0 && dayIdx === 0 ? (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E8EAED", padding: 24, borderTop: `3px solid ${color}` }}>
            {/* Module Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0B1D3A" }}>{week1Day1.title}</h3>
              <span style={{ background: `${color}15`, color, padding: "5px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: `1px solid ${color}30`, cursor: "pointer" }}>
                {week1Day1.scripture} ↗
              </span>
            </div>

            {/* Key Verses */}
            <div style={{ marginTop: 16, marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#8E99A4", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, margin: "0 0 10px" }}>Key Verses</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {week1Day1.keyVerses.map((v, vi) => (
                  <span key={vi} style={{ padding: "5px 12px", background: "rgba(0,200,83,0.06)", border: "1px solid rgba(0,200,83,0.15)", borderRadius: 100, fontSize: 12, fontWeight: 500, color: "#0B1D3A", cursor: "pointer" }}>
                    {v} ↗
                  </span>
                ))}
              </div>
            </div>

            {/* Self-Evaluation */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #F0F1F3" }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14, margin: "0 0 14px" }}>Self-Evaluation</h4>
              {week1Day1.selfEval.map((q, qi) => (
                <div key={qi} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 14, color: "#0B1D3A", fontWeight: 500, marginBottom: 8, lineHeight: 1.5, margin: "0 0 8px" }}>
                    {qi + 1}. {q}
                  </p>
                  <textarea
                    placeholder="Write your reflection..."
                    value={answers[qi] || ""}
                    onChange={e => setAnswers(prev => ({ ...prev, [qi]: e.target.value }))}
                    style={{
                      width: "100%", minHeight: 80, padding: 14, borderRadius: 8, border: "1px solid #E8EAED",
                      fontSize: 14, fontFamily: "inherit", resize: "vertical", background: "#F7F8FA",
                      boxSizing: "border-box", outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E8EAED", padding: 24, borderTop: `3px solid ${color}`, textAlign: "center", color: "#8E99A4" }}>
            <p style={{ fontSize: 15 }}>Select Week 1, Day 1 to see the full module preview</p>
            <p style={{ fontSize: 13 }}>Each day shows module title, clickable scripture references, key verses, and self-evaluation text boxes</p>
          </div>
        )}
      </div>
    </div>
  );
}

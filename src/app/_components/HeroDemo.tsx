"use client";
import { useState, useEffect } from "react";

const OWNERS = [
  { initials: "JW", name: "James Whitfield", email: "james@whitfield.com", property: "412 Maple Ave, Austin TX", gross: "$12,450", expenses: "$3,210", net: "+$9,240", netPos: true },
  { initials: "SR", name: "Sandra Reyes",    email: "sandra@reyes.net",    property: "88 Lakeview Dr, Denver CO", gross: "$8,200",  expenses: "$5,150", net: "+$3,050", netPos: true },
  { initials: "MP", name: "Marcus Pennington", email: "marcus@pennpm.com", property: "9 Cedar Court, Seattle WA", gross: "$5,100",  expenses: "$5,420", net: "−$320",   netPos: false },
];
const GEN_STEPS = ["Validating financial data", "Matching to owner profiles", "Writing AI commentary", "Building PDFs"];
const COMMENTARY = "March was a strong month for 412 Maple. Full occupancy all 31 days — net income up 6.8% vs February. HVAC work is complete and unlikely to recur next month.";
const CSV_ROWS = [
  ["James Whitfield", "412 Maple Ave", "$12,450", "$3,210", "+$9,240"],
  ["Sandra Reyes",    "88 Lakeview Dr", "$8,200", "$5,150", "+$3,050"],
  ["Marcus Pennington", "9 Cedar Court", "$5,100", "$5,420", "−$320"],
];

const CheckCircle = ({ size = 14, color = "#059669" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const Spinner = ({ size = 14, color = "#F59E0B" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, animation: "demospin 0.8s linear infinite" }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);
const CircleDot = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
  </svg>
);
const SendIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const Avatar = ({ initials, size = 28 }: { initials: string; size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: "#FEF3C7", color: "#92400E", fontSize: size * 0.38, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-dm-sans, sans-serif)" }}>
    {initials}
  </div>
);

const Badge = ({ label, type }: { label: string; type: string }) => {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    matching: { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
    matched:  { bg: "#ECFDF5", color: "#047857", border: "#D1FAE5" },
    pending:  { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" },
    sent:     { bg: "#ECFDF5", color: "#047857", border: "#D1FAE5" },
    sending:  { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  };
  const s = styles[type] ?? styles.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, borderRadius: 9999, padding: "2px 8px", background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap", flexShrink: 0 }}>
      {type === "matching" && <Spinner size={9} color="#D97706" />}
      {(type === "matched" || type === "sent") && "✓ "}
      {label}
    </span>
  );
};

function Step1({ csvPhase, visibleRows }: { csvPhase: number; visibleRows: number }) {
  return (
    <div style={{ padding: "0 2px" }}>
      {csvPhase === 0 && (
        <div style={{ border: "2px dashed #E5E7EB", borderRadius: 8, padding: "32px 20px", textAlign: "center", background: "#FAFAFA" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 10px", display: "block" }}>
            <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Drop your CSV here</div>
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>AppFolio · Buildium · any export</div>
        </div>
      )}
      {csvPhase >= 1 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6, marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>owners_march2024.csv</span>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>14 rows</span>
          </div>
          <div style={{ height: 4, background: "#F3F4F6", borderRadius: 2, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#F59E0B", borderRadius: 2, width: csvPhase >= 2 ? "100%" : "65%", transition: "width 1s ease" }} />
          </div>
          {csvPhase >= 2 && (
            <div style={{ border: "1px solid #E5E7EB", borderRadius: 6, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#FAFAFA" }}>
                    {["Owner name", "Property", "Gross", "Expenses", "Net"].map((h) => (
                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#9CA3AF", borderBottom: "1px solid #F3F4F6" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CSV_ROWS.slice(0, visibleRows).map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #F9FAFB", animation: "demoFadeIn 0.35s ease" }}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: "7px 10px", color: j === 4 ? (cell.startsWith("+") ? "#059669" : "#DC2626") : "#374151", fontFamily: j >= 2 ? "var(--font-jetbrains, monospace)" : "inherit", fontSize: j >= 2 ? 11 : 12, fontWeight: j === 0 ? 500 : 400 }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Step2({ matchStates, selectedOwner, setSelectedOwner }: { matchStates: number[]; selectedOwner: number; setSelectedOwner: (i: number) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Matching owners</span>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{matchStates.filter((s) => s === 2).length} / 3 matched</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {OWNERS.map((o, i) => matchStates[i] > 0 && (
          <div key={o.name} onClick={() => setSelectedOwner(i)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: selectedOwner === i ? "#FFFBEB" : "white", border: `1px solid ${selectedOwner === i ? "#FDE68A" : "#E5E7EB"}`, borderRadius: 7, cursor: "pointer", transition: "all 150ms" }}>
            <Avatar initials={o.initials} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{o.name}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.property}</div>
            </div>
            <Badge label={matchStates[i] === 2 ? "Matched" : "Matching..."} type={matchStates[i] === 2 ? "matched" : "matching"} />
          </div>
        ))}
      </div>
      {matchStates[selectedOwner] === 2 && (
        <div style={{ background: "#0A0F1E", borderRadius: 7, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Report preview</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "white", marginBottom: 6 }}>{OWNERS[selectedOwner].name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {([["Gross", OWNERS[selectedOwner].gross], ["Expenses", OWNERS[selectedOwner].expenses], ["Net", OWNERS[selectedOwner].net]] as [string, string][]).map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>{l}</div>
                <div style={{ fontFamily: "var(--font-jetbrains, monospace)", fontSize: 13, color: l === "Net" ? (OWNERS[selectedOwner].netPos ? "#34D399" : "#F87171") : "white" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Step3({ genStepActive, genStepDone, typedText }: { genStepActive: number; genStepDone: number[]; typedText: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Generating 3 reports</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
        {GEN_STEPS.map((label, i) => {
          const done = genStepDone.includes(i);
          const active = genStepActive === i;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", borderRadius: 6, background: done ? "#F0FDF4" : active ? "#FFFBEB" : "#F9FAFB", border: `1px solid ${done ? "#D1FAE5" : active ? "#FDE68A" : "#F3F4F6"}`, transition: "all 300ms" }}>
              {done ? <CheckCircle size={14} /> : active ? <Spinner size={14} /> : <CircleDot size={14} />}
              <span style={{ fontSize: 12, color: done ? "#047857" : active ? "#92400E" : "#9CA3AF", fontWeight: active ? 500 : 400, transition: "color 300ms" }}>{label}</span>
              {done && <span style={{ marginLeft: "auto", fontSize: 10, color: "#059669", fontWeight: 600 }}>done</span>}
            </div>
          );
        })}
      </div>
      {(genStepActive === 2 || genStepDone.includes(2)) && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 7, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#D97706", marginBottom: 5 }}>AI commentary — James Whitfield</div>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, minHeight: 36 }}>
            &ldquo;{typedText}<span style={{ opacity: genStepDone.includes(2) ? 0 : 1, borderRight: "2px solid #F59E0B", marginLeft: 1, animation: "demoBlink 1s step-end infinite" }} />&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}

function Step4({ sending, sentStates, showBanner, onSend }: { sending: boolean; sentStates: boolean[]; showBanner: boolean; onSend: () => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Send reports</span>
        <span style={{ fontSize: 11, background: "#F3F4F6", color: "#6B7280", borderRadius: 9999, padding: "2px 9px", fontWeight: 500 }}>3 owners</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {OWNERS.map((o, i) => (
          <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "white", border: "1px solid #E5E7EB", borderRadius: 7 }}>
            <Avatar initials={o.initials} size={26} />
            <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{o.email}</span>
            {sentStates[i] ? <Badge label="Sent" type="sent" /> : sending ? <Badge label="Sending..." type="sending" /> : null}
          </div>
        ))}
      </div>
      {!sending && (
        <button onClick={onSend} style={{ width: "100%", background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 7, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <SendIcon size={13} /> Send 3 reports
        </button>
      )}
      {showBanner && (
        <div style={{ background: "#0A0F1E", borderRadius: 7, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, animation: "demoFadeIn 0.4s ease" }}>
          <CheckCircle size={16} color="#34D399" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "white" }}>3 reports delivered</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>0 hours of Excel · done in 4 min 12 sec</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HeroDemo() {
  const [cycleKey, setCycleKey] = useState(0);
  const [step, setStep] = useState(1);
  const [csvPhase, setCsvPhase] = useState(0);
  const [visibleRows, setVisibleRows] = useState(0);
  const [matchStates, setMatchStates] = useState([0, 0, 0]);
  const [selectedOwner, setSelectedOwner] = useState(0);
  const [genStepActive, setGenStepActive] = useState(-1);
  const [genStepDone, setGenStepDone] = useState<number[]>([]);
  const [typedText, setTypedText] = useState("");
  const [sending, setSending] = useState(false);
  const [sentStates, setSentStates] = useState([false, false, false]);
  const [showBanner, setShowBanner] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);

  useEffect(() => {
    setStep(1); setCsvPhase(0); setVisibleRows(0);
    setMatchStates([0, 0, 0]); setSelectedOwner(0);
    setGenStepActive(-1); setGenStepDone([]); setTypedText("");
    setSending(false); setSentStates([false, false, false]);
    setShowBanner(false); setContentVisible(true);

    const tt: ReturnType<typeof setTimeout>[] = [];
    const T = (fn: () => void, d: number) => tt.push(setTimeout(fn, d));

    T(() => setCsvPhase(1), 700);
    T(() => setCsvPhase(2), 1900);
    T(() => setVisibleRows(1), 2400);
    T(() => setVisibleRows(2), 2850);
    T(() => setVisibleRows(3), 3300);

    T(() => setContentVisible(false), 3700);
    T(() => { setStep(2); setContentVisible(true); }, 3950);
    T(() => setMatchStates([1, 0, 0]), 4150);
    T(() => setMatchStates([2, 0, 0]), 4900);
    T(() => setMatchStates([2, 1, 0]), 5200);
    T(() => setMatchStates([2, 2, 0]), 5950);
    T(() => setMatchStates([2, 2, 1]), 6250);
    T(() => setMatchStates([2, 2, 2]), 7000);

    T(() => setContentVisible(false), 7400);
    T(() => { setStep(3); setContentVisible(true); }, 7650);
    T(() => setGenStepActive(0), 7850);
    T(() => { setGenStepDone([0]); setGenStepActive(1); }, 9200);
    T(() => { setGenStepDone([0, 1]); setGenStepActive(2); }, 10500);
    T(() => { setGenStepDone([0, 1, 2]); setGenStepActive(3); }, 13000);
    T(() => { setGenStepDone([0, 1, 2, 3]); setGenStepActive(-1); }, 14300);

    T(() => setContentVisible(false), 14700);
    T(() => { setStep(4); setContentVisible(true); }, 14950);
    T(() => setSending(true), 15900);
    T(() => setSentStates([true, false, false]), 16350);
    T(() => setSentStates([true, true, false]), 16850);
    T(() => setSentStates([true, true, true]), 17350);
    T(() => setShowBanner(true), 17800);

    T(() => setContentVisible(false), 20000);
    T(() => setCycleKey((k) => k + 1), 20350);

    return () => tt.forEach(clearTimeout);
  }, [cycleKey]);

  useEffect(() => {
    if (genStepActive !== 2) return;
    setTypedText("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i <= COMMENTARY.length) setTypedText(COMMENTARY.slice(0, i));
      else clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [genStepActive]);

  const STEP_META = [
    { n: 1, label: "Upload",    desc: "CSV or Excel" },
    { n: 2, label: "Match",     desc: "Auto-detected" },
    { n: 3, label: "Generate",  desc: "PDF + AI" },
    { n: 4, label: "Send",      desc: "One click" },
  ];

  return (
    <div style={{ display: "flex", gap: 0, height: "100%" }}>
      {/* Step sidebar */}
      <div style={{ width: 156, flexShrink: 0, paddingRight: 16, paddingTop: 4, overflow: "hidden" }}>
        {STEP_META.map((s) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} style={{ display: "flex", gap: 10, marginBottom: 0, transition: "opacity 300ms" }}>
              {/* Circle + connector column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: done ? "#059669" : active ? "#F59E0B" : "rgba(255,255,255,0.12)", color: done ? "white" : active ? "#0A0F1E" : "rgba(255,255,255,0.45)", transition: "all 300ms" }}>
                  {done ? "✓" : s.n}
                </div>
                {s.n < 4 && <div style={{ width: 1, height: 28, background: done ? "#059669" : "rgba(255,255,255,0.15)", marginTop: 3, flexShrink: 0, transition: "background 300ms" }} />}
              </div>
              {/* Label + desc column — fixed height so all steps are the same size */}
              <div style={{ paddingTop: 2, paddingBottom: s.n < 4 ? 0 : 0, minHeight: s.n < 4 ? 53 : 22 }}>
                <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "white" : done ? "#34D399" : "rgba(255,255,255,0.4)", lineHeight: 1.2, transition: "all 300ms" }}>{s.label}</div>
                <div style={{ fontSize: 11, color: active ? "rgba(255,255,255,0.55)" : done ? "rgba(52,211,153,0.6)" : "rgba(255,255,255,0.22)", marginTop: 3, lineHeight: 1.35, transition: "color 300ms" }}>{s.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Demo frame */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "white", borderRadius: 10, border: "1px solid #E5E7EB", boxShadow: "0 4px 24px rgba(10,15,30,0.10)", overflow: "hidden", minWidth: 0 }}>
        {/* Browser chrome */}
        <div style={{ height: 36, background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", padding: "0 12px", gap: 6, flexShrink: 0 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
          <div style={{ flex: 1, margin: "0 10px", background: "#F3F4F6", borderRadius: 4, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "var(--font-jetbrains, monospace)" }}>app.statementlayer.com</span>
          </div>
          <div style={{ width: 10, height: 10 }} />
        </div>
        {/* App top bar */}
        <div style={{ height: 38, background: "#0A0F1E", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 34 34" fill="none">
            <rect x="0" y="0" width="7" height="7" rx="1.5" fill="white" opacity="0.18" />
            <rect x="11" y="0" width="14" height="7" rx="1.5" fill="white" opacity="0.18" />
            <rect x="27" y="0" width="7" height="7" rx="1.5" fill="white" opacity="0.18" />
            <rect x="0" y="11" width="7" height="7" rx="1.5" fill="white" opacity="0.35" />
            <rect x="11" y="11" width="10" height="7" rx="1.5" fill="white" opacity="0.35" />
            <rect x="23" y="11" width="11" height="7" rx="1.5" fill="white" opacity="0.35" />
            <rect x="0" y="21" width="34" height="1" fill="white" opacity="0.15" />
            <rect x="0" y="26" width="7" height="8" rx="1.5" fill="#F59E0B" />
            <rect x="11" y="26" width="17" height="8" rx="1.5" fill="#F59E0B" />
            <rect x="30" y="26" width="4" height="8" rx="1.5" fill="#F59E0B" opacity="0.5" />
          </svg>
          <span style={{ fontFamily: "var(--font-display-serif, Georgia, serif)", fontSize: 13, color: "white", letterSpacing: "-0.1px" }}>StatementLayer</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>/ March 2024 batch</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: step >= n ? "#F59E0B" : "rgba(255,255,255,0.12)", transition: "background 300ms" }} />
            ))}
          </div>
        </div>
        {/* Step content */}
        <div style={{ flex: 1, minHeight: 0, padding: 16, overflowY: "auto", background: "#FAF8F4", opacity: contentVisible ? 1 : 0, transition: "opacity 250ms ease" }}>
          {step === 1 && <Step1 csvPhase={csvPhase} visibleRows={visibleRows} />}
          {step === 2 && <Step2 matchStates={matchStates} selectedOwner={selectedOwner} setSelectedOwner={setSelectedOwner} />}
          {step === 3 && <Step3 genStepActive={genStepActive} genStepDone={genStepDone} typedText={typedText} />}
          {step === 4 && <Step4 sending={sending} sentStates={sentStates} showBanner={showBanner} onSend={() => setSending(true)} />}
        </div>
      </div>
    </div>
  );
}

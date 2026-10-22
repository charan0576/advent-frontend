import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { API, COVER_TYPES, coverProblem } from "./api.js";
import { Check, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Film, ImagePlus, LoaderCircle, Sparkles, TriangleAlert, UserRound, X } from "lucide-react";

const MAX_SUMMARY = 500;
const AUTO_NEXT_MS = 450;
const PHOTO_MS = 2600;

const CAUSES = [
  { id: "food", name: "Food", desc: "Meals, food banks, pantries", color: "#d97706", cover: "/art/cause-food.jpg" },
  { id: "money", name: "Giving & funds", desc: "Donations and campaigns", color: "#be123c", cover: "/art/cause-money.svg" },
  { id: "community", name: "Community", desc: "Neighbors and local support", color: "#1d4ed8", cover: "/art/cause-community.jpg" },
  { id: "education", name: "Education", desc: "Scholarships and tutoring", color: "#0e7490", cover: "/art/cause-education.svg" },
  { id: "health", name: "Health", desc: "Clinics and wellbeing", color: "#15803d", cover: "/art/cause-health.jpg" },
];

const STYLES = [
  { id: "premium", name: "Premium", desc: "Elegant serif type, calm framing" },
  { id: "news", name: "News", desc: "Lower-third captions and a ticker" },
];

// Colour grades for the rendered video (primary, secondary, background). The first one is the default.
const PALETTES = [
  { name: "Ivory & gold", primary: "#1e3a8a", secondary: "#b8893b", background: "#f1ede4" },
  { name: "Midnight & gold", primary: "#1e3a8a", secondary: "#d4a24c", background: "#0f172a" },
  { name: "Sage & sand", primary: "#4d7c5f", secondary: "#e8d6a5", background: "#1f2a24" },
  { name: "Ocean", primary: "#0e7490", secondary: "#a7f3d0", background: "#0b2a3a" },
  { name: "Ember", primary: "#c2410c", secondary: "#fde68a", background: "#2a1414" },
  { name: "Plum & rose", primary: "#9d174d", secondary: "#fbcfe8", background: "#241428" },
];

const VOICES = [
  { id: "professional", name: "Professional", desc: "Clear and confident" },
  { id: "warm", name: "Warm", desc: "Friendly and welcoming" },
  { id: "energetic", name: "Energetic", desc: "Upbeat and lively" },
];

// One screen per step. Every step has the same structure and size.
const STEPS = [
  { short: "Story", title: "Tell your story", hint: "Use facts you can stand behind. This text becomes the narration." },
  { short: "Impact", title: "Impact numbers", hint: "Up to three figures you can verify. Skip this step if you have none.", optional: true },
  { short: "Goal", title: "Fundraising goal", hint: "Adds a progress scene to the video. Figures appear exactly as entered.", optional: true },
  { short: "Cause", title: "Cause and style", hint: "Pick one cause and one style. Add your own cover image to any box if you like, then continue." },
  { short: "Colours", title: "Colours and logo", hint: "Choose a colour grade, fine-tune the colours if you like, and add a logo." },
  { short: "Voice", title: "Narration voice", hint: "A clear English voice reads each scene. We move on as soon as you choose." },
  { short: "Review", title: "Review and generate", hint: "Check the summary and the preview, then create your 30-second video." },
];
const LAST = STEPS.length - 1;

const luminanceOf = (hex) => {
  const h = String(hex || "#000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h.padEnd(6, "0");
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) || 0);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

const formatNumber = (value) => {
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) && String(value).trim() !== "" ? n.toLocaleString("en-US") : "";
};

function Field({ label, htmlFor, help, count, children }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      <div className="field-foot">
        {help && <span className="help">{help}</span>}
        {count && <span className={`count ${count.over ? "over" : ""}`}>{count.text}</span>}
      </div>
    </div>
  );
}

// Image paths from the API are relative ("/covers/..."), so they are prefixed with the API address.
const withApi = (map = {}) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, `${API}${v}`]));

// The small "Add cover" control under each cause and style box.
function CoverTool({ label, custom, busy, onPick, onReset }) {
  return (
    <div className="cover-tool">
      <label className={`cover-pick ${busy ? "is-busy" : ""}`}>
        <ImagePlus size={13} aria-hidden="true" /> {busy ? "Saving…" : custom ? "Change cover" : "Add cover"}
        <input type="file" accept={COVER_TYPES} disabled={busy} onChange={onPick} aria-label={`Cover image for ${label}`} />
      </label>
      {custom && !busy && <button type="button" className="cover-reset" onClick={onReset}>Reset</button>}
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState({
    organization_name: "Harvest Hands Food Ministry",
    summary: "Harvest Hands provides fresh food to families in need each week. Volunteers pack and deliver meals across the Riverside neighborhood.",
    tagline: "Feeding neighbors since 2014",
    spotlight_title: "Ministry Spotlight",
    highlightsText: "Weekly food deliveries\nVolunteer-powered pantry",
    website_url: "",
    cause: "food",
    style: "premium",
    primary_color: PALETTES[0].primary,
    secondary_color: PALETTES[0].secondary,
    background_color: PALETTES[0].background,
    stats: [{ value: "85", label: "volunteers every week" }, { value: "1,050", label: "hot meals delivered weekly" }, { value: "", label: "" }],
    useCampaign: true,
    campaign_title: "Refrigerated van fund",
    campaign_goal: "40000",
    campaign_raised: "24800",
    voice_style: "professional",
  });
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [picked, setPicked] = useState({ cause: false, style: false });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [templateCovers, setTemplateCovers] = useState({});
  const [coverBusyKey, setCoverBusyKey] = useState("");
  const [job, setJob] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [slide, setSlide] = useState(0);
  const [error, setError] = useState("");
  const [health, setHealth] = useState("checking");
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const highlights = useMemo(
    () => form.highlightsText.split("\n").map(x => x.trim()).filter(Boolean).slice(0, 5),
    [form.highlightsText],
  );
  const cause = CAUSES.find(c => c.id === form.cause) || CAUSES[0];
  const style = STYLES.find(s => s.id === form.style) || STYLES[0];
  const rendering = job && ["queued", "rendering"].includes(job.status);
  const view = rendering ? "generating" : job?.status === "completed" && job.video_url ? "result" : "wizard";

  const campaignGoal = form.useCampaign ? form.campaign_goal : "";
  const goalNumber = Number(String(campaignGoal).replace(/,/g, ""));
  const raisedNumber = Number(String(form.campaign_raised).replace(/,/g, "")) || 0;
  const percent = goalNumber > 0 ? Math.min(100, Math.round((raisedNumber / goalNumber) * 100)) : 0;
  const campaignInvalid = form.useCampaign && campaignGoal.trim() !== "" && !(goalNumber > 0);
  const storyValid = Boolean(form.organization_name.trim() && form.summary.trim());
  const statCount = form.stats.filter(s => s.value.trim() && s.label.trim()).length;

  const missing = [];
  if (!form.organization_name.trim()) missing.push("organization name");
  if (!form.summary.trim()) missing.push("summary");
  if (campaignInvalid) missing.push("a valid campaign goal");
  const canGenerate = missing.length === 0 && !rendering;

  const stepReady = step === 0 ? storyValid : step === 2 ? !campaignInvalid : true;
  const meta = STEPS[step];


  // ---- navigation -------------------------------------------------------
  const goTo = (index) => {
    if (index < 0 || index > LAST || index === step) return;
    setDirection(index > step ? 1 : -1);
    setStep(index);
  };
  const next = () => goTo(Math.min(step + 1, LAST));
  const back = () => goTo(Math.max(step - 1, 0));

  // Moves on by itself after a short pause, only if the user is still on the same step.
  const autoNext = (from) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDirection(1);
      setStep(cur => (cur === from ? Math.min(from + 1, LAST) : cur));
    }, AUTO_NEXT_MS);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  // ---- effects ----------------------------------------------------------
  useEffect(() => {
    fetch(`${API}/health`).then(r => { if (!r.ok) throw Error(); setHealth("online"); }).catch(() => setHealth("offline"));
  }, []);

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  // Organisation details (Profile tab) fill the form, and the cover of each cause and style box.
  useEffect(() => {
    fetch(`${API}/organization`)
      .then(r => (r.ok ? r.json() : null))
      .then(org => {
        if (!org) return;
        setForm(old => ({
          ...old,
          organization_name: org.name || old.organization_name,
          summary: org.what_we_do || old.summary,
          highlightsText: org.how_we_help ? org.how_we_help.split("\n").slice(0, 5).join("\n") : old.highlightsText,
        }));
        setTemplateCovers(withApi(org.template_covers));
      })
      .catch(() => { /* offline: the built-in values are used */ });
  }, []);

  useEffect(() => {
    if (!job?.job_id || !["queued", "rendering"].includes(job.status)) return;
    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch(`${API}/videos/${job.job_id}/status`);
        const data = await response.json();
        if (!response.ok) throw Error(data.detail || "Status check failed");
        if (!stopped) {
          setJob(data);
          if (data.status === "failed") setError(data.error || "Video rendering failed");
        }
      } catch (e) { if (!stopped) setError(e.message); }
    };
    poll();
    const timerId = setInterval(poll, 2500);
    return () => { stopped = true; clearInterval(timerId); };
  }, [job?.job_id, job?.status]);

  // Default photos for the chosen cause, cycled while the video is generating.
  useEffect(() => {
    if (view !== "generating" || photos.length < 2) return;
    const id = setInterval(() => setSlide(s => (s + 1) % photos.length), PHOTO_MS);
    return () => clearInterval(id);
  }, [view, photos.length]);

  // ---- actions ----------------------------------------------------------
  async function loadPhotos(causeId) {
    try {
      const response = await fetch(`${API}/defaults/${causeId}`);
      if (!response.ok) throw Error();
      const data = await response.json();
      setPhotos((data.images || []).map(src => `${API}${src}`));
    } catch {
      setPhotos([]);
    }
  }

  async function generate() {
    if (!canGenerate) return;
    setError(""); setJob(null); setSlide(0);
    loadPhotos(form.cause);
    try {
      const data = new FormData();
      data.append("organization_name", form.organization_name);
      data.append("summary", form.summary);
      data.append("tagline", form.tagline);
      data.append("spotlight_title", form.spotlight_title);
      data.append("website_url", form.website_url);
      data.append("template_id", `${form.cause}-${form.style}`);
      data.append("primary_color", form.primary_color);
      data.append("secondary_color", form.secondary_color);
      data.append("background_color", form.background_color);
      data.append("highlights", JSON.stringify(highlights));
      data.append("stats", JSON.stringify(form.stats));
      data.append("campaign_title", form.campaign_title);
      data.append("campaign_goal", campaignGoal);
      data.append("campaign_raised", form.campaign_raised);
      data.append("voice_style", form.voice_style);
      if (logoFile) data.append("logo", logoFile);
      const response = await fetch(`${API}/videos/generate`, { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw Error(result.detail || "Could not start generation");
      setJob(result);
    } catch (e) {
      setError(`${e.message}. Check that the API is running at ${API}.`);
    }
  }

  function startOver() {
    setJob(null); setError(""); setPhotos([]);
    setDirection(-1); setStep(LAST);
  }

  // Enter (or Ctrl/⌘+Enter in the summary) completes the current step.
  function submitStep() {
    if (step === LAST) return generate();
    if (step === 0 && !storyValid) return;
    if (step === 2 && campaignInvalid) return;
    next();
  }

  // Cause and style are chosen separately; the step moves on once both have been picked.
  function choose(key, value) {
    set(key, value);
    const nextPicked = { ...picked, [key]: true };
    setPicked(nextPicked);
  }

  async function copyVideoUrl() {
    if (!job?.video_url) return;
    await navigator.clipboard.writeText(job.video_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function onLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo must be smaller than 5 MB.");
      e.target.value = "";
      return;
    }
    setError("");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function setTemplateCover(key, e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = coverProblem(file);
    if (problem) { setError(problem); return; }
    setError(""); setCoverBusyKey(key);
    const data = new FormData();
    data.append("photo", file);
    try {
      const r = await fetch(`${API}/organization/template-covers/${encodeURIComponent(key)}`, { method: "POST", body: data });
      const body = await r.json();
      if (!r.ok) throw Error(typeof body.detail === "string" ? body.detail : "Could not save the cover image.");
      setTemplateCovers(withApi(body.template_covers));
    } catch (err) {
      setError(err.message);
    } finally {
      setCoverBusyKey("");
    }
  }

  async function resetTemplateCover(key) {
    setError(""); setCoverBusyKey(key);
    try {
      const r = await fetch(`${API}/organization/template-covers/${encodeURIComponent(key)}`, { method: "DELETE" });
      const body = await r.json();
      if (!r.ok) throw Error(body.detail || "Could not reset the cover image.");
      setTemplateCovers(withApi(body.template_covers));
    } catch (err) {
      setError(err.message);
    } finally {
      setCoverBusyKey("");
    }
  }

  function applyPalette(p) {
    setForm(old => ({ ...old, primary_color: p.primary, secondary_color: p.secondary, background_color: p.background }));
  }

  const updateStat = (index, field, value) =>
    set("stats", form.stats.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  const progressLabel = !job ? "" : job.progress < 12 ? "Writing the storyline" : job.progress < 100 ? "Rendering video and narration" : "Finishing up";
  const qr = job?.qr_url || `${API}/o/demo`;
  const premium = form.style === "premium";
  const sectionCount = (value, max) => ({ text: `${value.length}/${max}`, over: value.length > max * 0.9 });
  const voice = VOICES.find(v => v.id === form.voice_style) || VOICES[0];

  // ---- step content -----------------------------------------------------
  function renderStep() {
    switch (step) {
      case 0:
        return <>
          <div className="grid-2">
            <Field label="Organization name" htmlFor="org-name" help="Shown across the video.">
              <input id="org-name" autoFocus value={form.organization_name} maxLength={100} onChange={e => set("organization_name", e.target.value)} />
            </Field>
            <Field label="Tagline" htmlFor="tagline" help="One line under your name.">
              <input id="tagline" value={form.tagline} maxLength={150} onChange={e => set("tagline", e.target.value)} />
            </Field>
          </div>
          <Field label="Summary" htmlFor="summary" help="Two or three sentences. Press Ctrl+Enter to continue." count={sectionCount(form.summary, MAX_SUMMARY)}>
            <textarea id="summary" rows={4} maxLength={MAX_SUMMARY} value={form.summary}
              onChange={e => set("summary", e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submitStep(); } }}
              onBlur={e => {
                // Leaving the summary for something outside this step moves on, if the summary is substantial.
                const leavingStep = e.relatedTarget ? !e.currentTarget.form?.contains(e.relatedTarget) : document.hasFocus();
                if (storyValid && form.summary.trim().length >= 40 && leavingStep) autoNext(0);
              }} />
          </Field>
          <div className="grid-2">
            <Field label="Spotlight title" htmlFor="spotlight" help="Shown on the closing card.">
              <input id="spotlight" value={form.spotlight_title} maxLength={60} onChange={e => set("spotlight_title", e.target.value)} />
            </Field>
            <Field label="Website" htmlFor="website" help="Optional. Shown in the video.">
              <input id="website" value={form.website_url} onChange={e => set("website_url", e.target.value)} placeholder="https://example.org" />
            </Field>
          </div>
          <Field label="Highlights" htmlFor="highlights" help="One per line, up to five.">
            <textarea id="highlights" rows={3} value={form.highlightsText} onChange={e => set("highlightsText", e.target.value)} />
          </Field>
        </>;

      case 1:
        return <div className="stats">
          {form.stats.map((stat, i) => (
            <div className="stat" key={i}>
              <span className="stat-no">{i + 1}</span>
              <input aria-label={`Figure ${i + 1} value`} autoFocus={i === 0} placeholder="e.g. 1,050" value={stat.value} maxLength={24} onChange={e => updateStat(i, "value", e.target.value)} />
              <input aria-label={`Figure ${i + 1} label`} placeholder="what it measures" value={stat.label} maxLength={70} onChange={e => updateStat(i, "label", e.target.value)} />
            </div>
          ))}
          <p className="hint small">{statCount === 0 ? "No figures yet. You can skip this step." : `${statCount} figure${statCount > 1 ? "s" : ""} will be shown.`}</p>
        </div>;

      case 2:
        return <>
          <label className="toggle">
            <input type="checkbox" checked={form.useCampaign}
              onChange={e => { set("useCampaign", e.target.checked); if (!e.target.checked) autoNext(2); }} />
            <span className="switch" aria-hidden="true" />
            <span>Include a campaign scene</span>
          </label>
          {form.useCampaign && <>
            <div className="grid-3">
              <Field label="Campaign name" htmlFor="campaign-name">
                <input id="campaign-name" autoFocus value={form.campaign_title} maxLength={80} onChange={e => set("campaign_title", e.target.value)} />
              </Field>
              <Field label="Goal" htmlFor="campaign-goal" help={campaignInvalid ? "Enter a number above zero." : formatNumber(campaignGoal) ? `Shown as ${formatNumber(campaignGoal)}` : ""}>
                <input id="campaign-goal" inputMode="decimal" value={form.campaign_goal} placeholder="40,000" aria-invalid={campaignInvalid} onChange={e => set("campaign_goal", e.target.value)} />
              </Field>
              <Field label="Raised so far" htmlFor="campaign-raised">
                <input id="campaign-raised" inputMode="decimal" value={form.campaign_raised} placeholder="24,800" onChange={e => set("campaign_raised", e.target.value)} />
              </Field>
            </div>
            {goalNumber > 0 && <div className="progress-preview" aria-label={`${percent} percent of goal`}>
              <div className="bar"><span style={{ width: `${percent}%` }} /></div>
              <span>{percent}% of {formatNumber(campaignGoal)} reached</span>
            </div>}
          </>}
        </>;

      case 3:
        return <>
          <div className="causes" role="radiogroup" aria-label="Cause">
            {CAUSES.map(c => {
              const key = `cause:${c.id}`;
              return (
                <div className="tile-wrap" key={c.id}>
                  <button type="button" role="radio" aria-checked={form.cause === c.id}
                    className={`cause ${form.cause === c.id ? "on" : ""}`} style={{ "--c": c.color }}
                    onClick={() => choose("cause", c.id)}>
                    <img className="cover" src={templateCovers[key] || c.cover} alt="" aria-hidden="true" />
                    <span className="cause-text"><strong>{c.name}</strong><small>{c.desc}</small></span>
                    {form.cause === c.id && <Check size={16} className="tick" aria-hidden="true" />}
                  </button>
                  <CoverTool label={c.name} custom={Boolean(templateCovers[key])} busy={coverBusyKey === key}
                    onPick={e => setTemplateCover(key, e)} onReset={() => resetTemplateCover(key)} />
                </div>
              );
            })}
          </div>
          <div className="styles" role="radiogroup" aria-label="Style">
            {STYLES.map(s => {
              const key = `style:${s.id}`;
              return (
                <div className="tile-wrap" key={s.id}>
                  <button type="button" role="radio" aria-checked={form.style === s.id}
                    className={`style ${form.style === s.id ? "on" : ""}`} onClick={() => choose("style", s.id)}>
                    <img className="cover cover-style" src={templateCovers[key] || `/art/style-${s.id}.svg`} alt="" aria-hidden="true" />
                    <span><strong>{s.name}</strong><small>{s.desc}</small></span>
                  </button>
                  <CoverTool label={s.name} custom={Boolean(templateCovers[key])} busy={coverBusyKey === key}
                    onPick={e => setTemplateCover(key, e)} onReset={() => resetTemplateCover(key)} />
                </div>
              );
            })}
          </div>
          <p className="hint small">{picked.cause && picked.style ? "Both chosen. Continue when you are ready." : "Choose a cause and a style to continue."}</p>
        </>;

      case 4:
        return <>
          <h3 className="sub">Colour grade</h3>
          <div className="palettes">
            {PALETTES.map(p => (
              <button type="button" key={p.name} className={`palette ${form.primary_color === p.primary && form.background_color === p.background ? "on" : ""}`} onClick={() => applyPalette(p)} aria-label={`Apply ${p.name}`}>
                <span style={{ background: p.background }}><i style={{ background: p.primary }} /><i style={{ background: p.secondary }} /></span>
                <small>{p.name}</small>
              </button>
            ))}
          </div>
          <div className="colors">
            {[["Primary", "primary_color"], ["Accent", "secondary_color"], ["Background", "background_color"]].map(([name, key]) => (
              <label className="color" key={key}>
                <span>{name}</span>
                <span className="color-input"><input type="color" value={form[key]} onChange={e => set(key, e.target.value)} /><code>{form[key]}</code></span>
              </label>
            ))}
          </div>
          <h3 className="sub">Logo <span className="badge">Optional</span></h3>
          <div className="logo-row">
            <label className="upload">
              <ImagePlus size={18} aria-hidden="true" />
              <span>{logoFile ? logoFile.name : "Choose a PNG, JPG or WebP (max 5 MB)"}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogoChange} />
            </label>
            {logoPreview && <img className="logo-preview" src={logoPreview} alt="Logo preview" />}
          </div>
        </>;

      case 5:
        return <div className="voices" role="radiogroup" aria-label="Voice">
          {VOICES.map(v => (
            <button type="button" key={v.id} role="radio" aria-checked={form.voice_style === v.id}
              className={`voice ${form.voice_style === v.id ? "on" : ""}`}
              onClick={() => { set("voice_style", v.id); autoNext(5); }}>
              <strong>{v.name}</strong><small>{v.desc}</small>
            </button>
          ))}
        </div>;

      default:
        return <>
          <dl className="recap">
            <div><dt>Organization</dt><dd>{form.organization_name || "—"}</dd></div>
            <div><dt>Cause and style</dt><dd>{cause.name} · {style.name}</dd></div>
            <div><dt>Colour grade</dt><dd><span className="swatches"><i style={{ background: form.primary_color }} /><i style={{ background: form.secondary_color }} /><i style={{ background: form.background_color }} /></span></dd></div>
            <div><dt>Impact figures</dt><dd>{statCount ? `${statCount} entered` : "None"}</dd></div>
            <div><dt>Campaign</dt><dd>{form.useCampaign && goalNumber > 0 ? `Goal ${formatNumber(campaignGoal)}` : "Not included"}</dd></div>
            <div><dt>Narration</dt><dd>{voice.name}</dd></div>
            <div><dt>Logo</dt><dd>{logoFile ? logoFile.name : "None"}</dd></div>
            <div><dt>Cover</dt><dd>{templateCovers[`cause:${form.cause}`] ? `Your cover for ${cause.name}` : "Standard cover"}</dd></div>
          </dl>
          {missing.length > 0 && <p className="needs" role="note">Add {missing.join(", ")} to continue.</p>}
          <p className="hint small">Please check every name, fact and figure before you share it.</p>
        </>;
    }
  }

  // ---- render -----------------------------------------------------------
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><img src="/logo.png" alt="" className="brand-logo-img" /></span>Advent Tech <span className="brand-sub">Studio</span></div>
        <nav className="top-actions" aria-label="Studio">
          <a className="btn profile-tab" href="#/account"><UserRound size={16} /> Profile</a>
        </nav>
      </header>

      {health === "offline" && <div className="alert" role="alert"><TriangleAlert size={16} /> The video service is not responding. Check that the backend is running.</div>}

      <div className="hero">
        <p className="eyebrow">New video</p>
        <h1>Turn your story into a <em>30-second film</em></h1>
      </div>

      <section className="dash-promo" aria-label="Generate an AI video">
        <div>
          <p className="dash-promo-eyebrow"><Sparkles size={14} /> AI video generator</p>
          <h2>Make a new AI video in about five minutes</h2>
          <p>Write your story, choose a cause and colours, and get a narrated 30-second film with a QR code to your profile.</p>
        </div>
        <div className="dash-promo-actions">
          <button type="button" className="login-promo-cta dash-cta" onClick={() => { goTo(0); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <Sparkles size={16} /> Generate AI video
          </button>
          <a className="dash-promo-link" href="#/profiles">View my profiles</a>
        </div>
      </section>

      <div className="layout">
        <div className="col-main">
          {error && <div className="alert" role="alert"><TriangleAlert size={16} /> {error}</div>}

          {view === "wizard" && <>
            <ol className="stepper" aria-label="Progress">
              {STEPS.map((s, i) => {
                const state = i === step ? "current" : i < step ? "done" : "todo";
                return (
                  <li key={s.short}>
                    <button type="button" className={`dot-step ${state}`} onClick={() => goTo(i)} disabled={i > step}
                      aria-current={i === step ? "step" : undefined} aria-label={`Step ${i + 1}: ${s.short}`}>
                      <span className="num">{i < step ? <Check size={13} /> : i + 1}</span>
                      <span className="lbl">{s.short}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <form key={step} className={`wizard-card ${direction > 0 ? "in-right" : "in-left"}`} noValidate
              onSubmit={e => { e.preventDefault(); submitStep(); }}>
              <div className="step-head">
                <span className="step-kicker">Step {step + 1} of {STEPS.length}{meta.optional && <span className="badge">Optional</span>}</span>
                <h2>{meta.title}</h2>
                <p className="hint">{meta.hint}</p>
              </div>

              <div className="step-body">{renderStep()}</div>

              <div className="step-nav">
                <button type="button" className="btn ghost" onClick={back} disabled={step === 0}>
                  <ChevronLeft size={16} /> Back
                </button>
                <div className="nav-right">
                  {meta.optional && <button type="button" className="btn ghost" onClick={next}>Skip</button>}
                  {step < LAST
                    ? <button type="submit" className="btn primary" disabled={!stepReady}>Continue <ChevronRight size={16} /></button>
                    : <button type="submit" className="btn primary" disabled={!canGenerate}><img src="/logo.png" alt="" className="brand-logo-img" /> Create 30-second video</button>}
                </div>
              </div>
            </form>
          </>}

          {view === "generating" && <section className="wizard-card generating" aria-live="polite">
            <div className="step-head">
              <span className="step-kicker">Creating your video</span>
              <h2>{progressLabel}</h2>
              <p className="hint">Usually a few minutes. You can stay on this page.</p>
            </div>
            <div className="showcase">
              {photos.length > 0 ? photos.map((src, i) => (
                <img key={src} src={src} alt="" className={i === slide ? "on" : ""} onError={e => { e.currentTarget.style.display = "none"; }} />
              )) : <div className="showcase-fallback" style={{ "--c": cause.color }}><span>{cause.name}</span></div>}
              <div className="showcase-shade" />
              <span className="showcase-cause">{cause.name} · {style.name}</span>
            </div>
            <div className="progress">
              <div className="bar"><span style={{ width: `${job?.progress || 0}%` }} /></div>
              <div className="progress-label"><LoaderCircle className="spin" size={16} /> {job?.progress || 0}%</div>
            </div>
          </section>}

          {view === "result" && <section className="wizard-card result" aria-live="polite">
            <div className="step-head">
              <span className="step-kicker">Done</span>
              <h2><Check size={18} /> Your video is ready</h2>
            </div>
            <video className="video" src={job.video_url} controls />
            <div className="actions">
              <a className="btn primary-link" href={job.video_url} download><Download size={15} /> Download MP4</a>
              <button type="button" className="btn" onClick={copyVideoUrl}><Copy size={15} /> {copied ? "Copied" : "Copy link"}</button>
              <button type="button" className="btn" onClick={startOver}>Make another</button>
            </div>

            {job?.warnings?.length > 0 && <ul className="warnings">{job.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}

            {job?.scenes?.length > 0 && <>
              <h3 className="sub">Storyline</h3>
              <p className="muted small">{job.story_source === "gemini" ? "Drafted from your summary and tidied for speaking." : "Drafted from your summary."}</p>
              <ol className="timeline">
                {job.scenes.map((scene, i) => (
                  <li key={`${i}-${scene.id}`}>
                    <span className="time">{scene.start_seconds.toFixed(0)}–{scene.end_seconds.toFixed(0)}s</span>
                    <div><strong>{scene.caption}</strong><p>{scene.narration}</p></div>
                  </li>
                ))}
              </ol>
            </>}

            <div className="qr-row">
              <div>
                <h3 className="sub">Profile QR</h3>
                <p className="muted small">Shown on the closing scene. Scans open your organization page.</p>
                {job?.qr_url && <a className="link" href={job.qr_url} target="_blank" rel="noreferrer">Open profile <ExternalLink size={13} /></a>}
              </div>
              <div className="qr"><QRCodeSVG value={qr} size={96} /></div>
            </div>
          </section>}
        </div>

        <aside className="col-side">
          <div className="card sticky">
            <div className="card-kicker">Live preview</div>
            <div className={`preview ${luminanceOf(form.background_color) > 0.6 ? "light" : ""}`} style={{ "--video-bg": form.background_color, "--p": form.primary_color, "--s": form.secondary_color }}>
              <div className="preview-top">
                <span className="preview-chip" style={{ background: cause.color }}>{cause.name}</span>
                {logoPreview && <img src={logoPreview} alt="" />}
              </div>
              <div className={`preview-body ${premium ? "serif" : ""}`}>
                <small style={{ color: premium ? form.secondary_color : form.primary_color }}>{premium ? "AN INTRODUCTION" : "ORGANIZATION SPOTLIGHT"}</small>
                <h3>{form.organization_name || "Your organization"}</h3>
                <p>{form.tagline || "Your story starts here."}</p>
              </div>
              {!premium && <div className="preview-ticker" style={{ background: form.primary_color }}>{[form.organization_name, form.tagline].filter(Boolean).join("  •  ")}</div>}
              <div className="preview-foot"><span>{form.useCampaign && goalNumber > 0 ? "Intro · Mission · Impact · Campaign · Call to action · QR" : "Intro · Mission · Impact · Call to action · QR"}</span></div>
            </div>
            <p className="preview-note">Approximate preview. Your video is about 30 seconds long.</p>
          </div>

          <div className="card timeline-card">
            <div className="card-kicker">Video timing</div>
            <ol className="plan">
              {[["Introduction", "0–3 s"], ["Organization", "3–9 s"], ["Services & impact", "9–15 s"], ["Campaign (with a goal)", "15–22 s"], ["Call to action", "22–27 s"], ["Closing with QR", "27–30 s"]].map(([name, time]) => (
                <li key={name}><span>{name}</span><small>{time}</small></li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <footer className="footer">Advent Tech Studio · Check every fact and statistic before you publish.</footer>
    </div>
  );
}

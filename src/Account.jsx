import React, { useEffect, useRef, useState } from "react";
import { Film, ImagePlus, Save, Trash2 } from "lucide-react";
import { API, COVER_TYPES, coverProblem } from "./api.js";

const EMPTY = { name: "", what_we_do: "", how_we_help: "" };

// Profile tab: only the organisation's details, the information that appears in every video and profile.
export default function Account() {
  const [form, setForm] = useState(EMPTY);
  const [cover, setCover] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [coverBusy, setCoverBusy] = useState(false);
  const coverRef = useRef(null);

  const applyOrg = (body) => {
    setForm({ name: body.name || "", what_we_do: body.what_we_do || "", how_we_help: body.how_we_help || "" });
    setCover(body.cover || null);
  };

  useEffect(() => {
    fetch(`${API}/organization`)
      .then(async r => {
        const body = await r.json();
        if (!r.ok) throw Error(body.detail || "Could not load the organisation details.");
        applyOrg(body);
      })
      .catch(e => setLoadError(e.message));
  }, []);

  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));

  async function save(e) {
    e.preventDefault();
    setSaving(true); setMsg({ type: "", text: "" });
    try {
      const r = await fetch(`${API}/organization`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, what_we_do: form.what_we_do, how_we_help: form.how_we_help }),
      });
      const body = await r.json();
      if (!r.ok) throw Error(typeof body.detail === "string" ? body.detail : "Could not save the organisation details.");
      applyOrg(body);
      setMsg({ type: "ok", text: "Saved. New videos will use these details." });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function uploadCover(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = coverProblem(file);
    if (problem) { setMsg({ type: "error", text: problem }); return; }
    setCoverBusy(true); setMsg({ type: "", text: "" });
    const data = new FormData();
    data.append("photo", file);
    try {
      const r = await fetch(`${API}/organization/cover`, { method: "POST", body: data });
      const body = await r.json();
      if (!r.ok) throw Error(typeof body.detail === "string" ? body.detail : "Could not save the cover image.");
      setCover(body.cover);
      setMsg({ type: "ok", text: "Cover image saved." });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setCoverBusy(false);
    }
  }

  async function removeCover() {
    setCoverBusy(true); setMsg({ type: "", text: "" });
    try {
      const r = await fetch(`${API}/organization/cover`, { method: "DELETE" });
      const body = await r.json();
      if (!r.ok) throw Error(body.detail || "Could not remove the cover image.");
      setCover(body.cover);
      setMsg({ type: "ok", text: "Cover image removed." });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setCoverBusy(false);
    }
  }

  return (
    <div className="ac-page">
      <header className="ac-topbar">
        <a href="#/studio" className="ac-brand"><span className="ac-brand-mark"><img src="/logo.png" alt="" className="brand-logo-img" /></span>Advent Tech <span>Studio</span></a>
        <nav className="ac-top-links">
          <a href="#/studio" className="ac-chip">Back to studio</a>
          <a href="#/profiles" className="ac-chip">My profiles</a>
        </nav>
      </header>

      {loadError && <p className="ac-alert" role="alert">{loadError}</p>}

      <form className="ac-card" onSubmit={save}>
        <div>
          <h1>Organisation</h1>
          <p className="ac-sub">These details appear in your videos and on your public profile.</p>
        </div>

        <label className="ac-field">
          <span>Organisation name</span>
          <input required maxLength={100} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Harvest Hands Food Ministry" />
        </label>

        <label className="ac-field">
          <span>What does your organisation do?</span>
          <textarea rows={4} maxLength={500} value={form.what_we_do} onChange={e => set("what_we_do", e.target.value)}
            placeholder="Describe your main work in two or three sentences." />
          <small>{form.what_we_do.length}/500</small>
        </label>

        <label className="ac-field">
          <span>How does it help people?</span>
          <textarea rows={4} maxLength={500} value={form.how_we_help} onChange={e => set("how_we_help", e.target.value)}
            placeholder={"One point per line, for example:\nWeekly food deliveries to 300 families\nFree tutoring for school children"} />
          <small>One point per line</small>
        </label>

        <div className="ac-form-foot">
          <button type="submit" className="ac-btn primary" disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save details"}</button>
        </div>
      </form>

      <section className="ac-card">
        <div className="ac-photos-head">
          <div>
            <h2>Cover image</h2>
            <p>The banner at the top of your organisation profile. A cover you add to a cause box in the studio is used for that video instead.</p>
          </div>
          <div className="ac-actions">
            <button type="button" className="ac-btn primary" disabled={coverBusy} onClick={() => coverRef.current?.click()}>
              <ImagePlus size={16} /> {coverBusy ? "Saving…" : cover ? "Replace cover" : "Add cover"}
            </button>
            {cover && <button type="button" className="ac-btn" disabled={coverBusy} onClick={removeCover}><Trash2 size={16} /> Remove</button>}
            <input ref={coverRef} type="file" accept={COVER_TYPES} hidden onChange={uploadCover} />
          </div>
        </div>
        {cover ? (
          <div className="ac-cover"><img src={`${API}${cover}`} alt="Organisation cover" /></div>
        ) : (
          <button type="button" className="ac-drop" disabled={coverBusy} onClick={() => coverRef.current?.click()}>
            <ImagePlus size={26} />
            <strong>Add a cover image</strong>
            <span>A wide photo of your organisation works best</span>
          </button>
        )}
      </section>

      {msg.text && <p className={msg.type === "ok" ? "ac-ok" : "ac-alert"} role={msg.type === "ok" ? "status" : "alert"}>{msg.text}</p>}
    </div>
  );
}

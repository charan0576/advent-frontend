import React, { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Film, Globe, ImagePlus, Pencil, Save, Sparkles, Trash2, X } from "lucide-react";
import { API, COVER_TYPES, coverProblem, mediaUrl } from "./api.js";

const CAUSE_NAMES = { food: "Food", money: "Giving & funds", community: "Community", education: "Education", health: "Health" };
const STYLE_NAMES = { premium: "Premium", news: "News" };
const EMPTY_FORM = { organization_name: "", tagline: "", summary: "", highlightsText: "", website_url: "" };

const initialsOf = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "FF";

// Public profile page. The QR code on every video opens this page. The owner can edit it.
export default function Profile({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [coverBusy, setCoverBusy] = useState(false);
  const coverRef = useRef(null);

  const load = () => {
    setError("");
    return fetch(`${API}/profiles/${encodeURIComponent(id)}`)
      .then(async r => {
        const body = await r.json();
        if (!r.ok) throw Error(body.detail || "Profile not found");
        setData(body);
      })
      .catch(e => setError(e.message));
  };

  useEffect(() => { setData(null); setEditing(false); setMessage({ type: "", text: "" }); load(); }, [id]);

  const startEdit = () => {
    setForm({
      organization_name: data.organization_name || "",
      tagline: data.tagline || "",
      summary: data.summary || "",
      highlightsText: (data.highlights || []).join("\n"),
      website_url: data.website_url || "",
    });
    setMessage({ type: "", text: "" });
    setEditing(true);
  };

  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));

  async function save(e) {
    e.preventDefault();
    setSaving(true); setMessage({ type: "", text: "" });
    const payload = {
      organization_name: form.organization_name.trim(),
      tagline: form.tagline.trim(),
      summary: form.summary.trim(),
      highlights: form.highlightsText.split("\n").map(x => x.trim()).filter(Boolean).slice(0, 5),
      website_url: form.website_url.trim(),
    };
    try {
      const r = await fetch(`${API}/profiles/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await r.json();
      if (!r.ok) throw Error(typeof body.detail === "string" ? body.detail : "Could not save your changes.");
      setData(body);
      setEditing(false);
      setMessage({ type: "ok", text: "Profile saved." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  // Owner only: replace or remove this organization's cover image.
  async function uploadCover(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = coverProblem(file);
    if (problem) { setMessage({ type: "error", text: problem }); return; }
    setCoverBusy(true); setMessage({ type: "", text: "" });
    const form = new FormData();
    form.append("photo", file);
    try {
      const r = await fetch(`${API}/profiles/${encodeURIComponent(id)}/cover`, { method: "POST", body: form });
      const body = await r.json();
      if (!r.ok) throw Error(typeof body.detail === "string" ? body.detail : "Could not save the cover image.");
      setData(body);
      setMessage({ type: "ok", text: "Cover image updated." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setCoverBusy(false);
    }
  }

  async function removeCover() {
    setCoverBusy(true); setMessage({ type: "", text: "" });
    try {
      const r = await fetch(`${API}/profiles/${encodeURIComponent(id)}/cover`, { method: "DELETE" });
      const body = await r.json();
      if (!r.ok) throw Error(body.detail || "Could not remove the cover image.");
      setData(body);
      setMessage({ type: "ok", text: "Cover image removed." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setCoverBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href.split("?")[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  }

  const website = data?.website_url || "";
  const safeWebsite = /^https?:\/\//i.test(website) ? website : "";
  const shareUrl = data ? `${API.replace(/\/$/, "")}/o/${data.public_id}` : "";

  return (
    <div className="pp-page">
      <header className="pp-topbar">
        <a href="#/studio" className="pp-brand"><span className="pp-brand-mark"><img src="/logo.png" alt="" className="brand-logo-img" /></span>Advent Tech <span>Profile</span></a>
        <nav className="pp-top-links">
          {data?.is_owner && <a href="#/profiles" className="pp-chip-btn">My profiles</a>}
          <a href="#/studio" className="pp-chip-btn primary"><Sparkles size={14} /> New video</a>
        </nav>
      </header>

      {error && <section className="pp-card"><p className="pp-alert" role="alert">{error}</p></section>}
      {!data && !error && <section className="pp-card"><p className="pp-muted">Loading profile…</p></section>}

      {data && (
        <>
          <section className="pp-hero">
            <div className="pp-cover"><img src={mediaUrl(data.cover) || "/art/profile-cover.svg"} alt="" aria-hidden="true" /></div>
            <div className="pp-hero-body">
              <div className="pp-avatar" aria-hidden="true">{initialsOf(data.organization_name)}</div>
              <div className="pp-hero-text">
                <p className="pp-eyebrow">Organization profile</p>
                <h1>{data.organization_name}</h1>
                {data.tagline && <p className="pp-tagline">{data.tagline}</p>}
              </div>
              <div className="pp-hero-actions">
                {safeWebsite && <a className="pp-btn primary" href={safeWebsite} target="_blank" rel="noopener noreferrer"><Globe size={16} /> Visit website</a>}
                <button type="button" className="pp-btn" onClick={copyLink}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Link copied" : "Copy link"}</button>
                {data.is_owner && !editing && <button type="button" className="pp-btn" onClick={startEdit}><Pencil size={16} /> Edit profile</button>}
                {data.is_owner && !editing && (
                  <>
                    <button type="button" className="pp-btn" disabled={coverBusy} onClick={() => coverRef.current?.click()}><ImagePlus size={16} /> {coverBusy ? "Saving…" : "Change cover"}</button>
                    {data.cover && <button type="button" className="pp-btn" disabled={coverBusy} onClick={removeCover}><Trash2 size={16} /> Remove cover</button>}
                    <input ref={coverRef} type="file" accept={COVER_TYPES} hidden onChange={uploadCover} />
                  </>
                )}
              </div>
            </div>
          </section>

          {message.text && !editing && (
            <p className={`pp-banner ${message.type}`} role="status">{message.type === "ok" && <Check size={15} />} {message.text}</p>
          )}

          {!editing && (
            <div className="pp-grid">
              <article className="pp-card pp-about">
                <h2>About</h2>
                <p>{data.summary || "No summary yet."}</p>
              </article>

              <article className="pp-card">
                <h2>Highlights</h2>
                {data.highlights?.length > 0
                  ? <ul className="pp-highlights">{data.highlights.map((h, i) => <li key={i}><Check size={14} /> {h}</li>)}</ul>
                  : <p className="pp-muted">No highlights added.</p>}
              </article>

              <article className="pp-card">
                <h2>Details</h2>
                <dl className="pp-facts">
                  <div><dt>Cause</dt><dd>{CAUSE_NAMES[data.cause] || "—"}</dd></div>
                  <div><dt>Video style</dt><dd>{STYLE_NAMES[data.style] || "—"}</dd></div>
                  <div><dt>Website</dt><dd>{safeWebsite ? <a href={safeWebsite} target="_blank" rel="noopener noreferrer">{website.replace(/^https?:\/\//i, "")}</a> : "—"}</dd></div>
                </dl>
              </article>

              <article className="pp-card pp-share">
                <h2>Scan to open</h2>
                <div className="pp-qr"><QRCodeSVG value={shareUrl} size={128} level="M" includeMargin /></div>
                <p className="pp-muted">Scan this code, or share the link, to open this profile.</p>
              </article>
            </div>
          )}

          {editing && (
            <section className="pp-card pp-edit">
              <div className="pp-edit-head">
                <div>
                  <p className="pp-eyebrow">Edit profile</p>
                  <h2>Update your organization</h2>
                </div>
                <button type="button" className="pp-icon-btn" aria-label="Cancel" onClick={() => { setEditing(false); setMessage({ type: "", text: "" }); }}><X size={18} /></button>
              </div>
              <form className="pp-form" onSubmit={save}>
                <div className="pp-form-row">
                  <label className="pp-field"><span>Organization name</span>
                    <input required maxLength={100} value={form.organization_name} onChange={e => set("organization_name", e.target.value)} />
                  </label>
                  <label className="pp-field"><span>Tagline</span>
                    <input maxLength={150} value={form.tagline} onChange={e => set("tagline", e.target.value)} />
                  </label>
                </div>
                <label className="pp-field"><span>Summary</span>
                  <textarea required rows={4} maxLength={500} value={form.summary} onChange={e => set("summary", e.target.value)} />
                  <small>{form.summary.length}/500</small>
                </label>
                <label className="pp-field"><span>Highlights (one per line, up to 5)</span>
                  <textarea rows={4} value={form.highlightsText} onChange={e => set("highlightsText", e.target.value)} />
                </label>
                <label className="pp-field"><span>Website</span>
                  <input maxLength={300} placeholder="https://example.org" value={form.website_url} onChange={e => set("website_url", e.target.value)} />
                </label>
                {message.type === "error" && <p className="pp-alert" role="alert">{message.text}</p>}
                <div className="pp-hero-actions">
                  <button type="submit" className="pp-btn primary" disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save changes"}</button>
                  <button type="button" className="pp-btn" onClick={() => { setEditing(false); setMessage({ type: "", text: "" }); }}>Cancel</button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}


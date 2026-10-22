import React, { useEffect, useState } from "react";
import { ExternalLink, Film, Plus, UserRound } from "lucide-react";
import { API, mediaUrl } from "./api.js";

// Dashboard list of every organization profile the signed-in user has created.
export default function MyProfiles() {
  const [profiles, setProfiles] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${API}/my/profiles`)
      .then(async r => {
        const body = await r.json();
        if (!r.ok) throw Error(body.detail || "Could not load your profiles.");
        if (active) setProfiles(body.profiles);
      })
      .catch(e => { if (active) { setError(e.message); setProfiles([]); } });
    return () => { active = false; };
  }, []);

  return (
    <div className="pf-page">
      <header className="pf-topbar">
        <a href="#/studio" className="pf-brand"><span className="brand-mark"><img src="/logo.png" alt="" className="brand-logo-img" /></span>Advent Tech <span className="brand-sub">Studio</span></a>
        <a href="#/studio" className="btn primary-link"><Plus size={16} /> New video</a>
      </header>

      <section className="pf-card">
        <p className="eyebrow">Your dashboard</p>
        <h1>My profiles</h1>
        <p className="muted">Each video you generate creates an organization profile. Open a profile to edit it. The QR code on the video always points to the latest version.</p>

        {error && <p className="alert" role="alert">{error}</p>}
        {profiles === null && <p className="muted">Loading your profiles…</p>}
        {profiles && profiles.length === 0 && !error && (
          <div className="pf-empty">
            <UserRound size={28} />
            <p>No profiles yet. Generate your first video to create one.</p>
            <a href="#/studio" className="btn primary-link"><Plus size={16} /> Create a video</a>
          </div>
        )}
        {profiles && profiles.length > 0 && (
          <ul className="pf-list">
            {profiles.map(p => (
              <li key={p.public_id} className="pf-item">
                <div className="pf-item-main">
                  {p.cover
                    ? <img className="pf-thumb" src={mediaUrl(p.cover)} alt="" aria-hidden="true" />
                    : <span className="pf-thumb pf-thumb-empty" aria-hidden="true"><UserRound size={16} /></span>}
                  <div>
                    <strong>{p.organization_name}</strong>
                    {p.tagline && <span className="pf-item-tag">{p.tagline}</span>}
                  </div>
                </div>
                <a className="btn" href={`#/profile/${p.public_id}`}>Open and edit <ExternalLink size={14} /></a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

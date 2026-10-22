import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Profile from "./Profile.jsx";
import MyProfiles from "./MyProfiles.jsx";
import Account from "./Account.jsx";
import "./styles.css";

// Hash routes: #/studio (default), #/profiles (dashboard list), #/account (organisation details),
// #/profile/<id> (public profile, opened by the QR code).
function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function Root() {
  const path = useHash().replace(/^#/, "") || "/studio";
  if (path.startsWith("/profile/")) return <Profile id={decodeURIComponent(path.split("/")[2] || "")} />;
  if (path.startsWith("/profiles")) return <MyProfiles />;
  if (path.startsWith("/account")) return <Account />;
  return <App />;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><Root /></React.StrictMode>);

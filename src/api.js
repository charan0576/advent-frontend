// The API address is set at build time (VITE_API_BASE_URL). A trailing slash is removed so "//health" is never requested.
export const API = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

// A production build that still points at localhost means the Vercel setting is missing: say so in the console.
if (import.meta.env.PROD && /localhost|127\.0\.0\.1/.test(API)) {
  console.error("VITE_API_BASE_URL is not set for this build. Set it in Vercel to the Render API address and redeploy.");
}

// Image rules for covers, the same as the backend: PNG, JPG or WebP up to 5 MB.
export const COVER_TYPES = "image/png,image/jpeg,image/webp";
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export function coverProblem(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return "Use a PNG, JPG or WebP image.";
  if (file.size > COVER_MAX_BYTES) return "The image must be smaller than 5 MB.";
  return "";
}

// Covers from the API are absolute URLs for profiles (so a scanned QR code can load them).
export const mediaUrl = (path) => (!path ? "" : /^https?:\/\//.test(path) ? path : `${API}${path}`);

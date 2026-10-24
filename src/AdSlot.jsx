import React, { useEffect, useState } from "react";

export default function AdSlot({ apiBase }) {
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(apiBase + "/api/ads/serve?format=" + encodeURIComponent("Shivasha Social"), {
      headers: { Accept: "application/json" },
      cache: "no-store"
    }).then(async response => {
      if (response.status === 204) return null;
      if (!response.ok) throw new Error("Ad slot unavailable");
      const data = await response.json();
      return data?.ad || null;
    }).then(result => {
      if (alive) setAd(result);
    }).catch(() => {
      if (alive) setError(true);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [apiBase]);

  if (loading || error || !ad) return null;

  const openAd = async () => {
    if (!ad._id || !ad.destination) return;
    try {
      const response = await fetch(apiBase + "/api/ads/" + encodeURIComponent(ad._id) + "/click", {
        method: "POST",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("Ad link unavailable");
      const data = await response.json();
      const url = new URL(data.destination);
      if (url.protocol !== "https:") throw new Error("Unsafe destination");
      window.open(url.href, "_blank", "noopener,noreferrer");
    } catch {
      // Keep the feed usable if a campaign is paused or its destination is unavailable.
    }
  };

  return (
    <article className="shivasha-ad-slot" aria-label="Sponsored advertisement">
      <div className="shivasha-ad-top"><span>SHIVASHA AD NETWORK</span><span className="shivasha-ad-badge">Sponsored</span></div>
      <h3>{ad.name}</h3>
      <p>{ad.adText}</p>
      {ad.location && <small className="shivasha-ad-location">📍 {ad.location}</small>}
      {ad.destination && <button type="button" className="shivasha-ad-cta" onClick={openAd}>Learn more ↗</button>}
      <small className="shivasha-ad-disclosure">Ad selected from Shivasha-approved campaigns.</small>
    </article>
  );
}

import { useEffect } from "react";

export default function HeadMeta({
  title = "FlowGestio — Project Wizard",
  description = "From idea to PMI‑compliant project documentation in minutes.",
  canonical,
  robots, // "index,follow" | "noindex,nofollow"
  image = "/og-image.png", // ensure this exists in /public
  url,   // optional override for og:url/twitter:url
}) {
  useEffect(() => {
    // ---- Title ----
    const prevTitle = document.title;
    if (title) document.title = title;

    // ---- Description ----
    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute("content") || "";
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    if (description) metaDesc.setAttribute("content", description);

    // Resolve URL values
    const currentUrl =
      url ||
      (typeof window !== "undefined"
        ? window.location.origin + window.location.pathname
        : "");

    // ---- Canonical ----
    let linkCanon = document.querySelector('link[rel="canonical"]');
    const prevCanon = linkCanon?.getAttribute("href") || "";
    if (!linkCanon) {
      linkCanon = document.createElement("link");
      linkCanon.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanon);
    }
    linkCanon.setAttribute("href", canonical || currentUrl);

    // ---- Robots (optional) ----
    let metaRobots = document.querySelector('meta[name="robots"]');
    const prevRobots = metaRobots?.getAttribute("content") || "";
    if (robots) {
      if (!metaRobots) {
        metaRobots = document.createElement("meta");
        metaRobots.setAttribute("name", "robots");
        document.head.appendChild(metaRobots);
      }
      metaRobots.setAttribute("content", robots);
    }

    // Utility to create/find meta tags
    const ensure = (selector, makeEl) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = makeEl();
        document.head.appendChild(el);
      }
      return el;
    };

    // ---- Open Graph ----
    const ogTitle = ensure('meta[property="og:title"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:title");
      return m;
    });
    const ogDesc = ensure('meta[property="og:description"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:description");
      return m;
    });
    const ogImage = ensure('meta[property="og:image"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:image");
      return m;
    });
    const ogUrl = ensure('meta[property="og:url"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:url");
      return m;
    });
    const ogType = ensure('meta[property="og:type"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("property", "og:type");
      return m;
    });

    const prevOg = {
      title: ogTitle.getAttribute("content"),
      desc: ogDesc.getAttribute("content"),
      image: ogImage.getAttribute("content"),
      url: ogUrl.getAttribute("content"),
      type: ogType.getAttribute("content"),
    };

    ogTitle.setAttribute("content", title || "");
    ogDesc.setAttribute("content", description || "");
    ogImage.setAttribute("content", image || "");
    ogUrl.setAttribute("content", currentUrl || "");
    ogType.setAttribute("content", "website");

    // ---- Twitter ----
    const twCard = ensure('meta[name="twitter:card"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "twitter:card");
      return m;
    });
    const twTitle = ensure('meta[name="twitter:title"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "twitter:title");
      return m;
    });
    const twDesc = ensure('meta[name="twitter:description"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "twitter:description");
      return m;
    });
    const twImage = ensure('meta[name="twitter:image"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "twitter:image");
      return m;
    });
    const twUrl = ensure('meta[name="twitter:url"]', () => {
      const m = document.createElement("meta");
      m.setAttribute("name", "twitter:url");
      return m;
    });

    const prevTw = {
      card: twCard.getAttribute("content"),
      title: twTitle.getAttribute("content"),
      desc: twDesc.getAttribute("content"),
      image: twImage.getAttribute("content"),
      url: twUrl.getAttribute("content"),
    };

    twCard.setAttribute("content", "summary_large_image");
    twTitle.setAttribute("content", title || "");
    twDesc.setAttribute("content", description || "");
    twImage.setAttribute("content", image || "");
    twUrl.setAttribute("content", currentUrl || "");

    // ---- cleanup / restore previous values where applicable ----
    return () => {
      document.title = prevTitle;
      if (description) metaDesc?.setAttribute("content", prevDesc);
      if (robots) metaRobots?.setAttribute("content", prevRobots);
      if (prevCanon) linkCanon?.setAttribute("href", prevCanon);

      if (prevOg.title) ogTitle.setAttribute("content", prevOg.title);
      if (prevOg.desc) ogDesc.setAttribute("content", prevOg.desc);
      if (prevOg.image) ogImage.setAttribute("content", prevOg.image);
      if (prevOg.url) ogUrl.setAttribute("content", prevOg.url);
      if (prevOg.type) ogType.setAttribute("content", prevOg.type);

      if (prevTw.card) twCard.setAttribute("content", prevTw.card);
      if (prevTw.title) twTitle.setAttribute("content", prevTw.title);
      if (prevTw.desc) twDesc.setAttribute("content", prevTw.desc);
      if (prevTw.image) twImage.setAttribute("content", prevTw.image);
      if (prevTw.url) twUrl.setAttribute("content", prevTw.url);
    };
  }, [title, description, canonical, robots, image, url]);

  return null;
}

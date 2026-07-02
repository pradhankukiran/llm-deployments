"use client";

import { useEffect } from "react";

export default function BoostedJS() {
  useEffect(() => {
    try {
      // Load Boosted's JS client-side only
      // @ts-ignore
      import("boosted/dist/js/boosted.bundle.min.js");
    } catch (e) {
      console.error("Failed to load Boosted JS bundle:", e);
    }
  }, []);

  return null;
}

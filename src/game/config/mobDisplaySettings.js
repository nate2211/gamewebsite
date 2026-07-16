import { useEffect, useState } from "react";

export const MOB_DISPLAY_SETTINGS_EVENT = "voxel:mob-display-settings-changed";

const DEFAULTS = {
  showNames: true,
  showHealthBars: true,
  showHealthNumbers: true,
};

function readBoolean(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  return raw === "true";
}

export function readMobDisplaySettings() {
  if (typeof window === "undefined") return { ...DEFAULTS };
  return {
    showNames: readBoolean("voxel:showMobNames", DEFAULTS.showNames),
    showHealthBars: readBoolean("voxel:showMobHealthBars", DEFAULTS.showHealthBars),
    showHealthNumbers: readBoolean("voxel:showMobHealthNumbers", DEFAULTS.showHealthNumbers),
  };
}

export function saveMobDisplaySettings(settings) {
  localStorage.setItem("voxel:showMobNames", String(Boolean(settings.showNames)));
  localStorage.setItem("voxel:showMobHealthBars", String(Boolean(settings.showHealthBars)));
  localStorage.setItem("voxel:showMobHealthNumbers", String(Boolean(settings.showHealthNumbers)));
  window.dispatchEvent(new CustomEvent(MOB_DISPLAY_SETTINGS_EVENT));
}

export function useMobDisplaySettings() {
  const [settings, setSettings] = useState(readMobDisplaySettings);

  useEffect(() => {
    const refresh = () => setSettings(readMobDisplaySettings());
    window.addEventListener(MOB_DISPLAY_SETTINGS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(MOB_DISPLAY_SETTINGS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return settings;
}

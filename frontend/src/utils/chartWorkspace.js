const STORAGE_KEYS = {
  prefs: "papertrade-chart-prefs",
  layouts: "papertrade-chart-layouts",
  favorites: "papertrade-chart-favorites",
};

export const SESSION_MODE_EVENT = "papertrade:session-mode";

export const SESSION_MODE_OPTIONS = [
  {
    value: "LIVE",
    label: "Live Session",
    shortLabel: "Live",
    description: "Realtime feed with the full trading workspace active.",
  },
  {
    value: "REPLAY",
    label: "Replay Session",
    shortLabel: "Replay",
    description: "Pause the live stream and study price action candle by candle.",
  },
  {
    value: "FOCUS",
    label: "Focus Session",
    shortLabel: "Focus",
    description: "A distraction-light chart view for reading structure quickly.",
  },
];

export function normalizeSessionMode(mode) {
  return SESSION_MODE_OPTIONS.some((option) => option.value === mode)
    ? mode
    : "LIVE";
}

export function defaultChartPreferences() {
  return {
    selectedPair: "BTC/USDT",
    timeframe: "1H",
    visibleCandles: 40,
    showPriceLine: true,
    showHighLowGuide: true,
    sessionMode: "LIVE",
  };
}

export function loadChartPreferences() {
  if (typeof window === "undefined") {
    return defaultChartPreferences();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.prefs);
    const preferences = raw
      ? { ...defaultChartPreferences(), ...JSON.parse(raw) }
      : defaultChartPreferences();

    return {
      ...preferences,
      sessionMode: normalizeSessionMode(preferences.sessionMode),
    };
  } catch (error) {
    return defaultChartPreferences();
  }
}

export function persistChartPreferences(preferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(preferences));
}

export function loadChartLayouts() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.layouts);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

export function persistChartLayouts(layouts) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.layouts, JSON.stringify(layouts));
}

export function loadFavoritePairs() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.favorites);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

export function persistFavoritePairs(pairs) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(pairs));
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../layout/MainLayout";
import LoadingCard from "../components/LoadingCard";
import CandlestickChart from "../components/CandlestickChart";
import ChartWatchlistDrawer from "../components/ChartWatchlistDrawer";
import { apiRequest } from "../config/apiClient";
import { useAuth } from "../context/AuthContext";
import useLiveMarketFeed, {
  mergeLiveCandleIntoCandles,
} from "../hooks/useLiveMarketFeed";
import { formatCurrency, formatPercent } from "../utils/formatters";
import {
  loadChartLayouts,
  loadChartPreferences,
  loadFavoritePairs,
  normalizeSessionMode,
  persistChartLayouts,
  persistChartPreferences,
  persistFavoritePairs,
  SESSION_MODE_EVENT,
  SESSION_MODE_OPTIONS,
} from "../utils/chartWorkspace";

const TIMEFRAME_OPTIONS = ["15M", "1H", "4H", "1D"];
const PAIR_OPTIONS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"];
const BACKGROUND_RESYNC_INTERVAL_MS = 30000;
const REPLAY_SPEED_OPTIONS = [
  { label: "0.5x", value: 1600 },
  { label: "1x", value: 900 },
  { label: "2x", value: 450 },
];

export default function Charts() {
  const { token, isPremium, subscriptionTier } = useAuth();
  const initialPrefs = loadChartPreferences();
  const [selectedPair, setSelectedPair] = useState(initialPrefs.selectedPair);
  const [timeframe, setTimeframe] = useState(initialPrefs.timeframe);
  const [visibleCandles, setVisibleCandles] = useState(initialPrefs.visibleCandles);
  const [showPriceLine, setShowPriceLine] = useState(initialPrefs.showPriceLine);
  const [showHighLowGuide, setShowHighLowGuide] = useState(
    initialPrefs.showHighLowGuide
  );
  const [sessionMode, setSessionMode] = useState(
    normalizeSessionMode(initialPrefs.sessionMode)
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [watchlistError, setWatchlistError] = useState("");
  const [premiumNotice, setPremiumNotice] = useState("");
  const [savedLayouts, setSavedLayouts] = useState(() => loadChartLayouts());
  const [favoritePairs, setFavoritePairs] = useState(() => loadFavoritePairs());
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(REPLAY_SPEED_OPTIONS[1].value);

  const liveFeed = useLiveMarketFeed({
    pair: selectedPair,
    timeframe,
    disabled: replayMode,
  });
  const liveChartData = useMemo(() => {
    if (!data) {
      return null;
    }

    const nextCurrentPrice = liveFeed.livePrice ?? data.currentPrice;
    const nextCandles = mergeLiveCandleIntoCandles(
      data.candles || [],
      liveFeed.liveCandle,
      nextCurrentPrice
    );

    return {
      ...data,
      currentPrice: nextCurrentPrice,
      changePercent: liveFeed.changePercent ?? data.changePercent,
      source: liveFeed.source || data.source,
      asOf: liveFeed.lastUpdated || data.asOf,
      candles: nextCandles,
    };
  }, [data, liveFeed.changePercent, liveFeed.lastUpdated, liveFeed.liveCandle, liveFeed.livePrice, liveFeed.source]);
  const chartData = liveChartData || data;
  const candles = chartData?.candles || [];

  const applySessionMode = useCallback(
    (nextMode, options = {}) => {
      let normalizedMode = normalizeSessionMode(nextMode);
      const shouldBroadcast = options.broadcast !== false;

      if (normalizedMode === "REPLAY" && !isPremium) {
        normalizedMode = "LIVE";
        setPremiumNotice("Replay mode is available on Premium plans only.");
      } else if (options.clearNotice !== false) {
        setPremiumNotice("");
      }

      setSessionMode(normalizedMode);

      if (normalizedMode === "REPLAY") {
        setReplayMode(true);
        setReplayPlaying(false);
        setShowWatchlist(false);
        setShowPriceLine(true);
        setShowHighLowGuide(true);
        setReplayIndex(Math.min(24, Math.max(candles.length - 1, 0)));
      } else {
        setReplayMode(false);
        setReplayPlaying(false);

        if (normalizedMode === "FOCUS") {
          setShowWatchlist(false);
          setVisibleCandles(24);
          setShowPriceLine(true);
          setShowHighLowGuide(true);
        }
      }

      if (shouldBroadcast) {
        window.dispatchEvent(
          new CustomEvent(SESSION_MODE_EVENT, {
            detail: normalizedMode,
          })
        );
      }
    },
    [candles.length, isPremium]
  );

  useEffect(() => {
    let active = true;

    async function loadChartData(isBackgroundRefresh = false) {
      try {
        if (isBackgroundRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const nextData = await apiRequest(
          `/api/market/charts?pair=${encodeURIComponent(
            selectedPair
          )}&timeframe=${encodeURIComponent(timeframe)}`
        );

        if (!active) {
          return;
        }

        setData(nextData);
        setLastUpdated(new Date());
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError.message || "Failed to load data");
      } finally {
        if (!active) {
          return;
        }

        setLoading(false);
        setRefreshing(false);
      }
    }

    loadChartData();

    if (replayMode) {
      return () => {
        active = false;
      };
    }

    const intervalId = setInterval(() => {
      loadChartData(true);
    }, BACKGROUND_RESYNC_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [selectedPair, timeframe, replayMode]);

  useEffect(() => {
    persistChartPreferences({
      selectedPair,
      timeframe,
      visibleCandles,
      showPriceLine,
      showHighLowGuide,
      sessionMode,
    });
  }, [
    selectedPair,
    timeframe,
    visibleCandles,
    showPriceLine,
    showHighLowGuide,
    sessionMode,
  ]);

  useEffect(() => {
    function handleSessionModeChange(event) {
      applySessionMode(event?.detail, { broadcast: false });
    }

    window.addEventListener(SESSION_MODE_EVENT, handleSessionModeChange);

    return () => {
      window.removeEventListener(SESSION_MODE_EVENT, handleSessionModeChange);
    };
  }, [applySessionMode]);

  useEffect(() => {
    applySessionMode(sessionMode, { broadcast: false });
  }, [applySessionMode, sessionMode]);

  useEffect(() => {
    if (!showWatchlist || !token) {
      return;
    }

    let active = true;

    async function loadWatchlist() {
      try {
        setWatchlistLoading(true);
        setWatchlistError("");
        const nextItems = await apiRequest("/api/watchlist", { token });

        if (!active) {
          return;
        }

        setWatchlistItems(nextItems);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setWatchlistError(loadError.message || "Failed to load watchlist");
      } finally {
        if (active) {
          setWatchlistLoading(false);
        }
      }
    }

    loadWatchlist();

    return () => {
      active = false;
    };
  }, [showWatchlist, token]);

  useEffect(() => {
    if (!data?.candles?.length) {
      return;
    }

    setReplayIndex((current) => {
      const defaultStart = Math.min(24, data.candles.length - 1);

      if (!replayMode) {
        return data.candles.length - 1;
      }

      return Math.min(current || defaultStart, data.candles.length - 1);
    });
  }, [data, replayMode]);

  useEffect(() => {
    if (!replayMode || !replayPlaying || !data?.candles?.length) {
      return undefined;
    }

    if (replayIndex >= data.candles.length - 1) {
      setReplayPlaying(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setReplayIndex((current) => Math.min(current + 1, data.candles.length - 1));
    }, replaySpeed);

    return () => window.clearTimeout(timeoutId);
  }, [data, replayIndex, replayMode, replayPlaying, replaySpeed]);

  if (loading) {
    return (
      <MainLayout>
        <LoadingCard text="Loading chart data..." />
      </MainLayout>
    );
  }

  if (error && !data) {
    return (
      <MainLayout>
        <div className="card" style={{ color: "#fecaca" }}>
          {error}
        </div>
      </MainLayout>
    );
  }

  const displayedCandles = replayMode
    ? candles.slice(0, Math.max(replayIndex + 1, 1))
    : candles;
  const latestCandle = displayedCandles[displayedCandles.length - 1];
  const earliestCandle = displayedCandles[0];
  const candleClose = latestCandle?.close ?? chartData?.currentPrice ?? 0;
  const candleMove = latestCandle ? latestCandle.close - latestCandle.open : 0;
  const candleMovePercent = latestCandle?.open
    ? (candleMove / latestCandle.open) * 100
    : 0;
  const rangeMove = latestCandle && earliestCandle
    ? latestCandle.close - earliestCandle.open
    : 0;
  const rangeMovePercent = earliestCandle?.open
    ? (rangeMove / earliestCandle.open) * 100
    : 0;
  const priceSpread = latestCandle ? latestCandle.high - latestCandle.low : 0;
  const recentCandles = displayedCandles.slice(-12).reverse();
  const chartBias = candleMove >= 0 ? "Bullish structure" : "Pullback pressure";
  const chartBiasAccent = candleMove >= 0 ? "#6ee7b7" : "#fda4af";
  const isFavorite = favoritePairs.includes(selectedPair);
  const filteredFavoritePairs = favoritePairs.filter((pair) =>
    PAIR_OPTIONS.includes(pair)
  );
  const replayProgress = candles.length
    ? Math.round(((replayIndex + 1) / candles.length) * 100)
    : 0;
  const watchlistQuickItems = watchlistItems.filter(
    (item) => item.pair !== selectedPair
  );
  const activeSessionMode =
    SESSION_MODE_OPTIONS.find((option) => option.value === sessionMode) ||
    SESSION_MODE_OPTIONS[0];
  const streamConnected = liveFeed.status === "connected";
  const effectiveLastUpdated = liveFeed.lastUpdated
    ? new Date(liveFeed.lastUpdated)
    : lastUpdated;
  const feedStatusValue = replayMode
    ? `${replayProgress}% replayed`
    : streamConnected
      ? "Streaming live"
      : liveFeed.status === "reconnecting"
        ? "Reconnecting"
        : refreshing
          ? "Background resync"
          : "REST fallback";
  const feedStatusNote = replayMode
    ? "Replay ignores live auto-refresh"
    : effectiveLastUpdated
      ? `Updated ${effectiveLastUpdated.toLocaleTimeString()}`
      : liveFeed.status === "connecting"
        ? "Opening live market stream"
        : "Awaiting sync";
  const feedBadgeLabel = replayMode
    ? "Replay mode active"
    : streamConnected
      ? "Live stream connected"
      : liveFeed.status === "reconnecting"
        ? "Reconnecting live stream"
        : refreshing
          ? "Background resync"
          : "REST fallback active";
  const feedBadgeColor = replayMode
    ? "#fbbf24"
    : streamConnected
      ? "#14b8a6"
      : liveFeed.status === "reconnecting"
        ? "#f59e0b"
        : "#94a3b8";

  const openFullscreenChart = () => {
    const query = new URLSearchParams({
      pair: selectedPair,
      timeframe,
    });

    window.open(
      `/charts/window?${query.toString()}`,
      "papertrade-chart-window",
      "noopener,noreferrer,width=1440,height=900"
    );
  };

  const toggleFavoritePair = (pair) => {
    const nextFavorites = favoritePairs.includes(pair)
      ? favoritePairs.filter((item) => item !== pair)
      : [...favoritePairs, pair];

    setFavoritePairs(nextFavorites);
    persistFavoritePairs(nextFavorites);
  };

  const saveCurrentLayout = () => {
    const name = window.prompt("Name this chart layout");

    if (!name || !name.trim()) {
      return;
    }

    const nextLayouts = [
      {
        id: `${Date.now()}`,
        name: name.trim(),
        selectedPair,
        timeframe,
        visibleCandles,
        showPriceLine,
        showHighLowGuide,
        sessionMode,
      },
      ...savedLayouts,
    ].slice(0, 6);

    setSavedLayouts(nextLayouts);
    persistChartLayouts(nextLayouts);
  };

  const applyLayout = (layout) => {
    setSelectedPair(layout.selectedPair);
    setTimeframe(layout.timeframe);
    setVisibleCandles(layout.visibleCandles);
    setShowPriceLine(layout.showPriceLine);
    setShowHighLowGuide(layout.showHighLowGuide);
    applySessionMode(layout.sessionMode || (layout.replayMode ? "REPLAY" : "LIVE"));
  };

  const removeLayout = (layoutId) => {
    const nextLayouts = savedLayouts.filter((layout) => layout.id !== layoutId);
    setSavedLayouts(nextLayouts);
    persistChartLayouts(nextLayouts);
  };

  const toggleReplayMode = () => {
    if (!replayMode && !isPremium) {
      setPremiumNotice("Replay mode is available on Premium plans only.");
      return;
    }

    applySessionMode(replayMode ? "LIVE" : "REPLAY");
  };

  const handleReplaySlider = (event) => {
    setReplayPlaying(false);
    setReplayIndex(Number(event.target.value));
  };

  return (
    <MainLayout>
      <div
        className="card"
        style={{
          marginBottom: 18,
          padding: 24,
          background:
            "radial-gradient(circle at top left, rgba(20, 184, 166, 0.16), transparent 28%), linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(7, 12, 23, 0.98))",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 999,
            background: "rgba(8, 15, 28, 0.72)",
            border: "1px solid rgba(45, 212, 191, 0.18)",
            color: "#99f6e4",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: refreshing ? "#f59e0b" : "#14b8a6",
              boxShadow: refreshing
                ? "0 0 14px rgba(245, 158, 11, 0.78)"
                : "0 0 14px rgba(20, 184, 166, 0.78)",
            }}
          />
          Market pulse
        </div>

        <h1 className="page-title" style={{ maxWidth: 760 }}>
          Charts that feel alive, with stronger hierarchy and a more trader-like
          workspace.
        </h1>
        <p className="page-subtitle" style={{ maxWidth: 760, marginBottom: 0 }}>
          Follow {selectedPair} with live refresh, a stronger visual rhythm, and a
          cleaner reading flow from control bar to chart to candle tape.
        </p>

        {!isPremium ? (
          <div
            style={{
              marginTop: 18,
              maxWidth: 760,
              padding: "12px 14px",
              borderRadius: 16,
              border: "1px solid rgba(251, 191, 36, 0.24)",
              background: "rgba(120, 53, 15, 0.16)",
              color: "#fef3c7",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Current plan: {subscriptionTier}. Replay mode is locked to Premium,
            while live charting stays available on the Standard plan.
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
            marginTop: 22,
          }}
        >
          <div
            style={{
              padding: 20,
              borderRadius: 20,
              background: "rgba(8, 15, 28, 0.76)",
              border: "1px solid rgba(148, 163, 184, 0.12)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {chartData?.pair} Overview
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 12,
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  letterSpacing: "-0.05em",
                }}
              >
                {formatCurrency(candleClose, 4)}
              </div>
              <div
                style={{
                  marginBottom: 6,
                  padding: "8px 12px",
                  borderRadius: 999,
                  background:
                    candleMove >= 0
                      ? "rgba(20, 83, 45, 0.42)"
                      : "rgba(127, 29, 29, 0.34)",
                  color: candleMove >= 0 ? "#86efac" : "#fecdd3",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {formatPercent(candleMovePercent)}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginTop: 18,
              }}
            >
              <SignalCard
                label="Bias"
                value={chartBias}
                note={`Tracking ${timeframe} structure`}
                accent={chartBiasAccent}
              />
              <SignalCard
                label="Intracandle Spread"
                value={formatCurrency(priceSpread, 4)}
                note="High to low range"
                accent="#fbbf24"
              />
              <SignalCard
                label="Feed Status"
                value={feedStatusValue}
                note={feedStatusNote}
                accent="#7dd3fc"
              />
              <SignalCard
                label="Session Mode"
                value={activeSessionMode.shortLabel}
                note={activeSessionMode.description}
                accent="#c4b5fd"
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <HeroStat
              label="Source"
              value={chartData?.source || "Market feed"}
              note={
                streamConnected
                  ? "Direct Binance.US live stream"
                  : "REST load with live reconnect fallback"
              }
            />
            <HeroStat
              label="Latest Candle"
              value={latestCandle ? formatExactLabel(latestCandle.time, timeframe) : "--"}
              note={replayMode ? "Replay cursor candle" : `${timeframe} aligned`}
            />
            <HeroStat
              label="Window Move"
              value={formatPercent(rangeMovePercent)}
              note="First open to latest close"
            />
          </div>
        </div>
      </div>

      <div
        className="card"
        style={{
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
            Trading Pair
          </div>
          <select
            value={selectedPair}
            onChange={(event) => setSelectedPair(event.target.value)}
            style={controlStyle}
          >
            {PAIR_OPTIONS.map((pair) => (
              <option key={pair}>{pair}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 240, flex: 1 }}>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
            Timeframe
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TIMEFRAME_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setTimeframe(option)}
                style={{
                  ...timeframeButtonStyle,
                  borderColor:
                    timeframe === option
                      ? "rgba(45, 212, 191, 0.62)"
                      : "rgba(148, 163, 184, 0.18)",
                  background:
                    timeframe === option
                      ? "linear-gradient(135deg, rgba(20, 184, 166, 0.26), rgba(14, 116, 144, 0.3))"
                      : "rgba(8, 15, 28, 0.7)",
                  color: timeframe === option ? "#ecfeff" : "#cbd5e1",
                  boxShadow:
                    timeframe === option
                      ? "0 12px 28px rgba(15, 118, 110, 0.22)"
                      : "none",
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SESSION_MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => applySessionMode(option.value)}
              disabled={option.value === "REPLAY" && !isPremium}
              style={tagButtonStyle(
                option.value === sessionMode ? "#ecfeff" : "#cbd5e1",
                option.value === sessionMode,
                option.value === "REPLAY" && !isPremium
              )}
            >
              {option.shortLabel}
              {option.value === "REPLAY" && !isPremium ? " Lock" : ""}
            </button>
          ))}
          <button
            type="button"
            onClick={() => toggleFavoritePair(selectedPair)}
            style={pillButtonStyle(isFavorite ? "#fbbf24" : "#7dd3fc")}
          >
            {isFavorite ? "Starred Pair" : "Add Favorite"}
          </button>
          <button type="button" onClick={saveCurrentLayout} style={pillButtonStyle()}>
            Save Layout
          </button>
          <button
            type="button"
            onClick={() => setShowWatchlist((current) => !current)}
            style={pillButtonStyle(showWatchlist ? "#34d399" : "#cbd5e1")}
          >
            {showWatchlist ? "Hide Watchlist" : "Open Watchlist"}
          </button>
          <button
            type="button"
            onClick={toggleReplayMode}
            style={pillButtonStyle(replayMode ? "#fbbf24" : "#cbd5e1")}
          >
            {replayMode ? "Exit Replay" : "Start Replay"}
          </button>
          <button
            type="button"
            onClick={openFullscreenChart}
            style={fullscreenButtonStyle}
          >
            Open Full Screen View
          </button>
        </div>
      </div>

      {filteredFavoritePairs.length ? (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2>Favorite Pairs</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            {filteredFavoritePairs.map((pair) => (
              <button
                key={pair}
                type="button"
                onClick={() => setSelectedPair(pair)}
                style={{
                  ...tagButtonStyle(),
                  borderColor:
                    pair === selectedPair
                      ? "rgba(45, 212, 191, 0.44)"
                      : "rgba(148, 163, 184, 0.18)",
                  color: pair === selectedPair ? "#ecfeff" : "#cbd5e1",
                }}
              >
                {pair}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: showWatchlist
            ? "minmax(0, 1fr) minmax(300px, 360px)"
            : "minmax(0, 1fr)",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "grid", gap: 16 }}>
          {savedLayouts.length ? (
            <div className="card">
              <h2>Saved Layouts</h2>
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {savedLayouts.map((layout) => (
                  <div key={layout.id} style={savedLayoutRowStyle}>
                    <button
                      type="button"
                      onClick={() => applyLayout(layout)}
                      style={savedLayoutButtonStyle}
                    >
                      <strong>{layout.name}</strong>
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>
                        {layout.selectedPair} - {layout.timeframe}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLayout(layout.id)}
                      style={savedLayoutDeleteStyle}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {replayMode ? (
            <div className="card">
              <h2>Replay Controls</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginTop: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                    Playback
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setReplayPlaying((current) => !current)}
                      style={pillButtonStyle(replayPlaying ? "#34d399" : "#cbd5e1")}
                    >
                      {replayPlaying ? "Pause" : "Play"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReplayPlaying(false);
                        setReplayIndex(Math.min(24, Math.max(candles.length - 1, 0)));
                      }}
                      style={pillButtonStyle()}
                    >
                      Restart
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                    Speed
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {REPLAY_SPEED_OPTIONS.map((speedOption) => (
                      <button
                        key={speedOption.value}
                        type="button"
                        onClick={() => setReplaySpeed(speedOption.value)}
                        style={{
                          ...tagButtonStyle(),
                          borderColor:
                            replaySpeed === speedOption.value
                              ? "rgba(251, 191, 36, 0.42)"
                              : "rgba(148, 163, 184, 0.18)",
                          color:
                            replaySpeed === speedOption.value
                              ? "#fef3c7"
                              : "#cbd5e1",
                        }}
                      >
                        {speedOption.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                    Replay Cursor
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(candles.length - 1, 0)}
                    value={Math.min(replayIndex, Math.max(candles.length - 1, 0))}
                    onChange={handleReplaySlider}
                    style={{ width: "100%" }}
                  />
                  <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                    Candle {Math.min(replayIndex + 1, candles.length)} of {candles.length}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <MetricCard
              label={`${timeframe} Last Close`}
              value={formatCurrency(candleClose, 4)}
              accent={candleMove >= 0 ? "#6ee7b7" : "#fda4af"}
              note={
                latestCandle
                  ? `Candle time ${formatExactLabel(latestCandle.time, timeframe)}`
                  : ""
              }
            />
            <MetricCard
              label={`${timeframe} Candle Move`}
              value={formatPercent(candleMovePercent)}
              accent={candleMove >= 0 ? "#86efac" : "#fda4af"}
              note={
                latestCandle
                  ? `${formatCurrency(latestCandle.open, 4)} open to ${formatCurrency(
                      latestCandle.close,
                      4
                    )} close`
                  : ""
              }
            />
            <MetricCard
              label={`${timeframe} Range Move`}
              value={formatPercent(rangeMovePercent)}
              accent={rangeMove >= 0 ? "#7dd3fc" : "#fda4af"}
              note={
                earliestCandle && latestCandle
                  ? `${formatExactLabel(earliestCandle.time, timeframe)} to ${formatExactLabel(
                      latestCandle.time,
                      timeframe
                    )}`
                  : ""
              }
            />
            <MetricCard
              label="Live Feed"
              value={
                replayMode
                  ? `Frame ${Math.min(replayIndex + 1, candles.length)}`
                  : chartData?.currentPrice !== null &&
                      chartData?.currentPrice !== undefined
                    ? formatCurrency(chartData.currentPrice, 4)
                    : "Awaiting feed"
              }
              note={
                replayMode
                  ? "Live feed paused while replay mode is active"
                  : feedStatusNote
              }
              accent={replayMode ? "#fbbf24" : "#7dd3fc"}
            />
          </div>
        </div>

        {showWatchlist ? (
          <ChartWatchlistDrawer
            items={watchlistQuickItems}
            loading={watchlistLoading}
            error={watchlistError}
            selectedPair={selectedPair}
            favoritePairs={favoritePairs}
            onSelectPair={(pair) => {
              setSelectedPair(pair);
              setShowWatchlist(false);
            }}
            onToggleFavorite={toggleFavoritePair}
          />
        ) : null}
      </div>

      {error ? (
        <div
          className="card"
          style={{
            marginBottom: 18,
            color: "#fecaca",
            borderColor: "#7f1d1d",
          }}
        >
          {error}
        </div>
      ) : null}

      {premiumNotice ? (
        <div
          data-cy="charts-replay-lock-notice"
          className="card"
          style={{
            marginBottom: 18,
            color: "#fef3c7",
            borderColor: "rgba(251, 191, 36, 0.28)",
            background: "rgba(120, 53, 15, 0.14)",
          }}
        >
          {premiumNotice}
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {chartData?.pair} {timeframe} candles
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
              {formatCurrency(candleClose, 4)}
            </div>
            <div
              style={{
                fontSize: 13,
                color: candleMove >= 0 ? "#4ade80" : "#fda4af",
                marginTop: 8,
              }}
            >
              {formatPercent(candleMovePercent)} this candle
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                borderRadius: 999,
                background: "rgba(8, 15, 28, 0.82)",
                border: "1px solid rgba(45, 212, 191, 0.22)",
                color: "#ccfbf1",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: feedBadgeColor,
                  boxShadow: `0 0 12px ${feedBadgeColor}`,
                }}
              />
              {feedBadgeLabel}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>
              Feed source: {chartData?.source}
            </div>
            {latestCandle ? (
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                Latest candle: {formatExactLabel(latestCandle.time, timeframe)}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {[24, 40, 60].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setVisibleCandles(count)}
              style={{
                ...tagButtonStyle(),
                borderColor:
                  visibleCandles === count
                    ? "rgba(45, 212, 191, 0.44)"
                    : "rgba(148, 163, 184, 0.18)",
                color: visibleCandles === count ? "#ecfeff" : "#cbd5e1",
              }}
            >
              {count} candles
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowPriceLine((current) => !current)}
            style={tagButtonStyle(showPriceLine ? "#7dd3fc" : "#cbd5e1")}
          >
            {showPriceLine ? "Hide Price Line" : "Show Price Line"}
          </button>
          <button
            type="button"
            onClick={() => setShowHighLowGuide((current) => !current)}
            style={tagButtonStyle(showHighLowGuide ? "#fbbf24" : "#cbd5e1")}
          >
            {showHighLowGuide ? "Hide High / Low" : "Show High / Low"}
          </button>
        </div>

        <CandlestickChart
          candles={displayedCandles}
          timeframe={timeframe}
          visibleCandles={visibleCandles}
          showPriceLine={showPriceLine}
          showHighLowGuide={showHighLowGuide}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <div className="card">
          <h2>{replayMode ? "Replay Tape" : "Recent Candles"}</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Open</th>
                  <th>High</th>
                  <th>Low</th>
                  <th>Close</th>
                  <th>Volume</th>
                  <th>Move</th>
                </tr>
              </thead>
              <tbody>
                {recentCandles.map((candle) => {
                  const move = candle.close - candle.open;
                  const movePercent = candle.open ? (move / candle.open) * 100 : 0;

                  return (
                    <tr key={candle.time}>
                      <td>{formatExactLabel(candle.time, timeframe)}</td>
                      <td>{formatCurrency(candle.open, 4)}</td>
                      <td>{formatCurrency(candle.high, 4)}</td>
                      <td>{formatCurrency(candle.low, 4)}</td>
                      <td>{formatCurrency(candle.close, 4)}</td>
                      <td>{candle.volume}</td>
                      <td className={move >= 0 ? "text-green" : "text-red"}>
                        {formatPercent(movePercent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>{replayMode ? "Replay Notes" : "Reading Notes"}</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <InsightRow
              title="Current candle"
              value={`${formatPercent(candleMovePercent)} move`}
              note="Useful for spotting acceleration or hesitation in the active interval."
            />
            <InsightRow
              title="Window trend"
              value={formatPercent(rangeMovePercent)}
              note="Compares the first visible open to the latest visible close."
            />
            <InsightRow
              title="Volatility pocket"
              value={formatCurrency(priceSpread, 4)}
              note="Measures the latest candle's high-to-low spread."
            />
            <InsightRow
              title="Workspace mode"
              value={activeSessionMode.label}
              note={
                replayMode
                  ? "Use replay to study structure candle by candle at your own pace."
                  : sessionMode === "FOCUS"
                    ? "Focus mode keeps the chart clean and trims distractions."
                    : "Realtime mode keeps the chart synced with the feed."
              }
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function MetricCard({ label, value, note, accent }) {
  return (
    <div
      className="card"
      style={{
        padding: 16,
        background:
          "linear-gradient(180deg, rgba(17, 24, 39, 0.82), rgba(7, 10, 18, 0.96))",
      }}
    >
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent || "#f9fafb" }}>
        {value}
      </div>
      {note ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>{note}</div>
      ) : null}
    </div>
  );
}

function HeroStat({ label, value, note }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        background: "rgba(8, 15, 28, 0.78)",
        border: "1px solid rgba(148, 163, 184, 0.12)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{note}</div>
    </div>
  );
}

function SignalCard({ label, value, note, accent }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background: "rgba(15, 23, 42, 0.8)",
        border: "1px solid rgba(148, 163, 184, 0.12)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: accent || "#f9fafb",
          marginTop: 8,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{note}</div>
    </div>
  );
}

function InsightRow({ title, value, note }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        background: "rgba(8, 15, 28, 0.66)",
        border: "1px solid rgba(148, 163, 184, 0.1)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#99f6e4" }}>{value}</div>
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.6 }}>
        {note}
      </div>
    </div>
  );
}

function formatExactLabel(time, timeframe) {
  const date = new Date(time);

  if (timeframe === "1D") {
    return date.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pillButtonStyle(color = "#cbd5e1") {
  return {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(148, 163, 184, 0.18)",
    background: "rgba(8, 15, 28, 0.75)",
    color,
    cursor: "pointer",
    fontWeight: 700,
  };
}

const savedLayoutRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
  alignItems: "center",
};

const savedLayoutButtonStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.12)",
  background: "rgba(8, 15, 28, 0.68)",
  color: "#f8fafc",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 4,
};

const savedLayoutDeleteStyle = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(248, 113, 113, 0.28)",
  background: "rgba(127, 29, 29, 0.12)",
  color: "#fecaca",
  cursor: "pointer",
};

function tagButtonStyle(color = "#cbd5e1", isActive = false, isLocked = false) {
  return {
    padding: "9px 12px",
    borderRadius: 999,
    border: isActive
      ? "1px solid rgba(45, 212, 191, 0.44)"
      : "1px solid rgba(148, 163, 184, 0.18)",
    background: isActive
      ? "linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(8, 145, 178, 0.18))"
      : "rgba(8, 15, 28, 0.72)",
    color,
    cursor: isLocked ? "not-allowed" : "pointer",
    fontWeight: 700,
    fontSize: 12,
    opacity: isLocked ? 0.55 : 1,
  };
}

const controlStyle = {
  minWidth: 160,
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.14)",
  background: "rgba(8, 15, 28, 0.82)",
  color: "#f9fafb",
};

const fullscreenButtonStyle = {
  padding: "12px 16px",
  borderRadius: 14,
  border: "1px solid rgba(45, 212, 191, 0.44)",
  background:
    "linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(8, 145, 178, 0.18))",
  color: "#ecfeff",
  cursor: "pointer",
  fontWeight: 700,
};

const timeframeButtonStyle = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid transparent",
  fontSize: 12,
  cursor: "pointer",
  fontWeight: 700,
};

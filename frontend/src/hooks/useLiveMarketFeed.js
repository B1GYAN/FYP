import { useEffect, useState } from "react";

const STREAM_BASE_URL = "wss://stream.binance.us:9443/stream?streams=";
const RECONNECT_DELAY_MS = 1500;
const SUPPORTED_REALTIME_QUOTES = new Set(["USDT"]);

const INITIAL_STATE = {
  status: "idle",
  livePrice: null,
  changePercent: null,
  lastUpdated: null,
  source: null,
  liveCandle: null,
};

function parsePair(pair) {
  const [symbol, quote = "USDT"] = String(pair || "")
    .toUpperCase()
    .split("/");

  return { symbol, quote };
}

function toStreamSymbol(pair) {
  const { symbol, quote } = parsePair(pair);

  if (!symbol || !SUPPORTED_REALTIME_QUOTES.has(quote)) {
    return null;
  }

  return `${symbol}${quote}`.toLowerCase();
}

function mapTimeframeToStreamInterval(timeframe) {
  const intervals = {
    "15M": "15m",
    "1H": "1h",
    "4H": "4h",
    "1D": "1d",
  };

  return intervals[timeframe] || null;
}

function toIsoTimestamp(epochMs) {
  return Number.isFinite(epochMs)
    ? new Date(epochMs).toISOString()
    : new Date().toISOString();
}

function normalizeTickerEvent(payload) {
  const data = payload?.data || payload;
  const price = Number(data?.c);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return {
    price,
    changePercent: Number(data?.P),
    lastUpdated: toIsoTimestamp(Number(data?.E)),
    source: "binance-us-stream",
  };
}

function normalizeKlineEvent(payload) {
  const envelope = payload?.data || payload;
  const kline = envelope?.k || envelope;
  const open = Number(kline?.o);
  const high = Number(kline?.h);
  const low = Number(kline?.l);
  const close = Number(kline?.c);
  const volume = Number(kline?.v);

  if (![open, high, low, close].every(Number.isFinite)) {
    return null;
  }

  return {
    time: toIsoTimestamp(Number(kline?.t)),
    open,
    high,
    low,
    close,
    volume: Number.isFinite(volume) ? volume : 0,
    isClosed: Boolean(kline?.x),
    lastUpdated: toIsoTimestamp(Number(envelope?.E)),
    source: "binance-us-stream",
  };
}

export function mergeLiveCandleIntoCandles(candles, liveCandle, livePrice = null) {
  if (!Array.isArray(candles) || candles.length === 0) {
    return candles;
  }

  const latestPrice = Number(livePrice);
  const lastIndex = candles.length - 1;
  const lastCandle = candles[lastIndex];

  if (liveCandle?.time) {
    const nextCandle = {
      ...lastCandle,
      ...liveCandle,
      close: Number.isFinite(latestPrice) && latestPrice > 0 ? latestPrice : liveCandle.close,
      high:
        Number.isFinite(latestPrice) && latestPrice > 0
          ? Math.max(liveCandle.high, latestPrice)
          : liveCandle.high,
      low:
        Number.isFinite(latestPrice) && latestPrice > 0
          ? Math.min(liveCandle.low, latestPrice)
          : liveCandle.low,
    };

    const currentTime = new Date(nextCandle.time).getTime();
    const lastTime = new Date(lastCandle.time).getTime();

    if (!Number.isFinite(currentTime) || !Number.isFinite(lastTime)) {
      return candles;
    }

    if (currentTime === lastTime) {
      return [...candles.slice(0, lastIndex), nextCandle];
    }

    if (currentTime > lastTime) {
      return [...candles, nextCandle];
    }
  }

  if (!Number.isFinite(latestPrice) || latestPrice <= 0) {
    return candles;
  }

  return [
    ...candles.slice(0, lastIndex),
    {
      ...lastCandle,
      close: latestPrice,
      high: Math.max(Number(lastCandle.high), latestPrice),
      low: Math.min(Number(lastCandle.low), latestPrice),
    },
  ];
}

export default function useLiveMarketFeed({ pair, timeframe, disabled = false }) {
  const [state, setState] = useState(INITIAL_STATE);

  useEffect(() => {
    if (disabled) {
      setState(INITIAL_STATE);
      return undefined;
    }

    if (typeof window === "undefined" || typeof window.WebSocket !== "function") {
      setState({
        ...INITIAL_STATE,
        status: "unsupported",
      });
      return undefined;
    }

    const streamSymbol = toStreamSymbol(pair);
    if (!streamSymbol) {
      setState({
        ...INITIAL_STATE,
        status: "unsupported",
      });
      return undefined;
    }

    const interval = mapTimeframeToStreamInterval(timeframe);
    const streams = [`${streamSymbol}@ticker`];

    if (interval) {
      streams.push(`${streamSymbol}@kline_${interval}`);
    }

    let reconnectTimeoutId = null;
    let socket = null;
    let closedByEffect = false;

    setState(INITIAL_STATE);

    const connect = () => {
      if (closedByEffect) {
        return;
      }

      setState((current) => ({
        ...current,
        status: current.status === "reconnecting" ? "reconnecting" : "connecting",
      }));

      socket = new window.WebSocket(`${STREAM_BASE_URL}${streams.join("/")}`);

      socket.onopen = () => {
        if (closedByEffect) {
          return;
        }

        setState((current) => ({
          ...current,
          status: "connected",
        }));
      };

      socket.onmessage = (event) => {
        if (closedByEffect) {
          return;
        }

        try {
          const payload = JSON.parse(event.data);
          const streamName = String(payload?.stream || "");

          if (streamName.includes("@ticker")) {
            const ticker = normalizeTickerEvent(payload);

            if (!ticker) {
              return;
            }

            setState((current) => ({
              ...current,
              status: "connected",
              livePrice: ticker.price,
              changePercent: Number.isFinite(ticker.changePercent)
                ? ticker.changePercent
                : current.changePercent,
              lastUpdated: ticker.lastUpdated,
              source: ticker.source,
            }));

            return;
          }

          if (streamName.includes("@kline_")) {
            const candle = normalizeKlineEvent(payload);

            if (!candle) {
              return;
            }

            setState((current) => ({
              ...current,
              status: "connected",
              liveCandle: candle,
              livePrice: candle.close,
              lastUpdated: candle.lastUpdated,
              source: candle.source,
            }));
          }
        } catch (error) {
          setState((current) => ({
            ...current,
            status: current.status === "connected" ? "connected" : "error",
          }));
        }
      };

      socket.onerror = () => {
        if (closedByEffect) {
          return;
        }

        setState((current) => ({
          ...current,
          status: current.status === "connected" ? "reconnecting" : "error",
        }));
      };

      socket.onclose = () => {
        if (closedByEffect) {
          return;
        }

        setState((current) => ({
          ...current,
          status: "reconnecting",
        }));

        reconnectTimeoutId = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      closedByEffect = true;

      if (reconnectTimeoutId) {
        window.clearTimeout(reconnectTimeoutId);
      }

      if (socket && socket.readyState <= window.WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [disabled, pair, timeframe]);

  return state;
}

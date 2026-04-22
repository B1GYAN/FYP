const dns = require("dns");
const https = require("https");

const DEFAULT_TIMEOUT_MS = 5000;
const DNS_CACHE_TTL_MS = 60000;
const DEFAULT_HEADERS = {
  Accept: "application/json",
  "User-Agent": "PaperTrade-MarketClient/1.0",
};
const DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];
const resolver = new dns.Resolver();
const dnsCache = new Map();

resolver.setServers(DNS_SERVERS);

function getCachedAddress(hostname) {
  const cached = dnsCache.get(hostname);

  if (!cached || cached.expiresAt < Date.now()) {
    dnsCache.delete(hostname);
    return null;
  }

  return cached;
}

function cacheAddress(hostname, address, family) {
  dnsCache.set(hostname, {
    address,
    family,
    expiresAt: Date.now() + DNS_CACHE_TTL_MS,
  });
}

function resolveHostname(hostname) {
  const cached = getCachedAddress(hostname);

  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    resolver.resolve4(hostname, (ipv4Error, ipv4Addresses) => {
      if (!ipv4Error && Array.isArray(ipv4Addresses) && ipv4Addresses[0]) {
        const result = { address: ipv4Addresses[0], family: 4 };
        cacheAddress(hostname, result.address, result.family);
        resolve(result);
        return;
      }

      resolver.resolve6(hostname, (ipv6Error, ipv6Addresses) => {
        if (!ipv6Error && Array.isArray(ipv6Addresses) && ipv6Addresses[0]) {
          const result = { address: ipv6Addresses[0], family: 6 };
          cacheAddress(hostname, result.address, result.family);
          resolve(result);
          return;
        }

        dns.lookup(hostname, (lookupError, address, family) => {
          if (lookupError) {
            reject(lookupError);
            return;
          }

          const result = { address, family };
          cacheAddress(hostname, result.address, result.family);
          resolve(result);
        });
      });
    });
  });
}

function getJson(url, options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers = {},
  } = options;

  return new Promise((resolve, reject) => {
    let request = null;

    async function execute() {
      const requestUrl = new URL(url);
      const resolvedHost = await resolveHostname(requestUrl.hostname);

      request = https.get(
        requestUrl,
        {
          headers: {
            ...DEFAULT_HEADERS,
            ...headers,
          },
          lookup(hostname, lookupOptions, callback) {
            const normalizedOptions =
              typeof lookupOptions === "function" || lookupOptions == null
                ? {}
                : lookupOptions;
            const normalizedCallback =
              typeof lookupOptions === "function" ? lookupOptions : callback;

            if (hostname === requestUrl.hostname) {
              if (normalizedOptions.all) {
                normalizedCallback(null, [
                  {
                    address: resolvedHost.address,
                    family: resolvedHost.family,
                  },
                ]);
                return;
              }

              normalizedCallback(null, resolvedHost.address, resolvedHost.family);
              return;
            }

            if (typeof lookupOptions === "function" || lookupOptions == null) {
              dns.lookup(hostname, normalizedCallback);
              return;
            }

            dns.lookup(hostname, normalizedOptions, normalizedCallback);
          },
        },
        (response) => {
          let data = "";

          response.on("data", (chunk) => {
            data += chunk;
          });

          response.on("end", () => {
            if (response.statusCode < 200 || response.statusCode >= 300) {
              reject(new Error(`Request failed with status ${response.statusCode}`));
              return;
            }

            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(error);
            }
          });
        }
      );

      request.setTimeout(timeoutMs, () => {
        request.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      });

      request.on("error", reject);
    }

    execute().catch(reject);
  });
}

module.exports = {
  getJson,
};

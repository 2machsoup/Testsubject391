import { useEffect, useState } from "react";
import {
  clearLocalPosData,
  connectShopifyWithToken,
  disconnectPlatform,
  fetchConnections,
  importLocalPosCsv,
  startOAuth,
  startShopifyOAuth,
} from "../api/client";
import type { ConnectionStatus } from "../types";
import { ConnectionCard } from "../components/ConnectionCard";
import "./Settings.css";

function useOAuthRedirectBanner() {
  const params = new URLSearchParams(window.location.search);
  const connected = params.get("connected");
  const status = params.get("status");
  const message = params.get("message");

  useEffect(() => {
    if (connected) {
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!connected || !status) return null;
  return { connected, status, message };
}

export function Settings() {
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [shopDomain, setShopDomain] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");
  const [shopifyTokenError, setShopifyTokenError] = useState<string | null>(null);
  const [shopifyConnecting, setShopifyConnecting] = useState(false);
  const [showShopifyOAuth, setShowShopifyOAuth] = useState(false);
  const [csvSummary, setCsvSummary] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const banner = useOAuthRedirectBanner();

  function loadConnections() {
    fetchConnections()
      .then((res) => setConnections(res.connections))
      .catch(() => setConnections([]));
  }

  useEffect(() => {
    loadConnections();
  }, []);

  const byPlatform = Object.fromEntries(connections.map((c) => [c.platform, c]));

  async function handleDisconnect(platform: "etsy" | "square" | "shopify") {
    await disconnectPlatform(platform);
    loadConnections();
  }

  async function handleCsvUpload(file: File) {
    setCsvError(null);
    try {
      const result = await importLocalPosCsv(file);
      setCsvSummary(`Imported ${result.imported} rows (${result.skipped} skipped).`);
      loadConnections();
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Import failed");
    }
  }

  async function handleClearLocalPos() {
    await clearLocalPosData();
    setCsvSummary(null);
    loadConnections();
  }

  async function handleShopifyTokenConnect() {
    setShopifyTokenError(null);
    setShopifyConnecting(true);
    try {
      await connectShopifyWithToken(shopDomain, shopifyToken);
      setShopifyToken("");
      loadConnections();
    } catch (err) {
      setShopifyTokenError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setShopifyConnecting(false);
    }
  }

  return (
    <div className="settings">
      <h1 style={{ fontSize: 20, margin: 0 }}>Connections</h1>

      {banner && (
        <p className={`settings__banner settings__banner--${banner.status}`}>
          {banner.status === "success"
            ? `${banner.connected} connected successfully.`
            : `Failed to connect ${banner.connected}: ${banner.message ?? "unknown error"}`}
        </p>
      )}

      <div className="settings__grid">
        <ConnectionCard
          title="Etsy"
          connected={byPlatform.etsy?.connected ?? false}
          detail={byPlatform.etsy?.detail}
        >
          {byPlatform.etsy?.connected ? (
            <button className="connection-card__button" onClick={() => handleDisconnect("etsy")}>
              Disconnect
            </button>
          ) : (
            <button
              className="connection-card__button connection-card__button--primary"
              onClick={() => startOAuth("etsy")}
            >
              Connect
            </button>
          )}
        </ConnectionCard>

        <ConnectionCard
          title="Square"
          connected={byPlatform.square?.connected ?? false}
          detail={byPlatform.square?.detail}
        >
          {byPlatform.square?.connected ? (
            <button className="connection-card__button" onClick={() => handleDisconnect("square")}>
              Disconnect
            </button>
          ) : (
            <button
              className="connection-card__button connection-card__button--primary"
              onClick={() => startOAuth("square")}
            >
              Connect
            </button>
          )}
        </ConnectionCard>

        <ConnectionCard
          title="Shopify"
          connected={byPlatform.shopify?.connected ?? false}
          detail={byPlatform.shopify?.detail}
        >
          {byPlatform.shopify?.connected ? (
            <button className="connection-card__button" onClick={() => handleDisconnect("shopify")}>
              Disconnect
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              <input
                className="connection-card__input"
                placeholder="your-store.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
              />
              {!showShopifyOAuth ? (
                <>
                  <input
                    className="connection-card__input"
                    placeholder="Admin API access token (shpat_...)"
                    type="password"
                    value={shopifyToken}
                    onChange={(e) => setShopifyToken(e.target.value)}
                  />
                  <button
                    className="connection-card__button connection-card__button--primary"
                    disabled={!shopDomain || !shopifyToken || shopifyConnecting}
                    onClick={handleShopifyTokenConnect}
                  >
                    {shopifyConnecting ? "Connecting…" : "Connect"}
                  </button>
                  {shopifyTokenError && (
                    <p className="settings__banner settings__banner--error" style={{ margin: 0 }}>
                      {shopifyTokenError}
                    </p>
                  )}
                  <button
                    className="connection-card__button"
                    style={{ fontSize: 12 }}
                    onClick={() => setShowShopifyOAuth(true)}
                  >
                    Use OAuth instead (public/partner app)
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="connection-card__button connection-card__button--primary"
                    disabled={!shopDomain}
                    onClick={() => startShopifyOAuth(shopDomain)}
                  >
                    Connect via OAuth
                  </button>
                  <button
                    className="connection-card__button"
                    style={{ fontSize: 12 }}
                    onClick={() => setShowShopifyOAuth(false)}
                  >
                    Use access token instead
                  </button>
                </>
              )}
            </div>
          )}
        </ConnectionCard>

        <ConnectionCard
          title="Local POS"
          connected={byPlatform.localPos?.connected ?? false}
          detail={byPlatform.localPos?.detail}
        >
          <label className="connection-card__button connection-card__button--primary">
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleCsvUpload(file);
                e.target.value = "";
              }}
            />
          </label>
          {byPlatform.localPos?.connected && (
            <button className="connection-card__button" onClick={handleClearLocalPos}>
              Clear data
            </button>
          )}
        </ConnectionCard>
      </div>

      {csvSummary && <p className="settings__csv-summary">{csvSummary}</p>}
      {csvError && <p className="settings__banner settings__banner--error">{csvError}</p>}

      <p className="settings__csv-summary">
        The Local POS CSV importer expects columns named Date, Order, Total, Fees, Items, Customer, and
        Currency by default (plus optional SKU, Item, Quantity, and Unit Price columns for SKU-level
        metrics). If your export uses different headers, the column mapping can be adjusted via the{" "}
        <code>/api/local-pos/import</code> endpoint's <code>mapping</code> field — see the server README.
      </p>

      <p className="settings__csv-summary">
        For Shopify, the access token option above works with a <strong>custom app</strong>: in your store
        admin, go to Settings → Apps and sales channels → Develop apps → Create an app, grant it{" "}
        <code>read_orders</code> (and <code>read_products</code>) scopes under Admin API scopes, install
        it, then copy the Admin API access token shown there. No redirect URI or app review needed.
      </p>
    </div>
  );
}

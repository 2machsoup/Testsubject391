import { Router } from "express";
import { config } from "../config";
import * as etsyAuth from "../auth/etsyAuth";
import * as squareAuth from "../auth/squareAuth";
import * as shopifyAuth from "../auth/shopifyAuth";

export const authRouter = Router();

function redirectToClient(success: boolean, platform: string, message?: string) {
  const url = new URL("/settings", config.clientOrigin);
  url.searchParams.set("connected", platform);
  url.searchParams.set("status", success ? "success" : "error");
  if (message) url.searchParams.set("message", message);
  return url.toString();
}

// --- Etsy ---
authRouter.get("/etsy/start", (_req, res) => {
  res.redirect(etsyAuth.buildAuthorizeUrl());
});

authRouter.get("/etsy/callback", async (req, res) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    await etsyAuth.handleCallback(code, state);
    res.redirect(redirectToClient(true, "etsy"));
  } catch (err) {
    res.redirect(redirectToClient(false, "etsy", err instanceof Error ? err.message : "OAuth failed"));
  }
});

authRouter.post("/etsy/disconnect", (_req, res) => {
  etsyAuth.disconnect();
  res.json({ ok: true });
});

// --- Square ---
authRouter.get("/square/start", (_req, res) => {
  res.redirect(squareAuth.buildAuthorizeUrl());
});

authRouter.get("/square/callback", async (req, res) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    await squareAuth.handleCallback(code, state);
    res.redirect(redirectToClient(true, "square"));
  } catch (err) {
    res.redirect(redirectToClient(false, "square", err instanceof Error ? err.message : "OAuth failed"));
  }
});

authRouter.post("/square/disconnect", (_req, res) => {
  squareAuth.disconnect();
  res.json({ ok: true });
});

// --- Shopify ---
authRouter.get("/shopify/start", (req, res) => {
  try {
    const shop = String(req.query.shop ?? "");
    res.redirect(shopifyAuth.buildAuthorizeUrl(shop));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid shop" });
  }
});

authRouter.get("/shopify/callback", async (req, res) => {
  try {
    const query = req.query as Record<string, string>;
    if (!shopifyAuth.verifyHmac(query)) {
      throw new Error("HMAC verification failed");
    }
    await shopifyAuth.handleCallback(query.shop, query.code, query.state);
    res.redirect(redirectToClient(true, "shopify"));
  } catch (err) {
    res.redirect(redirectToClient(false, "shopify", err instanceof Error ? err.message : "OAuth failed"));
  }
});

authRouter.post("/shopify/disconnect", (_req, res) => {
  shopifyAuth.disconnect();
  res.json({ ok: true });
});

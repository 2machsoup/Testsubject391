import "dotenv/config";

function required(name: string, fallback = ""): string {
  const value = process.env[name] ?? fallback;
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: required("CLIENT_ORIGIN", "http://localhost:5173"),
  serverBaseUrl: required("SERVER_BASE_URL", "http://localhost:4000"),
  sessionSecret: required("SESSION_SECRET", "dev-insecure-secret"),
  tokenEncryptionKey: required("TOKEN_ENCRYPTION_KEY"),

  etsy: {
    keystring: required("ETSY_KEYSTRING"),
    sharedSecret: required("ETSY_SHARED_SECRET"),
    redirectUri: required("ETSY_REDIRECT_URI"),
  },
  square: {
    applicationId: required("SQUARE_APPLICATION_ID"),
    applicationSecret: required("SQUARE_APPLICATION_SECRET"),
    environment: required("SQUARE_ENVIRONMENT", "sandbox"),
    redirectUri: required("SQUARE_REDIRECT_URI"),
  },
  shopify: {
    apiKey: required("SHOPIFY_API_KEY"),
    apiSecret: required("SHOPIFY_API_SECRET"),
    scopes: required("SHOPIFY_SCOPES", "read_orders,read_products"),
    redirectUri: required("SHOPIFY_REDIRECT_URI"),
  },
};

export type PlatformId = "etsy" | "square" | "shopify" | "localPos";

export const PLATFORM_IDS: PlatformId[] = ["etsy", "square", "shopify", "localPos"];

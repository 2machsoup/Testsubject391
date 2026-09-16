import { SalesAdapter } from "./types";
import { etsyAdapter } from "./etsyAdapter";
import { squareAdapter } from "./squareAdapter";
import { shopifyAdapter } from "./shopifyAdapter";
import { localPosAdapter } from "./localPosAdapter";
import { PlatformId } from "../config";

export const adapters: Record<PlatformId, SalesAdapter> = {
  etsy: etsyAdapter,
  square: squareAdapter,
  shopify: shopifyAdapter,
  localPos: localPosAdapter,
};

export const adapterList: SalesAdapter[] = Object.values(adapters);

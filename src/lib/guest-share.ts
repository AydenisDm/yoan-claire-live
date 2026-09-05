import { eventConfig } from "@/lib/event-config";
import { PRODUCTION_ORIGIN } from "@/lib/live-config";

/** Canonical guest watch URL. Vercel slug stays; share copy says EventView. */
export function guestWatchUrl(origin: string = PRODUCTION_ORIGIN) {
  return `${origin.replace(/\/$/, "")}/`;
}

export function guestShareTitle(productName: string = eventConfig.productName) {
  return `Watch live on ${productName}`;
}

export function guestShareText(
  productName: string = eventConfig.productName,
  origin: string = PRODUCTION_ORIGIN,
) {
  return `${guestShareTitle(productName)}\n${guestWatchUrl(origin)}`;
}

export function guestSharePayload(
  productName: string = eventConfig.productName,
  origin: string = PRODUCTION_ORIGIN,
) {
  return {
    title: guestShareTitle(productName),
    text: guestShareText(productName, origin),
    url: guestWatchUrl(origin),
  };
}

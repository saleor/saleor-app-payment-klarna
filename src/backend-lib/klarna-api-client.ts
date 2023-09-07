import { Fetcher } from "openapi-typescript-fetch";

import { type paths } from "../../generated/klarna";

/**
 * # Base URLs - Live (production)
 * - Europe:  https://api.klarna.com/
 * - North America:  https://api-na.klarna.com/
 * - Oceania:  https://api-oc.klarna.com/
 * # Base URLs - Testing (playground)
 * - Europe:  https://api.playground.klarna.com/
 * - North America:  https://api-na.playground.klarna.com/
 * - Oceania:  https://api-oc.playground.klarna.com/
 */
export const getKlarnaApiClient = (klarnaApiUrl: string) => {
  const fetcher = Fetcher.for<paths>();
  fetcher.configure({
    baseUrl: klarnaApiUrl,
    init: {
      headers: {},
    },
    use: [],
  });
  return fetcher;
};

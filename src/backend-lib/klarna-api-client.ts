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
export const getKlarnaApiClient = ({
  klarnaApiUrl,
  username,
  password,
}: {
  klarnaApiUrl: string;
  username: string;
  password: string;
}) => {
  const fetcher = Fetcher.for<paths>();
  fetcher.configure({
    baseUrl: klarnaApiUrl,
    init: {
      headers: {
        Authorization: getAuthorizationHeader({ username, password }),
      },
    },
    use: [],
  });
  return fetcher;
};

const getAuthorizationHeader = ({ username, password }: { username: string; password: string }) => {
  const encoded = btoa(`${username}:${password}`);
  return `Basic ${encoded}`;
};

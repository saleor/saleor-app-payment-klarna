// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever middleware or an Edge route handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import packageJson from "./package.json";
import { env } from "./src/lib/env.mjs";

const SENTRY_DSN = env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = env.NEXT_PUBLIC_SENTRY_ENVIRONMENT;

Sentry.init({
  dsn: SENTRY_DSN,
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  release: packageJson.version,
  environment: SENTRY_ENVIRONMENT,
  includeLocalVariables: true,
});

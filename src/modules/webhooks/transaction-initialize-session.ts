import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { getConfigurationForChannel } from "@/modules/payment-app-configuration/payment-app-configuration";
import { getWebhookPaymentAppConfigurator } from "@/modules/payment-app-configuration/payment-app-configuration-factory";
import { paymentAppFullyConfiguredEntrySchema } from "@/modules/payment-app-configuration/config-entry";
import { getLineItems, getKlarnaApiClient } from "@/modules/klarna/klarna-api";
import { type components } from "generated/klarna";
import { obfuscateConfig } from "@/modules/app-configuration/utils";
import { type JSONObject } from "@/types";
import { KlarnaHttpClientError } from "@/errors";

export const TransactionInitializeSessionWebhookHandler = async (
  event: TransactionInitializeSessionEventFragment,
  saleorApiUrl: string,
): Promise<TransactionInitializeSessionResponse> => {
  const logger = createLogger(
    { saleorApiUrl },
    { msgPrefix: "[TransactionInitializeSessionWebhookHandler] " },
  );
  const { transaction, action, sourceObject, merchantReference, issuingPrincipal } = event;
  const { id, __typename, channel } = sourceObject;
  const logData = {
    transaction,
    action,
    sourceObject: { id, channel, __typename },
    merchantReference,
    issuingPrincipal,
  };
  logger.debug(logData, "Received event");

  const app = event.recipient;
  invariant(app, "Missing event.recipient!");
  invariant(event.data, "Missing data");

  const { privateMetadata } = app;

  const configurator = getWebhookPaymentAppConfigurator({ privateMetadata }, saleorApiUrl);
  const appConfig = await configurator.getConfig();
  const klarnaConfig = paymentAppFullyConfiguredEntrySchema.parse(
    getConfigurationForChannel(appConfig, event.sourceObject.channel.id),
  );

  const klarnaClient = getKlarnaApiClient({
    // @todo get URL from settings
    klarnaApiUrl: "https://api.playground.klarna.com/",
    username: klarnaConfig.username,
    password: klarnaConfig.password,
  });

  const createKlarnaSession = klarnaClient.path("/payments/v1/sessions").method("post").create();

  const locale =
    event.sourceObject.__typename === "Checkout"
      ? event.sourceObject.languageCode
      : event.sourceObject.languageCodeEnum.toString();

  const country = event.sourceObject.billingAddress?.country.code;

  invariant(country, "Missing country code");

  const createKlarnaSessionPayload: components["schemas"]["session_create"] = {
    locale,
    purchase_country: country,
    purchase_currency: event.action.currency,
    order_amount: event.action.amount,
    order_lines: getLineItems(event.sourceObject),
    intent: "buy",
  };
  logger.debug({ ...obfuscateConfig(createKlarnaSessionPayload) }, "createKlarnaSession payload");

  const klarnaSession = await createKlarnaSession(createKlarnaSessionPayload);
  logger.debug({ ...obfuscateConfig(klarnaSession) }, "createKlarnaSession result");

  if (!klarnaSession.ok) {
    throw new KlarnaHttpClientError(klarnaSession.statusText, { errors: [klarnaSession.data] });
  }

  const data = {
    paymentResponse: klarnaSession.data as JSONObject,
  };

  const transactionInitializeSessionResponse: TransactionInitializeSessionResponse = {
    data,
    pspReference: klarnaSession.data.session_id,
    result: "CHARGE_REQUEST",
    actions: [],
    amount: action.amount,
    message: "",
    externalUrl: undefined, // @todo,
  };
  return transactionInitializeSessionResponse;
};

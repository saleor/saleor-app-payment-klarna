import { uuidv7 } from "uuidv7";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { getKlarnaApiClient, getLineItems } from "@/modules/klarna/klarna-api";
import { paymentAppFullyConfiguredEntrySchema } from "@/modules/payment-app-configuration/config-entry";
import { getConfigurationForChannel } from "@/modules/payment-app-configuration/payment-app-configuration";
import { getWebhookPaymentAppConfigurator } from "@/modules/payment-app-configuration/payment-app-configuration-factory";
import { type TransactionRefundRequestedResponse } from "@/schemas/TransactionRefundRequesed/TransactionRefundRequestedResponse.mjs";
import {
  TransactionActionEnum,
  type TransactionRefundRequestedEventFragment,
} from "generated/graphql";

export const TransactionRefundRequestedWebhookHandler = async (
  event: TransactionRefundRequestedEventFragment,
  saleorApiUrl: string,
): Promise<TransactionRefundRequestedResponse> => {
  const { recipient: app, action, transaction } = event ?? {};
  const logger = createLogger({}, { msgPrefix: "[TransactionRefundRequestedWebhookHandler] " });
  logger.info("Processing refund request", { action: action, transaction });

  invariant(app, "Missing event.recipient!");
  invariant(
    event.action.actionType === TransactionActionEnum.Refund,
    `Incorrect action.actionType: ${event.action.actionType}`,
  );
  invariant(transaction, "Missing transaction in event body!");
  invariant(transaction.pspReference, "Missing event.transaction.pspReference!");
  invariant(transaction.sourceObject, "Missing event.transaction.sourceObject!");

  const { privateMetadata } = app;

  const configurator = getWebhookPaymentAppConfigurator({ privateMetadata }, saleorApiUrl);
  const appConfig = await configurator.getConfig();
  const klarnaConfig = paymentAppFullyConfiguredEntrySchema.parse(
    getConfigurationForChannel(appConfig, transaction.sourceObject.channel.id),
  );

  const klarnaClient = getKlarnaApiClient({
    klarnaApiUrl: klarnaConfig.apiUrl,
    username: klarnaConfig.username,
    password: klarnaConfig.password,
  });

  const refundOrder = klarnaClient
    .path("/ordermanagement/v1/orders/{order_id}/refunds")
    .method("post")
    .create();

  const refundAmount =
    event.grantedRefund?.amount.amount ?? event.action.amount ?? transaction.chargedAmount.amount;
  const allRefundReasons = [
    event.grantedRefund?.reason,
    ...(event.grantedRefund?.lines?.map((l) => l.reason) ?? []),
  ].filter(Boolean);
  const lineItems = event.grantedRefund
    ? getLineItems({
        deliveryMethod: event.grantedRefund.shippingCostsIncluded
          ? transaction.sourceObject.deliveryMethod
          : undefined,
        shippingPrice: event.transaction?.sourceObject?.shippingPrice,
        lines: event.grantedRefund.lines?.map((l) => l.orderLine) ?? [],
      })
    : undefined;

  const klarnaRefundResponse = await refundOrder({
    order_id: transaction.pspReference,
    refunded_amount: refundAmount,
    description: allRefundReasons.join("\n") ?? undefined,
    order_lines: lineItems,
    reference: event.grantedRefund?.id ?? event.transaction?.sourceObject?.id,
  });

  const transactionRefundRequestedResponse: TransactionRefundRequestedResponse = {
    pspReference: klarnaRefundResponse.headers.get("Refund-Id") ?? uuidv7(),
  };
  return transactionRefundRequestedResponse;
};

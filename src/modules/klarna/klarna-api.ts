import { Fetcher } from "openapi-typescript-fetch";
import { invariant } from "@/lib/invariant";
import { getKlarnaIntegerAmountFromSaleor } from "@/modules/klarna/currencies";
import { type OrderOrCheckoutLinesFragment } from "generated/graphql";
import { type paths, type components } from "generated/klarna";

/**
 * ### Base URLs - Live (production)
 * - Europe:  https://api.klarna.com/
 * - North America:  https://api-na.klarna.com/
 * - Oceania:  https://api-oc.klarna.com/
 * ### Base URLs - Testing (playground)
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

export const getLineItems = ({
  lines,
  shippingPrice,
  deliveryMethod,
}: OrderOrCheckoutLinesFragment): components["schemas"]["order_line"][] => {
  const shippingLineItem: components["schemas"]["order_line"] | null =
    deliveryMethod?.__typename === "ShippingMethod"
      ? {
          type: "shipping_fee",
          reference: deliveryMethod.id,
          name: deliveryMethod.name,
          quantity: 1,
          unit_price: getKlarnaIntegerAmountFromSaleor(
            shippingPrice.gross.amount,
            shippingPrice.gross.currency,
          ),
          total_amount: getKlarnaIntegerAmountFromSaleor(
            shippingPrice.gross.amount,
            shippingPrice.gross.currency,
          ),
          total_tax_amount: getKlarnaIntegerAmountFromSaleor(
            shippingPrice.tax.amount,
            shippingPrice.tax.currency,
          ),
          tax_rate: Math.round((10000 * shippingPrice.tax.amount) / shippingPrice.net.amount),
        }
      : null;

  const lineItems = lines.map((line) => {
    const variant =
      line.__typename === "CheckoutLine"
        ? line.checkoutVariant
        : line.__typename === "OrderLine"
        ? line.orderVariant
        : /* c8 ignore next */
          null;

    invariant(variant, `Unknown line type: ${line.__typename || "<undefined>"}`);

    const klarnaLineItem: components["schemas"]["order_line"] = {
      type: "physical",
      reference: variant.sku || variant.id,
      name: variant.product.name + " - " + variant.name,
      quantity: line.quantity,
      image_url: variant.product.thumbnail?.url,
      unit_price: getKlarnaIntegerAmountFromSaleor(
        line.unitPrice.gross.amount,
        line.unitPrice.gross.currency,
      ),
      total_amount: getKlarnaIntegerAmountFromSaleor(
        line.totalPrice.gross.amount,
        line.totalPrice.gross.currency,
      ),
      total_tax_amount: getKlarnaIntegerAmountFromSaleor(
        line.totalPrice.tax.amount,
        line.totalPrice.tax.currency,
      ),
      tax_rate: Math.round((10000 * line.totalPrice.tax.amount) / line.totalPrice.net.amount),
    };
    return klarnaLineItem;
  });

  return [...lineItems, shippingLineItem].filter(Boolean);
};

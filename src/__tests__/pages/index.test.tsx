import { render, screen } from "@testing-library/react";
import { expect, vi, describe, it } from "vitest";
import IndexPage from "../../pages";

vi.mock("@saleor/app-sdk/app-bridge", () => {
  return {
    useAppBridge: () => ({
      appBridgeState: {},
      appBridge: {},
    }),
  };
});
vi.mock("next/router", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

describe("App", () => {
  it("renders text", () => {
    render(<IndexPage />);

    expect(screen.getByText("Add to Saleor", { exact: false })).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Keypair, Networks } from "@stellar/stellar-sdk";
const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  send: vi.fn(),
  confirm: vi.fn(),
  wallet: {
    account: "",
    config: {
      network: "testnet",
      passphrase: "",
      appUrl: "http://localhost:3000",
    },
    connect: vi.fn(),
  },
}));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/components/wallet-provider", () => ({
  useWallet: () => mocks.wallet,
  ConnectPrompt: () => <p>Connect your Stellar wallet to continue.</p>,
}));
vi.mock("@/lib/payment-client", () => ({
  sendUsdcPayment: mocks.send,
  confirmPayment: mocks.confirm,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { PaymentForm } from "@/components/payment-form";
import { PublicProfile } from "@/components/public-profile";
import { ClaimForm } from "@/components/claim-form";
import { CashOut } from "@/components/cash-out";
import { ShareProfile } from "@/components/share-profile";
const address = Keypair.random().publicKey();
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.wallet.account = Keypair.random().publicKey();
  mocks.wallet.config.passphrase = Networks.TESTNET;
  mocks.wallet.config.appUrl = "http://localhost:3000";
  mocks.api.mockResolvedValue({
    username: "sam",
    address,
    verified: true,
    profile: { displayName: "Sam", bio: "Designer" },
  });
});
afterEach(cleanup);
it("requires a connected wallet before payment", () => {
  mocks.wallet.account = "";
  render(<PaymentForm />);
  expect(
    screen.getByText("Connect your Stellar wallet to continue."),
  ).toBeInTheDocument();
});
it("rejects invalid usernames without requesting a payment", async () => {
  render(<PaymentForm initialUsername="ab" initialAmount="150" />);
  fireEvent.click(screen.getByText("Continue"));
  await screen.findByRole("alert");
  expect(mocks.api).not.toHaveBeenCalled();
});
it("shows exact destination before explicit confirmation and then verified success", async () => {
  mocks.send.mockImplementation(async (_p, _c, _progress, submitted) => {
    submitted("a".repeat(64));
    return { status: "CONFIRMED" };
  });
  render(<PaymentForm initialUsername="sam" initialAmount="150" />);
  fireEvent.click(screen.getByText("Continue"));
  await screen.findByText(address);
  expect(mocks.send).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Confirm payment"));
  expect(await screen.findByText("Payment sent")).toBeInTheDocument();
  expect(screen.getByText("Confirmed on Stellar Testnet")).toBeInTheDocument();
});
it("shows wallet rejection without success", async () => {
  mocks.send.mockRejectedValue(new Error("Wallet approval cancelled."));
  render(<PaymentForm initialUsername="sam" initialAmount="150" />);
  fireEvent.click(screen.getByText("Continue"));
  await screen.findByText("Confirm payment");
  fireEvent.click(screen.getByText("Confirm payment"));
  await screen.findByText("Wallet approval cancelled.");
  expect(screen.queryByText("Payment sent")).not.toBeInTheDocument();
});
it("renders public profile without requiring a wallet", async () => {
  mocks.wallet.account = "";
  render(<PublicProfile username="sam" />);
  await screen.findByText("@sam");
  expect(screen.getByText("Pay @sam ↗")).toBeInTheDocument();
});
it("shows public not-found state", async () => {
  mocks.api.mockRejectedValue(new Error("@sam was not found."));
  render(<PublicProfile username="sam" />);
  expect(await screen.findByText("Profile unavailable")).toBeInTheDocument();
});
it("checks claim availability and rejects taken usernames", async () => {
  mocks.api.mockResolvedValue({ available: false });
  render(<ClaimForm />);
  fireEvent.change(screen.getByLabelText("Your @username"), {
    target: { value: "sam" },
  });
  await screen.findByText("That username is already taken.");
  expect(
    screen.getByRole("button", { name: "Claim your @username" }),
  ).toBeDisabled();
});
it("generates a payment URL QR and copy controls", () => {
  render(<ShareProfile username="sam" url="https://skylarpay.app/@sam" />);
  fireEvent.click(screen.getByText("Show QR"));
  expect(screen.getByTitle("Payment link for @sam")).toBeInTheDocument();
  expect(screen.getByText("Copy link")).toBeInTheDocument();
});
it("shows unavailable cash-out and no invented rate", async () => {
  mocks.api.mockResolvedValue({
    available: false,
    name: "No provider configured",
    currencies: [],
  });
  render(<CashOut />);
  await waitFor(() =>
    expect(screen.getByText("A local bridge is coming.")).toBeInTheDocument(),
  );
  expect(screen.queryByText(/1 USDC =/)).not.toBeInTheDocument();
});

it("labels demo cash-out and only shows simulated processing", async () => {
  sessionStorage.clear();
  const id = crypto.randomUUID();
  mocks.api.mockImplementation(async (url: string) => {
    if (url === "/api/anchors")
      return {
        name: "Demo Off-Ramp",
        demo: true,
        available: true,
        currencies: ["NGN"],
        assetCode: "USDC",
      };
    if (url === "/api/me")
      return {
        account: mocks.wallet.account,
        balance: "150",
        payments: [],
        identity: null,
        profile: null,
      };
    return {
      id,
      status: "PROCESSING",
      demo: true,
      amount: "150",
      currency: "NGN",
      provider: "Demo Off-Ramp",
    };
  });
  render(<CashOut />);
  await screen.findByText(/UI simulation only. No USDC is transferred/);
  fireEvent.change(screen.getByLabelText("Amount · USDC"), {
    target: { value: "150" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Start demo withdrawal" }),
  );
  expect(await screen.findByText("PROCESSING")).toBeInTheDocument();
  expect(
    screen.getByText("Demo remains processing. No real payout is simulated."),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/COMPLETED|deposited to your bank/),
  ).not.toBeInTheDocument();
});

it("retains a real attempted hash on response loss and restores confirmation without signing again", async () => {
  const hash = "b".repeat(64);
  mocks.send.mockImplementation(async (_p, _c, _progress, attempted) => {
    attempted(hash);
    throw new Error("Connection lost");
  });
  const view = render(
    <PaymentForm initialUsername="sam" initialAmount="150" />,
  );
  fireEvent.click(screen.getByText("Continue"));
  await screen.findByText("Confirm payment");
  fireEvent.click(screen.getByText("Confirm payment"));
  await screen.findByText("Connection lost");
  expect(screen.getByText("Payment confirmation pending")).toBeInTheDocument();
  expect(screen.getByText(hash)).toBeInTheDocument();
  expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  view.unmount();
  mocks.confirm.mockResolvedValue({ status: "CONFIRMED", txHash: hash });
  render(<PaymentForm />);
  fireEvent.click(screen.getByText("Check confirmation"));
  await screen.findByText("Payment sent");
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.confirm).toHaveBeenCalledWith(
    hash,
    { username: "sam", amount: "150" },
    expect.any(Function),
  );
});
it("shows failed verification as failure and never success", async () => {
  mocks.send.mockImplementation(async (_p, _c, _progress, attempted) => {
    attempted("c".repeat(64));
    return { status: "FAILED" };
  });
  render(<PaymentForm initialUsername="sam" initialAmount="150" />);
  fireEvent.click(screen.getByText("Continue"));
  await screen.findByText("Confirm payment");
  fireEvent.click(screen.getByText("Confirm payment"));
  await screen.findByText("Payment failed");
  expect(screen.queryByText("Payment sent")).not.toBeInTheDocument();
});
it("does not expose another account's pending payment after a wallet switch", async () => {
  sessionStorage.setItem(
    `skylar_payment_${mocks.wallet.account}_testnet`,
    JSON.stringify({
      hash: "d".repeat(64),
      username: "sam",
      amount: "150",
      recipient: { username: "sam", address, verified: true },
    }),
  );
  const view = render(<PaymentForm />);
  expect(screen.getByText("Check confirmation")).toBeInTheDocument();
  mocks.wallet.account = Keypair.random().publicKey();
  view.rerender(<PaymentForm />);
  expect(screen.getByText("Continue")).toBeInTheDocument();
  expect(screen.queryByText("d".repeat(64))).not.toBeInTheDocument();
});
it("distinguishes a ledger failure from an uncertain submission", async () => {
  mocks.send.mockImplementation(async (_p, _c, _progress, attempted) => {
    attempted("e".repeat(64));
    throw new Error("Stellar reports that this transaction failed.");
  });
  render(<PaymentForm initialUsername="sam" initialAmount="150" />);
  fireEvent.click(screen.getByText("Continue"));
  await screen.findByText("Confirm payment");
  fireEvent.click(screen.getByText("Confirm payment"));
  await screen.findByText("Payment failed");
  expect(
    screen.queryByText(/Submission may have succeeded/),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Payment sent")).not.toBeInTheDocument();
});
it("waits for the canonical origin before exposing a share link or QR", async () => {
  mocks.wallet.config.appUrl = "";
  const view = render(<PublicProfile username="sam" />);
  await screen.findByText("@sam");
  expect(screen.getByText("Preparing payment link…")).toBeInTheDocument();
  expect(screen.queryByText("Show QR")).not.toBeInTheDocument();
  mocks.wallet.config.appUrl = "https://skylarpay.app/";
  view.rerender(<PublicProfile username="sam" />);
  expect(screen.getByText("https://skylarpay.app/@sam")).toBeInTheDocument();
});

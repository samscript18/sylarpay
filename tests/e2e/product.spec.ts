import { test, expect } from "@playwright/test";
test("landing, claim, and disconnected payment flow", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Get paid globally. Pay locally. Just use @username.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/screenshots/landing-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Claim your @username" }).click();
  await expect(
    page.getByRole("button", { name: "Connect Stellar wallet" }),
  ).toBeVisible();
  await page.goto("/send");
  await expect(page.getByText("It starts with your wallet.")).toBeVisible();
  expect(errors).toEqual([]);
});
test("real on-chain @sam profile and payment link QR", async ({
  page,
}, testInfo) => {
  await page.goto("/@sam?amount=150");
  await expect(
    page.getByRole("heading", { name: "@sam", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Skylar Verified", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show QR" }).click();
  await expect(
    page.locator("svg").filter({
      has: page.locator("title", { hasText: "Payment link for @sam" }),
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/screenshots/profile-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Pay @sam" }).click();
  await expect(page.getByText("It starts with your wallet.")).toBeVisible();
});
test("invalid profile and protected private API routes", async ({
  page,
  request,
}) => {
  await page.goto("/@ab");
  await expect(page.getByText("That page wasn’t found.")).toBeVisible();
  const privateResponse = await request.get("/api/payments");
  expect(privateResponse.status()).toBe(401);
  const withdrawal = await request.post("/api/withdrawals", {
    data: {
      amount: "150",
      currency: "NGN",
      idempotencyKey: crypto.randomUUID(),
    },
  });
  expect(withdrawal.status()).toBe(401);
  const crossOrigin = await request.post("/api/auth/challenge", {
    headers: { Origin: "https://attacker.example" },
    data: { account: "invalid" },
  });
  expect(crossOrigin.status()).toBe(403);
});

// Layout/state fixtures only. No extension approval, signing, or submission is automated.
test("account screens and payment confirmation fit the viewport", async ({
  page,
}) => {
  const evidence = await import("../../docs/LIVE-TEST.json", {
    with: { type: "json" },
  });
  const e = evidence.default;
  await page.addInitScript(
    ({ account }) => {
      window.addEventListener("message", (event) => {
        if (event.data?.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST") return;
        if (
          !["REQUEST_PUBLIC_KEY", "REQUEST_NETWORK_DETAILS"].includes(
            event.data.type,
          )
        )
          return;
        window.postMessage(
          {
            source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
            messagedId: event.data.messageId,
            publicKey: account,
            networkDetails: {
              networkPassphrase: "Test SDF Network ; September 2015",
            },
          },
          location.origin,
        );
      });
    },
    { account: e.sender },
  );
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { account: e.sender } }),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        account: e.sender,
        balance: "0.0000000",
        payments: [],
        identity: null,
        profile: null,
      },
    }),
  );
  await page.route("**/api/anchors", (route) =>
    route.fulfill({
      json: {
        name: "Demo Off-Ramp",
        demo: true,
        available: true,
        currencies: ["NGN"],
        assetCode: "USDC",
      },
    }),
  );
  const noOverflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  await page.goto("/dashboard");
  await expect(
    page.getByText("Available balance · Stellar testnet"),
  ).toBeVisible();
  await noOverflow();
  await page.goto("/cash-out");
  await expect(
    page.getByText("Demo Off-Ramp", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start demo withdrawal" }),
  ).toBeVisible();
  await noOverflow();
  await page.goto("/send");
  await page.getByLabel("Recipient", { exact: true }).fill("@sam");
  await page.getByLabel("Amount · USDC").fill("150");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText(e.recipient, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm payment" }),
  ).toBeEnabled();
  await noOverflow();
  // Resume a previously submitted payment without requesting any wallet signature.
  await page.evaluate(
    ({ account, hash, recipient }) => {
      sessionStorage.setItem(
        `skylar_payment_${account}_testnet`,
        JSON.stringify({
          hash,
          username: "sam",
          amount: "150",
          recipient: { username: "sam", address: recipient, verified: true },
        }),
      );
    },
    { account: e.sender, hash: e.txHash, recipient: e.recipient },
  );
  await page.route("**/api/payments/verify", (route) =>
    route.fulfill({ json: { ...e, status: "CONFIRMED" } }),
  );
  await page.reload();
  await expect(page.getByText("Payment confirmation pending")).toBeVisible();
  await expect(page.getByText(e.txHash, { exact: true })).toBeVisible();
  await noOverflow();
  await page.getByRole("button", { name: "Check confirmation" }).click();
  await expect(page.getByText("Payment sent", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View on Stellar Explorer" }),
  ).toHaveAttribute(
    "href",
    `https://stellar.expert/explorer/testnet/tx/${e.txHash}`,
  );
  await noOverflow();
});

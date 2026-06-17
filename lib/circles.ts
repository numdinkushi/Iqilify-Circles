import type { Sdk } from "@aboutcircles/sdk"

export const HUB_V2 = "0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8" as const
export const INDEFINITE_TRUST_EXPIRY = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFF")

export type HostTx = {
  to: string
  data?: string
  value?: string
  label?: string
  description?: string
}
export type EncodedTx = {
  to: string
  data?: string
  value?: bigint | string
  label?: string
  description?: string
}

export type TreasuryFundPreview = {
  amountCrc: number
  from: string
  to: string
  steps: Array<{ label: string; description: string }>
}

let sdkSingleton: Sdk | null = null

export async function getSdk(): Promise<Sdk> {
  if (sdkSingleton) return sdkSingleton
  const { Sdk } = await import("@aboutcircles/sdk")
  sdkSingleton = new Sdk()
  return sdkSingleton
}

export function toHostTx(tx: EncodedTx): HostTx {
  return {
    to: tx.to,
    data: tx.data,
    value: tx.value === undefined ? "0" : tx.value.toString(),
    label: tx.label,
    description: tx.description,
  }
}

export async function submitViaHost(txs: EncodedTx[]): Promise<string[]> {
  const { sendTransactions } = await import("@aboutcircles/miniapp-sdk")
  return sendTransactions(txs.map(toHostTx))
}

export function explorerTxUrl(hash: string): string {
  return `https://gnosisscan.io/tx/${hash}`
}

export function toAtto(amount: string): bigint {
  const trimmed = amount.trim()
  if (trimmed === "" || trimmed === "." || !/^\d*\.?\d*$/.test(trimmed)) {
    throw new Error("Enter a valid amount.")
  }
  const [whole, frac = ""] = trimmed.split(".")
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18)
  const base = BigInt(10) ** BigInt(18)
  return BigInt(whole || "0") * base + BigInt(fracPadded || "0")
}

export function fromAtto(atto: bigint, maxFractionDigits = 2): string {
  const negative = atto < BigInt(0)
  const abs = negative ? -atto : atto
  const base = BigInt(10) ** BigInt(18)
  const whole = abs / base
  const fracStr = (abs % base)
    .toString()
    .padStart(18, "0")
    .slice(0, maxFractionDigits)
    .replace(/0+$/, "")
  return `${negative ? "-" : ""}${whole.toLocaleString()}${fracStr ? `.${fracStr}` : ""}`
}

export function crcToAmountUnits(amountCrc: number): bigint {
  return BigInt(Math.round(amountCrc * 1e6)) * BigInt(10) ** BigInt(12)
}

async function ensureOrgTrustsSender(sender: string) {
  const res = await fetch("/api/treasury/trust-recipient", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: sender }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || "IQlify org could not trust your wallet yet.")
  }
}

export async function buildTrustTx(trustee: string, label?: string): Promise<EncodedTx> {
  const { Core, circlesConfig } = await import("@aboutcircles/sdk-core")
  const { getAddress } = await import("viem")
  const core = new Core(circlesConfig[100])
  const tx = core.hubV2.trust(getAddress(trustee), INDEFINITE_TRUST_EXPIRY)
  return {
    to: tx.to!,
    data: tx.data,
    value: tx.value ?? 0n,
    label: label ?? "Trust avatar",
    description: `Trust ${trustee}`,
  }
}

/** Trust another Circles avatar from the connected miniapp wallet (e.g. KUSHI → org). */
export async function trustCirclesAccount(trustee: string) {
  return submitViaHost([await buildTrustTx(trustee)])
}

export async function buildAdvancedCrcTransfer(input: {
  from: string
  to: string
  amountCrc: number
  reference: string
  maxTransfers?: number
  label?: string
  description?: string
}): Promise<EncodedTx[]> {
  const { TransferBuilder } = await import("@aboutcircles/sdk-transfers")
  const { encodeCrcV2TransferData } = await import("@aboutcircles/sdk-utils")
  const { circlesConfig } = await import("@aboutcircles/sdk-core")
  const { getAddress, hexToBytes } = await import("viem")

  const config = circlesConfig[100]
  const builder = new TransferBuilder(config)
  const from = getAddress(input.from)
  const to = getAddress(input.to)
  const amount = crcToAmountUnits(input.amountCrc)
  const txData = hexToBytes(
    encodeCrcV2TransferData(
      [`Send ${input.amountCrc} CRC`, input.reference],
      0x1001,
    ),
  )

  const rawTxs = await builder.constructAdvancedTransfer(from, to, amount, {
    useWrappedBalances: true,
    maxTransfers: input.maxTransfers ?? 12,
    fromTokens: [from],
    simulatedTrusts: [
      { truster: from, trustee: to },
      { truster: to, trustee: from },
    ],
    txData,
  })

  return rawTxs.map((tx, index) => ({
    to: tx.to,
    data: tx.data,
    value: tx.value,
    label: input.label ?? "Send CRC",
    description:
      input.description ??
      (index === 0
        ? `Send ${input.amountCrc} CRC to ${to}`
        : `Transfer step ${index + 1} of ${rawTxs.length}`),
  }))
}

export function buildTreasuryFundPreview(input: {
  from: string
  to: string
  amountCrc: number
}): TreasuryFundPreview {
  return {
    amountCrc: input.amountCrc,
    from: input.from,
    to: input.to,
    steps: [
      {
        label: "Org trusts your wallet",
        description: "Server-signed trust from IQlify treasury to your wallet",
      },
      {
        label: "Trust IQlify org",
        description: `Your wallet trusts ${input.to}`,
      },
      {
        label: "Send CRC",
        description: `Transfer ${input.amountCrc} CRC to IQlify treasury`,
      },
    ],
  }
}

/** Fund the IQlify org via pathfinding (bypasses Gnosis app send-limit UI). */
export async function fundOrgTreasury(input: {
  from: string
  to: string
  amountCrc: number
  skipSenderTrust?: boolean
}) {
  await ensureOrgTrustsSender(input.from)

  const txs: EncodedTx[] = []
  if (!input.skipSenderTrust) {
    txs.push(
      await buildTrustTx(
        input.to,
        "Trust IQlify org",
      ),
    )
  }

  const transferTxs = await buildAdvancedCrcTransfer({
    from: input.from,
    to: input.to,
    amountCrc: input.amountCrc,
    reference: `IQLIFY-TREASURY-FUND-${input.amountCrc}CRC`,
    maxTransfers: 12,
    label: "Fund IQlify treasury",
    description: `Send ${input.amountCrc} CRC to ${input.to}`,
  })

  txs.push(...transferTxs)
  return submitViaHost(txs)
}

export async function payForDebrief(input: {
  from: string
  to: string
  amountCrc: number
  sessionId: string
}) {
  const txs = await buildAdvancedCrcTransfer({
    from: input.from,
    to: input.to,
    amountCrc: input.amountCrc,
    reference: `IQLIFY-${input.sessionId.slice(0, 8).toUpperCase()}`,
    maxTransfers: 4,
  })
  return submitViaHost(txs)
}

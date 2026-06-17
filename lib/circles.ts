import type { Sdk } from "@aboutcircles/sdk"

export const HUB_V2 = "0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8" as const
export const INDEFINITE_TRUST_EXPIRY = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFF")

export type HostTx = { to: string; data?: string; value?: string }
export type EncodedTx = { to: string; data?: string; value?: bigint | string }

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

export async function payForDebrief(input: {
  from: string
  to: string
  amountCrc: number
  sessionId: string
}) {
  const { TransferBuilder } = await import("@aboutcircles/sdk-transfers")
  const { encodeCrcV2TransferData } = await import("@aboutcircles/sdk-utils")
  const { circlesConfig } = await import("@aboutcircles/sdk-core")
  const { getAddress, hexToBytes } = await import("viem")

  const config = circlesConfig[100]
  const builder = new TransferBuilder(config)
  const from = getAddress(input.from)
  const to = getAddress(input.to)
  const amount = BigInt(Math.round(input.amountCrc * 1e6)) * BigInt(10) ** BigInt(12)
  const reference = `IQLIFY-${input.sessionId.slice(0, 8).toUpperCase()}`
  const txData = hexToBytes(encodeCrcV2TransferData([reference], 0x0001))

  const txs = await builder.constructAdvancedTransfer(from, to, amount, {
    useWrappedBalances: true,
    maxTransfers: 4,
    txData,
  })

  return submitViaHost(txs)
}

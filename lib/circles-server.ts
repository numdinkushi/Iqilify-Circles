import type { Address, Hex } from "@aboutcircles/sdk-types"

import { crcToAmountUnits, explorerTxUrl, INDEFINITE_TRUST_EXPIRY } from "@/lib/circles"

async function getOrgRunner() {
  const orgAddress = process.env.NEXT_PUBLIC_IQLIFY_ORG_ADDRESS?.trim()
  const privateKey = process.env.IQLIFY_ORG_PRIVATE_KEY?.trim() as Hex | undefined
  if (!orgAddress || !privateKey) {
    throw new Error(
      "Reward payout not configured. Set NEXT_PUBLIC_IQLIFY_ORG_ADDRESS and IQLIFY_ORG_PRIVATE_KEY.",
    )
  }

  const { circlesConfig } = await import("@aboutcircles/sdk-core")
  const { SafeContractRunner, chains } = await import("@aboutcircles/sdk-runner")
  const { getAddress } = await import("viem")

  const config = circlesConfig[100]
  const rpcUrl = config.circlesRpcUrl ?? config.chainRpcUrl ?? "https://rpc.aboutcircles.com/"
  const from = getAddress(orgAddress)
  const runner = await SafeContractRunner.create(rpcUrl, privateKey, from, chains.gnosis)
  return { runner, from, config }
}

/** Org trusts a user so pathfinding can pay them CRC rewards. */
export async function ensureOrgTrustsUser(userAddress: Address): Promise<void> {
  const { Core } = await import("@aboutcircles/sdk-core")
  const { getAddress } = await import("viem")
  const { runner, config } = await getOrgRunner()
  const core = new Core(config)
  const tx = core.hubV2.trust(getAddress(userAddress), INDEFINITE_TRUST_EXPIRY)
  await runner.sendTransaction([tx])
}

export function isOrgRewardPayoutConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_IQLIFY_ORG_ADDRESS?.trim() &&
    process.env.IQLIFY_ORG_PRIVATE_KEY?.trim()
  )
}

export function getOrgTreasuryAddress(): string | null {
  const orgAddress = process.env.NEXT_PUBLIC_IQLIFY_ORG_ADDRESS?.trim()
  return orgAddress || null
}

/** On-chain CRC balance for the IQlify org treasury (Circles RPC v2Balance). */
export async function getOrgTreasuryBalance(): Promise<{
  address: string
  balance: string
  name: string | null
}> {
  const orgAddress = getOrgTreasuryAddress()
  if (!orgAddress) {
    throw new Error("NEXT_PUBLIC_IQLIFY_ORG_ADDRESS is not configured.")
  }

  const { CirclesRpc } = await import("@aboutcircles/sdk-rpc")
  const { circlesConfig } = await import("@aboutcircles/sdk-core")
  const { getAddress } = await import("viem")

  const config = circlesConfig[100]
  const rpcUrl = config.circlesRpcUrl ?? config.chainRpcUrl ?? "https://rpc.aboutcircles.com/"
  const rpc = new CirclesRpc(rpcUrl)
  const address = getAddress(orgAddress)
  const view = await rpc.profile.getProfileView(address)

  return {
    address,
    balance: view.v2Balance ?? "0",
    name: view.profile?.name ?? null,
  }
}

/** Server-side CRC payout from the org treasury (Circles Safe) to a user wallet. */
export async function sendCrcRewardFromOrg(input: {
  to: Address
  amountCrc: number
  sessionId: string
}): Promise<{ txHash: string; explorerUrl: string }> {
  const { TransferBuilder } = await import("@aboutcircles/sdk-transfers")
  const { encodeCrcV2TransferData } = await import("@aboutcircles/sdk-utils")
  const { getAddress, hexToBytes } = await import("viem")

  const { runner, from, config } = await getOrgRunner()
  const to = getAddress(input.to)
  const amount = crcToAmountUnits(input.amountCrc)
  const reference = `IQLIFY-REWARD-${input.sessionId.slice(0, 8).toUpperCase()}`
  const txData = hexToBytes(encodeCrcV2TransferData([reference], 0x0001))

  try {
    await ensureOrgTrustsUser(to)
  } catch (error) {
    console.warn("[ensureOrgTrustsUser]", error)
  }

  const builder = new TransferBuilder(config)
  const txs = await builder.constructAdvancedTransfer(from, to, amount, {
    useWrappedBalances: true,
    maxTransfers: 8,
    txData,
  })

  const receipt = await runner.sendTransaction(txs)
  const txHash = receipt.transactionHash

  return { txHash, explorerUrl: explorerTxUrl(txHash) }
}

import {
  BrowserProvider,
  Contract,
  Eip1193Provider,
  JsonRpcSigner,
  formatEther,
  parseEther,
} from 'ethers'
import abiJson from '@/lib/contractABI.json'
import { contractAddress, chainId } from '@/lib/constants'

const abi = abiJson.abi

export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null
  const anyWindow = window as unknown as { ethereum?: Eip1193Provider }
  return anyWindow.ethereum ?? null
}

export function getBrowserProvider(): BrowserProvider {
  const injected = getInjectedProvider()
  if (!injected) {
    throw new Error('지갑(예: MetaMask)이 설치되어 있지 않습니다.')
  }
  return new BrowserProvider(injected)
}

export async function getSigner(): Promise<JsonRpcSigner> {
  const provider = getBrowserProvider()
  return await provider.getSigner()
}

// ✅ 올바르게 수정된 ensureNetwork()
export async function ensureNetwork(): Promise<void> {
  const injected = getInjectedProvider()
  if (!injected || !('request' in injected)) {
    throw new Error('지갑이 감지되지 않았습니다.')
  }

  // 현재 체인 ID 직접 조회 (ethers provider 기본값 문제 방지)
  const currentChainHex = await injected.request({ method: 'eth_chainId' })
  const currentChain = parseInt(currentChainHex as string, 16)

  if (currentChain !== chainId) {
    // 네트워크 자동 전환 요청
    await injected.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }], // 11155111 (Sepolia)
    })
  }
}

export async function connectWallet(): Promise<string> {
  const injected = getInjectedProvider()
  if (!injected || !('request' in injected)) {
    throw new Error('EIP-1193 provider를 찾을 수 없습니다.')
  }

  const accounts = (await injected.request({
    method: 'eth_requestAccounts',
  })) as string[]

  if (!accounts || accounts.length === 0) {
    throw new Error('지갑 계정을 가져올 수 없습니다.')
  }

  return accounts[0]
}

export async function getContract(withSigner = false): Promise<Contract> {
  const provider = getBrowserProvider()
  if (withSigner) {
    const signer = await getSigner()
    return new Contract(contractAddress, abi, signer)
  }
  return new Contract(contractAddress, abi, provider)
}

export async function readContractBalance(): Promise<string> {
  const contract = await getContract(false)
  const raw = (await contract.getBalance()) as bigint
  return formatEther(raw)
}

export async function readOwner(): Promise<string> {
  const contract = await getContract(false)
  return (await contract.owner()) as string
}

export async function sendTip(amountEth: string): Promise<string> {
  await ensureNetwork()
  const contract = await getContract(true)
  const tx = await contract.tip({ value: parseEther(amountEth) })
  const receipt = await tx.wait()
  return receipt?.hash ?? tx.hash
}

export async function withdrawTips(): Promise<string> {
  await ensureNetwork()
  const contract = await getContract(true)
  const tx = await contract.withdrawTips()
  const receipt = await tx.wait()
  return receipt?.hash ?? tx.hash
}

export async function getAccountAndNetwork(): Promise<{
  account?: string
  chainId?: number
  chainName?: string
}> {
  try {
    const provider = getBrowserProvider()
    const signer = await provider.getSigner()
    const address = await signer.getAddress().catch(() => undefined)
    const net = await provider.getNetwork()
    return {
      account: address,
      chainId: Number(net.chainId),
      chainName: net.name,
    }
  } catch {
    return {}
  }
}

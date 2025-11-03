'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  connectWallet,
  getAccountAndNetwork,
  readContractBalance,
  readOwner,
  sendTip,
  withdrawTips,
} from '@/lib/eth'

export default function Home() {
  const [account, setAccount] = useState<string | undefined>(undefined)
  const [chainId, setChainId] = useState<number | undefined>(undefined)
  const [chainName, setChainName] = useState<string | undefined>(undefined)
  const [balanceEth, setBalanceEth] = useState<string>('0')
  const [owner, setOwner] = useState<string>('')
  const [amount, setAmount] = useState<string>('0.01')
  const [loading, setLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    refreshBasics()
  }, [])

  function getErrorMessage(err: unknown): string {
    if (typeof err === 'string') return err
    if (err && typeof err === 'object' && 'message' in err) {
      const msg = (err as { message?: unknown }).message
      if (typeof msg === 'string') return msg
    }
    return ''
  }

  async function refreshBasics() {
    try {
      const info = await getAccountAndNetwork()
      setAccount(info.account)
      setChainId(info.chainId)
      setChainName(info.chainName)
      const [b, o] = await Promise.all([readContractBalance(), readOwner()])
      setBalanceEth(b)
      setOwner(o)
    } catch {}
  }

  async function onConnect() {
    setLoading(true)
    setMessage('')
    try {
      const addr = await connectWallet()
      setAccount(addr)
      await refreshBasics()
      setMessage('지갑이 연결되었습니다.')
    } catch (e: unknown) {
      const msg = getErrorMessage(e) || '지갑 연결 실패'
      setMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  async function onSendTip() {
    setLoading(true)
    setMessage('')
    try {
      const hash = await sendTip(amount)
      await refreshBasics()
      setMessage(`Tip 전송 완료: ${hash}`)
    } catch (e: unknown) {
      const msg = getErrorMessage(e) || 'Tip 전송 실패'
      setMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  async function onWithdraw() {
    setLoading(true)
    setMessage('')
    try {
      const hash = await withdrawTips()
      await refreshBasics()
      setMessage(`인출 완료: ${hash}`)
    } catch (e: unknown) {
      const msg = getErrorMessage(e) || '인출 실패'
      setMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  const isOwner = useMemo(
    () => owner && account && owner.toLowerCase() === account.toLowerCase(),
    [owner, account]
  )

  return (
<div className="font-sans min-h-screen p-8 sm:p-20 max-w-4xl mx-auto bg-[#eaf4ff]">

      {/* Header */}
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold">Tip Jar</h1>
  <div className="px-3 py-1 border rounded-md text-sm text-gray-700 bg-gray-50">
    윤지현 (92313489)
  </div>
</div>


      {/* Wallet */}
      <section className="mb-6 p-4 border rounded-md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">계정</div>
            <div className="font-mono break-all">
              {account ?? '연결되지 않음'}
            </div>
          </div>

          <button
            onClick={onConnect}
            disabled={loading}
className="rounded-md px-3 py-2 text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50"
          >
            {account ? '지갑 새로고침' : '지갑 연결'}
          </button>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          네트워크: {chainName ?? '-'} ({chainId ?? '-'})
        </div>
      </section>

      {/* Contract Balance */}
      <section className="mb-6 p-4 border rounded-md">
        <div className="text-sm text-gray-500">컨트랙트 잔액 (ETH)</div>
        <div className="text-xl font-semibold">{balanceEth}</div>
      </section>

      {/* Owner */}
      <section className="mb-6 p-4 border rounded-md">
        <div className="text-sm text-gray-500">오너</div>
        <div className="font-mono break-all">{owner || '-'}</div>
      </section>

      {/* Input */}
      <section className="mb-6 p-4 border rounded-md">
        <div className="mb-3">
          <label className="block text-sm text-gray-500 mb-1">
            Tip 금액 (ETH)
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            placeholder="0.01"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSendTip}
            disabled={loading}
className="rounded-md px-3 py-2 text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50"
          >
            Tip 보내기
          </button>

          {isOwner && (
            <button
              onClick={onWithdraw}
              disabled={loading}
className="rounded-md px-3 py-2 text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50"
            >
              잔액 인출
            </button>
          )}
        </div>
      </section>

      {/* Status message */}
      {message && (
        <div className="mt-4 p-3 border rounded-md bg-gray-50 text-sm break-all">
          {message}
        </div>
      )}
    </div>
  )
}

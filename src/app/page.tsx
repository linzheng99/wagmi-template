'use client'

import { useAccount, useConnect, useDisconnect, useSwitchAccount, useConnections, useAccountEffect, useBalance, useChains, useChainId, useSwitchChain } from 'wagmi'
import { getConfig } from '@/wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';

function App() {
  const config = getConfig()
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchAccount } = useSwitchAccount()
  const connections = useConnections()
  const balance = useBalance({
    address: account.address,
  })
  const chains = useChains()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()

  // useAccountEffect({
  //   config,
  //   onConnect(data) {
  //     console.log('Connected!', data)
  //   },
  //   onDisconnect() {
  //     console.log('Disconnected!')
  //   },
  // })




  return (
    <div>
      <div>
        <ConnectButton />
      </div>
      {
        account.isConnected && (
          <div className='flex items-center gap-4'>
            <div className='flex gap-2'>
              <span>钱包地址:</span>
              {account.address}
            </div>
            <Button
              variant={'destructive'}
              className='cursor-pointer'
              onClick={() => disconnect()}>
              断开连接
            </Button>
          </div>
        )
      }
      {
        account.isConnected && (
          <div className='flex items-center gap-4'>
            <div className='flex gap-2'>
              <span>余额:</span>
              {balance.isLoading ? (
                <span>加载中...</span>
              ) : balance.data ? (
                <span>{balance.data.formatted} {balance.data.symbol}</span>
              ) : (
                <span>无法获取余额</span>
              )}
            </div>
          </div>
        )
      }
      <div>
        {chains.map(c => {
          return <div>{c.name} {c.id} {chainId}</div>
        })}
      </div>
      <div>
        {chains.map(chain => (
          <Button
            key={chain.id}
            variant={chainId === chain.id ? 'secondary' : 'default'}
            disabled={isPending || chainId === chain.id}
            onClick={() => switchChain({ chainId: chain.id as 1 | 11155111 | 59141 | 6342})}
          >
            {chain.name}
          </Button>
        ))}
      </div>
      <div>
        {connections.map(connection => (
          <button
            key={connection.connector.id}
            onClick={() => switchAccount({ connector: connection.connector })}>
            {connection.connector.name} - {connection.accounts[0]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default App

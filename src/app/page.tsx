'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit';

function App() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <>
      <div>
        <ConnectButton />
      </div>
      <div className='text-red-500'>
        123
      </div>
    </>
  )
}

export default App

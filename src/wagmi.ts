import { http, cookieStorage, createConfig, createStorage } from 'wagmi'
import { mainnet, sepolia, lineaSepolia, megaethTestnet } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

export function getConfig() {
  return createConfig({
    chains: [mainnet, sepolia, lineaSepolia, megaethTestnet],
    connectors: [
      injected(),
      coinbaseWallet(),
      walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID as string }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [lineaSepolia.id]: http(),
      [megaethTestnet.id]: http(),
    },
  })
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>
  }
}

// components/WalletProviderWrapper.tsx
"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

export function WalletProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // Set up which network to use
  const network = WalletAdapterNetwork.Devnet; // Change to Mainnet when ready for production

  // Set up RPC endpoint
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_RPC_ENDPOINT) {
      return process.env.NEXT_PUBLIC_RPC_ENDPOINT;
    }
    return clusterApiUrl(network);
  }, [network]);

  // Set up which wallets to support
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

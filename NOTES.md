# NOTES

##

```bash
# Create a new Next.js project
npx create-next-app@latest solana-voting-frontend
cd solana-voting-frontend

# Install dependencies for Solana and Anchor
npm install \
  @solana/web3.js \
  @project-serum/anchor \
  @solana/wallet-adapter-react \
  @solana/wallet-adapter-react-ui \
  @solana/wallet-adapter-base \
  @solana/wallet-adapter-wallets \
  bs58 \
  recharts
```

### Project Structure

```text
solana-voting-frontend/
├── app/
│   ├── page.tsx            # Main page with voting UI
│   ├── admin/
│   │   └── page.tsx        # Admin page for initializing and ending votes
│   ├── results/
│   │   └── page.tsx        # Results page
│   └── layout.tsx          # Main layout with wallet provider
├── components/
│   ├── WalletContextProvider.tsx    # Wallet connection context
│   ├── InitializeVoting.tsx         # Form to initialize voting
│   ├── VoteForm.tsx                 # Form to cast votes
│   ├── RegisterUser.tsx             # User registration
│   ├── ResultsDisplay.tsx           # Display vote results
│   └── AdminControls.tsx            # Admin controls
├── utils/
│   ├── constants.ts                 # Constants like program ID
│   ├── idl.ts                       # Export the IDL
│   └── anchor-client.ts             # Anchor client setup
└── public/
    └── ...                         # Static assets
```

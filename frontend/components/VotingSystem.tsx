// components/VotingSystem.tsx
"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
// import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, web3, BN } from "@project-serum/anchor";

import dynamic from "next/dynamic";
const WalletMultiButtonDynamic = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

// Import our IDL
import idl from "@/idl/voting_system.json";

const programID = new PublicKey(idl.metadata.address);

export function VotingSystem() {
  const wallet = useWallet();
  const [votingAccount, setVotingAccount] = useState<PublicKey | null>(null);
  const [userAccount, setUserAccount] = useState<PublicKey | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [votes, setVotes] = useState<number[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newCandidates, setNewCandidates] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Function to get anchor provider
  const getProvider = () => {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "http://localhost:8899"
    );
    const provider = new AnchorProvider(connection, wallet as any, {
      preflightCommitment: "processed",
    });
    return provider;
  };

  // Function to check if voting system is initialized
  const checkVotingAccount = async () => {
    if (!wallet.publicKey) return;

    try {
      setLoading(true);
      const provider = getProvider();
      const program = new Program(idl as any, programID, provider);

      // Derive PDA for voting account (you might need to adjust this based on how your program seeds are set up)
      const [votingAccountPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("voting"), wallet.publicKey.toBuffer()],
        program.programId
      );

      try {
        const account = await program.account.votingAccount.fetch(
          votingAccountPDA
        );
        setVotingAccount(votingAccountPDA);
        setCandidates(account.candidates);
        setVotes(account.votes.map((v) => v.toNumber()));
        setHasEnded(account.hasEnded);

        // Determine if current wallet is admin (creator of voting account)
        setIsAdmin(votingAccountPDA.equals(wallet.publicKey));
      } catch (e) {
        // Account doesn't exist yet
        console.log("Voting account not initialized");
      }

      // Check user account
      const [userAccountPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("user"), wallet.publicKey.toBuffer()],
        program.programId
      );

      try {
        const account = await program.account.userAccount.fetch(userAccountPDA);
        setUserAccount(userAccountPDA);
        setHasVoted(account.hasVoted);
      } catch (e) {
        // User account doesn't exist yet
        console.log("User account not initialized");
      }
    } catch (error) {
      console.error("Error checking accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize voting system
  const initializeVoting = async () => {
    if (!wallet.publicKey || !newCandidates.trim()) return;

    try {
      setLoading(true);
      const provider = getProvider();
      const program = new Program(idl as any, programID, provider);

      // Parse candidates from comma-separated string
      const candidatesList = newCandidates
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (candidatesList.length < 2) {
        alert("Please enter at least two candidates");
        setLoading(false);
        return;
      }

      // Generate a new keypair for the voting account
      const votingKeypair = web3.Keypair.generate();

      const tx = await program.methods
        .initialize(candidatesList)
        .accounts({
          votingAccount: votingKeypair.publicKey,
          user: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([votingKeypair])
        .rpc();

      console.log("Transaction signature:", tx);
      setVotingAccount(votingKeypair.publicKey);
      setCandidates(candidatesList);
      setVotes(Array(candidatesList.length).fill(0));

      alert("Voting system initialized successfully!");
    } catch (error) {
      console.error("Error initializing voting:", error);
      alert(`Error initializing voting: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Initialize user account
  const initializeUserAccount = async () => {
    if (!wallet.publicKey) return;

    try {
      setLoading(true);
      const provider = getProvider();
      const program = new Program(idl as any, programID, provider);

      // Derive PDA for user account
      const [userAccountPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("user"), wallet.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .initializeUserAccount()
        .accounts({
          userAccount: userAccountPDA,
          user: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log("User account initialized:", tx);
      setUserAccount(userAccountPDA);
      setHasVoted(false);

      alert("User account initialized successfully!");
    } catch (error) {
      console.error("Error initializing user account:", error);
      alert(`Error initializing user account: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Vote for a candidate
  const vote = async (candidateIndex: number) => {
    if (!wallet.publicKey || !votingAccount || !userAccount) return;

    try {
      setLoading(true);
      const provider = getProvider();
      const program = new Program(idl as any, programID, provider);

      const tx = await program.methods
        .vote(new BN(candidateIndex))
        .accounts({
          votingAccount: votingAccount,
          userAccount: userAccount,
          user: wallet.publicKey,
        })
        .rpc();

      console.log("Vote submitted:", tx);

      // Update local state
      const newVotes = [...votes];
      newVotes[candidateIndex]++;
      setVotes(newVotes);
      setHasVoted(true);

      alert("Vote submitted successfully!");
    } catch (error) {
      console.error("Error voting:", error);
      alert(`Error voting: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // End voting
  const endVoting = async () => {
    if (!wallet.publicKey || !votingAccount) return;

    try {
      setLoading(true);
      const provider = getProvider();
      const program = new Program(idl as any, programID, provider);

      const tx = await program.methods
        .endVoting()
        .accounts({
          votingAccount: votingAccount,
        })
        .rpc();

      console.log("Voting ended:", tx);
      setHasEnded(true);

      alert("Voting has ended!");
    } catch (error) {
      console.error("Error ending voting:", error);
      alert(`Error ending voting: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Check accounts when wallet connects
  useEffect(() => {
    if (wallet.publicKey) {
      checkVotingAccount();
    }
  }, [wallet.publicKey]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Solana Voting System</h1>

      <div className="mb-6 flex justify-between items-center">
        <div>
          {wallet.connected && (
            <p>
              Connected: {wallet.publicKey?.toString().slice(0, 6)}...
              {wallet.publicKey?.toString().slice(-4)}
            </p>
          )}
        </div>
        <WalletMultiButtonDynamic />
      </div>

      {loading && (
        <div className="my-6 text-center">
          <p className="text-lg">Loading...</p>
        </div>
      )}

      {!wallet.connected ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <p className="mb-4">Connect your wallet to use the voting system</p>
        </div>
      ) : (
        <>
          {!votingAccount && !loading && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-xl font-bold mb-4">
                Initialize Voting System
              </h2>
              <div className="mb-4">
                <label className="block mb-2">
                  Enter candidates (comma-separated):
                  <input
                    type="text"
                    value={newCandidates}
                    onChange={(e) => setNewCandidates(e.target.value)}
                    placeholder="Candidate 1, Candidate 2, Candidate 3"
                    className="w-full p-2 border rounded mt-1"
                  />
                </label>
              </div>
              <button
                onClick={initializeVoting}
                disabled={loading || !newCandidates.trim()}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                Initialize Voting
              </button>
            </div>
          )}

          {votingAccount && !userAccount && !loading && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-xl font-bold mb-4">Register to Vote</h2>
              <p className="mb-4">You need to register before you can vote.</p>
              <button
                onClick={initializeUserAccount}
                disabled={loading}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                Register
              </button>
            </div>
          )}

          {votingAccount && userAccount && !loading && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-xl font-bold mb-4">
                {hasEnded ? "Voting Results" : "Current Poll"}
              </h2>

              {candidates.map((candidate, index) => (
                <div
                  key={index}
                  className="mb-4 p-4 border rounded flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{candidate}</p>
                    <p>Votes: {votes[index]}</p>
                  </div>
                  {!hasVoted && !hasEnded && (
                    <button
                      onClick={() => vote(index)}
                      disabled={loading || hasVoted}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:bg-gray-400"
                    >
                      Vote
                    </button>
                  )}
                </div>
              ))}

              {hasVoted && !hasEnded && (
                <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded">
                  <p>You have already voted. Waiting for results...</p>
                </div>
              )}

              {hasEnded && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
                  <p>This vote has ended.</p>
                  {votes.length > 0 && (
                    <p className="font-bold mt-2">
                      Winner: {candidates[votes.indexOf(Math.max(...votes))]}{" "}
                      with {Math.max(...votes)} votes
                    </p>
                  )}
                </div>
              )}

              {isAdmin && !hasEnded && (
                <div className="mt-6">
                  <button
                    onClick={endVoting}
                    disabled={loading}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
                  >
                    End Voting
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

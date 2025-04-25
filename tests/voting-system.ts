// Import Anchor libraries and utilities
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
// Import the generated TypeScript types for our program
import { VotingSystem } from "../target/types/voting_system";
// Import Solana web3 libraries for working with accounts, keypairs, etc.
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
// Import testing assertion library
import { expect } from "chai";

/**
 * Test suite for the voting-system program
 * This file demonstrates how to test Solana programs using Anchor's testing framework
 */
describe("voting-system", () => {
  // === TEST SETUP ===

  // Configure the client to use the local Solana cluster
  // This reads environment variables to set up the connection
  const provider = anchor.AnchorProvider.env();
  // Set the configured provider as the default for Anchor
  anchor.setProvider(provider);

  // Retrieve our program from the workspace using its name
  // The type annotation ensures TypeScript knows the structure of our program
  const program = anchor.workspace.VotingSystem as Program<VotingSystem>;

  // === ACCOUNT GENERATION ===

  // Generate a new keypair for the voting account
  // This will be used to store voting data on-chain
  const votingAccount = anchor.web3.Keypair.generate();

  // Generate keypairs for test user accounts
  // These represent different voters in our system
  const userAccount1 = anchor.web3.Keypair.generate();
  const userAccount2 = anchor.web3.Keypair.generate();

  // === TEST DATA ===

  // Define candidate names for our voting system
  const candidates = ["Alice", "Bob", "Charlie"];

  // === TEST CASES ===

  /**
   * Test Case 1: Initialize the voting system
   *
   * This test verifies that:
   * - The voting account can be created
   * - Candidates are properly stored
   * - Vote counters are initialized to zero
   * - The voting state is set to not ended
   */
  it("Initializes the voting system", async () => {
    // Call the initialize instruction with our candidate list
    await program.methods
      .initialize(candidates)
      .accounts({
        votingAccount: votingAccount.publicKey,
        user: provider.wallet.publicKey, // The default wallet pays for account creation
        systemProgram: SystemProgram.programId, // System program handles account creation
      })
      .signers([votingAccount]) // The new account must sign to be created
      .rpc(); // Send the transaction to the blockchain

    // Fetch the voting account data from the blockchain to verify it
    const account = await program.account.votingAccount.fetch(
      votingAccount.publicKey
    );

    // === ASSERTIONS ===

    // Verify the candidates were stored correctly
    expect(account.candidates).to.deep.equal(candidates);

    // Verify the votes array was created with the correct length
    expect(account.votes.length).to.equal(candidates.length);

    // Verify the voting state is initially set to not ended
    expect(account.hasEnded).to.be.false;

    // Check that all votes are initialized to 0
    account.votes.forEach((vote) => {
      expect(vote).to.equal(0);
    });
  });

  /**
   * Test Case 2: Initialize user accounts and process votes
   *
   * This comprehensive test verifies:
   * - User accounts can be created
   * - Users can vote successfully
   * - Vote counts are updated correctly
   * - User state changes to "has voted" after voting
   */
  it("Initializes user accounts and allows users to vote", async () => {
    // === USER 1 SETUP ===

    // Create and initialize the first user account
    await program.methods
      .initializeUser() // Call the initializeUser instruction
      .accounts({
        userAccount: userAccount1.publicKey, // The account to initialize
        user: provider.wallet.publicKey, // The payer for the transaction
        systemProgram: SystemProgram.programId, // For account creation
      })
      .signers([userAccount1]) // The new account must sign to be created
      .rpc();

    // Verify user account was initialized with hasVoted = false
    const user1Data = await program.account.userAccount.fetch(
      userAccount1.publicKey
    );
    expect(user1Data.hasVoted).to.be.false;

    // === USER 1 VOTING ===

    // User 1 votes for candidate 0 (Alice)
    await program.methods
      .vote(0) // Vote for the first candidate (index 0)
      .accounts({
        votingAccount: votingAccount.publicKey, // The main voting data account
        userAccount: userAccount1.publicKey, // User's account to mark as voted
        user: provider.wallet.publicKey, // User must sign the transaction
      })
      .rpc();

    // === VERIFICATION AFTER USER 1 VOTES ===

    // Fetch the updated voting and user account data
    const votingData = await program.account.votingAccount.fetch(
      votingAccount.publicKey
    );
    const userData = await program.account.userAccount.fetch(
      userAccount1.publicKey
    );

    // Verify Alice received 1 vote
    expect(votingData.votes[0]).to.equal(1);

    // Verify user is now marked as having voted
    expect(userData.hasVoted).to.be.true;

    // === USER 2 SETUP ===

    // Create and initialize the second user account
    await program.methods
      .initializeUser()
      .accounts({
        userAccount: userAccount2.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([userAccount2])
      .rpc();

    // === USER 2 VOTING ===

    // User 2 votes for candidate 1 (Bob)
    await program.methods
      .vote(1) // Vote for the second candidate (index 1)
      .accounts({
        votingAccount: votingAccount.publicKey,
        userAccount: userAccount2.publicKey,
        user: provider.wallet.publicKey,
      })
      .rpc();

    // === VERIFICATION AFTER USER 2 VOTES ===

    // Verify both votes were counted correctly
    const updatedVotingData = await program.account.votingAccount.fetch(
      votingAccount.publicKey
    );
    expect(updatedVotingData.votes[0]).to.equal(1); // Alice still has 1 vote
    expect(updatedVotingData.votes[1]).to.equal(1); // Bob now has 1 vote
    expect(updatedVotingData.votes[2]).to.equal(0); // Charlie has 0 votes
  });

  /**
   * Test Case 3: Prevent double voting
   *
   * This test verifies the security mechanism that prevents
   * a user from voting multiple times
   */
  it("Prevents a user from voting twice", async () => {
    try {
      // User 1 tries to vote again (for Charlie this time)
      await program.methods
        .vote(2)
        .accounts({
          votingAccount: votingAccount.publicKey,
          userAccount: userAccount1.publicKey,
          user: provider.wallet.publicKey,
        })
        .rpc();

      // If we reach this point, the test failed because
      // the transaction should have been rejected
      expect.fail("Expected transaction to fail due to user already voted");
    } catch (error) {
      // Check that the error contains our custom error message
      const errorMessage = error.toString();
      expect(errorMessage).to.include("AlreadyVoted");
    }
  });

  /**
   * Test Case 4: Prevent invalid votes
   *
   * This test verifies that votes for non-existent candidates
   * are rejected with the appropriate error
   */
  it("Prevents voting for an invalid candidate", async () => {
    // Create a new user account for this test
    const userAccount3 = anchor.web3.Keypair.generate();

    // Initialize the new user account
    await program.methods
      .initializeUser()
      .accounts({
        userAccount: userAccount3.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([userAccount3])
      .rpc();

    try {
      // Try to vote for a non-existent candidate (index 10)
      await program.methods
        .vote(10) // This index is out of bounds (we only have 3 candidates)
        .accounts({
          votingAccount: votingAccount.publicKey,
          userAccount: userAccount3.publicKey,
          user: provider.wallet.publicKey,
        })
        .rpc();

      // If we reach this point, the test failed
      expect.fail(
        "Expected transaction to fail due to invalid candidate index"
      );
    } catch (error) {
      // Check for the appropriate error message
      const errorMessage = error.toString();
      expect(errorMessage).to.include("InvalidCandidate");
    }
  });

  /**
   * Test Case 5: End the voting process
   *
   * This test verifies that the voting process can be ended
   * and the state is updated correctly
   */
  it("Ends the voting", async () => {
    // Call the end_voting instruction
    await program.methods
      .endVoting()
      .accounts({
        votingAccount: votingAccount.publicKey,
      })
      .rpc();

    // Verify the voting has been marked as ended
    const votingData = await program.account.votingAccount.fetch(
      votingAccount.publicKey
    );
    expect(votingData.hasEnded).to.be.true;

    // Final verification of vote counts
    // At this point, Alice has 1 vote, Bob has 1 vote, and Charlie has 0 votes
  });
});

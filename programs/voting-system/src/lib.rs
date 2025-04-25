// Importing the entire Anchor Lang prelude which provides essential types, macros, and functions
// for Solana program development using the Anchor framework
use anchor_lang::prelude::*;

// Declares the program ID (public key) of this Solana program
// This ID must match the deployed program ID on the Solana blockchain
declare_id!("DKrPYCwiCPfCy2JHCeghPZj9BXZjWB2FA762D36eSLCd");

// The #[program] macro defines the program module containing all the program's instructions
#[program]
pub mod voting_system {
    // Import everything from the parent scope
    use super::*;

    // INSTRUCTION #1: Initialize the voting system
    // This instruction creates and initializes the main voting account with the provided candidates
    // Parameters:
    // - ctx: The context containing all accounts needed for this instruction
    // - candidates: A vector of strings representing candidate names
    pub fn initialize(ctx: Context<Initialize>, candidates: Vec<String>) -> Result<()> {
        // Get a mutable reference to the voting account from the context
        let voting_account = &mut ctx.accounts.voting_account;
        
        // Store the candidates in the voting account
        voting_account.candidates = candidates;
        
        // Initialize the votes vector with zeros, one zero for each candidate
        // This creates a vector with the same length as candidates, filled with zeros
        voting_account.votes = vec![0; voting_account.candidates.len()];
        
        // Set the voting state to not ended
        voting_account.has_ended = false;

        // Return success
        Ok(())
    }

    // INSTRUCTION #2: Initialize a user account (standalone method)
    // This creates a user account which tracks whether a user has voted
    // Parameters:
    // - ctx: The context containing all accounts needed for this instruction
    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        // Get a mutable reference to the user account from the context
        let user_account = &mut ctx.accounts.user_account;
        
        // Set the initial voting state to false (user has not voted)
        user_account.has_voted = false;
        
        // Return success
        Ok(())
    }

    // INSTRUCTION #3: Initialize a user account with PDA (Program Derived Address)
    // This is an alternative method to create a user account using a PDA
    // Parameters:
    // - ctx: The context containing all accounts needed for this instruction
    pub fn initialize_user_account(ctx: Context<InitializeUserAccount>) -> Result<()> {
        // Get a mutable reference to the user account from the context
        let user_account = &mut ctx.accounts.user_account;
        
        // Set the initial voting state to false (user has not voted)
        user_account.has_voted = false;
        
        // Return success
        Ok(())
    }

    // INSTRUCTION #4: Allow users to vote
    // This instruction processes a vote for a specific candidate
    // Parameters:
    // - ctx: The context containing all accounts needed for this instruction
    // - candidate_index: The index of the candidate the user wants to vote for
    pub fn vote(ctx: Context<Vote>, candidate_index: u32) -> Result<()> {
        // Get mutable references to the voting and user accounts from the context
        let voting_account = &mut ctx.accounts.voting_account;
        let user_account = &mut ctx.accounts.user_account;

        // VALIDATION #1: Check if the user has already voted 
        // If they have, return an error
        if user_account.has_voted {
            return Err(ErrorCode::AlreadyVoted.into());
        }

        // VALIDATION #2: Check if the candidate index is valid
        // If the index is out of bounds, return an error
        if candidate_index >= voting_account.candidates.len() as u32 {
            return Err(ErrorCode::InvalidCandidate.into());
        }

        // EXECUTION: Cast the vote by incrementing the vote count for the selected candidate
        voting_account.votes[candidate_index as usize] += 1;
        
        // Mark the user as having voted
        user_account.has_voted = true;

        // Return success
        Ok(())
    }

    // INSTRUCTION #5: End the voting process
    // This instruction marks the voting as complete
    // Parameters:
    // - ctx: The context containing all accounts needed for this instruction
    pub fn end_voting(ctx: Context<EndVoting>) -> Result<()> {
        // Get a mutable reference to the voting account from the context
        let voting_account = &mut ctx.accounts.voting_account;
        
        // Mark the voting as ended
        voting_account.has_ended = true;

        // Return success
        Ok(())
    }
}

// ACCOUNT CONTEXTS

// Define the account context for the initialize instruction
// This struct specifies which accounts are required and how they should be validated
#[derive(Accounts)]
pub struct Initialize<'info> {
    // The voting_account is initialized in this instruction
    // init: This account will be created in this transaction
    // payer = user: The 'user' account will pay for the account creation
    // space = 8 + 40 + (4 * 100) + 1: Allocate space for:
    //   - 8 bytes for account discriminator (added by Anchor)
    //   - 40 bytes for candidates data (estimated space for Vec<String>)
    //   - 400 bytes for votes data (4 bytes per u32 * 100 potential candidates)
    //   - 1 byte for the boolean has_ended flag
    #[account(init, payer = user, space = 8 + 40 + (4 * 100) + 1)]
    pub voting_account: Account<'info, VotingAccount>,
    
    // The user account must be mutable as it will pay for the transaction
    #[account(mut)]
    pub user: Signer<'info>,
    
    // The system program is required for creating new accounts
    pub system_program: Program<'info, System>,
}

// Define the account context for initializing a user
#[derive(Accounts)]
pub struct InitializeUser<'info> {
    // The user_account is initialized in this instruction
    // space = 8 + 1: Allocate space for:
    //   - 8 bytes for account discriminator
    //   - 1 byte for the boolean has_voted flag
    #[account(init, payer = user, space = 8 + 1)]
    pub user_account: Account<'info, UserAccount>,
    
    // The user account must be mutable as it will pay for the transaction
    #[account(mut)]
    pub user: Signer<'info>,
    
    // The system program is required for creating new accounts
    pub system_program: Program<'info, System>,
}

// Define the account context for initializing a user account as a PDA
#[derive(Accounts)]
pub struct InitializeUserAccount<'info> {
    // The user_account is initialized as a PDA (Program Derived Address)
    // seeds = [b"user", user.key().as_ref()]: The PDA is derived from:
    //   - The string "user"
    //   - The user's public key
    // bump: Automatically adds the bump seed for the PDA
    #[account(init, payer = user, space = 8 + 1, seeds = [b"user", user.key().as_ref()], bump)]
    pub user_account: Account<'info, UserAccount>,
    
    // The user account must be mutable as it will pay for the transaction
    #[account(mut)]
    pub user: Signer<'info>,
    
    // The system program is required for creating new accounts
    pub system_program: Program<'info, System>,
}

// Define the account context for the vote instruction
#[derive(Accounts)]
pub struct Vote<'info> {
    // The voting account must be mutable as we'll update vote counts
    #[account(mut)]
    pub voting_account: Account<'info, VotingAccount>,
    
    // The user account must be mutable as we'll mark it as having voted
    #[account(mut)]
    pub user_account: Account<'info, UserAccount>,
    
    // The user must sign the transaction to vote
    #[account(mut)]
    pub user: Signer<'info>,
}

// Define the account context for ending the voting
#[derive(Accounts)]
pub struct EndVoting<'info> {
    // The voting account must be mutable as we'll update its state
    #[account(mut)]
    pub voting_account: Account<'info, VotingAccount>,
}

// ACCOUNT DATA STRUCTURES

// Define the structure of the voting account's data
#[account]
pub struct VotingAccount {
    // List of candidate names
    pub candidates: Vec<String>,
    
    // Vote counts for each candidate (parallel array to candidates)
    pub votes: Vec<u32>,
    
    // Flag indicating if the voting has ended
    pub has_ended: bool,
}

// Define the structure of the user account's data
#[account]
pub struct UserAccount {
    // Flag indicating if the user has voted
    pub has_voted: bool,
}

// CUSTOM ERROR CODES

// Define custom error codes for the program
#[error_code]
pub enum ErrorCode {
    // Error when a user tries to vote more than once
    #[msg("User has already voted")]
    AlreadyVoted,
    
    // Error when a user tries to vote for a non-existent candidate
    #[msg("Invalid candidate index")]
    InvalidCandidate,
}
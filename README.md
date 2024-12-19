# MembershipDAO
## Overview
The MembershipDAO contract is an ERC-1155-based smart contract that facilitates membership management and governance through NFTs. Users can purchase, cancel, or vote on new memberships, while owner can propose new memberships and manage funds.

### listMembership (Owner Only)
Owner list first membership by specifying its name and cost.

### Buy Membership
Enables users to purchase a membership by sending the required Ether. Upon purchase, the user is issued an NFT representing their membership.

### Cancel Membership
Allows users to cancel their active membership. The membership NFT is burned, and the user's membership status is deactivated.

### List New Membership (Owner Only)
Allows the owner to propose a new membership by providing details such as name, cost, and initial vote count. The proposal can be voted on by members. 

### Vote on New Membership
Allows members with active memberships to vote on proposed memberships. Each user can vote only once per proposal.

### Approve New Membership
The owner can approve a new membership if it receives sufficient votes. Upon approval, NFTs are minted for voters, and the proposal is marked as approved.

### Withdraw Funds (Owner Only)
Enables the owner to withdraw the Ether balance stored in the contract.

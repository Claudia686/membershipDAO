// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MembershipDAO is ERC1155, Ownable {
    /**
     * @dev The request value doesn't match the sent value.
     */
    error MembershipDAO_IncorrectValueSent(uint256 requiredValue, uint256 sentValue);

    /**
     * @dev Error thrown when an address tries to purchase a membership it already owns.
     */
    error MembershipDAO_MembershipAlreadyPurchased(address sender);

    /**
     * @dev Error thrown when a user attempts to cancel a membership that is not active.
     */
     error MembershipDAO_NoActiveMembershipToCancel(address user);

    /**
     * @notice User is not eligible to vote.
     */
    error MembershipDAO_UserNotEligibleToVote(address user);

    /**
     * @notice Invalid new membership ID.
     */
    error MembershipDAO_NewMembershipIsInvalid(uint256 newMembershipId);

    /**
     * @notice User has already voted on this membership.
     */
    error MembershipDAO_UserAlreadyVoted(address user, uint256 newMembershipId);

    uint256 public totalMemberships;
    uint256 public totalNewMembership;

    struct Membership {
        string name;
        uint256 cost;
    }

    struct NewMembership {
        string name;
        uint256 cost;
        uint256 voteCount;
        bool isApproved;
    }

    /**
     * @dev Memberships:
     * Store membership details, each membership has a unique ID.
     * The value is a `Membership` struct containing the name and the cost of the membership.
     * 
     * @dev HasMembership:
     * Tracks the membership status of an address. If the value is `true`, the address
     * has an active membership. If `false`, the membership doesn't exist.
     * 
     * @dev newMembership:
     * Store memberships details, each membership has a unique ID.
     * 
     * @dev hasVoted:
     * Tracks the newMembership status of an address and ID. 
     * If the value is `true`, the address has voted. 
     */        
    mapping(uint256 => Membership) public memberships;
    mapping(address => bool) public hasMembership;

    mapping(uint256 => NewMembership) public newMembership;
    mapping(address => mapping(uint256 => bool)) public hasVoted;

    /**
     * @dev Emit MembershipListed event with the name and cost of the membership.
     * @dev Emit MembershipPurchased event with the user address and the membershipId.
     * @dev Emit MembershipCanceled event with the user address and the membershipId.
     * @dev Emit ListedNewMembership event with the user address and the newMembership.
     * @dev Emit HasVoted event with the user address and the newMembershipId.
     */
    event MembershipListed(string name, uint256 cost);
    event MembershipPurchased(address indexed user, uint256 membershipId);
    event MembershipCanceled(address indexed user, uint256 membershipId);
    event ListedNewMembership(address indexed user, uint256 newMembership);
    event HasVoted(address indexed user, uint256 newMembershipId);

    constructor(address owner) ERC1155(owner) Ownable(owner) {}

    /**
     * @dev Throws if caller is not the owner.
     * @param _name The name of the membership.
     * @param _cost The cost of the membership.
     * @dev Increment `totalMemberships` when listing a membership.
     * Emits a {listMembership} event.
     */
    function listMembership(string memory _name, uint256 _cost) public onlyOwner {
        memberships[totalMemberships] = Membership({
            name: _name,
            cost: _cost
        });
        totalMemberships++;
        emit MembershipListed(_name, _cost);
    }

    /**
     * @notice Purchase a membership by sending the required cost.
     * @dev Reverts if the payment amount is incorrect or if the caller already has a membership.
     * @param membershipId The ID of the membership to purchase. 
     * @dev Returns true if the user purchased a membership, false otherwise.
     * @dev Mints 1 NFT to the user after buying a membership.
     * @notice The NFT represents proof of membership.
     * Emits a {MembershipPurchased} event. 
     */
    function buyMembership(uint256 membershipId) public payable {
        uint256 cost = memberships[membershipId].cost;
        if (msg.value != cost) {
            revert MembershipDAO_IncorrectValueSent(cost, msg.value);
        }

        if (hasMembership[msg.sender]) {
            revert MembershipDAO_MembershipAlreadyPurchased(msg.sender);
        }

        hasMembership[msg.sender] = true;
        _mint(msg.sender, membershipId, 1, "");
        emit MembershipPurchased(msg.sender, membershipId);
    }

    /**
     * @param membershipId The ID of the membership to purchase.
     * @notice Checks for an active membership to cancel.
     * @dev Burn the membership token.
     * @notice Mark the user as no longer having a membership.
     * Emits a {MembershipCanceled} event.
     */
    function cancelMembership(uint256 membershipId) public {
        if (!hasMembership[msg.sender]) {
            revert MembershipDAO_NoActiveMembershipToCancel(msg.sender);
        }

        _burn(msg.sender, membershipId, 1);
        hasMembership[msg.sender] = false;
        emit MembershipCanceled(msg.sender, membershipId);
    }

    /**
     * @notice Creates a new membership with the given details.
     * @dev Stores the membership in the newMembership mapping,
     * and increments totalNewMembership.
     * @param _name Name of the membership.
     * @param _cost Cost of the membership.
     * @param _voteCount Initial vote count for the membership.
     * @param _isApproved Approval status of the membership.
     * Emits a {ListedNewMembership} event.
     */
    function listNewMembership(
        string memory _name, 
        uint256 _cost, 
        uint256 _voteCount, 
        bool _isApproved
    ) public onlyOwner {

        newMembership[totalNewMembership] = NewMembership({
           name: _name,
           cost: _cost,
           voteCount: _voteCount,
           isApproved: _isApproved
            });

        emit ListedNewMembership(msg.sender, totalNewMembership);
        totalNewMembership++;
    }

    /**
     * @notice Allows a user to vote for a new membership.
     * @dev Checks user eligibility, membership validity, and duplicate votes.
     * Reverts with appropriate errors if conditions are not met.
     * @param newMembershipId The ID of the membership being voted for.
     * Emits a {HasVoted} event.
     */
    function vote(uint256 newMembershipId) public {
        if (!hasMembership[msg.sender]) {
            revert MembershipDAO_UserNotEligibleToVote(msg.sender);
        }

        if (newMembershipId >= totalNewMembership) {
            revert MembershipDAO_NewMembershipIsInvalid(newMembershipId);
        }

        if (hasVoted[msg.sender][newMembershipId]) { 
            revert MembershipDAO_UserAlreadyVoted(msg.sender, newMembershipId);
        }

        hasVoted[msg.sender][newMembershipId] = true;
        newMembership[newMembershipId].voteCount++;
        emit HasVoted(msg.sender, newMembershipId);
    }
}
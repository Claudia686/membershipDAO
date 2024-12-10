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

    uint256 public totalMemberships;

    struct Membership {
        string name;
        uint256 cost;
    }

    /**
     * @dev Memberships:
     * Store membership details, each membership has a unique ID.
     * The value is a `Membership` struct containing the name and the cost of the membership.
     * 
     * @dev HasMembership:
     * Tracks the membership status of an address. If the value is `true`, the address
     * has an active membership. If `false`, the membership doesn't exist.
     */        
    mapping(uint256 => Membership) public memberships;
    mapping(address => bool) public hasMembership;

    /**
     * @dev Emit MembershipListed event with the name and cost of the membership.
     * @dev Emit MembershipPurchased event with the user address and the membershipId.
     * @dev Emit MembershipCanceled event with the user address and the membershipId.
     */
    event MembershipListed(string name, uint256 cost);
    event MembershipPurchased(address indexed user, uint256 membershipId);
    event MembershipCanceled(address indexed user, uint256 membershipId);

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
     * @dev Burn the membership token
     * @notice Mark the user as no longer having a membership
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
}
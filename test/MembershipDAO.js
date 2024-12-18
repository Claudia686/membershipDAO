const {
  ethers
} = require("hardhat");
const {
  expect
} = require("chai");

describe("MembershipDAO", () => {
  let membershipDAO, owner

  beforeEach(async () => {
    [owner, user, member] = await ethers.getSigners();

    // Deploy contract
    const MembershipDAO = await ethers.getContractFactory("MembershipDAO");
    membershipDAO = await MembershipDAO.deploy(owner.address);
    await membershipDAO.waitForDeployment();
  })

  describe("Deployment", () => {
    // Check for owner address
    it("Should have an owner", async () => {
      const contractOwner = await membershipDAO.owner();
      expect(contractOwner).to.equal(owner.address);
    })
  })

  describe("Listing", () => {
    let membershipName, membershipCost

    describe("Success", () => {
      beforeEach(async () => {
        membershipName = "Silver Membership";
        membershipCost = ethers.parseEther("2");
      })

      // Owner list a membership
      it("Should list a membership", async () => {
        const list = await membershipDAO.connect(owner).listMembership(membershipName, membershipCost);

        // Check for membership name and cost
        const membership = await membershipDAO.memberships(0);
        expect(membership.name).to.equal(membershipName);
        expect(membership.cost).to.equal(membershipCost);

        // Check for totalMemberships
        const totalMemberships = await membershipDAO.totalMemberships();
        expect(totalMemberships).to.equal(1);
      })

      // Emits MembershipListed event
      it("Emits membership listed event", async () => {
        await expect(membershipDAO.connect(owner).listMembership(membershipName, membershipCost)).
        to.emit(membershipDAO, "MembershipListed").withArgs(membershipName, membershipCost);
      })
    })

    describe("Failure", () => {
      // Rejects non-owner from listing memberships
      it("Rejects unauthorized user from listing", async () => {
        const membershipName = "Silver Membership";
        const membershipCost = ethers.parseEther("2");
        await expect(membershipDAO.connect(user).listMembership(membershipName, membershipCost))
          .to.be.reverted;
      })
    })
  })

  describe("Buy membership", () => {
    let membershipName, membershipCost

    describe("Success", () => {
      beforeEach(async () => {
        membershipName = "Silver Membership";
        membershipCost = ethers.parseEther("2");
        await membershipDAO.connect(owner).listMembership(membershipName, membershipCost);

        const memberships = await membershipDAO.totalMemberships();
        expect(memberships).to.equal(1);
      })

      // Buy first membership
      it("User buys first membership", async () => {

        // Get the user's token balance for the membership ID before minting
        const balanceBefore = await membershipDAO.balanceOf(user.address, 0);

        // Purchase the membership, which mints the token to the user
        await membershipDAO.connect(user).buyMembership(0, {
          value: membershipCost
        });

        // Get the user's token balance for the membership ID after minting
        const balanceAfter = await membershipDAO.balanceOf(user.address, 0)
        // Check that the balance has increased
        expect(balanceAfter).to.be.gt(balanceBefore)

        // Check that hasMembership is true for the user
        const hasMembership = await membershipDAO.hasMembership(user.address);
        expect(hasMembership).to.be.true;
      })

      // Emits MembershipPurchased event
      it("Emits membership purchased event", async () => {
        await expect(membershipDAO.connect(user).buyMembership(0, {
            value: membershipCost
          }))
          .to.emit(membershipDAO, "MembershipPurchased").withArgs(user.address, 0);
      })
    })

    describe("Failure", () => {
      beforeEach(async () => {
        membershipName = "Silver Membership";
        membershipCost = ethers.parseEther("2");
        await membershipDAO.connect(owner).listMembership(membershipName, membershipCost);
      })

      // Rejects duplicate membership purchase
      it("Reverts if user already purchased a membership", async () => {
        // User buy first membership
        await membershipDAO.connect(user).buyMembership(0, {
          value: membershipCost
        });

        // Same user tries to buy another membership
        await expect(membershipDAO.connect(user).buyMembership(0, {
          value: membershipCost
        })).to.be.revertedWithCustomError(membershipDAO, "MembershipDAO_MembershipAlreadyPurchased");
      })
    })
  })

  describe("Cancel membership", () => {
    let membershipName, membershipCost

    describe("Success", () => {
      beforeEach(async () => {
        membershipName = "Silver Membership";
        membershipCost = ethers.parseEther("2");

        // Owner list a membership
        await membershipDAO.connect(owner).listMembership(membershipName, membershipCost);

        // User buy a membership
        await membershipDAO.connect(user).buyMembership(0, {
          value: membershipCost
        });
      })

      it("Let user to cancel the membership and emits event", async () => {
        // Check balance before cancelation
        const balanceBeforeCancelation = await membershipDAO.balanceOf(user.address, 0);

        // Perform the cancellation
        await membershipDAO.connect(user).cancelMembership(0);

        // Get the balance after cancellation
        const balanceAfterCancelation = await membershipDAO.balanceOf(user.address, 0);

        // Check the balance should be zero after cancelation
        expect(balanceAfterCancelation).to.equal(0);

        // Ensure the user has no active membership
        const result = await membershipDAO.hasMembership(user.address);
        expect(result).to.equal(false);

        // Check for membership canceled event
        filter = membershipDAO.filters.MembershipCanceled(user.address, null);
        events = await membershipDAO.queryFilter(filter, -1);
        const args = events[0].args;

        // Validate the arguments
        expect(args[0]).to.equal(user.address);
        expect(args[1]).to.equal(0);
      })
    })

    describe("Failure", () => {
      // Reverts if no active membership exists
      it("Reject cancelling non-active membership", async () => {
        await expect(membershipDAO.connect(owner).cancelMembership(0))
          .to.be.revertedWithCustomError(membershipDAO, "MembershipDAO_NoActiveMembershipToCancel");
      })
    })
  })

  describe("List new membership", () => {
    let name, cost, voteCount, isApproved
    describe("Success", () => {

      beforeEach(async () => {
        name = "Gold Membership";
        cost = ethers.parseEther("4");
        voteCount = 0;
        isApproved = false;
      })

      // List new membership
      it("Owner list new membership", async () => {
        await membershipDAO.connect(owner).listNewMembership(name, cost, voteCount, isApproved);
        // Fetch the listed membership
        const result = await membershipDAO.newMembership(0)
        expect(result.name).to.equal(name);
        expect(result.cost).to.equal(cost);
        expect(result.voteCount).to.equal(0);
        expect(result.isApproved).to.equal(false);
      })

      // Emits ListedNewMembership event
      it("Emits listed new membership event", async () => {
        const currentTotalNewMembership = await membershipDAO.totalNewMembership();
        await expect(membershipDAO.connect(owner).listNewMembership(name, cost, voteCount, isApproved))
          .to.emit(membershipDAO, "ListedNewMembership").withArgs(owner.address, currentTotalNewMembership);
      })
    })

    describe("Failure", () => {
      beforeEach(async () => {
        name = "Gold Membership";
        cost = ethers.parseEther("4");
        voteCount = 0;
        isApproved = false;
      })

      // No-owner list new membership
      it("Reverts when nonowner tries to list a new membership", async () => {
        await expect(membershipDAO.connect(user).listNewMembership(name, cost, voteCount, isApproved))
          .to.be.reverted;
      })
    })
  })

  describe("Vote", () => {
    let membershipName, membershipCost, name, cost, voteCount, isApproved

    describe("Success", () => {
      beforeEach(async () => {
        // Define first membership
        membershipName = "Silver Membership";
        membershipCost = ethers.parseEther("2");

        // Define new membership
        name = "Gold Membership";
        cost = ethers.parseEther("4");
        voteCount = 0;
        isApproved = false;

        // List a membership
        await membershipDAO.connect(owner).listMembership(membershipName, membershipCost);

        // Buy memebrship
        await membershipDAO.connect(user).buyMembership(0, {
          value: membershipCost
        });

        // List a new memebrship
        await membershipDAO.connect(owner).listNewMembership(name, cost, voteCount, isApproved);
      })

      // User vote for the new membership
      it("Vote for the new membership", async () => {
        await membershipDAO.connect(user).vote(0);

        // Check for first vote
        const result = await membershipDAO.hasVoted(user.address, 0);
        expect(result).to.equal(true);

        // Check the vote count
        const newMembershipCount = await membershipDAO.newMembership(0);
        expect(newMembershipCount.voteCount).to.equal(1);
      })

      // Emits HasVoted event
      it("Emits has voted event", async () => {
        await expect(membershipDAO.connect(user).vote(0)).
        to.emit(membershipDAO, "HasVoted").withArgs(user.address, 0);
      });

      it("Checks for new membership total", async () => {
        // Retrive totalNewMembership
        const getTotalNewMembership = await membershipDAO.totalNewMembership();
        expect(getTotalNewMembership).to.equal(1);
      })
    })

    describe("Failure", () => {
      beforeEach(async () => {
        // Define first membership
        membershipName = "Silver Membership";
        membershipCost = ethers.parseEther("2");

        // Define new membership
        name = "Gold Membership";
        cost = ethers.parseEther("4");
        voteCount = 0;
        isApproved = false;

        // List a membership
        await membershipDAO.connect(owner).listMembership(membershipName, membershipCost);

        // Buy memebrship
        await membershipDAO.connect(user).buyMembership(0, {
          value: membershipCost
        });

        // List a new memebrship
        await membershipDAO.connect(owner).listNewMembership(name, cost, voteCount, isApproved);
      })

      // Reject voting without a valid membership
      it("Rejects user from voting without membership", async () => {
        await expect(membershipDAO.connect(owner).vote(0))
          .to.be.revertedWithCustomError(membershipDAO, "MembershipDAO_UserNotEligibleToVote");
      })

      // Rejects voting for invalid ID
      it("Reverts if voting for a non-existent membership ID", async () => {
        // Call vote function
        await expect(membershipDAO.connect(user).vote(10))
          .to.be.revertedWithCustomError(membershipDAO, "MembershipDAO_NewMembershipIsInvalid");
      })

      // Reject duplicate voting by the same user
      it("Rejects dublicate vote from the same user", async () => {
        // User submits their first vote
        await membershipDAO.connect(user).vote(0);
        // User submits their second vote, should fail
        await expect(membershipDAO.connect(user).vote(0))
          .to.be.revertedWithCustomError(membershipDAO, "MembershipDAO_UserAlreadyVoted");
      })
    })
  })

  describe("Approve", () => {
    let membershipName, membershipCost, name, cost
    describe("Success", () => {

      beforeEach(async () => {
        // Define first membership
        membershipName = "Silver Membership";
        membershipCost = ethers.parseEther("2");

        // Define new membership
        name = "Gold Membership";
        cost = ethers.parseEther("4");
        voteCount = 0;
        isApproved = false;

        // List first membership
        await membershipDAO.connect(owner).listMembership(membershipName, membershipCost);

        // User buy memebrship
        await membershipDAO.connect(user).buyMembership(0, {
          value: membershipCost
        });

        // Member buy memebrship
        await membershipDAO.connect(member).buyMembership(0, {
          value: membershipCost
        });

        // List a new memebrship
        await membershipDAO.connect(owner).listNewMembership(name, cost, voteCount, isApproved);

        // User vote
        await membershipDAO.connect(user).vote(0);

        // Member vote
        await membershipDAO.connect(member).vote(0);
      })

      it("Should approve and mint NFTs to user and member", async () => {
        // Get the balances before approval
        const userBalanceBefore = await membershipDAO.balanceOf(user.address, 0);
        const memberBalanceBefore = await membershipDAO.balanceOf(member.address, 0);

        // Owner approves the vote
        await membershipDAO.connect(owner).approve(0);

        // Get the balances after approval
        const userBalanceAfter = await membershipDAO.balanceOf(user.address, 0);
        const memberBalanceAfter = await membershipDAO.balanceOf(member.address, 0);
        expect(userBalanceAfter).to.be.gt(userBalanceBefore);
        expect(memberBalanceAfter).to.be.gt(memberBalanceBefore);
      })

      // Check if member and user has a valid membership
      it("Verify member and user membership", async () => {
        const memberMembership = await membershipDAO.hasMembership(member.address);
        expect(memberMembership).to.equal(true);

        const userMembership = await membershipDAO.hasMembership(user.address);
        expect(userMembership).to.equal(true);
      })

      // User and member vote for proposal 
      it("Verify that both users have voted", async () => {
        const userVote = await membershipDAO.hasVoted(user.address, 0);
        expect(userVote).to.equal(true);

        const memberVote = await membershipDAO.hasVoted(member.address, 0);
        expect(memberVote).to.equal(true);
      })

      // Emits NewMembershipApproved event
      it("Emits new membership approved event", async () => {
        await expect(membershipDAO.approve(0))
          .to.emit(membershipDAO, "NewMembershipApproved").withArgs(0);
      })
    })

    describe("Failure", () => {
      beforeEach(async () => {
        // Define first membership
        membershipName = "Silver Membership";
        membershipCost = ethers.parseEther("2");

        // Define new membership
        name = "Gold Membership";
        cost = ethers.parseEther("4");
        voteCount = 0;
        isApproved = false;

        // List first membership
        await membershipDAO.connect(owner).listMembership(membershipName, membershipCost);

        // User buy memebrship
        await membershipDAO.connect(user).buyMembership(0, {
          value: membershipCost
        });

        // Member buy memebrship
        await membershipDAO.connect(member).buyMembership(0, {
          value: membershipCost
        });

        // List a new memebrship
        await membershipDAO.connect(owner).listNewMembership(name, cost, voteCount, isApproved);

        // User vote
        await membershipDAO.connect(user).vote(0);

        // // Member vote
        // await membershipDAO.connect(member).vote(0);
      })

      // Revert if votes are below two votes
      it("Rejects for insufficient votes", async () => {
        await expect(membershipDAO.connect(owner).approve(0))
          .to.be.revertedWithCustomError(membershipDAO, "MembershipDAO_InsufficientVotesToApprove");
      })

      // Revert invalid ID
      it("Revert invalid membership Id", async () => {
        await expect(membershipDAO.connect(owner).approve(10))
          .to.be.revertedWithCustomError(membershipDAO, "MembershipDAO_NewMembershipIsInvalid");
      })
    })
  })
})
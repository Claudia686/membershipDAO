const {
  ethers
} = require("hardhat");
const {
  expect
} = require("chai");

describe("MembershipDAO", () => {
  let membershipDAO, owner

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

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
    describe("Success", () => {
      let membershipName, membershipCost

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
    describe("Success", () => {
      let membershipName, membershipCost

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
      let membershipName, membershipCost

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
})
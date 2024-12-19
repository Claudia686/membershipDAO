const hre = require("hardhat");

async function main() {
	//Setup account
	[owner] = await ethers.getSigners();

	// Deploy contract
	const MembershipDAO = await ethers.getContractFactory("MembershipDAO");
	membershipDAO = await MembershipDAO.deploy(owner.address);
	await membershipDAO.waitForDeployment();
	console.log(`membershipDAO contract deployed at: ${await membershipDAO.getAddress()}`)
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
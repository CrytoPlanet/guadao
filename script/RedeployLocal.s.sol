// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {GUAToken} from "../contracts/GUAToken.sol";
import {GUAGovernor} from "../contracts/GUAGovernor.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {TopicBountyEscrow} from "../contracts/TopicBountyEscrow.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

contract RedeployLocal is Script {
    function run() public {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);

        vm.startBroadcast(privateKey);

        // 1. Deploy GUAToken (Proxy + Impl)
        GUAToken tokenImpl = new GUAToken();

        // Initialize with deployments account as admin
        bytes memory tokenInit = abi.encodeCall(GUAToken.initialize, (deployer));
        ERC1967Proxy tokenProxy = new ERC1967Proxy(address(tokenImpl), tokenInit);
        GUAToken token = GUAToken(address(tokenProxy));

        console.log("New GUAToken Address:", address(token));

        // 2. Mint Tokens to Deployer for Voting
        token.grantRole(token.MINTER_ROLE(), deployer);
        token.mint(deployer, 10_000_000 * 1e18); // Mint 10M tokens
        console.log("Minted 10M GUA to deployer");

        // 3. Deploy Timelock
        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](0); // empty initially
        TimelockController timelock = new TimelockController(
            2 days, // minDelay
            proposers,
            executors,
            deployer // admin
        );
        console.log("New Timelock Address:", address(timelock));

        // 4. Deploy Governor
        // VotingDelay: 1 block (for testing)
        // VotingPeriod: 50400 (week) -> reduce for testing? -> keep standard or reduce?
        // Governor settings are in constructor.
        // GUAGovernor(token, timelock)
        GUAGovernor governor = new GUAGovernor(IVotes(address(token)), timelock);
        console.log("New Governor Address:", address(governor));

        // 5. Setup Timelock Roles
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0)); // Allow anyone to execute
        timelock.grantRole(timelock.CANCELLER_ROLE(), deployer);
        // Do NOT renounce admin yet, useful for testing.

        // 6. Deploy TopicBountyEscrow (Optional, but needed for UI)
        TopicBountyEscrow escrowImpl = new TopicBountyEscrow();
        bytes memory escrowInit = abi.encodeCall(TopicBountyEscrow.initialize, (address(token), deployer, deployer));
        ERC1967Proxy escrowProxy = new ERC1967Proxy(address(escrowImpl), escrowInit);
        console.log("New Escrow Address:", address(escrowProxy));

        vm.stopBroadcast();
    }
}

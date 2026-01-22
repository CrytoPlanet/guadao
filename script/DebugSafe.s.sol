// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";

interface ITopicBountyEscrow {
    function finalizeVoting(uint256 proposalId) external;
}

contract DebugSafe is Script {
    address constant SAFE = 0x04CaA97d9C6fFBceBF0edd924f110Df28989FFcB; // Owner
    address constant ESCROW = 0x09ffd59910d17aa85598f362fcbec05b35978319; // TopicBountyEscrow Proxy

    function run() public {
        uint256 proposalId = 4;

        console.log("--- Debugging Safe Transaction ---");
        console.log("Simulating as Safe:", SAFE);
        
        // Impersonate Safe and call finalizeVoting
        vm.startPrank(SAFE);
        
        try ITopicBountyEscrow(ESCROW).finalizeVoting(proposalId) {
            console.log("SUCCESS: finalizeVoting executed successfully");
        } catch Error(string memory reason) {
            console.log("FAILURE: finalizeVoting reverted with reason:");
            console.log(reason);
        } catch (bytes memory lowLevelData) {
            console.log("FAILURE: finalizeVoting reverted with low-level data");
            console.logBytes(lowLevelData);
        }

        vm.stopPrank();
    }
}

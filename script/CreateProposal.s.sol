// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";

contract CreateProposal is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address governorAddress = vm.envAddress("GOVERNOR_ADDRESS");
        address targetAddress = vm.envAddress("TARGET_ADDRESS"); // Optional, default to msg.sender

        if (targetAddress == address(0)) {
            targetAddress = vm.addr(deployerPrivateKey);
        }

        vm.startBroadcast(deployerPrivateKey);

        address[] memory targets = new address[](1);
        targets[0] = targetAddress;

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = ""; // Empty calldata

        string memory description = "Test Proposal #1: Generic Proposal";

        IGovernor(governorAddress).propose(targets, values, calldatas, description);

        console.log("Proposal created successfully!");
        vm.stopBroadcast();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Test, console} from "forge-std/Test.sol";
import {GUAGovernor} from "../contracts/GUAGovernor.sol";
import {GUAToken} from "../contracts/GUAToken.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";

contract GUAGovernorTest is Test {
    GUAToken public token;
    TimelockController public timelock;
    GUAGovernor public governor;

    address public admin = address(1);
    address public voter1 = address(2);
    address public voter2 = address(3);
    address public team = address(4);

    uint256 public constant MIN_DELAY = 2 days;
    uint256 public constant QUORUM_PERCENTAGE = 10; // 10%
    uint256 public constant VOTING_DELAY = 1 days;
    uint256 public constant VOTING_PERIOD = 7 days;

    function setUp() public {
        vm.startPrank(admin);

        // 1. Deploy Token
        GUAToken tokenImpl = new GUAToken();
        bytes memory initData = abi.encodeCall(GUAToken.initialize, (admin));
        ERC1967Proxy tokenProxy = new ERC1967Proxy(address(tokenImpl), initData);
        token = GUAToken(address(tokenProxy));

        // 2. Deploy Timelock
        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](1);
        executors[0] = address(0); // Anyone can execute

        timelock = new TimelockController(
            MIN_DELAY,
            proposers,
            executors,
            admin // Admin initially
        );

        // 3. Deploy Governor
        governor = new GUAGovernor(IVotes(address(token)), timelock);

        // 4. Setup Roles
        bytes32 PROPOSER_ROLE = timelock.PROPOSER_ROLE();
        bytes32 EXECUTOR_ROLE = timelock.EXECUTOR_ROLE();
        bytes32 TEAM_ROLE = timelock.CANCELLER_ROLE(); // Use Cancellator role for safe/team
        bytes32 ADMIN_ROLE = timelock.DEFAULT_ADMIN_ROLE();

        timelock.grantRole(PROPOSER_ROLE, address(governor));
        timelock.grantRole(EXECUTOR_ROLE, address(governor));
        timelock.grantRole(TEAM_ROLE, team);
        timelock.renounceRole(ADMIN_ROLE, admin);

        // 5. Mint tokens and delegate
        token.grantRole(token.MINTER_ROLE(), admin);

        // Voter1: 4% (Below Quorum)
        token.mint(voter1, 400 ether);
        // Voter2: 7% (Together > 10% Quorum)
        token.mint(voter2, 700 ether);

        vm.stopPrank();

        // Delegate votes
        vm.prank(voter1);
        token.delegate(voter1);

        vm.prank(voter2);
        token.delegate(voter2);

        // Advance block so votes are active (snapshot is block.number - 1)
        vm.roll(block.number + 1);
    }

    function test_ProposalLifecycle() public {
        // 1. Create Proposal
        // Proposal: Grant 100 GUA to team from Timelock (assuming Timelock has funds)
        // First we need to fund the Timelock
        vm.prank(admin);
        token.mint(address(timelock), 1000 ether);

        bytes memory callData = abi.encodeCall(token.transfer, (team, 100 ether));
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);

        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = callData;
        string memory description = "Proposal #1: Send 100 GUA to team";

        // Voter2 has enough tokens (>100 GUA threshold) to propose
        vm.startPrank(voter2);

        // Check proposal threshold
        assertGt(token.getVotes(voter2), governor.proposalThreshold());

        uint256 proposalId = governor.propose(targets, values, calldatas, description);
        vm.stopPrank();

        console.log("Proposal ID:", proposalId);

        // 2. Wait for Voting Delay
        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Pending));

        vm.roll(block.number + VOTING_DELAY + 1);

        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Active));

        // 3. Cast Votes
        vm.prank(voter1);
        governor.castVote(proposalId, 1); // 1 = For

        vm.prank(voter2);
        governor.castVote(proposalId, 1); // 1 = For

        // 4. Wait for Voting Period to End
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        vm.roll(block.number + VOTING_PERIOD + 1);

        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Succeeded));

        // 5. Queue Proposal
        bytes32 descriptionHash = keccak256(bytes(description));
        governor.queue(targets, values, calldatas, descriptionHash);

        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Queued));

        // 6. Wait for Timelock
        vm.warp(block.timestamp + MIN_DELAY + 1);

        // 7. Execute
        uint256 teamBalanceBefore = token.balanceOf(team);
        governor.execute(targets, values, calldatas, descriptionHash);

        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Executed));
        assertEq(token.balanceOf(team), teamBalanceBefore + 100 ether);
    }

    function test_ProposalFailsQuorum() public {
        // Voter1 (400) creates proposal and votes. total supply ~2100 (1000 minted to admin->timelock? No, checks setup).
        // Initial setup: voter1(400), voter2(700). Total 1100.
        // Setup also minted to admin but admin didn't delegate.
        // Quorum is 10% of total supply.
        // supply = 1100. Quorum = 110.
        // Voter1 has 400 > 110. So Voter1 alone satisfies Quorum?
        // Wait, in setup I minted 1000 to admin for minting to others, but admin also minted to himself?
        // Ah, `token.mint` calls `_mint`.
        // setUp():
        // token.mint(voter1, 400)
        // token.mint(voter2, 700)
        // Total Supply = 1100.
        // Quorum = 110.

        // Let's mint HUGE amount to admin/others but NOT vote, to raise Quorum.
        vm.startPrank(admin);
        token.mint(address(10), 10000 ether); // Non-voting holder
        vm.stopPrank();

        // New Supply = 11100. Quorum 10% = 1110.
        // Voter1 (400) + Voter2 (700) = 1100. < 1110.
        // Should fail quorum.

        // Create Proposal
        bytes memory callData = abi.encodeCall(token.transfer, (team, 10 ether));
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        targets[0] = address(token);
        calldatas[0] = callData;

        vm.prank(voter2); // Voter2 has 700 > 100 threshold
        uint256 proposalId = governor.propose(targets, values, calldatas, "Quorum Test");

        vm.warp(block.timestamp + VOTING_DELAY + 1);
        vm.roll(block.number + VOTING_DELAY + 1);

        // Vote
        vm.prank(voter1);
        governor.castVote(proposalId, 1);
        vm.prank(voter2);
        governor.castVote(proposalId, 1);

        // End Voting
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        vm.roll(block.number + VOTING_PERIOD + 1);

        assertEq(uint256(governor.state(proposalId)), uint256(IGovernor.ProposalState.Defeated));
    }
}

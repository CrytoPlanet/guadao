// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Test} from "forge-std/Test.sol";
import {GUAToken} from "../contracts/GUAToken.sol";
import {TopicBountyEscrow} from "../contracts/TopicBountyEscrow.sol";

contract TopicBountyEscrowTest is Test {
    TopicBountyEscrow public escrow;
    GUAToken public token;
    address public owner;
    address public user1;
    address public user2;
    address public user3;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        user3 = address(0x3);

        token = new GUAToken();
        escrow = new TopicBountyEscrow(address(token), owner);
    }

    function test_CreateProposalStoresData() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp + 1);
        uint64 endTime = uint64(block.timestamp + 7 days);

        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);
        assertEq(proposalId, 1);
        assertEq(escrow.proposalCount(), 1);

        TopicBountyEscrow.Proposal memory proposal = escrow.getProposal(proposalId);
        assertEq(proposal.startTime, startTime);
        assertEq(proposal.endTime, endTime);
        assertEq(proposal.topicCount, 3);
        assertEq(uint8(proposal.status), uint8(TopicBountyEscrow.ProposalStatus.Created));
        assertEq(proposal.winnerTopicId, 0);
        assertEq(proposal.totalPool, 0);
        assertFalse(proposal.finalized);

        TopicBountyEscrow.Topic memory topic0 = escrow.getTopic(proposalId, 0);
        TopicBountyEscrow.Topic memory topic1 = escrow.getTopic(proposalId, 1);
        TopicBountyEscrow.Topic memory topic2 = escrow.getTopic(proposalId, 2);
        assertEq(topic0.owner, user1);
        assertEq(topic1.owner, user2);
        assertEq(topic2.owner, user3);
    }

    function test_CreateProposalRejectsInvalidTopicCount() public {
        address[] memory owners = new address[](2);
        owners[0] = user1;
        owners[1] = user2;

        vm.expectRevert("TopicBountyEscrow: invalid topic count");
        escrow.createProposal(owners, uint64(block.timestamp + 1), uint64(block.timestamp + 2));
    }

    function test_CreateProposalRejectsInvalidOwner() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = address(0);
        owners[2] = user3;

        vm.expectRevert("TopicBountyEscrow: invalid topic owner");
        escrow.createProposal(owners, uint64(block.timestamp + 1), uint64(block.timestamp + 2));
    }

    function test_CreateProposalRejectsInvalidWindow() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        vm.expectRevert("TopicBountyEscrow: invalid window");
        escrow.createProposal(owners, uint64(block.timestamp + 2), uint64(block.timestamp + 1));
    }

    function test_NonOwnerCannotCreateProposal() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        vm.prank(user1);
        vm.expectRevert();
        escrow.createProposal(owners, uint64(block.timestamp + 1), uint64(block.timestamp + 2));
    }

    function test_StakeVoteSuccess() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 3 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user1, 100 ether);
        vm.startPrank(user1);
        token.approve(address(escrow), 50 ether);
        escrow.stakeVote(proposalId, 1, 50 ether);
        vm.stopPrank();

        assertEq(escrow.topicStakeTotal(proposalId, 1), 50 ether);
        assertEq(escrow.voterStakeByTopic(proposalId, 1, user1), 50 ether);
    }

    function test_StakeVoteOutsideWindowReverts() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp + 1 days);
        uint64 endTime = uint64(block.timestamp + 2 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user1, 10 ether);
        vm.prank(user1);
        token.approve(address(escrow), 10 ether);

        vm.expectRevert("TopicBountyEscrow: voting closed");
        vm.prank(user1);
        escrow.stakeVote(proposalId, 0, 1 ether);
    }

    function test_StakeVoteInsufficientAllowanceReverts() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user1, 10 ether);
        vm.expectRevert();
        vm.prank(user1);
        escrow.stakeVote(proposalId, 0, 1 ether);
    }

    function test_FinalizeVotingBeforeEndReverts() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 2 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        vm.expectRevert("TopicBountyEscrow: voting not ended");
        escrow.finalizeVoting(proposalId);
    }

    function test_FinalizeVotingTieUsesLowestTopicId() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user1, 100 ether);
        token.mint(user2, 100 ether);

        vm.startPrank(user1);
        token.approve(address(escrow), 50 ether);
        escrow.stakeVote(proposalId, 0, 50 ether);
        vm.stopPrank();

        vm.startPrank(user2);
        token.approve(address(escrow), 50 ether);
        escrow.stakeVote(proposalId, 1, 50 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);

        TopicBountyEscrow.Proposal memory proposal = escrow.getProposal(proposalId);
        assertTrue(proposal.finalized);
        assertEq(proposal.winnerTopicId, 0);
        assertEq(proposal.totalPool, 100 ether);
    }

    function test_FinalizeVotingCannotRepeat() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user1, 10 ether);
        vm.startPrank(user1);
        token.approve(address(escrow), 10 ether);
        escrow.stakeVote(proposalId, 2, 10 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);

        vm.expectRevert("TopicBountyEscrow: already finalized");
        escrow.finalizeVoting(proposalId);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Test} from "forge-std/Test.sol";
import {GUAToken} from "../contracts/GUAToken.sol";
import {TopicBountyEscrow} from "../contracts/TopicBountyEscrow.sol";

contract ReentrantToken is GUAToken {
    address public reenterTarget;
    bytes public reenterData;
    bool public reenterEnabled;

    function setReenter(address target, bytes calldata data) external {
        reenterTarget = target;
        reenterData = data;
        reenterEnabled = true;
    }

    function clearReenter() external {
        reenterEnabled = false;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        bool success = super.transfer(to, amount);
        _maybeReenter();
        return success;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        bool success = super.transferFrom(from, to, amount);
        _maybeReenter();
        return success;
    }

    function _maybeReenter() internal {
        if (!reenterEnabled) {
            return;
        }
        reenterEnabled = false;
        (bool ok,) = reenterTarget.call(reenterData);
        require(ok, "reenter failed");
    }
}

contract TopicBountyEscrowTest is Test {
    TopicBountyEscrow public escrow;
    GUAToken public token;
    address public owner;
    address public treasury;
    address public user1;
    address public user2;
    address public user3;

    function setUp() public {
        owner = address(this);
        treasury = address(0xBEEF);
        user1 = address(0x1);
        user2 = address(0x2);
        user3 = address(0x3);

        token = new GUAToken();
        escrow = new TopicBountyEscrow(address(token), owner, treasury);
    }

    function _createDisputedProposal() internal returns (uint256 proposalId) {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user1, 10 ether);
        vm.startPrank(user1);
        token.approve(address(escrow), 10 ether);
        escrow.stakeVote(proposalId, 0, 10 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);
        escrow.confirmWinnerAndPay10(proposalId);

        vm.prank(user1);
        escrow.submitDelivery(proposalId, keccak256("url"), keccak256("vid"), keccak256("pin"));

        token.mint(user2, 10_000 ether);
        vm.startPrank(user2);
        token.approve(address(escrow), 10_000 ether);
        escrow.challengeDelivery(proposalId, keccak256("reason"), keccak256("evidence"));
        vm.stopPrank();
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
        assertEq(uint8(proposal.status), uint8(TopicBountyEscrow.ProposalStatus.Voting));
        assertEq(proposal.winnerTopicId, 0);
        assertEq(proposal.totalPool, 0);
        assertFalse(proposal.finalized);
        assertEq(proposal.submitDeadline, 0);
        assertEq(proposal.paid10, 0);
        assertEq(proposal.remaining90, 0);
        assertFalse(proposal.confirmed);
        assertEq(proposal.youtubeUrlHash, bytes32(0));
        assertEq(proposal.videoIdHash, bytes32(0));
        assertEq(proposal.pinnedCodeHash, bytes32(0));
        assertEq(proposal.challengeWindowEnd, 0);
        assertFalse(proposal.deliverySubmitted);
        assertEq(proposal.challenger, address(0));
        assertEq(proposal.reasonHash, bytes32(0));
        assertEq(proposal.evidenceHash, bytes32(0));
        assertFalse(proposal.disputeResolved);

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

        vm.expectRevert("TopicBountyEscrow: not voting");
        escrow.finalizeVoting(proposalId);
    }

    function test_ConfirmWinnerPays10() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user1, 50 ether);
        vm.startPrank(user1);
        token.approve(address(escrow), 50 ether);
        escrow.stakeVote(proposalId, 0, 50 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);

        uint256 balanceBefore = token.balanceOf(user1);
        escrow.confirmWinnerAndPay10(proposalId);

        TopicBountyEscrow.Proposal memory proposal = escrow.getProposal(proposalId);
        assertTrue(proposal.confirmed);
        assertEq(proposal.paid10, 5 ether);
        assertEq(proposal.remaining90, 45 ether);
        assertEq(proposal.submitDeadline, block.timestamp + 14 days);
        assertEq(token.balanceOf(user1), balanceBefore + 5 ether);
    }

    function test_ConfirmWinnerRequiresFinalized() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        vm.expectRevert("TopicBountyEscrow: voting not finalized");
        escrow.confirmWinnerAndPay10(proposalId);
    }

    function test_ConfirmWinnerCannotRepeat() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user2, 20 ether);
        vm.startPrank(user2);
        token.approve(address(escrow), 20 ether);
        escrow.stakeVote(proposalId, 1, 20 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);
        escrow.confirmWinnerAndPay10(proposalId);

        vm.expectRevert("TopicBountyEscrow: voting not finalized");
        escrow.confirmWinnerAndPay10(proposalId);
    }

    function test_NonOwnerCannotConfirmWinner() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user3, 30 ether);
        vm.startPrank(user3);
        token.approve(address(escrow), 30 ether);
        escrow.stakeVote(proposalId, 2, 30 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);

        vm.prank(user1);
        vm.expectRevert();
        escrow.confirmWinnerAndPay10(proposalId);
    }

    function test_SubmitDeliverySuccess() public {
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
        escrow.stakeVote(proposalId, 0, 10 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);
        escrow.confirmWinnerAndPay10(proposalId);

        bytes32 urlHash = keccak256("youtube-url");
        bytes32 videoHash = keccak256("video-id");
        bytes32 pinnedHash = keccak256("pinned-code");

        vm.prank(user1);
        escrow.submitDelivery(proposalId, urlHash, videoHash, pinnedHash);

        TopicBountyEscrow.Proposal memory proposal = escrow.getProposal(proposalId);
        assertTrue(proposal.deliverySubmitted);
        assertEq(proposal.youtubeUrlHash, urlHash);
        assertEq(proposal.videoIdHash, videoHash);
        assertEq(proposal.pinnedCodeHash, pinnedHash);
        assertEq(proposal.challengeWindowEnd, block.timestamp + 72 hours);
    }

    function test_SubmitDeliveryRejectsNonWinner() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user2, 10 ether);
        vm.startPrank(user2);
        token.approve(address(escrow), 10 ether);
        escrow.stakeVote(proposalId, 1, 10 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);
        escrow.confirmWinnerAndPay10(proposalId);

        vm.prank(user1);
        vm.expectRevert("TopicBountyEscrow: not winner");
        escrow.submitDelivery(proposalId, keccak256("url"), keccak256("vid"), keccak256("pin"));
    }

    function test_SubmitDeliveryRejectsRepeated() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user3, 10 ether);
        vm.startPrank(user3);
        token.approve(address(escrow), 10 ether);
        escrow.stakeVote(proposalId, 2, 10 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);
        escrow.confirmWinnerAndPay10(proposalId);

        vm.prank(user3);
        escrow.submitDelivery(proposalId, keccak256("url"), keccak256("vid"), keccak256("pin"));

        vm.prank(user3);
        vm.expectRevert("TopicBountyEscrow: not accepted");
        escrow.submitDelivery(proposalId, keccak256("url2"), keccak256("vid2"), keccak256("pin2"));
    }

    function test_FinalizeDeliveryPaysRemaining90() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user1, 50 ether);
        vm.startPrank(user1);
        token.approve(address(escrow), 50 ether);
        escrow.stakeVote(proposalId, 0, 50 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);
        escrow.confirmWinnerAndPay10(proposalId);

        vm.prank(user1);
        escrow.submitDelivery(proposalId, keccak256("url"), keccak256("vid"), keccak256("pin"));

        TopicBountyEscrow.Proposal memory proposalBefore = escrow.getProposal(proposalId);
        uint256 balanceBefore = token.balanceOf(user1);

        vm.warp(block.timestamp + 73 hours);
        escrow.finalizeDelivery(proposalId);

        TopicBountyEscrow.Proposal memory proposalAfter = escrow.getProposal(proposalId);
        assertEq(token.balanceOf(user1), balanceBefore + proposalBefore.remaining90);
        assertEq(uint8(proposalAfter.status), uint8(TopicBountyEscrow.ProposalStatus.Completed));
    }

    function test_FinalizeDeliveryBeforeWindowReverts() public {
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
        escrow.stakeVote(proposalId, 0, 10 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);
        escrow.confirmWinnerAndPay10(proposalId);

        vm.prank(user1);
        escrow.submitDelivery(proposalId, keccak256("url"), keccak256("vid"), keccak256("pin"));

        vm.warp(block.timestamp + 1 hours);
        vm.expectRevert("TopicBountyEscrow: challenge window open");
        escrow.finalizeDelivery(proposalId);
    }

    function test_ExpireIfNoSubmissionTransfersToTreasury() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user2, 40 ether);
        vm.startPrank(user2);
        token.approve(address(escrow), 40 ether);
        escrow.stakeVote(proposalId, 1, 40 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);
        escrow.confirmWinnerAndPay10(proposalId);

        TopicBountyEscrow.Proposal memory proposalBefore = escrow.getProposal(proposalId);
        uint256 treasuryBefore = token.balanceOf(treasury);

        vm.warp(block.timestamp + 15 days);
        escrow.expireIfNoSubmission(proposalId);

        TopicBountyEscrow.Proposal memory proposalAfter = escrow.getProposal(proposalId);
        assertEq(token.balanceOf(treasury), treasuryBefore + proposalBefore.remaining90);
        assertEq(uint8(proposalAfter.status), uint8(TopicBountyEscrow.ProposalStatus.Expired));
    }

    function test_ExpireIfNoSubmissionBeforeDeadlineReverts() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user2, 10 ether);
        vm.startPrank(user2);
        token.approve(address(escrow), 10 ether);
        escrow.stakeVote(proposalId, 1, 10 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);
        escrow.confirmWinnerAndPay10(proposalId);

        vm.warp(block.timestamp + 7 days);
        vm.expectRevert("TopicBountyEscrow: submit deadline not reached");
        escrow.expireIfNoSubmission(proposalId);
    }

    function test_ChallengeDeliverySuccess() public {
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
        escrow.stakeVote(proposalId, 0, 10 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);
        escrow.confirmWinnerAndPay10(proposalId);

        vm.prank(user1);
        escrow.submitDelivery(proposalId, keccak256("url"), keccak256("vid"), keccak256("pin"));

        token.mint(user2, 10_000 ether);
        vm.startPrank(user2);
        token.approve(address(escrow), 10_000 ether);
        escrow.challengeDelivery(proposalId, keccak256("reason"), keccak256("evidence"));
        vm.stopPrank();

        TopicBountyEscrow.Proposal memory proposal = escrow.getProposal(proposalId);
        assertEq(uint8(proposal.status), uint8(TopicBountyEscrow.ProposalStatus.Disputed));
        assertEq(proposal.challenger, user2);
        assertEq(proposal.reasonHash, keccak256("reason"));
        assertEq(proposal.evidenceHash, keccak256("evidence"));
    }

    function test_ChallengeDeliveryWindowClosedReverts() public {
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
        escrow.stakeVote(proposalId, 0, 10 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);
        escrow.confirmWinnerAndPay10(proposalId);

        vm.prank(user1);
        escrow.submitDelivery(proposalId, keccak256("url"), keccak256("vid"), keccak256("pin"));

        vm.warp(block.timestamp + 73 hours);
        token.mint(user2, 10_000 ether);
        vm.startPrank(user2);
        token.approve(address(escrow), 10_000 ether);
        vm.expectRevert("TopicBountyEscrow: challenge window closed");
        escrow.challengeDelivery(proposalId, keccak256("reason"), keccak256("evidence"));
        vm.stopPrank();
    }

    function test_ChallengeDeliveryCannotRepeat() public {
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
        escrow.stakeVote(proposalId, 0, 10 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        escrow.finalizeVoting(proposalId);
        escrow.confirmWinnerAndPay10(proposalId);

        vm.prank(user1);
        escrow.submitDelivery(proposalId, keccak256("url"), keccak256("vid"), keccak256("pin"));

        token.mint(user2, 10_000 ether);
        vm.startPrank(user2);
        token.approve(address(escrow), 10_000 ether);
        escrow.challengeDelivery(proposalId, keccak256("reason"), keccak256("evidence"));
        vm.expectRevert("TopicBountyEscrow: already disputed");
        escrow.challengeDelivery(proposalId, keccak256("reason2"), keccak256("evidence2"));
        vm.stopPrank();
    }

    function test_ResolveDisputeApprovePaysWinnerAndTreasury() public {
        uint256 proposalId = _createDisputedProposal();
        TopicBountyEscrow.Proposal memory proposal = escrow.getProposal(proposalId);
        address winnerOwner = escrow.getTopic(proposalId, proposal.winnerTopicId).owner;

        uint256 winnerBalanceBefore = token.balanceOf(winnerOwner);
        uint256 treasuryBalanceBefore = token.balanceOf(treasury);

        escrow.resolveDispute(proposalId, true);

        assertEq(token.balanceOf(winnerOwner), winnerBalanceBefore + proposal.remaining90);
        assertEq(token.balanceOf(treasury), treasuryBalanceBefore + 10_000 ether);
        assertTrue(escrow.getProposal(proposalId).disputeResolved);
    }

    function test_ResolveDisputeDenyPaysTreasuryAndChallenger() public {
        uint256 proposalId = _createDisputedProposal();
        TopicBountyEscrow.Proposal memory proposal = escrow.getProposal(proposalId);

        token.mint(treasury, 5_000 ether);
        vm.prank(treasury);
        token.approve(address(escrow), 5_000 ether);

        uint256 treasuryBalanceBefore = token.balanceOf(treasury);
        uint256 challengerBalanceBefore = token.balanceOf(user2);

        escrow.resolveDispute(proposalId, false);

        assertEq(token.balanceOf(treasury), treasuryBalanceBefore + proposal.remaining90 - 5_000 ether);
        assertEq(token.balanceOf(user2), challengerBalanceBefore + 10_000 ether + 5_000 ether);
        assertTrue(escrow.getProposal(proposalId).disputeResolved);
    }

    function test_ResolveDisputeDenyRevertsWhenAllowanceInsufficient() public {
        uint256 proposalId = _createDisputedProposal();

        vm.expectRevert("TopicBountyEscrow: treasury allowance insufficient");
        escrow.resolveDispute(proposalId, false);
    }

    function test_ResolveDisputeOnlyOwner() public {
        uint256 proposalId = _createDisputedProposal();

        vm.prank(user1);
        vm.expectRevert();
        escrow.resolveDispute(proposalId, true);
    }

    function test_ResolveDisputeBlocksReentrancy() public {
        ReentrantToken reentrantToken = new ReentrantToken();
        address escrowOwner = address(reentrantToken);
        TopicBountyEscrow reentrantEscrow = new TopicBountyEscrow(address(reentrantToken), escrowOwner, treasury);

        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        vm.prank(escrowOwner);
        uint256 proposalId = reentrantEscrow.createProposal(owners, startTime, endTime);

        reentrantToken.mint(user1, 10 ether);
        vm.startPrank(user1);
        reentrantToken.approve(address(reentrantEscrow), 10 ether);
        reentrantEscrow.stakeVote(proposalId, 0, 10 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 days);
        reentrantEscrow.finalizeVoting(proposalId);

        vm.prank(escrowOwner);
        reentrantEscrow.confirmWinnerAndPay10(proposalId);

        vm.prank(user1);
        reentrantEscrow.submitDelivery(proposalId, keccak256("url"), keccak256("vid"), keccak256("pin"));

        reentrantToken.mint(user2, 10_000 ether);
        vm.startPrank(user2);
        reentrantToken.approve(address(reentrantEscrow), 10_000 ether);
        reentrantEscrow.challengeDelivery(proposalId, keccak256("reason"), keccak256("evidence"));
        vm.stopPrank();

        bytes memory reenterData = abi.encodeWithSelector(TopicBountyEscrow.resolveDispute.selector, proposalId, true);
        reentrantToken.setReenter(address(reentrantEscrow), reenterData);

        vm.prank(escrowOwner);
        vm.expectRevert();
        reentrantEscrow.resolveDispute(proposalId, true);
    }

    function test_PauseBlocksCreateProposal() public {
        escrow.pause();

        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        vm.expectRevert("EnforcedPause()");
        escrow.createProposal(owners, uint64(block.timestamp + 1), uint64(block.timestamp + 2));
    }

    function test_PauseBlocksStakeVote() public {
        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);

        token.mint(user1, 10 ether);
        vm.prank(user1);
        token.approve(address(escrow), 10 ether);

        escrow.pause();

        vm.prank(user1);
        vm.expectRevert("EnforcedPause()");
        escrow.stakeVote(proposalId, 0, 1 ether);
    }

    function test_UnpauseAllowsActions() public {
        escrow.pause();
        escrow.unpause();

        address[] memory owners = new address[](3);
        owners[0] = user1;
        owners[1] = user2;
        owners[2] = user3;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + 1 days);
        uint256 proposalId = escrow.createProposal(owners, startTime, endTime);
        assertEq(proposalId, 1);
    }
}

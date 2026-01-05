// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TopicBountyEscrow is Ownable, Pausable, ReentrancyGuard {
    enum ProposalStatus {
        Created,
        Voting,
        VotingFinalized,
        Accepted,
        Submitted,
        Disputed,
        Completed,
        Denied,
        Expired
    }

    struct Proposal {
        uint64 startTime;
        uint64 endTime;
        uint8 topicCount;
        ProposalStatus status;
        uint256 winnerTopicId;
        uint256 totalPool;
        bool finalized;
        uint256 submitDeadline;
        uint256 paid10;
        uint256 remaining90;
        bool confirmed;
        bytes32 youtubeUrlHash;
        bytes32 videoIdHash;
        bytes32 pinnedCodeHash;
        uint256 challengeWindowEnd;
        bool deliverySubmitted;
        address challenger;
        bytes32 reasonHash;
        bytes32 evidenceHash;
        bool disputeResolved;
    }

    struct Topic {
        address owner;
    }

    IERC20 public immutable guaToken;
    address public immutable treasury;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => mapping(uint256 => Topic)) private topics;
    mapping(uint256 => mapping(uint256 => uint256)) public topicStakeTotal;
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public voterStakeByTopic;

    event ProposalCreated(
        uint256 indexed proposalId,
        uint64 startTime,
        uint64 endTime,
        uint256[] topicIds,
        address[] topicOwners
    );
    event Voted(address indexed voter, uint256 indexed proposalId, uint256 indexed topicId, uint256 amount);
    event VotingFinalized(uint256 indexed proposalId, uint256 winnerTopicId, uint256 totalPool);
    event WinnerConfirmed(
        uint256 indexed proposalId,
        uint256 indexed winnerTopicId,
        address indexed winnerOwner,
        uint256 payout10,
        uint256 submitDeadline
    );
    event DeliverySubmitted(
        uint256 indexed proposalId,
        address indexed submitter,
        bytes32 youtubeUrlHash,
        bytes32 videoIdHash,
        bytes32 pinnedCodeHash,
        uint256 challengeWindowEnd
    );
    event DeliveryChallenged(
        uint256 indexed proposalId,
        address indexed challenger,
        bytes32 reasonHash,
        bytes32 evidenceHash
    );
    event DisputeResolved(uint256 indexed proposalId, address indexed resolver, bool approved);
    event Expired(uint256 indexed proposalId, uint256 amount);
    event EscrowPaused(address indexed account);
    event EscrowUnpaused(address indexed account);

    constructor(address _guaToken, address _owner, address _treasury) Ownable(_owner) {
        require(_guaToken != address(0), "TopicBountyEscrow: invalid token");
        require(_owner != address(0), "TopicBountyEscrow: invalid owner");
        require(_treasury != address(0), "TopicBountyEscrow: invalid treasury");

        guaToken = IERC20(_guaToken);
        treasury = _treasury;
    }

    function createProposal(
        address[] calldata topicOwners,
        uint64 startTime,
        uint64 endTime
    ) external onlyOwner whenNotPaused returns (uint256 proposalId) {
        uint256 count = topicOwners.length;
        require(count >= 3 && count <= 5, "TopicBountyEscrow: invalid topic count");
        require(endTime > startTime, "TopicBountyEscrow: invalid window");

        proposalId = ++proposalCount;
        proposals[proposalId] = Proposal({
            startTime: startTime,
            endTime: endTime,
            topicCount: uint8(count),
            status: ProposalStatus.Voting,
            winnerTopicId: 0,
            totalPool: 0,
            finalized: false,
            submitDeadline: 0,
            paid10: 0,
            remaining90: 0,
            confirmed: false,
            youtubeUrlHash: bytes32(0),
            videoIdHash: bytes32(0),
            pinnedCodeHash: bytes32(0),
            challengeWindowEnd: 0,
            deliverySubmitted: false,
            challenger: address(0),
            reasonHash: bytes32(0),
            evidenceHash: bytes32(0),
            disputeResolved: false
        });

        uint256[] memory topicIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            address owner = topicOwners[i];
            require(owner != address(0), "TopicBountyEscrow: invalid topic owner");
            topics[proposalId][i] = Topic({owner: owner});
            topicIds[i] = i;
        }

        emit ProposalCreated(proposalId, startTime, endTime, topicIds, topicOwners);
    }

    function finalizeVoting(uint256 proposalId) external whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.topicCount > 0, "TopicBountyEscrow: invalid proposal");
        require(proposal.status == ProposalStatus.Voting, "TopicBountyEscrow: not voting");
        require(block.timestamp > proposal.endTime, "TopicBountyEscrow: voting not ended");
        require(!proposal.finalized, "TopicBountyEscrow: already finalized");

        uint256 count = proposal.topicCount;
        uint256 winningTopicId = 0;
        uint256 highestStake = 0;
        uint256 pool = 0;

        for (uint256 i = 0; i < count; i++) {
            uint256 stake = topicStakeTotal[proposalId][i];
            pool += stake;
            if (stake > highestStake || (stake == highestStake && i < winningTopicId)) {
                highestStake = stake;
                winningTopicId = i;
            }
        }

        proposal.winnerTopicId = winningTopicId;
        proposal.totalPool = pool;
        proposal.finalized = true;
        proposal.status = ProposalStatus.VotingFinalized;

        emit VotingFinalized(proposalId, winningTopicId, pool);
    }

    function confirmWinnerAndPay10(
        uint256 proposalId
    ) external onlyOwner whenNotPaused nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.topicCount > 0, "TopicBountyEscrow: invalid proposal");
        require(proposal.status == ProposalStatus.VotingFinalized, "TopicBountyEscrow: voting not finalized");
        require(proposal.finalized, "TopicBountyEscrow: voting not finalized");
        require(!proposal.confirmed, "TopicBountyEscrow: already confirmed");

        Topic memory winningTopic = topics[proposalId][proposal.winnerTopicId];
        require(winningTopic.owner != address(0), "TopicBountyEscrow: invalid winner");

        uint256 payout10 = proposal.totalPool / 10;
        uint256 remaining90 = proposal.totalPool - payout10;

        proposal.paid10 = payout10;
        proposal.remaining90 = remaining90;
        proposal.submitDeadline = block.timestamp + 14 days;
        proposal.confirmed = true;
        proposal.status = ProposalStatus.Accepted;

        guaToken.transfer(winningTopic.owner, payout10);

        emit WinnerConfirmed(
            proposalId,
            proposal.winnerTopicId,
            winningTopic.owner,
            payout10,
            proposal.submitDeadline
        );
    }

    function submitDelivery(
        uint256 proposalId,
        bytes32 youtubeUrlHash,
        bytes32 videoIdHash,
        bytes32 pinnedCodeHash
    ) external whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.topicCount > 0, "TopicBountyEscrow: invalid proposal");
        require(proposal.status == ProposalStatus.Accepted, "TopicBountyEscrow: not accepted");
        require(proposal.confirmed, "TopicBountyEscrow: winner not confirmed");
        require(!proposal.deliverySubmitted, "TopicBountyEscrow: already submitted");
        require(block.timestamp <= proposal.submitDeadline, "TopicBountyEscrow: submission expired");

        Topic memory winningTopic = topics[proposalId][proposal.winnerTopicId];
        require(msg.sender == winningTopic.owner, "TopicBountyEscrow: not winner");

        proposal.youtubeUrlHash = youtubeUrlHash;
        proposal.videoIdHash = videoIdHash;
        proposal.pinnedCodeHash = pinnedCodeHash;
        proposal.challengeWindowEnd = block.timestamp + 72 hours;
        proposal.deliverySubmitted = true;
        proposal.status = ProposalStatus.Submitted;

        emit DeliverySubmitted(
            proposalId,
            msg.sender,
            youtubeUrlHash,
            videoIdHash,
            pinnedCodeHash,
            proposal.challengeWindowEnd
        );
    }

    function challengeDelivery(
        uint256 proposalId,
        bytes32 reasonHash,
        bytes32 evidenceHash
    ) external whenNotPaused nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.topicCount > 0, "TopicBountyEscrow: invalid proposal");
        require(proposal.status != ProposalStatus.Disputed, "TopicBountyEscrow: already disputed");
        require(proposal.status == ProposalStatus.Submitted, "TopicBountyEscrow: not submitted");
        require(
            block.timestamp < proposal.challengeWindowEnd,
            "TopicBountyEscrow: challenge window closed"
        );

        uint256 bond = 10_000 ether;
        guaToken.transferFrom(msg.sender, address(this), bond);

        proposal.challenger = msg.sender;
        proposal.reasonHash = reasonHash;
        proposal.evidenceHash = evidenceHash;
        proposal.status = ProposalStatus.Disputed;

        emit DeliveryChallenged(proposalId, msg.sender, reasonHash, evidenceHash);
    }

    function finalizeDelivery(uint256 proposalId) external whenNotPaused nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.topicCount > 0, "TopicBountyEscrow: invalid proposal");
        require(proposal.status == ProposalStatus.Submitted, "TopicBountyEscrow: not submitted");
        require(
            block.timestamp >= proposal.challengeWindowEnd,
            "TopicBountyEscrow: challenge window open"
        );

        Topic memory winningTopic = topics[proposalId][proposal.winnerTopicId];
        require(winningTopic.owner != address(0), "TopicBountyEscrow: invalid winner");

        uint256 remaining90 = proposal.remaining90;
        proposal.status = ProposalStatus.Completed;

        guaToken.transfer(winningTopic.owner, remaining90);
    }

    function expireIfNoSubmission(uint256 proposalId) external whenNotPaused nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.topicCount > 0, "TopicBountyEscrow: invalid proposal");
        require(proposal.status == ProposalStatus.Accepted, "TopicBountyEscrow: not accepted");
        require(!proposal.deliverySubmitted, "TopicBountyEscrow: delivery already submitted");
        require(block.timestamp > proposal.submitDeadline, "TopicBountyEscrow: submit deadline not reached");

        uint256 remaining90 = proposal.remaining90;
        proposal.status = ProposalStatus.Expired;

        guaToken.transfer(treasury, remaining90);

        emit Expired(proposalId, remaining90);
    }

    function resolveDispute(
        uint256 proposalId,
        bool approve
    ) external onlyOwner whenNotPaused nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.topicCount > 0, "TopicBountyEscrow: invalid proposal");
        require(proposal.status == ProposalStatus.Disputed, "TopicBountyEscrow: not disputed");
        require(!proposal.disputeResolved, "TopicBountyEscrow: already resolved");
        require(proposal.deliverySubmitted, "TopicBountyEscrow: delivery not submitted");
        require(proposal.confirmed, "TopicBountyEscrow: winner not confirmed");

        Topic memory winningTopic = topics[proposalId][proposal.winnerTopicId];
        require(winningTopic.owner != address(0), "TopicBountyEscrow: invalid winner");
        require(proposal.challenger != address(0), "TopicBountyEscrow: invalid challenger");

        uint256 bond = 10_000 ether;
        uint256 remaining90 = proposal.remaining90;
        if (approve) {
            guaToken.transfer(winningTopic.owner, remaining90);
            guaToken.transfer(treasury, bond);
            proposal.status = ProposalStatus.Completed;
        } else {
            uint256 reward = 5_000 ether;
            require(
                guaToken.allowance(treasury, address(this)) >= reward,
                "TopicBountyEscrow: treasury allowance insufficient"
            );
            guaToken.transfer(treasury, remaining90);
            guaToken.transfer(proposal.challenger, bond);
            guaToken.transferFrom(treasury, proposal.challenger, reward);
            proposal.status = ProposalStatus.Denied;
        }

        proposal.disputeResolved = true;

        emit DisputeResolved(proposalId, msg.sender, approve);
    }

    function stakeVote(
        uint256 proposalId,
        uint256 topicId,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        require(amount > 0, "TopicBountyEscrow: invalid amount");
        Proposal memory proposal = proposals[proposalId];
        require(proposal.topicCount > 0, "TopicBountyEscrow: invalid proposal");
        require(proposal.status == ProposalStatus.Voting, "TopicBountyEscrow: not voting");
        require(topicId < proposal.topicCount, "TopicBountyEscrow: invalid topic");
        require(
            block.timestamp >= proposal.startTime && block.timestamp < proposal.endTime,
            "TopicBountyEscrow: voting closed"
        );

        guaToken.transferFrom(msg.sender, address(this), amount);
        topicStakeTotal[proposalId][topicId] += amount;
        voterStakeByTopic[proposalId][topicId][msg.sender] += amount;

        emit Voted(msg.sender, proposalId, topicId, amount);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function getTopic(uint256 proposalId, uint256 topicId) external view returns (Topic memory) {
        return topics[proposalId][topicId];
    }

    function pause() external onlyOwner {
        _pause();
        emit EscrowPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit EscrowUnpaused(msg.sender);
    }
}

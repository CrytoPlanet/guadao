// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TopicBountyEscrow is Ownable {
    enum ProposalStatus {
        Created
    }

    struct Proposal {
        uint64 startTime;
        uint64 endTime;
        uint8 topicCount;
        ProposalStatus status;
        uint256 winnerTopicId;
        uint256 totalPool;
        bool finalized;
    }

    struct Topic {
        address owner;
    }

    IERC20 public immutable guaToken;

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

    constructor(address _guaToken, address _owner) Ownable(_owner) {
        require(_guaToken != address(0), "TopicBountyEscrow: invalid token");
        require(_owner != address(0), "TopicBountyEscrow: invalid owner");

        guaToken = IERC20(_guaToken);
    }

    function createProposal(
        address[] calldata topicOwners,
        uint64 startTime,
        uint64 endTime
    ) external onlyOwner returns (uint256 proposalId) {
        uint256 count = topicOwners.length;
        require(count >= 3 && count <= 5, "TopicBountyEscrow: invalid topic count");
        require(endTime > startTime, "TopicBountyEscrow: invalid window");

        proposalId = ++proposalCount;
        proposals[proposalId] = Proposal({
            startTime: startTime,
            endTime: endTime,
            topicCount: uint8(count),
            status: ProposalStatus.Created,
            winnerTopicId: 0,
            totalPool: 0,
            finalized: false
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

    function finalizeVoting(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.topicCount > 0, "TopicBountyEscrow: invalid proposal");
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

        emit VotingFinalized(proposalId, winningTopicId, pool);
    }

    function stakeVote(uint256 proposalId, uint256 topicId, uint256 amount) external {
        require(amount > 0, "TopicBountyEscrow: invalid amount");
        Proposal memory proposal = proposals[proposalId];
        require(proposal.topicCount > 0, "TopicBountyEscrow: invalid proposal");
        require(topicId < proposal.topicCount, "TopicBountyEscrow: invalid topic");
        require(
            block.timestamp >= proposal.startTime && block.timestamp <= proposal.endTime,
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
}

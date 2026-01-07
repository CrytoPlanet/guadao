// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {GUAToken} from "./GUAToken.sol";

/**
 * @title MerkleAirdrop
 * @dev 基于 Merkle proof 的代币空投合约（可升级版本）
 * @notice 用户可以通过提供有效的 Merkle proof 领取 GUA Token
 */
contract MerkleAirdrop is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    /// @dev GUA Token 合约地址
    GUAToken public guaToken;

    /// @dev 当前 Merkle root
    bytes32 public merkleRoot;

    /// @dev 记录已领取的地址
    uint256 public epoch;
    mapping(address => uint256) public claimedEpoch;

    /// @dev Root 更新事件
    event MerkleRootUpdated(bytes32 indexed oldRoot, bytes32 indexed newRoot);

    /// @dev 领取事件
    event Claimed(address indexed to, uint256 amount);

    /// @dev 禁用构造函数，使用 initialize 代替
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数，替代构造函数
     * @param _guaToken GUA Token 合约地址
     * @param _owner 合约所有者（管理员）
     */
    function initialize(address _guaToken, address _owner) public initializer {
        require(_guaToken != address(0), "MerkleAirdrop: invalid token address");
        require(_owner != address(0), "MerkleAirdrop: invalid owner address");

        __Ownable_init(_owner);

        guaToken = GUAToken(_guaToken);
    }

    /**
     * @dev 设置 Merkle root（仅管理员）
     * @param _merkleRoot 新的 Merkle root
     * @notice 支持多期空投，通过更新 root 实现
     */
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        bytes32 oldRoot = merkleRoot;
        epoch += 1;
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(oldRoot, _merkleRoot);
    }

    /**
     * @dev 领取代币
     * @param to 接收代币的地址
     * @param amount 领取的代币数量
     * @param proof Merkle proof
     * @notice 每个地址只能领取一次，即使 root 更新也无法重复领取
     */
    function claim(address to, uint256 amount, bytes32[] calldata proof) external {
        require(to != address(0), "MerkleAirdrop: invalid address");
        require(amount > 0, "MerkleAirdrop: invalid amount");
        require(merkleRoot != bytes32(0), "MerkleAirdrop: root not set");
        require(claimedEpoch[to] < epoch, "MerkleAirdrop: already claimed");

        // 构建 leaf：keccak256(abi.encodePacked(address, amount))
        bytes32 leaf = keccak256(abi.encodePacked(to, amount));

        // 验证 Merkle proof
        require(MerkleProof.verify(proof, merkleRoot, leaf), "MerkleAirdrop: invalid proof");

        // 标记为已领取
        claimedEpoch[to] = epoch;

        // Mint 代币到用户地址
        guaToken.mint(to, amount);

        // 发出事件
        emit Claimed(to, amount);
    }

    function claimed(address account) external view returns (bool) {
        return epoch > 0 && claimedEpoch[account] == epoch;
    }

    /**
     * @dev 授权升级，仅 Owner 可调用
     * @param newImplementation 新的实现合约地址
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

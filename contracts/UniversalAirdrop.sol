// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {GUAToken} from "./GUAToken.sol";

/**
 * @title UniversalAirdrop
 * @dev 通用空投合约，允许任意钱包领取固定数量的 GUA Token
 * @notice 无需 Merkle proof，每个地址仅可领取一次
 */
contract UniversalAirdrop is Initializable, OwnableUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    /// @dev GUA Token 合约地址
    GUAToken public guaToken;

    /// @dev 每个钱包可领取的数量
    uint256 public claimAmount;

    /// @dev 已发放总量
    uint256 public totalClaimed;

    /// @dev 最大供应上限
    uint256 public maxSupply;

    /// @dev 记录已领取的地址
    mapping(address => bool) public claimed;

    /// @dev 领取事件
    event Claimed(address indexed user, uint256 amount);

    /// @dev 配置变更事件
    event ClaimAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event MaxSupplyUpdated(uint256 oldSupply, uint256 newSupply);

    /// @dev 禁用构造函数，使用 initialize 代替
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数，替代构造函数
     * @param _guaToken GUA Token 合约地址
     * @param _owner 合约所有者（管理员）
     * @param _claimAmount 每钱包领取数量
     * @param _maxSupply 最大供应上限
     */
    function initialize(address _guaToken, address _owner, uint256 _claimAmount, uint256 _maxSupply)
        public
        initializer
    {
        require(_guaToken != address(0), "UniversalAirdrop: invalid token address");
        require(_owner != address(0), "UniversalAirdrop: invalid owner address");
        require(_claimAmount > 0, "UniversalAirdrop: invalid claim amount");
        require(_maxSupply >= _claimAmount, "UniversalAirdrop: invalid max supply");

        __Ownable_init(_owner);
        __Pausable_init();

        guaToken = GUAToken(_guaToken);
        claimAmount = _claimAmount;
        maxSupply = _maxSupply;
    }

    /**
     * @dev 领取代币
     * @notice 每个地址仅可领取一次
     */
    function claim() external whenNotPaused {
        require(!claimed[msg.sender], "UniversalAirdrop: already claimed");
        require(totalClaimed + claimAmount <= maxSupply, "UniversalAirdrop: max supply reached");

        claimed[msg.sender] = true;
        totalClaimed += claimAmount;

        guaToken.mint(msg.sender, claimAmount);

        emit Claimed(msg.sender, claimAmount);
    }

    /**
     * @dev 设置每钱包领取数量（仅管理员）
     * @param _claimAmount 新的领取数量
     */
    function setClaimAmount(uint256 _claimAmount) external onlyOwner {
        require(_claimAmount > 0, "UniversalAirdrop: invalid claim amount");

        uint256 oldAmount = claimAmount;
        claimAmount = _claimAmount;

        emit ClaimAmountUpdated(oldAmount, _claimAmount);
    }

    /**
     * @dev 设置最大供应上限（仅管理员）
     * @param _maxSupply 新的供应上限
     */
    function setMaxSupply(uint256 _maxSupply) external onlyOwner {
        require(_maxSupply >= totalClaimed, "UniversalAirdrop: invalid max supply");

        uint256 oldSupply = maxSupply;
        maxSupply = _maxSupply;

        emit MaxSupplyUpdated(oldSupply, _maxSupply);
    }

    /**
     * @dev 暂停合约（仅管理员）
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev 恢复合约（仅管理员）
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev 查询剩余可领取数量
     */
    function remainingSupply() external view returns (uint256) {
        return maxSupply - totalClaimed;
    }

    /**
     * @dev 授权升级，仅 Owner 可调用
     * @param newImplementation 新的实现合约地址
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

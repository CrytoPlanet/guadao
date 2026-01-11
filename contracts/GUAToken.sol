// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {
    ERC20PermitUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {
    ERC20VotesUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {NoncesUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";

/**
 * @title GUAToken
 * @dev GUA Token 是「吃瓜群众自治社」的 ERC-20 代币（可升级版本）
 * @notice 支持 ERC20Votes 用于链上治理投票委托
 *
 * 版本历史：
 * - V1: 基础 ERC20 + AccessControl
 * - V2: 添加 ERC20Permit + ERC20Votes 支持链上治理
 */
contract GUAToken is
    Initializable,
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    ERC20VotesUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    /// @dev Minter 角色，允许铸造代币
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev 禁用构造函数，使用 initialize 代替
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数，替代构造函数 (V1)
     * @param admin 管理员地址（获得 DEFAULT_ADMIN_ROLE）
     */
    function initialize(address admin) public initializer {
        require(admin != address(0), "GUAToken: invalid admin");

        __ERC20_init("GUA Token", "GUA");
        __ERC20Permit_init("GUA Token");
        __ERC20Votes_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /**
     * @dev V2 重新初始化函数，用于从 V1 升级时调用
     * @notice 仅在从 V1 升级到 V2 时调用一次
     */
    function initializeV2() public reinitializer(2) {
        __ERC20Permit_init("GUA Token");
        __ERC20Votes_init();
    }

    /**
     * @dev 铸造代币，仅拥有 MINTER_ROLE 的地址可调用
     * @param to 接收代币的地址
     * @param amount 铸造的代币数量
     * @notice 用于初始分发或 Treasury 操作
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev 授权升级，仅 DEFAULT_ADMIN_ROLE 可调用
     * @param newImplementation 新的实现合约地址
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ============ Override Functions Required by ERC20Votes ============

    /**
     * @dev 覆盖 _update 函数以支持 Votes 追踪
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20VotesUpgradeable)
    {
        super._update(from, to, value);
    }

    /**
     * @dev 覆盖 nonces 函数以解决多重继承冲突
     */
    function nonces(address owner) public view override(ERC20PermitUpgradeable, NoncesUpgradeable) returns (uint256) {
        return super.nonces(owner);
    }
}


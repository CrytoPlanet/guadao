// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title GUAToken
 * @dev GUA Token 是「吃瓜群众自治社」的 ERC-20 代币（可升级版本）
 * @notice 初始供应量为 0，通过 MerkleAirdrop 或其他机制分发
 */
contract GUAToken is Initializable, ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    /// @dev Minter 角色，允许铸造代币
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev 禁用构造函数，使用 initialize 代替
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数，替代构造函数
     * @param admin 管理员地址（获得 DEFAULT_ADMIN_ROLE）
     */
    function initialize(address admin) public initializer {
        require(admin != address(0), "GUAToken: invalid admin");

        __ERC20_init("GUA Token", "GUA");
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
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
}

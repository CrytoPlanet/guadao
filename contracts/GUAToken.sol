// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GUAToken
 * @dev GUA Token 是「吃瓜群众自治社」的 ERC-20 代币
 * @notice 初始供应量为 0，通过 MerkleAirdrop 或其他机制分发
 */
contract GUAToken is ERC20, Ownable {
    /**
     * @dev 构造函数，初始化代币名称和符号
     * @notice 初始总供应量为 0
     */
    constructor() ERC20("GUA Token", "GUA") Ownable(msg.sender) {
        // 初始供应量为 0，通过 mint 或其他机制分发
    }

    /**
     * @dev 铸造代币，仅 owner 可调用
     * @param to 接收代币的地址
     * @param amount 铸造的代币数量
     * @notice 用于初始分发或 Treasury 操作
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}


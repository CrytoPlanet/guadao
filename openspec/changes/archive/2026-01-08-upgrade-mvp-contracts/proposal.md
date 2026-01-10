# Change: 升级 MVP 合约为可升级模式并集成多签

## Why
当前 MVP 合约一经部署无法修改，也缺少细粒度权限控制。升级为 UUPS 代理模式后，可在需要时修复 Bug 或添加功能而无需重新部署；引入 AccessControl 后，可将 Mint 权限与管理权限分离，并将最高管理权转移给多签钱包。

## What Changes
- **GUAToken**: 继承 `ERC20Upgradeable` + `AccessControlUpgradeable` + `UUPSUpgradeable`，使用 `MINTER_ROLE` 授权 mint
- **MerkleAirdrop**: 继承 `OwnableUpgradeable` + `UUPSUpgradeable`
- **TopicBountyEscrow**: 继承 `OwnableUpgradeable` + `UUPSUpgradeable` + `PausableUpgradeable` + `ReentrancyGuardUpgradeable`；treasury 改为可变并新增 `setTreasury()`
- **Deploy.s.sol**: 使用 `ERC1967Proxy` 部署所有合约，调用 `initialize` 进行初始化，配置角色并将 owner 转移给多签地址

## Impact
- Affected specs: `gua-token`, `merkle-airdrop`, `topic-bounty-escrow`
- Affected code: `contracts/GUAToken.sol`, `contracts/MerkleAirdrop.sol`, `contracts/TopicBountyEscrow.sol`, `script/Deploy.s.sol`
- **BREAKING**: 合约地址将变更（代理部署）

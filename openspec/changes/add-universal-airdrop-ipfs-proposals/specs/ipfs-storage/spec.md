# ipfs-storage Specification

## ADDED Requirements

### Requirement: Pinata IPFS 上传
系统 SHALL 提供将 Topic 内容上传到 Pinata 的功能。

#### Scenario: 成功上传
- **WHEN** 前端调用 IPFS 上传函数并提供 JSON 内容
- **THEN** 系统返回 IPFS CID

#### Scenario: 上传失败处理
- **WHEN** Pinata API 返回错误
- **THEN** 系统显示用户友好的错误信息

### Requirement: CID 哈希计算
系统 SHALL 将 IPFS CID 转换为 bytes32 哈希用于链上存储。

#### Scenario: 计算哈希
- **WHEN** 获取 CID 后
- **THEN** 计算 `keccak256(bytes(cid))` 作为链上存储值

#### Scenario: 哈希验证
- **WHEN** 前端读取链上哈希和链下 CID
- **THEN** 前端可验证 `keccak256(bytes(cid)) === onChainHash`

### Requirement: IPFS 内容读取
系统 SHALL 从 IPFS 网关读取 Topic 内容。

#### Scenario: 成功读取
- **WHEN** 前端使用 CID 从 IPFS 网关获取内容
- **THEN** 返回解析后的 JSON 对象

#### Scenario: 备用网关
- **WHEN** 主 Pinata 网关不可用
- **THEN** 系统尝试备用网关（ipfs.io, cloudflare-ipfs）

### Requirement: Topic 内容 Schema
Topic 内容 JSON SHALL 遵循标准 schema。

#### Scenario: 有效内容
- **WHEN** 上传的 JSON 包含 version, title, creator 字段
- **THEN** 验证通过并上传

#### Scenario: 无效内容
- **WHEN** 上传的 JSON 缺少必填字段
- **THEN** 前端显示验证错误，阻止上传

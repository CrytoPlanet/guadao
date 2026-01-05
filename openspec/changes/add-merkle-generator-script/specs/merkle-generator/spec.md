## ADDED Requirements
### Requirement: 确定性的叶子哈希
生成器 SHALL 使用 `keccak256(abi.encodePacked(address, amount))` 计算 leaf，其中 `address` 为 20 字节十六进制地址，`amount` 解析为 uint256。

#### Scenario: 有效分配条目
- **WHEN** 分配清单包含有效的 `address` 和 `amount`
- **THEN** 使用 `keccak256(abi.encodePacked(address, amount))` 计算 leaf hash

### Requirement: 确定性的树构建
生成器 SHALL 先对叶子哈希按字节序升序排序，并在每一层对配对哈希再次排序后再计算父节点。

#### Scenario: 相同输入得到稳定 root
- **WHEN** 多次提供同一份分配清单
- **THEN** 输出的 Merkle root 在多次运行中保持一致

### Requirement: Proof 与 root 输出
生成器 SHALL 输出 Merkle root，并为每一条分配记录生成对应的 proof，格式为机器可读。

#### Scenario: 每个地址都有 proof
- **WHEN** 提供有效的分配清单
- **THEN** 输出包含 Merkle root 且为每个输入条目提供 proof 数组

### Requirement: 输入校验
生成器 SHALL 拒绝无效地址、非整数金额或重复地址。

#### Scenario: 无效或重复输入
- **WHEN** 分配清单包含无效地址、非整数金额或重复地址
- **THEN** 生成器报错退出，且不输出 Merkle root
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { encodeFunctionData, parseAbi, parseAbiItem, isAddress } from 'viem';
import config from '../../config.json';
import { useI18n } from './LanguageProvider';

// --- Preset ABIs ---
const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function mint(address to, uint256 amount)',
    'function burn(uint256 amount)',
];

const TIMELOCK_ABI = [
    'function updateDelay(uint256 newDelay)',
    'function schedule(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt, uint256 delay)',
    'function cancel(bytes32 id)',
    'function execute(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt)',
];

const ESCROW_ABI = [
    'function pause()',
    'function unpause()',
    'function setReviewer(address _reviewer)',
    'function setArbitrator(address _arbitrator)',
    'function updateCategoryLimit(string category, uint256 limit)',
];

const UNIVERSAL_AIRDROP_ABI = [
    'function setMerkleRoot(bytes32 _merkleRoot)',
    'function withdrawTokens(address token, uint256 amount)',
    'function pause()',
    'function unpause()',
];

export default function SmartContractInteraction({ actionIndex, action, onUpdate }) {
    const { t } = useI18n();
    const { chainId } = useAccount();
    const currentChain = config.chains[chainId] || config.chains[config.defaultChainId];

    const [contractType, setContractType] = useState('custom'); // 'gua', 'timelock', 'escrow', 'airdrop', 'custom'
    const [selectedFunction, setSelectedFunction] = useState('');
    const [abiInputs, setAbiInputs] = useState([]);
    const [inputValues, setInputValues] = useState({});
    const [parsedAbi, setParsedAbi] = useState([]);

    // --- Contract Options ---
    const contracts = [
        { label: t('sci.contract.custom'), value: 'custom', address: '', abi: [] },
        { label: t('sci.contract.gua'), value: 'gua', address: currentChain.guaTokenAddress, abi: ERC20_ABI },
        { label: t('sci.contract.timelock'), value: 'timelock', address: currentChain.timelockAddress, abi: TIMELOCK_ABI },
        { label: t('sci.contract.escrow'), value: 'escrow', address: currentChain.escrowAddress, abi: ESCROW_ABI },
        { label: t('sci.contract.airdrop'), value: 'airdrop', address: currentChain.universalAirdropAddress, abi: UNIVERSAL_AIRDROP_ABI },
    ];

    // Initialize/Sync from parent action
    useEffect(() => {
        // If the action's target matches a known contract, select it
        if (!action.target) return;
        const knownContract = contracts.find(c => c.address && c.address.toLowerCase() === action.target.toLowerCase());
        if (knownContract) {
            setContractType(knownContract.value);
            setParsedAbi(parseAbi(knownContract.abi));
        }
    }, [action.target]);

    // Handle Contract Change
    const handleContractChange = (type) => {
        setContractType(type);
        const selected = contracts.find(c => c.value === type);

        if (type !== 'custom') {
            setParsedAbi(parseAbi(selected.abi));
            onUpdate(actionIndex, 'target', selected.address);
        } else {
            setParsedAbi([]);
            onUpdate(actionIndex, 'target', '');
        }

        setSelectedFunction('');
        setAbiInputs([]);
        setInputValues({});
        onUpdate(actionIndex, 'calldata', '0x');
        onUpdate(actionIndex, 'signature', ''); // Clear legacy signature
    };

    // Handle Function Change
    const handleFunctionChange = (funcSignature) => {
        setSelectedFunction(funcSignature);
        const abiItem = parsedAbi.find(item => item.type === 'function' && item.name === funcSignature.split('(')[0]);

        if (abiItem) {
            setAbiInputs(abiItem.inputs);
            const initialValues = {};
            abiItem.inputs.forEach((input, index) => {
                initialValues[index] = '';
            });
            setInputValues(initialValues);
        }
    };

    // Handle Input Change & Auto-Encode
    const handleInputChange = (index, value) => {
        const newValues = { ...inputValues, [index]: value };
        setInputValues(newValues);

        // Try to encode
        try {
            const abiItem = parsedAbi.find(item => item.type === 'function' && item.name === selectedFunction.split('(')[0]);
            if (!abiItem) return;

            const args = abiItem.inputs.map((input, i) => {
                const val = newValues[i];
                return val;
            });

            // Make sure all args have values before encoding
            if (args.every(a => a !== undefined && a !== '')) {
                const data = encodeFunctionData({
                    abi: parsedAbi,
                    functionName: abiItem.name,
                    args: args
                });
                onUpdate(actionIndex, 'calldata', data);
            }
        } catch (e) {
            console.error("Encoding error:", e);
        }
    };

    return (
        <div style={{
            background: 'var(--bg-sub)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            {/* 1. Select Contract */}
            <div>
                <label className="field-label" style={{ display: 'block', fontSize: '0.9em', color: 'var(--muted)', marginBottom: '8px', fontWeight: 500 }}>
                    {t('sci.contract.label')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: contractType === 'custom' ? '1fr 1fr' : '1fr', gap: '12px', alignItems: 'center' }}>
                    <select
                        value={contractType}
                        onChange={(e) => handleContractChange(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--fg)', fontSize: '0.95em' }}
                    >
                        {contracts.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>

                    {/* Show Address Input for Custom, or Read-only Display for others */}
                    {contractType === 'custom' ? (
                        <input
                            type="text"
                            value={action.target}
                            onChange={(e) => onUpdate(actionIndex, 'target', e.target.value)}
                            placeholder="0x..."
                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--fg)' }}
                        />
                    ) : (
                        // Optional: Display the resolved address for confirmation
                        <div style={{ fontSize: '0.85em', color: 'var(--muted)', background: 'rgba(0,0,0,0.05)', padding: '8px 12px', borderRadius: '6px', border: '1px solid transparent', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{t('treasury.token.address')}:</span>
                            <span style={{ fontFamily: 'monospace' }}>{action.target}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Select Function (Only if not custom or if ABI provided) */}
            {parsedAbi.length > 0 && (
                <div>
                    <label style={{ display: 'block', fontSize: '0.9em', color: 'var(--muted)', marginBottom: '8px', fontWeight: 500 }}>
                        {t('sci.function.label')}
                    </label>
                    <select
                        value={selectedFunction}
                        onChange={(e) => handleFunctionChange(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--fg)', fontSize: '0.95em' }}
                    >
                        <option value="">{t('sci.function.placeholder')}</option>
                        {parsedAbi
                            .filter(item => item.type === 'function' && item.stateMutability !== 'view')
                            .map((item, idx) => (
                                <option key={idx} value={item.name}>
                                    {item.name}({item.inputs.map(i => `${i.type} ${i.name || ''}`).join(', ')})
                                </option>
                            ))}
                    </select>
                </div>
            )}

            {/* 3. Dynamic Inputs */}
            {selectedFunction && abiInputs.length > 0 && (
                <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {abiInputs.map((input, idx) => (
                            <div key={idx}>
                                <label style={{ fontSize: '0.85em', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                                    {input.name || `Param #${idx + 1}`} <span style={{ opacity: 0.7, fontSize: '0.9em' }}>({input.type})</span>
                                </label>
                                <input
                                    value={inputValues[idx] || ''}
                                    onChange={(e) => handleInputChange(idx, e.target.value)}
                                    placeholder={`${input.type} value`}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--fg)' }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. Value Field (Integrated) - Usually 0 but editable */}
            {/* 4. Value Field (Optional/Advanced) */}
            <details style={{ marginTop: '4px' }}>
                <summary style={{ fontSize: '0.85em', color: 'var(--muted)', cursor: 'pointer', userSelect: 'none' }}>
                    {t('sci.value.label')} (Advanced)
                </summary>
                <div style={{ marginTop: '8px' }}>
                    <input
                        value={action.value}
                        onChange={(e) => onUpdate(actionIndex, 'value', e.target.value)}
                        placeholder="0"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--fg)' }}
                    />
                    <p style={{ fontSize: '0.75em', color: 'var(--muted)', marginTop: '4px' }}>
                        Most governance actions do not require ETH value. Only set this if calling a payable function.
                    </p>
                </div>
            </details>

            {/* 5. Custom / Calldata Preview */}
            {(contractType === 'custom' && parsedAbi.length === 0) ? (
                <div>
                    <label style={{ display: 'block', fontSize: '0.9em', color: 'var(--muted)', marginBottom: '6px' }}>
                        {t('sci.calldata.label')}
                    </label>
                    <textarea
                        value={action.calldata}
                        onChange={(e) => onUpdate(actionIndex, 'calldata', e.target.value)}
                        placeholder="0x..."
                        rows={3}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--fg)', fontFamily: 'monospace', fontSize: '0.85em' }}
                    />
                </div>
            ) : (
                // Collapsible Preview for Generated Data
                <details style={{ marginTop: '8px', fontSize: '0.85em' }}>
                    <summary style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 500, listStyle: 'none' }}>
                        {t('sci.calldata.view')}
                    </summary>
                    <div style={{ marginTop: '8px' }}>
                        <textarea
                            readOnly
                            disabled
                            value={action.calldata || '0x'}
                            rows={3}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'var(--muted)', fontFamily: 'monospace', fontSize: '0.8em' }}
                        />
                    </div>
                </details>
            )}
        </div>
    );
}

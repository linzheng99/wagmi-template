import { useState } from "react";
import { parseUnits, formatUnits } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from "wagmi";

const ZEN_STAKE_ADDRESS = process.env.NEXT_ZEN_STAKE_ADDRESS

// 质押合约ABI（需要根据实际合约调整）
const STAKE_ABI = [
  {
    name: 'depositETH',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'payable'
  },
  {
    name: 'pool',
    type: 'function',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'stTokenAddress', type: 'address' },
      { name: 'poolWeight', type: 'uint256' },
      { name: 'lastRewardBlock', type: 'uint256' },
      { name: 'accZenPerST', type: 'uint256' },
      { name: 'stTokenAmount', type: 'uint256' },
      { name: 'minDepositAmount', type: 'uint256' },
      { name: 'unstakeLockedBlocks', type: 'uint256' },
    ]
  }
] as const;

// 定义池子信息类型
type PoolInfo = readonly [
  stTokenAddress: `0x${string}`,
  poolWeight: bigint,
  lastRewardBlock: bigint,
  accZenPerST: bigint,
  stTokenAmount: bigint,
  minDepositAmount: bigint,
  unstakeLockedBlocks: bigint
];

export function StakeToken() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const ETH_PID = 0; // 假设ETH池子ID是0

  // 获取ETH余额而不是ZEN代币余额
  const { data: balance } = useBalance({
    address: address,
  });

  // 获取ETH池子信息，指定类型
  const { data: poolInfo } = useReadContract({
    address: ZEN_STAKE_ADDRESS as `0x${string}`,
    abi: STAKE_ABI,
    functionName: 'pool',
    args: [BigInt(ETH_PID)],
  }) as { data: PoolInfo | undefined };

  const { writeContract: stake, data: stakeHash, isPending: isStaking } = useWriteContract();
  const { isSuccess: stakeSuccess } = useWaitForTransactionReceipt({ hash: stakeHash });

  const amountInWei = amount ? parseUnits(amount, 18) : 0n;

  const handleStake = () => {
    stake({
      address: ZEN_STAKE_ADDRESS as `0x${string}`,
      abi: STAKE_ABI,
      functionName: 'depositETH',
      value: amountInWei, // 发送ETH而不是调用参数
    });
  };

  if (!isConnected) return <div className="container">请连接钱包</div>;

  return (
    <div className="container">
      <h1>ETH质押</h1>
      
      <div className="form">
        <div className="form-group">
          <label>质押数量 (ETH)：</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="输入质押数量"
            min="0"
            step="0.001"
          />
          {balance && (
            <p>ETH余额: {formatUnits(balance.value, balance.decimals)} {balance.symbol}</p>
          )}
          {poolInfo && (
            <p>最小质押额度: {formatUnits(poolInfo[5], 18)} ETH</p>
          )}
        </div>

        <button onClick={handleStake} disabled={isStaking || !amount}>
          {isStaking ? '质押中...' : '质押ETH'}
        </button>
      </div>

      {stakeSuccess && <p>✅ 质押成功！</p>}
    </div>
  );
}

import { erc20Abi } from "viem";
import { useChainId, useReadContract } from "wagmi";

export function ReadContractData() {
  const ZenStakeToken = process.env.NEXT_PUBLIC_ZEN_STAKE_ADDRESS as `0x${string}`;
  const ZENTokenERC20 = process.env.NEXT_PUBLIC_ZEN_ERC20_ADDRESS as `0x${string}`;
  return (
    <div>
      <ZenTokenERCInfo address={ZENTokenERC20} />
      <ZenStakeInfo address={ZenStakeToken} />
    </div>
  )
}


function ZenTokenERCInfo({ address }: { address: `0x${string}` }) {
  const { data: symbol } = useReadContract({
    abi: erc20Abi,
    address: address,
    functionName: 'symbol',
  });

  const { data: name } = useReadContract({
    abi: erc20Abi,
    address: address,
    functionName: 'name',
  });

  const { data: decimals } = useReadContract({
    abi: erc20Abi,
    address: address,
    functionName: 'decimals',
  });

  return (
    <div className="token-info">
      <p><strong>代币名称:</strong> {name || '加载中...'}</p>
      <p><strong>符号:</strong> {symbol || '加载中...'}</p>
      <p><strong>精度:</strong> {decimals !== undefined ? decimals : '加载中...'}</p>
    </div>
  );
}

function ZenStakeInfo({ address }: { address: `0x${string}` }) {
  const chainId = useChainId()

  const poolAbi = [
    {
      "constant": true,
      "inputs": [],
      "name": "startBlock",
      "outputs": [{ "name": "", "type": "uint256" }],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "endBlock",
      "outputs": [{ "name": "", "type": "uint256" }],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "ZenPerBlock",
      "outputs": [{ "name": "", "type": "uint256" }],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "withdrawPaused",
      "outputs": [{ "name": "", "type": "bool" }],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "claimPaused",
      "outputs": [{ "name": "", "type": "bool" }],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "Zen",
      "outputs": [{ "name": "", "type": "address" }],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "totalPoolWeight",
      "outputs": [{ "name": "", "type": "uint256" }],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "poolLength",
      "outputs": [{ "name": "", "type": "uint256" }],
      "type": "function"
    }
  ] as const;

  const { data: startBlock } = useReadContract({
    abi: poolAbi,
    address: address,
    functionName: 'startBlock',
    chainId: 11155111,
  });

  const { data: endBlock } = useReadContract({
    abi: poolAbi,
    address: address,
    functionName: 'endBlock',
    chainId: 11155111,
  });

  const { data: zenPerBlock } = useReadContract({
    abi: poolAbi,
    address: address,
    functionName: 'ZenPerBlock',
    chainId: 11155111,
  });

  const { data: withdrawPaused } = useReadContract({
    abi: poolAbi,
    address: address,
    functionName: 'withdrawPaused',
    chainId: 11155111,
  });

  const { data: claimPaused } = useReadContract({
    abi: poolAbi,
    address: address,
    functionName: 'claimPaused',
    chainId: 11155111,
  });

  const { data: zenToken } = useReadContract({
    abi: poolAbi,
    address: address,
    functionName: 'Zen',
    chainId: 11155111,
  });

  const { data: totalPoolWeight } = useReadContract({
    abi: poolAbi,
    address: address,
    functionName: 'totalPoolWeight',
    chainId: 11155111,
  });

  const { data: poolLength } = useReadContract({
    abi: poolAbi,
    address: address,
    functionName: 'poolLength',
    chainId: 11155111,
  });

  return (
    <div className="token-info">
      <h3>ZEN 质押池信息</h3>
      <p><strong>当前网络ID:</strong> {chainId}</p>
      <p><strong>合约地址:</strong> {address}</p>
      <p><strong>开始区块:</strong> {startBlock?.toString() || '加载中...'}</p>
      <p><strong>结束区块:</strong> {endBlock?.toString() || '加载中...'}</p>
      <p><strong>每区块奖励:</strong> {zenPerBlock ? (Number(zenPerBlock) / 10**18).toFixed(4) : '加载中...'} ZEN</p>
      <p><strong>提取暂停:</strong> {withdrawPaused !== undefined ? (withdrawPaused ? '是' : '否') : '加载中...'}</p>
      <p><strong>领取暂停:</strong> {claimPaused !== undefined ? (claimPaused ? '是' : '否') : '加载中...'}</p>
      <p><strong>奖励代币地址:</strong> {zenToken?.toString() || '加载中...'}</p>
      <p><strong>总池权重:</strong> {totalPoolWeight?.toString() || '加载中...'}</p>
      <p><strong>池数量:</strong> {poolLength?.toString() || '加载中...'}</p>
    </div>
  );
}


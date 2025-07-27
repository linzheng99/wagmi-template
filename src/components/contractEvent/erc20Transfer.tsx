import { useEffect, useState } from 'react';
import { useAccount, useChainId, useWriteContract, useReadContract } from 'wagmi';
import { erc20Abi, parseUnits, formatUnits } from 'viem';

export function ERC20Event() {
  const tokenAddress = process.env.NEXT_PUBLIC_ZEN_ERC20_ADDRESS as `0x${string}`
  const toAddress = process.env.NEXT_PUBLIC_ZEN_STAKE_ADDRESS as `0x${string}`
  const { address } = useAccount()
  const chainId = useChainId()
  const [amount, setAmount] = useState('1');
  const [inputError, setInputError] = useState('');

  // 读取代币信息
  const { data: decimals } = useReadContract({
    chainId,
    address: tokenAddress,
    functionName: 'decimals',
    abi: erc20Abi,
  });

  const { data: symbol } = useReadContract({
    chainId,
    address: tokenAddress,
    functionName: 'symbol',
    abi: erc20Abi,
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    chainId,
    address: tokenAddress,
    functionName: 'balanceOf',
    abi: erc20Abi,
    args: [address as `0x${string}`],
  });

  const { 
    writeContract, 
    isPending, 
    isSuccess, 
    isError, 
    error: writeError 
  } = useWriteContract();

  // 计算转账金额
  const valueInWei = amount && decimals ? parseUnits(amount, decimals) : 0n;

  // 验证输入
  useEffect(() => {
    if (!amount) {
      setInputError('');
      return;
    }
    
    try {
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        setInputError('请输入有效的金额');
        return;
      }
      
      if (balance && decimals && valueInWei > balance) {
        setInputError('余额不足');
        return;
      }
      
      setInputError('');
    } catch (error) {
      setInputError('无效的金额格式');
    }
  }, [amount, balance, decimals, valueInWei]);

  // 转账成功后刷新余额
  useEffect(() => {
    if (isSuccess) {
      refetchBalance();
    }
  }, [isSuccess, refetchBalance]);

  const handleTransfer = () => {
    if (!valueInWei || inputError || !decimals) return;
    
    writeContract({
      chainId,
      address: tokenAddress,
      functionName: 'transfer',
      abi: erc20Abi,
      args: [toAddress, valueInWei],
    });
  };

  return (
    <div>
      <h3>ERC20 转账</h3>
      
      {/* 余额显示 */}
      {balance && decimals && symbol && (
        <div className="balance-info">
          <p><strong>当前余额:</strong> {formatUnits(balance, decimals)} {symbol}</p>
        </div>
      )}
      
      <div className="input-group">
        <label>转账数量:</label>
        <input 
          type="text" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)} 
          placeholder="例如: 1.5"
        />
        {inputError && <p className="error-text">{inputError}</p>}
      </div>
      
      <div className="input-group">
        <label>接收地址:</label>
        <input 
          type="text" 
          value={toAddress || ''} 
          placeholder="0x..." 
          readOnly
        />
      </div>
      
      <div className="conversion-info">
        <p>
          <strong>{amount || '0'}</strong> 个{symbol || '代币'} = 
          <strong> {valueInWei.toString()}</strong> 最小单位
        </p>
      </div>
      
      <button 
        onClick={handleTransfer} 
        disabled={isPending || !!inputError || !amount || !decimals}
        className={isPending ? 'loading' : ''}
      >
        {isPending ? '转账中...' : `转账 ${amount || '0'} 个${symbol || '代币'}`}
      </button>
      
      <div className="status-info">
        {isSuccess && <p className="success">✅ 转账成功！</p>}
        {isError && <p className="error">❌ 转账失败: {writeError?.message}</p>}
      </div>
    </div>
  )
}

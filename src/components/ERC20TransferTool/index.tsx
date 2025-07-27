"use client";
import { useState, useEffect, FormEvent } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSimulateContract,
} from 'wagmi';
import { formatUnits, parseUnits, isAddress, erc20Abi } from 'viem';

// 定义转账记录类型
interface TransferRecord {
  tokenAddress: string;
  recipient: string;
  amount: string;
  symbol: string;
  txHash: string;
  status: 'success' | 'error' | 'pending';
  timestamp: number;
}

export function ERC20TransferTool() {
  const [tokenAddress, setTokenAddress] = useState<string>(''); // 改为空字符串
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [decimals, setDecimals] = useState(18);
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);
  const [errors, setErrors] = useState({
    tokenAddress: '',
    recipient: '',
    amount: ''
  });

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const { data: ethBalance } = useBalance({
    address,
  });

  // 获取代币余额
  const { data: tokenBalanceData, refetch: refetchTokenBalance } = useBalance({
    address,
    token: tokenAddress && isAddress(tokenAddress) ? tokenAddress as `0x${string}` : undefined,
    query: {
      enabled: isTokenValid && !!tokenAddress && isAddress(tokenAddress),
    }
  });

  // 处理代币余额数据更新
  useEffect(() => {
    if (tokenBalanceData) {
      setTokenBalance(tokenBalanceData.formatted);
      setDecimals(tokenBalanceData.decimals);
      setTokenSymbol(tokenBalanceData.symbol);
    } else {
      setTokenBalance('0');
      setTokenSymbol('');
      setDecimals(18);
    }
  }, [tokenBalanceData]);

  // 使用新的useWriteContract钩子
  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();

  // 等待交易确认
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isReverted,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // 模拟合约调用
  const {
    data: simulateData,
    error: simulateError,
    isLoading: isSimulating
  } = useSimulateContract({
    address: tokenAddress && isAddress(tokenAddress) ? tokenAddress as `0x${string}` : undefined,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [
      recipient && isAddress(recipient) ? recipient as `0x${string}` : '0x0000000000000000000000000000000000000000',
      amount && decimals ? parseUnits(amount, decimals) : 0n
    ],
    query: {
      enabled: !!(
        tokenAddress && 
        isAddress(tokenAddress) && 
        recipient && 
        isAddress(recipient) && 
        amount && 
        parseFloat(amount) > 0 &&
        !errors.tokenAddress &&
        !errors.recipient &&
        !errors.amount
      ),
    }
  });

  // 验证代币地址
  useEffect(() => {
    const validateToken = async () => {
      setErrors(prev => ({ ...prev, tokenAddress: '' }));

      if (!tokenAddress) {
        setIsTokenValid(false);
        return;
      }

      if (!isAddress(tokenAddress)) {
        setErrors(prev => ({
          ...prev,
          tokenAddress: '无效的合约地址'
        }));
        setIsTokenValid(false);
        return;
      }

      try {
        setIsTokenValid(true);
        refetchTokenBalance();
      } catch (error) {
        setErrors(prev => ({
          ...prev,
          tokenAddress: '无法获取代币信息'
        }));
        setIsTokenValid(false);
      }
    };

    validateToken();
  }, [tokenAddress, refetchTokenBalance]);

  // 验证收款地址
  useEffect(() => {
    if (!recipient) {
      setErrors(prev => ({ ...prev, recipient: '' }));
      return;
    }

    if (!isAddress(recipient)) {
      setErrors(prev => ({
        ...prev,
        recipient: '无效的钱包地址'
      }));
    } else {
      setErrors(prev => ({ ...prev, recipient: '' }));
    }
  }, [recipient]);

  // 验证金额
  useEffect(() => {
    if (!amount) {
      setErrors(prev => ({ ...prev, amount: '' }));
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue)) {
      setErrors(prev => ({
        ...prev,
        amount: '请输入有效数字'
      }));
    } else if (amountValue <= 0) {
      setErrors(prev => ({
        ...prev,
        amount: '金额必须大于0'
      }));
    } else if (tokenBalance && amountValue > parseFloat(tokenBalance)) {
      setErrors(prev => ({
        ...prev,
        amount: '余额不足'
      }));
    } else {
      setErrors(prev => ({ ...prev, amount: '' }));
    }
  }, [amount, tokenBalance]);

  // 处理转账结果
  useEffect(() => {
    if (isConfirmed && txHash) {
      // 添加到转账记录
      const newRecord: TransferRecord = {
        tokenAddress,
        recipient,
        amount,
        symbol: tokenSymbol,
        txHash,
        status: 'success',
        timestamp: Date.now()
      };

      setTransferHistory(prev => [newRecord, ...prev]);

      // 刷新余额
      refetchTokenBalance();
    }

    if (isReverted) {
      // 添加到转账记录
      const newRecord: TransferRecord = {
        tokenAddress,
        recipient,
        amount,
        symbol: tokenSymbol,
        txHash: txHash || '',
        status: 'error',
        timestamp: Date.now()
      };

      setTransferHistory(prev => [newRecord, ...prev]);
    }
  }, [isConfirmed, isReverted, txHash, tokenAddress, recipient, amount, tokenSymbol, refetchTokenBalance]);

  // 提交转账
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 检查模拟结果
    if (!simulateData?.request) {
      console.error('模拟交易失败:', simulateError);
      return;
    }

    // 使用模拟结果执行交易
    writeContract(simulateData.request);
  };

  // 获取错误消息 - 包含模拟错误
  const getErrorMessage = () => {
    if (simulateError) return `模拟失败: ${simulateError.message}`;
    if (writeError) return writeError.message;
    if (confirmError) return confirmError.message;
    return null;
  };

  // 重置表单
  const resetForm = () => {
    setTokenAddress(''); // 改为空字符串
    setRecipient('');
    setAmount('');
    setIsTokenValid(false);
    setTokenSymbol('');
    setTokenBalance('0');
    setErrors({
      tokenAddress: '',
      recipient: '',
      amount: ''
    });
    resetWrite();
  };

  // 交易状态描述
  const getTransactionStatus = () => {
    if (isWritePending) return '等待钱包确认...';
    if (isConfirming) return '交易处理中...';
    if (isConfirmed) return '转账成功！';
    if (isReverted) return '转账失败';
    return '';
  };

  // 交易状态颜色
  const getStatusColor = () => {
    if (isWritePending || isConfirming) return 'text-yellow-600';
    if (isConfirmed) return 'text-green-600';
    if (isReverted) return 'text-red-600';
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            ERC20 代币转账工具
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：转账表单 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                代币转账
              </h2>

              {/* 钱包连接状态 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                {isConnected ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">已连接钱包</p>
                        <p className="font-mono text-sm text-gray-700 truncate">
                          {address}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          disconnect();
                          resetForm();
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                      >
                        断开连接
                      </button>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm text-gray-500">ETH 余额</p>
                      <p className="text-gray-700">
                        {ethBalance ? formatUnits(ethBalance.value, ethBalance.decimals) : '0.0000'} {ethBalance?.symbol}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <button
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      连接 MetaMask 钱包
                    </button>
                    <p className="mt-2 text-sm text-gray-500">
                      请连接钱包以开始使用
                    </p>
                  </div>
                )}
              </div>

              {/* 转账表单 */}
              {isConnected && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      代币合约地址
                    </label>
                    <input
                      type="text"
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(e.target.value)}
                      placeholder="0x..."
                      className={`w-full px-4 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.tokenAddress ? 'border-red-500' : 'border-gray-300'
                        }`}
                      required
                    />
                    {errors.tokenAddress && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.tokenAddress}
                      </p>
                    )}
                  </div>

                  {isTokenValid && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm font-medium text-gray-700">代币信息</span>
                          <span className="ml-2 px-2 py-1 bg-green-100 text-gray-800 text-xs rounded-full">
                            {tokenSymbol}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          小数位: {decimals}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        您的余额: <span className="font-medium">{tokenBalance}</span> {tokenSymbol}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      收款地址
                    </label>
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="0x..."
                      className={`w-full px-4 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.recipient ? 'border-red-500' : 'border-gray-300'
                        }`}
                      required
                    />
                    {errors.recipient && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.recipient}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      转账金额
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="输入数量"
                      className={`w-full px-4 py-2 border rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.amount ? 'border-red-500' : 'border-gray-300'
                        }`}
                      required
                    />
                    {errors.amount && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.amount}
                      </p>
                    )}
                  </div>

                  {/* 交易状态显示 */}
                  {(isWritePending || isConfirming) && (
                    <div className="p-4 bg-yellow-50 rounded-lg flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mr-3"></div>
                      <span className={`font-medium ${getStatusColor()}`}>
                        {getTransactionStatus()}
                      </span>
                    </div>
                  )}

                  {isConfirmed && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="font-medium text-green-700">
                        ✅ 转账成功！
                      </p>
                    </div>
                  )}

                  {isReverted && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="font-medium text-red-700">
                        ❌ 转账失败
                      </p>
                    </div>
                  )}

                  {/* 在表单中显示模拟状态 */}
                  {isSimulating && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-blue-700">🔄 正在模拟交易...</p>
                    </div>
                  )}

                  {simulateError && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-red-700">❌ 模拟失败: {simulateError.message}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      isWritePending || 
                      isConfirming || 
                      !simulateData?.request || 
                      isSimulating ||
                      !!Object.values(errors).find(error => error)
                    }
                    className={`w-full py-3 rounded-lg font-medium transition ${
                      isWritePending || isConfirming || !simulateData?.request
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isSimulating 
                      ? '模拟中...' 
                      : isWritePending || isConfirming
                        ? getTransactionStatus()
                        : '发送转账'
                    }
                  </button>

                  {getErrorMessage() && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg">
                      <p className="text-red-700 font-medium">
                        ❌ 错误: {getErrorMessage()}
                      </p>
                    </div>
                  )}

                  {txHash && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <a
                        href={`https://etherscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline block truncate"
                      >
                        在Etherscan上查看交易: {txHash.substring(0, 12)}...{txHash.substring(60)}
                      </a>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* 右侧：转账记录 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  转账记录
                </h2>
                <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full">
                  {transferHistory.length} 笔记录
                </span>
              </div>

              <TransferHistory history={transferHistory} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 转账记录组件
const TransferHistory = ({ history }: { history: TransferRecord[] }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        暂无转账记录
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((record, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border ${
            record.status === 'success'
              ? 'border-green-200 bg-green-50'
              : record.status === 'error'
              ? 'border-red-200 bg-red-50'
              : 'border-yellow-200 bg-yellow-50'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-gray-800">
                转账给 {record.recipient.substring(0, 6)}...{record.recipient.substring(38)}
              </h3>
              <p className="text-sm text-gray-600">
                {record.amount} {record.symbol}
              </p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.status === 'success'
              ? 'bg-green-100 text-green-800'
              : record.status === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
              }`}>
              {record.status === 'success' ? '成功' :
                record.status === 'error' ? '失败' :
                  '处理中'}
            </span>
          </div>

          {record.txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${record.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-sm text-blue-600 hover:underline inline-block truncate max-w-full"
            >
              查看交易: {record.txHash.substring(0, 12)}...{record.txHash.substring(60)}
            </a>
          )}

          <div className="mt-2 text-xs text-gray-500">
            {new Date(record.timestamp).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
};

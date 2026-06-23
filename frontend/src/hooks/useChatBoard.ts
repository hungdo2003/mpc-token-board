import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACTS, CHAT_BOARD_ABI, BOARD_TOKEN_ABI } from "../config/contracts";

export interface ChatMessage {
  id: number;
  author: string;
  content: string;
  timestamp: number;
  rewarded: boolean;
}

export function useChatBoard(
  provider: ethers.BrowserProvider | null,
  signer: ethers.JsonRpcSigner | null,
  address: string | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBoardContract = useCallback(
    (withSigner = false) => {
      if (!provider) return null;
      const signerOrProvider = withSigner && signer ? signer : provider;
      return new ethers.Contract(CONTRACTS.CHAT_BOARD, CHAT_BOARD_ABI, signerOrProvider);
    },
    [provider, signer]
  );

  const getTokenContract = useCallback(
    () => {
      if (!provider) return null;
      return new ethers.Contract(CONTRACTS.BOARD_TOKEN, BOARD_TOKEN_ABI, provider);
    },
    [provider]
  );

  const loadMessages = useCallback(async () => {
    const contract = getBoardContract();
    if (!contract) return;
    setIsLoading(true);
    try {
      const count: bigint = await contract.messageCount();
      const total = Number(count);
      if (total === 0) { setMessages([]); return; }
      const from = Math.max(1, total - 49);
      const fetchCount = total - from + 1;
      const raw = await contract.getMessages(from, fetchCount);
      const parsed: ChatMessage[] = raw.map((m: any) => ({
        id: Number(m.id),
        author: m.author,
        content: m.content,
        timestamp: Number(m.timestamp),
        rewarded: m.rewarded,
      }));
      setMessages(parsed.reverse());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [getBoardContract]);

  const loadTokenBalance = useCallback(async () => {
    if (!address) return;
    const contract = getTokenContract();
    if (!contract) return;
    try {
      const bal: bigint = await contract.balanceOf(address);
      setTokenBalance(ethers.formatEther(bal));
    } catch {}
  }, [address, getTokenContract]);

  const postMessage = useCallback(
    async (content: string) => {
      const contract = getBoardContract(true);
      if (!contract) return;
      setIsPosting(true);
      setError(null);
      try {
        const tx = await contract.postMessage(content);
        await tx.wait();
        await loadMessages();
        await loadTokenBalance();
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsPosting(false);
      }
    },
    [getBoardContract, loadMessages, loadTokenBalance]
  );

  // Poll for updates every 10 seconds
  useEffect(() => {
    if (!provider) return;
    loadMessages();
    loadTokenBalance();
    const interval = setInterval(() => {
      loadMessages();
      loadTokenBalance();
    }, 10_000);
    return () => clearInterval(interval);
  }, [provider, loadMessages, loadTokenBalance]);

  // Listen for real-time events
  useEffect(() => {
    const contract = getBoardContract();
    if (!contract) return;
    const onMessagePosted = () => { loadMessages(); };
    const onTokenRewarded = () => { loadTokenBalance(); loadMessages(); };
    contract.on("MessagePosted", onMessagePosted);
    contract.on("TokenRewarded", onTokenRewarded);
    return () => {
      contract.off("MessagePosted", onMessagePosted);
      contract.off("TokenRewarded", onTokenRewarded);
    };
  }, [getBoardContract, loadMessages, loadTokenBalance]);

  return { messages, tokenBalance, isPosting, isLoading, error, postMessage, loadMessages };
}

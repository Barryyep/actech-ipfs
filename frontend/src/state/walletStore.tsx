import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Address } from 'viem';
import { getNetworkDisplayName, getDefaultChainId, isSupportedChainId } from '../lib/contractConfig';
import {
  getCurrentChainId,
  getExistingAccounts,
  requestNetworkSwitch,
  requestWalletConnection,
} from '../lib/web3';
import { fetchContractOwner } from '../lib/contractActions';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected';
export type OwnerStatus = 'idle' | 'checking' | 'allowed' | 'denied';

interface WalletContextValue {
  address?: Address;
  chainId?: number;
  status: WalletStatus;
  networkName: string;
  error?: string | null;
  contractOwner?: Address;
  ownerStatus: OwnerStatus;
  isOwner: boolean;
  connect: () => Promise<void>;
  requestSwitch: (targetChainId?: number) => Promise<void>;
}

interface WalletState {
  address?: Address;
  chainId?: number;
  status: WalletStatus;
  error?: string | null;
  contractOwner?: Address;
  ownerStatus: OwnerStatus;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<WalletState>({ status: 'disconnected', ownerStatus: 'idle' });

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'connecting', error: null }));
    try {
      const { address, chainId } = await requestWalletConnection();
      setState({
        address,
        chainId,
        status: 'connected',
        error: null,
        ownerStatus: 'idle',
        contractOwner: undefined,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'disconnected',
        error: (error as Error).message,
        ownerStatus: 'idle',
        contractOwner: undefined,
      }));
      throw error;
    }
  }, []);

  const requestSwitch = useCallback(async (targetChainId?: number) => {
    await requestNetworkSwitch(targetChainId ?? getDefaultChainId());
    const newChainId = await getCurrentChainId();
    setState((prev) => ({
      ...prev,
      chainId: newChainId ?? prev.chainId,
      ownerStatus: 'idle',
      contractOwner: undefined,
    }));
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const accounts = await getExistingAccounts();
        if (!accounts.length) return;
        const chainId = await getCurrentChainId();
        setState({
          address: accounts[0],
          chainId,
          status: 'connected',
          error: null,
          ownerStatus: 'idle',
          contractOwner: undefined,
        });
      } catch (error) {
        setState((prev) => ({ ...prev, error: (error as Error).message }));
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts.length) {
        setState((prev) => ({ ...prev, status: 'disconnected', ownerStatus: 'idle', contractOwner: undefined }));
        return;
      }
      setState((prev) => ({
        ...prev,
        address: accounts[0] as Address,
        status: 'connected',
        ownerStatus: 'idle',
        contractOwner: undefined,
      }));
    };

    const handleChainChanged = (chainIdHex: string) => {
      const parsed = Number.parseInt(chainIdHex, 16);
      setState((prev) => ({
        ...prev,
        chainId: parsed,
        ownerStatus: 'idle',
        contractOwner: undefined,
      }));
    };

    window.ethereum.on?.('accountsChanged', handleAccountsChanged);
    window.ethereum.on?.('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  useEffect(() => {
    if (!state.address || !state.chainId || !isSupportedChainId(state.chainId)) {
      setState((prev) => ({ ...prev, contractOwner: undefined, ownerStatus: 'idle' }));
      return;
    }

    let ignore = false;
    const verifyOwner = async () => {
      setState((prev) => ({ ...prev, ownerStatus: 'checking' }));
      try {
        const ownerAddress = await fetchContractOwner(state.chainId!);
        if (ignore) return;
        setState((prev) => ({
          ...prev,
          contractOwner: ownerAddress,
          ownerStatus: ownerAddress.toLowerCase() === (prev.address?.toLowerCase() ?? '') ? 'allowed' : 'denied',
        }));
      } catch (error) {
        if (ignore) return;
        setState((prev) => ({ ...prev, ownerStatus: 'denied', error: (error as Error).message }));
      }
    };

    void verifyOwner();

    return () => {
      ignore = true;
    };
  }, [state.address, state.chainId]);

  const value = useMemo<WalletContextValue>(
    () => ({
      ...state,
      networkName: getNetworkDisplayName(state.chainId),
      ownerStatus: state.ownerStatus ?? 'idle',
      contractOwner: state.contractOwner,
      isOwner: state.ownerStatus === 'allowed',
      connect,
      requestSwitch,
    }),
    [state, connect, requestSwitch],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

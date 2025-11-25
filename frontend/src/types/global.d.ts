declare global {
  interface EthereumProvider {
    request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
    on?(event: string, handler: (...args: any[]) => void): void;
    removeListener?(event: string, handler: (...args: any[]) => void): void;
  }

  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};

const IPFS_API_BASE = 'http://127.0.0.1:5001/api/v0';

const parseIpfsResponse = async (response: Response): Promise<string> => {
  const payload = await response.text();
  const lines = payload
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i]);
      if (parsed?.Hash) {
        return parsed.Hash as string;
      }
    } catch (error) {
      // Ignore parse errors for intermediate lines
    }
  }

  throw new Error('IPFS response did not include a CID.');
};

const handleIpfsResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error('IPFS upload failed, please check that the daemon is running and CORS is configured.');
  }
  return parseIpfsResponse(response);
};

export const uploadFileToIpfs = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${IPFS_API_BASE}/add?pin=true`, {
    method: 'POST',
    body: formData,
  });

  return handleIpfsResponse(response);
};

export const uploadJsonToIpfs = async <T extends Record<string, unknown>>(payload: T): Promise<string> => {
  const file = new File([JSON.stringify(payload)], 'metadata.json', {
    type: 'application/json',
  });
  return uploadFileToIpfs(file);
};

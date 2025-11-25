const IPFS_API_BASE = 'http://44.211.156.28:3000';

const parseIpfsResponse = async (response: Response): Promise<string> => {
  const payload = await response.json();

  if (payload?.cid) {
    return payload.cid as string;
  }

  if (payload?.ipfsResponse?.Hash) {
    return payload.ipfsResponse.Hash as string;
  }

  throw new Error('IPFS response did not include a CID.');
};

const handleIpfsResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error('IPFS upload failed, please check that the server is accessible.');
  }
  return parseIpfsResponse(response);
};

export const uploadFileToIpfs = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${IPFS_API_BASE}/upload`, {
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

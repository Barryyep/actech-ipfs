# AC Future RWA Merchant Dashboard - Implementation Checklist

Goal: build a small merchant dashboard that lets the contract owner

- View current on chain vehicle inventory
- Add a new vehicle by uploading files to local IPFS and calling `mintVehicle`

Contracts involved

- `VehicleNFT` (ERC 721 based)
- `VehicleEscrow` (escrow logic, optional for first version)

IPFS environment

- Local IPFS node already running
- API: `http://127.0.0.1:5001`
- Gateway: `http://127.0.0.1:8080`


## 1. Understand contract surface and owner functions

Use the provided ABI files

- `VehicleNFT.json`
- `VehicleEscrow.json`

From `VehicleNFT` ABI identify functions that are likely owner or admin actions:

- `mintVehicle(address to, VehicleMetadata metadata, Documents docs, string _tokenURI)`
- `lockToken(uint256 tokenId)`
- `unlockToken(uint256 tokenId)`
- `updateMetadata(uint256 tokenId, VehicleMetadata metadata)`
- `updateDocuments(uint256 tokenId, Documents docs)`
- `setTokenURI(uint256 tokenId, string _tokenURI)`
- `setTrustedContract(address contractAddress, bool trusted)`
- `pause()`
- `unpause()`
- `transferOwnership(address newOwner)`
- `renounceOwnership()`
- Possibly `burn(uint256 tokenId)` if it exists in this implementation

Common public or user level functions for reading inventory

- `totalSupply()`
- `ownerOf(uint256 tokenId)`
- `getVehicleDetails(uint256 tokenId)` - returns metadata and documents
- `vehicleMetadata(uint256 tokenId)`
- `vehicleDocuments(uint256 tokenId)`
- `doesVINExist(string vin)`
- `isLocked(uint256 tokenId)`
- `tokenURI(uint256 tokenId)`

From `VehicleEscrow` ABI identify admin related functions

- `pause()`
- `unpause()`
- `transferOwnership(address newOwner)`
- `renounceOwnership()`

User or business level functions (for future work)

- `createEscrow(uint256 tokenId, address buyer, uint256 amount)`
- `initiateEscrowWithDeposit(uint256 tokenId, uint256 amount, uint256 depositAmount)`
- `depositFunds(uint256 tokenId)`
- `cancelEscrow(uint256 tokenId)`
- `isInEscrow(uint256 tokenId)`
- `getEscrowDetails(uint256 tokenId)`


## 2. Project setup

[ ] Create a new React plus TypeScript project for the merchant console  
[ ] Use Yarn as the package manager  
[ ] Add a routing solution so there are at least two pages

- `/inventory` for viewing vehicles
- `/add-vehicle` for minting a new vehicle

[ ] Integrate the AC Future design system

- Use `DESIGN_SYSTEM.json` as reference for colors, fonts, spacing
- Apply dark theme background and light text
- Use the gold accent color for primary actions and highlights

[ ] Make sure the layout has a simple navigation bar

- Brand title for example `AC Future Merchant Console`
- Navigation links to `Inventory` and `Add Vehicle`


## 3. Contract configuration layer

Files available

- `deployed-addresses.json`
- `VehicleNFT.json`
- `VehicleEscrow.json`
- `index.ts` (ABI exports)

Checklist

[ ] Create a central contract config module

- Read from `deployed-addresses.json`
- Define mappings for at least two chain ids  
  - localhost (Hardhat or Anvil chain id)  
  - Sepolia (11155111)

[ ] In that module export, for each chain

- `vehicleNFT` address
- `vehicleEscrow` address
- a human readable `name` for the network

[ ] Implement a helper that

- Reads the current chain id from the connected wallet
- Selects the correct contract addresses from `deployed-addresses.json`
- Throws or returns a clear error if the chain is not supported

[ ] Implement an `isContractOwner` helper

- Uses `VehicleNFT.owner()` to read the owner address from the chain
- Compares with the connected wallet address
- Returns a boolean to guard admin actions in the UI


## 4. Web3 connection layer

[ ] Decide on the web3 library (for example viem or ethers)  
[ ] Create a small module that

- Creates a read client for public calls (`totalSupply`, `getVehicleDetails`, etc)
- Creates a write client for transactions (`mintVehicle`, `lockToken`, etc)
- Uses `window.ethereum` as the provider
- Exposes a function to ask the user to connect their wallet

[ ] Implement global wallet state

- Store `connectedAddress`
- Store `currentChainId`
- Track connection status for example `disconnected`, `connecting`, `connected`

[ ] In the main layout show

- Connected address (shortened)
- Network name (localhost or Sepolia)
- A button to connect or switch network if needed


## 5. IPFS upload utilities

Goal: from the browser, upload vehicle documents and JSON metadata to local IPFS.

[ ] Create a dedicated IPFS helper module

- Define the base API URL `http://127.0.0.1:5001/api/v0`

[ ] Add a function to upload a single file

- Accepts a `File` object from an `<input type="file">`
- Sends a `POST` request to `/add?pin=true` with form data
- Parses the response to extract the CID string
- Returns the raw CID (for example `Qm...`)

[ ] Add a function to upload JSON

- Accepts a plain JS object
- Serializes to JSON text
- Wraps as a file or directly posts it
- Calls the same `/add` API
- Returns the CID of the JSON file

[ ] Handle error cases

- Network errors
- Non ok responses from the IPFS API
- Parsing errors if CID is missing

[ ] Show clear UI messages if IPFS upload fails

- For example a toast or alert saying  
  `IPFS upload failed, please check that the daemon is running and CORS is configured`


## 6. Inventory page feature

Page route: `/inventory`  
Goal: fetch all existing vehicles from `VehicleNFT` and display them as a table.

[ ] Implement a data hook or store for inventory

- On mount, detect the current chain and contract addresses
- Create a read contract instance for `VehicleNFT`
- Call `totalSupply()` to get the number of vehicles

[ ] For each `tokenId` from `1` to `totalSupply`

- Call `getVehicleDetails(tokenId)`  
  - Extract metadata (vin, make, model, year, color, mileage, condition, mintedAt, etc)  
  - Extract document CIDs (titleDeedIPFS, registrationIPFS, inspectionIPFS, serviceHistoryIPFS)
- Call `ownerOf(tokenId)` to get the owner address
- Call `isLocked(tokenId)` to know if the vehicle is locked
- Optionally call `VehicleEscrow.isInEscrow(tokenId)` to know escrow status

[ ] Normalize all this into a simple array of rows

Each row should contain at least

- `tokenId`
- `vin`
- `make`
- `model`
- `year`
- `color`
- `mileage`
- `condition`
- `owner` address
- `locked` boolean
- `inEscrow` boolean (optional)
- document CIDs for display or future download

[ ] Display the inventory as a table

Columns suggestion

- Token ID
- VIN
- Model (for example `year make model`)
- Color
- Mileage
- Owner (shortened)
- Status (Available, Locked, In Escrow)
- A future `Details` link or button

[ ] Apply design system styles

- Use dark table variant
- Highlight status with colored badges
- Add loading state while data is being fetched
- Add empty state when there are no vehicles


## 7. Add vehicle page feature

Page route: `/add-vehicle`  
Goal: allow contract owner to upload files to IPFS and call `mintVehicle` to create a new NFT.

[ ] Build a form for vehicle metadata

Form fields

- VIN (string)
- Make (string)
- Model (string)
- Year (number)
- Color (string)
- Mileage (number)
- Condition (select or text)

[ ] Build file inputs for documents

- Title deed file
- Registration file
- Inspection file
- Service history file

[ ] Optional form additions

- Checkbox for `lock after mint` (follow up feature)
- Text input for an optional image or additional metadata

[ ] Form submission flow

1. Ensure wallet is connected  
2. Check `isContractOwner`  
   - If false show an error and stop  
3. Upload each document file to IPFS  
   - Get four CIDs  
4. Build the `VehicleMetadata` struct values  
   - Make sure numerical fields are in the correct type for the contract  
5. Build the `Documents` struct values  
   - Store CIDs as `ipfs://<CID>` strings  
6. Build a JSON metadata object for `_tokenURI`  
   - Basic NFT style metadata  
   - Include key attributes such as VIN, color, mileage  
7. Upload the JSON metadata to IPFS  
   - Get CID and assemble `tokenURI` as `ipfs://<CID>`  
8. Call `mintVehicle` on `VehicleNFT`  
   - Arguments: `to` address (admin), `metadata`, `docs`, `tokenURI`  
9. Wait for transaction confirmation  
10. After success  
   - Show a success message with the new tokenId (can be fetched via events or by reading `totalSupply` again)  
   - Redirect user back to `/inventory` and refresh the list

[ ] Add validation and UX

- Validate required fields  
- Disable the submit button during IPFS upload or transaction pending  
- Show clear error messages for IPFS upload and for chain failures


## 8. Optional admin actions for later versions

Do not implement now, only keep in mind for extension.

Possible future features

- Lock or unlock a vehicle from inventory  
  - Buttons that call `lockToken(tokenId)` and `unlockToken(tokenId)`  
- Admin pause and unpause controls  
  - A small safety panel that calls `pause()` and `unpause()` on both contracts  
- Escrow status view and basic operations  
  - Show details from `getEscrowDetails(tokenId)`  
  - Add actions for `createEscrow` or `cancelEscrow` based on business rules


## 9. Testing checklist

[ ] On localhost chain

- Deploy contracts and update `deployed-addresses.json`  
- Connect with a test wallet that is the `VehicleNFT.owner()`  
- Mint at least one demo vehicle from the `add vehicle` page  
- Confirm that the new vehicle appears correctly in the inventory table  
- Confirm that document CIDs are valid by browsing them through the IPFS gateway  

[ ] On Sepolia

- Use real `deployed-addresses.json` entries  
- Connect with the real owner wallet  
- Repeat the flow with a small test vehicle item  
- Confirm successful mint and visible inventory


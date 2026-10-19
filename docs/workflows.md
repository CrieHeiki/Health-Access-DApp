# Application Workflows

[← Back to README](../README.md) · [Architecture](architecture.md) · [Security Notes](security-notes.md)

These are code-derived descriptions of the existing proof of concept, not claims of a successfully recreated or retested deployment.

## 1. Wallet initialization and role selection

1. `src/pages/HomePage.js` calls `getContract()` from `src/contracts/MedicalRecordAccess.js`.
2. The helper requests MetaMask accounts, constructs a Web3 contract using `MedicalRecordAccess.json` and the fixed `CONTRACT_ADDRESS`, and returns the contract instance.
3. `roles(account)` returns one of `None`, `Patient`, `Doctor` or `Admin`, which controls which dashboard is shown.
4. The deployer starts as Admin in the constructor; extra initial wallets enter the contract as `Role.None`.

**Boundary:** Hiding a dashboard based on a role is a UI convenience. Smart-contract modifiers enforce write restrictions for the functions that use them; public storage remains publicly readable.

## 2. Administrator assigns a role

1. The admin enters a wallet address and patient or doctor attributes in `AssignUserForm.js`.
2. `AdminDashboard.js` invokes `assignRolePatient(...)` or `assignRoleDoctor(...)` as a blockchain transaction.
3. Contract state changes, and a `RoleAssigned` event is emitted.
4. The dashboard fetches `getAllUsers()` and `roles(address)` to refresh its list.

Personal details supplied at registration are stored in on-chain public mappings; only **synthetic** test data should be used.

## 3. Doctor enrolls an RSA public key

1. `DoctorDashboard.js` generates an RSA 2048-bit key pair with `node-forge` in the browser.
2. `setDoctorPublicKey(publicKeyPem)` writes the public key into the doctor's profile on-chain.
3. The UI displays the private key for copying. It is not put on-chain by the implemented workflow.
4. The doctor must retain the private key to decrypt future shared files; the contract currently allows setting the public key only once.

The UI keeps key material in browser component state while mounted. There is no full private-key backup/recovery mechanism, and this is not an enterprise key-management design.

## 4. Doctor requests a record

1. A doctor selects a patient and enters the purpose of access.
2. `requestRecordAccess(patient, purpose)` increments `requestCount` and saves an `AccessRequest`.
3. The contract emits `AccessRequested`.
4. The patient dashboard fetches `getMyAccessRequests()` and displays pending requests with doctor information.

## 5. Patient encrypts, uploads and approves

Implemented in `src/pages/PatientDashboard.js`:

1. The patient selects a local file for a pending request.
2. The browser creates a 32-byte random AES key and a 16-byte IV.
3. The browser encrypts the selected bytes using **AES-CBC** through `node-forge`.
4. It fetches the requesting doctor's public key and uses **RSA-OAEP** to encrypt the concatenated AES key and IV; the RSA ciphertext is Base64-encoded.
5. It calculates `web3.utils.sha3(aesKeyEncoded)` and requests a MetaMask personal signature over that hash.
6. `POST http://localhost:5000/upload` transfers the already-encrypted file to the local Express API.
7. The API forwards this file to Pinata and returns a CID (`ipfsHash`).
8. The browser calls `approveAccessAndUpload(requestId, ipfsHash, aesKeyEncoded, signature)` from the patient wallet.
9. The contract marks the request approved, creates a record and sets the requesting doctor's access value to `type(uint).max` (effectively without expiration).

**Important:** The CID represents the encrypted blob stored on IPFS. The signature in this code authenticates the hash of the **wrapped AES key string**, not the file bytes or all on-chain metadata. Approval and IPFS upload are separate operations: successful pinning does not guarantee a successful approval transaction.

## 6. Doctor retrieves and decrypts

Implemented in `src/pages/DoctorDashboard.js`:

1. The dashboard scans stored records for the selected patient, using the public `records(recordId)` getter.
2. It extracts `ipfsHash`, `encryptedAESKey` and `signature`.
3. It checks the recovered signer of `keccak256(encryptedAESKey)` against the record owner's wallet address.
4. The user supplies the RSA private key through the UI prompt.
5. `node-forge` decrypts the RSA-wrapped key/IV. The first 32 bytes form the AES key; subsequent bytes are the IV.
6. The browser requests the encrypted blob at `https://gateway.pinata.cloud/ipfs/<CID>` and decrypts it with AES-CBC.
7. The page creates a downloadable blob named `medical_record.pdf`.

**Observed limitations:** The UI chooses a patient's latest existing record, not necessarily a record authorized for the current doctor. The current decrypt/download path does not call `getRecord()` for its access check. The file output is given a fixed `.pdf` filename regardless of the source file type. These behaviors were **not modified** in this documentation cleanup.

## 7. Revocation, deletion and event coverage

The smart contract provides `revokeAccess` and `deleteRecord` even though there is no complete UI workflow for them in the current dashboards. Revocation updates contract access state; deletion removes the record entry from contract storage. Neither action can recall ciphertext already published through IPFS or invalidate an AES key already disclosed to a user.

The contract emits events for role assignment, upload, requests, granted/revoked access, public key publication and deletion. **It does not record each file view, off-chain download or decryption event.**

## 8. Files to review when reading the implementation

| Topic | Source |
| --- | --- |
| Role routing | `medical-access-app/src/pages/HomePage.js` |
| Admin writes | `medical-access-app/src/pages/AdminDashboard.js` |
| RSA and download/decrypt | `medical-access-app/src/pages/DoctorDashboard.js` |
| AES and upload/approval | `medical-access-app/src/pages/PatientDashboard.js` |
| Pinata request | `medical-access-app/backend/server.js` |
| Authoritative data model | `medical-contract/contracts/MedicalRecordAccess.sol` |

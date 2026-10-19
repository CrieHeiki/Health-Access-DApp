# System Architecture

[← Back to README](../README.md) · [Workflows](workflows.md) · [Security Notes](security-notes.md)

## 1. Scope

This document describes the code present in this repository **as implemented**, not a proposed production architecture. The original local setup used MetaMask, Ganache, a React frontend, an Express upload endpoint, the `MedicalRecordAccess` contract, and Pinata/IPFS. The cleanup did not add services or change the data model.

## 2. Components and ownership

| Component | Source | Actual responsibility |
| --- | --- | --- |
| Entry point / role routing | `medical-access-app/src/App.js`, `src/pages/HomePage.js` | Initialize MetaMask/Web3 contract access and display a role-specific dashboard. |
| Admin dashboard | `src/pages/AdminDashboard.js` and `src/components/` | Send role assignment transactions and display roles. |
| Doctor dashboard | `src/pages/DoctorDashboard.js` | Generate RSA keys, request access, read on-chain metadata, verify a signing address and decrypt downloaded files. |
| Patient dashboard | `src/pages/PatientDashboard.js` | Read access requests, locally encrypt a selected file, upload ciphertext and approve the request on-chain. |
| Active Web3 helper | `src/contracts/MedicalRecordAccess.js` | Create a contract instance using the frontend ABI and a literal deployment address. |
| Upload backend | `medical-access-app/backend/server.js` | Receive `POST /upload` multipart files and pass them to Pinata's pinning endpoint. |
| Smart contract | `medical-contract/contracts/MedicalRecordAccess.sol` | Maintain role assignments, patient/doctor details, access requests, record metadata, authorization state and events. |
| Deployment migration | `medical-contract/migrations/2_deploy_contracts.js` | Deploy contract with Ganache addresses at indices 1–9 as initial `Role.None` users. |

## 3. Component interactions

```mermaid
sequenceDiagram
    actor Admin
    actor Doctor
    actor Patient
    participant Browser as React + MetaMask
    participant Chain as MedicalRecordAccess (Ganache)
    participant API as Express POST /upload
    participant IPFS as Pinata / IPFS
    Admin->>Browser: Assign role
    Browser->>Chain: assignRolePatient / assignRoleDoctor
    Doctor->>Browser: Generate RSA key pair
    Browser->>Chain: setDoctorPublicKey(publicKey)
    Doctor->>Browser: Request patient record
    Browser->>Chain: requestRecordAccess(patient, purpose)
    Patient->>Browser: Select a file and approve a request
    Note over Browser: AES-CBC encrypt file; RSA-OAEP wrap AES key + IV; MetaMask sign key-string hash
    Browser->>API: POST encrypted file
    API->>IPFS: pinFileToIPFS
    IPFS-->>API: CID
    API-->>Browser: ipfsHash
    Browser->>Chain: approveAccessAndUpload(requestId, CID, wrapped key, signature)
    Doctor->>Browser: Supply matching RSA private key
    Browser->>Chain: Read record metadata
    Browser->>IPFS: GET ciphertext by CID
    IPFS-->>Browser: Encrypted file
    Note over Browser: Verify signing address; RSA unwrap; AES decrypt locally
```

### Trust boundaries

- **Browser ↔ wallet / chain:** Transactions are signed through MetaMask. Reading public on-chain state does not need an authorization mechanism that hides those bytes from blockchain observers.
- **Browser ↔ API:** The browser sends encrypted bytes. The API does **not** check the user's Ethereum identity and does not perform cryptographic operations.
- **API ↔ Pinata:** A server-side JWT authorizes pinning. It must be kept out of Git and the browser bundle.
- **Chain ↔ IPFS:** No direct connection exists. The frontend relays the resulting CID into a separate blockchain transaction.
- **Doctor's device:** The doctor is responsible for storing the RSA private key; the app displays it after generation and later asks for it via a prompt.

## 4. On-chain versus off-chain data

| Data | Location |
| --- | --- |
| Account roles (`roles`) | Public contract mapping |
| Patient details (name, age, gender, national ID) | Public contract mapping `patients` |
| Doctor details including RSA public key | Public contract mapping `doctors` |
| Access requests and their approval states | Contract mapping `accessRequests` |
| CID, patient owner, encrypted AES key/IV and signature | Public contract mapping `records` |
| Access-expiry values | Contract mapping `accessControl`; approvals set `type(uint).max` |
| Actual encrypted file | Pinata/IPFS off-chain |
| RSA private key, plaintext file and temporary AES key/IV | Browser during key generation, upload and decryption; no explicit dedicated persistent key store in this repo |

The blockchain stores a **CID and related metadata**; this is not equivalent to an authenticated hash of the full file maintained and checked by the application.

## 5. Contract data model

The contract defines `Role { None, Patient, Doctor, Admin }`, `PatientInfo`, `DoctorInfo`, `Record` and `AccessRequest`. The main write operations are:

- `assignRolePatient` / `assignRoleDoctor`: admin-only registration of wallet addresses.
- `setDoctorPublicKey`: doctor-only, once per doctor under current contract logic.
- `requestRecordAccess`: doctor creates an access request to a patient.
- `approveAccessAndUpload`: patient approves that specific request, creates a new record and grants maximum-duration access to the requesting doctor.
- `revokeAccess` / `deleteRecord`: contract-level operations; neither removes an existing IPFS copy nor retrieves an already-shared key.

Some getter functions check role and record access, but mappings such as `patients` and `records` are public. See [Security Notes](security-notes.md) for the distinction between API authorization and public storage.

## 6. Legacy local deployment details

- `truffle-config.js` selects host `127.0.0.1`, port `7545`, Solidity `0.8.19` and `network_id: '*'` for `development`.
- `src/contracts/MedicalRecordAccess.js` includes a hard-coded local address and imports `src/contracts/MedicalRecordAccess.json`.
- `medical-contract/build/contracts/MedicalRecordAccess.json` is a retained migration artifact. Its network-5777 address **differs** from the network-5777 address embedded in the frontend JSON artifact. The hard-coded address in the JavaScript helper matches the archived Truffle build artifact, not the frontend JSON artifact's recorded address.
- A redeploy or new local chain may invalidate all historical addresses. No redeployment or rewriting of these artifacts was attempted in this repository cleanup.

## 7. Deliberate scope of the repository cleanup

The original two main project roots and all active page/component/crypto/upload/contract logic are retained. Only unreferenced, obsolete alternative modules and packaged third-party dependencies were removed, and documentation, ignore rules and a non-secret environment example were added. This is a documentation/repository-maintenance change, **not** a security fix or feature change.

# Security Design, Threats and Limitations

[← Back to README](../README.md) · [Architecture](architecture.md) · [Workflows](workflows.md)

## Purpose and review scope

This is a **code-reading assessment of the submitted academic PoC**, not a penetration test, formal audit, proof of exploitability in a running deployment or a claim that all risks have been remediated. No new protective controls were implemented in this repository cleanup. Use fictitious identities and non-sensitive test documents only.

## Implemented controls

| Control | Evidence | Boundary of the protection |
| --- | --- | --- |
| Admin / patient / doctor role checks | `MedicalRecordAccess.sol`: `onlyAdmin`, `onlyPatient`, `onlyDoctor` | Authorizes selected contract writes; does not conceal public chain data. |
| Record ownership check | `onlyOwner(recordId)` on `deleteRecord`, `revokeAccess` | Limits who may invoke those actions through the contract. |
| Contract read permission | `getRecord()` calls `canAccess()` | Protects this one getter path, but the public `records` mapping exposes the same metadata. |
| Browser-side file encryption | `PatientDashboard.js`: `forge.cipher.createCipher('AES-CBC', aesKey)` | Prevents plaintext from being intentionally uploaded by this path, assuming proper client execution; CBC alone does not authenticate ciphertext. |
| RSA-wrapped AES key | `PatientDashboard.js` / `DoctorDashboard.js`: `RSA-OAEP` | Intended to let a holder of the corresponding doctor's RSA private key recover AES key/IV. |
| Sender signature check | Patient: `personal.sign(sha3(encryptedKey))`; doctor: `ecRecover(keccak256(encryptedKey), signature)` | Ties the encrypted-key string to the signing address in that workflow; not end-to-end file authenticity. |
| Contract events | `RoleAssigned`, `AccessRequested`, `RecordUploaded`, `AccessGranted`, `AccessRevoked`, `RecordDeleted`, `DoctorPublicKeySet` | Provides records of these writes, not read or IPFS-access logs. |

## Known limitations and risks

| Topic | Observed behavior in the existing source | Consequence / correct interpretation |
| --- | --- | --- |
| **Public patient information** | `mapping(address => PatientInfo) public patients` contains name, age, gender, national ID. | Anyone able to inspect the chain can read the underlying public state; a restrictive `getPatientInfo()` function does not make those details confidential. |
| **Public record metadata** | `mapping(uint => Record) public records` includes CID, encrypted AES key and signature. | `getRecord()` authorizes its own call, but does not prevent reading public state through `records`. The doctor dashboard itself uses `records(i)`. |
| **No practical access expiry** | `approveAccessAndUpload` sets `accessControl[recordId][doctor] = type(uint).max`. | The UI does not let a patient select an expiry time. Future revocation is a separate owner action, not an automatic timeout. |
| **Revocation is not cryptographic revocation** | Access rights live on-chain; encrypted content can remain pinned or downloaded. | A doctor who already has the ciphertext and AES key can retain access independently of contract permissions. |
| **No authenticated encryption** | AES-CBC is used without a separate authenticated MAC or an AEAD tag. | There is no cryptographic integrity/authenticity guarantee for the entire encrypted file within this design. |
| **Partial signature coverage** | Patient signs a hash of Base64-encoded RSA ciphertext (`encryptedAESKey`), not the encrypted medical file or CID. | The signature check does not authenticate the complete record contents or CID-to-file linkage. |
| **Unauthenticated upload API** | `backend/server.js` accepts multipart `POST /upload` without wallet authentication, authorization or application-level rate limiting. | The service is not suitable for public exposure; anyone who can reach it may attempt to consume the Pinata pinning account. |
| **Key management limitations** | RSA private key is shown once in a UI textarea and later supplied through a browser prompt; doctor public key can be set once. | No secure recovery/rotation mechanism is implemented, and losing the private key can prevent future decryption. |
| **On-chain profile immutability in current flow** | Profile values and key material are stored as public contract state. | Do not place real identity data or private secrets in this local demonstration. |
| **Read audit gap** | Solidity events are emitted on selected writes only. Downloads use the browser and an IPFS gateway. | No evidence that every medical record view or download is recorded by the contract. |
| **Record selection is not access-aware in UI** | Doctor dashboard scans `records(i)` and selects the newest existing record owned by a patient. | A chosen record can belong to another approval workflow; the doctor can fail to decrypt it or see metadata for a record not intended for that doctor. |
| **IPFS retention** | `deleteRecord()` deletes the contract record but does not unpin or erase IPFS content. | Record deletion is not a guarantee of permanent removal from IPFS or third-party caches. |
| **Dependency manifests incomplete** | UI imports `node-forge` without a direct `package.json` dependency; backend imports several packages absent from its own manifest. | A clean installation may differ from the original environment. This maintenance update intentionally does not change dependency versions or behavior. |

## Credential-handling note (important)

The supplied archive contained `medical-access-app/backend/.env` with Pinata-related authentication values. This file has been **omitted** from the cleaned repository and excluded by ignore rules. Only a non-secret `backend/.env.example` remains.

If any of those values were ever committed to a remote Git history or shared outside a trusted environment, **revoke/rotate them in Pinata**. Removing `.env` from today's working tree or adding it to `.gitignore` cannot invalidate an exposed token and cannot erase old Git commits. Review the Git history before publishing any claim that the credentials were removed from past commits.

The backend source currently reads **`PINATA_JWT`** and optional **`PORT`**. Historical `PINATA_API_KEY` and `PINATA_API_SECRET` values are not referenced by `server.js`.

## Portfolio interpretation

A fair description of the work is: **"Designed an academic Ethereum/IPFS medical-record access PoC with Solidity role checks, client-side AES/RSA encryption and an encrypted-file upload workflow; documented trust boundaries and identified security limitations."**

Avoid unqualified claims such as "HIPAA-compliant", "private on-chain patient data", "tamper-proof medical file", "fully secure access", "complete audit trail", or "production-ready". Those guarantees are not established by the current implementation.

## Scope of maintenance

This documentation refactor **does not** modify contract logic, cryptographic operations, storage protocol, endpoints, address constants or user-facing features. Addressing the listed risks would require further engineering and testing, which is deliberately outside the requested scope.

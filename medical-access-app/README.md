# React client and upload API

This directory is the existing application portion of the [Health Access DApp](../README.md) proof of concept.

- `src/pages/`: Admin, Patient and Doctor dashboards.
- `src/contracts/MedicalRecordAccess.js`: active Web3 connection helper and historical contract address.
- `src/contracts/MedicalRecordAccess.json`: ABI consumed by the frontend.
- `backend/server.js`: existing Express endpoint forwarding encrypted file uploads to Pinata.

Refer to the root [README](../README.md) for the architecture, project status, historical setup notes and important limitations. For security details, see [Security Notes](../docs/security-notes.md).

**Note:** This is an academic local prototype. The dependency manifests are not guaranteed to recreate the original runtime, and no new functionality or deployment has been performed during the repository cleanup.

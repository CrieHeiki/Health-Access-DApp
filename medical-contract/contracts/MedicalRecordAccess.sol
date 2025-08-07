// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MedicalRecordAccess {
    enum Role {
        None,
        Patient,
        Doctor,
        Admin
    }

    struct PatientInfo {
        string name;
        uint age;
        string gender;
        string nationalId;
    }

    struct DoctorInfo {
        string name;
        string specialization;
        string licenseId;
        string hospitalName;
        string rsaPublicKey; // 🔐 NEW: public key for RSA encryption
    }

    struct Record {
        string ipfsHash;
        address owner;
        string encryptedAESKey;
        string signature;
        bool exists;
    }

    struct AccessRequest {
        uint requestId;
        address doctor;
        address patient;
        string purpose;
        uint timestamp;
        bool approved;
        bool exists;
    }

    address public systemAdmin;
    uint public recordCount;
    uint public requestCount;

    mapping(address => Role) public roles;
    mapping(address => PatientInfo) public patients;
    mapping(address => DoctorInfo) public doctors;

    mapping(uint => Record) public records;
    mapping(uint => mapping(address => uint)) public accessControl;
    mapping(address => uint[]) public doctorAccessibleRecords;

    mapping(uint => AccessRequest) public accessRequests;

    address[] public allUsers;
    address[] public allPatients;
    address[] public allDoctors;

    // Events
    event RoleAssigned(address indexed user, Role role);
    event RecordUploaded(
        uint indexed recordId,
        address indexed patient,
        string ipfsHash,
        string encryptedAESKey,
        string signature
    );
    event AccessGranted(
        uint indexed recordId,
        address indexed doctor,
        uint expiry
    );
    event AccessRequested(
        uint indexed requestId,
        address indexed doctor,
        address indexed patient,
        string purpose
    );
    event AccessRevoked(uint indexed recordId, address indexed doctor);
    event RecordDeleted(uint indexed recordId, address indexed deletedBy);
    event DoctorPublicKeySet(address indexed doctor, string publicKey); // NEW EVENT

    constructor(address[] memory initialUsers) {
        systemAdmin = msg.sender;
        roles[msg.sender] = Role.Admin;
        allUsers.push(msg.sender);

        for (uint i = 0; i < initialUsers.length; i++) {
            address user = initialUsers[i];
            if (user != msg.sender) {
                roles[user] = Role.None;
                allUsers.push(user);
            }
        }
    }

    modifier onlyAdmin() {
        require(roles[msg.sender] == Role.Admin, "Only admin can perform this");
        _;
    }

    modifier onlyPatient() {
        require(roles[msg.sender] == Role.Patient, "Only patient can perform this");
        _;
    }

    modifier onlyDoctor() {
        require(roles[msg.sender] == Role.Doctor, "Only doctor can perform this");
        _;
    }

    modifier onlyOwner(uint recordId) {
        require(records[recordId].owner == msg.sender, "Not your record");
        _;
    }

    modifier recordExists(uint recordId) {
        require(records[recordId].exists, "Record does not exist");
        _;
    }

    function assignRolePatient(
        address user,
        string memory name,
        uint age,
        string memory gender,
        string memory nationalId
    ) public onlyAdmin {
        require(roles[user] == Role.None, "User already has a role");
        roles[user] = Role.Patient;
        patients[user] = PatientInfo(name, age, gender, nationalId);
        allPatients.push(user);
        emit RoleAssigned(user, Role.Patient);
    }

    function assignRoleDoctor(
        address user,
        string memory name,
        string memory specialization,
        string memory licenseId,
        string memory hospitalName
    ) public onlyAdmin {
        require(roles[user] == Role.None, "User already has a role");
        roles[user] = Role.Doctor;
        doctors[user] = DoctorInfo(name, specialization, licenseId, hospitalName, "");
        allDoctors.push(user);
        emit RoleAssigned(user, Role.Doctor);
    }

    // NEW: Set RSA Public Key (Only once)
    function setDoctorPublicKey(string memory publicKey) public onlyDoctor {
        require(bytes(doctors[msg.sender].rsaPublicKey).length == 0, "Public key already set");
        doctors[msg.sender].rsaPublicKey = publicKey;
        emit DoctorPublicKeySet(msg.sender, publicKey);
    }

    // Doctor requests access
    function requestRecordAccess(address patient, string memory purpose) public onlyDoctor {
        require(roles[patient] == Role.Patient, "Target must be a patient");

        requestCount++;
        accessRequests[requestCount] = AccessRequest({
            requestId: requestCount,
            doctor: msg.sender,
            patient: patient,
            purpose: purpose,
            timestamp: block.timestamp,
            approved: false,
            exists: true
        });

        emit AccessRequested(requestCount, msg.sender, patient, purpose);
    }

    function getRequestStatus(address patient, address doctor) public view returns (bool exists, bool approved, uint requestId) {
        for (uint i = 1; i <= requestCount; i++) {
            AccessRequest memory r = accessRequests[i];
            if (r.patient == patient && r.doctor == doctor) {
                return (r.exists, r.approved, r.requestId);
            }
        }
        return (false, false, 0); // Không tồn tại
    }

    // Patient approves access and uploads the record
    function approveAccessAndUpload(
        uint requestId,
        string memory ipfsHash,
        string memory encryptedAESKey,
        string memory signature
    ) public onlyPatient returns (uint) {
        AccessRequest storage req = accessRequests[requestId];
        require(req.exists, "Request not found");
        require(req.patient == msg.sender, "Not your request");
        require(!req.approved, "Already approved");

        req.approved = true;

        recordCount++;
        records[recordCount] = Record(
            ipfsHash,
            msg.sender,
            encryptedAESKey,
            signature,
            true
        );

        accessControl[recordCount][req.doctor] = type(uint).max; // No expiry
        doctorAccessibleRecords[req.doctor].push(recordCount);

        emit RecordUploaded(recordCount, msg.sender, ipfsHash, encryptedAESKey, signature);
        emit AccessGranted(recordCount, req.doctor, type(uint).max);

        return recordCount;
    }

    function deleteRecord(uint recordId) public onlyOwner(recordId) recordExists(recordId) {
        delete records[recordId];
        emit RecordDeleted(recordId, msg.sender);
    }

    function revokeAccess(uint recordId, address doctor) public onlyOwner(recordId) recordExists(recordId) {
        require(accessControl[recordId][doctor] != 0, "Doctor has no access");
        accessControl[recordId][doctor] = 0;
        emit AccessRevoked(recordId, doctor);
    }

    function canAccess(uint recordId, address requester) public view recordExists(recordId) returns (bool) {
        if (requester == records[recordId].owner) return true;
        return (block.timestamp <= accessControl[recordId][requester]);
    }

    function getRecord(uint recordId)
        public
        view
        recordExists(recordId)
        returns (
            string memory ipfsHash,
            string memory encryptedAESKey,
            string memory signature,
            address owner
        )
    {
        require(canAccess(recordId, msg.sender), "Access denied");
        Record memory r = records[recordId];
        return (r.ipfsHash, r.encryptedAESKey, r.signature, r.owner);
    }

    function listAccessibleRecords() public view onlyDoctor returns (uint[] memory) {
        uint[] memory all = doctorAccessibleRecords[msg.sender];
        uint count = 0;
        for (uint i = 0; i < all.length; i++) {
            if (block.timestamp <= accessControl[all[i]][msg.sender]) count++;
        }
        uint[] memory valid = new uint[](count);
        uint j = 0;
        for (uint i = 0; i < all.length; i++) {
            if (block.timestamp <= accessControl[all[i]][msg.sender]) {
                valid[j++] = all[i];
            }
        }
        return valid;
    }

    function getPatientInfo(address user) public view returns (string memory name, uint age, string memory gender, string memory nationalId) {
        require(roles[msg.sender] == Role.Doctor || roles[msg.sender] == Role.Admin, "Not authorized");
        PatientInfo memory info = patients[user];
        return (info.name, info.age, info.gender, info.nationalId);
    }

    function getDoctorInfo(address _doctor) public view returns (
        string memory name,
        string memory specialization,
        string memory hospital,
        string memory rsaPublicKey // NEW
    ) {
        require(roles[_doctor] == Role.Doctor, "Not a doctor");
        DoctorInfo memory info = doctors[_doctor];
        return (info.name, info.specialization, info.hospitalName, info.rsaPublicKey);
    }

    function getMyAccessRequests() public view onlyPatient returns (AccessRequest[] memory) {
        uint count = 0;

        // Đếm số yêu cầu gửi đến bệnh nhân hiện tại
        for (uint i = 1; i <= requestCount; i++) {
            if (accessRequests[i].patient == msg.sender) {
                count++;
            }
        }

        AccessRequest[] memory requests = new AccessRequest[](count);
        uint index = 0;

        for (uint i = 1; i <= requestCount; i++) {
            if (accessRequests[i].patient == msg.sender) {
                requests[index++] = accessRequests[i];
            }
        }

        return requests;
    }

    function getRecordIdByDoctorAndPatient(address doctor, address patient) public view returns (uint) {
        for (uint i = recordCount; i >= 1; i--) {
            Record memory r = records[i];
            if (r.exists && r.owner == patient && accessControl[i][doctor] > 0) {
                return i;
            }
        }
        revert("No record found");
    }

    // Getters
    function getAllUsers() public view returns (address[] memory) {
        return allUsers;
    }

    function getAllPatients() public view returns (address[] memory) {
        return allPatients;
    }

    function getAllDoctors() public view returns (address[] memory) {
        return allDoctors;
    }
}

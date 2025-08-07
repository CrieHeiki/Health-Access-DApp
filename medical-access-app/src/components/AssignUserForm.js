import React, { useState } from "react";

const AssignUserForm = ({ onAssign }) => {
  const [role, setRole] = useState("1");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [licenseId, setLicenseId] = useState("");
  const [hospitalName, setHospitalName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onAssign({
      role,
      address,
      name,
      age,
      gender,
      nationalId,
      specialization,
      licenseId,
      hospitalName,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Phân quyền người dùng</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input className="input" placeholder="Địa chỉ ví (0x...)" value={address} onChange={(e) => setAddress(e.target.value)} required />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="1">Patient</option>
          <option value="2">Doctor</option>
        </select>
        <input className="input" placeholder="Họ tên" value={name} onChange={(e) => setName(e.target.value)} required />

        {role === "1" && (
          <>
            <input className="input" type="number" placeholder="Tuổi" value={age} onChange={(e) => setAge(e.target.value)} />
            <input className="input" placeholder="Giới tính" value={gender} onChange={(e) => setGender(e.target.value)} />
            <input className="input" placeholder="CCCD/CMND" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
          </>
        )}

        {role === "2" && (
          <>
            <input className="input" placeholder="Chuyên môn" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
            <input className="input" placeholder="Mã hành nghề" value={licenseId} onChange={(e) => setLicenseId(e.target.value)} />
            <input className="input" placeholder="Bệnh viện" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
          </>
        )}
      </div>

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Phân quyền
      </button>
    </form>
  );
};

export default AssignUserForm;

import React, { useState } from "react";
import getWeb3 from "./getWeb3";
import MedicalRecordAccess from "./contracts/MedicalRecordAccess.json";

function RegisterDoctor() {
  const [form, setForm] = useState({
    address: "",
    name: "",
    specialization: "",
    licenseId: "",
    hospitalName: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    try {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = MedicalRecordAccess.networks[networkId];
      const contract = new web3.eth.Contract(
        MedicalRecordAccess.abi,
        deployedNetwork.address
      );

      const roleIndex = await contract.methods.roles(accounts[0]).call();
      if (parseInt(roleIndex) !== 3) {
        alert("Bạn không có quyền Admin");
        return;
      }

      await contract.methods
        .registerDoctor(
          form.address,
          form.name,
          form.specialization,
          form.licenseId,
          form.hospitalName
        )
        .send({ from: accounts[0] });

      alert("Đăng ký bác sĩ thành công");
    } catch (err) {
      console.error("Lỗi:", err.message);
      alert("Đăng ký thất bại");
    }
  };

  return (
    <div>
      <h2>Đăng ký bác sĩ (Chỉ Admin)</h2>
      <input name="address" placeholder="Ví bác sĩ" onChange={handleChange} />
      <input name="name" placeholder="Tên" onChange={handleChange} />
      <input name="specialization" placeholder="Chuyên khoa" onChange={handleChange} />
      <input name="licenseId" placeholder="Mã bằng cấp" onChange={handleChange} />
      <input name="hospitalName" placeholder="Bệnh viện" onChange={handleChange} />
      <button onClick={handleRegister}>Đăng ký</button>
    </div>
  );
}

export default RegisterDoctor;

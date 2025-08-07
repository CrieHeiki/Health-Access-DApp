import React, { useEffect, useState } from "react";
import getContract from "../contracts/MedicalRecordAccess";
import Web3 from "web3";
import PatientDashboard from "./PatientDashboard";
import DoctorDashboard from "./DoctorDashboard";
import AdminDashboard from "./AdminDashboard";

const HomePage = () => {
  const [role, setRole] = useState("None");
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { web3, contract } = await getContract();
      const accounts = await web3.eth.getAccounts();
      const acc = accounts[0];
      setAccount(acc);
      setContract(contract);

      const roleInt = await contract.methods.roles(acc).call();
      const roleMap = ["None", "Patient", "Doctor", "Admin"];
      setRole(roleMap[roleInt]);
    };

    init();
  }, []);

  if (role === "None") {
    return <div style={{ padding: 20 }}>Bạn chưa được phân quyền. Vui lòng liên hệ admin.</div>;
  }

  if (role === "Patient") {
    return <PatientDashboard account={account} contract={contract} />;
  }

  if (role === "Doctor") {
    return <DoctorDashboard account={account} contract={contract} />;
  }

  if (role === "Admin") {
    return <AdminDashboard account={account} contract={contract} />;
  }

  return <div>Đang tải...</div>;
};

export default HomePage;

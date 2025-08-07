import React, { useEffect, useState } from "react";
import AssignUserForm from "../components/AssignUserForm";
import UserListTable from "../components/UserListTable";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AdminDashboard = ({ account, contract }) => {
  const [users, setUsers] = useState([]);
  const roleMap = ["None", "Patient", "Doctor", "Admin"];

  const fetchUsers = async () => {
    const addresses = await contract.methods.getAllUsers().call();
    const userList = await Promise.all(
      addresses.map(async (addr) => {
        const roleInt = await contract.methods.roles(addr).call();
        return { address: addr, role: roleMap[roleInt] };
      })
    );
    setUsers(userList);
  };

  useEffect(() => {
    if (contract) fetchUsers();
  }, [contract]);

  const handleAssign = async (data) => {
    try {
      if (data.role === "1") {
        await contract.methods
          .assignRolePatient(data.address, data.name, data.age, data.gender, data.nationalId)
          .send({ from: account });
      } else if (data.role === "2") {
        await contract.methods
          .assignRoleDoctor(data.address, data.name, data.specialization, data.licenseId, data.hospitalName)
          .send({ from: account });
      }
      toast.success("Phân quyền thành công!");
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi phân quyền!");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-tr from-white via-indigo-50 to-indigo-100">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-5xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-indigo-800 flex items-center gap-2">
          Quản lý người dùng
        </h2>

        {/* Form gán quyền */}
        <div className="bg-white shadow-md border border-indigo-200 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-indigo-700 mb-4">Gán vai trò</h3>
          <AssignUserForm onAssign={handleAssign} />
        </div>

        {/* Bảng danh sách */}
        <div className="bg-white shadow-md border border-indigo-200 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-indigo-700 mb-4">Danh sách người dùng</h3>
          <UserListTable users={users} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

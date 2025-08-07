import React from "react";

const UserListTable = ({ users }) => {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-2 text-gray-800">Danh sách người dùng</h3>
      <table className="w-full border border-gray-300 rounded overflow-hidden">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2 border">Địa chỉ</th>
            <th className="px-4 py-2 border">Vai trò</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-4 py-2 border">{user.address}</td>
              <td className="px-4 py-2 border">{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserListTable;

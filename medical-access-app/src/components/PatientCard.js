import React from "react";

const PatientCard = ({ patient, status, hasRecord, onRequestAccess, onDownload }) => {
  return (
    <div className="border rounded-lg p-4 shadow hover:shadow-md transition-all bg-white">
      <p className="font-semibold text-gray-800">{patient}</p>

      <div className="mt-2">
        {status === "loading" && <p className="text-gray-500">🔄 Đang kiểm tra trạng thái...</p>}
        {status === "none" && (
          <button onClick={() => onRequestAccess(patient)} className="btn-blue">
            Gửi yêu cầu truy cập
          </button>
        )}
        {status === "pending" && <p className="text-yellow-600">⏳ Yêu cầu đã gửi (đang chờ phản hồi)</p>}
        {status === "approved" && hasRecord && (
          <button onClick={() => onDownload(patient)} className="btn-green">
            ✅ Tải và giải mã bệnh án
          </button>
        )}
        {status === "approved" && !hasRecord && (
          <p className="text-gray-500">Bệnh nhân chưa upload bệnh án</p>
        )}
      </div>
    </div>
  );
};

export default PatientCard;

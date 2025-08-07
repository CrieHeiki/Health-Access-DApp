import React from "react";

const DoctorRequestCard = ({ request, selectedFile, onFileChange, onApprove }) => {
  return (
    <div className="border p-4 rounded-lg shadow bg-white space-y-2">
      <p className="font-semibold text-gray-800">
        👨‍⚕️ {request.name} ({request.specialization}) - {request.hospital}
      </p>
      <p><strong>Mục đích:</strong> {request.purpose}</p>
      <p><strong>Thời gian:</strong> {request.timestamp}</p>
      <p>
        <strong>Trạng thái:</strong>{" "}
        {request.approved ? (
          <span className="text-green-600">✅ Đã chấp nhận</span>
        ) : (
          <span className="text-yellow-600">⏳ Đang chờ bạn phê duyệt</span>
        )}
      </p>

      {!request.approved && (
        <div className="pt-2 space-y-2">
          <input
            type="file"
            onChange={onFileChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
          />
          <button
            onClick={() => onApprove(request)}
            disabled={!selectedFile}
            className={`px-4 py-2 rounded text-white ${
              selectedFile ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Gửi bệnh án
          </button>
        </div>
      )}
    </div>
  );
};

export default DoctorRequestCard;

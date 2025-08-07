import React, { useEffect, useState } from "react";
import axios from "axios";
import forge from "node-forge";
import Web3 from "web3";
import { toast, ToastContainer } from "react-toastify";
import { UploadCloud, FilePlus } from "lucide-react";
import "react-toastify/dist/ReactToastify.css";

const PatientDashboard = ({ account, contract }) => {
  const [requests, setRequests] = useState([]);
  const [fileMap, setFileMap] = useState({});

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const accessRequests = await contract.methods
          .getMyAccessRequests()
          .call({ from: account });

        const enriched = await Promise.all(
          accessRequests.map(async (req) => {
            const info = await contract.methods
              .getDoctorInfo(req.doctor)
              .call();
            return {
              requestId: req.requestId,
              doctorAddress: req.doctor,
              purpose: req.purpose,
              timestamp: new Date(
                parseInt(req.timestamp) * 1000
              ).toLocaleString(),
              approved: req.approved,
              name: info.name,
              specialization: info.specialization,
              hospital: info.hospital,
              publicKey: info.rsaPublicKey || "",
            };
          })
        );
        setRequests(enriched);
      } catch (err) {
        toast.error("Lỗi khi tải yêu cầu từ bác sĩ.");
        console.error(err);
      }
    };

    fetchRequests();
  }, [account, contract]);

  const handleFileChange = (e, requestId) => {
    const file = e.target.files[0];
    setFileMap((prev) => ({ ...prev, [requestId]: file }));
  };

  const handleApproveUpload = async (req) => {
    const selectedFile = fileMap[req.requestId];
    if (!selectedFile) return toast.warning("Vui lòng chọn một file!");

    if (!req.publicKey) return toast.error("Bác sĩ chưa cung cấp public key!");

    try {
      toast.info("🔐 Đang mã hóa và gửi...");

      const buffer = await selectedFile.arrayBuffer();
      const aesKey = forge.random.getBytesSync(32);
      const iv = forge.random.getBytesSync(16);

      const cipher = forge.cipher.createCipher("AES-CBC", aesKey);
      cipher.start({ iv });
      cipher.update(forge.util.createBuffer(buffer));
      cipher.finish();
      const encrypted = cipher.output.getBytes();

      const encryptedBlob = new Blob(
        [forge.util.binary.raw.decode(encrypted)],
        {
          type: selectedFile.type,
        }
      );

      let publicKeyPem = req.publicKey.includes("-----BEGIN")
        ? req.publicKey
        : `-----BEGIN PUBLIC KEY-----\n${req.publicKey}\n-----END PUBLIC KEY-----`;
      const rsa = forge.pki.publicKeyFromPem(publicKeyPem);
      const aesKeyEncrypted = rsa.encrypt(aesKey + iv, "RSA-OAEP");

      const web3 = new Web3(window.ethereum);
      const aesKeyEncoded = forge.util.encode64(aesKeyEncrypted);
      const hash = web3.utils.sha3(aesKeyEncoded);
      const signature = await web3.eth.personal.sign(hash, account, "");

      const formData = new FormData();
      formData.append("file", encryptedBlob, selectedFile.name);

      const res = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const ipfsHash = res.data.ipfsHash;

      await contract.methods
        .approveAccessAndUpload(
          req.requestId,
          ipfsHash,
          aesKeyEncoded,
          signature
        )
        .send({ from: account });

      toast.success("✅ Gửi bệnh án thành công!");
    } catch (err) {
      console.error(err);
      toast.error("❌ Lỗi khi gửi bệnh án!");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-tr from-white via-green-50 to-emerald-100">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-emerald-700 flex items-center gap-2">
          📁 Yêu cầu truy cập bệnh án
        </h2>

        {requests.length === 0 ? (
          <p className="text-gray-600 text-lg">
            Hiện chưa có yêu cầu nào từ bác sĩ.
          </p>
        ) : (
          requests.map((req) => {
            const selectedFile = fileMap[req.requestId];
            return (
              <div
                key={req.requestId}
                className="bg-white shadow border border-emerald-200 rounded-xl p-5 space-y-2 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <p className="font-semibold text-gray-800 text-lg">
                    👨‍⚕️ {req.name} ({req.specialization}) – {req.hospital}
                  </p>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      req.approved
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {req.approved ? "✅ Đã chấp nhận" : "⏳ Chờ bạn phê duyệt"}
                  </span>
                </div>

                <p>
                  <strong>Mục đích:</strong> {req.purpose}
                </p>
                <p>
                  <strong>Thời gian gửi:</strong> {req.timestamp}
                </p>

                {!req.approved && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer text-blue-700 hover:underline">
                      <FilePlus className="w-5 h-5" />
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(e, req.requestId)}
                        className="hidden"
                      />
                      {selectedFile ? (
                        <span className="text-sm font-medium">
                          {selectedFile.name}
                        </span>
                      ) : (
                        <span className="text-sm font-medium">
                          Chọn file bệnh án
                        </span>
                      )}
                    </label>

                    <button
                      onClick={() => handleApproveUpload(req)}
                      disabled={!selectedFile}
                      className={`flex items-center gap-2 px-4 py-2 rounded text-white text-sm font-semibold transition ${
                        selectedFile
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <UploadCloud className="w-4 h-4" />
                      Gửi bệnh án
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;

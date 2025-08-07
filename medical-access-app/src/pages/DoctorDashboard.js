import React, { useEffect, useState } from "react";
import getContract from "../contracts/MedicalRecordAccess";
import forge from "node-forge";
import Web3 from "web3";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { Download, ShieldPlus, KeyRound } from "lucide-react";
import "react-toastify/dist/ReactToastify.css";

const DoctorDashboard = ({ account }) => {
  const [contract, setContract] = useState(null);
  const [patients, setPatients] = useState([]);
  const [privateKey, setPrivateKey] = useState(null);
  const [rsaCreated, setRsaCreated] = useState(false);
  const [showPrivateKeyOnce, setShowPrivateKeyOnce] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { contract } = await getContract();
      setContract(contract);

      const roleRaw = await contract.methods.roles(account).call();
      const role = Number(roleRaw);
      if (role !== 2 && role !== 3) {
        toast.error("Tài khoản không có quyền truy cập thông tin bệnh nhân.");
        return;
      }

      const info = await contract.methods.getDoctorInfo(account).call();
      if (info[3]) setRsaCreated(true);

      const patientAddresses = await contract.methods.getAllPatients().call();
      const requestCount = await contract.methods.requestCount().call();

      const patientDetails = await Promise.all(
        patientAddresses.map(async (addr) => {
          try {
            const result = await contract.methods.getPatientInfo(addr).call({ from: account });
            const { name, age, gender, nationalId } = result;

            const count = await contract.methods.recordCount().call();
            let hasRecord = false;
            for (let i = count; i >= 1; i--) {
              const r = await contract.methods.records(i).call();
              if (r.owner === addr && r.exists) {
                hasRecord = true;
                break;
              }
            }

            let requestStatus = "none";
            let requestedByOthers = false;

            for (let i = requestCount; i >= 1; i--) {
              const req = await contract.methods.accessRequests(i).call();
              console.log(req);
              if (req.patient === addr && req.exists) {
                if (req.doctor.toLowerCase() === account.toLowerCase()) {
                  if (requestStatus === "none") {
                    requestStatus = req.approved ? "approved" : "pending";
                  }
                } else {
                  requestedByOthers = true;
                }
              }
            }

            return {
              address: addr,
              name,
              age: Number(age),
              gender,
              nationalId,
              hasRecord,
              requestStatus,
              requestedByOthers,
            };
          } catch (err) {
            return {
              address: addr,
              name: "",
              age: 0,
              gender: "",
              nationalId: "",
              hasRecord: false,
              requestStatus: "none",
              requestedByOthers: false,
            };
          }
        })
      );

      setPatients(patientDetails);
    };

    init();
  }, [account]);

  const handleCreateKeys = async () => {
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
    const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

    try {
      await contract.methods.setDoctorPublicKey(publicKeyPem).send({ from: account });
      setPrivateKey(privateKeyPem);
      setShowPrivateKeyOnce(true);
      setTimeout(() => setRsaCreated(true), 500);
      toast.success("✅ Khóa RSA đã được tạo!");
    } catch (err) {
      toast.error("❌ Không thể lưu public key!");
    }
  };

  const handleRequestAccess = async (patientAddress) => {
    const reason = prompt("Nhập mục đích truy cập:");
    if (!reason) return;
    try {
      await contract.methods.requestRecordAccess(patientAddress, reason).send({ from: account });
      toast.success("✅ Đã gửi yêu cầu truy cập");
    } catch {
      toast.error("❌ Không thể gửi yêu cầu");
    }
  };

  const handleDecryptDownload = async (patientAddress) => {
    try {
      const count = await contract.methods.recordCount().call();
      let record = null;
      for (let i = count; i >= 1; i--) {
        const r = await contract.methods.records(i).call();
        if (r.owner === patientAddress && r.exists) {
          record = r;
          break;
        }
      }

      if (!record) return toast.warning("Không có bệnh án");

      const { ipfsHash, encryptedAESKey, signature } = record;
      const web3 = new Web3(window.ethereum);
      const hash = web3.utils.keccak256(encryptedAESKey);
      const recovered = await web3.eth.personal.ecRecover(hash, signature);

      if (recovered.toLowerCase() !== record[1].toLowerCase())
        return toast.error("Chữ ký không hợp lệ!");

      const pem = prompt("Nhập Private Key RSA:");
      if (!pem) return;

      const rsa = forge.pki.privateKeyFromPem(pem);
      const decrypted = rsa.decrypt(forge.util.decode64(encryptedAESKey), "RSA-OAEP");
      const aesKey = decrypted.slice(0, 32);
      const iv = decrypted.slice(32);

      const res = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`, {
        responseType: "arraybuffer",
      });

      const bytes = forge.util.createBuffer(res.data);
      const decipher = forge.cipher.createDecipher("AES-CBC", aesKey);
      decipher.start({ iv });
      decipher.update(bytes);
      const success = decipher.finish();

      if (!success) return toast.error("Giải mã thất bại!");

      const output = decipher.output.getBytes();
      const blob = new Blob([new Uint8Array([...output].map(c => c.charCodeAt(0)))]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "medical_record.pdf";
      link.click();
      toast.success("✅ Đã tải và giải mã");
    } catch (err) {
      toast.error("❌ Lỗi giải mã hoặc tải file");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-tr from-white via-sky-50 to-blue-100">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold text-blue-800 mb-6 flex items-center gap-2">
        🩺 Bảng điều khiển bác sĩ
      </h2>

      {!rsaCreated && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6 rounded">
          <p className="text-yellow-700 flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Bạn chưa tạo khóa RSA.
          </p>
          <button
            onClick={handleCreateKeys}
            className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Tạo khóa RSA
          </button>
        </div>
      )}

      {showPrivateKeyOnce && privateKey && (
        <div className="bg-white border border-gray-300 rounded p-4 mt-4 shadow text-sm text-gray-800 whitespace-pre-wrap break-words">
          <p className="font-semibold text-red-600 mb-2">
            🔐 Private Key của bạn (chỉ hiển thị 1 lần – hãy sao chép và lưu lại):
          </p>
          <textarea
            value={privateKey}
            readOnly
            className="w-full h-48 p-2 bg-gray-50 border border-gray-300 rounded resize-none text-xs font-mono"
          />
          <button
            className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => {
              navigator.clipboard.writeText(privateKey);
              toast.info("📋 Đã sao chép Private Key!");
            }}
          >
            Sao chép khóa
          </button>
        </div>
      )}

      {rsaCreated && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {patients.map((p, idx) => (
            <div key={idx} className="rounded-xl shadow-md border border-blue-200 p-5 bg-sky-50 hover:bg-sky-100 transition space-y-4">
              <div className="flex justify-between items-start">
                <div className="text-xl font-semibold text-blue-800 flex gap-1 items-center">
                  👤 {p.name || "(Chưa có tên)"}
                </div>
                {p.hasRecord && p.requestStatus === "approved" && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Đã phê duyệt</span>
                )}
                {!p.hasRecord && p.requestStatus === "pending" && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">Đang chờ</span>
                )}
                {!p.hasRecord && p.requestStatus === "none" && p.requestedByOthers && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">Đã được yêu cầu</span>
                )}
                {!p.hasRecord && p.requestStatus === "none" && !p.requestedByOthers && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">Chưa yêu cầu</span>
                )}
              </div>

              <div className="text-sm text-gray-800 space-y-1">
                <p><strong>Tuổi:</strong> {p.age}</p>
                <p><strong>Giới tính:</strong> {p.gender}</p>
                <p><strong>CCCD:</strong> {p.nationalId}</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {!p.hasRecord && p.requestStatus === "none" && !p.requestedByOthers && (
                  <button
                    onClick={() => handleRequestAccess(p.address)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm shadow"
                  >
                    <ShieldPlus className="w-4 h-4" /> Gửi yêu cầu
                  </button>
                )}
                {p.hasRecord && p.requestedByOthers && (
                  <button
                    disabled
                    className="flex items-center gap-2 bg-gray-400 text-white px-3 py-1.5 rounded text-sm cursor-not-allowed"
                    title="Bệnh nhân đã được yêu cầu bởi bác sĩ khác"
                  >
                    <ShieldPlus className="w-4 h-4" /> Đã được yêu cầu
                  </button>
                )}
                {p.hasRecord && p.requestStatus === "approved" && (
                  <button
                    onClick={() => handleDecryptDownload(p.address)}
                    className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 text-sm shadow"
                  >
                    <Download className="w-4 h-4" /> Tải & giải mã
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;

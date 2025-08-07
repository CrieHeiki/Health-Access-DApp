const MedicalRecordAccess = artifacts.require("MedicalRecordAccess");

module.exports = async function (deployer, network, accounts) {
  // accounts là mảng các account mà Ganache cung cấp

  // Bỏ qua accounts[0] (admin), lấy accounts[1] đến accounts[9]
  const initialUsers = accounts.slice(1, 10);

  // Deploy contract, truyền initialUsers vào constructor
  await deployer.deploy(MedicalRecordAccess, initialUsers);
};
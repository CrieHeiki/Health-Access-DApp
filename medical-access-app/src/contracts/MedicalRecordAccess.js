import Web3 from "web3";
import MedicalRecordAccess from "./MedicalRecordAccess.json";

const CONTRACT_ADDRESS = "0x29c240c295802B4D90a3C9b9E7e32532e95b3264";

const getContract = async () => {
  if (window.ethereum) {
    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });

    const contract = new web3.eth.Contract(
      MedicalRecordAccess.abi,
      CONTRACT_ADDRESS
    );

    return { web3, contract };
  } else {
    alert("Please install MetaMask!");
    return null;
  }
};

export default getContract;

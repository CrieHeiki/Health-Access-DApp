import Web3 from "web3";
import { contractABI, contractAddress } from "../contracts/contract-config";

let web3;
let contract;

const loadBlockchain = async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    await window.ethereum.enable();
    const accounts = await web3.eth.getAccounts();
    contract = new web3.eth.Contract(contractABI, contractAddress);
    return { web3, contract, account: accounts[0] };
  } else {
    alert("Please install MetaMask");
  }
};

export default loadBlockchain;

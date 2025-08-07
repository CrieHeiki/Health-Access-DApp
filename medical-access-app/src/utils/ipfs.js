import { create } from 'ipfs-http-client';

const projectId = 'YOUR_INFURA_ID';
const projectSecret = 'YOUR_INFURA_SECRET';
const auth = 'Basic ' + btoa(projectId + ':' + projectSecret);

const client = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth,
  },
});

export default client;

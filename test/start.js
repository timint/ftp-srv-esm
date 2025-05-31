import { readFileSync } from 'fs';
import winston from 'winston';
import { fileURLToPath } from 'url';
import nodePath from 'path';

import FtpServer from '../src/index.js';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)).toString());
const __dirname = nodePath.resolve(nodePath.dirname(fileURLToPath(import.meta.url)));

const server = new FtpServer({
  log: winston.createLogger({
    name: packageJson.name + '-test',
    format: winston.format.simple(), // Added format for console output
    transports: [new winston.transports.Console({ level: 'silly' })]
  }),
  url: 'ftp://127.0.0.1:8880',
  pasv_hostname: '127.0.0.1',
  pasv_min: 8881,
  greeting: ['Welcome', 'to', 'the', 'jungle!'],
  tls: {
    key: readFileSync(`test/cert/server.key`),
    cert: readFileSync(`test/cert/server.crt`),
    ca: readFileSync(`test/cert/server.csr`)
  },
  //list_format: 'ls', // Defaults to 'ls' for standard Unix-like format
  list_format: 'ep', // 'ep' format for EPLF (Extended Path Listing Format)
  anonymous: 'sillyrabbit'
});

server.on('login', ({username, password}, resolve, reject) => {
  switch (true) {

    case username === 'test' && password === 'test':
      resolve({root: __dirname});
      break;

    case username === 'anonymous':
      resolve({root: __dirname});
      break;

    default:
      reject('Bad username or password');
  }
});

server.listen();

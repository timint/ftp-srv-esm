import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import nodePath from 'path';
import winston from 'winston';

import FtpServer from './src/index.js';

const __dirname = nodePath.resolve(nodePath.dirname(fileURLToPath(import.meta.url)));

const server = new FtpServer({
  log: winston.createLogger({
    format: winston.format.simple(), // Added format for console output
    transports: [new winston.transports.Console({ level: 'silly' })]
  }),
  url: 'ftp://0.0.0.0:8880',
  pasv_min: 8881,
  greeting: ['Welcome, human!', 'Your keyboard is now a wand.'],
  tls: {
    key: readFileSync(`test/cert/server.key`),
    cert: readFileSync(`test/cert/server.crt`),
    ca: readFileSync(`test/cert/server.csr`)
  },
  list_format: 'ls', // Defaults to 'ls' for standard Unix-like format
  anonymous: true
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

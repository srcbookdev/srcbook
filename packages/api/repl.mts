import { REPLServer, start } from 'node:repl';
import { PassThrough } from 'node:stream';

class ReplService {
  inputStream: PassThrough;
  outputStream: PassThrough;
  replServer: REPLServer;

  constructor() {
    this.inputStream = new PassThrough();
    this.outputStream = new PassThrough();
    this.replServer = this.createRepl();
  }

  createRepl() {
    return start({
      input: this.inputStream,
      output: this.outputStream,
      terminal: true,
      useColors: true,
    });
  }

  sendInput(input) {
    this.inputStream.write(input + '\n');
  }

  onOutput(callback) {
    this.outputStream.on('data', (data) => {
      callback(data.toString());
    });
  }
}

export default new ReplService();

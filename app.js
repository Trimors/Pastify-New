/**
 * Startup file for Plesk's Node.js extension (Phusion Passenger) and other hosts
 * that run a single entry file. Run `npm run build` first.
 * Passenger sets PORT itself; elsewhere it defaults to 3000.
 */
process.env.NODE_ENV = "production";

const { createServer } = require("http");
const next = require("next");

const port = Number(process.env.PORT) || 3000;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log(`Pastify ready on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start Pastify", err);
    process.exit(1);
  });

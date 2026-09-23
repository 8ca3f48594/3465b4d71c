import { main } from '../src/cli.mjs';
const controller = new AbortController();
const cancel = () => controller.abort();
process.once('SIGINT',cancel);
process.once('SIGTERM',cancel);
try { process.exitCode = await main(process.argv.slice(2),{signal:controller.signal}); }
finally { process.removeListener('SIGINT',cancel); process.removeListener('SIGTERM',cancel); }

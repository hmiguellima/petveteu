/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/typedef */
import { createServer } from 'node:http';

let requests = [];
let responses = [];
let serial = 0;

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 64_000) {
      throw new Error('request_too_large');
    }
  }

  return body;
}

const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  try {
    if (request.url === '/health') {
      response.end('{"ok":true}');
      return;
    }
    if (request.url === '/control' && request.method === 'POST') {
      const control = JSON.parse(await readBody(request));
      requests = [];
      responses = control.responses ?? [];
      response.end('{"ok":true}');
      return;
    }
    if (request.url === '/requests') {
      response.end(JSON.stringify(requests));
      return;
    }
    if (
      request.method !== 'POST' ||
      !/^\/2010-04-01\/Accounts\/ACe2e\/Messages.json$/.test(request.url)
    ) {
      response.writeHead(404).end('{"error":"not_found"}');
      return;
    }
    const params = Object.fromEntries(new URLSearchParams(await readBody(request)));
    const authorized =
      request.headers.authorization ===
      `Basic ${Buffer.from('ACe2e:e2e-token').toString('base64')}`;
    if (!authorized || !params.To || !params.From || !params.Body) {
      response.writeHead(400).end('{"code":20003}');
      return;
    }
    requests.push(params);
    const next = responses.shift() ?? { status: 201 };
    if (next.disconnect) {
      request.socket.destroy();
      return;
    }
    serial += 1;
    response.writeHead(next.status ?? 201);
    response.end(JSON.stringify(next.body ?? { sid: `SM${String(serial).padStart(32, '0')}` }));
  } catch {
    response.writeHead(400).end('{"error":"invalid_request"}');
  }
});

// Docker Edge Functions reach the host through host.docker.internal.
server.listen(3101, '0.0.0.0', () => console.log('Twilio test mock ready on port 3101'));
process.on('SIGTERM', () => server.close());

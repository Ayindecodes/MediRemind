// e2e/fake-resend.mjs
// Stands in for the Resend API during browser tests (the app is pointed here with RESEND_BASE_URL).
// POST /emails      records an email, or fails like Resend would while failure mode is on
// GET  /emails?to=  lists the recorded emails, optionally only those sent to one address
// POST /failure     {"fail": true|false} switches failure mode
import http from 'node:http';

const emails = [];
let failing = false;

const readBody = (req) =>
  new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body ? JSON.parse(body) : {}));
  });

const reply = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'POST' && url.pathname === '/emails') {
      const email = await readBody(req);
      if (failing) {
        return reply(res, 422, {
          statusCode: 422,
          name: 'validation_error',
          message: 'Fake failure',
        });
      }
      emails.push(email);
      return reply(res, 200, { id: `fake_${emails.length}` });
    }

    if (req.method === 'GET' && url.pathname === '/emails') {
      const to = url.searchParams.get('to');
      return reply(res, 200, to ? emails.filter((email) => email.to === to) : emails);
    }

    if (req.method === 'POST' && url.pathname === '/failure') {
      failing = Boolean((await readBody(req)).fail);
      return reply(res, 200, { failing });
    }

    reply(res, 404, { error: 'Not found' });
  })
  .listen(Number(process.env.PORT ?? 4311));

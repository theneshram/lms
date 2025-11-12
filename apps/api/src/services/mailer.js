import net from 'node:net';
import tls from 'node:tls';
import SystemSetting from '../models/SystemSetting.js';

let cachedConfigKey = '';
let cachedSettings = null;

function getConfigKey(smtp) {
  return [smtp?.host, smtp?.port, smtp?.user, smtp?.secure, smtp?.fromEmail].join(':');
}

async function resolveSettings() {
  const settings = await SystemSetting.getSingleton();
  const smtp = settings.mail?.smtp ?? {};
  if (!smtp?.host || !smtp?.fromEmail) {
    return null;
  }
  const key = getConfigKey(smtp);
  if (!cachedSettings || cachedConfigKey !== key) {
    cachedSettings = { smtp, settings };
    cachedConfigKey = key;
  }
  return cachedSettings;
}

export async function sendMail({ to, subject, html, text }) {
  const resolved = await resolveSettings();
  if (!resolved) {
    console.warn('[mailer] SMTP not configured, skip send');
    return { skipped: true };
  }
  const { smtp } = resolved;
  const port = smtp.port || (smtp.secure ? 465 : 587);
  const socket = smtp.secure
    ? tls.connect({ host: smtp.host, port, rejectUnauthorized: false })
    : net.createConnection({ host: smtp.host, port });

  socket.setEncoding('utf8');

  try {
    await waitForResponse(socket);
    await sendCommand(socket, `EHLO lms.local`);

    if (smtp.user && smtp.password) {
      await sendCommand(socket, 'AUTH LOGIN');
      await sendCommand(socket, Buffer.from(smtp.user).toString('base64'));
      await sendCommand(socket, Buffer.from(smtp.password).toString('base64'));
    }

    const fromAddress = smtp.fromEmail;
    const from = smtp.fromName ? `${smtp.fromName} <${smtp.fromEmail}>` : smtp.fromEmail;

    await sendCommand(socket, `MAIL FROM:<${fromAddress}>`);
    await sendCommand(socket, `RCPT TO:<${to}>`);
    await sendCommand(socket, 'DATA');

    const body = buildMessage({ from, to, subject, html, text });
    socket.write(`${body}\r\n.\r\n`);
    await waitForResponse(socket);
    await sendCommand(socket, 'QUIT');
    socket.end();
  } catch (error) {
    socket.end();
    console.error('[mailer] failed to deliver email', error);
    throw error;
  }

  return { id: `${Date.now()}` };
}

function buildMessage({ from, to, subject, html, text }) {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
  ];
  if (html) {
    headers.push('Content-Type: text/html; charset=UTF-8', '', html);
  } else {
    headers.push('Content-Type: text/plain; charset=UTF-8', '', text || '');
  }
  return headers.join('\r\n');
}

function waitForResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const handleData = (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\r\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.slice(0, 3), 10);
        const isFinal = line.length >= 4 ? line[3] === ' ' : true;
        if (isFinal) {
          socket.off('data', handleData);
          socket.off('error', handleError);
          if (code >= 400) {
            reject(new Error(line));
          } else {
            resolve(line);
          }
          return;
        }
      }
    };
    const handleError = (err) => {
      socket.off('data', handleData);
      socket.off('error', handleError);
      reject(err);
    };
    socket.on('data', handleData);
    socket.on('error', handleError);
  });
}

async function sendCommand(socket, command) {
  socket.write(`${command}\r\n`);
  return waitForResponse(socket);
}

export async function sendTemplateMail(key, { to, context = {} }) {
  const resolved = await resolveSettings();
  if (!resolved) return { skipped: true };
  const { settings } = resolved;
  const template = settings.mail?.templates?.find((tpl) => tpl.key === key && tpl.enabled !== false);
  if (!template) {
    console.warn(`[mailer] template ${key} missing`);
    return { skipped: true };
  }
  const compiledSubject = interpolate(template.subject, context);
  const compiledHtml = interpolate(template.html, context);
  const compiledText = interpolate(template.text ?? '', context);
  return sendMail({ to, subject: compiledSubject, html: compiledHtml, text: compiledText });
}

function interpolate(input, context) {
  if (!input) return '';
  return input.replace(/{{\s*(\w+)\s*}}/g, (_, key) => (context[key] ?? ''));
}

export async function refreshMailerCache() {
  cachedConfigKey = '';
  cachedSettings = null;
  await resolveSettings();
}

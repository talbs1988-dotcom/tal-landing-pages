#!/usr/bin/env node
// A tiny local webhook for /page-check: the site sends its test lead here
// (WEBHOOK_URL=http://127.0.0.1:<port>/lead), and every body it gets is saved
// to a JSON file, so the check can show exactly what Make would receive.
// Listens on 127.0.0.1 only. Stops with Ctrl+C or when the process is killed.
//
//   node lead-catcher.mjs <port> <קובץ לשמירה>
import { createServer } from "node:http";
import { writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const MAX_BODY = 64 * 1024;

export function startCatcher({ port = 0, file }) {
  const received = [];
  const server = createServer((req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405).end();
      return;
    }
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (c) => {
      body += c;
      if (body.length > MAX_BODY) req.destroy();
    });
    req.on("end", async () => {
      let json;
      try {
        json = JSON.parse(body);
      } catch {
        json = { notJson: body };
      }
      received.push({
        at: new Date().toISOString(),
        path: req.url,
        body: json,
      });
      if (file) {
        const tmp = `${file}.tmp`;
        await writeFile(tmp, JSON.stringify(received, null, 2));
        await rename(tmp, file);
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"ok":true}');
    });
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () =>
      resolve({ server, received, port: server.address().port }),
    );
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [port, file] = process.argv.slice(2);
  if (!port || !file) {
    console.error("שימוש: lead-catcher.mjs <port> <קובץ לשמירה>");
    process.exit(1);
  }
  startCatcher({ port: Number(port), file }).then(({ port: p }) =>
    console.log(`הקולט מאזין ב-http://127.0.0.1:${p}/lead ושומר ל-${file}`),
  );
}

#!/usr/bin/env python3
"""Serve the static site and store contact-form submissions in SQLite."""

from __future__ import annotations

import json
import sqlite3
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "contacts.sqlite"
CONTACT_EMAIL = "mail@goliveway.win"
HOST = "127.0.0.1"
PORT = 8080
MAX_BODY = 64_000


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT NOT NULL,
                description TEXT NOT NULL,
                lang TEXT,
                user_agent TEXT,
                ip TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at);
            CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
            CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
            """
        )


def save_contact(row: dict) -> int:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute(
            """
            INSERT INTO contacts
                (created_at, name, phone, email, description, lang, user_agent, ip)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["created_at"],
                row["name"],
                row["phone"],
                row["email"],
                row["description"],
                row["lang"],
                row["user_agent"],
                row["ip"],
            ),
        )
        return int(cur.lastrowid)


def notify_email(name: str, phone: str, email: str, description: str) -> None:
    """Best-effort notification to CONTACT_EMAIL (does not block saving)."""
    payload = json.dumps(
        {
            "name": name,
            "email": email,
            "phone": phone or "(não indicado)",
            "description": description,
            "_subject": "Pedido de chamada — Go Live Way",
            "_template": "table",
            "_replyto": email,
        }
    ).encode()
    req = urllib.request.Request(
        f"https://formsubmit.co/ajax/{CONTACT_EMAIL}",
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            resp.read()
    except (urllib.error.URLError, TimeoutError, OSError):
        pass


def json_response(handler: SimpleHTTPRequestHandler, status: int, body: dict) -> None:
    data = json.dumps(body).encode()
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(data)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        if self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        if urlparse(self.path).path.rstrip("/") != "/api/contact":
            self.send_error(404)
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        path = urlparse(self.path).path.rstrip("/")
        if path != "/api/contact":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return json_response(self, 400, {"ok": False, "error": "invalid_body"})

        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return json_response(self, 400, {"ok": False, "error": "invalid_json"})

        if data.get("_gotcha"):
            return json_response(self, 200, {"ok": True})

        name = str(data.get("name") or "").strip()
        phone = str(data.get("phone") or "").strip()
        email = str(data.get("email") or "").strip()
        description = str(data.get("description") or "").strip()
        lang = str(data.get("lang") or "").strip()[:8] or None

        if not name or not email or not description or "@" not in email:
            return json_response(self, 400, {"ok": False, "error": "validation"})

        ip = self.client_address[0]
        forwarded = self.headers.get("CF-Connecting-IP") or self.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()

        row_id = save_contact(
            {
                "created_at": datetime.now(timezone.utc).isoformat(),
                "name": name[:200],
                "phone": phone[:80] or None,
                "email": email[:254],
                "description": description[:5000],
                "lang": lang,
                "user_agent": (self.headers.get("User-Agent") or "")[:400] or None,
                "ip": ip,
            }
        )
        notify_email(name, phone, email, description)
        return json_response(self, 200, {"ok": True, "id": row_id})

    def log_message(self, fmt: str, *args) -> None:
        sys_stderr = __import__("sys").stderr
        sys_stderr.write("%s - %s\n" % (self.log_date_time_string(), fmt % args))


def main() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Serving {ROOT} on http://{HOST}:{PORT}")
    print(f"SQLite contacts DB: {DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()

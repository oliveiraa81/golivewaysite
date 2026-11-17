#!/usr/bin/env python3
"""List or search contact-form submissions stored in SQLite.

Usage:
  python3 deploy/list-contacts.py
  python3 deploy/list-contacts.py "maria"
  python3 deploy/list-contacts.py --email mail@example.com
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "contacts.sqlite"


def main() -> int:
    parser = argparse.ArgumentParser(description="Search saved contact requests")
    parser.add_argument("query", nargs="?", help="Text to search in name, email, phone, description")
    parser.add_argument("--email", help="Exact email filter")
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"No database yet: {DB_PATH}", file=sys.stderr)
        return 1

    sql = """
        SELECT id, created_at, name, phone, email, description, lang
        FROM contacts
        WHERE 1=1
    """
    params: list = []
    if args.email:
        sql += " AND lower(email) = lower(?)"
        params.append(args.email)
    if args.query:
        sql += """
          AND (
            name LIKE ? OR email LIKE ? OR IFNULL(phone,'') LIKE ?
            OR description LIKE ?
          )
        """
        like = f"%{args.query}%"
        params.extend([like, like, like, like])
    sql += " ORDER BY id DESC LIMIT ?"
    params.append(args.limit)

    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(sql, params).fetchall()

    if not rows:
        print("No matches.")
        return 0

    for r in rows:
        print("-" * 60)
        print(f"#{r['id']}  {r['created_at']}  lang={r['lang'] or '-'}")
        print(f"Name:  {r['name']}")
        print(f"Email: {r['email']}")
        print(f"Phone: {r['phone'] or '-'}")
        print(f"Desc:  {r['description']}")
    print("-" * 60)
    print(f"{len(rows)} row(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

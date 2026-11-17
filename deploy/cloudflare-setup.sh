#!/usr/bin/env bash
# Create draftsite.goliveway.win DNS + Cloudflare Tunnel public hostname.
# Requires API token with Zone:DNS:Edit and Account:Cloudflare Tunnel:Edit
#
#   export CLOUDFLARE_API_TOKEN='…'
#   bash deploy/cloudflare-setup.sh
set -euo pipefail

HOSTNAME="draftsite.goliveway.win"
ZONE_NAME="goliveway.win"
ORIGIN="http://127.0.0.1:8080"
ACCOUNT_ID="1aa406a6f6bc0429a7ed76d20a45b1c2"
TUNNEL_ID="87eee317-11ac-4cc5-a05a-d79a815d5ac2"
TUNNEL_TARGET="${TUNNEL_ID}.cfargotunnel.com"

: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN first}"

export HOSTNAME ORIGIN ACCOUNT_ID TUNNEL_ID TUNNEL_TARGET ZONE_NAME CLOUDFLARE_API_TOKEN

python3 - <<'PY'
import json, os, urllib.error, urllib.parse, urllib.request

TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]
HOSTNAME = os.environ["HOSTNAME"]
ZONE_NAME = os.environ["ZONE_NAME"]
ORIGIN = os.environ["ORIGIN"]
ACCOUNT_ID = os.environ["ACCOUNT_ID"]
TUNNEL_ID = os.environ["TUNNEL_ID"]
TUNNEL_TARGET = os.environ["TUNNEL_TARGET"]


def api(method: str, path: str, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            payload = json.load(resp)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        raise SystemExit(f"API {method} {path} failed ({exc.code}): {detail}") from exc
    if not payload.get("success"):
        raise SystemExit(f"API {method} {path} error: {payload}")
    return payload


print(f"==> Resolve zone id for {ZONE_NAME}")
zone = api("GET", f"/zones?name={urllib.parse.quote(ZONE_NAME)}")["result"][0]
zone_id = zone["id"]
print(f"    zone_id={zone_id}")

print(f"==> Upsert CNAME {HOSTNAME} -> {TUNNEL_TARGET}")
q = urllib.parse.urlencode({"type": "CNAME", "name": HOSTNAME})
existing = api("GET", f"/zones/{zone_id}/dns_records?{q}")["result"]
record = {
    "type": "CNAME",
    "name": HOSTNAME,
    "content": TUNNEL_TARGET,
    "ttl": 1,
    "proxied": True,
}
if existing:
    out = api("PUT", f"/zones/{zone_id}/dns_records/{existing[0]['id']}", record)
    print(f"    updated {out['result']['id']}")
else:
    out = api("POST", f"/zones/{zone_id}/dns_records", record)
    print(f"    created {out['result']['id']}")

print("==> Update tunnel ingress")
cfg_resp = api("GET", f"/accounts/{ACCOUNT_ID}/cfd_tunnel/{TUNNEL_ID}/configurations")
cfg = (cfg_resp.get("result") or {}).get("config") or {}
ingress = list(cfg.get("ingress") or [])
rules, catch = [], []
for rule in ingress:
    if "hostname" not in rule:
        catch.append(rule)
    elif rule.get("hostname") != HOSTNAME:
        rules.append(rule)
rules.append({"hostname": HOSTNAME, "service": ORIGIN})
if not catch:
    catch = [{"service": "http_status:404"}]
api(
    "PUT",
    f"/accounts/{ACCOUNT_ID}/cfd_tunnel/{TUNNEL_ID}/configurations",
    {"config": {**cfg, "ingress": rules + catch}},
)
print(f"    {HOSTNAME} -> {ORIGIN}")
print()
print(f"Done. Open https://{HOSTNAME}/")
PY

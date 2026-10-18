#!/usr/bin/env python3
"""Generate a Mihomo classical ruleset from OpenAI's official Voice IP feed."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import ipaddress
import json
import os
from pathlib import Path
import sys
import tempfile
import time
from urllib.error import URLError
from urllib.request import Request, urlopen


SOURCE_URL = "https://openai.com/chatgpt-voice.json"
DIRECTORY = Path(__file__).resolve().parent
MAX_DOWNLOAD_BYTES = 1024 * 1024


def parse_feed(data: object) -> tuple[str, list]:
    """Validate the entire feed before allowing any generated files to change."""
    if not isinstance(data, dict):
        raise ValueError("Feed must be a JSON object")
    stamp = data.get("creationTime")
    if not isinstance(stamp, str):
        raise ValueError("creationTime must be an ISO 8601 string")
    try:
        created = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("Invalid creationTime") from exc
    if created.utcoffset() is None:
        raise ValueError("creationTime must include a timezone")
    stamp = created.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

    entries = data.get("prefixes")
    if not isinstance(entries, list) or not entries:
        raise ValueError("prefixes must be a non-empty list")
    networks = set()
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Each prefix entry must be an object")
        keys = [key for key in ("ipv4Prefix", "ipv6Prefix") if key in entry]
        if len(keys) != 1:
            raise ValueError("Each entry must contain exactly one IP prefix")
        value = entry[keys[0]]
        if not isinstance(value, str) or "/" not in value:
            raise ValueError("Each prefix must be a CIDR string")
        network = ipaddress.ip_network(value, strict=True)
        expected = 4 if keys[0] == "ipv4Prefix" else 6
        if network.version != expected:
            raise ValueError("IP address family does not match its prefix key")
        if not (
            network.is_global
            and not network.is_multicast
            and network.network_address.is_global
            and network.broadcast_address.is_global
        ):
            raise ValueError(f"Non-public or catch-all prefix refused: {network}")
        networks.add(network)
    return stamp, sorted(
        networks, key=lambda item: (item.version, int(item.network_address), item.prefixlen)
    )


def render_files(data: object) -> dict[str, bytes]:
    stamp, networks = parse_feed(data)
    snapshot = {
        "creationTime": stamp,
        "prefixes": [
            {"ipv4Prefix" if network.version == 4 else "ipv6Prefix": str(network)}
            for network in networks
        ],
    }
    header = [
        "# NAME: ChatGPTVoice",
        f"# SOURCE: {SOURCE_URL}",
        f"# SOURCE-UPDATED: {stamp}",
        "# FORMAT: Mihomo classical text",
        f"# TOTAL: {len(networks)}",
        "# Voice media IPs only; use with an outbound that supports UDP.",
    ]
    rules = [
        f"{'IP-CIDR' if network.version == 4 else 'IP-CIDR6'},{network},no-resolve"
        for network in networks
    ]
    return {
        "ChatGPTVoice.list": ("\n".join(header + rules) + "\n").encode("utf-8"),
        "source.json": (json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n").encode("utf-8"),
    }


def download_feed() -> object:
    request = Request(SOURCE_URL, headers={"User-Agent": "ChatGPTVoice-rules/1.0"})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=30) as response:
                raw = response.read(MAX_DOWNLOAD_BYTES + 1)
            if len(raw) > MAX_DOWNLOAD_BYTES:
                raise ValueError("Official feed exceeds the download size limit")
            return json.loads(raw)
        except (OSError, URLError):
            if attempt == 2:
                raise
            time.sleep(attempt + 1)
    raise RuntimeError("Download did not complete")


def publish(data: object, directory: Path) -> bool:
    contents = render_files(data)
    pending = []
    try:
        # Prepare all changed files before replacing any existing output.
        for name, desired in contents.items():
            target = directory / name
            if target.exists() and target.read_bytes() == desired:
                continue
            fd, temporary = tempfile.mkstemp(prefix=f".{name}.", dir=directory)
            pending.append((Path(temporary), target))
            with os.fdopen(fd, "wb") as handle:
                handle.write(desired)
        for temporary, target in pending:
            os.replace(temporary, target)
    finally:
        for temporary, _ in pending:
            temporary.unlink(missing_ok=True)
    return bool(pending)


def check(directory: Path) -> None:
    data = json.loads((directory / "source.json").read_bytes())
    for name, expected in render_files(data).items():
        if (directory / name).read_bytes() != expected:
            raise ValueError(f"{name} is stale or was edited; regenerate it with update.py")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Validate saved files without network access")
    mode.add_argument("--source", type=Path, help="Generate from a local official JSON snapshot")
    options = parser.parse_args()
    try:
        if options.check:
            check(DIRECTORY)
            print("Saved official snapshot and Mihomo rules are consistent")
        else:
            data = json.loads(options.source.read_bytes()) if options.source else download_feed()
            changed = publish(data, DIRECTORY)
            count = len(parse_feed(data)[1])
            print(f"{'Updated' if changed else 'Unchanged'}: {count} official Voice IP rules")
    except (OSError, ValueError) as exc:
        print(f"ChatGPT Voice update/check failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

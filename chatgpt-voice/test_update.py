"""Offline tests for official-feed validation and preservation of published rules."""

import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import URLError

import update


def feed(*entries):
    return {
        "creationTime": "2026-03-26T20:12:45.451356Z",
        "prefixes": list(entries) or [{"ipv4Prefix": "4.155.146.196/32"}],
    }


class FeedTests(unittest.TestCase):
    def test_mixed_families_sorted_and_deduplicated(self):
        data = feed(
            {"ipv6Prefix": "2607:6bc0::/48"},
            {"ipv4Prefix": "20.168.48.117/32"},
            {"ipv4Prefix": "4.155.146.196/32"},
            {"ipv4Prefix": "4.155.146.196/32"},
        )
        files = update.render_files(data)
        rules = files["ChatGPTVoice.list"].decode().splitlines()
        self.assertEqual(rules[-3:], [
            "IP-CIDR,4.155.146.196/32,no-resolve",
            "IP-CIDR,20.168.48.117/32,no-resolve",
            "IP-CIDR6,2607:6bc0::/48,no-resolve",
        ])
        self.assertEqual(len(json.loads(files["source.json"])["prefixes"]), 3)

    def test_rejects_invalid_schema(self):
        cases = [None, [], {}, {"creationTime": 123, "prefixes": []}]
        for entries in ([], "4.155.146.196/32", [None], [{}], ["4.155.146.196/32"]):
            cases.append({"creationTime": feed()["creationTime"], "prefixes": entries})
        for data in cases:
            with self.subTest(data=data), self.assertRaises(ValueError):
                update.render_files(data)

    def test_rejects_bad_or_timezone_free_timestamp(self):
        for stamp in ("invalid", "2026-03-26", "2026-03-26T20:12:45", None):
            data = feed()
            data["creationTime"] = stamp
            with self.subTest(stamp=stamp), self.assertRaises(ValueError):
                update.render_files(data)

    def test_equivalent_timestamps_do_not_change_output(self):
        data = feed()
        equivalent = copy.deepcopy(data)
        equivalent["creationTime"] = "2026-03-27T04:12:45.451356+08:00"
        self.assertEqual(update.render_files(data), update.render_files(equivalent))

    def test_rejects_unsafe_or_malformed_prefixes(self):
        bad_entries = [
            {"ipv4Prefix": "0.0.0.0/0"},
            {"ipv6Prefix": "::/0"},
            {"ipv4Prefix": "127.0.0.1/32"},
            {"ipv4Prefix": "192.168.0.0/16"},
            {"ipv6Prefix": "fe80::/10"},
            {"ipv4Prefix": "224.0.0.0/4"},
            {"ipv4Prefix": "4.155.146.196"},
            {"ipv4Prefix": "4.155.146.196/24"},
            {"ipv4Prefix": "not-an-ip/32"},
            {"ipv4Prefix": "2607:6bc0::/48"},
            {"ipv6Prefix": "4.155.146.196/32"},
            {"ipv4Prefix": 123},
            {"ipv4Prefix": "4.155.146.196/32", "ipv6Prefix": "2607:6bc0::/48"},
        ]
        for entry in bad_entries:
            with self.subTest(entry=entry), self.assertRaises(ValueError):
                update.render_files(feed(entry))

    def test_publish_is_idempotent_and_check_detects_drift(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            self.assertTrue(update.publish(feed(), directory))
            before = {path.name: path.stat().st_mtime_ns for path in directory.iterdir()}
            self.assertFalse(update.publish(feed(), directory))
            self.assertEqual(before, {path.name: path.stat().st_mtime_ns for path in directory.iterdir()})
            update.check(directory)
            (directory / "ChatGPTVoice.list").write_text("MATCH,DIRECT\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                update.check(directory)

    def test_invalid_late_entry_preserves_all_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            update.publish(feed(), directory)
            before = {path.name: path.read_bytes() for path in directory.iterdir()}
            data = feed({"ipv4Prefix": "20.168.48.117/32"}, {"ipv4Prefix": "0.0.0.0/0"})
            with self.assertRaises(ValueError):
                update.publish(data, directory)
            self.assertEqual(before, {path.name: path.read_bytes() for path in directory.iterdir()})

    def test_cli_network_failure_preserves_all_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            update.publish(feed(), directory)
            before = {path.name: path.read_bytes() for path in directory.iterdir()}
            with patch.object(update, "DIRECTORY", directory), patch.object(update.sys, "argv", ["update.py"]), patch.object(update, "download_feed", side_effect=URLError("offline")):
                self.assertEqual(update.main(), 1)
            self.assertEqual(before, {path.name: path.read_bytes() for path in directory.iterdir()})

    def test_download_retries_and_limits_response_size(self):
        with patch.object(update, "urlopen", side_effect=URLError("offline")) as opener, patch.object(update.time, "sleep"):
            with self.assertRaises(URLError):
                update.download_feed()
            self.assertEqual(opener.call_count, 3)
        with patch.object(update, "urlopen") as opener:
            response = opener.return_value.__enter__.return_value
            response.read.return_value = b"x" * (update.MAX_DOWNLOAD_BYTES + 1)
            with self.assertRaises(ValueError):
                update.download_feed()


if __name__ == "__main__":
    unittest.main()

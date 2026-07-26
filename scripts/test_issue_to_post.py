#!/usr/bin/env python3
"""Tests for scripts/issue_to_post.py"""

import os
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

# Add the scripts dir to the path so we can import the module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
import issue_to_post as itp


class TestSlugify(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(itp.slugify("Hello World"), "hello-world")

    def test_special_chars(self):
        self.assertEqual(itp.slugify("Hello, World!"), "hello-world")

    def test_extra_spaces(self):
        self.assertEqual(itp.slugify("  my  blog  post  "), "my-blog-post")

    def test_truncation(self):
        long_title = "a" * 100
        self.assertEqual(len(itp.slugify(long_title)), 60)

    def test_hyphens_collapsed(self):
        self.assertEqual(itp.slugify("foo--bar"), "foo-bar")


class TestParseLabels(unittest.TestCase):
    def test_list(self):
        self.assertEqual(itp.parse_labels('["bug", "blog"]'), ["bug", "blog"])

    def test_empty(self):
        self.assertEqual(itp.parse_labels("[]"), [])

    def test_empty_string(self):
        self.assertEqual(itp.parse_labels(""), [])

    def test_invalid_json(self):
        self.assertEqual(itp.parse_labels("not-json"), [])


class TestParseDate(unittest.TestCase):
    def test_utc_z(self):
        dt = itp.parse_date("2026-07-25T09:00:00Z")
        self.assertEqual(dt.year, 2026)
        self.assertEqual(dt.month, 7)
        self.assertEqual(dt.day, 25)

    def test_offset(self):
        dt = itp.parse_date("2026-07-25T09:00:00+00:00")
        self.assertEqual(dt.year, 2026)

    def test_invalid_falls_back(self):
        dt = itp.parse_date("not-a-date")
        # Should return a datetime without crashing
        self.assertIsInstance(dt, datetime)


class TestBuildFrontMatter(unittest.TestCase):
    def _make_date(self):
        return datetime(2026, 7, 25, 9, 0, 0, tzinfo=timezone.utc)

    def test_issue_front_matter(self):
        fm = itp.build_front_matter(
            title="My Post",
            date=self._make_date(),
            author="kit-ong",
            labels=["news"],
            source_url="https://github.com/Kit-Ong/news/issues/1",
            source_type="issue",
        )
        self.assertIn('title: "My Post"', fm)
        self.assertIn("issue_url:", fm)
        self.assertNotIn("pr_url:", fm)
        self.assertIn("- \"news\"", fm)

    def test_pr_front_matter(self):
        fm = itp.build_front_matter(
            title="A PR Post",
            date=self._make_date(),
            author="kit-ong",
            labels=[],
            source_url="https://github.com/Kit-Ong/news/pull/2",
            source_type="pr",
        )
        self.assertIn("pr_url:", fm)
        self.assertNotIn("issue_url:", fm)
        self.assertNotIn("labels:", fm)

    def test_starts_and_ends_with_dashes(self):
        fm = itp.build_front_matter("T", self._make_date(), "", [], "", "issue")
        self.assertTrue(fm.startswith("---"))
        self.assertTrue(fm.endswith("---"))


class TestSanitizeBody(unittest.TestCase):
    def test_passthrough(self):
        self.assertEqual(itp.sanitize_body("hello"), "hello")

    def test_empty(self):
        self.assertEqual(itp.sanitize_body(""), "")

    def test_strips_front_matter(self):
        body = "---\nlayout: post\n---\nReal content"
        self.assertEqual(itp.sanitize_body(body), "Real content")

    def test_strips_whitespace(self):
        self.assertEqual(itp.sanitize_body("  hello  "), "hello")


class TestCreateFromIssue(unittest.TestCase):
    def test_creates_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            env = {
                "ISSUE_NUMBER": "42",
                "ISSUE_TITLE": "Test Issue Post",
                "ISSUE_BODY": "This is the body.",
                "ISSUE_CREATED_AT": "2026-07-25T10:00:00Z",
                "ISSUE_URL": "https://github.com/Kit-Ong/news/issues/42",
                "ISSUE_AUTHOR": "kit-ong",
                "ISSUE_LABELS": '["blog", "news"]',
            }
            with patch.dict(os.environ, env):
                # Patch posts_dir to our temp dir
                with patch("issue_to_post.write_post") as mock_write:
                    mock_write.return_value = os.path.join(tmpdir, "test.md")
                    itp.create_from_issue()
                    mock_write.assert_called_once()
                    args = mock_write.call_args[0]
                    filename, front_matter, body = args
                    self.assertTrue(filename.startswith("2026-07-25"))
                    self.assertIn("test-issue-post", filename)
                    self.assertIn('"Test Issue Post"', front_matter)
                    self.assertEqual(body, "This is the body.")
                    # 'blog' label should be removed
                    self.assertNotIn("blog", front_matter)

    def test_blog_label_excluded(self):
        """The 'blog' trigger label should not appear in the post labels."""
        env = {
            "ISSUE_NUMBER": "5",
            "ISSUE_TITLE": "Only Blog Label",
            "ISSUE_BODY": "",
            "ISSUE_CREATED_AT": "2026-07-25T10:00:00Z",
            "ISSUE_URL": "",
            "ISSUE_AUTHOR": "",
            "ISSUE_LABELS": '["blog"]',
        }
        with patch.dict(os.environ, env):
            with patch("issue_to_post.write_post") as mock_write:
                mock_write.return_value = "/tmp/dummy.md"
                itp.create_from_issue()
                front_matter = mock_write.call_args[0][1]
                self.assertNotIn("labels:", front_matter)


class TestCreateFromPR(unittest.TestCase):
    def test_creates_file(self):
        env = {
            "PR_NUMBER": "10",
            "PR_TITLE": "A Pull Request Post",
            "PR_BODY": "PR content here.",
            "PR_CREATED_AT": "2026-07-25T11:00:00Z",
            "PR_URL": "https://github.com/Kit-Ong/news/pull/10",
            "PR_AUTHOR": "kit-ong",
            "PR_LABELS": '["blog"]',
        }
        with patch.dict(os.environ, env):
            with patch("issue_to_post.write_post") as mock_write:
                mock_write.return_value = "/tmp/dummy.md"
                itp.create_from_pr()
                mock_write.assert_called_once()
                args = mock_write.call_args[0]
                filename, front_matter, body = args
                self.assertIn("a-pull-request-post", filename)
                self.assertIn("pr_url:", front_matter)
                self.assertEqual(body, "PR content here.")


if __name__ == "__main__":
    unittest.main()

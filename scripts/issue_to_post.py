#!/usr/bin/env python3
"""
Convert a GitHub Issue or Pull Request into a Jekyll blog post.

Usage (via GitHub Actions environment variables):
    python scripts/issue_to_post.py issue
    python scripts/issue_to_post.py pr

When run directly (for testing), pass overrides as environment variables:
    ISSUE_NUMBER=1 ISSUE_TITLE="My Post" ISSUE_BODY="Content here" \\
      ISSUE_CREATED_AT="2026-07-25T09:00:00Z" ISSUE_URL="https://..." \\
      ISSUE_AUTHOR="kit-ong" ISSUE_LABELS='["blog"]' \\
      python scripts/issue_to_post.py issue
"""

import json
import os
import re
import sys
from datetime import datetime, timezone


def slugify(text: str) -> str:
    """Convert text to a URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")[:60]


def parse_labels(raw: str) -> list[str]:
    """Parse JSON label list from environment variable."""
    try:
        labels = json.loads(raw) if raw else []
        return [str(label) for label in labels if label]
    except (json.JSONDecodeError, TypeError):
        return []


def parse_date(raw: str) -> datetime:
    """Parse ISO 8601 datetime string into a datetime object (UTC)."""
    raw = raw.strip()
    # Handle trailing 'Z'
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(raw).astimezone(timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)


def build_front_matter(title: str, date: datetime, author: str,
                       labels: list[str], source_url: str,
                       source_type: str) -> str:
    """Build YAML front matter for a Jekyll post."""
    date_str = date.strftime("%Y-%m-%d %H:%M:%S +0000")

    lines = [
        "---",
        f"layout: post",
        f"title: {json.dumps(title)}",
        f"date: {date_str}",
    ]

    if author:
        lines.append(f"author: {json.dumps(author)}")

    if labels:
        lines.append("labels:")
        for label in labels:
            lines.append(f"  - {json.dumps(label)}")

    if source_type == "issue":
        lines.append(f"issue_url: {json.dumps(source_url)}")
    else:
        lines.append(f"pr_url: {json.dumps(source_url)}")

    lines.append("---")
    return "\n".join(lines)


def sanitize_body(body: str) -> str:
    """Light sanitisation of the body text for use in a Jekyll post."""
    if not body:
        return ""
    # Remove any YAML front matter if the issue body accidentally included it
    body = re.sub(r"^---\n.*?\n---\n", "", body, flags=re.DOTALL)
    return body.strip()


def write_post(filename: str, front_matter: str, body: str) -> str:
    """Write the Jekyll post file and return its path."""
    posts_dir = os.path.join(os.path.dirname(__file__), "..", "_posts")
    os.makedirs(posts_dir, exist_ok=True)
    filepath = os.path.join(posts_dir, filename)

    with open(filepath, "w", encoding="utf-8") as fh:
        fh.write(front_matter)
        fh.write("\n\n")
        if body:
            fh.write(body)
            fh.write("\n")

    return filepath


def create_from_issue() -> str:
    """Read Issue env vars and create a Jekyll post."""
    title = os.environ.get("ISSUE_TITLE", "Untitled Issue")
    body = sanitize_body(os.environ.get("ISSUE_BODY", ""))
    created_at = os.environ.get("ISSUE_CREATED_AT", "")
    url = os.environ.get("ISSUE_URL", "")
    author = os.environ.get("ISSUE_AUTHOR", "")
    labels_raw = os.environ.get("ISSUE_LABELS", "[]")
    issue_number = os.environ.get("ISSUE_NUMBER", "0")

    date = parse_date(created_at) if created_at else datetime.now(timezone.utc)
    labels = [l for l in parse_labels(labels_raw) if l != "blog"]

    date_prefix = date.strftime("%Y-%m-%d")
    slug = slugify(title)
    filename = f"{date_prefix}-{slug}.md"

    front_matter = build_front_matter(title, date, author, labels, url, "issue")
    filepath = write_post(filename, front_matter, body)
    print(f"Created post: {filepath}")
    return filepath


def create_from_pr() -> str:
    """Read PR env vars and create a Jekyll post."""
    title = os.environ.get("PR_TITLE", "Untitled PR")
    body = sanitize_body(os.environ.get("PR_BODY", ""))
    created_at = os.environ.get("PR_CREATED_AT", "")
    url = os.environ.get("PR_URL", "")
    author = os.environ.get("PR_AUTHOR", "")
    labels_raw = os.environ.get("PR_LABELS", "[]")

    date = parse_date(created_at) if created_at else datetime.now(timezone.utc)
    labels = [l for l in parse_labels(labels_raw) if l != "blog"]

    date_prefix = date.strftime("%Y-%m-%d")
    slug = slugify(title)
    filename = f"{date_prefix}-{slug}.md"

    front_matter = build_front_matter(title, date, author, labels, url, "pr")
    filepath = write_post(filename, front_matter, body)
    print(f"Created post: {filepath}")
    return filepath


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in ("issue", "pr"):
        print("Usage: issue_to_post.py <issue|pr>", file=sys.stderr)
        sys.exit(1)

    source_type = sys.argv[1]
    if source_type == "issue":
        create_from_issue()
    else:
        create_from_pr()


if __name__ == "__main__":
    main()

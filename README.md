# Kit-Ong's Blog

A personal blog built with [Jekyll](https://jekyllrb.com/) and hosted on [GitHub Pages](https://pages.github.com/).

## Live site

The blog is served at **`https://kit-ong.github.io/news/`** from this repository's GitHub Pages.

## Publishing a blog post

Blog posts are created automatically from GitHub Issues or Pull Requests. Just:

1. Open a new **Issue** (or **Pull Request**) in this repository.
2. Add the **`blog`** label to it.
3. A GitHub Actions workflow will convert the Issue/PR body (Markdown) into a Jekyll post and publish it automatically.

## Running locally

```bash
gem install bundler jekyll
bundle exec jekyll serve
```

Then open <http://localhost:4000/news/>.

## Manual post creation

You can also run the conversion script directly:

```bash
# From an issue
ISSUE_NUMBER=1 \
ISSUE_TITLE="My Post Title" \
ISSUE_BODY="Post content in **Markdown**." \
ISSUE_CREATED_AT="2026-07-25T09:00:00Z" \
ISSUE_URL="https://github.com/Kit-Ong/news/issues/1" \
ISSUE_AUTHOR="kit-ong" \
ISSUE_LABELS='["blog"]' \
python scripts/issue_to_post.py issue
```

## Running tests

```bash
python -m pytest scripts/test_issue_to_post.py -v
```
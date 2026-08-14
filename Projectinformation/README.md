# CertifiedBanger — Curated Community Review Platform

> A community-curated review platform where readers rate and review manga/manhwa across multiple quality dimensions, and the best entries earn a community-awarded seal ("Certified Banger"). Version 1 focuses exclusively on manga/manhwa; future versions expand to other media/consumables.

This document is the project brief and requirements baseline for development. It is written to be handed to an AI coding assistant (Claude Code) as ground-truth context before implementation begins.

---

## 1. Vision

Manga/manhwa readers currently rely on scattered, low-signal sources (general databases with a single aggregate score, forum threads, social media) to find their next read. There is no site that combines **structured, multi-category ratings** with **human curation** in the form of a distinct, meaningful quality seal.

CertifiedBanger aims to become that source — starting with manga/manhwa, and expanding over time into a general "trusted community verdict" platform for any kind of consumable media (games, movies, novels, etc.).

**Core value proposition:** Instead of a single opaque score, users see *why* something is good, broken into consistent categories, backed by a review, and — when a title is exceptional — marked with a community-recognized seal of quality.

---

## 2. Goals & Non-Goals (v1)

### Goals
- Let users write structured reviews of manga/manhwa with per-category ratings.
- Let users award a distinct "seal" (e.g. "Certified Banger") to titles they believe deserve special recognition, with a written justification.
- Let users rate/comment on other users' reviews (surface the best reviews, not just the best titles).
- Provide browsing/discovery: search, filter, sort by category score, sort by seal count, etc.
- Build the data model and architecture so that a future generalization to other media types is a schema extension, not a rewrite.

### Non-Goals (explicitly out of scope for v1)
- No token/crypto integration in v1 (planned for a later version — see [Section 8](#8-future-scope-post-v1)).
- No manga/manhwa *reading* functionality (this is not a scanlation/hosting site — no chapter reading, no copyrighted content hosting). The platform reviews titles; it does not distribute them.
- No support for media types other than manga/manhwa in v1.
- No native mobile app in v1 (responsive web only).
- No monetization/ads in v1.

---

## 3. Target Users & Core User Stories

**Primary persona:** An engaged manga/manhwa reader who has read widely, has strong opinions, and is frustrated by generic single-score databases.

**Secondary persona:** A casual reader looking for their next read, who wants trustworthy, structured, skimmable recommendations rather than a single number.

### User Stories

**As a reader looking for something to read, I want to:**
- Browse titles that have earned the "Certified Banger" seal, so I can trust I'm looking at vetted quality.
- Filter/sort titles by category (e.g. show me the highest-rated "Art Style" titles).
- Read a short, structured review before committing to a long series.
- See how many users/which users awarded a seal to a title, to gauge consensus vs. one person's taste.

**As a reviewer, I want to:**
- Create an account and build a public profile of my reviews.
- Rate a title across defined categories (Art Style, Character, Plot, Pacing, Uniqueness) on a consistent scale.
- Write a free-text review explaining my rating.
- Optionally award the title a seal, with a required written justification for why it deserves that seal.
- Edit or delete my own reviews.
- See engagement on my reviews (likes/upvotes, comments).

**As a community member, I want to:**
- Upvote/downvote or "helpful"-mark other users' reviews.
- Comment on reviews to discuss or disagree.
- Report inappropriate/spam/troll content.
- Follow reviewers whose taste I trust.

**As a site admin/moderator, I want to:**
- Moderate flagged reviews/comments.
- Manage the canonical title database (merge duplicates, fix metadata, add cover art).
- Configure or adjust seal types and rating categories without a code deploy (ideally data-driven, not hardcoded).

---

## 4. Functional Requirements

### 4.1 Titles (Manga/Manhwa entries)
- A **Title** has: name, alternate/original names, type (manga/manhwa/manhua — extensible enum), author(s)/illustrator(s), status (ongoing/completed/hiatus/dropped), genre tags, cover image, publication year, source links (official reading platforms — NOT hosted content), short synopsis.
- Titles must be de-duplicated (canonical entries; users should not be able to freely create duplicate titles — search-before-create UX, admin merge tooling).
- Titles aggregate: average score per category, seal count, review count, review list.

### 4.2 Reviews
- A **Review** is authored by one user, for one title (one review per user per title — edits replace, not duplicate).
- A Review contains:
  - A numeric or star rating **per category**: Art Style, Character, Plot, Pacing, Uniqueness (v1 fixed category set — see [Section 6](#6-data-model-sketch) for extensibility notes).
  - An overall score, which can be either (a) a separate explicit field, or (b) computed as an average/weighted average of category scores — **decision needed**, see [Open Questions](#7-open-questions-to-resolve-before-build).
  - A free-text written review (min/max length TBD, recommend min ~50 characters to discourage low-effort spam).
  - Optional spoiler flag/section.
- Reviews are versioned or at minimum track `created_at` / `updated_at`.
- Reviews can be upvoted/downvoted or marked "helpful" by other users.
- Reviews can receive comments (flat or threaded — recommend flat for v1 simplicity).

### 4.3 Seals ("Certified Banger")
- A **Seal** is an additional, distinct action separate from rating — a user explicitly awards a title a named seal (default: "Certified Banger"; the system should support multiple seal *types* even in v1, e.g. "Hidden Gem," "Art Masterpiece," even if only one ships at launch, so this isn't hardcoded to one string).
- Awarding a seal **requires** a written justification (distinct field from the general review, or can be the review itself if the user is also reviewing — decision needed).
- A title's seal count and the ratio of seal-awards to total reviews should be visibly surfaced (avoids the seal being diluted/meaningless if everything gets stamped).
- Consider a minimum reputation/review-count threshold before a user can award seals, to prevent brand-new/throwaway accounts from diluting seal credibility (recommended, not mandatory for MVP).

### 4.4 Users & Profiles
- Registration/auth (email+password minimum; social login optional nice-to-have).
- Public profile: username, avatar, bio, list of reviews, seals awarded, join date, basic reputation indicator (e.g. total helpful votes received).
- Follow/unfollow other users (nice-to-have for v1, not core-critical).

### 4.5 Discovery & Browsing
- Search titles by name/tag/genre/author.
- Filter by: genre, status, category score thresholds, seal presence, seal count.
- Sort by: highest overall score, most seals, most recent reviews, most discussed.
- A dedicated "Certified Banger" showcase/landing feed (this is your differentiator — make it prominent).

### 4.6 Moderation
- Report flow for reviews/comments/titles.
- Basic admin panel: view reports, remove content, ban/suspend users, edit title metadata.
- Rate limiting / spam prevention on review and comment creation.

---

## 5. Non-Functional Requirements

- **Responsive web app** — must work well on mobile browsers (this audience browses on phones heavily).
- **Performance:** title pages and browse/search should feel instant; category-based sorting/filtering must be efficient (implies proper indexing, likely a relational DB for structured rating data).
- **Data integrity:** rating categories and seal types should be centrally defined (config/database-driven) rather than duplicated across the codebase, so adding a 6th category or a new seal type later doesn't require touching every file.
- **Extensibility:** the schema for "Title," "Review," and "Category" should be designed so that a future "media type" (e.g. novel, game) can reuse the same Review/Seal/Category structures rather than requiring parallel tables — this is explicitly called out because of the stated long-term multi-media vision.
- **Abuse resistance:** review-bombing, sockpuppet seal-awarding, and spam need at least basic mitigation from day one (rate limits, minimum account age for certain actions, report tooling) — credibility of the seal is the entire product; it must not be easy to game.
- **Content legality:** no hosting of copyrighted manga/manhwa content or scans; only metadata, cover art (used under fair use/promotional norms — verify licensing approach), and links to official sources.
- **Accessibility:** basic a11y (alt text on covers, keyboard navigation, sufficient contrast) — not exhaustive for v1 but shouldn't be ignored.

---

## 6. Data Model Sketch

This is a starting point, not a final schema — refine during implementation.

```
User
 - id, username, email, password_hash, avatar_url, bio, created_at, reputation_score

Title
 - id, name, alt_names[], type (manga | manhwa | manhua), status, author, illustrator,
   genres[], cover_url, synopsis, publication_year, external_links[], created_at

Category            <- data-driven, not hardcoded, to support future media types
 - id, name (Art Style, Character, Plot, Pacing, Uniqueness), applies_to_type,
   scale_min, scale_max

Review
 - id, user_id, title_id, overall_score (nullable if computed), body_text,
   spoiler_flag, created_at, updated_at

ReviewCategoryScore  <- one row per category per review
 - id, review_id, category_id, score

SealType             <- data-driven, e.g. "Certified Banger", "Hidden Gem"
 - id, name, description, icon

SealAward
 - id, user_id, title_id, seal_type_id, justification_text, created_at
   (consider: linked to a review_id, or standalone)

Comment
 - id, user_id, review_id, body_text, created_at

Vote
 - id, user_id, target_type (review | comment), target_id, value (up/down or helpful flag)

Report
 - id, reporter_user_id, target_type, target_id, reason, status, created_at
```

---

## 7. Open Questions (to resolve before/during build)

These are genuine product decisions that should be made deliberately, not defaulted by accident:

1. **Overall score:** Is it a separately entered field, or computed (average/weighted average) from the five category scores? Weighted average lets you tune which categories matter most to the "feel" of the site.
2. **Seal justification vs. review body:** Is awarding a seal a separate action with its own text field, or does it just flag an existing review as seal-worthy? Separate is cleaner conceptually but adds friction; reusing the review is faster but muddies "why I rated it this way" vs. "why it's a banger."
3. **Seal gating:** Should there be a minimum account age, review count, or reputation before a user can award a seal? Recommended yes, but threshold TBD.
4. **One seal per user per title, or can a title accumulate seals from many users freely?** (Recommend: many users *can* award the same seal type to the same title — the seal *count* is the trust signal, similar to Letterboxd's "watched by X" but for curation.)
5. **Anonymous browsing vs. required signup:** Recommend allowing anonymous browsing/reading of reviews, requiring signup only to write/rate/vote — lowers the barrier for new visitors to see value before committing.
6. **Category set fixed or extensible per-title-type in v1?** Even though only manga/manhwa exists in v1, deciding now whether categories are hardcoded to these five or pulled from a `Category` table (as sketched above) will hugely affect how painful the future multi-media expansion is. Recommend building it data-driven from day one even if only 5 rows exist initially — this is cheap now and expensive to retrofit later.

---

## 8. Future Scope (post-v1)

Explicitly deferred, but documented here so early architecture doesn't foreclose them:

- **Multi-media expansion:** generalize "Title" into a polymorphic/typed entity (Title → could be manga, later movie, game, novel, etc.), reusing Review/Category/Seal infrastructure.
- **Token rewards (pump.fun-launched coin):** reward active contributors (reviewers, raters, commenters) with a token for participation. Deferred until core platform has real usage. When implemented, should be treated as a retention/engagement layer on top of an already-working reputation system, not the initial growth driver. Flag for future legal/compliance review (regulatory treatment of reward tokens varies by jurisdiction).
- **Personalized recommendations** based on a user's rating history/taste profile.
- **Native mobile app.**
- **Public API** for the review/seal data (could itself become a valuable dataset for other apps/bots).
- **Reviewer reputation/leveling system** (e.g. "verified critic" status for prolific, high-quality reviewers) — also serves as the natural gate for seal-awarding eligibility mentioned in Open Questions.

---

## 9. Suggested MVP Cut (build order)

If prioritizing a working v1 as fast as possible:

1. Auth + user profiles
2. Title database (manual/admin-seeded initially, no scraping needed for MVP)
3. Review creation with the 5 fixed categories + free text
4. Title pages showing aggregate scores + review list
5. Seal awarding + a dedicated seal showcase page
6. Search/filter/sort on the browse page
7. Voting on reviews + basic comments
8. Basic moderation/reporting tools

Everything in Section 8 comes after this is live and has real users.

---

## 10. Glossary

- **Certified Banger:** The default/flagship seal a user can award to a title, signifying "this deserves special recognition." Backed by a required written justification.
- **Category score:** A per-dimension rating (Art Style, Character, Plot, Pacing, Uniqueness) given as part of a review.
- **Title:** A single manga/manhwa/manhua work in the database (not a chapter or volume — the series/work as a whole).

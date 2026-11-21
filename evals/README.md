# Trigger evals

Does the right skill wake up for the way people really ask, and stay asleep when they ask for something else? These cases are for `claude plugin eval` (Claude Code 2.1.269 or later).

```bash
# from the repo root; one arm (the plugin loaded), the skill graders are real, so no baseline is needed
claude plugin eval . --ablation none --runs 3 -j 4 --max-cost-usd 12 --threshold 0 --no-publish --trust-plugin
# only some cases
claude plugin eval . --ablation none --tag paraphrase --trust-plugin --no-publish
```

A run costs about 0.09 USD and 10 seconds; the full suite (29 cases × 3 runs) about 8-9 USD and 5 minutes. `--no-publish` keeps the report local. Results go to `evals/results/` (ignored by git).

## What is in it

| Group | Cases | Passes when |
|---|---|---|
| Positive, keywords | 13 | one of the right skills is invoked (the orchestrator counts, because it routes to the phase skills) **and**, in a second grader, the most specific skill is the one invoked. English and Vietnamese, one or two prompts per skill |
| Positive, paraphrased | 6 | same, but the prompt never says "admin": "I need a proper back office so my staff can manage orders", "mình muốn nhân viên tự quản lý đơn hàng…" |
| Negative | 10 | none of the seven skills is invoked. Includes near misses the orchestrator says it is not for (a single chart widget, a landing page, a BI report) and neighbours that sound related (Google sign-in, unit tests, an SQL injection review) |

Each case runs in an empty scratch workspace with only the plugin loaded and only the `Skill` tool allowed, so it measures **triggering**, not whether the work that follows is right. The negative graders count only this suite's seven skills on purpose: the environment ships other skills (a charting skill fired, correctly, on the chart request) and that must not count against us.

## Results (v1.6.1, 2026-11-21, default model, 3 runs per case)

- Positive: **54 / 57** runs invoked a right skill, and **54 / 57** invoked exactly the most specific one.
- Negative: **30 / 30** runs left all seven skills alone.
- Known miss: *"How do I let my non-technical team change the texts and banners of my app without calling a developer?"* never invoked a skill (0 / 3). It is a request for advice with no code to look at, and answering directly is defensible; the description was not bent to fit it.
- The paraphrased cases found two real gaps in the first run (a stats page that is "four cards and a table", staff managing things by editing the database); the descriptions of `enterprise-admin-architect` and `admin-ui-audit` were widened and both now fire.

Treat these numbers as a smoke test of the descriptions, not a benchmark: 29 prompts written by the maintainer, one model, one day. Add a case whenever someone reports a request that should have woken a skill and did not (or the reverse).

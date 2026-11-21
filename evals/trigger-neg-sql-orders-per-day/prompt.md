---
name: trigger-neg-sql-orders-per-day
tags: [trigger, negative]
runs: 3
max_turns: 4
timeout_seconds: 180
allowed_tools: [Skill]
---
Write a PostgreSQL query that counts orders per day for the last 30 days.

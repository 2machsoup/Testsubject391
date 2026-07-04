# wow-log-analyzer

Fetches a report from [Warcraft Logs](https://www.warcraftlogs.com), automatically
finds the #1-ranked parse for the same encounter/spec/difficulty, and prints a
report of where the two diverge.

## Setup

1. Register an API client at https://www.warcraftlogs.com/api/clients/ (use the
   `client_credentials` grant type — no user login/redirect needed).
2. Copy `.env.example` to `.env` and fill in `WCL_CLIENT_ID` / `WCL_CLIENT_SECRET`.
3. Install the package (in a virtualenv):

   ```
   pip install -e ".[dev]"
   ```

## Usage

```
wow-logs analyze <report_code> --fight <fight_id> --player <character_name>
```

- `report_code` is the code from a report URL, e.g. for
  `https://www.warcraftlogs.com/reports/AbCdEfGh123456` it's `AbCdEfGh123456`.
- `--fight` is the fight ID within that report (visible in the URL when you click
  into a specific pull, `...&fight=12`).
- `--player` is the character name to analyze.
- `--metric` defaults to `dps`; pass `--metric hps` for healers.

By default the tool looks up the #1 parse for the same class/spec/encounter/difficulty
automatically. To compare against a specific log instead, pass all three:

```
wow-logs analyze <report_code> --fight <fight_id> --player <name> \
  --top-report <other_report_code> --top-fight <other_fight_id> --top-player <other_name>
```

## Web GUI

A local Flask front end is available if you'd rather fill in a form than remember CLI flags.

```
pip install -e ".[dev,web]"
wow-logs serve
```

Then open http://127.0.0.1:5000 in a browser, fill in the report code/fight/player
(and optionally an explicit top-parse override), and submit. Findings are shown as
the same categorized, severity-colored list as the CLI report.

Use `--host`/`--port` to change the bind address, and `--debug` for Flask's
auto-reload during development.

## What it checks

- **Performance** — DPS/HPS percentile and the raw gap vs the top parse's amount.
- **Buff uptime** — self buffs/trinkets/cooldown buffs the top parse keeps up that
  this parse doesn't (only flags buffs the top parse held for a meaningful chunk
  of the fight, to avoid noise from one-off procs).
- **Avoidable damage** — abilities that hit the analyzed player noticeably more
  often than they hit the top parse's player. Without extra config this is a
  heuristic (frequency compared between the two logs); see
  `src/wow_log_analyzer/data/avoidable_abilities.json` to pin down exact
  mechanic ability IDs per encounter for higher-confidence flags.
- **Interrupts** — successful interrupt count vs the top parse.
- **Deaths** — every death, with timestamp and killing blow.
- **Cooldown usage** — major cooldown cast counts vs the top parse, for specs you
  configure in `src/wow_log_analyzer/data/cooldowns.json` (ships empty — spell
  IDs vary by patch/expansion, so add the ones you care about rather than trust
  guessed IDs).

## Notes / limitations

- This targets the Warcraft Logs **v2** GraphQL API. If Warcraft Logs changes
  field names in that schema, the queries in `src/wow_log_analyzer/queries.py`
  are the place to update.
- "Top parse" means the #1 ranked parse for the same encounter, difficulty,
  class, and spec — it is not necessarily on the same difficulty/comp as your
  raid, so treat cooldown/uptime gaps as a starting point for investigation,
  not an absolute target.

## Development

```
pip install -e ".[dev]"
pytest
```

All GraphQL calls are mocked in tests (no network access / API credentials
required to run the test suite).

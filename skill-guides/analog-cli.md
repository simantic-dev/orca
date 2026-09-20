---
name: analog-cli
description: >-
  Simulate and validate KiCad PCBs and firmware with the `analog-cli` simulator from an Orca
  terminal, so every run lands in Orca's Analog sidebar with its verdict, measurements and
  waveforms. Use when the user says "$analog-cli", "simulate the board", "run the testplan",
  "SPICE", "KiCad simulation", "analog-cli test/analyze/simulate", or asks to check a schematic,
  a filter, a rail, a bus, or firmware in simulation. Prefer it over ad hoc ngspice decks when a
  KiCad project or `.sim.toml` plan exists.
---

# analog-cli

`analog-cli` is a SPICE and co-simulation CLI that reads a KiCad project (or a `.cir` deck) and a
`<project>.sim.toml` plan, runs analyses and testplans, and returns machine-readable verdicts.
Orca records every run it makes and shows it in the **Analog** tab of the right sidebar; clicking
a run opens its results (verdict, measurements, findings, waveforms).

## Start here

`analog-cli` below is a placeholder for the executable you resolved in the stub; substitute it before running.

1. Find the binary: `analog-cli --version`. If that fails, try `$ANALOG_CLI`, then
   `~/.simantic/cli/releases/*/analog-cli`. Orca's Settings › Hardware pane names the binary it
   resolved; say so explicitly if none is installed instead of guessing.
2. Run from the directory that holds the project (or pass `-p <dir | file.kicad_pro>`).
3. Ask for machine-readable output on every run you will read back:
   `--format json` (verdict on stdout) and `-o <file>` (the same JSON on disk), plus `--html <file>`
   when a human will look at the charts.

## Commands that matter

```text
analog-cli test -p <project> [--plan FILE] [--only NAME]... --format json -o report.json --html report.html
analog-cli analyze <op|dc-sweep|tran|ac|tf|noise|pz|fourier|erc|drc|netlist-sanity|spice-mappability> -p <project> [--measure "signal=V(OUT) kind=settle_time tolerance=0.02 max=6ms"] --format json -o out.json
analog-cli simulate -p <project> [--tstop 10ms] [--peer none|scripted|firmware] [--firmware-path app.elf] --format json -o sim.json
analog-cli run <deck.cir> --format csv -o <dir>
analog-cli export-netlist -p <project> -o netlist.cir
analog-cli history list --limit 20 --format json
analog-cli history show <id> --format json
```

`-o/--out` is the JSON report file. On `tf` and `noise`, `--output` is the measured output signal, so
never spell the report path as `--output`.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | every selected test ran and passed (skipped / not-implemented do not fail) |
| 1 | a test failed or errored |
| 2 | bad project (missing `.kicad_pro`, root schematic, …) |
| 3 | `kicad-cli` not found |
| 4 | runner failure |
| 6 | invalid plan or usage |

A non-zero exit still writes the report when it got that far; read the report before retrying.

## How Orca sees your runs

Orca presets `ANALOG_CLI_SESSION` and `ANALOG_CLI_SESSION_LOG` in every terminal it opens. analog-cli
stamps the first on each recorded run and appends start/end lines to the second, which is how the
Analog tab attributes a run to this pane and shows it while it is still running. Do not unset or
override them, and never set `ANALOG_CLI_PARENT` (it switches stderr to machine events meant for a
GUI host, which will pollute what you read).

Every `run`, `analyze`, `test` and `simulate` is recorded under the run history
(`analog-cli history path`) with its manifest and one CSV per dataset. To re-read a result later,
use `analog-cli history list --format json` and `analog-cli history show <id> --format json`
rather than re-running the simulation; the datasets' CSV paths are in the manifest.

## Reading verdicts

The JSON report (`analog-cli.test-report/1`) has `summary` (`total`, `passed`, `failed`, `errors`,
`skipped`, `not_implemented`) and `tests[]`, each with `status` (`pass|fail|error|skipped|not_implemented`),
`detail`, `measurements[]` (`name`, `kind`, `signal`, `measured`, `expect {min,max,eq,tol}`, `margin`,
`pass`) and `findings[]` (`kind`, `severity`, `description`, `sheet`). Quote the failing
measurement, its measured value and its bound when you report a failure.

## Testplans

Tests live as `[[test]]` tables in `<project>/<name>.sim.toml` next to `[[sources]]`,
`[[stimulus]]`, `[[parasitics]]`, `[board]` and `[peer]` sections. Without a plan, `test` runs the
built-in static checks (erc, drc, netlist-sanity, spice-mappability). Read the project's existing
plan before adding tests, and keep measurement names stable: Orca charts the signals a test
measured by default.

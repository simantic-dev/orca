import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test, expect } from './helpers/orca-app'
import { getAllWorktreeIds, switchToWorktree } from './helpers/store'

/**
 * Opt-in smoke test for the analog-cli integration and the KiCad viewer. It needs a real analog-cli
 * checkout with a built binary, a KiCad install, and a populated run history, so it only runs when
 * the developer points it at them:
 *
 *   ORCA_ANALOG_SMOKE_PROJECT=/path/to/analog-cli \
 *   ORCA_ANALOG_SMOKE_HISTORY=$HOME/.local/state/analog-cli/history \
 *   SKIP_BUILD=1 npx playwright test --config tests/playwright.config.ts --project=electron-headless \
 *     tests/e2e/analog-kicad-smoke.spec.ts
 */
const PROJECT_REPO = process.env.ORCA_ANALOG_SMOKE_PROJECT ?? ''
const ANALOG_CLI = process.env.ORCA_ANALOG_SMOKE_CLI ?? `${PROJECT_REPO}/target/release/analog-cli`
const HISTORY_ROOT = process.env.ORCA_ANALOG_SMOKE_HISTORY ?? ''
const SHOTS = process.env.ORCA_ANALOG_SMOKE_SHOTS ?? path.join(os.tmpdir(), 'orca-analog-smoke')
const ENV_DUMP = `${SHOTS}/terminal-env.txt`
const REPORT_OUT = path.join(SHOTS, 'smoke-report.json')

test.skip(
  !PROJECT_REPO || !HISTORY_ROOT,
  'set ORCA_ANALOG_SMOKE_PROJECT and ORCA_ANALOG_SMOKE_HISTORY to run'
)
test.use({
  seedTestRepo: false,
  // Why: the harness isolates HOME, which would hide the developer's real run history store.
  orcaAppExtraEnv: { ANALOG_CLI_HISTORY_DIR: HISTORY_ROOT }
})
test.setTimeout(300_000)

test('analog sidebar, run tab and KiCad viewer against the analog-cli workspace', async ({
  orcaPage: page
}) => {
  await page.evaluate(async (repoPath) => {
    const result = await window.api.repos.add({ path: repoPath })
    if ('error' in result) {
      throw new Error(result.error)
    }
  }, PROJECT_REPO)
  await expect
    .poll(
      async () => {
        await page.evaluate(() => window.__store?.getState().fetchRepos())
        return (await getAllWorktreeIds(page)).length
      },
      { timeout: 60_000 }
    )
    .toBeGreaterThan(0)
  const worktreeId =
    (await getAllWorktreeIds(page)).find((id) => id.includes('analog-cli')) ??
    (await getAllWorktreeIds(page))[0]
  await switchToWorktree(page, worktreeId)
  await page.evaluate(
    async ({ analogCliPath }) => {
      await window.__store?.getState().updateSettings({ analogCliPath })
    },
    { analogCliPath: ANALOG_CLI }
  )

  // Terminal env attribution: a fresh terminal must carry both analog-cli variables.
  mkdirSync(SHOTS, { recursive: true })
  if (existsSync(ENV_DUMP)) {
    rmSync(ENV_DUMP)
  }
  await page.evaluate(
    ({ worktreeId, envDump }) => {
      const store = window.__store!.getState()
      const tab = store.createTab(worktreeId)
      store.queueTabStartupCommand(tab.id, { command: `env | grep ANALOG_CLI_ > '${envDump}'` })
      store.setActiveTabType('terminal')
    },
    { worktreeId, envDump: ENV_DUMP }
  )
  await expect
    .poll(() => (existsSync(ENV_DUMP) ? readFileSync(ENV_DUMP, 'utf8') : ''), { timeout: 60_000 })
    .toContain('ANALOG_CLI_SESSION_LOG=')
  expect(readFileSync(ENV_DUMP, 'utf8')).toMatch(/ANALOG_CLI_SESSION=[A-Za-z0-9._-]{1,64}\n/)

  // Analog sidebar tab lists the recorded runs.
  await page.evaluate(() => {
    const store = window.__store!.getState()
    store.setRightSidebarOpen(true)
    store.setRightSidebarTab('analog')
  })
  const runRow = page
    .getByRole('button', { name: /test · f401_i2c_dac_pcb|analyze|simulate|run ·/ })
    .first()
  await expect(runRow).toBeVisible({ timeout: 60_000 })
  await page.screenshot({ path: `${SHOTS}/01-analog-panel.png` })

  // A run made from an Orca terminal shows up live, attributed to that pane.
  const rowsBefore = await page.getByRole('button', { name: /passed|failed|exit /i }).count()
  await page.evaluate(
    ({ worktreeId, analogCliPath, reportOut }) => {
      const store = window.__store!.getState()
      const tab = store.createTab(worktreeId)
      store.queueTabStartupCommand(tab.id, {
        command: `'${analogCliPath}' test -p boards/f401_i2c_dac_pcb --model-path models --plan boards/f401_i2c_dac_pcb/filter.sim.toml --format json -o '${reportOut}'`
      })
      store.setActiveTabType('terminal')
    },
    { worktreeId, analogCliPath: ANALOG_CLI, reportOut: REPORT_OUT }
  )
  await expect
    .poll(() => page.getByRole('button', { name: /passed|failed|exit /i }).count(), {
      timeout: 120_000
    })
    .toBeGreaterThan(rowsBefore)
  await page.screenshot({ path: `${SHOTS}/01b-analog-panel-live-run.png` })

  // Clicking a run opens the results tab with summary and charts.
  await runRow.click()
  await expect(page.getByRole('tab', { name: 'Summary' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/Measurement/).first()).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${SHOTS}/02-run-summary.png` })
  await page.getByRole('tab', { name: 'Datasets' }).click()
  await expect(page.locator('.analog-uplot .u-wrap').first()).toBeVisible({ timeout: 60_000 })
  await page.screenshot({ path: `${SHOTS}/03-run-datasets.png` })

  // "+" menu → View KiCad Project… → picker → schematic.
  await page.getByRole('button', { name: 'New tab' }).first().click()
  await page.getByRole('menuitem', { name: /View KiCad Project/ }).click()
  const picker = page.getByRole('dialog', { name: /View KiCad Project/ })
  await expect(picker).toBeVisible({ timeout: 30_000 })
  await picker.getByText('boards/f401_i2c_dac_pcb', { exact: true }).click()
  const svgSurface = page.getByTestId('kicad-svg-surface')
  await expect(svgSurface).toBeVisible({ timeout: 120_000 })
  await expect(svgSurface.locator('svg').first()).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${SHOTS}/04-kicad-schematic.png` })

  await page.getByRole('radio', { name: 'PCB' }).click()
  await expect(page.getByRole('radio', { name: 'Front' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('kicad-svg-surface').locator('svg').first()).toBeVisible({
    timeout: 120_000
  })
  await page.screenshot({ path: `${SHOTS}/05-kicad-pcb.png` })

  await page.getByRole('radio', { name: '3D' }).click()
  await expect(page.getByTestId('kicad-3d-canvas')).toBeVisible({ timeout: 30_000 })
  await expect(
    page.getByText(/Exporting the 3D model|Loading .* model|Building the scene/)
  ).toBeHidden({ timeout: 240_000 })
  await page.screenshot({ path: `${SHOTS}/06-kicad-3d.png` })
})

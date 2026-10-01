// Contract registry checks (docs/agent/contracts.md).
//
// A contract document is prose for people plus machine-readable blocks that the
// project's contract tests compare with the running code:
//
//   > contract_id: `HOST.SNAPSHOT.V1` · status: `CONTRACT`
//   <!-- contract:snapshot-keys -->
//   ```json
//   ["actions", "activity", ...]
//   ```
//
// This script checks the registry's structure; whether the blocks match the
// code is the job of the project's contract tests.
import fs from 'node:fs'
import path from 'node:path'
import { finish, isMain, repoRoot, result } from './lib/common.mjs'
import { loadConfig } from './lib/config.mjs'

export const STATUSES = ['CONTRACT', 'CURRENT', 'GAP', 'BLOCKED', 'TARGET_PENDING', 'RETIRED']
/** Every contract document carries these sections (heading keywords). */
export const REQUIRED_SECTIONS = ['Ownership', 'Fields', 'Invariants', 'Change', 'Verification']

export function contractHeader(text) {
  const m = /^>\s*contract_id:\s*`([^`]+)`\s*·\s*status:\s*`([^`]+)`/m.exec(text)
  return m ? { id: m[1], status: m[2] } : null
}

/** All `<!-- contract:name -->` + fenced json blocks, parsed. Throws on bad JSON. */
export function extractBlocks(text) {
  const blocks = {}
  const re = /<!--\s*contract:([a-z0-9-]+)\s*-->\s*\n```json\n([\s\S]*?)\n```/g
  let m
  while ((m = re.exec(text)) !== null) {
    if (Object.hasOwn(blocks, m[1])) throw new Error(`duplicate contract block ${m[1]}`)
    try { blocks[m[1]] = JSON.parse(m[2]) } catch (e) { throw new Error(`contract block ${m[1]} is not JSON: ${e.message}`) }
  }
  return blocks
}

export function readBlocks(root, doc) {
  return extractBlocks(fs.readFileSync(path.join(root, doc), 'utf8'))
}

/** Registry table rows: | `ID` | object | [doc](path) | status | */
export function registryRows(text) {
  const rows = []
  for (const line of text.split('\n')) {
    const m = /^\|\s*`([A-Z][A-Z0-9_.]*\.V\d+)`\s*\|.*\]\(([^)]+)\)\s*\|\s*`?([A-Z_]+)`?\s*\|/.exec(line)
    if (m) rows.push({ id: m[1], doc: m[2], status: m[3] })
  }
  return rows
}

export function checkContracts(root, cfg) {
  const issues = []
  const contracts = cfg?.gates?.contracts
  if (!contracts) return { issues, contracts: [] }
  const registryPath = path.join(root, contracts.registry)
  let registry = ''
  try { registry = fs.readFileSync(registryPath, 'utf8') } catch { return { issues: [`registry missing: ${contracts.registry}`], contracts: [] } }
  const rows = registryRows(registry)
  const seen = new Set()
  const summary = []
  for (const row of rows) {
    if (seen.has(row.id)) issues.push(`registry lists ${row.id} twice`)
    seen.add(row.id)
    if (!STATUSES.includes(row.status)) issues.push(`${row.id}: unknown status ${row.status}`)
    const doc = path.posix.normalize(path.posix.join(path.posix.dirname(contracts.registry), row.doc))
    let text
    try { text = fs.readFileSync(path.join(root, doc), 'utf8') } catch { issues.push(`${row.id}: document missing ${doc}`); continue }
    const header = contractHeader(text)
    if (!header) issues.push(`${doc}: missing "> contract_id: \`ID\` · status: \`STATUS\`" header`)
    else {
      if (header.id !== row.id) issues.push(`${doc}: header id ${header.id} differs from registry ${row.id}`)
      if (header.status !== row.status) issues.push(`${doc}: header status ${header.status} differs from registry ${row.status}`)
    }
    const headings = text.split('\n').filter((l) => /^##\s/.test(l)).join('\n')
    for (const section of REQUIRED_SECTIONS) {
      if (!new RegExp(`^##\\s.*${section}`, 'm').test(headings)) issues.push(`${doc}: missing a "## … ${section}" section`)
    }
    let blocks = {}
    try { blocks = extractBlocks(text) } catch (e) { issues.push(`${doc}: ${e.message}`) }
    summary.push({ id: row.id, doc, status: row.status, blocks: Object.keys(blocks) })
  }
  for (const rule of contracts.rules ?? []) {
    const row = rows.find((r) => r.id === rule.id)
    if (!row) { issues.push(`config rule ${rule.id} is not in the registry`); continue }
    const doc = path.posix.normalize(path.posix.join(path.posix.dirname(contracts.registry), row.doc))
    if (doc !== rule.doc) issues.push(`config rule ${rule.id} points at ${rule.doc}, registry at ${doc}`)
  }
  return { issues, contracts: summary }
}

if (isMain(process.argv[1], import.meta.url)) {
  const root = repoRoot()
  const { cfg, issues: configIssues } = loadConfig(root)
  const { issues, contracts } = cfg ? checkContracts(root, cfg) : { issues: [], contracts: [] }
  const all = [...configIssues, ...issues]
  finish(all.length
    ? result('error', `contract registry: ${all.length} issue(s)`, ['fix the registry/documents, then rerun'], { issues: all, contracts })
    : result('success', `contract registry consistent (${contracts.length} contract(s))`, [], { contracts }))
}

// Integration gates: pure functions over a list of incoming paths (and commit
// subjects), driven by harness.config.json. Each returns { error, artifacts }.
// They are mechanical: passing a gate proves the evidence exists or an
// exemption was recorded, never that the evidence is semantically correct.
import { matches, matchesAny } from './lib/config.mjs'

const clean = (reason) => (typeof reason === 'string' ? reason.trim() : '')

/** Design gate: UI-surface changes need a design handoff or a recorded exemption. */
export function designGate(incoming, design, { handoff = null, handoffInTree = false, exempt = null } = {}) {
  const artifacts = { required: false, ui_paths: [], handoff_paths: [], declared_handoff: handoff, exempt_reason: clean(exempt) || null, mode: 'not_configured' }
  if (!design) return { error: null, artifacts }
  artifacts.ui_paths = incoming.filter((p) => matchesAny(design.ui_paths, p) && !matchesAny(design.exclude, p)).sort()
  artifacts.handoff_paths = incoming.filter((p) => matches(design.handoff_glob, p)).sort()
  artifacts.required = artifacts.ui_paths.length > 0
  if (!artifacts.required) { artifacts.mode = 'not_required'; return { error: null, artifacts } }
  if (artifacts.handoff_paths.length) { artifacts.mode = 'handoff_in_diff'; return { error: null, artifacts } }
  if (handoff) {
    if (!matches(design.handoff_glob, handoff)) {
      artifacts.mode = 'missing'
      return { error: `--design-handoff must match ${design.handoff_glob}: ${handoff}`, artifacts }
    }
    if (handoffInTree) { artifacts.mode = 'handoff_declared'; return { error: null, artifacts } }
    artifacts.mode = 'missing'
    return { error: `--design-handoff ${handoff} is not in the feature branch tree`, artifacts }
  }
  if (artifacts.exempt_reason) { artifacts.mode = 'exempt'; return { error: null, artifacts } }
  artifacts.mode = 'missing'
  const preview = artifacts.ui_paths.slice(0, 5).join(', ') + (artifacts.ui_paths.length > 5 ? '…' : '')
  return {
    error: `UI-surface changes lack design evidence (docs/agent/design.md): ${preview}; add a ${design.handoff_glob} ` +
      'in this branch, point --design-handoff at an existing one, or record --design-exempt "<reason>"',
    artifacts,
  }
}

/**
 * Contract gate: changing a contract's trigger files requires updating that
 * contract's document in the same diff, or an explicit --contract-exempt reason
 * (e.g. "refactor, no field/rule/format change"). A design handoff that changes
 * a surface also counts as touching HOST.SNAPSHOT-style contracts only through
 * their own triggers; there is no implicit coupling.
 */
export function contractGate(incoming, contracts, { exempt = null } = {}) {
  const reason = clean(exempt)
  const artifacts = { rules: [], exempt_reason: reason || null, mode: 'not_configured' }
  if (!contracts) return { error: null, artifacts }
  const unmet = []
  for (const rule of contracts.rules ?? []) {
    const touched = incoming.filter((p) => matchesAny(rule.triggers, p)).sort()
    if (!touched.length) continue
    const docInDiff = incoming.includes(rule.doc)
    artifacts.rules.push({ id: rule.id, doc: rule.doc, touched, doc_in_diff: docInDiff })
    if (!docInDiff) unmet.push(rule)
  }
  if (!artifacts.rules.length) { artifacts.mode = 'not_required'; return { error: null, artifacts } }
  if (!unmet.length) { artifacts.mode = 'contract_in_diff'; return { error: null, artifacts } }
  if (reason) { artifacts.mode = 'exempt'; return { error: null, artifacts } }
  artifacts.mode = 'missing'
  return {
    error: 'contract trigger files changed without their contract document (docs/agent/contracts.md): ' +
      unmet.map((r) => `${r.id} → ${r.doc}`).join('; ') +
      '; update the document in this branch or record --contract-exempt "<why no field/rule/format changed>"',
    artifacts,
  }
}

/** Docs-sync gate: files in one group (e.g. trilingual READMEs) change together. */
export function docsSyncGate(incoming, docsSync, { exempt = null } = {}) {
  const reason = clean(exempt)
  const artifacts = { groups: [], exempt_reason: reason || null, mode: 'not_configured' }
  if (!docsSync) return { error: null, artifacts }
  const partial = []
  for (const group of docsSync.groups ?? []) {
    const changed = group.paths.filter((p) => incoming.includes(p))
    if (!changed.length) continue
    const missing = group.paths.filter((p) => !changed.includes(p))
    artifacts.groups.push({ name: group.name, changed, missing })
    if (missing.length) partial.push(`${group.name}: missing ${missing.join(', ')}`)
  }
  if (!artifacts.groups.length) { artifacts.mode = 'not_required'; return { error: null, artifacts } }
  if (!partial.length) { artifacts.mode = 'synced'; return { error: null, artifacts } }
  if (reason) { artifacts.mode = 'exempt'; return { error: null, artifacts } }
  artifacts.mode = 'missing'
  return { error: `docs that change together changed alone (${partial.join('; ')}); update every language or record --docs-sync-exempt "<reason>"`, artifacts }
}

/** Every incoming commit subject carries the session number. */
export function commitPrefixGate(subjects, pattern) {
  const artifacts = { pattern: pattern ?? null, offending: [] }
  if (!pattern) return { error: null, artifacts }
  const re = new RegExp(pattern)
  // Merge commits made by the harness itself also carry a prefix; a bare
  // "Merge branch" from a sync is tolerated so integrating main is never blocked.
  artifacts.offending = subjects.filter((s) => !re.test(s) && !/^Merge (branch|remote-tracking branch) /.test(s))
  if (!artifacts.offending.length) return { error: null, artifacts }
  return { error: `commits without a session-number prefix: ${artifacts.offending.slice(0, 5).join(' | ')}`, artifacts }
}

/** Is a directory/file path pair overlapping (same path or one contains the other)? */
export function pathsOverlap(a, b) {
  const x = a.replace(/\/+$/, '')
  const y = b.replace(/\/+$/, '')
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`)
}

/** Tests to run for a set of changed paths, from the config impact map. */
export function selectTests(changed, impact) {
  const tests = new Set()
  const unmapped = []
  for (const file of changed) {
    let hit = false
    for (const rule of impact ?? []) {
      if (!matchesAny(rule.paths, file)) continue
      hit = true
      for (const t of rule.tests) tests.add(t === '$self' ? file : t)
    }
    if (!hit) unmapped.push(file)
  }
  return { tests: [...tests].sort(), unmapped: unmapped.sort() }
}

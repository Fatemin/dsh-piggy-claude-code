// harness.config.json: every project-specific fact the generic harness needs.
// Porting the harness to another project means rewriting this file, not the scripts.
import fs from 'node:fs'
import path from 'node:path'

export const CONFIG_FILE = 'harness.config.json'

/** Minimal glob: `**` spans directories, `*` and `?` stay inside one segment. */
export function globToRegExp(pattern) {
  let re = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '*' && pattern[i + 1] === '*') {
      if (pattern[i + 2] === '/') { re += '(?:.*/)?'; i += 2 } else { re += '.*'; i += 1 }
    } else if (c === '*') re += '[^/]*'
    else if (c === '?') re += '[^/]'
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

const cache = new Map()
export function matches(pattern, file) {
  if (!cache.has(pattern)) cache.set(pattern, globToRegExp(pattern))
  return cache.get(pattern).test(file.replace(/\\/g, '/'))
}
export const matchesAny = (patterns, file) => (patterns ?? []).some((p) => matches(p, file))

function isStringArray(value) {
  return Array.isArray(value) && value.every((v) => typeof v === 'string' && v !== '')
}

function checkRegExp(issues, where, source) {
  try { new RegExp(source) } catch (e) { issues.push(`${where}: invalid regular expression (${e.message})`) }
}

/** Structural validation. Returns a list of issues; empty means usable. */
export function validateConfig(cfg, root = null) {
  const issues = []
  const exists = (p) => root === null || fs.existsSync(path.join(root, p))
  if (cfg === null || typeof cfg !== 'object') return ['config is not an object']
  if (cfg.schema_version !== 1) issues.push('schema_version must be 1')
  for (const key of ['project', 'main_branch', 'remote']) {
    if (typeof cfg[key] !== 'string' || cfg[key] === '') issues.push(`${key} must be a non-empty string`)
  }
  const sn = cfg.session_numbering
  if (sn) {
    if (sn.commit_prefix) checkRegExp(issues, 'session_numbering.commit_prefix', sn.commit_prefix)
    if (sn.branch_prefix) checkRegExp(issues, 'session_numbering.branch_prefix', sn.branch_prefix)
  }
  if (!isStringArray(cfg.entry_docs)) issues.push('entry_docs must be a list of paths')
  else for (const doc of cfg.entry_docs) if (!exists(doc)) issues.push(`entry_docs: missing ${doc}`)
  const t = cfg.tests
  if (!t || typeof t.dir !== 'string' || typeof t.suffix !== 'string' || !isStringArray(t.targeted) || !isStringArray(t.full)) {
    issues.push('tests needs dir, suffix, targeted[] and full[]')
  }
  if (!Array.isArray(cfg.impact)) issues.push('impact must be a list')
  else cfg.impact.forEach((rule, i) => {
    if (!isStringArray(rule.paths) || !isStringArray(rule.tests)) issues.push(`impact[${i}] needs paths[] and tests[]`)
    else for (const test of rule.tests) if (test !== '$self' && !exists(test)) issues.push(`impact[${i}]: missing test ${test}`)
  })
  const g = cfg.gates ?? {}
  if (g.design && (!isStringArray(g.design.ui_paths) || typeof g.design.handoff_glob !== 'string')) {
    issues.push('gates.design needs ui_paths[] and handoff_glob')
  }
  if (g.contracts) {
    if (typeof g.contracts.registry !== 'string') issues.push('gates.contracts.registry must be a path')
    else if (!exists(g.contracts.registry)) issues.push(`gates.contracts.registry missing: ${g.contracts.registry}`)
    const ids = new Set()
    for (const [i, rule] of (g.contracts.rules ?? []).entries()) {
      if (typeof rule.id !== 'string' || !/^[A-Z][A-Z0-9_]*(\.[A-Z0-9_]+)*\.V\d+$/.test(rule.id)) issues.push(`gates.contracts.rules[${i}].id must look like DOMAIN.OBJECT.V1`)
      if (ids.has(rule.id)) issues.push(`gates.contracts.rules: duplicate id ${rule.id}`)
      ids.add(rule.id)
      if (typeof rule.doc !== 'string') issues.push(`gates.contracts.rules[${i}].doc must be a path`)
      else if (!exists(rule.doc)) issues.push(`gates.contracts.rules[${i}]: missing doc ${rule.doc}`)
      if (!isStringArray(rule.triggers)) issues.push(`gates.contracts.rules[${i}].triggers must be a list`)
    }
  }
  if (g.docs_sync) {
    for (const [i, group] of (g.docs_sync.groups ?? []).entries()) {
      if (!isStringArray(group.paths) || group.paths.length < 2) issues.push(`gates.docs_sync.groups[${i}] needs at least two paths`)
    }
  }
  const r = cfg.release
  if (r) {
    if (typeof r.version_file !== 'string' || typeof r.changelog !== 'string' || typeof r.tag_prefix !== 'string') {
      issues.push('release needs version_file, changelog and tag_prefix')
    }
    if (typeof r.changelog_heading !== 'string' || !r.changelog_heading.includes('(?<version>')) {
      issues.push('release.changelog_heading must capture (?<version>...)')
    } else checkRegExp(issues, 'release.changelog_heading', r.changelog_heading)
  }
  const restart = cfg.post_integrate?.restart
  if (restart && (!isStringArray(restart.command) || typeof restart.cwd !== 'string')) {
    issues.push('post_integrate.restart needs cwd and command[]')
  }
  return issues
}

export function loadConfig(root) {
  const file = path.join(root, CONFIG_FILE)
  let cfg
  try {
    cfg = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    return { cfg: null, issues: [`${CONFIG_FILE} unreadable: ${e.message}`] }
  }
  return { cfg, issues: validateConfig(cfg, root) }
}

/** Load or throw: scripts that act on the repository refuse an invalid config. */
export function requireConfig(root) {
  const { cfg, issues } = loadConfig(root)
  if (issues.length) throw new Error(`${CONFIG_FILE} invalid: ${issues.join('; ')}`)
  return cfg
}

// Every animation the pig shows — the sprite poses, the decorations dressed
// onto them and the desktop client's own CSS — read statically for the ways a
// loop visibly stutters or silently breaks:
//
//   seam      a looping animation must end where it starts, or every restart
//             snaps back. Exempt: alternate direction, steps() (discrete by
//             design), hidden at both ends (opacity 0 or outside the view), a
//             repeating pattern that slides whole periods, a dash pattern that
//             flows whole periods, and a line drawn on that holds before it
//             starts over (its dash must cover the whole line).
//   speed     a loop that only keeps going one way (a full turn, a slide)
//             runs linear, or it slows to a stop at every restart.
//   pivot     rotate / scale / skew needs a transform-origin; an SVG element
//             otherwise turns about the canvas corner.
//   override  a CSS transform replaces an element's transform attribute, so
//             the two never share an element.
//   wiring    names resolve, animated classes exist, one element has one
//             animator, and every animated file can be switched off for
//             prefers-reduced-motion.
//
// The parser below covers what tools/build-sprites.mjs and client.js write. A
// construct it does not know fails loudly instead of passing unchecked.

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { dress } from '../art.js'
import { WEARABLES } from '../data.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const ASSETS = join(ROOT, 'assets')
const read = name => readFileSync(join(ASSETS, `${name}.svg`), 'utf8')
const svgs = readdirSync(ASSETS).filter(name => name.endsWith('.svg')).map(name => name.slice(0, -4)).sort()
const poses = svgs.filter(name => !name.startsWith('wear-'))
const wears = WEARABLES.map(item => ({ key: item.key, svg: read(`wear-${item.key}`) }))

// ---------------------------------------------------------------------------
// CSS: rules, keyframes and the animations they start
// ---------------------------------------------------------------------------

/** Index of the brace closing the one opened just before `from`. */
function closing(text, from) {
  let depth = 1
  for (let i = from; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}' && --depth === 0) return i
  }
  throw new Error(`unbalanced braces after: ${text.slice(from - 40, from)}`)
}

function declarations(body) {
  const decls = new Map()
  for (const part of body.split(';')) {
    const colon = part.indexOf(':')
    if (colon < 0) continue
    decls.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim().replace(/\s*!important$/, ''))
  }
  return decls
}

/** `{ rules: [{selector, decls}], keyframes: Map<name, [{at, decls}]>, reducedMotion }` */
function parseCss(text) {
  const sheet = { rules: [], keyframes: new Map(), reducedMotion: false }
  const walk = css => {
    let i = 0
    while (i < css.length) {
      const open = css.indexOf('{', i)
      if (open < 0) break
      const prelude = css.slice(i, open).trim()
      const end = closing(css, open + 1)
      const body = css.slice(open + 1, end)
      if (prelude.startsWith('@keyframes')) {
        const frames = []
        for (let j = 0; j < body.length;) {
          const o = body.indexOf('{', j)
          if (o < 0) break
          const e = closing(body, o + 1)
          const at = body.slice(j, o).split(',').map(s => s.trim()).map(s => s === 'from' ? 0 : s === 'to' ? 100 : Number.parseFloat(s))
          frames.push({ at, decls: declarations(body.slice(o + 1, e)) })
          j = e + 1
        }
        sheet.keyframes.set(prelude.slice('@keyframes'.length).trim(), frames)
      } else if (prelude.startsWith('@media')) {
        if (prelude.includes('prefers-reduced-motion')) sheet.reducedMotion = /animation:\s*none/.test(body)
        else walk(body)
      } else {
        sheet.rules.push({ selector: prelude, decls: declarations(body) })
      }
      i = end + 1
    }
  }
  walk(text.replace(/\/\*[\s\S]*?\*\//g, ''))
  return sheet
}

/** Split on spaces / commas that are not inside parentheses. */
function split(value, sep) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of value) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (depth === 0 && sep.test(ch)) {
      if (cur.trim() !== '') out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim() !== '') out.push(cur.trim())
  return out
}

const TIMING = /^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|steps\(.*\)|cubic-bezier\(.*\)|var\(.*\))$/
const seconds = token => token.endsWith('ms') ? Number.parseFloat(token) / 1000 : Number.parseFloat(token)

function shorthand(value) {
  const parts = split(value, /,/)
  assert.equal(parts.length, 1, `one animation per rule: ${value}`)
  const anim = { name: 'none', duration: 0, delay: 0, timing: 'ease', iterations: 1, direction: 'normal' }
  let times = 0
  for (const token of split(parts[0], /\s/)) {
    if (/^-?[\d.]+m?s$/.test(token)) times++ === 0 ? (anim.duration = seconds(token)) : (anim.delay = seconds(token))
    else if (TIMING.test(token)) anim.timing = token
    else if (token === 'infinite' || /^[\d.]+$/.test(token)) anim.iterations = token === 'infinite' ? Infinity : Number(token)
    else if (/^(normal|reverse|alternate|alternate-reverse)$/.test(token)) anim.direction = token
    else if (/^(none|forwards|backwards|both|running|paused)$/.test(token) && anim.name !== 'none') continue
    else if (/^(forwards|backwards|both|running|paused)$/.test(token)) continue
    else anim.name = token
  }
  return anim
}

const LONGHAND = {
  'animation-name': (a, v) => { a.name = v },
  'animation-duration': (a, v) => { a.duration = seconds(v) },
  'animation-delay': (a, v) => { a.delay = seconds(v) },
  'animation-timing-function': (a, v) => { a.timing = v },
  'animation-iteration-count': (a, v) => { a.iterations = v === 'infinite' ? Infinity : Number(v) },
  'animation-direction': (a, v) => { a.direction = v },
}

/**
 * The animation each selector ends up with, cascading shorthand then
 * longhands in source order, plus its transform-origin.
 */
function animations(sheet, base = new Map()) {
  const out = new Map()
  for (const { selector, decls } of sheet.rules) {
    for (const [prop, value] of decls) {
      if (prop === 'animation') out.set(selector, { ...shorthand(value), origin: out.get(selector)?.origin })
      else if (prop in LONGHAND) {
        const anim = out.get(selector) ?? { ...(base.get(selector) ?? shorthand('none')) }
        LONGHAND[prop](anim, value)
        out.set(selector, anim)
      }
    }
  }
  for (const { selector, decls } of sheet.rules) {
    if (decls.has('transform-origin') && out.has(selector)) out.get(selector).origin = decls.get('transform-origin')
  }
  return out
}

// ---------------------------------------------------------------------------
// Values at the seam
// ---------------------------------------------------------------------------

const ANGLE = { deg: 1, turn: 360, rad: 180 / Math.PI, grad: 0.9, '': 1 }

/** A 2D transform as a matrix [a b c d e f], or null if it is not plain numbers. */
function matrix(value) {
  let m = [1, 0, 0, 1, 0, 0]
  const mul = ([a, b, c, d, e, f]) => {
    const [A, B, C, D, E, F] = m
    m = [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E, B * e + D * f + F]
  }
  if (value === 'none') return m
  const fns = [...value.matchAll(/([a-zA-Z]+)\(([^)]*)\)/g)]
  if (fns.map(f => f[0]).join('').replace(/\s/g, '') !== value.replace(/\s/g, '')) return null
  for (const [, fn, raw] of fns) {
    const args = raw.split(/[\s,]+/).filter(Boolean)
    const len = arg => /^-?[\d.]+(px)?$/.test(arg) ? Number.parseFloat(arg) : NaN
    const ang = arg => {
      const [, n, unit] = /^(-?[\d.]+)([a-z]*)$/.exec(arg) ?? []
      return n === undefined || !(unit in ANGLE) ? NaN : Number(n) * ANGLE[unit] * Math.PI / 180
    }
    let step
    if (fn === 'translate') step = [1, 0, 0, 1, len(args[0]), len(args[1] ?? '0')]
    else if (fn === 'translateX') step = [1, 0, 0, 1, len(args[0]), 0]
    else if (fn === 'translateY') step = [1, 0, 0, 1, 0, len(args[0])]
    else if (fn === 'scale') step = [Number(args[0]), 0, 0, Number(args[1] ?? args[0]), 0, 0]
    else if (fn === 'scaleX') step = [Number(args[0]), 0, 0, 1, 0, 0]
    else if (fn === 'scaleY') step = [1, 0, 0, Number(args[0]), 0, 0]
    else if (fn === 'rotate') { const t = ang(args[0]); step = [Math.cos(t), Math.sin(t), -Math.sin(t), Math.cos(t), 0, 0] }
    else if (fn === 'skewX') step = [1, 0, Math.tan(ang(args[0])), 1, 0, 0]
    else if (fn === 'skewY') step = [1, Math.tan(ang(args[0])), 0, 1, 0, 0]
    else return null
    if (step.some(Number.isNaN)) return null
    mul(step)
  }
  return m
}

const near = (x, y) => Math.abs(x - y) < 1e-6
const sameMatrix = (m, n) => m.every((v, i) => near(v, n[i]))
const normal = value => value.replace(/\s+/g, ' ').replace(/(^|[\s(,])0(px|deg)\b/g, '$10').trim()
const NEUTRAL = { transform: 'none', opacity: '1' }

/** The value of `prop` at an offset, or undefined when the element's own value shows. */
function valueAt(frames, prop, at) {
  for (const frame of frames.toReversed()) if (frame.at.includes(at) && frame.decls.has(prop)) return frame.decls.get(prop)
  return undefined
}

/**
 * How the last frame of `frames` meets the first. `ends`: each property's
 * [first, last] value (undefined: the element's own); `diff`: the properties
 * that do not meet; `turns`: they meet only after a full rotation; `shift`:
 * the transforms differ by a pure translation [dx, dy].
 */
function seam(frames) {
  const props = new Set(frames.flatMap(frame => [...frame.decls.keys()]))
  const result = { ends: new Map(), diff: [], turns: false, shift: null }
  for (const prop of props) {
    const first = valueAt(frames, prop, 0) ?? NEUTRAL[prop]
    const last = valueAt(frames, prop, 100) ?? NEUTRAL[prop]
    result.ends.set(prop, [first, last])
    if (first !== undefined && last !== undefined && normal(first) === normal(last)) continue
    if (prop === 'opacity' && first !== undefined && last !== undefined && Number(first) === Number(last)) continue
    if (prop === 'transform' && first !== undefined && last !== undefined) {
      const m = matrix(first)
      const n = matrix(last)
      if (m !== null && n !== null && sameMatrix(m, n)) { result.turns = true; continue }
      if (m !== null && n !== null && sameMatrix(m.slice(0, 4), n.slice(0, 4))) result.shift = [n[4] - m[4], n[5] - m[5]]
    }
    result.diff.push(prop)
  }
  return result
}

const describe = (s, props = s.diff) => props.map(prop => `${prop}: ${s.ends.get(prop)[0] ?? '(own)'} → ${s.ends.get(prop)[1] ?? '(own)'}`).join('; ')
const faded = (s, end) => Number(s.ends.get('opacity')?.[end]) === 0

/** Keyframes that only set their two ends: one motion that keeps going. */
const oneWay = frames => frames.every(frame => frame.at.every(at => at === 0 || at === 100))

/** Whether the value at 100% is already reached earlier, so the loop rests before restarting. */
function holdsEnd(frames, prop) {
  const last = valueAt(frames, prop, 100)
  return frames.some(frame => frame.decls.get(prop) === last && frame.at.some(at => at < 100))
}

/** Whether the keyframes ever rotate, scale or skew (and so need a pivot). */
function needsPivot(frames) {
  return frames.some(({ decls }) => {
    const value = decls.get('transform')
    if (value === undefined) return false
    const m = matrix(value)
    return m === null ? /rotate|scale|skew/.test(value) : !sameMatrix(m.slice(0, 4), [1, 0, 0, 1])
  })
}

// ---------------------------------------------------------------------------
// SVG: a small tree, enough for class lookups and attributes
// ---------------------------------------------------------------------------

function parseSvg(svg) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null }
  let node = root
  let styles = ''
  for (const [whole, close, tag, rawAttrs, selfClose] of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g)) {
    if (close) { node = node.parent; continue }
    const attrs = Object.fromEntries([...rawAttrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]))
    const child = { tag, attrs, children: [], parent: node }
    node.children.push(child)
    if (tag === 'style') {
      const start = svg.indexOf(whole) + whole.length
      styles += svg.slice(start, svg.indexOf('</style>', start)) + '\n'
    }
    if (!selfClose) node = child
  }
  assert.equal(node, root, 'balanced tags')
  return { root: root.children[0], styles }
}

function* nodes(node) {
  yield node
  for (const child of node.children) yield* nodes(child)
}

const classes = node => (node.attrs.class ?? '').split(/\s+/).filter(Boolean)
const inherited = (node, attr) => node === null ? undefined : node.attrs[attr] ?? inherited(node.parent, attr)
const strokeWidth = node => Number(inherited(node, 'stroke-width') ?? 1)
const viewBox = svg => svg.root.attrs.viewBox.split(/[\s,]+/).map(Number)

const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }

/**
 * A path's subpaths, each with its length (NaN when it holds an arc) and the
 * points that bound it (end and control points; arcs padded by their radii).
 */
function pathGeometry(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  const subpaths = []
  let sub = null
  let x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, prev = ''
  const curve = pts => {
    // Sampled Bézier length: plenty for "does the dash cover the line".
    let length = 0
    let [px, py] = pts[0]
    for (let i = 1; i <= 32; i++) {
      const t = i / 32
      const at = k => pts.length === 3
        ? (1 - t) ** 2 * pts[0][k] + 2 * (1 - t) * t * pts[1][k] + t ** 2 * pts[2][k]
        : (1 - t) ** 3 * pts[0][k] + 3 * (1 - t) ** 2 * t * pts[1][k] + 3 * (1 - t) * t ** 2 * pts[2][k] + t ** 3 * pts[3][k]
      length += Math.hypot(at(0) - px, at(1) - py);
      [px, py] = [at(0), at(1)]
    }
    return length
  }
  for (let i = 0, cmd = ''; i < tokens.length;) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++]
    const up = cmd.toUpperCase()
    assert.ok(up in ARGS, `path command ${cmd} in ${d}`)
    const rel = cmd !== up
    const n = tokens.slice(i, i + ARGS[up]).map(Number)
    i += ARGS[up]
    const ax = v => rel ? x + v : v
    const ay = v => rel ? y + v : v
    if (up === 'M') {
      [x, y] = [ax(n[0]), ay(n[1])];
      [sx, sy] = [x, y]
      sub = { length: 0, points: [[x, y]] }
      subpaths.push(sub)
      cmd = rel ? 'l' : 'L'
      prev = 'M'
      continue
    }
    let nx = x, ny = y
    if (up === 'L' || up === 'T') [nx, ny] = [ax(n[0]), ay(n[1])]
    else if (up === 'H') nx = ax(n[0])
    else if (up === 'V') ny = rel ? y + n[0] : n[0]
    else if (up === 'Z') [nx, ny] = [sx, sy]
    if (up === 'L' || up === 'H' || up === 'V' || up === 'Z') sub.length += Math.hypot(nx - x, ny - y)
    else if (up === 'Q' || up === 'T') {
      const c = up === 'Q' ? [ax(n[0]), ay(n[1])] : /[QT]/.test(prev) ? [2 * x - cx, 2 * y - cy] : [x, y]
      if (up === 'Q') [nx, ny] = [ax(n[2]), ay(n[3])]
      sub.length += curve([[x, y], c, [nx, ny]])
      sub.points.push(c);
      [cx, cy] = c
    } else if (up === 'C' || up === 'S') {
      const c1 = up === 'C' ? [ax(n[0]), ay(n[1])] : /[CS]/.test(prev) ? [2 * x - cx, 2 * y - cy] : [x, y]
      const c2 = up === 'C' ? [ax(n[2]), ay(n[3])] : [ax(n[0]), ay(n[1])];
      [nx, ny] = up === 'C' ? [ax(n[4]), ay(n[5])] : [ax(n[2]), ay(n[3])]
      sub.length += curve([[x, y], c1, c2, [nx, ny]])
      sub.points.push(c1, c2);
      [cx, cy] = c2
    } else if (up === 'A') {
      [nx, ny] = [ax(n[5]), ay(n[6])]
      sub.length = NaN
      for (const [px, py] of [[x, y], [nx, ny]]) sub.points.push([px - n[0], py - n[1]], [px + n[0], py + n[1]])
    }
    if (up === 'Z') [x, y] = [sx, sy]
    else [x, y] = [nx, ny]
    sub.points.push([x, y])
    prev = up
  }
  return subpaths
}

/** One drawn shape's subpaths (as pathGeometry), or null for anything unmeasured. */
function shapeGeometry(node) {
  const a = name => Number(node.attrs[name] ?? 0)
  switch (node.tag) {
    case 'path': return pathGeometry(node.attrs.d)
    case 'rect': return [{ length: 2 * (a('width') + a('height')), points: [[a('x'), a('y')], [a('x') + a('width'), a('y') + a('height')]] }]
    case 'circle': return [{ length: 2 * Math.PI * a('r'), points: [[a('cx') - a('r'), a('cy') - a('r')], [a('cx') + a('r'), a('cy') + a('r')]] }]
    case 'ellipse': {
      const [rx, ry] = [a('rx'), a('ry')]
      const h = ((rx - ry) / (rx + ry)) ** 2
      return [{ length: Math.PI * (rx + ry) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h))), points: [[a('cx') - rx, a('cy') - ry], [a('cx') + rx, a('cy') + ry]] }]
    }
    case 'line': return [{ length: Math.hypot(a('x2') - a('x1'), a('y2') - a('y1')), points: [[a('x1'), a('y1')], [a('x2'), a('y2')]] }]
    default: return null
  }
}

/** The box an element draws in its own coordinates (stroke included), or null. */
function bounds(element) {
  let box = null
  for (const node of nodes(element)) {
    if (node.tag === 'g' || node.tag === 'title' || node.tag === 'style') continue
    if (node.attrs.transform !== undefined && node !== element) return null
    const geometry = shapeGeometry(node)
    if (geometry === null) return null
    const pad = inherited(node, 'stroke') !== undefined && inherited(node, 'stroke') !== 'none' ? strokeWidth(node) / 2 : 0
    for (const [px, py] of geometry.flatMap(sub => sub.points)) {
      box ??= [Infinity, Infinity, -Infinity, -Infinity]
      box = [Math.min(box[0], px - pad), Math.min(box[1], py - pad), Math.max(box[2], px + pad), Math.max(box[3], py + pad)]
    }
  }
  return box
}

/** Whether `element`, moved by `transform`, lies wholly outside the view. */
function offView(svg, element, transform) {
  let node = element.parent
  for (; node !== null; node = node.parent) if (node.attrs.transform !== undefined) return false
  const m = matrix(transform ?? 'none')
  const box = bounds(element)
  if (m === null || box === null || !sameMatrix(m.slice(0, 4), [1, 0, 0, 1])) return false
  const [vx, vy, vw, vh] = viewBox(svg)
  const [x0, y0, x1, y1] = [box[0] + m[4], box[1] + m[5], box[2] + m[4], box[3] + m[5]]
  return x1 <= vx || x0 >= vx + vw || y1 <= vy || y0 >= vy + vh
}

/** The dash period of a stroke-dasharray, or null for none. */
function dashPeriod(value) {
  if (value === undefined || value === 'none') return null
  const parts = value.split(/[\s,]+/).filter(Boolean).map(Number)
  const sum = parts.reduce((a, b) => a + b, 0)
  return parts.length % 2 === 1 ? 2 * sum : sum
}

/**
 * A stroke-dashoffset loop is seamless when it flows whole periods at an even
 * speed, or when it draws a line on, holds it, and starts over: then the one
 * dash must cover every subpath, or part of the line shows before it is drawn.
 */
function dashLoop(name, selector, anim, frames, elements, rule, [first, last]) {
  const problems = []
  for (const element of elements) {
    const dasharray = rule.get('stroke-dasharray') ?? element.attrs['stroke-dasharray']
    const period = dashPeriod(dasharray)
    if (period === null) { problems.push(`${selector}: animates stroke-dashoffset without a stroke-dasharray`); continue }
    const from = Number(first ?? 0)
    const to = Number(last ?? 0)
    if (near(Math.abs(to - from) % period, 0)) {
      if (!oneWay(frames) || anim.timing !== 'linear') problems.push(`${selector}: a flowing dash runs linear from 0% to 100%`)
      continue
    }
    const dash = Number(dasharray.split(/[\s,]+/)[0])
    const drawOn = dasharray.split(/[\s,]+/).filter(Boolean).length === 1 && near(from, dash) && near(to, 0)
    if (!drawOn) { problems.push(`${selector}: stroke-dashoffset ${from} → ${to} neither flows whole ${period}px periods nor draws the line on`); continue }
    if (!holdsEnd(frames, 'stroke-dashoffset')) problems.push(`${selector}: draws the line on and wipes it at once; hold the drawn line before restarting`)
    for (const node of nodes(element)) {
      const geometry = shapeGeometry(node)
      if (geometry === null) continue
      for (const sub of geometry) {
        if (!(sub.length <= dash + 0.5)) problems.push(`${selector}: a ${sub.length.toFixed(1)}px stroke outruns its ${dash}px dash, so part of it shows before it is drawn`)
      }
    }
  }
  return problems.map(p => `${name}: ${p}`)
}

/**
 * A slide by `shift` is seamless when every animated element is a row of
 * evenly spaced dashes, the shift is whole periods, and no dash missing from
 * either end of the row ever comes into view.
 */
function slidesWholePeriods(name, svg, selector, elements, [dx, dy]) {
  const problems = []
  if (!near(dy, 0)) return [`${selector}: slides vertically by ${dy}px; only horizontal dash rows are understood`]
  const [vx, , vw] = viewBox(svg)
  for (const element of elements) {
    const paths = [...nodes(element)].filter(n => n.tag === 'path')
    if (paths.length === 0 || [...nodes(element)].some(n => !['g', 'path'].includes(n.tag))) {
      problems.push(`${selector}: a sliding element must be dashes drawn with <path>`)
      continue
    }
    for (const path of paths) {
      const dashes = [...path.attrs.d.matchAll(/M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*H\s*(-?[\d.]+)/g)].map(([, x, , x2]) => [Number(x), Number(x2)])
      if (dashes.map(([x, x2]) => `M${x} H${x2}`).length !== (path.attrs.d.match(/M/g) ?? []).length || dashes.length < 2) {
        problems.push(`${selector}: path is not a row of horizontal dashes: ${path.attrs.d}`)
        continue
      }
      const period = dashes[1][0] - dashes[0][0]
      const length = dashes[0][1] - dashes[0][0]
      dashes.forEach(([x, x2], i) => {
        if (!near(x, dashes[0][0] + i * period) || !near(x2 - x, length)) problems.push(`${selector}: dash ${i} breaks the ${period}px rhythm`)
      })
      if (!near(Math.abs(dx) % period, 0)) problems.push(`${selector}: slides ${dx}px over ${period}px dashes, so it snaps back each loop`)
      const half = strokeWidth(path) / 2
      const first = dashes[0][0]
      const last = dashes.at(-1)[0]
      // The dash before the first, carried along by the slide, must stay left
      // of the view; the dash after the last must stay right of it.
      const lead = dx > 0 ? first - period + length + dx + half <= vx : first - period + length + half <= vx
      const tail = dx > 0 ? last + period - half >= vx + vw : last + period + dx - half >= vx + vw
      if (!lead || !tail) problems.push(`${selector}: the dash row runs out inside the view while sliding ${dx}px`)
    }
  }
  return problems.map(p => `${name}: ${p}`)
}

// BASE_CSS in tools/build-sprites.mjs animates the blink, the tail and the
// ear on every pose, including the ones that close the eyes or hide the tail.
const SHARED = new Set(['eye', 'tail', 'ear2'])

/** Every declaration the rules for `selector` set, later ones winning. */
const rules = (sheet, selector) => new Map(sheet.rules.filter(rule => rule.selector === selector).flatMap(rule => [...rule.decls]))

/** Every problem found in one SVG document (a pose, a decoration, or a dressed pose). */
function lintSvg(name, text) {
  const svg = parseSvg(text)
  const sheet = parseCss(svg.styles)
  const anims = animations(sheet)
  const problems = []
  const fail = message => problems.push(`${name}: ${message}`)
  const used = new Set()
  const animatedBy = new Map()

  for (const [selector, anim] of anims) {
    if (anim.name === 'none') continue
    if (!/^\.[\w-]+$/.test(selector)) { fail(`selector ${selector} is not a single class; teach test/animation.test.js about it`); continue }
    const cls = selector.slice(1)
    const elements = [...nodes(svg.root)].filter(node => classes(node).includes(cls))
    const frames = sheet.keyframes.get(anim.name)
    used.add(anim.name)
    if (frames === undefined) { fail(`${selector} runs @keyframes ${anim.name}, which is not defined`); continue }
    if (elements.length === 0 && !SHARED.has(cls)) fail(`${selector} is animated but no element has class ${cls}`)
    if (!(anim.duration > 0)) fail(`${selector} has no duration`)
    for (const element of elements) {
      if (animatedBy.has(element)) fail(`one element has two animators, ${animatedBy.get(element)} and ${selector}; only the later one plays`)
      animatedBy.set(element, selector)
      if (frames.some(f => f.decls.has('transform')) && element.attrs.transform !== undefined) {
        fail(`${selector} animates transform on an element with transform="${element.attrs.transform}", which the animation replaces`)
      }
    }
    if (needsPivot(frames) && anim.origin === undefined) fail(`${selector} rotates or scales @keyframes ${anim.name} without a transform-origin`)
    if (anim.iterations <= 1 || anim.direction.startsWith('alternate') || anim.timing.startsWith('steps')) continue
    const s = seam(frames)
    if (s.diff.length === 0) {
      if (s.turns && oneWay(frames) && anim.timing !== 'linear') fail(`${selector} turns a full circle with ${anim.timing}; a continuous turn runs linear`)
      continue
    }
    const hidden = end => elements.length > 0 && (faded(s, end) || elements.every(element => offView(svg, element, s.ends.get('transform')?.[end])))
    if (hidden(0) && hidden(1)) continue
    if (s.diff.length === 1 && s.diff[0] === 'transform' && s.shift !== null) {
      problems.push(...slidesWholePeriods(name, svg, selector, elements, s.shift))
      if (!oneWay(frames) || anim.timing !== 'linear') fail(`${selector} slides with ${anim.timing}; a continuous slide runs linear from 0% to 100%`)
      continue
    }
    if (s.diff.length === 1 && s.diff[0] === 'stroke-dashoffset') {
      problems.push(...dashLoop(name, selector, anim, frames, elements, rules(sheet, selector), s.ends.get('stroke-dashoffset')))
      continue
    }
    fail(`@keyframes ${anim.name} (${selector}) loops but ends elsewhere than it starts, in view: ${describe(s)}`)
  }
  if (used.size > 0 && !sheet.reducedMotion) fail('animates without a prefers-reduced-motion off switch')
  return problems
}

// ---------------------------------------------------------------------------
// The client's stylesheet, as written in client.js string literals
// ---------------------------------------------------------------------------

function clientCss() {
  const source = readFileSync(join(ROOT, 'client.js'), 'utf8')
  return [...source.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)].map(([, s]) => s.replace(/\\(.)/g, '$1')).join('')
}

function lintClient() {
  const css = clientCss()
  const sheet = parseCss(css.slice(css.indexOf('.dp-'), css.lastIndexOf('}') + 1))
  const problems = []
  const names = new Set()
  for (const { decls } of sheet.rules) {
    if (decls.has('animation')) names.add(shorthand(decls.get('animation')).name)
    if (decls.has('animation-name')) names.add(decls.get('animation-name'))
  }
  names.delete('none')
  for (const name of names) if (!sheet.keyframes.has(name)) problems.push(`client.js: animation ${name} has no @keyframes`)
  for (const [name, frames] of sheet.keyframes) {
    if (!names.has(name)) problems.push(`client.js: @keyframes ${name} is never used`)
    // The pig's moods and reactions share one element whose base animation
    // loops, so every keyframes here must close on itself unless it fades out.
    const s = seam(frames)
    if (s.diff.length > 0 && !(faded(s, 0) && faded(s, 1))) problems.push(`client.js: @keyframes ${name} ends elsewhere than it starts: ${describe(s)}`)
  }
  return problems
}

// ---------------------------------------------------------------------------

test('animation lint: a road slides whole dash periods, linear, without running out', () => {
  const road = (shift, timing = 'linear') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="24 -36 336 336"><style>
    .road{animation:road 1s ${timing} infinite}@keyframes road{to{transform:translateX(${shift}px)}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>
    <g class="road"><path d="M-60 300H0M60 300H120M180 300H240M300 300H360M420 300H480" stroke="#000" stroke-width="7"/></g></svg>`
  assert.deepEqual(lintSvg('road', road(120)), [])
  assert.deepEqual(lintSvg('road', road(-120)), [])
  assert.match(lintSvg('road', road(60)).join('\n'), /slides 60px over 120px dashes/)
  assert.match(lintSvg('road', road(120, 'ease-in-out')).join('\n'), /slides with ease-in-out/)
  assert.match(lintSvg('road', road(240)).join('\n'), /runs out inside the view/)
})

const doc = (css, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><style>${css}
  @media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>${body}</svg>`
const lint = (css, body) => lintSvg('t', doc(css, body)).join('\n')

test('animation lint: seams, hidden ends and one-way turns', () => {
  assert.match(lint('.a{animation:up 1s infinite}@keyframes up{to{transform:translateY(-9px)}}', '<circle class="a" cx="50" cy="50" r="2"/>'), /vertically/)
  assert.match(lint('.a{animation:p 1s infinite;transform-origin:5px 5px}@keyframes p{0%{opacity:1}100%{opacity:0;transform:scale(2)}}', '<g class="a"/>'), /ends elsewhere than it starts, in view: opacity/)
  assert.equal(lint('.a{animation:f 1s linear infinite}@keyframes f{0%{opacity:0}50%{opacity:1}100%{opacity:0;transform:translateY(9px)}}', '<g class="a"/>'), '')
  // Drives in from off the left edge and fades out: hidden at both ends.
  assert.equal(lint('.a{animation:car 4s linear infinite}@keyframes car{80%{opacity:1}100%{opacity:0;transform:translateX(80px)}}', '<rect class="a" x="-30" y="10" width="20" height="9"/>'), '')
  assert.match(lint('.a{animation:car 4s linear infinite}@keyframes car{to{transform:translateX(80px)}}', '<rect class="a" x="-30" y="10" width="20" height="9"/>'), /dashes drawn with <path>/)
  assert.equal(lint('.a{animation:f 1s linear infinite alternate}@keyframes f{to{transform:translateY(9px)}}', '<g class="a"/>'), '')
  assert.equal(lint('.a{animation:m 1s steps(1) infinite}@keyframes m{50%{opacity:0}100%{opacity:1}}', '<g class="a"/>'), '')
  assert.match(lint('.a{animation:sp 1s ease infinite;transform-origin:5px 5px}@keyframes sp{to{transform:rotate(360deg)}}', '<g class="a"/>'), /full circle with ease/)
  assert.equal(lint('.a{animation:sp 1s linear infinite;transform-origin:5px 5px}@keyframes sp{to{transform:rotate(-1turn)}}', '<g class="a"/>'), '')
  assert.equal(lint('.a{animation:sp 1s ease-in-out infinite;transform-origin:5px 5px}@keyframes sp{50%{transform:translateY(-9px) rotate(180deg)}100%{transform:rotate(360deg)}}', '<g class="a"/>'), '')
})

test('animation lint: dashes flow whole periods or draw the whole line on', () => {
  const flow = shift => lint(`.a{animation:s .6s linear infinite}@keyframes s{to{stroke-dashoffset:${shift}}}`, '<path class="a" d="M0 0H90" stroke="#000" stroke-dasharray="8 6"/>')
  assert.equal(flow(-28), '')
  assert.match(flow(-20), /neither flows whole 14px periods/)
  const draw = (dash, d, frames = '0%{stroke-dashoffset:DASH}60%,100%{stroke-dashoffset:0}') =>
    lint(`.a{stroke-dasharray:${dash};animation:w 3s linear infinite}@keyframes w{${frames.replace('DASH', dash)}}`, `<path class="a" d="${d}" stroke="#000"/>`)
  assert.equal(draw(40, 'M0 0h30M0 10v30'), '')
  assert.match(draw(40, 'M0 0l12-24 12 24Z'), /77.7px stroke outruns its 40px dash/)
  assert.match(draw(40, 'M0 0q8-8 14 0t-14 18h16'), /outruns its 40px dash/)
  assert.match(lint('.a{stroke-dasharray:124;animation:d 2s infinite}@keyframes d{0%{stroke-dashoffset:124}45%,100%{stroke-dashoffset:0}}', '<rect class="a" width="38" height="25" stroke="#000"/>'), /126.0px stroke outruns its 124px dash/)
  assert.match(draw(40, 'M0 0h30', '0%{stroke-dashoffset:DASH}100%{stroke-dashoffset:0}'), /hold the drawn line/)
})

test('animation lint: pivots, overrides and wiring', () => {
  assert.match(lint('.a{animation:w 1s infinite}@keyframes w{50%{transform:rotate(9deg)}}', '<g class="a"/>'), /without a transform-origin/)
  assert.match(lint('.a{animation:w 1s infinite}@keyframes w{50%{transform:translateY(2px)}}', '<rect class="a" transform="rotate(8 5 5)"/>'), /transform="rotate/)
  assert.match(lint('.a{animation:wx 1s infinite}@keyframes w{50%{opacity:.5}}', '<g class="a"/>'), /wx, which is not defined/)
  assert.match(lint('.a{animation:w 1s infinite}@keyframes w{50%{opacity:.5}}', '<g class="b"/>'), /no element has class a/)
  assert.match(lint('.a{animation:w 1s infinite}.b{animation:w 2s infinite}@keyframes w{50%{opacity:.5}}', '<g class="a b"/>'), /two animators/)
  assert.match(lintSvg('t', '<svg viewBox="0 0 1 1"><style>.a{animation:w 1s infinite}@keyframes w{50%{opacity:.5}}</style><g class="a"/></svg>').join('\n'), /reduced-motion/)
})

test('every sprite and decoration animates without a seam, a lost pivot or a broken name', () => {
  assert.deepEqual(svgs.flatMap(name => lintSvg(name, read(name))), [])
})

test('every pose dressed in every decoration still animates cleanly', () => {
  assert.deepEqual(poses.flatMap(name => lintSvg(`${name} (dressed)`, dress(read(name), wears))), [])
})

test('the desktop client\'s CSS animations resolve and close their loops', () => {
  assert.deepEqual(lintClient(), [])
})

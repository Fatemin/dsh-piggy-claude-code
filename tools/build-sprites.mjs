#!/usr/bin/env node
/**
 * Build every pig sprite in assets/ from ONE pig.
 *
 * The pig is the project's original drawing — the Noto Emoji 🐖 traced into
 * flat paths (it used to live in assets/piglet.svg). No stage or behaviour
 * redraws it: a sprite only moves it (CSS animation inside the SVG), closes
 * its eyes, and adds things around it — a hat, a desk, a tub, tears.
 *
 * stage-box.svg and stage-grave.svg have no pig in them and are hand-written;
 * this script leaves them alone. Every pose is also written once per life
 * stage that dresses up (<pose>--piglet / --middle / --elder.svg).
 *
 *   node tools/build-sprites.mjs
 */
import { writeFileSync } from 'node:fs'

const OUT = new URL('../assets/', import.meta.url)
// Pig content spans x 48–341, y 31–298; the top margin leaves room for props.
const VIEWBOX = '24 -36 336 336'

// ---------------------------------------------------------------------------
// The pig, verbatim. Colours and shapes never change.
// ---------------------------------------------------------------------------
const C = { body: '#FFD1AF', far: '#FF9FA5', snout: '#FF8195', ear: '#E95892', eye: '#373A32', blush: '#FFAFAC' }
const P = {
  farLeg: 'M214 210C213 221 210 232 211 246C212 256 224 257 233 254C244 251 246 240 247 225L248 211Z',
  tail: 'M294 62C298 47 305 40 315 45C327 50 341 64 329 72C319 80 309 67 316 51C322 39 330 31 339 35',
  body: 'M110 70C155 46 192 37 231 41C259 43 279 48 298 64C320 83 332 105 332 128C333 146 326 163 319 180C312 197 309 223 308 241C308 254 301 260 289 260C277 260 270 255 269 244L267 230C266 222 261 219 253 220C231 227 213 235 192 240L191 282C191 292 185 298 173 298C159 298 152 293 152 284L151 248C140 248 131 247 123 245L122 271C121 282 116 287 104 287C93 287 88 283 87 273L84 232C63 224 52 210 48 192C42 170 48 148 62 126C69 115 75 106 80 94C87 79 96 68 110 70Z',
  earBase: 'M63 107C64 97 75 81 84 68C90 58 102 58 108 66L115 87L90 113Z',
  ear1: 'M97 65C88 63 83 75 78 82C71 91 65 101 64 106C68 116 86 109 93 98',
  ear2: 'M187 104C174 110 184 129 193 139C201 147 213 150 220 139C225 131 224 119 222 112',
  eye1: 'M91 130C84 129 79 136 80 144C80 151 85 155 92 154C99 153 103 147 102 140C102 134 98 130 91 130Z',
  eye2: 'M166 145C159 144 154 150 154 157C153 164 158 170 165 170C171 170 176 164 176 157C176 151 173 146 166 145Z',
  snout: 'M108 165C91 161 78 166 74 175C68 186 74 200 90 207C106 214 125 214 135 204C143 196 140 183 129 174C123 170 116 167 108 165Z',
  nostril1: 'M92 175C87 174 84 178 85 185C85 191 89 196 94 195C99 194 101 188 99 182C98 178 96 175 92 175Z',
  nostril2: 'M115 180C110 178 107 183 107 189C106 195 109 200 114 200C119 200 122 195 122 189C122 184 119 180 115 180Z',
}
// The same eyes, shut: ‿ for asleep, ^ for a happy squint.
const SHUT = { closed: 'M80 141Q91 152 102 141M154 156Q165 167 176 156', happy: 'M80 147Q91 134 102 147M154 162Q165 149 176 162' }

/**
 * The pig. `eyes`: 'open' (blinks) | 'closed' | 'happy'. `face` is drawn on
 * top of the face (glasses, tears…), `back` between the far leg and the body.
 */
/**
 * Both cheeks. The near one sits right of the snout; the far one, left of the
 * snout under the far eye, is a little smaller since the face is turned.
 */
const cheeks = (rx, ry, fill, opacity, cls = '') => {
  const c = cls === '' ? '' : ` class="${cls}"`
  return `<ellipse${c} cx="155" cy="187" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${opacity}"/>`
    + `<ellipse${c} cx="60" cy="170" rx="${+(rx * .75).toFixed(1)}" ry="${+(ry * .75).toFixed(1)}" fill="${fill}" opacity="${opacity}"/>`
}

function pig({ eyes = 'open', face = '', back = '', blush = '', look = '' } = {}) {
  const eyeMarkup = eyes === 'open'
    ? `<path class="eye" fill="${C.eye}" d="${P.eye1}"/><path class="eye" fill="${C.eye}" d="${P.eye2}"/>`
    : `<path d="${SHUT[eyes]}" fill="none" stroke="${C.eye}" stroke-width="7"/>`
  return `<g class="pig" stroke-linecap="round" stroke-linejoin="round">
    <path fill="${C.far}" d="${P.farLeg}"/>
    <path class="tail" d="${P.tail}" fill="none" stroke="${C.body}" stroke-width="11"/>
    ${back}
    <path fill="${C.body}" d="${P.body}"/>
    <path fill="${C.body}" d="${P.earBase}"/>
    <path class="ear1" d="${P.ear1}" fill="none" stroke="${C.ear}" stroke-width="10"/>
    <path class="ear2" d="${P.ear2}" fill="none" stroke="${C.ear}" stroke-width="11"/>
    ${eyeMarkup}
    <g class="snout"><path fill="${C.snout}" d="${P.snout}"/>
    <path fill="${C.eye}" d="${P.nostril1}"/>
    <path fill="${C.eye}" d="${P.nostril2}"/></g>
    ${cheeks(12, 7, C.blush, '.75', 'blush')}
    ${blush}
    ${look}
    ${face}
  </g>`
}

// Shared motion: blink, wag, ear flick. Each sprite adds its own.
const BASE_CSS = `
    .eye{animation:blink 4.2s infinite;transform-box:fill-box;transform-origin:50% 50%}
    .tail{animation:wag 1.4s ease-in-out infinite;transform-origin:296px 64px}
    .ear2{animation:flick 5.2s ease-in-out infinite;transform-origin:205px 108px}
    @keyframes blink{0%,90%,100%{transform:scaleY(1)}93%{transform:scaleY(.1)}}
    @keyframes wag{50%{transform:rotate(14deg)}}
    @keyframes flick{0%,80%,100%{transform:rotate(0)}85%{transform:rotate(-12deg)}90%{transform:rotate(4deg)}}`

const heart = (x, y, s, fill, cls) =>
  // The animated class sits on a wrapper: a CSS transform would replace the
  // path's own transform attribute.
  `<g class="${cls}"><path transform="translate(${x} ${y}) scale(${s})" d="M0 0c0-10 13-15 18-5 5-10 18-5 18 5 0 13-18 23-18 23S0 13 0 0Z" fill="${fill}"/></g>`
const sparkle = (x, y, r, fill, cls) =>
  `<path class="${cls}" d="M${x} ${y - r}l${r * .3} ${r * .7} ${r * .7} ${r * .3}-${r * .7} ${r * .3}-${r * .3} ${r * .7}-${r * .3}-${r * .7}-${r * .7}-${r * .3} ${r * .7}-${r * .3}Z" fill="${fill}"/>`
const drop = (x, y, s, fill, cls) =>
  `<g class="${cls}"><path transform="translate(${x} ${y}) scale(${s})" d="M0 0C-4 7-6 11-6 14a6 6 0 0 0 12 0c0-3-2-7-6-14Z" fill="${fill}"/></g>`

// ---------------------------------------------------------------------------
// What each life stage wears. The stage sprites wear it standing still, and
// every pose is built once more per stage wearing it too (<pose>--<stage>.svg),
// so a piglet keeps its bow and an old pig its beard while it eats or works.
// A pose with its own headwear (`hat: true`) drops the bow and the cap.
// ---------------------------------------------------------------------------
const LOOK = {
  bow: `<g transform="translate(86 50) rotate(-18)"><path d="M0 0L-22-12C-28-3-28 7-22 14Z" fill="#FF6F9A"/><path d="M0 0L22-12C28-3 28 7 22 14Z" fill="#FF6F9A"/><circle r="7" fill="#E9507F"/></g>`,
  cap: `<path d="M118 62C124 34 166 22 200 34L204 52C176 46 146 52 118 62Z" fill="#8B6B4E"/><path d="M98 70Q116 56 140 58" fill="none" stroke="#6E5239" stroke-width="10"/>`,
  elder: `<path d="M77 122Q89 111 104 121M151 137Q164 127 179 138" fill="none" stroke="#ADADA5" stroke-width="8"/>
    <path d="M107 207C98 203 96 213 84 212C88 220 98 223 107 216C114 225 127 226 134 219C120 220 119 208 107 207Z" fill="#F8F4E8"/>
    <path d="M105 228Q116 233 128 230Q127 241 119 247L116 240L110 244Q107 236 105 228Z" fill="#F8F4E8"/>`,
}
const STAGE_LOOKS = {
  piglet: { title: '小猪', head: LOOK.bow },
  middle: { title: '中年猪', head: LOOK.cap },
  elder: { title: '老年猪', face: LOOK.elder },
}

// The little work desk most indoor poses stand at.
const DESK = `<rect x="28" y="252" width="170" height="12" rx="6" fill="#C69C6D"/>
    <rect x="38" y="264" width="12" height="36" rx="6" fill="#B0875A"/><rect x="176" y="264" width="12" height="36" rx="6" fill="#B0875A"/>`
const glasses = stroke => `<g fill="none" stroke="${stroke}" stroke-width="5"><circle cx="91" cy="142" r="20"/><circle cx="165" cy="157" r="20"/><path d="M111 145L145 152M71 138L58 132"/></g>`

// On the road: straw hat, backpack, the road sliding back under the feet.
const TRIP_CSS = `.walk{animation:walk .5s ease-in-out infinite;transform-origin:190px 298px}
    .road{animation:road .8s linear infinite}
    .tail{animation-duration:.5s}
    @keyframes walk{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-8px) rotate(-1.5deg)}}
    @keyframes road{to{transform:translateX(60px)}}`
const TRIP_GEAR = `<path d="M236 58Q206 110 226 168" fill="none" stroke="#4E7FB0" stroke-width="9"/>
    <rect x="238" y="34" width="84" height="92" rx="26" fill="#6FA8DC" transform="rotate(8 280 80)"/>
    <rect x="248" y="86" width="64" height="32" rx="13" fill="#5A93C8" transform="rotate(8 280 80)"/>
    <ellipse cx="150" cy="54" rx="64" ry="14" fill="#E9C46A" transform="rotate(-14 150 54)"/>
    <path d="M118 58C110 26 172 10 182 42Z" fill="#F2D488"/><path d="M120 50L180 34" fill="none" stroke="#E5534B" stroke-width="7"/>`
const TRIP_ROAD = `<g class="road"><path d="M-60 300H0M60 300H120M180 300H240M300 300H360M420 300H480" fill="none" stroke="#D9CBB3" stroke-width="7" stroke-linecap="round"/></g>`
/** A trip to one region: the walking pig, plus that region's scenery. */
const trip = (title, note, { css = '', under = '', over = '', gear = '', back = '' }) => ({
  title, note, hat: true,
  css: `${TRIP_CSS}
    ${css}`,
  wrap: 'walk',
  pig: { face: TRIP_GEAR + gear, back },
  under: under + TRIP_ROAD,
  over,
})

// ---------------------------------------------------------------------------
// Sprites. `css` animates; `under` sits behind the pig, `over` in front;
// `wrap` names the class on the group holding the pig (+ its own props).
// ---------------------------------------------------------------------------
const SPRITES = {
  // ---- stages: the same pig, only accessories ----
  'stage-piglet': {
    title: '小猪', note: '刚出纸盒：耳朵上系个小蝴蝶结，走两步颠一下。',
    css: `.hop{animation:hop 1.4s ease-in-out infinite;transform-origin:190px 298px}
    @keyframes hop{0%,100%{transform:translateY(0) scale(1,1)}45%{transform:translateY(-10px) scale(.98,1.02)}70%{transform:translateY(0) scale(1.03,.97)}}`,
    wrap: 'hop', looks: false,
    pig: { face: LOOK.bow },
  },
  'stage-young': {
    title: '青年猪', note: '原版那只猪：呼吸、眨眼、甩尾巴。',
    css: `.breathe{animation:breathe 2.6s ease-in-out infinite;transform-origin:190px 298px}
    @keyframes breathe{50%{transform:scale(1.015,.975)}}`,
    wrap: 'breathe', looks: false,
  },
  'stage-middle': {
    title: '中年猪', note: '同一只猪，戴一顶鸭舌帽，呼吸慢一点。',
    css: `.breathe{animation:breathe 3.2s ease-in-out infinite;transform-origin:190px 298px}
    @keyframes breathe{50%{transform:scale(1.02,.97)}}`,
    wrap: 'breathe', looks: false,
    pig: { face: LOOK.cap },
  },
  'stage-elder': {
    title: '老年猪', note: '同一只猪：灰眉毛、白胡子，拄一根小拐杖，偶尔点头打盹。',
    css: `.nod{animation:nod 6s ease-in-out infinite;transform-origin:190px 298px}
    .cane{animation:tap 4s ease-in-out infinite;transform-origin:44px 298px}
    @keyframes nod{0%,60%,100%{transform:rotate(0)}72%{transform:rotate(-3deg) translateY(3px)}84%{transform:rotate(0)}}
    @keyframes tap{50%{transform:rotate(-3deg)}}`,
    wrap: 'nod', looks: false,
    pig: { face: LOOK.elder },
    over: `<path class="cane" d="M40 298V226C40 206 66 206 66 226" fill="none" stroke="#A8764C" stroke-width="10"/>`,
  },
  'soul': {
    title: '灵魂', note: '还是那只猪，变得半透明，头顶光环，飘着。',
    css: `.float{animation:float 3.4s ease-in-out infinite}
    .halo{animation:glow 1.7s ease-in-out infinite}
    .sp{animation:twinkle 1.7s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 50%}
    .sp2{animation:twinkle 1.7s ease-in-out -.85s infinite;transform-box:fill-box;transform-origin:50% 50%}
    .ghost{opacity:.6}
    @keyframes float{0%,100%{transform:translateY(6px)}50%{transform:translateY(-12px)}}
    @keyframes glow{50%{opacity:.5}}
    @keyframes twinkle{0%,100%{opacity:0;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}`,
    wrap: 'float ghost', looks: false,
    pig: { eyes: 'closed' },
    over: `<g class="float"><ellipse class="halo" cx="160" cy="16" rx="52" ry="13" fill="none" stroke="#F5D76E" stroke-width="10"/></g>
    ${sparkle(52, 40, 18, '#FFE27A', 'sp')}${sparkle(344, 180, 14, '#FFE27A', 'sp2')}`,
  },

  // ---- moods ----
  'mood-happy': {
    title: '开心', note: '眯眼笑，原地蹦跶，冒小心心。',
    css: `.hop{animation:hop .9s ease-in-out infinite;transform-origin:190px 298px}
    .tail{animation-duration:.45s}
    .h1{animation:rise 1.8s ease-out infinite;transform-box:fill-box;transform-origin:50% 100%}
    .h2{animation:rise 1.8s ease-out -.9s infinite;transform-box:fill-box;transform-origin:50% 100%}
    @keyframes hop{0%,100%{transform:translateY(0) scale(1.03,.97)}40%,60%{transform:translateY(-22px) scale(.98,1.02)}}
    @keyframes rise{0%{opacity:0;transform:translateY(14px) scale(.5)}25%{opacity:1}100%{opacity:0;transform:translateY(-24px) scale(1)}}`,
    wrap: 'hop',
    pig: { eyes: 'happy' },
    over: heart(250, -10, 1.2, '#FF7A93', 'h1') + heart(300, 10, .9, '#FF9FB0', 'h2'),
  },
  'mood-hungry-2': {
    title: '饿了 · 二级', note: '抬头盯着想象中的胡萝卜，口水往下滴，肚子咕咕叫。',
    css: `.look{animation:look 2.4s ease-in-out infinite;transform-origin:190px 298px}
    .drool{animation:drip 2.4s ease-in infinite;transform-box:fill-box;transform-origin:50% 0}
    .think{animation:dream 2.4s ease-in-out infinite}
    .growl{animation:growl 1.2s ease-in-out infinite}
    @keyframes look{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(-4deg)}}
    @keyframes drip{0%,30%{transform:scaleY(.3);opacity:1}80%{transform:scaleY(1.4);opacity:1}100%{transform:scaleY(1.4) translateY(10px);opacity:0}}
    @keyframes dream{50%{transform:translateY(-6px)}}
    @keyframes growl{0%,100%{opacity:0}30%,60%{opacity:1}}`,
    wrap: 'look',
    pig: { face: drop(112, 212, 1.3, '#9FD8F0', 'drool') },
    under: `<g class="think"><circle cx="150" cy="40" r="7" fill="#EAE3D8"/><circle cx="176" cy="16" r="11" fill="#EAE3D8"/>
    <ellipse cx="250" cy="-6" rx="56" ry="34" fill="#F3EDE4"/>
    <path d="M226 14L268-22" fill="none" stroke="#F49A4A" stroke-width="16" stroke-linecap="round"/>
    <path d="M268-22L276-34M268-22L284-24M268-22L272-36" fill="none" stroke="#7DBF6A" stroke-width="6" stroke-linecap="round"/></g>`,
    over: `<path class="growl" d="M250 178q7-7 14 0t14 0M256 196q7-7 14 0t14 0" fill="none" stroke="#E8A882" stroke-width="5" stroke-linecap="round"/>`,
  },
  'mood-dirty-2': {
    title: '该洗澡了 · 二级', note: '身上沾了泥点，一只苍蝇绕着飞，屁股后面一坨便便。',
    css: `.itch{animation:itch 3s ease-in-out infinite;transform-origin:190px 298px}
    .fly{animation:orbit 2.2s linear infinite;transform-origin:250px 70px}
    .wing{animation:buzz .12s linear infinite;transform-box:fill-box;transform-origin:50% 100%}
    .stink{animation:stink 2s ease-in-out infinite}
    @keyframes itch{0%,70%,100%{transform:rotate(0)}76%{transform:rotate(-1.5deg)}82%{transform:rotate(1.5deg)}88%{transform:rotate(-.8deg)}}
    @keyframes orbit{to{transform:rotate(360deg)}}
    @keyframes buzz{50%{transform:scaleY(.4)}}
    @keyframes stink{0%,100%{opacity:0;transform:translateY(8px)}50%{opacity:.9;transform:translateY(-6px)}}`,
    wrap: 'itch',
    pig: { face: `<path d="M226 76c16-6 32 2 30 15s-22 12-32 6-12-19 2-21Z" fill="#B88A63"/>
    <path d="M276 160c11-3 22 4 20 13s-14 11-22 6-9-17 2-19Z" fill="#B88A63"/>
    <ellipse cx="200" cy="210" rx="11" ry="7" fill="#B88A63"/><circle cx="250" cy="122" r="5" fill="#B88A63"/>
    <path d="M158 278h30v6a15 15 0 0 1-30 0Z" fill="#B88A63"/>` },
    under: `<path d="M330 298c-13 0-18-8-13-13-5-6 0-13 8-13-3-8 5-13 11-11 8 0 13 5 11 11 8 0 13 8 8 13 5 5 0 13-13 13Z" fill="#8A5A3B"/>
    <path class="stink" d="M326 256q-7-10 0-20t0-20M344 256q-7-10 0-20" fill="none" stroke="#A9C98A" stroke-width="5" stroke-linecap="round"/>`,
    over: `<g class="fly"><g transform="translate(250 0)"><ellipse class="wing" cx="-6" cy="-8" rx="6" ry="9" fill="#DDEFF7"/><ellipse class="wing" cx="6" cy="-8" rx="6" ry="9" fill="#DDEFF7"/><circle r="7" fill="#3E3A35"/></g></g>`,
  },
  'mood-sleepy': {
    title: '睡着了', note: '站着打盹：闭眼，鼻涕泡一鼓一缩，头顶飘 Z。',
    css: `.breathe{animation:breathe 3.6s ease-in-out infinite;transform-origin:190px 298px}
    .tail{animation:none}.ear2{animation:none}
    .bubble{animation:bubble 3.6s ease-in-out infinite;transform-box:fill-box;transform-origin:100% 50%}
    .z1{animation:z 3.6s ease-out infinite}.z2{animation:z 3.6s ease-out -1.2s infinite}.z3{animation:z 3.6s ease-out -2.4s infinite}
    @keyframes breathe{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.025,.97) rotate(1deg)}}
    @keyframes bubble{0%,100%{transform:scale(.3)}50%{transform:scale(1)}}
    @keyframes z{0%{opacity:0;transform:translate(0,14px)}30%{opacity:1}100%{opacity:0;transform:translate(24px,-36px)}}`,
    wrap: 'breathe',
    pig: { eyes: 'closed', face: `<circle class="bubble" cx="62" cy="190" r="18" fill="#CFEAF7" opacity=".85"/>` },
    over: `<g fill="none" stroke="#8C9BC4" stroke-linecap="round" stroke-linejoin="round">
    <path class="z1" d="M150 50h18l-18 20h18" stroke-width="6"/>
    <path class="z2" d="M188 24h22l-22 24h22" stroke-width="7"/>
    <path class="z3" d="M230 0h26l-26 28h26" stroke-width="8"/></g>`,
  },
  // [dsh-piggy-claude-code mod] Really asleep (put to bed, or the computer slept):
  // unlike the dozing pose above, it is tucked in for the night.
  'mood-asleep': {
    title: '在睡觉', note: '真的睡了：戴着睡帽、盖着小被子，呼吸很慢，被子跟着起伏，睡帽的绒球一晃一晃，头顶飘 Z，身后一弯月亮。',
    css: `.breathe{animation:breathe 4.4s ease-in-out infinite;transform-origin:190px 298px}
    .tail{animation:none}.ear2{animation:none}
    .pom{animation:pom 4.4s ease-in-out infinite}
    .z1{animation:z 4.4s ease-out infinite}.z2{animation:z 4.4s ease-out -1.47s infinite}.z3{animation:z 4.4s ease-out -2.93s infinite}
    .moon{animation:glow 4.4s ease-in-out infinite}
    .sp{animation:twinkle 2.2s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 50%}
    .sp2{animation:twinkle 2.2s ease-in-out -1.1s infinite;transform-box:fill-box;transform-origin:50% 50%}
    @keyframes breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.02,.965)}}
    @keyframes pom{50%{transform:translateY(6px)}}
    @keyframes z{0%{opacity:0;transform:translate(0,14px)}30%{opacity:1}100%{opacity:0;transform:translate(24px,-36px)}}
    @keyframes glow{50%{opacity:.65}}
    @keyframes twinkle{0%,100%{opacity:0;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}`,
    wrap: 'breathe',
    pig: {
      eyes: 'closed',
      face: `<path d="M110 72C120 30 170 4 222 12C250 16 266 34 270 58C252 46 236 42 214 46Z" fill="#7E9BD8"/>
    <path d="M150 36C170 24 196 18 220 20" fill="none" stroke="#A9BDEA" stroke-width="7"/>
    <path d="M106 76Q160 50 216 44" fill="none" stroke="#F8F4E8" stroke-width="18"/>
    <circle class="pom" cx="272" cy="62" r="13" fill="#F8F4E8"/>
    <path d="M36 300V236C36 222 48 214 64 216C130 224 250 222 318 212C334 210 344 220 344 234V300Z" fill="#A9C7F0"/>
    <path d="M42 232C110 242 250 240 338 226" fill="none" stroke="#DCE9FA" stroke-width="14"/>
    <g fill="#FFFFFF" opacity=".7"><circle cx="90" cy="266" r="6"/><circle cx="150" cy="282" r="5"/><circle cx="206" cy="262" r="6"/><circle cx="262" cy="284" r="5"/><circle cx="306" cy="258" r="6"/></g>`,
    },
    under: `<path class="moon" d="M74 -26a32 32 0 1 0 28 48a26 26 0 1 1 -28 -48Z" fill="#F5D76E"/>
    ${sparkle(30, 66, 11, '#FFE27A', 'sp')}${sparkle(116, -18, 9, '#FFE27A', 'sp2')}`,
    over: `<g fill="none" stroke="#8C9BC4" stroke-linecap="round" stroke-linejoin="round">
    <path class="z1" d="M284 28h18l-18 20h18" stroke-width="6"/>
    <path class="z2" d="M308 -2h22l-22 24h22" stroke-width="7"/>
    <path class="z3" d="M330 -32h24l-24 26h24" stroke-width="8"/></g>`,
  },
  'mood-lonely-2': {
    title: '孤单 · 二级', note: '眼眶含着泪（参考 sample 里的含泪猪），一滴一滴往下掉，头顶一小朵乌云。',
    css: `.sway{animation:sway 4s ease-in-out infinite;transform-origin:190px 298px}
    .tail{animation:none}.ear2{animation:none}
    .t1{animation:drop 2.4s ease-in infinite}.t2{animation:drop 2.4s ease-in -1.2s infinite}
    .cloud{animation:drift 4s ease-in-out infinite}
    .rain{animation:rain 1s linear infinite}
    @keyframes sway{0%,100%{transform:rotate(1deg)}50%{transform:rotate(3deg) translateY(2px)}}
    @keyframes drop{0%,40%{opacity:0;transform:translateY(0)}50%{opacity:1}100%{opacity:0;transform:translateY(36px)}}
    @keyframes drift{50%{transform:translateX(8px)}}
    @keyframes rain{0%{opacity:0;transform:translateY(0)}30%{opacity:1}100%{opacity:0;transform:translateY(22px)}}`,
    wrap: 'sway',
    pig: { face: `<path d="M82 158Q91 162 100 158M156 173Q165 177 174 173" fill="none" stroke="#6EC3EA" stroke-width="6" stroke-linecap="round"/>
    ${drop(100, 160, 1.2, '#6EC3EA', 't1')}${drop(174, 175, 1.2, '#6EC3EA', 't2')}` },
    over: `<g class="cloud"><path d="M106 22a22 22 0 0 1 40-14 26 26 0 0 1 48 8 18 18 0 0 1-2 36H112a20 20 0 0 1-6-30Z" fill="#B9C0CC"/>
    <path class="rain" d="M128 64v12M152 64v12M176 64v12" fill="none" stroke="#8FB6D8" stroke-width="5" stroke-linecap="round"/></g>`,
  },
  'mood-sick-2': {
    title: '生病 · 二级', note: '额头搭湿毛巾，嘴里叼体温计，脸烧得通红，时不时打哆嗦。',
    css: `.shiver{animation:shiver 2.2s ease-in-out infinite;transform-origin:190px 298px}
    .tail{animation:none}
    .heat{animation:heat 2.2s ease-in-out infinite}
    @keyframes shiver{0%,60%,100%{transform:translateX(0)}64%{transform:translateX(-4px) rotate(-1deg)}68%{transform:translateX(4px) rotate(.8deg)}72%{transform:translateX(-2px)}}
    @keyframes heat{0%,100%{opacity:.2;transform:translateY(6px)}50%{opacity:1;transform:translateY(-6px)}}`,
    wrap: 'shiver',
    pig: {
      blush: cheeks(22, 12, '#FF6F6F', '.4'),
      face: `<path d="M70 104L178 116L174 136L66 124Z" fill="#9FD3E6"/>
    <path d="M90 110v10M112 112v10M134 115v10M156 117v10" fill="none" stroke="#7FBFD6" stroke-width="4" stroke-linecap="round"/>
    <path d="M78 214L36 238" fill="none" stroke="#F4F6F8" stroke-width="11" stroke-linecap="round"/>
    <path d="M58 226L36 238" fill="none" stroke="#E5534B" stroke-width="5" stroke-linecap="round"/>`,
    },
    over: `<path class="heat" d="M110 60q-8-10 0-20t0-20M140 54q-8-10 0-20t0-20" fill="none" stroke="#FFB0A0" stroke-width="6" stroke-linecap="round"/>`,
  },

  // ---- the same four moods, one level milder and one level worse ----
  'mood-hungry-1': {
    title: '饿了 · 一级', note: '有点饿：肚子咕咕叫，左右张望找吃的。',
    css: `.look{animation:scan 3.2s ease-in-out infinite;transform-origin:190px 298px}
    .growl{animation:growl 1.6s ease-in-out infinite}
    @keyframes scan{0%,100%{transform:rotate(0)}30%{transform:rotate(-2.5deg)}65%{transform:rotate(1.5deg)}}
    @keyframes growl{0%,100%{opacity:.35}30%,60%{opacity:1}}`,
    wrap: 'look',
    over: `<path class="growl" d="M252 186q6-6 12 0t12 0" fill="none" stroke="#E8A882" stroke-width="5" stroke-linecap="round"/>`,
  },
  'mood-hungry-3': {
    title: '饿了 · 三级', note: '饿坏了：饿得头晕眼冒金星，打翻的空碗，走路发飘、肚子大声叫。',
    css: `.wobble{animation:wobble 2.6s ease-in-out infinite;transform-origin:190px 298px}
    .tail{animation:none}.ear2{animation:none}
    .stars{animation:orbit 1.8s linear infinite;transform-origin:130px 40px}
    .growl{animation:growl .8s ease-in-out infinite}
    .sweat{animation:slide 2.6s ease-in infinite}
    @keyframes wobble{0%,100%{transform:rotate(1deg) translateY(2px)}25%{transform:rotate(-2.5deg)}50%{transform:rotate(2deg) translateY(4px)}75%{transform:rotate(-1deg)}}
    @keyframes orbit{to{transform:rotate(360deg)}}
    @keyframes growl{0%,100%{opacity:.2;transform:translateX(0)}50%{opacity:1;transform:translateX(4px)}}
    @keyframes slide{0%,30%{opacity:0;transform:translateY(0)}45%{opacity:1}100%{opacity:0;transform:translateY(24px)}}`,
    wrap: 'wobble',
    pig: { face: drop(64, 118, 1.6, '#9FD8F0', 'sweat') },
    under: `<g class="stars">${sparkle(130, -6, 16, '#FFD35A', '')}${sparkle(176, 56, 12, '#FFD35A', '')}${sparkle(86, 64, 12, '#FFD35A', '')}</g>`,
    over: `<path class="growl" d="M246 172q8-8 16 0t16 0t16 0M252 194q8-8 16 0t16 0t16 0" fill="none" stroke="#E07B5A" stroke-width="6" stroke-linecap="round"/>
    <path d="M40 298C40 270 70 258 98 258S156 270 156 298Z" fill="#7FB3D5"/><ellipse cx="98" cy="260" rx="40" ry="8" fill="#9CC7E0"/>`,
  },
  'mood-dirty-1': {
    title: '该洗澡了 · 一级', note: '有点脏：身上两块泥点，时不时蹭一下痒。',
    css: `.itch{animation:itch 3.4s ease-in-out infinite;transform-origin:190px 298px}
    @keyframes itch{0%,75%,100%{transform:rotate(0)}80%{transform:rotate(-1.2deg)}86%{transform:rotate(1.2deg)}}`,
    wrap: 'itch',
    pig: { face: `<path d="M276 160c11-3 22 4 20 13s-14 11-22 6-9-17 2-19Z" fill="#C9A07D"/><circle cx="250" cy="122" r="5" fill="#C9A07D"/>` },
  },
  'mood-dirty-3': {
    title: '该洗澡了 · 三级', note: '脏透了：浑身是泥站在泥坑里，三只苍蝇围着转，臭气一阵阵往上冒。',
    css: `.itch{animation:itch 1.6s ease-in-out infinite;transform-origin:190px 298px}
    .fly{animation:orbit 2.2s linear infinite;transform-origin:220px 90px}
    .fly2{animation:orbit 1.7s linear -.6s infinite reverse;transform-origin:200px 110px}
    .fly3{animation:orbit 2.6s linear -1.3s infinite;transform-origin:260px 120px}
    .wing{animation:buzz .12s linear infinite;transform-box:fill-box;transform-origin:50% 100%}
    .stink{animation:stink 2s ease-in-out infinite}.stink2{animation:stink 2s ease-in-out -1s infinite}
    @keyframes itch{0%,50%,100%{transform:rotate(0)}60%{transform:rotate(-2deg)}70%{transform:rotate(2deg)}80%{transform:rotate(-1deg)}}
    @keyframes orbit{to{transform:rotate(360deg)}}
    @keyframes buzz{50%{transform:scaleY(.4)}}
    @keyframes stink{0%,100%{opacity:0;transform:translateY(10px) scale(.8)}50%{opacity:.85;transform:translateY(-10px) scale(1)}}`,
    wrap: 'itch',
    pig: { face: `<path d="M226 76c16-6 32 2 30 15s-22 12-32 6-12-19 2-21Z" fill="#9C7150"/>
    <path d="M276 160c11-3 22 4 20 13s-14 11-22 6-9-17 2-19Z" fill="#9C7150"/>
    <path d="M150 84c10-4 22 0 20 9s-14 10-20 6-8-12 0-15Z" fill="#9C7150"/>
    <path d="M58 140c8-2 14 4 12 10s-10 6-14 2-4-11 2-12Z" fill="#9C7150"/>
    <ellipse cx="200" cy="210" rx="14" ry="9" fill="#9C7150"/><circle cx="250" cy="122" r="6" fill="#9C7150"/><circle cx="296" cy="100" r="5" fill="#9C7150"/>
    <path d="M86 258h37v14a18 18 0 0 1-37 0ZM152 262h39v20a19 19 0 0 1-39 0ZM269 236h39v6a19 19 0 0 1-39 0Z" fill="#9C7150"/>` },
    under: `<ellipse cx="200" cy="298" rx="150" ry="14" fill="#8A6A4D"/>
    <g class="stink"><circle cx="300" cy="40" r="16" fill="#C5DCA8"/><circle cx="318" cy="30" r="12" fill="#C5DCA8"/></g>
    <g class="stink2"><circle cx="70" cy="60" r="13" fill="#C5DCA8"/><circle cx="56" cy="48" r="10" fill="#C5DCA8"/></g>
    <path d="M336 298c-15 0-21-9-15-15-6-7 0-15 9-15-3-9 6-15 13-13 9 0 15 6 13 13 9 0 15 9 9 15 6 6 0 15-15 15Z" fill="#7A4C30"/>`,
    over: [['fly', 220, 20], ['fly2', 200, 50], ['fly3', 260, 60]].map(([c, x, y]) =>
      `<g class="${c}"><g transform="translate(${x} ${y})"><ellipse class="wing" cx="-6" cy="-8" rx="6" ry="9" fill="#DDEFF7"/><ellipse class="wing" cx="6" cy="-8" rx="6" ry="9" fill="#DDEFF7"/><circle r="7" fill="#3E3A35"/></g></g>`).join(''),
  },
  'mood-lonely-1': {
    title: '孤单 · 一级', note: '有点闷：叹一口气，头顶冒个省略号。',
    css: `.sway{animation:sway 4.4s ease-in-out infinite;transform-origin:190px 298px}
    .sigh{animation:sigh 4.4s ease-out infinite}
    .dots{animation:dots 4.4s ease-in-out infinite}
    @keyframes sway{0%,100%{transform:rotate(0)}50%{transform:rotate(1.5deg) translateY(1px)}}
    @keyframes sigh{0%,40%{opacity:0;transform:translate(0,0) scale(.6)}55%{opacity:.9}100%{opacity:0;transform:translate(-26px,8px) scale(1.2)}}
    @keyframes dots{0%,20%,100%{opacity:.35}35%,85%{opacity:1}}`,
    wrap: 'sway',
    over: `<g class="sigh"><circle cx="54" cy="206" r="10" fill="#E6EEF4"/><circle cx="40" cy="214" r="7" fill="#E6EEF4"/></g>
    <g class="dots" fill="#A7A39B"><circle cx="150" cy="24" r="7"/><circle cx="174" cy="24" r="7"/><circle cx="198" cy="24" r="7"/></g>`,
  },
  'mood-lonely-3': {
    title: '孤单 · 三级', note: '伤心大哭：眼泪成两道小瀑布，脚下积了一摊泪，头顶乌云打雷下大雨。',
    css: `.sob{animation:sob .9s ease-in-out infinite;transform-origin:190px 298px}
    .tail{animation:none}.ear2{animation:none}
    .stream{animation:stream .5s linear infinite}
    .rain{animation:rain .6s linear infinite}
    .bolt{animation:bolt 2.4s steps(1) infinite}
    .puddle{animation:puddle 2.4s ease-in-out infinite;transform-origin:150px 298px}
    @keyframes sob{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(3px) scale(1.01,.98)}}
    @keyframes stream{to{stroke-dashoffset:-24}}
    @keyframes rain{0%{opacity:0;transform:translateY(0)}30%{opacity:1}100%{opacity:0;transform:translateY(34px)}}
    @keyframes bolt{0%,70%,80%,100%{opacity:0}72%,78%{opacity:1}}
    @keyframes puddle{50%{transform:scaleX(1.08)}}`,
    wrap: 'sob',
    pig: { face: `<path d="M82 158Q91 163 100 158M156 173Q165 178 174 173" fill="none" stroke="#6EC3EA" stroke-width="7" stroke-linecap="round"/>
    <path class="stream" d="M98 160C104 200 96 240 104 290M172 175C178 210 172 250 178 290" fill="none" stroke="#7FCDEE" stroke-width="9" stroke-linecap="round" stroke-dasharray="14 10"/>` },
    under: `<ellipse class="puddle" cx="150" cy="298" rx="100" ry="10" fill="#BFE6F6"/>`,
    over: `<path d="M86 30a28 28 0 0 1 50-18 32 32 0 0 1 60 10 22 22 0 0 1-2 44H94a26 26 0 0 1-8-36Z" fill="#9AA2B0"/>
    <path class="bolt" d="M156 76l-12 24h14l-10 22" fill="none" stroke="#FFD35A" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="rain" d="M104 80v14M128 80v14M184 80v14M204 80v14" fill="none" stroke="#8FB6D8" stroke-width="5" stroke-linecap="round"/>`,
  },
  'mood-sick-1': {
    title: '生病 · 一级', note: '有点不舒服：脸微微发红，隔一会儿打个喷嚏，一滴鼻涕飞出去。',
    css: `.sneeze{animation:sneeze 3.2s ease-in-out infinite;transform-origin:190px 298px}
    .spray{animation:spray 3.2s ease-out infinite}
    @keyframes sneeze{0%,55%,100%{transform:rotate(0)}65%{transform:rotate(2deg) translateY(-2px)}72%{transform:rotate(-4deg) translateX(-6px)}80%{transform:rotate(0)}}
    @keyframes spray{0%,70%{opacity:0;transform:translate(0,0)}74%{opacity:1}100%{opacity:0;transform:translate(-30px,6px)}}`,
    wrap: 'sneeze',
    pig: { blush: cheeks(16, 9, '#FF7F7F', '.35') },
    over: `<g class="spray">${drop(60, 196, 1.2, '#CDEBA8', '')}<path d="M48 176l-12-6M46 190l-14 0" fill="none" stroke="#D8D2C6" stroke-width="5" stroke-linecap="round"/></g>`,
  },
  'mood-sick-3': {
    title: '生病 · 三级', note: '病重：闭着眼蔫蔫地晃，头上压着冰袋，旁边吊着点滴，冒冷汗、眼前打转。',
    css: `.droop{animation:droop 3.6s ease-in-out infinite;transform-origin:190px 298px}
    .tail{animation:none}.ear2{animation:none}
    .swirl{animation:spin 2.4s linear infinite;transform-box:fill-box;transform-origin:50% 50%}
    .drip{animation:drip 1.6s ease-in infinite}
    .sweat{animation:slide 2.4s ease-in infinite}.sweat2{animation:slide 2.4s ease-in -1.2s infinite}
    @keyframes droop{0%,100%{transform:rotate(1.5deg) translateY(2px)}50%{transform:rotate(3.5deg) translateY(5px)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes drip{0%{opacity:0;transform:translateY(0)}20%{opacity:1}100%{opacity:0;transform:translateY(30px)}}
    @keyframes slide{0%,20%{opacity:0;transform:translateY(0)}40%{opacity:1}100%{opacity:0;transform:translateY(28px)}}`,
    wrap: 'droop', hat: true,
    pig: {
      eyes: 'closed',
      blush: cheeks(20, 11, '#B9C6E8', '.45'),
      face: `<path d="M86 92C96 70 150 66 168 88C158 108 98 112 86 92Z" fill="#CDEBF7"/>
    <path d="M110 78l8 8M134 76l6 8" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
    <path d="M128 66V54" fill="none" stroke="#7FBFD6" stroke-width="6" stroke-linecap="round"/>
    ${drop(66, 120, 1.4, '#9FD8F0', 'sweat')}${drop(186, 128, 1.2, '#9FD8F0', 'sweat2')}`,
    },
    under: `<path d="M352 300V10M332 10H356" fill="none" stroke="#B5BCC6" stroke-width="7" stroke-linecap="round"/>
    <rect x="322" y="14" width="30" height="44" rx="10" fill="#E3F2FA"/><rect x="326" y="34" width="22" height="20" rx="6" fill="#BFE0F0"/>
    <path d="M336 58C336 110 330 160 320 200" fill="none" stroke="#D4E6F0" stroke-width="4"/>
    <g class="drip"><circle cx="337" cy="66" r="4" fill="#9FD3E6"/></g>`,
    over: `<path class="swirl" d="M130 18a10 10 0 1 1 10 10 16 16 0 1 1-16-16 22 22 0 1 1 22 22" fill="none" stroke="#B49CD8" stroke-width="5" stroke-linecap="round"/>`,
  },

  // ---- away ----
  'away-work': {
    title: '打工', note: '站在小桌前对着笔记本，头一点一点地敲键盘；桌角一杯热咖啡。',
    css: `.type{animation:type .35s ease-in-out infinite;transform-origin:190px 298px}
    .keys{animation:keys .35s steps(2) infinite}
    .steam{animation:steam 2s ease-in-out infinite}
    @keyframes type{50%{transform:translateY(3px) rotate(.8deg)}}
    @keyframes keys{50%{opacity:0}}
    @keyframes steam{0%,100%{opacity:0;transform:translateY(6px)}50%{opacity:.9;transform:translateY(-6px)}}`,
    wrap: 'type',
    over: `<rect x="28" y="252" width="170" height="12" rx="6" fill="#C69C6D"/>
    <rect x="38" y="264" width="12" height="36" rx="6" fill="#B0875A"/><rect x="176" y="264" width="12" height="36" rx="6" fill="#B0875A"/>
    <path d="M36 250L46 214H112L104 250Z" fill="#B9C2CC"/>
    <ellipse cx="76" cy="232" rx="9" ry="6" fill="#D5DCE3"/>
    <rect x="34" y="246" width="96" height="8" rx="4" fill="#98A3AE"/>
    <path class="keys" d="M118 236l8-6M124 244l10-2" fill="none" stroke="#9FA9B4" stroke-width="4" stroke-linecap="round"/>
    <path class="steam" d="M156 214q-5-7 0-14t0-14M170 214q-5-7 0-14" fill="none" stroke="#D8CFC2" stroke-width="4" stroke-linecap="round"/>
    <path d="M148 222H178V246C178 250 175 252 171 252H155C151 252 148 250 148 246Z" fill="#FFFFFF"/>
    <path d="M178 228C190 228 190 244 178 244" fill="none" stroke="#FFFFFF" stroke-width="5"/>`,
  },
  'away-study': {
    title: '上课', note: '戴上圆眼镜，看着前面摊开的书，慢慢歪头想；想通了亮一盏灯泡。',
    css: `.tilt{animation:tilt 2.4s ease-in-out infinite;transform-origin:190px 298px}
    .idea{animation:idea 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 50%}
    .page{animation:flip 4.8s ease-in-out infinite;transform-origin:104px 272px}
    @keyframes tilt{0%,100%{transform:rotate(0)}35%{transform:rotate(-3deg)}70%{transform:rotate(-1deg)}}
    @keyframes idea{0%,40%,100%{opacity:0;transform:scale(.6)}55%,85%{opacity:1;transform:scale(1)}}
    @keyframes flip{0%,70%,100%{transform:scaleX(1)}80%{transform:scaleX(-1)}90%{transform:scaleX(1)}}`,
    wrap: 'tilt',
    pig: { face: `<g fill="none" stroke="#7A5A3A" stroke-width="5"><circle cx="91" cy="142" r="20"/><circle cx="165" cy="157" r="20"/><path d="M111 145L145 152M71 138L58 132"/></g>` },
    under: `<g class="idea"><circle cx="230" cy="-4" r="22" fill="#FFE27A"/><rect x="220" y="16" width="20" height="12" rx="4" fill="#C9C3B8"/>
    <path d="M230-38v-10M262-22l8-8M198-22l-8-8" fill="none" stroke="#FFD35A" stroke-width="5" stroke-linecap="round"/></g>`,
    over: `<path d="M36 278L104 266V300L36 300Z" fill="#FFFDF6"/>
    <path class="page" d="M104 266L172 278V300L104 300Z" fill="#F3EEDF"/>
    <path d="M48 282L92 274M48 292L92 284" fill="none" stroke="#D9D2C0" stroke-width="4" stroke-linecap="round"/>
    <path d="M186 296L250 286" fill="none" stroke="#F5C24C" stroke-width="9" stroke-linecap="round"/>
    <path d="M250 286L262 284" fill="none" stroke="#E7A9A2" stroke-width="9" stroke-linecap="round"/>`,
  },
  'away-trip': {
    title: '旅行', note: '戴草帽、背小包往前走，一颠一颠，脚下的路往后退。',
    css: TRIP_CSS,
    wrap: 'walk', hat: true,
    pig: { face: TRIP_GEAR },
    under: TRIP_ROAD,
  },

  // ---- reactions ----
  'react-eat': {
    title: '喂食', note: '低头对着食盆啃胡萝卜（参考 sample 的「猪进食」），一点一点地嚼，渣渣往外蹦。',
    css: `.chomp{animation:chomp .42s ease-in-out infinite;transform-origin:190px 298px}
    .blush{animation:puff .42s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 50%}
    .c1{animation:crumb .84s ease-out infinite}.c2{animation:crumb .84s ease-out -.42s infinite}
    .tail{animation-duration:.42s}
    @keyframes chomp{0%,100%{transform:rotate(3deg)}50%{transform:rotate(5deg) translateY(3px)}}
    @keyframes puff{50%{transform:scale(1.35)}}
    @keyframes crumb{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-18px,-24px)}}`,
    wrap: 'chomp',
    pig: { eyes: 'happy', face: `<path d="M96 210L58 244" fill="none" stroke="#F49A4A" stroke-width="16" stroke-linecap="round"/><path d="M66 232l5 5M78 222l5 5" fill="none" stroke="#D97B2E" stroke-width="4" stroke-linecap="round"/>` },
    over: `<path class="c1" d="M66 214h.1M82 204h.1" fill="none" stroke="#F49A4A" stroke-width="8" stroke-linecap="round"/>
    <path class="c2" d="M56 222h.1M90 210h.1" fill="none" stroke="#F49A4A" stroke-width="6" stroke-linecap="round"/>
    <path d="M28 258H140L130 290C129 295 125 298 120 298H48C43 298 39 295 38 290Z" fill="#7FB3D5"/>
    <rect x="26" y="252" width="116" height="12" rx="6" fill="#9CC7E0"/>
    <path d="M60 252C60 238 80 234 84 252M100 252l10-14 10 14" fill="#7DBF6A"/>`,
  },
  'react-bathe': {
    title: '洗澡', note: '泡在小木盆里闭眼享受，头顶一堆泡沫，泡泡往上冒。',
    css: `.soak{animation:soak 1.6s ease-in-out infinite;transform-origin:190px 298px}
    .foam{animation:foam 1.6s ease-in-out infinite;transform-origin:150px 80px}
    .b1{animation:rise 2s ease-out infinite}.b2{animation:rise 2s ease-out -.7s infinite}.b3{animation:rise 2s ease-out -1.4s infinite}
    .ripple{animation:ripple 1.6s ease-in-out infinite}
    @keyframes soak{50%{transform:translateY(4px) rotate(-1deg)}}
    @keyframes foam{50%{transform:scale(1.06,.94)}}
    @keyframes rise{0%{opacity:0;transform:translateY(10px)}20%{opacity:1}100%{opacity:0;transform:translateY(-80px)}}
    @keyframes ripple{50%{transform:translateX(8px)}}`,
    wrap: 'soak', hat: true,
    pig: { eyes: 'closed', face: `<g class="foam" fill="#FFFFFF"><circle cx="110" cy="72" r="24"/><circle cx="146" cy="56" r="30"/><circle cx="186" cy="68" r="22"/><circle cx="140" cy="84" r="20"/><circle cx="136" cy="44" r="6" fill="#DDF1FB"/></g>` },
    over: `<path d="M34 208H348L330 290C329 296 323 300 316 300H66C59 300 53 296 52 290Z" fill="#C69C6D"/>
    <path d="M40 232H342M46 256H336M50 280H332" fill="none" stroke="#B0875A" stroke-width="5"/>
    <path class="ripple" d="M28 208C48 198 68 216 88 208S128 198 148 208 188 216 208 208 248 198 268 208 308 216 328 208 352 202 360 208V218H28Z" fill="#AEDCF2"/>
    <circle class="b1" cx="292" cy="190" r="13" fill="none" stroke="#9FD3E6" stroke-width="5"/>
    <circle class="b2" cx="326" cy="180" r="9" fill="none" stroke="#9FD3E6" stroke-width="5"/>
    <circle class="b3" cx="262" cy="196" r="7" fill="none" stroke="#9FD3E6" stroke-width="5"/>`,
  },
  'react-play': {
    title: '玩耍', note: '高兴得原地蹦起来翻个跟头（参考 sample 里打滚的猪），落地再颠两下。',
    css: `.flip{animation:flip 1.6s cubic-bezier(.4,0,.3,1) infinite;transform-origin:190px 170px}
    .tail{animation-duration:.3s}
    .s1{animation:pop 1.6s ease-out infinite;transform-box:fill-box;transform-origin:50% 50%}
    .s2{animation:pop 1.6s ease-out -.8s infinite;transform-box:fill-box;transform-origin:50% 50%}
    @keyframes flip{0%{transform:translateY(0) rotate(0)}15%{transform:translateY(8px) scale(1.04,.94)}50%{transform:translateY(-40px) rotate(-360deg)}70%{transform:translateY(0) rotate(-360deg) scale(1.04,.95)}82%{transform:translateY(-10px) rotate(-360deg)}100%{transform:translateY(0) rotate(-360deg)}}
    @keyframes pop{0%{opacity:0;transform:scale(.4)}40%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.2)}}`,
    wrap: 'flip',
    pig: { eyes: 'happy' },
    under: sparkle(60, 30, 22, '#FFD35A', 's1') + sparkle(330, 40, 18, '#FF9FB0', 's2'),
  },
  'react-pet': {
    title: '摸摸', note: '一只手在头上轻轻拍，眯眼往上蹭，小心心冒出来。',
    css: `.nuzzle{animation:nuzzle .6s ease-in-out infinite;transform-origin:190px 298px}
    .hand{animation:pat .6s ease-in-out infinite}
    .tail{animation-duration:.3s}
    .h1{animation:rise 1.2s ease-out infinite;transform-box:fill-box;transform-origin:50% 100%}
    .h2{animation:rise 1.2s ease-out -.6s infinite;transform-box:fill-box;transform-origin:50% 100%}
    @keyframes nuzzle{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.96) rotate(-1.5deg)}}
    @keyframes pat{0%,100%{transform:translateY(-10px)}50%{transform:translateY(6px)}}
    @keyframes rise{0%{opacity:0;transform:translateY(12px) scale(.5)}30%{opacity:1}100%{opacity:0;transform:translateY(-30px) scale(1)}}`,
    wrap: 'nuzzle',
    pig: { eyes: 'happy', blush: cheeks(18, 10, '#FF9AA0', '.6') },
    over: `<g class="hand"><g transform="translate(14 28)"><path d="M88 22C92 2 132-2 152 8 166 15 166 32 152 36H106C96 36 86 32 88 22Z" fill="#FBE3CF"/>
    <path d="M108 8V32M124 6V32M140 8V32" fill="none" stroke="#EBC9AE" stroke-width="4" stroke-linecap="round"/>
    <path d="M152 20H230" fill="none" stroke="#FBE3CF" stroke-width="24" stroke-linecap="round"/></g></g>
    ${heart(250, 20, 1.2, '#FF7A93', 'h1')}${heart(300, 50, .9, '#FF9FB0', 'h2')}`,
  },
  'react-refuse': {
    title: '拒绝', note: '一扭身背过去（参考 sample 转身的帧），头顶冒火、鼻子喷气，过一会儿再转回来。',
    css: `.turn{animation:turn 1.6s ease-in-out infinite;transform-origin:190px 298px}
    .tail{animation-duration:.25s}
    .vein{animation:throb .4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 50%}
    .puff{animation:puff 1.6s ease-out infinite}
    @keyframes turn{0%,100%{transform:scaleX(1)}15%,80%{transform:scaleX(-1)}35%,55%{transform:scaleX(-1) rotate(2deg)}45%{transform:scaleX(-1) rotate(-2deg)}}
    @keyframes throb{50%{transform:scale(1.25)}}
    @keyframes puff{0%,15%{opacity:0;transform:translate(0,0) scale(.6)}35%{opacity:1}70%,100%{opacity:0;transform:translate(26px,-10px) scale(1.3)}}`,
    wrap: 'turn',
    over: `<path class="vein" d="M250 0l10 10M270 0l-10 10M250 30l10-10M270 30l-10-10" fill="none" stroke="#E5534B" stroke-width="7" stroke-linecap="round"/>
    <g class="puff"><circle cx="320" cy="200" r="11" fill="#ECE6DC"/><circle cx="340" cy="190" r="8" fill="#ECE6DC"/></g>`,
  },
  'react-cure': {
    title: '病愈', note: '额头贴着创可贴，精神地挺一下，绿十字和光点往上飘。',
    css: `.glow{animation:glow 1.2s ease-in-out infinite;transform-origin:190px 170px}
    .stand{animation:stand 1.2s ease-out infinite;transform-origin:190px 298px}
    .c1{animation:rise 1.4s ease-out infinite}.c2{animation:rise 1.4s ease-out -.5s infinite}.c3{animation:rise 1.4s ease-out -1s infinite}
    @keyframes glow{0%,100%{opacity:.35;transform:scale(.92)}50%{opacity:.7;transform:scale(1.04)}}
    @keyframes stand{0%{transform:scale(1.04,.94)}30%{transform:scale(.98,1.04) translateY(-8px)}60%,100%{transform:scale(1)}}
    @keyframes rise{0%{opacity:0;transform:translateY(16px)}30%{opacity:1}100%{opacity:0;transform:translateY(-44px)}}`,
    wrap: 'stand',
    pig: { face: `<path d="M110 96L156 86L160 104L114 114Z" fill="#F6D7A7"/><path d="M128 100l12-3" fill="none" stroke="#E5BD84" stroke-width="6" stroke-linecap="round"/>` },
    under: `<ellipse class="glow" cx="190" cy="170" rx="168" ry="140" fill="#DFF3D4"/>`,
    over: `<path class="c1" d="M48 60h12V48h12v12h12v12H72v12H60V72H48Z" fill="#6CC27A"/>
    <path class="c2" d="M300 30h9v-9h9v9h9v9h-9v9h-9v-9h-9Z" fill="#6CC27A"/>
    <circle class="c3" cx="260" cy="10" r="7" fill="#FFE27A"/>`,
  },

  // ---- careers (data.js JOBS, tier 'pro'): job-<art>.svg while at work ----
  'job-aitrainer': {
    title: 'AI 训练师', note: '戴着眼镜对着笔记本调模型，头顶的神经网络一层层亮起来。',
    css: `.type{animation:type .4s ease-in-out infinite;transform-origin:190px 298px}
    .n{animation:fire 1.8s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 50%}
    .n2{animation-delay:.3s}.n3{animation-delay:.6s}
    .keys{animation:keys .4s steps(2) infinite}
    @keyframes type{50%{transform:translateY(3px) rotate(.6deg)}}
    @keyframes fire{0%,100%{fill:#D9DDF2;transform:scale(1)}30%{fill:#7C8CF0;transform:scale(1.25)}}
    @keyframes keys{50%{opacity:0}}`,
    wrap: 'type',
    pig: { face: `<g fill="none" stroke="#5B5F73" stroke-width="5"><circle cx="91" cy="142" r="20"/><circle cx="165" cy="157" r="20"/><path d="M111 145L145 152M71 138L58 132"/></g>` },
    under: `<g stroke="#C9CEE8" stroke-width="3">
    <path d="M190 -14L240 -24M190 -14L240 6M190 -14L240 36M190 22L240 -24M190 22L240 6M190 22L240 36M240 -24L290 -6M240 6L290 -6M240 36L290 -6M240 -24L290 24M240 6L290 24M240 36L290 24"/></g>
    <circle class="n" cx="190" cy="-14" r="10" fill="#D9DDF2"/><circle class="n" cx="190" cy="22" r="10" fill="#D9DDF2"/>
    <circle class="n n2" cx="240" cy="-24" r="10" fill="#D9DDF2"/><circle class="n n2" cx="240" cy="6" r="10" fill="#D9DDF2"/><circle class="n n2" cx="240" cy="36" r="10" fill="#D9DDF2"/>
    <circle class="n n3" cx="290" cy="-6" r="10" fill="#D9DDF2"/><circle class="n n3" cx="290" cy="24" r="10" fill="#D9DDF2"/>`,
    over: `<rect x="28" y="252" width="170" height="12" rx="6" fill="#C69C6D"/>
    <rect x="38" y="264" width="12" height="36" rx="6" fill="#B0875A"/><rect x="176" y="264" width="12" height="36" rx="6" fill="#B0875A"/>
    <path d="M36 250L46 210H118L110 250Z" fill="#4B5068"/>
    <circle cx="80" cy="230" r="8" fill="#7C8CF0"/>
    <rect x="34" y="246" width="100" height="8" rx="4" fill="#3A3E52"/>
    <path class="keys" d="M124 236l8-6M130 244l10-2" fill="none" stroke="#9FA9B4" stroke-width="4" stroke-linecap="round"/>`,
  },
  'job-influencer': {
    title: '网红', note: '环形补光灯前对着手机摆姿势，换个角度再拍一张，点赞和小心心往上冒。',
    css: `.pose{animation:pose 2s ease-in-out infinite;transform-origin:190px 298px}
    .flash{animation:flash 2s steps(1) infinite}
    .h1{animation:rise 2s ease-out infinite;transform-box:fill-box;transform-origin:50% 100%}
    .h2{animation:rise 2s ease-out -.7s infinite;transform-box:fill-box;transform-origin:50% 100%}
    .h3{animation:rise 2s ease-out -1.4s infinite;transform-box:fill-box;transform-origin:50% 100%}
    @keyframes pose{0%,40%{transform:rotate(-3deg)}50%,90%{transform:rotate(2deg) translateY(-4px)}100%{transform:rotate(-3deg)}}
    @keyframes flash{0%,44%,56%,94%,100%{opacity:0}46%,96%{opacity:1}}
    @keyframes rise{0%{opacity:0;transform:translateY(16px) scale(.5)}25%{opacity:1}100%{opacity:0;transform:translateY(-60px) scale(1)}}`,
    wrap: 'pose',
    pig: { eyes: 'happy', blush: cheeks(18, 10, '#FF9AA0', '.6') },
    under: `<circle cx="170" cy="140" r="150" fill="none" stroke="#FFF4C8" stroke-width="26"/>
    <circle cx="170" cy="140" r="150" fill="none" stroke="#FFE27A" stroke-width="6"/>`,
    over: `<path d="M44 300L44 214M44 300L24 300M44 300L64 300" fill="none" stroke="#5B5F73" stroke-width="6" stroke-linecap="round"/>
    <rect x="28" y="150" width="34" height="64" rx="8" fill="#3A3E52"/><rect x="32" y="156" width="26" height="50" rx="5" fill="#9FD3E6"/>
    <circle class="flash" cx="45" cy="160" r="22" fill="#FFFFFF" opacity=".9"/>
    ${heart(30, 110, .9, '#FF7A93', 'h1')}${heart(56, 100, .7, '#FF9FB0', 'h2')}
    <g class="h3"><path d="M34 120h8v18h-8ZM44 138V122l6-10c4 0 6 3 5 7l-2 5h9c4 0 6 3 5 6l-3 8H44Z" fill="#6FA8DC"/></g>`,
  },
  'job-vtuber': {
    title: 'VTuber', note: '戴着耳麦对着麦克风直播，嘴巴（鼻子）一动一动，屏幕上的小猪头像跟着动，弹幕往上飘。',
    css: `.bob{animation:bob .8s ease-in-out infinite;transform-origin:190px 298px}
    .snout{animation:talk .28s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 50%}
    .live{animation:live 1s steps(1) infinite}
    .avatar{animation:bob .8s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
    .wave{animation:wave .8s ease-out infinite}
    .chat1{animation:chat 3s linear infinite}.chat2{animation:chat 3s linear -1s infinite}.chat3{animation:chat 3s linear -2s infinite}
    @keyframes bob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(-1deg)}}
    @keyframes talk{50%{transform:scale(1.06,.94)}}
    @keyframes live{50%{opacity:.2}}
    @keyframes wave{0%{opacity:0;transform:translateX(0)}40%{opacity:1}100%{opacity:0;transform:translateX(-16px)}}
    @keyframes chat{0%{opacity:0;transform:translateY(30px)}15%,80%{opacity:1}100%{opacity:0;transform:translateY(-40px)}}`,
    wrap: 'bob', hat: true,
    pig: { face: `<path d="M62 128C62 50 200 34 222 110" fill="none" stroke="#5B5F73" stroke-width="12" stroke-linecap="round"/>
    <ellipse cx="64" cy="132" rx="15" ry="22" fill="#8E7CC3"/><ellipse cx="220" cy="116" rx="15" ry="22" fill="#8E7CC3"/>
    <path d="M58 150Q44 196 64 212" fill="none" stroke="#5B5F73" stroke-width="5" stroke-linecap="round"/>
    <circle cx="68" cy="214" r="9" fill="#3A3E52"/>` },
    under: `<rect x="228" y="-30" width="122" height="84" rx="10" fill="#3A3E52"/><rect x="236" y="-22" width="106" height="68" rx="6" fill="#2A2D3C"/>
    <g class="avatar"><circle cx="300" cy="24" r="20" fill="#FFD1AF"/><path d="M286 8C282 2 288-2 292 4M310 6C314 0 320 4 316 10" fill="none" stroke="#E95892" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="292" cy="30" rx="8" ry="6" fill="#FF8195"/></g>
    <circle class="live" cx="250" cy="-10" r="6" fill="#E5534B"/>
    <g class="chat1"><rect x="244" y="60" width="54" height="16" rx="8" fill="#FFE27A"/></g>
    <g class="chat2"><rect x="270" y="60" width="66" height="16" rx="8" fill="#B5E3F5"/></g>
    <g class="chat3"><rect x="250" y="60" width="44" height="16" rx="8" fill="#FFC2D1"/></g>`,
    over: `<path class="wave" d="M40 200q-8 14 0 28M28 192q-12 22 0 44" fill="none" stroke="#B49CD8" stroke-width="5" stroke-linecap="round"/>`,
  },
  'job-coach': {
    title: '健身教练', note: '绑着头带、挂着哨子，一下一下举哑铃带大家练，汗珠往外甩。',
    css: `.squat{animation:squat 1.2s ease-in-out infinite;transform-origin:190px 298px}
    .bell{animation:lift 1.2s ease-in-out infinite}
    .s1{animation:fling 1.2s ease-out infinite}.s2{animation:fling 1.2s ease-out -.6s infinite}
    @keyframes squat{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.94)}}
    @keyframes lift{0%,100%{transform:translateY(0)}50%{transform:translateY(-70px)}}
    @keyframes fling{0%{opacity:0;transform:translate(0,0)}20%{opacity:1}100%{opacity:0;transform:translate(26px,-30px)}}`,
    wrap: 'squat',
    pig: { face: `<path d="M64 112L196 128L194 146L60 130Z" fill="#E5534B"/><path d="M64 120L195 136" fill="none" stroke="#FFFFFF" stroke-width="4"/>
    <path d="M120 214Q150 240 190 226" fill="none" stroke="#5B5F73" stroke-width="4"/><rect x="138" y="228" width="22" height="14" rx="6" fill="#F5C24C"/>
    ${drop(220, 70, 1.3, '#9FD8F0', 's1')}${drop(60, 100, 1.1, '#9FD8F0', 's2')}` },
    over: `<g class="bell"><path d="M28 236H118" fill="none" stroke="#5B5F73" stroke-width="8" stroke-linecap="round"/>
    <rect x="22" y="216" width="20" height="40" rx="6" fill="#3A3E52"/><rect x="104" y="216" width="20" height="40" rx="6" fill="#3A3E52"/></g>`,
  },

  // ---- scratch card (shop, action 'lottery'): scratch first, then the result ----
  'lottery-scratch': {
    title: '刮彩票', note: '捧着一张彩票，拿硬币来回刮，银屑往外飞。',
    css: `.lean{animation:lean .6s ease-in-out infinite;transform-origin:190px 298px}
    .coin{animation:scratch .3s ease-in-out infinite}
    .bits{animation:bits .3s ease-out infinite}
    @keyframes lean{50%{transform:rotate(1.5deg) translateY(2px)}}
    @keyframes scratch{0%,100%{transform:translateX(0)}50%{transform:translateX(44px)}}
    @keyframes bits{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-10px,20px)}}`,
    wrap: 'lean',
    over: `<rect x="24" y="206" width="120" height="74" rx="8" fill="#F5C24C"/>
    <rect x="34" y="216" width="100" height="54" rx="5" fill="#C9CED6"/>
    <path d="M40 232h30M40 248h44" fill="none" stroke="#E7D9A8" stroke-width="6" stroke-linecap="round"/>
    <g class="coin"><circle cx="58" cy="226" r="14" fill="#FFD35A"/><circle cx="58" cy="226" r="9" fill="none" stroke="#E5B33A" stroke-width="3"/></g>
    <g class="bits" fill="#AEB4BE"><circle cx="70" cy="256" r="3"/><circle cx="96" cy="262" r="2.5"/><circle cx="82" cy="270" r="3"/></g>`,
  },
  'lottery-jackpot': {
    title: '一等奖', note: '一等奖！高兴得原地转圈，金币哗啦啦往下掉。',
    css: `.spin{animation:spin 1s ease-in-out infinite;transform-origin:190px 170px}
    .tail{animation-duration:.25s}
    .c{animation:fall 1.2s linear infinite}
    .c2{animation-delay:-.4s}.c3{animation-delay:-.8s}
    .sp{animation:pop 1s ease-out infinite;transform-box:fill-box;transform-origin:50% 50%}
    @keyframes spin{0%{transform:translateY(0) rotate(0)}50%{transform:translateY(-24px) rotate(-180deg)}100%{transform:translateY(0) rotate(-360deg)}}
    @keyframes fall{0%{opacity:0;transform:translateY(-40px) rotate(0)}15%{opacity:1}100%{opacity:0;transform:translateY(300px) rotate(180deg)}}
    @keyframes pop{0%{opacity:0;transform:scale(.4)}40%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.3)}}`,
    wrap: 'spin',
    pig: { eyes: 'happy', blush: cheeks(18, 10, '#FF9AA0', '.6') },
    under: [[50, ''], [110, 'c2'], [180, 'c3'], [250, ''], [320, 'c2'], [80, 'c3'], [290, 'c3']].map(([x, d]) =>
      `<g class="c ${d}"><circle cx="${x}" cy="-20" r="12" fill="#FFD35A"/><circle cx="${x}" cy="-20" r="7" fill="none" stroke="#E5B33A" stroke-width="3"/></g>`).join('')
      + sparkle(40, 40, 22, '#FFE27A', 'sp') + sparkle(340, 60, 18, '#FFE27A', 'sp'),
  },
  'lottery-win': {
    title: '中奖了', note: '中了二三等奖或安慰奖：吹响派对喇叭，彩带撒下来，开心地颠两下。',
    css: `.hop{animation:hop .7s ease-in-out infinite;transform-origin:190px 298px}
    .horn{animation:blow .7s ease-in-out infinite;stroke-dasharray:70;transform-origin:56px 186px}
    .f{animation:fall 1.6s linear infinite}
    .f2{animation-delay:-.5s}.f3{animation-delay:-1.1s}
    @keyframes hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
    @keyframes blow{0%,100%{stroke-dashoffset:60}40%,70%{stroke-dashoffset:0}}
    @keyframes fall{0%{opacity:0;transform:translateY(-30px) rotate(0)}15%{opacity:1}100%{opacity:0;transform:translateY(260px) rotate(240deg)}}`,
    wrap: 'hop',
    pig: { eyes: 'happy', face: `<path d="M80 188L50 170L48 204Z" fill="#6FA8DC"/><path d="M80 188L50 170" fill="none" stroke="#F5C24C" stroke-width="4"/>
    <path class="horn" d="M48 186C30 186 20 176 24 166S40 160 38 172" fill="none" stroke="#FF7A93" stroke-width="7" stroke-linecap="round"/>` },
    under: [[60, '#FF7A93', ''], [120, '#6FA8DC', 'f2'], [190, '#FFD35A', 'f3'], [250, '#7DBF6A', ''], [320, '#B49CD8', 'f2'], [290, '#FF9FB0', 'f3']].map(([x, c, d]) =>
      `<g class="f ${d}"><rect x="${x}" y="-20" width="8" height="18" rx="2" fill="${c}"/></g>`).join('')
      + `<path d="M40 -10Q90 30 140 0T240 0T340 -10" fill="none" stroke="#FFC2D1" stroke-width="5"/>`,
  },
  'lottery-lose': {
    title: '谢谢参与', note: '没中：彩票掉在脚边，蔫蔫地低着头，头顶一朵乌云下雨。',
    css: `.droop{animation:droop 2s ease-in-out infinite;transform-origin:190px 298px}
    .tail{animation:none}.ear2{animation:none}
    .rain{animation:rain .7s linear infinite}.rain2{animation:rain .7s linear -.35s infinite}
    .cloud{animation:drift 2s ease-in-out infinite}
    @keyframes droop{0%,100%{transform:rotate(2deg) translateY(2px)}50%{transform:rotate(3.5deg) translateY(4px)}}
    @keyframes rain{0%{opacity:0;transform:translateY(0)}30%{opacity:1}100%{opacity:0;transform:translateY(40px)}}
    @keyframes drift{50%{transform:translateX(6px)}}`,
    wrap: 'droop',
    pig: { face: `<path d="M82 158Q91 162 100 158M156 173Q165 177 174 173" fill="none" stroke="#6EC3EA" stroke-width="6" stroke-linecap="round"/>` },
    over: `<g class="cloud"><path d="M86 34a26 26 0 0 1 46-16 30 30 0 0 1 56 10 20 20 0 0 1-2 40H94a24 24 0 0 1-8-34Z" fill="#9AA2B0"/>
    <path class="rain" d="M106 80v14M154 80v14" fill="none" stroke="#8FB6D8" stroke-width="5" stroke-linecap="round"/>
    <path class="rain2" d="M130 80v14M178 80v14" fill="none" stroke="#8FB6D8" stroke-width="5" stroke-linecap="round"/></g>
    <g transform="rotate(-12 80 286)"><rect x="40" y="272" width="80" height="26" rx="5" fill="#C9CED6"/><path d="M50 284h40" stroke="#AEB4BE" stroke-width="5" stroke-linecap="round"/></g>`,
  },

  // ---- everyday jobs (data.js JOBS, tier 'basic'): job-<art>.svg too ----
  'job-label': {
    title: 'AI 数据标注', note: '对着笔记本给图片画框打标签，框一画好就蹦出一张小标签。',
    css: `.type{animation:type .4s ease-in-out infinite;transform-origin:190px 298px}
    .box{stroke-dasharray:124;animation:draw 2s ease-in-out infinite}
    .tag{animation:tag 2s ease-out infinite}.tag2{animation:tag 2s ease-out -1s infinite}
    .keys{animation:keys .4s steps(2) infinite}
    @keyframes type{50%{transform:translateY(3px) rotate(.6deg)}}
    @keyframes draw{0%{stroke-dashoffset:124}45%,100%{stroke-dashoffset:0}}
    @keyframes tag{0%,45%{opacity:0;transform:translate(0,0)}55%{opacity:1}100%{opacity:0;transform:translate(-4px,-80px)}}
    @keyframes keys{50%{opacity:0}}`,
    wrap: 'type',
    over: `${DESK}
    <path d="M36 250L46 210H118L110 250Z" fill="#4B5068"/>
    <path d="M52 244L59 216H110L104 244Z" fill="#E6EEF4"/>
    <ellipse cx="80" cy="236" rx="12" ry="7" fill="#F2B98A"/><circle cx="92" cy="226" r="6" fill="#F2B98A"/>
    <path d="M88 220l2-5 3 5M94 220l3-5 2 5" fill="#F2B98A"/>
    <rect class="box" x="64" y="217" width="38" height="25" fill="none" stroke="#3FBF7F" stroke-width="3"/>
    <rect x="34" y="246" width="100" height="8" rx="4" fill="#3A3E52"/>
    <path class="keys" d="M124 236l8-6M130 244l10-2" fill="none" stroke="#9FA9B4" stroke-width="4" stroke-linecap="round"/>
    <g class="tag"><path d="M30 186H54L64 196L54 206H30Z" fill="#FFD35A"/><circle cx="37" cy="196" r="3" fill="#C69C6D"/></g>
    <g class="tag2"><path d="M34 186H58L68 196L58 206H34Z" fill="#9FD8F0"/><circle cx="41" cy="196" r="3" fill="#5A93C8"/></g>`,
  },
  'job-tutor': {
    title: '家教', note: '站在小黑板前讲题，粉笔字一笔一笔写出来，桌上的作业一个个打上红勾。',
    css: `.explain{animation:explain 1s ease-in-out infinite;transform-origin:190px 298px}
    .chalk{stroke-dasharray:40;animation:write 3s linear infinite}
    .tick{stroke-dasharray:40;animation:tick 3s ease-out infinite}
    .wave{animation:wave 1s ease-out infinite}
    @keyframes explain{0%,100%{transform:rotate(0)}30%{transform:rotate(-2deg)}60%{transform:rotate(.5deg)}}
    @keyframes write{0%{stroke-dashoffset:40}60%,100%{stroke-dashoffset:0}}
    @keyframes tick{0%,60%{stroke-dashoffset:40}80%,100%{stroke-dashoffset:0}}
    @keyframes wave{0%{opacity:0;transform:translateX(0)}40%{opacity:1}100%{opacity:0;transform:translateX(-14px)}}`,
    wrap: 'explain',
    under: `<rect x="26" y="-30" width="172" height="82" rx="6" fill="#8B6B4E"/><rect x="34" y="-22" width="156" height="66" rx="3" fill="#2F5D50"/>
    <g fill="none" stroke="#F4F4EC" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path class="chalk" d="M50 -8v22M62 3h16M70 -5v16M88 -8v22M100 0h16M100 8h16M126 -4q8-8 14 0t-14 18h16"/>
    <path class="chalk" d="M160 30l12-24 12 24Z"/></g>`,
    over: `<path class="wave" d="M40 200q-8 14 0 28M28 192q-12 22 0 44" fill="none" stroke="#C9B79C" stroke-width="5" stroke-linecap="round"/>
    <g transform="rotate(-6 70 274)"><rect x="32" y="252" width="76" height="46" rx="4" fill="#FFFDF6"/>
    <path d="M42 264h28M42 276h22M42 288h26" fill="none" stroke="#D9D2C0" stroke-width="4" stroke-linecap="round"/>
    <path class="tick" d="M78 268l7 8 14-16" fill="none" stroke="#E5534B" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>
    <circle cx="140" cy="284" r="14" fill="#E5534B"/><path d="M140 270q2-8 9-10" fill="none" stroke="#7DBF6A" stroke-width="4" stroke-linecap="round"/>`,
  },
  'job-office': {
    title: '上班', note: '打着领带，一份一份往文件上盖章，墙上的钟走得飞快。',
    css: `.sit{animation:sit 1.2s ease-in-out infinite;transform-origin:190px 298px}
    .stamp{animation:stamp 1.2s ease-in infinite}
    .mark{animation:mark 1.2s steps(1) infinite}
    .hand{animation:spin 2.4s linear infinite;transform-origin:306px -2px}
    .hand2{animation:spin 28.8s linear infinite;transform-origin:306px -2px}
    @keyframes sit{0%,100%{transform:rotate(0)}45%{transform:rotate(1deg) translateY(2px)}}
    @keyframes stamp{0%,30%,100%{transform:translateY(-22px)}45%,55%{transform:translateY(0)}}
    @keyframes mark{0%,45%{opacity:0}50%,95%{opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}`,
    wrap: 'sit',
    pig: { face: `<path d="M120 212h20l-4 10h-12Z" fill="#3E5C99"/><path d="M125 222h10l6 30-11 11-11-11Z" fill="#4A6FB5"/>
    <path d="M128 232l8 6M126 244l10 7" fill="none" stroke="#7FA0D8" stroke-width="3" stroke-linecap="round"/>` },
    under: `<circle cx="306" cy="-2" r="30" fill="#FFFFFF"/><circle cx="306" cy="-2" r="30" fill="none" stroke="#8B6B4E" stroke-width="6"/>
    <path class="hand2" d="M306 -2V-20" fill="none" stroke="#3A3E52" stroke-width="5" stroke-linecap="round"/>
    <path class="hand" d="M306 -2V-24" fill="none" stroke="#E5534B" stroke-width="3" stroke-linecap="round"/>`,
    over: `${DESK}
    <rect x="34" y="244" width="70" height="8" rx="2" fill="#E6E0D2"/><rect x="38" y="238" width="66" height="7" rx="2" fill="#F3EEDF"/><rect x="34" y="232" width="70" height="7" rx="2" fill="#FFFDF6"/>
    <rect class="mark" x="50" y="233" width="26" height="5" rx="2" fill="#E5534B"/>
    <g class="stamp"><rect x="48" y="220" width="30" height="10" rx="3" fill="#8B5A3C"/><rect x="56" y="198" width="14" height="24" rx="6" fill="#A8764C"/><circle cx="63" cy="196" r="9" fill="#A8764C"/></g>
    <path d="M156 222H186V246C186 250 183 252 179 252H163C159 252 156 250 156 246Z" fill="#FFFFFF"/>
    <path d="M186 228C198 228 198 244 186 244" fill="none" stroke="#FFFFFF" stroke-width="5"/>`,
  },
  'job-stall': {
    title: '摆地摊', note: '大伞底下铺块布摆满小玩意儿，晃着脑袋吆喝，卖出一件蹦一枚硬币。',
    css: `.hawk{animation:hawk 1.4s ease-in-out infinite;transform-origin:190px 298px}
    .shade{animation:shade 3s ease-in-out infinite;transform-origin:200px 300px}
    .wave{animation:wave .7s ease-out infinite}
    .coin{animation:coin 1.4s ease-out infinite}.coin2{animation:coin 1.4s ease-out -.7s infinite}
    @keyframes hawk{0%,100%{transform:rotate(0)}25%{transform:rotate(-2.5deg) translateY(-3px)}50%{transform:rotate(0)}}
    @keyframes shade{50%{transform:rotate(1deg)}}
    @keyframes wave{0%{opacity:0;transform:translateX(0)}40%{opacity:1}100%{opacity:0;transform:translateX(-16px)}}
    @keyframes coin{0%{opacity:0;transform:translateY(0)}20%{opacity:1}100%{opacity:0;transform:translateY(-60px)}}`,
    wrap: 'hawk',
    under: `<g class="shade"><path d="M200 -20V300" fill="none" stroke="#B0875A" stroke-width="8"/>
    <path d="M56 30Q200 -70 344 30Z" fill="#FF8FA3"/><path d="M200 -32L128 30H176ZM200 -32L224 30H272Z" fill="#FFFFFF"/>
    <path d="M56 30a12 12 0 0 0 24 0a12 12 0 0 0 24 0a12 12 0 0 0 24 0a12 12 0 0 0 24 0a12 12 0 0 0 24 0a12 12 0 0 0 24 0a12 12 0 0 0 24 0a12 12 0 0 0 24 0a12 12 0 0 0 24 0a12 12 0 0 0 24 0a12 12 0 0 0 24 0a12 12 0 0 0 24 0Z" fill="#FF8FA3"/></g>`,
    over: `<path class="wave" d="M40 200q-8 14 0 28M28 192q-12 22 0 44" fill="none" stroke="#E8A882" stroke-width="5" stroke-linecap="round"/>
    <path d="M24 300L36 268H206L196 300Z" fill="#6FA8DC"/><path d="M44 284H196" fill="none" stroke="#9CC7E0" stroke-width="5" stroke-dasharray="10 10"/>
    <circle cx="60" cy="266" r="12" fill="#B0875A"/><circle cx="51" cy="256" r="5" fill="#B0875A"/><circle cx="69" cy="256" r="5" fill="#B0875A"/>
    <path d="M98 276C90 262 96 252 102 248V240H114V248C120 252 126 262 118 276Z" fill="#B49CD8"/>
    <circle cx="150" cy="268" r="11" fill="#FFD35A"/><path d="M139 268h22M150 257v22" fill="none" stroke="#F5A23C" stroke-width="3"/>
    <g class="coin"><circle cx="80" cy="240" r="9" fill="#FFD35A"/><circle cx="80" cy="240" r="5" fill="none" stroke="#E5B33A" stroke-width="2"/></g>
    <g class="coin2"><circle cx="130" cy="236" r="9" fill="#FFD35A"/><circle cx="130" cy="236" r="5" fill="none" stroke="#E5B33A" stroke-width="2"/></g>`,
  },
  'job-odd': {
    title: '打零工', note: '包着头巾，拿大扫帚左一下右一下地扫地，扫得尘土一团团飞。',
    css: `.sway{animation:sway 1s ease-in-out infinite;transform-origin:190px 298px}
    .broom{animation:sweep 1s ease-in-out infinite;transform-origin:30px 120px}
    .dust{animation:dust 1s ease-out infinite}.dust2{animation:dust 1s ease-out -.5s infinite}
    @keyframes sway{0%,100%{transform:rotate(-1deg)}50%{transform:rotate(1.5deg)}}
    @keyframes sweep{0%,100%{transform:rotate(6deg)}50%{transform:rotate(-8deg)}}
    @keyframes dust{0%{opacity:0;transform:translate(0,0) scale(.6)}30%{opacity:.9}100%{opacity:0;transform:translate(-20px,-26px) scale(1.3)}}`,
    wrap: 'sway', hat: true,
    pig: { face: `<path d="M104 76C128 40 192 30 218 50L208 72C180 58 138 62 114 90Z" fill="#6FA8DC"/>
    <circle cx="140" cy="62" r="4" fill="#FFFFFF"/><circle cx="170" cy="52" r="4" fill="#FFFFFF"/><circle cx="196" cy="56" r="4" fill="#FFFFFF"/>
    <path d="M214 60L238 52L232 72Z" fill="#5A93C8"/>` },
    over: `<g class="broom"><path d="M30 120L92 268" fill="none" stroke="#B0875A" stroke-width="9" stroke-linecap="round"/>
    <path d="M78 258L112 248L132 296H70Z" fill="#E9C46A"/><path d="M84 274L118 264" fill="none" stroke="#C9A04C" stroke-width="5"/>
    <path d="M82 296L80 286M96 296L94 284M110 296L110 284M122 296L124 286" fill="none" stroke="#C9A04C" stroke-width="3"/></g>
    <g class="dust"><circle cx="150" cy="290" r="11" fill="#E6DED0"/><circle cx="164" cy="284" r="8" fill="#E6DED0"/></g>
    <g class="dust2"><circle cx="60" cy="292" r="9" fill="#E6DED0"/><circle cx="48" cy="286" r="6" fill="#E6DED0"/></g>`,
  },
  'job-tea': {
    title: '奶茶店员', note: '戴着遮阳帽站在柜台后摇雪克杯，杯里的珍珠一颠一颠。',
    css: `.bop{animation:bop .5s ease-in-out infinite;transform-origin:190px 298px}
    .shaker{animation:shake .25s ease-in-out infinite;transform-origin:48px 214px}
    .pearl{animation:pearl .5s ease-in-out infinite}.pearl2{animation:pearl .5s ease-in-out -.25s infinite}
    .sp{animation:pop 1.5s ease-out infinite;transform-box:fill-box;transform-origin:50% 50%}
    @keyframes bop{50%{transform:translateY(-3px)}}
    @keyframes shake{0%,100%{transform:translateY(-8px) rotate(-6deg)}50%{transform:translateY(8px) rotate(6deg)}}
    @keyframes pearl{50%{transform:translateY(-4px)}}
    @keyframes pop{0%{opacity:0;transform:scale(.4)}40%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.2)}}`,
    wrap: 'bop', hat: true,
    pig: { face: `<path d="M116 66C124 38 176 30 206 44L202 60C176 52 146 54 120 72Z" fill="#7DBF6A"/>
    <path d="M120 68C100 60 78 66 64 80C84 84 106 80 122 74Z" fill="#5FA84E"/>` },
    over: `<rect x="24" y="246" width="210" height="14" rx="6" fill="#F3EDE4"/><rect x="32" y="258" width="194" height="42" rx="4" fill="#FFC2D1"/>
    <path d="M60 258V300M100 258V300M140 258V300M180 258V300" fill="none" stroke="#FFD7E1" stroke-width="10"/>
    <g class="shaker"><rect x="36" y="168" width="26" height="18" rx="7" fill="#AEB4BE"/><path d="M33 186H65L60 244H38Z" fill="#C9CED6"/><path d="M40 196l3 40" fill="none" stroke="#E6EAEE" stroke-width="4" stroke-linecap="round"/></g>
    <path d="M176 206L186 172" fill="none" stroke="#FF7A93" stroke-width="7" stroke-linecap="round"/>
    <path d="M150 206H190L184 246H156Z" fill="#E8C9A0"/><ellipse cx="170" cy="206" rx="21" ry="5" fill="#F7E6CF"/>
    <g class="pearl" fill="#5A3E2B"><circle cx="162" cy="238" r="4"/><circle cx="176" cy="236" r="4"/></g>
    <g class="pearl2" fill="#5A3E2B"><circle cx="168" cy="230" r="4"/><circle cx="180" cy="240" r="3.5"/></g>
    ${sparkle(110, 150, 12, '#FFE27A', 'sp')}`,
  },
  'job-rider': {
    title: '外卖骑手', note: '戴黄头盔、背外卖箱，踩着小滑板车往前冲，轮子飞转，身后拉出风线。',
    css: `.ride{animation:ride .3s ease-in-out infinite;transform-origin:190px 298px}
    .wheel{animation:spin .4s linear infinite;transform-box:fill-box;transform-origin:50% 50%}
    .road{animation:road .5s linear infinite}
    .wind{animation:wind .6s linear infinite}.wind2{animation:wind .6s linear -.3s infinite}
    .tail{animation-duration:.3s}
    @keyframes ride{50%{transform:translateY(-3px)}}
    @keyframes spin{to{transform:rotate(-360deg)}}
    @keyframes road{to{transform:translateX(60px)}}
    @keyframes wind{0%{opacity:0;transform:translateX(0)}30%{opacity:1}100%{opacity:0;transform:translateX(30px)}}`,
    wrap: 'ride', hat: true,
    pig: { face: `<rect x="212" y="-4" width="104" height="78" rx="10" fill="#FFC83D"/><path d="M212 18H316" fill="none" stroke="#E5A92A" stroke-width="5"/>
    <circle cx="264" cy="44" r="12" fill="#FFFFFF"/><path d="M258 44l5 5 8-9" fill="none" stroke="#E5A92A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M228 70Q208 110 222 160" fill="none" stroke="#E5A92A" stroke-width="9"/>
    <path d="M76 100C70 50 120 10 180 4C220 2 246 22 244 52C200 44 140 56 90 104Z" fill="#FFC83D"/>
    <path d="M120 30C140 18 170 12 196 14" fill="none" stroke="#FFE08A" stroke-width="8"/>
    <path d="M84 104C128 60 196 46 248 54" fill="none" stroke="#E5A92A" stroke-width="9"/>` },
    under: `<g class="road"><path d="M-60 300H0M60 300H120M180 300H240M300 300H360M420 300H480" fill="none" stroke="#D9CBB3" stroke-width="7" stroke-linecap="round"/></g>
    <path d="M52 286L40 168" fill="none" stroke="#5B5F73" stroke-width="8" stroke-linecap="round"/><path d="M26 170H56" fill="none" stroke="#3A3E52" stroke-width="10" stroke-linecap="round"/>
    <rect x="50" y="280" width="290" height="10" rx="5" fill="#5B5F73"/>`,
    over: `<g class="wheel"><circle cx="52" cy="288" r="12" fill="#3A3E52"/><path d="M44 288h16M52 280v16" stroke="#9FA9B4" stroke-width="3"/></g>
    <g class="wheel"><circle cx="330" cy="288" r="12" fill="#3A3E52"/><path d="M322 288h16M330 280v16" stroke="#9FA9B4" stroke-width="3"/></g>
    <path class="wind" d="M320 110h26M330 150h22M318 190h30" fill="none" stroke="#CFD8E3" stroke-width="5" stroke-linecap="round"/>
    <path class="wind2" d="M326 130h20M322 170h28" fill="none" stroke="#CFD8E3" stroke-width="5" stroke-linecap="round"/>`,
  },
  'job-site': {
    title: '搬砖', note: '戴安全帽，背上码着三块砖，一步一顿地扛，汗珠往外甩。',
    css: `.haul{animation:haul 1s ease-in-out infinite;transform-origin:190px 298px}
    .bricks{animation:wobble 1s ease-in-out infinite;transform-origin:262px 66px}
    .s1{animation:fling 1s ease-out infinite}.s2{animation:fling 1s ease-out -.5s infinite}
    .puff{animation:puff 1s ease-out infinite}
    @keyframes haul{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(5px) rotate(1deg)}}
    @keyframes wobble{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(2deg)}}
    @keyframes fling{0%{opacity:0;transform:translate(0,0)}20%{opacity:1}100%{opacity:0;transform:translate(-24px,-26px)}}
    @keyframes puff{0%,40%{opacity:0;transform:scale(.6)}60%{opacity:.8}100%{opacity:0;transform:scale(1.3) translateY(-8px)}}`,
    wrap: 'haul', hat: true,
    pig: { face: `<g class="bricks"><rect x="212" y="36" width="58" height="28" rx="3" fill="#C8553D"/><rect x="272" y="40" width="54" height="26" rx="3" fill="#B84A35"/>
    <rect x="236" y="8" width="58" height="28" rx="3" fill="#D2654C"/>
    <path d="M220 50h12M246 22h12M282 54h12" fill="none" stroke="#E58A72" stroke-width="4" stroke-linecap="round"/></g>
    <path d="M80 96C76 48 124 12 180 8C222 6 246 26 242 56C198 46 140 58 92 100Z" fill="#F5A23C"/>
    <path d="M150 12C152 30 154 40 156 50" fill="none" stroke="#E57B2E" stroke-width="7"/>
    <path d="M72 104C124 62 196 50 254 60" fill="none" stroke="#E57B2E" stroke-width="10"/>
    ${drop(64, 110, 1.3, '#9FD8F0', 's1')}${drop(200, 92, 1.1, '#9FD8F0', 's2')}` },
    over: `<rect x="26" y="280" width="34" height="18" rx="3" fill="#C8553D"/><rect x="62" y="280" width="34" height="18" rx="3" fill="#B84A35"/><rect x="42" y="262" width="34" height="18" rx="3" fill="#D2654C"/>
    <g class="puff"><circle cx="190" cy="292" r="9" fill="#E6DED0"/><circle cx="204" cy="288" r="7" fill="#E6DED0"/></g>`,
  },
  'job-sorting': {
    title: '快递分拣', note: '挂着工牌守在传送带边，一个个纸箱滑过来，扫码枪「嘀」一下亮红光。',
    css: `.scan{animation:scan 1.2s ease-in-out infinite;transform-origin:190px 298px}
    .b1{animation:belt 2.4s linear infinite}.b2{animation:belt 2.4s linear -1.2s infinite}
    .beam{animation:beam 1.2s steps(1) infinite}
    .roll{animation:roll .6s linear infinite;transform-box:fill-box;transform-origin:50% 50%}
    @keyframes scan{0%,100%{transform:rotate(0)}50%{transform:rotate(-2deg)}}
    @keyframes belt{0%{opacity:0;transform:translateX(0)}10%,85%{opacity:1}100%{opacity:0;transform:translateX(-150px)}}
    @keyframes beam{0%,50%,70%,100%{opacity:0}55%,65%{opacity:1}}
    @keyframes roll{to{transform:rotate(-360deg)}}`,
    wrap: 'scan',
    pig: { face: `<path d="M118 212Q150 240 192 226" fill="none" stroke="#4A6FB5" stroke-width="4"/>
    <rect x="140" y="228" width="26" height="32" rx="4" fill="#FFFFFF"/><rect x="144" y="232" width="18" height="10" rx="2" fill="#6FA8DC"/>
    <path d="M145 248h16M145 254h10" fill="none" stroke="#C9CED6" stroke-width="3" stroke-linecap="round"/>` },
    over: `<g class="b1"><rect x="176" y="222" width="44" height="34" rx="3" fill="#D9A066"/><path d="M198 222V256" fill="none" stroke="#F3D9B1" stroke-width="6"/></g>
    <g class="b2"><rect x="180" y="228" width="38" height="28" rx="3" fill="#C8904F"/><path d="M180 240H218" fill="none" stroke="#F3D9B1" stroke-width="5"/></g>
    <rect x="24" y="256" width="226" height="14" rx="7" fill="#5B5F73"/>
    <circle class="roll" cx="44" cy="263" r="5" fill="#9FA9B4"/><circle class="roll" cx="100" cy="263" r="5" fill="#9FA9B4"/><circle class="roll" cx="156" cy="263" r="5" fill="#9FA9B4"/><circle class="roll" cx="212" cy="263" r="5" fill="#9FA9B4"/>
    <path d="M40 270V300M234 270V300" fill="none" stroke="#3A3E52" stroke-width="8"/>
    <path d="M30 150L62 140L66 154L44 162L40 182H30Z" fill="#3A3E52"/>
    <path class="beam" d="M62 148L92 236" fill="none" stroke="#FF5A5A" stroke-width="4" stroke-linecap="round"/>`,
  },

  // ---- school stages (data.js SCHOOL_STAGES): study-<stage>.svg ----
  'study-primary': {
    title: '上小学', note: '系着红领巾、背着小黄书包，对着积木大声念，音符一个个往外冒。',
    css: `.recite{animation:recite .8s ease-in-out infinite;transform-origin:190px 298px}
    .n1{animation:note 1.6s ease-out infinite}.n2{animation:note 1.6s ease-out -.8s infinite}
    .top{animation:bounce .8s ease-in-out infinite}
    @keyframes recite{0%,100%{transform:rotate(0)}50%{transform:rotate(-2deg) translateY(-2px)}}
    @keyframes note{0%{opacity:0;transform:translate(0,0)}25%{opacity:1}100%{opacity:0;transform:translate(-14px,-56px)}}
    @keyframes bounce{50%{transform:translateY(-6px)}}`,
    wrap: 'recite',
    pig: { face: `<path d="M236 58Q206 110 226 168" fill="none" stroke="#E5A92A" stroke-width="8"/>
    <rect x="244" y="40" width="70" height="80" rx="22" fill="#FFC83D" transform="rotate(8 280 80)"/>
    <rect x="254" y="84" width="52" height="26" rx="10" fill="#F5B52A" transform="rotate(8 280 80)"/>
    <path d="M128 212L198 226L152 262Z" fill="#E5534B"/>
    <path d="M156 222L138 252M156 222L174 254" fill="none" stroke="#E5534B" stroke-width="10" stroke-linecap="round"/>
    <circle cx="156" cy="222" r="9" fill="#C9433C"/>` },
    over: `<g class="n1"><circle cx="48" cy="200" r="7" fill="#8C9BC4"/><path d="M54 200V176l10 4" fill="none" stroke="#8C9BC4" stroke-width="4" stroke-linecap="round"/></g>
    <g class="n2"><circle cx="40" cy="176" r="6" fill="#FF9FB0"/><path d="M45 176V156l9 4" fill="none" stroke="#FF9FB0" stroke-width="4" stroke-linecap="round"/></g>
    <rect x="28" y="266" width="34" height="34" rx="4" fill="#FF7A93"/><circle cx="45" cy="283" r="9" fill="#FFFFFF"/>
    <rect x="64" y="266" width="34" height="34" rx="4" fill="#6FA8DC"/><path d="M81 273L91 292H71Z" fill="#FFFFFF"/>
    <g class="top"><rect x="46" y="230" width="34" height="34" rx="4" fill="#7DBF6A"/>${sparkle(63, 247, 11, '#FFFFFF', '')}</g>`,
  },
  'study-college': {
    title: '上大学', note: '面前摊着厚课本，荧光笔一行行划过去，旁边一摞书，头顶挂着校旗。',
    css: `.tilt{animation:tilt 2.4s ease-in-out infinite;transform-origin:190px 298px}
    .hl{stroke-dasharray:64;animation:hl 2.4s linear infinite}
    .pen{animation:pen 2.4s linear infinite}
    .flag{animation:flag 1.6s ease-in-out infinite;transform-origin:30px -26px}
    @keyframes tilt{0%,100%{transform:rotate(0)}40%{transform:rotate(-2.5deg)}}
    @keyframes hl{0%{stroke-dashoffset:64}70%,100%{stroke-dashoffset:0}}
    @keyframes pen{0%{transform:translateX(0)}70%{transform:translateX(56px)}100%{transform:translateX(56px);opacity:0}}
    @keyframes flag{50%{transform:rotate(6deg)}}`,
    wrap: 'tilt',
    under: `<path d="M24 -30H140" fill="none" stroke="#B0875A" stroke-width="3"/>
    <g class="flag"><path d="M30 -28L110 -16L30 -2Z" fill="#6A5ACD"/><circle cx="54" cy="-15" r="5" fill="#FFE27A"/></g>`,
    over: `<path d="M34 276L110 262V300H34Z" fill="#FFFDF6"/><path d="M110 262L186 276V300H110Z" fill="#F3EEDF"/>
    <path d="M118 278L172 286M118 290L160 296" fill="none" stroke="#D9D2C0" stroke-width="4" stroke-linecap="round"/>
    <path class="hl" d="M44 282L100 272" fill="none" stroke="#FFF07A" stroke-width="8" stroke-linecap="round" opacity=".9"/>
    <path d="M44 294L96 285" fill="none" stroke="#D9D2C0" stroke-width="4" stroke-linecap="round"/>
    <g class="pen"><path d="M40 270L54 252" fill="none" stroke="#F5D33A" stroke-width="10" stroke-linecap="round"/><path d="M40 270L36 276" fill="none" stroke="#3A3E52" stroke-width="5" stroke-linecap="round"/></g>
    <rect x="300" y="280" width="58" height="20" rx="3" fill="#6FA8DC"/><rect x="306" y="262" width="50" height="18" rx="3" fill="#E5534B"/><rect x="302" y="246" width="54" height="16" rx="3" fill="#7DBF6A"/>`,
  },
  'study-graduate': {
    title: '读研究生', note: '戴护目镜做实验，烧瓶里咕嘟咕嘟冒泡，偶尔「噗」地冒一小团烟。',
    css: `.tilt{animation:tilt 2.4s ease-in-out infinite;transform-origin:190px 298px}
    .bub{animation:bub 1.4s ease-out infinite}.bub2{animation:bub 1.4s ease-out -.5s infinite}.bub3{animation:bub 1.4s ease-out -1s infinite}
    .poof{animation:poof 4.2s ease-out infinite;transform-box:fill-box;transform-origin:50% 100%}
    .liq{animation:slosh 1.4s ease-in-out infinite;transform-origin:56px 288px}
    @keyframes tilt{0%,100%{transform:rotate(0)}40%{transform:rotate(-3deg)}75%{transform:rotate(-1deg)}}
    @keyframes bub{0%{opacity:0;transform:translateY(0)}20%{opacity:1}100%{opacity:0;transform:translateY(-60px)}}
    @keyframes poof{0%,80%{opacity:0;transform:scale(.4)}86%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.4) translateY(-10px)}}
    @keyframes slosh{50%{transform:scaleY(1.06)}}`,
    wrap: 'tilt',
    pig: { face: `<path d="M58 132C80 112 196 118 228 152" fill="none" stroke="#5B5F73" stroke-width="6"/>
    <ellipse cx="91" cy="142" rx="24" ry="19" fill="#BFE6F6" opacity=".55"/><ellipse cx="91" cy="142" rx="24" ry="19" fill="none" stroke="#5B8DB8" stroke-width="5"/>
    <ellipse cx="165" cy="157" rx="24" ry="19" fill="#BFE6F6" opacity=".55"/><ellipse cx="165" cy="157" rx="24" ry="19" fill="none" stroke="#5B8DB8" stroke-width="5"/>
    <path d="M115 146L141 152" fill="none" stroke="#5B8DB8" stroke-width="5"/>` },
    over: `<path d="M48 236V208h18v28l26 46c3 6-1 12-8 12H30c-7 0-11-6-8-12Z" fill="#EAF6FB" opacity=".9"/>
    <path class="liq" d="M37 262H77L92 284c2 5-1 10-6 10H28c-5 0-8-5-6-10Z" fill="#7DDCA8"/>
    <rect x="44" y="200" width="26" height="10" rx="4" fill="#C9CED6"/>
    <circle class="bub" cx="56" cy="190" r="6" fill="#A9E6C4"/><circle class="bub2" cx="64" cy="186" r="4" fill="#A9E6C4"/><circle class="bub3" cx="52" cy="184" r="5" fill="#A9E6C4"/>
    <g class="poof"><circle cx="58" cy="170" r="16" fill="#D7F0E2"/><circle cx="44" cy="160" r="11" fill="#D7F0E2"/><circle cx="72" cy="158" r="12" fill="#D7F0E2"/></g>
    <rect x="300" y="262" width="58" height="10" rx="3" fill="#B0875A"/><rect x="306" y="272" width="6" height="28" fill="#B0875A"/><rect x="346" y="272" width="6" height="28" fill="#B0875A"/>
    <rect x="310" y="226" width="10" height="40" rx="5" fill="#EAF6FB"/><rect x="310" y="246" width="10" height="20" rx="5" fill="#FF9FB0"/>
    <rect x="326" y="226" width="10" height="40" rx="5" fill="#EAF6FB"/><rect x="326" y="240" width="10" height="26" rx="5" fill="#8C9BC4"/>
    <rect x="342" y="226" width="10" height="40" rx="5" fill="#EAF6FB"/><rect x="342" y="252" width="10" height="14" rx="5" fill="#FFD35A"/>`,
  },
  'study-doctor': {
    title: '读博士', note: '深夜台灯下守着一大摞论文，戴着圆眼镜、挂着黑眼圈，打个盹又猛地惊醒，咖啡还冒着热气。',
    css: `.doze{animation:doze 4s ease-in-out infinite;transform-origin:190px 298px}
    .steam{animation:steam 2s ease-in-out infinite}
    .tw{animation:tw 2s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 50%}.tw2{animation:tw 2s ease-in-out -1s infinite;transform-box:fill-box;transform-origin:50% 50%}
    .glow{animation:glow 4s ease-in-out infinite}
    @keyframes doze{0%,55%,100%{transform:rotate(0)}70%{transform:rotate(-4deg) translateY(4px)}74%{transform:rotate(1deg) translateY(-3px)}80%{transform:rotate(0)}}
    @keyframes steam{0%,100%{opacity:0;transform:translateY(6px)}50%{opacity:.9;transform:translateY(-6px)}}
    @keyframes tw{0%,100%{opacity:.2;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}
    @keyframes glow{0%,100%{opacity:.55}50%{opacity:.8}}`,
    wrap: 'doze',
    pig: { face: `${glasses('#7A5A3A')}
    <path d="M80 166Q91 172 102 166M154 181Q165 187 176 181" fill="none" stroke="#B9A7CF" stroke-width="5" stroke-linecap="round"/>` },
    under: `<path d="M330 -30a28 28 0 1 0 18 50 24 24 0 1 1-18-50Z" fill="#FFE27A"/>
    ${sparkle(270, -16, 10, '#FFE27A', 'tw')}${sparkle(244, 14, 7, '#FFE27A', 'tw2')}${sparkle(352, 40, 8, '#FFE27A', 'tw2')}`,
    over: `<path class="glow" d="M40 206L84 252H30Z" fill="#FFF4C8"/>
    ${DESK}
    <path d="M30 252L36 244H52L58 252Z" fill="#5B5F73"/><path d="M44 244L50 206L34 178" fill="none" stroke="#5B5F73" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M24 186L50 172L56 202Z" fill="#E5534B"/>
    <rect x="84" y="244" width="62" height="8" rx="1" fill="#FFFDF6"/><rect x="88" y="236" width="60" height="8" rx="1" fill="#F3EEDF"/><rect x="84" y="228" width="62" height="8" rx="1" fill="#FFFDF6"/>
    <rect x="86" y="220" width="60" height="8" rx="1" fill="#F3EEDF"/><rect x="84" y="212" width="62" height="8" rx="1" fill="#FFFDF6"/>
    <path class="steam" d="M164 214q-5-7 0-14t0-14M178 214q-5-7 0-14" fill="none" stroke="#D8CFC2" stroke-width="4" stroke-linecap="round"/>
    <path d="M156 222H186V246C186 250 183 252 179 252H163C159 252 156 250 156 246Z" fill="#FFFFFF"/>
    <path d="M186 228C198 228 198 244 186 244" fill="none" stroke="#FFFFFF" stroke-width="5"/>`,
  },
  'react-graduate': {
    title: '博士毕业', note: '戴学位帽、抱着卷好的证书，高兴得把帽子抛上天又接住，彩带撒下来。',
    css: `.hop{animation:hop .8s ease-in-out infinite;transform-origin:190px 298px}
    .cap{animation:toss 2.4s cubic-bezier(.3,0,.4,1) infinite;transform-origin:168px 52px}
    .tassel{animation:swing .8s ease-in-out infinite;transform-origin:236px 52px}
    .f{animation:fall 1.6s linear infinite}.f2{animation-delay:-.5s}.f3{animation-delay:-1.1s}
    @keyframes hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
    @keyframes toss{0%,25%,85%,100%{transform:translateY(0) rotate(0)}55%{transform:translateY(-70px) rotate(-200deg)}}
    @keyframes swing{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(12deg)}}
    @keyframes fall{0%{opacity:0;transform:translateY(-30px) rotate(0)}15%{opacity:1}100%{opacity:0;transform:translateY(260px) rotate(240deg)}}`,
    wrap: 'hop', hat: true,
    pig: { eyes: 'happy', blush: cheeks(18, 10, '#FF9AA0', '.6'), face: `<g class="cap">
    <path d="M126 58C124 76 200 82 208 62L206 48L130 52Z" fill="#3A3A48"/>
    <path d="M94 50L168 26L242 46L168 70Z" fill="#2E2E3A"/><circle cx="168" cy="48" r="5" fill="#F5C24C"/>
    <path d="M168 48L236 52" fill="none" stroke="#F5C24C" stroke-width="3"/>
    <g class="tassel"><path d="M236 52V84" fill="none" stroke="#F5C24C" stroke-width="4"/><rect x="230" y="82" width="12" height="16" rx="3" fill="#F5C24C"/></g></g>
    <rect x="30" y="224" width="88" height="24" rx="12" fill="#FFFDF6"/><ellipse cx="34" cy="236" rx="6" ry="12" fill="#EDE6D3"/>
    <rect x="68" y="222" width="12" height="28" fill="#E5534B"/><path d="M74 250l-8 16M74 250l8 16" fill="none" stroke="#E5534B" stroke-width="5" stroke-linecap="round"/>` },
    under: [[60, '#FF7A93', ''], [120, '#6FA8DC', 'f2'], [190, '#FFD35A', 'f3'], [250, '#7DBF6A', ''], [320, '#B49CD8', 'f2'], [290, '#FF9FB0', 'f3']].map(([x, c, d]) =>
      `<g class="f ${d}"><rect x="${x}" y="-20" width="8" height="18" rx="2" fill="${c}"/></g>`).join(''),
  },

  // ---- trips by region (world.js REGIONS): away-trip-<region>.svg ----
  'away-trip-china': trip('旅行 · 中国', '远处是一段长城和烽火台，头顶一盏红灯笼晃呀晃。', {
    css: `.lantern{animation:swing 2s ease-in-out infinite;transform-origin:60px -36px}
    @keyframes swing{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}`,
    under: `<path d="M24 30C70 4 110 22 150 4S250 -14 300 6 340 22 360 16" fill="none" stroke="#DCC59A" stroke-width="12"/>
    <path d="M24 21C70 -5 110 13 150 -5S250 -23 300 -3 340 13 360 7" fill="none" stroke="#DCC59A" stroke-width="8" stroke-dasharray="7 7"/>
    <rect x="138" y="-22" width="26" height="26" fill="#D1B585"/><path d="M132 -22L151 -34L170 -22Z" fill="#C9433C"/>
    <g class="lantern"><path d="M60 -36V-18" fill="none" stroke="#8B6B4E" stroke-width="3"/>
    <rect x="50" y="-20" width="20" height="5" rx="2" fill="#F5C24C"/><ellipse cx="60" cy="0" rx="17" ry="16" fill="#E5534B"/>
    <path d="M60 -16V16" fill="none" stroke="#C9433C" stroke-width="3"/><rect x="50" y="14" width="20" height="5" rx="2" fill="#F5C24C"/>
    <path d="M60 19V36" fill="none" stroke="#F5C24C" stroke-width="4" stroke-linecap="round"/></g>`,
  }),
  'away-trip-eastasia': trip('旅行 · 东亚', '远处是雪顶富士山，旁边一座红鸟居，樱花瓣飘下来。', {
    css: `.p1{animation:petal 3s linear infinite}.p2{animation:petal 3s linear -1s infinite}.p3{animation:petal 3s linear -2s infinite}
    @keyframes petal{0%{opacity:0;transform:translate(0,0) rotate(0)}10%{opacity:1}100%{opacity:0;transform:translate(-70px,300px) rotate(300deg)}}`,
    under: `<path d="M196 44L280 -26L360 44Z" fill="#A9C1DE"/><path d="M262 -11L280 -26L298 -11L290 -4L280 -12L270 -4Z" fill="#FFFFFF"/>
    <g fill="none" stroke="#E5534B" stroke-linecap="round"><path d="M42 -8V58M86 -8V58" stroke-width="8"/><path d="M28 -20Q64 -30 100 -20" stroke-width="10"/><path d="M36 -4H92" stroke-width="6"/></g>`,
    over: `<ellipse class="p1" cx="140" cy="-30" rx="7" ry="4" fill="#FFC2D1"/><ellipse class="p2" cx="220" cy="-30" rx="6" ry="4" fill="#FFB0C4"/><ellipse class="p3" cx="300" cy="-30" rx="7" ry="4" fill="#FFC2D1"/>`,
  }),
  'away-trip-southasia': trip('旅行 · 南亚·东南亚', '远处一座金色佛塔，身边的椰子树叶子沙沙地摇。', {
    css: `.palm{animation:palm 2.4s ease-in-out infinite;transform-origin:58px -6px}
    .sun{animation:glow 2.4s ease-in-out infinite}
    @keyframes palm{50%{transform:rotate(5deg)}}
    @keyframes glow{50%{opacity:.6}}`,
    under: `<circle class="sun" cx="200" cy="-8" r="20" fill="#FFE27A"/>
    <path d="M296 -34L304 -2H288Z" fill="#E5B33A"/><path d="M262 44C262 4 330 4 330 44Z" fill="#F2C14E"/><rect x="254" y="40" width="84" height="8" rx="3" fill="#E5B33A"/>
    <path d="M44 120Q30 50 58 -6" fill="none" stroke="#A8764C" stroke-width="9" stroke-linecap="round"/>
    <g class="palm"><path d="M58 -6C40 -26 20 -18 24 -4M58 -6C70 -30 96 -26 100 -12M58 -6C40 2 30 18 34 30M58 -6C80 -2 96 10 94 24" fill="none" stroke="#5FA84E" stroke-width="9" stroke-linecap="round"/>
    <circle cx="54" cy="4" r="6" fill="#8B6B4E"/><circle cx="64" cy="6" r="6" fill="#8B6B4E"/></g>`,
  }),
  'away-trip-europe': trip('旅行 · 欧洲', '远处一座小铁塔，云慢慢飘过，背包里插着一根比猪还长的法棍。', {
    css: `.cloud{animation:drift 6s ease-in-out infinite}.cloud2{animation:drift 6s ease-in-out -3s infinite}
    @keyframes drift{50%{transform:translateX(-24px)}}`,
    under: `<g fill="none" stroke="#8C7A68" stroke-linecap="round"><path d="M56 -34V-14" stroke-width="4"/><path d="M56 -14C52 30 42 80 28 128M56 -14C60 30 70 80 84 128" stroke-width="6"/>
    <path d="M44 36H68M36 82H76" stroke-width="5"/><path d="M34 128Q56 96 78 128" stroke-width="5"/></g>
    <g class="cloud"><path d="M250 -4a14 14 0 0 1 26-8 16 16 0 0 1 30 6 10 10 0 0 1 0 20H254a10 10 0 0 1-4-18Z" fill="#E6ECF2"/></g>
    <g class="cloud2"><path d="M170 -20a11 11 0 0 1 20-6 12 12 0 0 1 24 5 8 8 0 0 1 0 15H174a8 8 0 0 1-4-14Z" fill="#E6ECF2"/></g>`,
    back: `<path d="M262 44L318 -22" fill="none" stroke="#D9A066" stroke-width="18" stroke-linecap="round"/>
    <path d="M280 14l8 6M292 0l8 6M304 -14l8 6" fill="none" stroke="#B9824A" stroke-width="4" stroke-linecap="round"/>`,
  }),
  'away-trip-americas': trip('旅行 · 美洲', '远处是高楼天际线和举着火炬的自由女神，路边一株仙人掌。', {
    css: `.flame{animation:flame .5s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
    .win{animation:win 2s steps(1) infinite}
    @keyframes flame{50%{transform:scale(.8,1.15)}}
    @keyframes win{50%{opacity:.3}}`,
    under: `<g fill="#DCE3EC"><rect x="214" y="-6" width="24" height="50"/><rect x="242" y="-26" width="20" height="70"/><rect x="266" y="2" width="28" height="42"/><rect x="298" y="-18" width="22" height="62"/><rect x="324" y="-2" width="30" height="46"/></g>
    <g class="win" fill="#FFF4C8"><rect x="247" y="-18" width="4" height="6"/><rect x="253" y="-6" width="4" height="6"/><rect x="303" y="-10" width="4" height="6"/><rect x="311" y="2" width="4" height="6"/></g>
    <g fill="#7FB8A4"><path d="M28 120L32 40H48L52 120Z"/><circle cx="40" cy="28" r="11"/></g>
    <path d="M30 20L26 10M38 16V4M46 18L52 8M46 34L58 -10" fill="none" stroke="#7FB8A4" stroke-width="5" stroke-linecap="round"/>
    <path class="flame" d="M60 -12c-9-6-7-16 0-22 7 6 9 16 0 22Z" fill="#F5A23C"/>`,
    over: `<path d="M326 300V236a11 11 0 0 1 22 0V300Z" fill="#6FB36A"/><path d="M326 266h-10a8 8 0 0 1-8-8v-14" fill="none" stroke="#6FB36A" stroke-width="10" stroke-linecap="round"/>
    <path d="M334 250h.1M342 274h.1" fill="none" stroke="#4E8F4A" stroke-width="4" stroke-linecap="round"/>`,
  }),
  'away-trip-mideast': trip('旅行 · 中东·非洲', '远处两座金字塔，大太阳晒着，猪戴上了墨镜。', {
    css: `.rays{animation:spin 10s linear infinite;transform-origin:56px -4px}
    .heat{animation:heat 1.6s ease-in-out infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes heat{0%,100%{opacity:0;transform:translateY(4px)}50%{opacity:.8;transform:translateY(-4px)}}`,
    under: `<path d="M190 44L240 -10L290 44Z" fill="#E9C98A"/><path d="M240 -10L290 44H254Z" fill="#D9B06C"/>
    <path d="M262 44L304 0L346 44Z" fill="#E9C98A"/><path d="M304 0L346 44H316Z" fill="#D9B06C"/>
    <g class="rays"><path d="M56 -38V-30M56 22V30M22 -4H30M82 -4H90M32 -28l6 6M74 14l6 6M80 -28l-6 6M32 20l6-6" fill="none" stroke="#FFD35A" stroke-width="5" stroke-linecap="round"/></g>
    <circle cx="56" cy="-4" r="20" fill="#FFD35A"/>`,
    gear: `<path d="M72 134h40v10a16 16 0 0 1-40 0ZM146 148h40v10a16 16 0 0 1-40 0Z" fill="#2E2E3A"/><path d="M112 138L146 152M72 136L58 130" fill="none" stroke="#2E2E3A" stroke-width="5"/>`,
    over: `<path class="heat" d="M30 280q6-8 0-16t0-16M46 284q6-8 0-16t0-16" fill="none" stroke="#F2D488" stroke-width="4" stroke-linecap="round"/>`,
  }),
  'away-trip-oceania': trip('旅行 · 大洋洲·南极', '远处是歌剧院的白贝壳顶，雪花飘着，一只小企鹅摇摇摆摆跟在后面。', {
    css: `.peng{animation:waddle .5s ease-in-out infinite;transform-origin:44px 298px}
    .sn{animation:snow 3s linear infinite}.sn2{animation:snow 3s linear -1s infinite}.sn3{animation:snow 3s linear -2s infinite}
    @keyframes waddle{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
    @keyframes snow{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}100%{opacity:0;transform:translate(-30px,300px)}}`,
    under: `<g fill="#E6ECF2"><path d="M210 44Q216 4 252 -8Q240 18 246 44Z"/><path d="M244 44Q256 -6 300 -20Q284 12 290 44Z"/><path d="M286 44Q300 6 336 0Q322 20 330 44Z"/></g>
    <g fill="#CBD5E0"><path d="M246 44Q240 18 252 -8L250 44Z"/><path d="M290 44Q284 12 300 -20L296 44Z"/><path d="M330 44Q322 20 336 0L334 44Z"/></g>
    <rect x="204" y="42" width="136" height="7" rx="3" fill="#C9CED6"/>`,
    over: `<circle class="sn" cx="120" cy="-30" r="5" fill="#CFE6F5"/><circle class="sn2" cx="200" cy="-30" r="4" fill="#CFE6F5"/><circle class="sn3" cx="290" cy="-30" r="5" fill="#CFE6F5"/>
    <g class="peng"><ellipse cx="44" cy="294" rx="8" ry="4" fill="#F5A23C"/><ellipse cx="58" cy="294" rx="8" ry="4" fill="#F5A23C"/>
    <ellipse cx="50" cy="266" rx="20" ry="28" fill="#3A3E52"/><ellipse cx="45" cy="272" rx="12" ry="20" fill="#FFFFFF"/>
    <circle cx="42" cy="250" r="4" fill="#FFFFFF"/><circle cx="41" cy="250" r="2" fill="#3A3E52"/><path d="M32 254L20 258L32 262Z" fill="#F5A23C"/></g>`,
  }),
}

function render(s, look = null) {
  // The stage's look sits under the pose's own face props; headwear replaces the bow and cap.
  const dress = look === null ? '' : (s.hat ? '' : look.head ?? '') + (look.face ?? '')
  const title = look === null ? s.title : `${s.title} · ${look.title}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="128" height="128" role="img" aria-label="${title}">
  <title>${title}</title>
  <!-- ${s.note} 本体是项目原有的 Noto 🐖，形状和颜色不变；由 tools/build-sprites.mjs 生成，别手改。 -->
  <style>${BASE_CSS}
    ${s.css}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>
  ${s.under ?? ''}
  <g class="${s.wrap}">
  ${pig({ ...s.pig, look: dress })}
  </g>
  ${s.over ?? ''}
</svg>
`
}

// Empty slots (no props, no face) would leave blank, space-only lines.
const write = (name, svg) => writeFileSync(new URL(name + '.svg', OUT), svg.replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n'))

let count = 0
for (const [name, s] of Object.entries(SPRITES)) {
  write(name, render(s))
  count += 1
  if (s.looks === false) continue
  for (const [stage, look] of Object.entries(STAGE_LOOKS)) {
    write(`${name}--${stage}`, render(s, look))
    count += 1
  }
}
console.log(`wrote ${count} sprites to assets/`)

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
 * this script leaves them alone.
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

function pig({ eyes = 'open', face = '', back = '', blush = '' } = {}) {
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
// Sprites. `css` animates; `under` sits behind the pig, `over` in front;
// `wrap` names the class on the group holding the pig (+ its own props).
// ---------------------------------------------------------------------------
const SPRITES = {
  // ---- stages: the same pig, only accessories ----
  'stage-piglet': {
    title: '小猪', note: '刚出纸盒：耳朵上系个小蝴蝶结，走两步颠一下。',
    css: `.hop{animation:hop 1.4s ease-in-out infinite;transform-origin:190px 298px}
    @keyframes hop{0%,100%{transform:translateY(0) scale(1,1)}45%{transform:translateY(-10px) scale(.98,1.02)}70%{transform:translateY(0) scale(1.03,.97)}}`,
    wrap: 'hop',
    pig: { face: `<g transform="translate(86 50) rotate(-18)"><path d="M0 0L-22-12C-28-3-28 7-22 14Z" fill="#FF6F9A"/><path d="M0 0L22-12C28-3 28 7 22 14Z" fill="#FF6F9A"/><circle r="7" fill="#E9507F"/></g>` },
  },
  'stage-young': {
    title: '青年猪', note: '原版那只猪：呼吸、眨眼、甩尾巴。',
    css: `.breathe{animation:breathe 2.6s ease-in-out infinite;transform-origin:190px 298px}
    @keyframes breathe{50%{transform:scale(1.015,.975)}}`,
    wrap: 'breathe',
  },
  'stage-middle': {
    title: '中年猪', note: '同一只猪，戴一顶鸭舌帽，呼吸慢一点。',
    css: `.breathe{animation:breathe 3.2s ease-in-out infinite;transform-origin:190px 298px}
    @keyframes breathe{50%{transform:scale(1.02,.97)}}`,
    wrap: 'breathe',
    pig: { face: `<path d="M118 62C124 34 166 22 200 34L204 52C176 46 146 52 118 62Z" fill="#8B6B4E"/><path d="M98 70Q116 56 140 58" fill="none" stroke="#6E5239" stroke-width="10"/>` },
  },
  'stage-elder': {
    title: '老年猪', note: '同一只猪：灰眉毛、白胡子，拄一根小拐杖，偶尔点头打盹。',
    css: `.nod{animation:nod 6s ease-in-out infinite;transform-origin:190px 298px}
    .cane{animation:tap 4s ease-in-out infinite;transform-origin:44px 298px}
    @keyframes nod{0%,60%,100%{transform:rotate(0)}72%{transform:rotate(-3deg) translateY(3px)}84%{transform:rotate(0)}}
    @keyframes tap{50%{transform:rotate(-3deg)}}`,
    wrap: 'nod',
    pig: { face: `<path d="M77 122Q89 111 104 121M151 137Q164 127 179 138" fill="none" stroke="#ADADA5" stroke-width="8"/>
    <path d="M107 207C98 203 96 213 84 212C88 220 98 223 107 216C114 225 127 226 134 219C120 220 119 208 107 207Z" fill="#F8F4E8"/>
    <path d="M105 228Q116 233 128 230Q127 241 119 247L116 240L110 244Q107 236 105 228Z" fill="#F8F4E8"/>` },
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
    wrap: 'float ghost',
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
    wrap: 'droop',
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
    css: `.walk{animation:walk .5s ease-in-out infinite;transform-origin:190px 298px}
    .road{animation:road .8s linear infinite}
    .tail{animation-duration:.5s}
    @keyframes walk{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-8px) rotate(-1.5deg)}}
    @keyframes road{to{transform:translateX(60px)}}`,
    wrap: 'walk',
    pig: {
      face: `<path d="M236 58Q206 110 226 168" fill="none" stroke="#4E7FB0" stroke-width="9"/>
    <rect x="238" y="34" width="84" height="92" rx="26" fill="#6FA8DC" transform="rotate(8 280 80)"/>
    <rect x="248" y="86" width="64" height="32" rx="13" fill="#5A93C8" transform="rotate(8 280 80)"/>
    <ellipse cx="150" cy="54" rx="64" ry="14" fill="#E9C46A" transform="rotate(-14 150 54)"/>
    <path d="M118 58C110 26 172 10 182 42Z" fill="#F2D488"/><path d="M120 50L180 34" fill="none" stroke="#E5534B" stroke-width="7"/>`,
    },
    under: `<g class="road"><path d="M-60 300H0M60 300H120M180 300H240M300 300H360M420 300H480" fill="none" stroke="#D9CBB3" stroke-width="7" stroke-linecap="round"/></g>`,
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
    wrap: 'soak',
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
    wrap: 'bob',
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
}

for (const [name, s] of Object.entries(SPRITES)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="128" height="128" role="img" aria-label="${s.title}">
  <title>${s.title}</title>
  <!-- ${s.note} 本体是项目原有的 Noto 🐖，形状和颜色不变；由 tools/build-sprites.mjs 生成，别手改。 -->
  <style>${BASE_CSS}
    ${s.css}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>
  ${s.under ?? ''}
  <g class="${s.wrap}">
  ${pig(s.pig)}
  </g>
  ${s.over ?? ''}
</svg>
`
  // Empty slots (no props, no face) would leave blank, space-only lines.
  writeFileSync(new URL(name + '.svg', OUT), svg.replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n'))
}
console.log(`wrote ${Object.keys(SPRITES).length} sprites to assets/`)

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
    <path fill="${C.snout}" d="${P.snout}"/>
    <path fill="${C.eye}" d="${P.nostril1}"/>
    <path fill="${C.eye}" d="${P.nostril2}"/>
    <ellipse class="blush" cx="155" cy="187" rx="12" ry="7" fill="${C.blush}" opacity=".75"/>
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
  'mood-hungry': {
    title: '饿了', note: '抬头盯着想象中的胡萝卜，口水往下滴，肚子咕咕叫。',
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
  'mood-dirty': {
    title: '该洗澡了', note: '身上沾了泥点，一只苍蝇绕着飞，屁股后面一坨便便。',
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
  'mood-lonely': {
    title: '孤单', note: '眼眶含着泪（参考 sample 里的含泪猪），一滴一滴往下掉，头顶一小朵乌云。',
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
  'mood-sick': {
    title: '生病', note: '额头搭湿毛巾，嘴里叼体温计，脸烧得通红，时不时打哆嗦。',
    css: `.shiver{animation:shiver 2.2s ease-in-out infinite;transform-origin:190px 298px}
    .tail{animation:none}
    .heat{animation:heat 2.2s ease-in-out infinite}
    @keyframes shiver{0%,60%,100%{transform:translateX(0)}64%{transform:translateX(-4px) rotate(-1deg)}68%{transform:translateX(4px) rotate(.8deg)}72%{transform:translateX(-2px)}}
    @keyframes heat{0%,100%{opacity:.2;transform:translateY(6px)}50%{opacity:1;transform:translateY(-6px)}}`,
    wrap: 'shiver',
    pig: {
      blush: `<ellipse cx="155" cy="187" rx="22" ry="12" fill="#FF6F6F" opacity=".4"/><ellipse cx="60" cy="160" rx="10" ry="8" fill="#FF6F6F" opacity=".3"/>`,
      face: `<path d="M70 104L178 116L174 136L66 124Z" fill="#9FD3E6"/>
    <path d="M90 110v10M112 112v10M134 115v10M156 117v10" fill="none" stroke="#7FBFD6" stroke-width="4" stroke-linecap="round"/>
    <path d="M78 214L36 238" fill="none" stroke="#F4F6F8" stroke-width="11" stroke-linecap="round"/>
    <path d="M58 226L36 238" fill="none" stroke="#E5534B" stroke-width="5" stroke-linecap="round"/>`,
    },
    over: `<path class="heat" d="M110 60q-8-10 0-20t0-20M140 54q-8-10 0-20t0-20" fill="none" stroke="#FFB0A0" stroke-width="6" stroke-linecap="round"/>`,
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
    pig: { eyes: 'happy', blush: `<ellipse cx="155" cy="187" rx="18" ry="10" fill="#FF9AA0" opacity=".6"/>` },
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
  writeFileSync(new URL(name + '.svg', OUT), svg)
}
console.log(`wrote ${Object.keys(SPRITES).length} sprites to assets/`)

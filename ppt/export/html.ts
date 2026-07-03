const { MAGAZINE_THEMES, SWISS_THEMES } = require('./guizang-themes');

/**
 * Guizang HTML PPT 导出器
 * Style A: 电子杂志风 - 衬线字体、优雅排版、渐变背景、装饰元素
 * Style B: 瑞士国际主义 - 无衬线粗体、网格系统、高对比色块、几何美学
 * 生成单文件 HTML，浏览器直接打开，支持键盘/滚轮/触屏翻页
 */

function buildMagazineRootCSS(themeKey: string) {
  const t = MAGAZINE_THEMES[themeKey] || MAGAZINE_THEMES.ink;
  const c = t.colors;
  return `:root{
    --ink:${c.ink};
    --ink-rgb:${c.inkRgb};
    --paper:${c.paper};
    --paper-rgb:${c.paperRgb};
    --paper-tint:${c.paperTint};
    --ink-tint:${c.inkTint};
    --mono:"IBM Plex Mono","JetBrains Mono",ui-monospace,monospace;
    --serif-en:"Playfair Display","Source Serif 4",Georgia,serif;
    --serif-zh:"Noto Serif SC",source-han-serif-sc,serif;
    --sans-zh:"Noto Sans SC",source-han-sans-sc,sans-serif;
  }`;
}

function buildSwissRootCSS(themeKey: string) {
  const t = SWISS_THEMES[themeKey] || SWISS_THEMES.ikb;
  const c = t.colors;
  return `:root{
    --paper:${c.paper};
    --paper-rgb:${c.paperRgb};
    --ink:${c.ink};
    --ink-rgb:${c.inkRgb};
    --grey-1:${c.grey1};
    --grey-2:${c.grey2};
    --grey-3:${c.grey3};
    --accent:${c.accent};
    --accent-rgb:${c.accentRgb};
    --accent-on:${c.accentOn};
    --sans:"Inter","Helvetica Neue","Arial","Segoe UI",system-ui,sans-serif;
    --sans-zh:"PingFang SC","Source Han Sans SC","Noto Sans SC","Microsoft YaHei",sans-serif;
    --mono:"JetBrains Mono","IBM Plex Mono","Consolas",monospace;
  }`;
}

/* ═══════════════════════════════════════════════════════════════
   MAGAZINE STYLE - 电子杂志风
   特征：衬线字体、优雅留白、渐变背景、装饰竖线、非对称布局
   ═══════════════════════════════════════════════════════════════ */

function generateMagazineSlides(doc: any) {
  const slides = doc.slides || [];
  const total = slides.length;
  return slides.map((slide: any, index: number) => {
    const isFirst = index === 0;
    const isLast = index === total - 1;
    const bgClass = index % 2 === 0 ? 'dark' : 'light';

    if (slide.type === 'hero' || isFirst) {
      return `<section class="slide mag-hero ${bgClass}" data-theme="${bgClass}">
  <div class="mag-chrome">
    <div class="mag-chrome-left"><span class="mag-dot"></span><span>${doc.title || 'PPT'}</span></div>
    <div class="mag-chrome-right"><span>${index + 1}</span><span class="mag-chrome-sep">/</span><span>${total}</span></div>
  </div>
  <div class="mag-hero-content">
    <div class="mag-kicker">COVER \u00B7 ${String(index + 1).padStart(2, '0')}</div>
    <h1 class="mag-hero-title">${slide.title || doc.title || 'Untitled'}</h1>
    <div class="mag-hero-line"></div>
    ${slide.subtitle ? `<p class="mag-hero-sub">${slide.subtitle}</p>` : ''}
  </div>
  <div class="mag-footer">
    <span>${doc.title || ''}</span>
    <span class="mag-footer-sep">\u2014</span>
    <span>Shrimp Workspace AI</span>
  </div>
</section>`;
    }

    if (slide.type === 'cards') {
      const items = (slide.items || []).slice(0, 4);
      return `<section class="slide mag-cards ${bgClass}" data-theme="${bgClass}">
  <div class="mag-chrome">
    <div class="mag-chrome-left"><span class="mag-dot"></span><span>${doc.title || ''}</span></div>
    <div class="mag-chrome-right"><span>CARDS</span></div>
  </div>
  <div class="mag-cards-content">
    <div class="mag-section-header">
      <div class="mag-section-num">${String(index).padStart(2, '0')}</div>
      <div class="mag-section-line"></div>
      <h2 class="mag-section-title">${slide.title || ''}</h2>
    </div>
    <div class="mag-card-grid">
      ${items.map((item: any, i: number) => `<div class="mag-card-item">
        <div class="mag-card-num">${String(i + 1).padStart(2, '0')}</div>
        <div class="mag-card-title">${item.title || ''}</div>
        <div class="mag-card-desc">${item.desc || ''}</div>
      </div>`).join('\n      ')}
    </div>
  </div>
  <div class="mag-footer">
    <span>${doc.title || ''}</span>
    <span class="mag-footer-sep">\u2014</span>
    <span>${index + 1} / ${total}</span>
  </div>
</section>`;
    }

    if (isLast && total > 2) {
      return `<section class="slide mag-hero ${bgClass}" data-theme="${bgClass}">
  <div class="mag-chrome">
    <div class="mag-chrome-left"><span class="mag-dot"></span><span>${doc.title || ''}</span></div>
    <div class="mag-chrome-right"><span>${index + 1} / ${total}</span></div>
  </div>
  <div class="mag-hero-content">
    <div class="mag-kicker">FIN \u00B7 ${String(index + 1).padStart(2, '0')}</div>
    <h1 class="mag-hero-title">\u611F\u8C22\u8046\u542C</h1>
    <div class="mag-hero-line"></div>
    <p class="mag-hero-sub">THANKS FOR WATCHING</p>
    <p class="mag-hero-meta">Shrimp Workspace AI \u00B7 \u667A\u80FD\u6F14\u793A</p>
  </div>
  <div class="mag-footer">
    <span>${doc.title || ''}</span>
    <span class="mag-footer-sep">\u2014</span>
    <span>END</span>
  </div>
</section>`;
    }

    // Default: text slide
    const items = (slide.content || []).slice(0, 6);
    return `<section class="slide mag-text ${bgClass}" data-theme="${bgClass}">
  <div class="mag-chrome">
    <div class="mag-chrome-left"><span class="mag-dot"></span><span>${doc.title || ''}</span></div>
    <div class="mag-chrome-right"><span>CHAPTER</span></div>
  </div>
  <div class="mag-text-content">
    <div class="mag-section-header">
      <div class="mag-section-num">${String(index).padStart(2, '0')}</div>
      <div class="mag-section-line"></div>
      <h2 class="mag-section-title">${slide.title || ''}</h2>
    </div>
    <div class="mag-text-list">
      ${items.map((item: string, i: number) => `<div class="mag-text-item">
        <div class="mag-text-bullet">${String(i + 1).padStart(2, '0')}</div>
        <div class="mag-text-body">${item}</div>
      </div>`).join('\n      ')}
    </div>
  </div>
  <div class="mag-footer">
    <span>${doc.title || ''}</span>
    <span class="mag-footer-sep">\u2014</span>
    <span>${index + 1} / ${total}</span>
  </div>
</section>`;
  }).join('\n\n');
}

function buildMagazineHTML(doc: any, themeKey: string) {
  const rootCSS = buildMagazineRootCSS(themeKey);
  const slidesHTML = generateMagazineSlides(doc);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${doc.title || 'PPT'} \u00B7 \u7535\u5B50\u6742\u5FD7\u98CE PPT</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=IBM+Plex+Mono:wght@300;400;500&family=Noto+Serif+SC:wght@300;400;500;600;700;900&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>
${rootCSS}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:var(--ink);color:var(--paper);font-family:var(--sans-zh);-webkit-font-smoothing:antialiased}
#deck{position:fixed;inset:0;width:10000vw;height:100vh;display:flex;flex-wrap:nowrap;transition:transform .9s cubic-bezier(.77,0,.175,1);z-index:10;will-change:transform}

/* Slide base */
.slide{width:100vw;height:100vh;flex:0 0 100vw;position:relative;padding:0;display:flex;flex-direction:column;overflow:hidden}
.slide.light{color:var(--ink);background:var(--paper)}
.slide.dark{color:var(--paper);background:var(--ink)}

/* Chrome bar */
.mag-chrome{display:flex;justify-content:space-between;align-items:center;padding:3vh 5vw;font-family:var(--mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.55}
.mag-chrome-left{display:flex;align-items:center;gap:1.2em}
.mag-dot{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.6}
.mag-chrome-sep{opacity:.4;margin:0 .3em}

/* Hero slide */
.mag-hero-content{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 8vw;position:relative}
.mag-hero-content::before{content:'';position:absolute;top:15%;left:50%;transform:translateX(-50%);width:1px;height:8vh;background:currentColor;opacity:.15}
.mag-kicker{font-family:var(--mono);font-size:11px;letter-spacing:.35em;text-transform:uppercase;opacity:.5;margin-bottom:4vh}
.mag-hero-title{font-family:var(--serif-zh);font-weight:900;font-size:min(7vw,72px);line-height:1.08;letter-spacing:.02em;max-width:16ch}
.mag-hero-line{width:60px;height:2px;background:currentColor;opacity:.3;margin:4vh auto}
.mag-hero-sub{font-family:var(--serif-zh);font-weight:400;font-size:min(2vw,22px);line-height:1.6;opacity:.75;max-width:50ch;letter-spacing:.05em}
.mag-hero-meta{font-family:var(--mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.4;margin-top:5vh}

/* Footer */
.mag-footer{display:flex;align-items:center;justify-content:center;gap:1.5em;padding:3vh 5vw;font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;opacity:.4}
.mag-footer-sep{opacity:.3}

/* Text slide */
.mag-text-content{flex:1;display:flex;flex-direction:column;padding:4vh 7vw 6vh}
.mag-section-header{display:flex;align-items:center;gap:2vw;margin-bottom:5vh}
.mag-section-num{font-family:var(--serif-en);font-weight:700;font-size:min(5vw,56px);line-height:1;opacity:.25}
.mag-section-line{width:40px;height:1px;background:currentColor;opacity:.25}
.mag-section-title{font-family:var(--serif-zh);font-weight:700;font-size:min(3.2vw,38px);line-height:1.15;letter-spacing:.02em}

.mag-text-list{display:flex;flex-direction:column;gap:0;flex:1;justify-content:center}
.mag-text-item{display:flex;align-items:flex-start;gap:2vw;padding:2.2vh 0;border-top:1px solid currentColor;opacity:.88}
.mag-text-item:last-child{border-bottom:1px solid currentColor}
.mag-text-bullet{font-family:var(--serif-en);font-weight:600;font-size:min(2vw,20px);opacity:.35;min-width:2.5em;line-height:1.4}
.mag-text-body{font-family:var(--sans-zh);font-weight:400;font-size:max(14px,1.15vw);line-height:1.65;opacity:.85;flex:1}

/* Cards slide */
.mag-cards-content{flex:1;display:flex;flex-direction:column;padding:4vh 7vw 6vh}
.mag-card-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:4vh 5vw;flex:1;align-content:center}
.mag-card-item{display:flex;flex-direction:column;gap:1.2vh;padding:2.5vh 2vw;border-left:2px solid currentColor;padding-left:2vw;opacity:.9}
.mag-card-num{font-family:var(--serif-en);font-style:italic;font-size:min(2.2vw,22px);opacity:.35;margin-bottom:.5vh}
.mag-card-title{font-family:var(--serif-zh);font-weight:700;font-size:min(2vw,22px);line-height:1.2;letter-spacing:.02em}
.mag-card-desc{font-family:var(--sans-zh);font-weight:400;font-size:max(13px,1vw);line-height:1.6;opacity:.7;margin-top:.5vh}

/* Responsive */
@media(max-width:900px){
  .mag-hero-title{font-size:10vw}
  .mag-section-title{font-size:6vw}
  .mag-card-grid{grid-template-columns:1fr}
  .mag-section-header{flex-direction:column;align-items:flex-start;gap:1vh}
  .mag-section-line{width:30px}
}

/* Nav dots */
#nav{position:fixed;left:50%;bottom:2.6vh;transform:translateX(-50%);z-index:30;display:flex;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(0,0,0,.18);backdrop-filter:blur(10px)}
#nav .dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.3);cursor:pointer;transition:all .3s;border:0;padding:0}
#nav .dot:hover{background:rgba(255,255,255,.5)}
#nav .dot.active{background:rgba(255,255,255,.95);width:22px;border-radius:999px}
body.light-bg #nav{background:rgba(255,255,255,.25)}
body.light-bg #nav .dot{background:rgba(var(--ink-rgb),.25)}
body.light-bg #nav .dot.active{background:rgba(var(--ink-rgb),.9)}
#hint{position:fixed;bottom:3vh;right:3vw;z-index:30;font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;opacity:.35;color:#aaa}
</style>
</head>
<body>
<div id="hint">\u2190 \u2192 \u7FFB\u9875 \u00B7 ESC \u7D22\u5F15</div>
<div id="deck">
${slidesHTML}
</div>
<div id="nav"></div>
<script>
const deck=document.getElementById('deck');
const slides=deck.querySelectorAll('.slide');
const nav=document.getElementById('nav');
let idx=0,total=slides.length,lock=false;
deck.style.width=(total*100)+'vw';
slides.forEach((s,i)=>{const b=document.createElement('button');b.className='dot';b.onclick=()=>go(i);nav.appendChild(b);});
function go(n){if(lock)return;idx=Math.max(0,Math.min(total-1,n));deck.style.transform='translateX('+(-idx*100)+'vw)';nav.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('active',i===idx));const el=slides[idx];const th=el.dataset.theme||(el.classList.contains('light')?'light':'dark');document.body.classList.toggle('light-bg',th==='light');lock=true;setTimeout(()=>lock=false,700);}
let overviewOn=false;const ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.92);display:none;overflow-y:auto;padding:4vh 4vw';document.body.appendChild(ov);
function toggleOverview(){overviewOn=!overviewOn;if(overviewOn){ov.innerHTML='';const g=document.createElement('div');g.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:2vh 1.6vw;max-width:90vw;margin:0 auto';slides.forEach((s,i)=>{const c=document.createElement('div');c.style.cssText='cursor:pointer;border:2px solid '+(i===idx?'rgba(255,255,255,.8)':'rgba(255,255,255,.15)')+';border-radius:6px;overflow:hidden';const w=document.createElement('div');w.style.cssText='width:100%;aspect-ratio:16/9;overflow:hidden;position:relative;pointer-events:none;background:'+(s.classList.contains('light')?'var(--paper)':'var(--ink)');const cl=s.cloneNode(true);cl.style.cssText='width:100vw;height:100vh;transform:scale('+(1/4.5)+');transform-origin:top left;position:absolute;top:0;left:0;pointer-events:none';w.appendChild(cl);const l=document.createElement('div');l.style.cssText='padding:6px 10px;font-family:var(--mono);font-size:11px;color:#fff;opacity:.7';l.textContent=(i+1)+'/'+total;c.appendChild(w);c.appendChild(l);c.onclick=()=>{toggleOverview();go(i);};g.appendChild(c);});ov.appendChild(g);ov.style.display='block';}else{ov.style.display='none';}}
addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();toggleOverview();return;}if(overviewOn)return;if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '||e.key==='ArrowDown')go(idx+1);if(e.key==='ArrowLeft'||e.key==='PageUp'||e.key==='ArrowUp')go(idx-1);if(e.key==='Home')go(0);if(e.key==='End')go(total-1);});
let wheelTO=null,wheelAcc=0;addEventListener('wheel',e=>{wheelAcc+=e.deltaY+e.deltaX;if(Math.abs(wheelAcc)>50){go(idx+(wheelAcc>0?1:-1));wheelAcc=0;}clearTimeout(wheelTO);wheelTO=setTimeout(()=>wheelAcc=0,150);},{passive:true});
let tx=0;addEventListener('touchstart',e=>{tx=e.touches[0].clientX},{passive:true});addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>50)go(idx+(dx<0?1:-1));},{passive:true});
go(0);
</script>
</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════════════
   SWISS STYLE - 瑞士国际主义
   特征：无衬线粗体、网格系统、高对比色块、大号数字、几何美学
   ═══════════════════════════════════════════════════════════════ */

function generateSwissSlides(doc: any) {
  const slides = doc.slides || [];
  const total = slides.length;
  return slides.map((slide: any, index: number) => {
    const isFirst = index === 0;
    const isLast = index === total - 1;

    if (slide.type === 'hero' || isFirst) {
      return `<section class="slide swiss-hero" data-index="${index}">
  <div class="swiss-hero-bg"></div>
  <div class="swiss-hero-content">
    <div class="swiss-hero-meta">
      <span>${doc.title || 'PPT'}</span>
      <span class="swiss-hero-meta-sep">\u00B7</span>
      <span>${index + 1} / ${total}</span>
    </div>
    <h1 class="swiss-hero-title">${slide.title || doc.title || 'Untitled'}</h1>
    <div class="swiss-hero-bottom">
      <div class="swiss-hero-line"></div>
      <p class="swiss-hero-sub">${slide.subtitle || ''}</p>
      <div class="swiss-hero-footer">
        <span class="swiss-hero-tag">Shrimp Workspace AI</span>
        <span class="swiss-hero-tag">\u2192 \u7FFB\u9875</span>
      </div>
    </div>
  </div>
</section>`;
    }

    if (slide.type === 'cards') {
      const items = (slide.items || []).slice(0, 4);
      return `<section class="slide swiss-cards" data-index="${index}">
  <div class="swiss-canvas">
    <div class="swiss-chrome">
      <span class="swiss-chrome-label">${String(index).padStart(2, '0')} \u00B7 SECTION</span>
      <span class="swiss-chrome-page">${index + 1} / ${total}</span>
    </div>
    <div class="swiss-cards-header">
      <div class="swiss-big-num">${String(index).padStart(2, '0')}</div>
      <h2 class="swiss-cards-title">${slide.title || ''}</h2>
    </div>
    <div class="swiss-cards-grid">
      ${items.map((item: any, i: number) => `<div class="swiss-card${i === 0 ? ' swiss-card-accent' : ''}">
        <div class="swiss-card-top">
          <span class="swiss-card-num">${String(i + 1).padStart(2, '0')}</span>
          <div class="swiss-card-line"></div>
        </div>
        <div class="swiss-card-title">${item.title || ''}</div>
        <div class="swiss-card-desc">${item.desc || ''}</div>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`;
    }

    if (isLast && total > 2) {
      return `<section class="slide swiss-closing" data-index="${index}">
  <div class="swiss-closing-left">
    <div class="swiss-closing-accent-bg"></div>
    <div class="swiss-closing-content">
      <div class="swiss-chrome" style="color:rgba(255,255,255,.6);margin-bottom:auto">
        <span>${index + 1} / ${total}</span>
        <span>CLOSING</span>
      </div>
      <div>
        <div class="swiss-closing-kicker">MANIFESTO</div>
        <h2 class="swiss-closing-title">\u611F\u8C22\u8046\u542C</h2>
        <p class="swiss-closing-sub">THANKS FOR WATCHING</p>
      </div>
      <div class="swiss-closing-footer">
        <span>Shrimp Workspace AI</span>
        <span>END</span>
      </div>
    </div>
  </div>
  <div class="swiss-closing-right">
    <div class="swiss-chrome" style="margin-bottom:auto">
      <span>TAKEAWAYS</span>
      <span>FIN</span>
    </div>
    <div class="swiss-closing-list">
      <div class="swiss-closing-item">
        <span class="swiss-closing-item-num">01</span>
        <span class="swiss-closing-item-text">${doc.title || ''}</span>
      </div>
      <div class="swiss-closing-item swiss-closing-item-accent">
        <span class="swiss-closing-item-num">02</span>
        <span class="swiss-closing-item-text">AI \u667A\u80FD\u751F\u6210 \u00B7 \u5B8C</span>
      </div>
    </div>
    <div class="swiss-chrome" style="margin-top:auto;text-align:right">
      <span>\u5B8C \u00B7 END OF DECK</span>
    </div>
  </div>
</section>`;
    }

    // Default: text slide
    const items = (slide.content || []).slice(0, 6);
    return `<section class="slide swiss-text" data-index="${index}">
  <div class="swiss-canvas">
    <div class="swiss-chrome">
      <span class="swiss-chrome-label">${String(index).padStart(2, '0')} \u00B7 CHAPTER</span>
      <span class="swiss-chrome-page">${index + 1} / ${total}</span>
    </div>
    <div class="swiss-text-header">
      <div class="swiss-big-num">${String(index).padStart(2, '0')}</div>
      <h2 class="swiss-text-title">${slide.title || ''}</h2>
    </div>
    <div class="swiss-text-list">
      ${items.map((item: string, i: number) => `<div class="swiss-text-item">
        <div class="swiss-text-item-num">${String(i + 1).padStart(2, '0')}</div>
        <div class="swiss-text-item-line"></div>
        <div class="swiss-text-item-body">${item}</div>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`;
  }).join('\n\n');
}

function buildSwissHTML(doc: any, themeKey: string) {
  const rootCSS = buildSwissRootCSS(themeKey);
  const slidesHTML = generateSwissSlides(doc);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${doc.title || 'PPT'} \u00B7 \u745E\u58EB\u56FD\u9645\u4E3B\u4E49 PPT</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&family=Noto+Sans+SC:wght@200;300;400;500;700;900&display=swap" rel="stylesheet">
<style>
${rootCSS}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:var(--paper);color:var(--ink);font-family:var(--sans),var(--sans-zh);-webkit-font-smoothing:antialiased}
#deck{position:fixed;inset:0;width:10000vw;height:100vh;display:flex;flex-wrap:nowrap;transition:transform .9s cubic-bezier(.77,0,.175,1);z-index:10;will-change:transform}

/* Slide base */
.slide{width:100vw;height:100vh;flex:0 0 100vw;position:relative;padding:0;overflow:hidden;background:var(--paper);color:var(--ink)}

/* Swiss chrome */
.swiss-chrome{display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);font-size:12px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--grey-3)}
.swiss-chrome-label{color:var(--accent);font-weight:600}

/* Hero */
.swiss-hero{position:relative;background:var(--accent);color:var(--accent-on)}
.swiss-hero-bg{position:absolute;inset:0;opacity:.08;background:repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,.1) 60px,rgba(255,255,255,.1) 61px)}
.swiss-hero-content{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;padding:5vh 6vw 4vh}
.swiss-hero-meta{display:flex;align-items:center;gap:.8em;font-family:var(--mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.65;margin-bottom:auto}
.swiss-hero-meta-sep{opacity:.4}
.swiss-hero-title{font-family:var(--sans),var(--sans-zh);font-weight:800;font-size:min(8vw,84px);line-height:.95;letter-spacing:-.03em;margin-top:auto;margin-bottom:auto;max-width:14ch}
.swiss-hero-bottom{margin-top:auto}
.swiss-hero-line{width:50px;height:3px;background:currentColor;opacity:.4;margin-bottom:2.5vh}
.swiss-hero-sub{font-family:var(--sans),var(--sans-zh);font-weight:400;font-size:min(1.8vw,18px);line-height:1.5;opacity:.85;max-width:48ch;margin-bottom:3vh}
.swiss-hero-footer{display:flex;justify-content:space-between;align-items:center}
.swiss-hero-tag{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;opacity:.55;border:1px solid currentColor;padding:.4em 1em;opacity:.5}

/* Canvas for non-hero */
.swiss-canvas{height:100%;display:flex;flex-direction:column;padding:4vh 5vw 3.5vh}

/* Cards */
.swiss-cards-header{display:flex;align-items:flex-end;gap:2vw;margin-bottom:4vh;padding-bottom:2vh;border-bottom:2px solid var(--ink)}
.swiss-big-num{font-family:var(--sans);font-weight:200;font-size:min(7vw,72px);line-height:.85;letter-spacing:-.04em;opacity:.9;color:var(--accent)}
.swiss-cards-title{font-family:var(--sans),var(--sans-zh);font-weight:700;font-size:min(3vw,36px);line-height:1.1;letter-spacing:-.02em;flex:1}
.swiss-cards-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:3vh 3vw;flex:1;align-content:center}
.swiss-card{background:var(--grey-1);padding:3vh 2.5vw;display:flex;flex-direction:column;position:relative;min-height:0;border-top:3px solid var(--grey-2)}
.swiss-card-accent{background:var(--accent);color:var(--accent-on);border-top-color:var(--accent-on)}
.swiss-card-top{display:flex;align-items:center;gap:1vw;margin-bottom:1.5vh}
.swiss-card-num{font-family:var(--mono);font-size:13px;font-weight:600;letter-spacing:.15em;opacity:.6}
.swiss-card-accent .swiss-card-num{opacity:.7}
.swiss-card-line{flex:1;height:1px;background:currentColor;opacity:.2}
.swiss-card-title{font-family:var(--sans),var(--sans-zh);font-weight:600;font-size:max(16px,1.4vw);line-height:1.25;margin-bottom:1vh}
.swiss-card-desc{font-family:var(--sans),var(--sans-zh);font-size:max(14px,.95vw);line-height:1.55;opacity:.75;margin-top:auto}

/* Text */
.swiss-text-header{display:flex;align-items:flex-end;gap:2vw;margin-bottom:3vh;padding-bottom:2vh;border-bottom:2px solid var(--ink)}
.swiss-text-title{font-family:var(--sans),var(--sans-zh);font-weight:700;font-size:min(3vw,36px);line-height:1.1;letter-spacing:-.02em;flex:1}
.swiss-text-list{display:flex;flex-direction:column;gap:0;flex:1;justify-content:center}
.swiss-text-item{display:grid;grid-template-columns:auto 1fr;gap:2vw;align-items:start;padding:2vh 0;border-top:1px solid var(--grey-2)}
.swiss-text-item:last-child{border-bottom:1px solid var(--grey-2)}
.swiss-text-item-num{font-family:var(--mono);font-size:13px;font-weight:600;letter-spacing:.1em;color:var(--accent);padding-top:.3em}
.swiss-text-item-body{font-family:var(--sans),var(--sans-zh);font-size:max(15px,1.05vw);line-height:1.6;opacity:.85}

/* Closing */
.swiss-closing{display:grid;grid-template-columns:1fr 1fr;height:100%}
.swiss-closing-left{position:relative;background:var(--accent);color:var(--accent-on);display:flex;flex-direction:column}
.swiss-closing-accent-bg{position:absolute;inset:0;opacity:.06;background:repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,.1) 40px,rgba(255,255,255,.1) 41px)}
.swiss-closing-content{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;padding:4vh 4vw 3.5vh;height:100%}
.swiss-closing-kicker{font-family:var(--mono);font-size:11px;letter-spacing:.25em;text-transform:uppercase;opacity:.65;margin-bottom:2vh}
.swiss-closing-title{font-family:var(--sans),var(--sans-zh);font-weight:800;font-size:min(6vw,64px);line-height:.95;letter-spacing:-.03em;margin-bottom:1.5vh}
.swiss-closing-sub{font-family:var(--sans),var(--sans-zh);font-size:max(14px,1.1vw);opacity:.8;letter-spacing:.05em}
.swiss-closing-footer{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:2vh;border-top:1px solid rgba(255,255,255,.2);font-family:var(--mono);font-size:11px;letter-spacing:.15em;text-transform:uppercase;opacity:.55}
.swiss-closing-right{padding:4vh 4vw 3.5vh;display:flex;flex-direction:column;background:var(--paper);color:var(--ink)}
.swiss-closing-list{flex:1;display:flex;flex-direction:column;justify-content:center}
.swiss-closing-item{display:grid;grid-template-columns:auto 1fr;gap:2vw;align-items:start;padding:3vh 0;border-top:1px solid var(--grey-2)}
.swiss-closing-item:last-child{border-bottom:1px solid var(--grey-2)}
.swiss-closing-item-num{font-family:var(--sans);font-weight:200;font-size:min(4vw,48px);line-height:.9;letter-spacing:-.04em}
.swiss-closing-item-text{font-family:var(--sans),var(--sans-zh);font-weight:500;font-size:max(17px,1.4vw);line-height:1.2}
.swiss-closing-item-accent .swiss-closing-item-num{color:var(--accent)}
.swiss-closing-item-accent .swiss-closing-item-text{color:var(--accent)}

/* Nav dots */
#nav{position:fixed;left:50%;bottom:2vh;transform:translateX(-50%);z-index:30;display:flex;gap:10px;padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.12);backdrop-filter:blur(8px)}
#nav .dot{width:6px;height:6px;border-radius:3px;background:rgba(0,0,0,.25);cursor:pointer;transition:all .25s;border:0;padding:0}
#nav .dot:hover{background:rgba(0,0,0,.5)}
#nav .dot.active{background:var(--accent);width:18px}
body.dark-bg #nav{background:rgba(255,255,255,.15)}
body.dark-bg #nav .dot{background:rgba(255,255,255,.35)}
body.dark-bg #nav .dot.active{background:var(--accent)}
#hint{position:fixed;bottom:2.4vh;right:2.5vw;z-index:30;font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.35}

/* Responsive */
@media(max-width:900px){
  .swiss-hero-title{font-size:12vw}
  .swiss-cards-grid{grid-template-columns:1fr}
  .swiss-closing{grid-template-columns:1fr}
  .swiss-closing-right{display:none}
  .swiss-big-num{font-size:12vw}
}
</style>
</head>
<body>
<div id="hint">\u2190 \u2192 \u7FFB\u9875 \u00B7 ESC \u7D22\u5F15</div>
<div id="deck">
${slidesHTML}
</div>
<div id="nav"></div>
<script>
const deck=document.getElementById('deck');
const slides=deck.querySelectorAll('.slide');
const nav=document.getElementById('nav');
let idx=0,total=slides.length,lock=false;
deck.style.width=(total*100)+'vw';
slides.forEach((s,i)=>{const b=document.createElement('button');b.className='dot';b.onclick=()=>go(i);nav.appendChild(b);});
function go(n){if(lock)return;idx=Math.max(0,Math.min(total-1,n));deck.style.transform='translateX('+(-idx*100)+'vw)';nav.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('active',i===idx));const el=slides[idx];const isDark=el.classList.contains('swiss-hero')||el.classList.contains('swiss-closing')||el.classList.contains('accent')||el.classList.contains('dark');document.body.classList.toggle('dark-bg',isDark);lock=true;setTimeout(()=>lock=false,700);}
let overviewOn=false;const ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;z-index:100;background:rgba(250,250,248,.96);display:none;overflow-y:auto;padding:4vh 4vw';document.body.appendChild(ov);
function toggleOverview(){overviewOn=!overviewOn;if(overviewOn){ov.innerHTML='';const g=document.createElement('div');g.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:2vh 1.6vw;max-width:90vw;margin:0 auto';slides.forEach((s,i)=>{const c=document.createElement('div');c.style.cssText='cursor:pointer;border:2px solid '+(i===idx?'var(--accent)':'rgba(0,0,0,.12)')+';overflow:hidden';const w=document.createElement('div');const isDark=s.classList.contains('swiss-hero')||s.classList.contains('swiss-closing')||s.classList.contains('accent')||s.classList.contains('dark');w.style.cssText='width:100%;aspect-ratio:16/9;overflow:hidden;position:relative;pointer-events:none;background:'+(isDark?'var(--ink)':'var(--paper)');const cl=s.cloneNode(true);cl.style.cssText='width:100vw;height:100vh;transform:scale('+(1/4.5)+');transform-origin:top left;position:absolute;top:0;left:0;pointer-events:none';w.appendChild(cl);const l=document.createElement('div');l.style.cssText='padding:6px 10px;font-family:var(--mono);font-size:14px;color:var(--ink);opacity:.7';l.textContent=(i+1)+'/'+total;c.appendChild(w);c.appendChild(l);c.onclick=()=>{toggleOverview();go(i);};g.appendChild(c);});ov.appendChild(g);ov.style.display='block';}else{ov.style.display='none';}}
addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();toggleOverview();return;}if(overviewOn)return;if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '||e.key==='ArrowDown')go(idx+1);if(e.key==='ArrowLeft'||e.key==='PageUp'||e.key==='ArrowUp')go(idx-1);if(e.key==='Home')go(0);if(e.key==='End')go(total-1);});
let wheelTO=null,wheelAcc=0;addEventListener('wheel',e=>{wheelAcc+=e.deltaY+e.deltaX;if(Math.abs(wheelAcc)>50){go(idx+(wheelAcc>0?1:-1));wheelAcc=0;}clearTimeout(wheelTO);wheelTO=setTimeout(()=>wheelAcc=0,150);},{passive:true});
let tx=0;addEventListener('touchstart',e=>{tx=e.touches[0].clientX},{passive:true});addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>50)go(idx+(dx<0?1:-1));},{passive:true});
go(0);
</script>
</body>
</html>`;
}

function exportHTML(doc: any, style = 'magazine', theme = 'ink') {
  if (style === 'swiss') {
    return buildSwissHTML(doc, theme);
  }
  return buildMagazineHTML(doc, theme);
}

module.exports = { exportHTML };

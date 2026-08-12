(() => {
  const canvas = document.getElementById('covenant-game');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const milesEl = document.getElementById('game-miles');
  const beersEl = document.getElementById('game-beers');
  const hitsEl = document.getElementById('game-hits');
  const speedEl = document.getElementById('game-speed');
  const bestEl = document.getElementById('game-best');
  const overlay = document.getElementById('game-overlay');
  const titleEl = document.getElementById('game-title');
  const messageEl = document.getElementById('game-message');
  const startBtn = document.getElementById('game-start');
  const leftBtn = document.getElementById('game-left');
  const rightBtn = document.getElementById('game-right');
  const stageWrap = document.querySelector('.game-stage-wrap');

  const W = canvas.width;
  const H = canvas.height;
  const horizonY = 205;
  const roadBottom = 1130;
  const roadTop = 250;
  const PLAYER_Y = H - 78;

  let running = false;
  let last = 0;
  let miles = 0;
  let beers = 0;
  let hits = 0;
  let best = Number(localStorage.getItem('covenantRunBest') || 0);
  let speed = 60;
  let playerLane = 1;
  let playerX = W / 2;
  let targetX = W / 2;
  let objects = [];
  let spawnTimer = 0;
  let sceneryOffset = 0;
  let flashText = '';
  let flashTimer = 0;
  let avoided = 0;
  let invulnerableTimer = 0;
  let impactTimer = 0;
  let particles = [];
  let beerEffectTimer = 0;
  let beerBlurTimeout = null;

  bestEl.textContent = `${best.toFixed(1)} mi`;

  const laneXAt = (lane, y) => {
    const t = (y - horizonY) / (H - horizonY);
    const halfWidth = (roadTop / 2) + t * ((roadBottom - roadTop) / 2);
    return W / 2 + (lane - 1) * halfWidth * 0.52;
  };

  function updateHud() {
    milesEl.textContent = miles.toFixed(1);
    beersEl.textContent = String(beers);
    if (hitsEl) hitsEl.textContent = `${hits} / 3`;
    speedEl.textContent = `${Math.round(speed)} mph`;
  }

  function reset() {
    miles = 0;
    beers = 0;
    hits = 0;
    speed = 60;
    playerLane = 1;
    playerX = targetX = laneXAt(1, PLAYER_Y);
    objects = [];
    spawnTimer = 0;
    sceneryOffset = 0;
    flashText = '';
    flashTimer = 0;
    avoided = 0;
    invulnerableTimer = 0;
    impactTimer = 0;
    particles = [];
    beerEffectTimer = 0;
    if (beerBlurTimeout) clearTimeout(beerBlurTimeout);
    if (stageWrap) stageWrap.classList.remove('game-beer-blur');
    updateHud();
  }

  function startGame() {
    reset();
    running = true;
    last = performance.now();
    overlay.classList.add('hidden');
    requestAnimationFrame(loop);
  }

  function endGame(reason) {
    running = false;
    if (stageWrap) stageWrap.classList.remove('game-beer-blur');
    if (miles > best) {
      best = miles;
      localStorage.setItem('covenantRunBest', String(best));
    }
    bestEl.textContent = `${best.toFixed(1)} mi`;
    titleEl.textContent = 'RIDE TERMINATED';
    messageEl.innerHTML = `${reason}<br><br><strong>${miles.toFixed(1)} miles survived</strong><br>${avoided} hazards avoided • ${hits} hits • ${beers} Beer Stop${beers === 1 ? '' : 's'}<br><br>The Covenant remains in force.`;
    startBtn.textContent = 'TRY AGAIN';
    overlay.classList.remove('hidden');
  }

  function steer(dir) {
    if (!running) return;
    playerLane = Math.max(0, Math.min(2, playerLane + dir));
    targetX = laneXAt(playerLane, PLAYER_Y);
  }

  function spawnObject() {
    const r = Math.random();
    let type;
    if (r < 0.12) type = 'beer';
    else if (r < 0.34) type = 'cone';
    else if (r < 0.55) type = 'gravel';
    else if (r < 0.76) type = 'deer';
    else type = 'minivan';

    let lane = Math.floor(Math.random() * 3);
    if (objects.length && Math.random() < 0.28) {
      lane = (objects[objects.length - 1].lane + 1 + Math.floor(Math.random() * 2)) % 3;
    }
    objects.push({ type, lane, z: 0, resolved: false });
  }

  function collision(obj) {
    const y = horizonY + obj.z * (H - horizonY);
    if (y < PLAYER_Y - 98 || y > PLAYER_Y + 48) return false;
    const x = laneXAt(obj.lane, y);
    const hitRadius = obj.type === 'gravel' ? 94 : 82;
    return Math.abs(x - playerX) < hitRadius;
  }

  function makeImpact(x, y, type) {
    impactTimer = 420;
    flashText = type === 'beer' ? 'BEER STOP +0.5 MI' : 'WHAM!';
    flashTimer = type === 'beer' ? 1250 : 700;

    if (stageWrap && type !== 'beer') {
      stageWrap.classList.remove('game-hit');
      void stageWrap.offsetWidth;
      stageWrap.classList.add('game-hit');
    }

    const count = type === 'beer' ? 18 : 34;
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * (type === 'beer' ? 220 : 390),
        vy: -60 - Math.random() * 260,
        life: 450 + Math.random() * 420,
        maxLife: 900,
        beer: type === 'beer'
      });
    }
  }

  function resolveCollision(obj) {
    const y = horizonY + obj.z * (H - horizonY);
    const x = laneXAt(obj.lane, y);

    if (obj.type === 'beer') {
      beers += 1;
      miles += 0.5;
      beerEffectTimer = 2400;
      makeImpact(x, y, 'beer');

      if (stageWrap) {
        stageWrap.classList.remove('game-beer-blur');
        void stageWrap.offsetWidth;
        stageWrap.classList.add('game-beer-blur');
        if (beerBlurTimeout) clearTimeout(beerBlurTimeout);
        beerBlurTimeout = setTimeout(() => {
          stageWrap.classList.remove('game-beer-blur');
        }, 1650);
      }

      flashText = 'BEER VISION ENGAGED  +0.5 MI';
      flashTimer = 1500;
      obj.resolved = true;
      updateHud();
      return;
    }

    if (invulnerableTimer > 0) return;

    hits += 1;
    invulnerableTimer = 1100;
    makeImpact(x, y, obj.type);
    obj.resolved = true;
    updateHud();

    const hitMessages = {
      cone: 'Cone strike. The Department of Transportation has been notified.',
      gravel: 'Gravel attack. Traction has left the chat.',
      deer: 'Wildlife encounter. Negotiations failed.',
      minivan: 'Minivan contact. Dignity damage is extensive.'
    };
    flashText = `${hitMessages[obj.type]}  HIT ${hits}/3`;
    flashTimer = 1300;

    if (hits >= 3) {
      const endings = {
        cone: 'Three strikes. The cones have won.',
        gravel: 'Three hits. Gravel has terminated the expedition.',
        deer: 'Three hits. The wildlife committee has revoked riding privileges.',
        minivan: 'Three hits. Defeated by suburban transportation.'
      };
      setTimeout(() => endGame(endings[obj.type]), 170);
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
      p.vy += 520 * dt / 1000;
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function update(dt) {
    if (invulnerableTimer > 0) invulnerableTimer -= dt;
    if (impactTimer > 0) impactTimer -= dt;
    if (flashTimer > 0) flashTimer -= dt;
    if (beerEffectTimer > 0) beerEffectTimer -= dt;

    const normalSpeed = Math.min(155, 60 + miles * 1.45);
    speed = beerEffectTimer > 0 ? normalSpeed * 0.84 : normalSpeed;
    miles += dt * (0.00245 * (speed / 60));
    sceneryOffset += dt * speed * 0.025;

    playerX += (targetX - playerX) * Math.min(1, dt * 0.016);

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObject();
      spawnTimer = Math.max(330, 980 - speed * 3.9) + Math.random() * 250;
    }

    for (const obj of objects) {
      // Perspective should get FASTER near the rider, not slower.
      const baseAdvance = 0.00042 + speed * 0.0000024;
      const perspectiveBoost = 0.82 + obj.z * 1.25;
      obj.z += dt * baseAdvance * perspectiveBoost;

      if (!obj.resolved && collision(obj)) {
        resolveCollision(obj);
      }

      if (!obj.resolved && obj.z > 1.04) {
        if (obj.type !== 'beer') avoided += 1;
        obj.resolved = true;
      }
    }

    objects = objects.filter(o => o.z < 1.15 && !(o.resolved && o.type === 'beer'));
    updateParticles(dt);
    updateHud();
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, horizonY + 90);
    g.addColorStop(0, '#171717');
    g.addColorStop(1, '#3a2b25');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizonY + 100);

    ctx.fillStyle = '#101010';
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 30);
    const peaks = [0,110,205,310,405,520,635,760,870,990,1110,1280];
    peaks.forEach((x, i) => {
      const y = horizonY - 35 - ((i * 47) % 95);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(W, horizonY + 70);
    ctx.lineTo(0, horizonY + 70);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#242424';
    for (let i = 0; i < 18; i++) {
      const x = ((i * 97 - sceneryOffset * 0.2) % (W + 140)) - 70;
      const h = 25 + (i % 4) * 13;
      ctx.fillRect(x, horizonY + 16 - h, 8, h);
      ctx.beginPath();
      ctx.moveTo(x - 12, horizonY + 18 - h + 14);
      ctx.lineTo(x + 4, horizonY + 2 - h);
      ctx.lineTo(x + 20, horizonY + 18 - h + 14);
      ctx.fill();
    }
  }

  function drawRoad() {
    ctx.fillStyle = '#202020';
    ctx.beginPath();
    ctx.moveTo(W/2 - roadTop/2, horizonY);
    ctx.lineTo(W/2 + roadTop/2, horizonY);
    ctx.lineTo(W/2 + roadBottom/2, H);
    ctx.lineTo(W/2 - roadBottom/2, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#d6d2c8';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(W/2 - roadTop/2, horizonY);
    ctx.lineTo(W/2 - roadBottom/2, H);
    ctx.moveTo(W/2 + roadTop/2, horizonY);
    ctx.lineTo(W/2 + roadBottom/2, H);
    ctx.stroke();

    ctx.strokeStyle = '#a7a39b';
    for (let lane = 0; lane < 2; lane++) {
      for (let i = 0; i < 11; i++) {
        const phase = ((i / 11 + (sceneryOffset % 1000) / 1000) % 1);
        const z1 = phase;
        const z2 = Math.min(1, z1 + 0.045 + z1 * 0.04);
        const y1 = horizonY + z1 * (H - horizonY);
        const y2 = horizonY + z2 * (H - horizonY);
        const boundary = lane === 0 ? 0.5 : 1.5;
        const x1 = laneXAt(boundary, y1);
        const x2 = laneXAt(boundary, y2);
        ctx.lineWidth = 2 + z1 * 6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  function drawObject(obj) {
    const z = obj.z;
    if (z < 0 || z > 1.1) return;
    const y = horizonY + z * (H - horizonY);
    const x = laneXAt(obj.lane, y);
    const s = 0.22 + z * 1.05;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    if (obj.type === 'cone') {
      ctx.fillStyle = '#f04b23';
      ctx.beginPath();
      ctx.moveTo(0, -55); ctx.lineTo(-34, 34); ctx.lineTo(34, 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#eee8dc'; ctx.fillRect(-23, -4, 46, 13);
      ctx.fillStyle = '#f04b23'; ctx.fillRect(-48, 34, 96, 13);
    } else if (obj.type === 'gravel') {
      ctx.fillStyle = '#8f8a7b';
      for (let i = 0; i < 18; i++) {
        const a = (i * 1.9) % 6.28;
        const r = 12 + (i * 11) % 62;
        ctx.beginPath(); ctx.arc(Math.cos(a)*r, Math.sin(a)*r*0.35, 4 + i%5, 0, Math.PI*2); ctx.fill();
      }
    } else if (obj.type === 'deer') {
      ctx.strokeStyle = '#c9b28f'; ctx.fillStyle = '#8d6946'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.ellipse(0, -8, 42, 24, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(28, -40, 16, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-22, 7); ctx.lineTo(-35, 48); ctx.moveTo(16, 8); ctx.lineTo(28, 49); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(34,-52); ctx.lineTo(45,-72); ctx.moveTo(34,-52); ctx.lineTo(27,-75); ctx.stroke();
    } else if (obj.type === 'minivan') {
      ctx.fillStyle = '#71767b';
      ctx.fillRect(-55, -45, 110, 78);
      ctx.fillStyle = '#a8c1cc'; ctx.fillRect(-42, -34, 84, 30);
      ctx.fillStyle = '#111'; ctx.fillRect(-48, 26, 26, 18); ctx.fillRect(22, 26, 26, 18);
      ctx.fillStyle = '#f7e4b3'; ctx.fillRect(-44, 10, 15, 9); ctx.fillRect(29, 10, 15, 9);
    } else if (obj.type === 'beer') {
      ctx.fillStyle = '#f04b23';
      ctx.fillRect(-46, -48, 92, 86);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 19px Arial'; ctx.textAlign = 'center';
      ctx.fillText('BEER', 0, -7); ctx.fillText('STOP', 0, 17);
      ctx.fillStyle = '#d5b35a'; ctx.fillRect(-12, -83, 24, 35);
      ctx.fillStyle = '#eee'; ctx.fillRect(-14, -88, 28, 8);
    }
    ctx.restore();
  }

  function drawBike() {
    const x = playerX;
    const y = PLAYER_Y;
    ctx.save();
    ctx.translate(x, y);

    // One centered rear tire: unmistakably a motorcycle, not a trike.
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.ellipse(0, 18, 17, 48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rear fender / undertail.
    ctx.fillStyle = '#171717';
    ctx.beginPath();
    ctx.moveTo(-25, -8);
    ctx.lineTo(-17, 29);
    ctx.lineTo(17, 29);
    ctx.lineTo(25, -8);
    ctx.closePath();
    ctx.fill();

    // Sport-bike tail section.
    ctx.fillStyle = '#f04b23';
    ctx.beginPath();
    ctx.moveTo(0, -82);
    ctx.lineTo(-37, -36);
    ctx.lineTo(-27, 3);
    ctx.lineTo(0, -9);
    ctx.lineTo(27, 3);
    ctx.lineTo(37, -36);
    ctx.closePath();
    ctx.fill();

    // Seat / rider torso.
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(0, -48, 27, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -83, 22, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail light.
    ctx.fillStyle = '#ff3b2f';
    ctx.fillRect(-18, -20, 36, 10);
    ctx.fillStyle = '#fff0e8';
    ctx.fillRect(-13, -18, 26, 4);

    // Twin exhaust outlets, close together under tail.
    ctx.fillStyle = '#707070';
    ctx.beginPath(); ctx.arc(-20, 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, 2, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath(); ctx.arc(-20, 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, 2, 4, 0, Math.PI * 2); ctx.fill();

    // Handlebar tips / mirrors hint at a narrow bike silhouette.
    ctx.strokeStyle = '#6a6a6a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-17, -57); ctx.lineTo(-46, -45);
    ctx.moveTo(17, -57); ctx.lineTo(46, -45);
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(-50, -45, 8, 5, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(50, -45, 8, 5, 0.2, 0, Math.PI * 2); ctx.fill();

    // Flicker while briefly invulnerable after a hit.
    if (invulnerableTimer > 0 && Math.floor(invulnerableTimer / 90) % 2 === 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(-60, -115, 120, 180);
    }
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.beer ? '#d5b35a' : '#f04b23';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.beer ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawRoad();
    objects.sort((a,b) => a.z - b.z).forEach(drawObject);
    drawBike();
    drawParticles();

    if (impactTimer > 0) {
      const alpha = Math.min(.28, impactTimer / 1000);
      ctx.fillStyle = `rgba(240,75,35,${alpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (flashTimer > 0) {
      ctx.fillStyle = '#f4f1ea';
      ctx.font = 'bold 30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(flashText, W/2, 105);
    }
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(35, now - last);
    last = now;
    update(dt);
    render();
    if (running) requestAnimationFrame(loop);
  }

  function handleKey(e) {
    if (['ArrowLeft','ArrowRight','a','A','d','D',' '].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') steer(-1);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') steer(1);
    if (!running && (e.key === ' ' || e.key === 'Enter')) startGame();
  }

  document.addEventListener('keydown', handleKey);
  startBtn.addEventListener('click', startGame);
  leftBtn.addEventListener('pointerdown', () => steer(-1));
  rightBtn.addEventListener('pointerdown', () => steer(1));

  let pointerStartX = null;
  canvas.addEventListener('pointerdown', e => { pointerStartX = e.clientX; });
  canvas.addEventListener('pointerup', e => {
    if (pointerStartX == null) return;
    const dx = e.clientX - pointerStartX;
    if (Math.abs(dx) > 24) steer(dx > 0 ? 1 : -1);
    pointerStartX = null;
  });

  reset();
  render();
})();

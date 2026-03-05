const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const resourceEl = document.getElementById('resource');
const statusEl = document.getElementById('status');

const world = {
  width: canvas.width,
  height: canvas.height,
  playerCredits: 280,
  enemyCredits: 280,
  selectedUnit: null,
  lastTick: performance.now(),
  gameOver: false,
  winner: null,
};

const UNIT_STATS = {
  infantry: { hp: 40, speed: 60, damage: 8, range: 65, cooldown: 0.8, color: '#53a0ff', radius: 8, cost: 50 },
  tank: { hp: 100, speed: 40, damage: 20, range: 90, cooldown: 1.2, color: '#93b8ff', radius: 12, cost: 120 },
};

const BUILDING_STATS = {
  citadel: { hp: 520, radius: 32 },
  refinery: { hp: 180, radius: 20 },
};

function makeBuilding(faction, type, x, y) {
  const stats = BUILDING_STATS[type];
  return { faction, type, x, y, hp: stats.hp, maxHp: stats.hp, radius: stats.radius, brineTimer: 0 };
}

function makeUnit(faction, type, x, y) {
  const s = UNIT_STATS[type];
  return {
    faction,
    type,
    x,
    y,
    hp: s.hp,
    maxHp: s.hp,
    speed: s.speed,
    damage: s.damage,
    range: s.range,
    cooldown: s.cooldown,
    cdLeft: 0,
    radius: s.radius,
    color: s.color,
    tx: x,
    ty: y,
  };
}

const buildings = [
  makeBuilding('player', 'citadel', 130, 510),
  makeBuilding('enemy', 'citadel', 830, 130),
];

const units = [
  makeUnit('player', 'infantry', 190, 520),
  makeUnit('player', 'infantry', 155, 560),
  makeUnit('enemy', 'infantry', 770, 160),
  makeUnit('enemy', 'infantry', 810, 200),
];

function getFactionColor(faction) {
  return faction === 'player' ? '#53a0ff' : '#d65b5b';
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function findClosestEnemy(actor) {
  const foes = [...units, ...buildings].filter(o => o.faction !== actor.faction && o.hp > 0);
  let best = null;
  let bestD = Infinity;
  for (const f of foes) {
    const d = dist(actor, f);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return { target: best, distance: bestD };
}

function trainUnit(faction, type) {
  const cost = UNIT_STATS[type].cost;
  const creditKey = faction === 'player' ? 'playerCredits' : 'enemyCredits';
  const base = buildings.find(b => b.faction === faction && b.type === 'citadel' && b.hp > 0);
  if (!base || world[creditKey] < cost) return false;

  world[creditKey] -= cost;
  const jitter = () => (Math.random() - 0.5) * 35;
  units.push(makeUnit(faction, type, base.x + jitter(), base.y + jitter()));
  return true;
}

function buildRefinery(faction) {
  const creditKey = faction === 'player' ? 'playerCredits' : 'enemyCredits';
  const base = buildings.find(b => b.faction === faction && b.type === 'citadel' && b.hp > 0);
  if (!base || world[creditKey] < 150) return false;

  world[creditKey] -= 150;
  const offset = faction === 'player' ? 90 : -90;
  const x = clamp(base.x + offset + (Math.random() - 0.5) * 40, 50, world.width - 50);
  const y = clamp(base.y + (Math.random() - 0.5) * 80, 50, world.height - 50);
  buildings.push(makeBuilding(faction, 'refinery', x, y));
  return true;
}

function handleEconomy(dt) {
  for (const b of buildings) {
    if (b.hp <= 0 || b.type !== 'refinery') continue;
    b.brineTimer += dt;
    if (b.brineTimer >= 1.0) {
      b.brineTimer = 0;
      if (b.faction === 'player') world.playerCredits += 22;
      else world.enemyCredits += 22;
    }
  }
}

function updateUnits(dt) {
  for (const u of units) {
    if (u.hp <= 0) continue;
    u.cdLeft = Math.max(0, u.cdLeft - dt);

    const { target, distance } = findClosestEnemy(u);
    if (!target) continue;

    const desiredRange = u.range + target.radius;
    if (distance > desiredRange - 4) {
      const dx = target.x - u.x;
      const dy = target.y - u.y;
      const n = Math.hypot(dx, dy) || 1;
      u.x += (dx / n) * u.speed * dt;
      u.y += (dy / n) * u.speed * dt;
    }

    if (distance <= desiredRange && u.cdLeft <= 0) {
      target.hp -= u.damage;
      u.cdLeft = u.cooldown;
    }

    if (u.faction === 'player' && world.selectedUnit === u) {
      const dToCommand = Math.hypot(u.tx - u.x, u.ty - u.y);
      if (dToCommand > 6) {
        const dx = u.tx - u.x;
        const dy = u.ty - u.y;
        const n = Math.hypot(dx, dy) || 1;
        u.x += (dx / n) * u.speed * dt;
        u.y += (dy / n) * u.speed * dt;
      }
    }
  }
}

function cleanupAndVictory() {
  for (const u of units) {
    if (u.hp <= 0 && world.selectedUnit === u) world.selectedUnit = null;
  }

  const alivePlayerCitadel = buildings.some(b => b.faction === 'player' && b.type === 'citadel' && b.hp > 0);
  const aliveEnemyCitadel = buildings.some(b => b.faction === 'enemy' && b.type === 'citadel' && b.hp > 0);

  if (!aliveEnemyCitadel) {
    world.gameOver = true;
    world.winner = 'UAS Victory';
    statusEl.textContent = 'Status: The Crescent Steppe citadel has fallen.';
  }
  if (!alivePlayerCitadel) {
    world.gameOver = true;
    world.winner = 'Coalition Victory';
    statusEl.textContent = 'Status: Your citadel has been overrun.';
  }

  for (let i = units.length - 1; i >= 0; i--) if (units[i].hp <= 0) units.splice(i, 1);
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];
    if (b.hp <= 0 && b.type !== 'citadel') buildings.splice(i, 1);
  }
}

let aiTimer = 0;
function runEnemyAI(dt) {
  aiTimer += dt;
  if (aiTimer < 2.0 || world.gameOver) return;
  aiTimer = 0;

  const choice = Math.random();
  if (world.enemyCredits > 190 && choice > 0.6) {
    trainUnit('enemy', 'tank');
  } else if (world.enemyCredits > 140 && choice > 0.35) {
    buildRefinery('enemy');
  } else {
    trainUnit('enemy', 'infantry');
  }
}

function drawGrid() {
  ctx.fillStyle = '#b88f50';
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.strokeStyle = 'rgba(70, 55, 30, 0.3)';
  for (let x = 0; x < world.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 0; y < world.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
}

function drawBuildings() {
  for (const b of buildings) {
    if (b.hp <= 0) continue;
    ctx.beginPath();
    ctx.fillStyle = b.type === 'citadel' ? (b.faction === 'player' ? '#305f9a' : '#8a2f2f') : '#5f6540';
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();

    const hpW = b.radius * 2;
    ctx.fillStyle = '#111';
    ctx.fillRect(b.x - b.radius, b.y - b.radius - 12, hpW, 5);
    ctx.fillStyle = '#67e36f';
    ctx.fillRect(b.x - b.radius, b.y - b.radius - 12, hpW * (b.hp / b.maxHp), 5);
  }
}

function drawUnits() {
  for (const u of units) {
    ctx.beginPath();
    ctx.fillStyle = u.faction === 'player' ? u.color : '#d65b5b';
    ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
    ctx.fill();

    if (world.selectedUnit === u) {
      ctx.beginPath();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.arc(u.x, u.y, u.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
}

function drawGameOver() {
  if (!world.gameOver) return;
  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.fillStyle = '#fff2cf';
  ctx.font = '700 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(world.winner, world.width / 2, world.height / 2);
  ctx.font = '500 22px sans-serif';
  ctx.fillText('Refresh to play again', world.width / 2, world.height / 2 + 40);
}

function render() {
  drawGrid();
  drawBuildings();
  drawUnits();
  drawGameOver();

  resourceEl.textContent = `Credits: ${Math.floor(world.playerCredits)}`;
}

function loop(now) {
  const dt = Math.min(0.05, (now - world.lastTick) / 1000);
  world.lastTick = now;

  if (!world.gameOver) {
    handleEconomy(dt);
    updateUnits(dt);
    runEnemyAI(dt);
    cleanupAndVictory();
  }

  render();
  requestAnimationFrame(loop);
}

canvas.addEventListener('click', (e) => {
  if (world.gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  world.selectedUnit = null;
  for (const u of units) {
    if (u.faction !== 'player') continue;
    if (Math.hypot(u.x - x, u.y - y) <= u.radius + 4) {
      world.selectedUnit = u;
      statusEl.textContent = `Status: ${u.type.toUpperCase()} awaiting orders.`;
      break;
    }
  }
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!world.selectedUnit || world.gameOver) return;

  const rect = canvas.getBoundingClientRect();
  world.selectedUnit.tx = (e.clientX - rect.left) * (canvas.width / rect.width);
  world.selectedUnit.ty = (e.clientY - rect.top) * (canvas.height / rect.height);
  statusEl.textContent = 'Status: Unit redeploying across the dunes.';
});

document.addEventListener('keydown', (e) => {
  if (world.gameOver) return;
  if (e.key.toLowerCase() === 't') {
    if (trainUnit('player', 'infantry')) statusEl.textContent = 'Status: Infantry trained.';
    else statusEl.textContent = 'Status: Not enough credits for infantry.';
  }
  if (e.key.toLowerCase() === 'y') {
    if (trainUnit('player', 'tank')) statusEl.textContent = 'Status: Skimmer tank trained.';
    else statusEl.textContent = 'Status: Not enough credits for tank.';
  }
  if (e.key.toLowerCase() === 'r') {
    if (buildRefinery('player')) statusEl.textContent = 'Status: Refinery established.';
    else statusEl.textContent = 'Status: Not enough credits for refinery.';
  }
});

buildings.push(makeBuilding('player', 'refinery', 230, 540));
buildings.push(makeBuilding('enemy', 'refinery', 730, 100));

requestAnimationFrame((t) => {
  world.lastTick = t;
  loop(t);
});

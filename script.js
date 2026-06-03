const game = document.getElementById("game");
const cat = document.getElementById("cat");
const scoreValue = document.getElementById("score");
const finalScore = document.getElementById("finalScore");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const supporter = document.getElementById("supporter");
const startTip = document.getElementById("startTip");
const bonusBanner = document.getElementById("bonusBanner");
const bonusStatus = document.getElementById("bonusStatus");

const state = {
  running: false,
  gameOver: false,
  score: 0,
  y: 0,
  velocity: 0,
  lastTime: 0,
  spawnTimer: 0,
  supportTimer: 0,
  pizzaBoostTimer: 0,
  obstacles: [],
  obstacleId: 0,
};

const physics = {
  gravity: 2000,
  jumpPower: 920,
  groundY: 0,
  obstacleSpeed: 340,
  spawnEvery: 1700,
};

const itemTypes = [
  { name: "stone", className: "item-stone", kind: "hazard", points: 1 },
  { name: "apple", className: "item-apple", kind: "hazard", points: 1 },
  { name: "trash", className: "item-trash", kind: "hazard", points: 1 },
  { name: "pizza", className: "item-pizza", kind: "treat", points: 3 },
];

function resetGame() {
  state.running = true;
  state.gameOver = false;
  state.score = 0;
  state.y = 0;
  state.velocity = 0;
  state.lastTime = performance.now();
  state.spawnTimer = 3200;
  state.supportTimer = 18000;
  state.pizzaBoostTimer = 0;
  scoreValue.textContent = "0";
  cat.style.setProperty("--jump-y", "0px");
  supporter.classList.remove("show");
  bonusBanner.classList.remove("show");
  bonusStatus.classList.remove("show");
  showStartTip();

  state.obstacles.forEach((obstacle) => obstacle.element.remove());
  state.obstacles = [];

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  requestAnimationFrame(update);
}

function showStartTip() {
  startTip.classList.remove("show");
  void startTip.offsetWidth;
  startTip.classList.add("show");

  window.setTimeout(() => {
    startTip.classList.remove("show");
  }, 2350);
}

function jump() {
  if (!state.running) {
    return;
  }

  if (state.y === physics.groundY) {
    state.velocity = physics.jumpPower;
  }
}

function spawnObstacle() {
  const type = pickItemType();
  const element = document.createElement("div");
  element.className = `item ${type.className}`;
  element.setAttribute("aria-label", type.name);
  game.appendChild(element);

  const rect = game.getBoundingClientRect();
  const obstacle = {
    id: state.obstacleId++,
    element,
    type,
    x: rect.width + 32,
    passed: false,
    collected: false,
    removed: false,
  };

  state.obstacles.push(obstacle);
}

function pickItemType() {
  if (state.pizzaBoostTimer > 0 && Math.random() < 0.72) {
    return itemTypes[3];
  }

  const roll = Math.random();

  if (roll < 0.22) {
    return itemTypes[3];
  }

  if (roll < 0.48) {
    return itemTypes[1];
  }

  if (roll < 0.72) {
    return itemTypes[2];
  }

  return itemTypes[0];
}

function update(time) {
  if (!state.running) {
    return;
  }

  const delta = Math.min((time - state.lastTime) / 1000, 0.032);
  state.lastTime = time;

  updateCat(delta);
  updateSupporter(delta);
  updateObstacles(delta);
  checkCollisions();

  if (state.running) {
    requestAnimationFrame(update);
  }
}

function updateSupporter(delta) {
  state.supportTimer -= delta * 1000;
  state.pizzaBoostTimer = Math.max(0, state.pizzaBoostTimer - delta * 1000);
  bonusStatus.classList.toggle("show", state.pizzaBoostTimer > 0);

  if (state.supportTimer <= 0) {
    showSupporter();
    state.supportTimer = 26000 + Math.random() * 14000;
  }
}

function showSupporter() {
  supporter.classList.remove("show");
  bonusBanner.classList.remove("show");
  void supporter.offsetWidth;
  supporter.classList.add("show");

  window.setTimeout(() => {
    if (state.running && !state.gameOver) {
      startPizzaBonus();
    }
  }, 1400);

  window.setTimeout(() => {
    supporter.classList.remove("show");
  }, 3800);
}

function startPizzaBonus() {
  bonusBanner.classList.remove("show");
  void bonusBanner.offsetWidth;
  bonusBanner.classList.add("show");
  state.pizzaBoostTimer = 8200;
  bonusStatus.classList.add("show");

  window.setTimeout(() => {
    bonusBanner.classList.remove("show");
  }, 2000);
}

function updateCat(delta) {
  state.velocity -= physics.gravity * delta;
  state.y = Math.max(physics.groundY, state.y + state.velocity * delta);

  if (state.y === physics.groundY && state.velocity < 0) {
    state.velocity = 0;
  }

  cat.style.setProperty("--jump-y", `${-state.y}px`);
}

function updateObstacles(delta) {
  const gameWidth = game.clientWidth;
  const speed = scaledObstacleSpeed(gameWidth);

  state.spawnTimer -= delta * 1000;
  if (state.spawnTimer <= 0) {
    spawnObstacle();
    state.spawnTimer = physics.spawnEvery + Math.random() * 650;
  }

  state.obstacles.forEach((obstacle) => {
    if (obstacle.collected) {
      return;
    }

    obstacle.x -= speed * delta;
    obstacle.element.style.transform = `translateX(${obstacle.x}px)`;
    obstacle.element.style.setProperty("--item-x", `${obstacle.x}px`);

    if (obstacle.type.kind === "hazard" && !obstacle.passed && obstacle.x + obstacle.element.offsetWidth < cat.offsetLeft) {
      obstacle.passed = true;
      addScore(obstacle.type.points);
    }
  });

  state.obstacles = state.obstacles.filter((obstacle) => {
    const visible = obstacle.x > -80 && !obstacle.removed;
    if (!visible) {
      obstacle.element.remove();
    }
    return visible;
  });
}

function scaledObstacleSpeed(gameWidth) {
  return Math.max(285, Math.min(physics.obstacleSpeed, gameWidth * 0.62));
}

function checkCollisions() {
  const catBox = shrinkRect(cat.getBoundingClientRect(), 0.34, 0.34, 0.38, 0.14);

  for (const obstacle of state.obstacles) {
    if (obstacle.collected) {
      continue;
    }

    const obstacleBox = shrinkRect(obstacle.element.getBoundingClientRect(), 0.12, 0.1, 0.12, 0.08);
    if (rectsOverlap(catBox, obstacleBox)) {
      if (obstacle.type.kind === "treat") {
        collectTreat(obstacle);
      } else {
        endGame();
      }
      break;
    }
  }
}

function collectTreat(obstacle) {
  obstacle.collected = true;
  obstacle.element.classList.add("item-collected");
  addScore(obstacle.type.points);
  celebrateCat();

  window.setTimeout(() => {
    obstacle.removed = true;
    obstacle.element.remove();
  }, 280);
}

function celebrateCat() {
  cat.classList.remove("cat-happy");
  void cat.offsetWidth;
  cat.classList.add("cat-happy");
  burstFlowers();

  window.setTimeout(() => {
    cat.classList.remove("cat-happy");
  }, 680);
}

function burstFlowers() {
  const colors = ["#ff8faf", "#ffc46b", "#9ddf8a", "#8fc8ff", "#d7a2ff"];
  const flowers = [
    { x: "-54px", y: "-62px", left: "20%", top: "34%", size: "18px", rotate: "120deg" },
    { x: "-26px", y: "-88px", left: "42%", top: "22%", size: "14px", rotate: "-90deg" },
    { x: "24px", y: "-92px", left: "56%", top: "24%", size: "20px", rotate: "150deg" },
    { x: "58px", y: "-60px", left: "72%", top: "36%", size: "15px", rotate: "-140deg" },
    { x: "-66px", y: "-24px", left: "28%", top: "52%", size: "13px", rotate: "180deg" },
    { x: "70px", y: "-18px", left: "68%", top: "54%", size: "17px", rotate: "-180deg" },
  ];

  flowers.forEach((flower, index) => {
    const element = document.createElement("span");
    element.className = "flower";
    element.style.setProperty("--flower-color", colors[index % colors.length]);
    element.style.setProperty("--flower-x", flower.x);
    element.style.setProperty("--flower-y", flower.y);
    element.style.setProperty("--flower-left", flower.left);
    element.style.setProperty("--flower-top", flower.top);
    element.style.setProperty("--flower-size", flower.size);
    element.style.setProperty("--flower-rotate", flower.rotate);
    cat.appendChild(element);

    window.setTimeout(() => {
      element.remove();
    }, 900);
  });
}

function addScore(points) {
  state.score += points;
  scoreValue.textContent = state.score;
}

function shrinkRect(rect, left, top, right, bottom) {
  const width = rect.width;
  const height = rect.height;

  return {
    left: rect.left + width * left,
    top: rect.top + height * top,
    right: rect.right - width * right,
    bottom: rect.bottom - height * bottom,
  };
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  bonusStatus.classList.remove("show");
  bonusBanner.classList.remove("show");
  supporter.classList.remove("show");
  finalScore.textContent = state.score;
  gameOverScreen.classList.remove("hidden");
}

function handleAction(event) {
  const target = event.target;
  const isButton = target instanceof HTMLElement && target.closest("button");

  if (isButton) {
    return;
  }

  if (!state.running && !state.gameOver) {
    resetGame();
    return;
  }

  jump();
}

startButton.addEventListener("click", resetGame);
restartButton.addEventListener("click", resetGame);
game.addEventListener("pointerdown", handleAction);

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space") {
    return;
  }

  event.preventDefault();

  if (!state.running && !state.gameOver) {
    resetGame();
    return;
  }

  if (state.gameOver) {
    resetGame();
    return;
  }

  jump();
});

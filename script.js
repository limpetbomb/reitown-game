const game = document.getElementById("game");
const cat = document.getElementById("cat");
const scoreValue = document.getElementById("score");
const finalScore = document.getElementById("finalScore");
const stageLabel = document.getElementById("stageLabel");
const stageBanner = document.getElementById("stageBanner");
const stageBannerImage = document.getElementById("stageBannerImage");
const stageBannerText = document.getElementById("stageBannerText");
const finalTitleMain = document.getElementById("finalTitleMain");
const finalTitleSub = document.getElementById("finalTitleSub");
const finalTitleDefault = document.querySelector(".final-title-default");
const finalTitleClear = document.querySelector(".final-title-clear");
const clearParty = document.querySelector(".clear-party");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const storyModal = document.getElementById("storyModal");
const storyStageImage = document.getElementById("storyStageImage");
const storyText = document.getElementById("storyText");
const storyOkButton = document.getElementById("storyOkButton");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const supporter = document.getElementById("supporter");
const startTip = document.getElementById("startTip");
const bonusBanner = document.getElementById("bonusBanner");
const bonusStatus = document.getElementById("bonusStatus");
let audioContext = null;

const state = {
  running: false,
  gameOver: false,
  paused: false,
  score: 0,
  stageIndex: 0,
  stageEncouraged: false,
  y: 0,
  velocity: 0,
  lastTime: 0,
  spawnTimer: 0,
  supportTimer: 0,
  pizzaBoostTimer: 0,
  appleGuard: 0,
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

const goalScore = 200;
const stageStartGraceMs = 3200;
const stageOneStory = `れいちゃんはピザパーティーへおでかけ中
石とゴミをよけて、ピザとりんごを集めよう
だいすが応援してくれると、ピザがいっぱいになるよ！`;

const stages = [
  {
    label: "ステージ1 おでかけ道",
    shortLabel: "おでかけ道",
    from: 0,
    target: 50,
    speed: 315,
    spawnEvery: 1750,
    image: "assets/stage_goal_1.png",
    story: stageOneStory,
  },
  {
    label: "ステージ2 にぎやか通り",
    shortLabel: "にぎやか通り",
    from: 50,
    target: 100,
    speed: 360,
    spawnEvery: 1500,
    image: "assets/stage_goal_2.png",
    story: `にぎやかな通りに入ったよ
人も車も増えてきたから、石とゴミに気をつけて！
だいすの声が聞こえたら、ピザチャンスかも！`,
  },
  {
    label: "ステージ3 パーティー前",
    shortLabel: "パーティー前",
    from: 100,
    target: 200,
    speed: 560,
    spawnEvery: 860,
    image: "assets/stage_goal_3.png",
    story: `パーティー会場が見えてきたよ
さいごの道は流れが早いから、ジャンプのタイミングがだいじ！
スコア200で、ピザパーティーにとうちゃく！`,
  },
];

const itemTypes = [
  { name: "stone", className: "item-stone", kind: "hazard", points: 1 },
  { name: "apple", className: "item-apple", kind: "guard", points: 0 },
  { name: "trash", className: "item-trash", kind: "hazard", points: 1 },
  { name: "pizza", className: "item-pizza", kind: "treat", points: 3 },
];

function resetGame() {
  state.running = true;
  state.gameOver = false;
  state.paused = false;
  state.score = 0;
  state.stageIndex = 0;
  state.stageEncouraged = false;
  state.y = 0;
  state.velocity = 0;
  state.lastTime = performance.now();
  state.spawnTimer = 5600;
  state.supportTimer = 18000;
  state.pizzaBoostTimer = 0;
  state.appleGuard = 0;
  scoreValue.textContent = "0";
  setStage(0, false);
  cat.style.setProperty("--jump-y", "0px");
  supporter.classList.remove("show");
  bonusBanner.classList.remove("show");
  bonusStatus.classList.remove("show");
  storyModal.classList.add("hidden");
  showStartTip();
  window.setTimeout(() => {
    if (state.running && !state.gameOver && state.stageIndex === 0) {
      showStageIntro(0);
    }
  }, 2500);

  state.obstacles.forEach((obstacle) => obstacle.element.remove());
  state.obstacles = [];

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  gameOverScreen.classList.remove("clear-screen");
  setClearResult(false);
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
  if (!state.running || state.paused) {
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
  const motion = pickItemMotion(type);

  if (motion.className) {
    element.classList.add(motion.className);
  }

  element.setAttribute("aria-label", type.name);
  game.appendChild(element);

  const rect = game.getBoundingClientRect();
  const obstacle = {
    id: state.obstacleId++,
    element,
    type,
    x: rect.width + 32,
    motion,
    motionTime: Math.random() * Math.PI * 2,
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

  if (roll < 0.24) {
    return itemTypes[3];
  }

  if (roll < 0.3) {
    return itemTypes[1];
  }

  if (roll < 0.66) {
    return itemTypes[2];
  }

  return itemTypes[0];
}

function pickItemMotion(type) {
  if (type.name !== "trash") {
    return { className: "", bob: 0, spin: 0, frequency: 0 };
  }

  const motions = [
    { className: "item-trash-hop", bob: 13, spin: 4, frequency: 7.2 },
    { className: "item-trash-roll", bob: 3, spin: 18, frequency: 5.4 },
    { className: "item-trash-wobble", bob: 8, spin: 10, frequency: 8.8 },
  ];

  return motions[Math.floor(Math.random() * motions.length)];
}

function currentStage() {
  return stages[state.stageIndex];
}

function clearObstacles() {
  state.obstacles.forEach((obstacle) => obstacle.element.remove());
  state.obstacles = [];
}

function update(time) {
  if (!state.running) {
    return;
  }

  if (state.paused) {
    state.lastTime = time;
    requestAnimationFrame(update);
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
    if (state.running && !state.gameOver && !state.paused) {
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
    state.spawnTimer = currentStage().spawnEvery + Math.random() * 620;
  }

  state.obstacles.forEach((obstacle) => {
    if (obstacle.collected) {
      return;
    }

    obstacle.x -= speed * delta;
    obstacle.motionTime += delta * obstacle.motion.frequency;
    const y = obstacle.motion.bob ? Math.abs(Math.sin(obstacle.motionTime)) * -obstacle.motion.bob : 0;
    const rotate = obstacle.motion.spin ? Math.sin(obstacle.motionTime) * obstacle.motion.spin : 0;
    obstacle.element.style.transform = `translateX(${obstacle.x}px) translateY(${y}px) rotate(${rotate}deg)`;
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
  const stage = currentStage();
  const widthLimit = gameWidth * (state.stageIndex === 2 ? 1.05 : 0.68);

  return Math.max(285, Math.min(stage.speed, widthLimit));
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
      } else if (obstacle.type.kind === "guard") {
        collectGuard(obstacle);
      } else if (state.appleGuard > 0) {
        useAppleGuard(obstacle);
      } else {
        endGame();
      }
      break;
    }
  }
}

function collectGuard(obstacle) {
  obstacle.collected = true;
  obstacle.element.classList.add("item-collected");
  state.appleGuard = Math.min(state.appleGuard + 1, 1);
  playHealSound();
  celebrateCat();

  window.setTimeout(() => {
    obstacle.removed = true;
    obstacle.element.remove();
  }, 280);
}

function useAppleGuard(obstacle) {
  state.appleGuard = Math.max(0, state.appleGuard - 1);
  obstacle.collected = true;
  obstacle.element.classList.add("item-collected");
  showStageNotice("りんごのおまもりでセーフ！");
  burstFlowers();

  window.setTimeout(() => {
    obstacle.removed = true;
    obstacle.element.remove();
  }, 280);
}

function collectTreat(obstacle) {
  obstacle.collected = true;
  obstacle.element.classList.add("item-collected");
  playCollectSound();
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
  if (!state.running) {
    return;
  }

  state.score += points;
  scoreValue.textContent = state.score;
  updateStageProgress();
  updateGoalEncouragement();

  if (state.score >= goalScore) {
    completeGame();
  }
}

function updateGoalEncouragement() {
  const stage = currentStage();
  const remaining = stage.target - state.score;

  if (!state.stageEncouraged && remaining > 0 && remaining <= 10) {
    state.stageEncouraged = true;
    showStageNotice("もうちょっと！頑張れ！");
  }
}

function updateStageProgress() {
  const nextIndex = stages.reduce((activeIndex, stage, index) => (
    state.score >= stage.from ? index : activeIndex
  ), 0);

  if (nextIndex !== state.stageIndex) {
    setStage(nextIndex, true);
  }
}

function setStage(index, announce) {
  state.stageIndex = index;
  state.stageEncouraged = false;
  const stage = stages[index];
  game.dataset.stage = String(index + 1);
  stageLabel.textContent = stage.shortLabel;

  if (announce) {
    showStageIntro(index);
  } else {
    stageBanner.classList.remove("show");
  }
}

function showStageIntro(index) {
  const stage = stages[index];
  showStageBanner(`${stage.label} 目標スコア${stage.target}`, stage.image);

  window.setTimeout(() => {
    if (state.running && !state.gameOver && state.stageIndex === index) {
      showStoryPopup(index);
    }
  }, 1550);
}

function showStageBanner(message, imageSrc = "") {
  stageBannerText.textContent = message;
  stageBanner.classList.toggle("has-image", Boolean(imageSrc));
  stageBanner.classList.toggle("compact", !imageSrc);
  stageBannerImage.hidden = !imageSrc;

  if (imageSrc) {
    stageBannerImage.src = imageSrc;
    stageBannerImage.alt = message;
  } else {
    stageBannerImage.removeAttribute("src");
    stageBannerImage.alt = "";
  }

  stageBanner.classList.remove("show");
  void stageBanner.offsetWidth;
  stageBanner.classList.add("show");

  window.setTimeout(() => {
    stageBanner.classList.remove("show");
  }, 1800);
}

function showStageNotice(message) {
  showStageBanner(message);
}

function showStoryPopup(index) {
  const stage = stages[index];
  state.paused = true;
  clearObstacles();
  state.spawnTimer = stageStartGraceMs;
  storyStageImage.src = stage.image;
  storyStageImage.alt = `${stage.label} 目標スコア${stage.target}`;
  storyText.textContent = stage.story;
  storyModal.classList.remove("hidden");
}

function closeStoryPopup() {
  storyModal.classList.add("hidden");
  state.paused = false;
  state.spawnTimer = stageStartGraceMs;
  state.lastTime = performance.now();
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
  state.paused = false;
  bonusStatus.classList.remove("show");
  bonusBanner.classList.remove("show");
  supporter.classList.remove("show");
  storyModal.classList.add("hidden");
  finalTitleMain.textContent = "すごい！";
  finalTitleSub.textContent = "よくよけたね！";
  finalScore.textContent = state.score;
  setClearResult(false);
  gameOverScreen.classList.remove("clear-screen");
  gameOverScreen.classList.remove("hidden");
}

function completeGame() {
  state.running = false;
  state.gameOver = true;
  state.paused = false;
  bonusStatus.classList.remove("show");
  bonusBanner.classList.remove("show");
  supporter.classList.remove("show");
  storyModal.classList.add("hidden");
  state.obstacles.forEach((obstacle) => obstacle.element.remove());
  state.obstacles = [];
  finalTitleMain.textContent = "とうちゃく！";
  finalTitleSub.textContent = "ピザパーティーだよ！";
  finalScore.textContent = state.score;
  setClearResult(true);
  gameOverScreen.classList.add("clear-screen");
  gameOverScreen.classList.remove("hidden");
}

function setClearResult(isClear) {
  finalTitleDefault.hidden = isClear;
  finalTitleClear.hidden = !isClear;
  clearParty.hidden = !isClear;
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone(frequency, start, duration, volume = 0.05, type = "sine") {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startTime = context.currentTime + start;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playCollectSound() {
  playTone(660, 0, 0.1, 0.045, "triangle");
  playTone(990, 0.07, 0.12, 0.04, "triangle");
}

function playHealSound() {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  [523, 659, 784, 1046].forEach((frequency, index) => {
    playTone(frequency, index * 0.055, 0.14, 0.04, "sine");
  });
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
storyOkButton.addEventListener("click", closeStoryPopup);
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

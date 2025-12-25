<template>
  <div class="dice-container">
    <div class="dice-wrapper">
      <div class="dice-canvas-container">
        <canvas ref="canvasRef" class="dice-canvas"></canvas>
      </div>
    </div>
    <div class="controls">
      <el-button type="primary" @click="rollAllDice" :disabled="isRolling"
        >摇骰子</el-button
      >
      <el-button @click="addDie">添加骰子</el-button>
      <el-button @click="removeDie" :disabled="dice.length <= 1"
        >移除骰子</el-button
      >
      <el-button @click="resetDice">重置</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// 骰子数据
const dice = ref([createDie()]);
const canvasRef = ref(null);

// Three.js 相关
let scene,
  camera,
  renderer,
  diceMeshes = [],
  diceBodies = [];
let particles, particleSystem;
let celebrationTimeout;

// Cannon.js 相关
let world, groundBody;

// 是否正在滚动
const isRolling = ref(false);

// 旋转开始时间
let rollStartTime = 0;

// 移动端摇动检测相关
let lastX = 0,
  lastY = 0,
  lastZ = 0;
let shakeThreshold = 15; // 摇动阈值
let lastShakeTime = 0;
let shakeDelay = 1000; // 摇动间隔（毫秒）

// 总点数
const total = computed(() =>
  dice.value.reduce((sum, die) => sum + die.value, 0)
);

// 创建一个骰子对象
function createDie() {
  const value = Math.floor(Math.random() * 6) + 1;
  return {
    value,
    id: Date.now() + Math.random(),
    mesh: null,
    body: null,
  };
}

// 检测是否为iOS设备
function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

// 检测是否为移动设备
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// 触发震动
function triggerVibration() {
  if (!isMobileDevice()) return;

  try {
    if ("vibrate" in navigator) {
      // 大部分Android设备
      navigator.vibrate([200, 100, 200]);
    } else if ("webkitVibrate" in navigator) {
      // 旧的iOS设备（一般不支持）
      navigator.webkitVibrate([200, 100, 200]);
    }
  } catch (e) {
    console.warn("震动功能不可用:", e);
  }
}

// 处理设备运动事件（陀螺仪）
function handleDeviceMotion(event) {
  // 优先使用执敲接变量（起騫动）
  let acc = event.acceleration || event.accelerationIncludingGravity;
  if (!acc) return;

  const currentTime = Date.now();

  // 防止频繁触发
  if (currentTime - lastShakeTime < shakeDelay) return;
  if (isRolling.value) return;

  const deltaX = Math.abs(acc.x - lastX);
  const deltaY = Math.abs(acc.y - lastY);
  const deltaZ = Math.abs(acc.z - lastZ);

  // 检测是否达到摇动阈值
  if (
    deltaX > shakeThreshold ||
    deltaY > shakeThreshold ||
    deltaZ > shakeThreshold
  ) {
    lastShakeTime = currentTime;
    rollAllDice();
  }

  lastX = acc.x || 0;
  lastY = acc.y || 0;
  lastZ = acc.z || 0;
}

// 请求设备运动权限（iOS 13+需要）
function requestMotionPermission() {
  if (!isMobileDevice()) return;

  try {
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      // iOS 13+ 需要权限
      console.log("想申请iOS设备运动权限...");
      DeviceMotionEvent.requestPermission()
        .then((permissionState) => {
          console.log("iOS权限申请结果:", permissionState);
          if (permissionState === "granted") {
            window.addEventListener("devicemotion", handleDeviceMotion);
            console.log("iOS设备运动权限已起动");
          }
        })
        .catch((err) => {
          console.error("iOS权限申请失败:", err);
        });
    } else if (isIOS()) {
      // iOS < 13 不支持requestPermission，直接添加监听
      console.log("iOS旧版本，直接启用设备运动");
      window.addEventListener("devicemotion", handleDeviceMotion);
    } else {
      // Android等不需要权限的设备
      console.log("Android等设备，直接启用设备运动");
      window.addEventListener("devicemotion", handleDeviceMotion);
    }
  } catch (e) {
    console.error("权限申请错误:", e);
    // 错误时直接尝试添加监听
    window.addEventListener("devicemotion", handleDeviceMotion);
  }
}

// 初始化Three.js场景
function initThreeJS() {
  // 创建场景
  scene = new THREE.Scene();

  // 创建渐变背景
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  // 创建径向渐变背景
  const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 400);
  gradient.addColorStop(0, "#1e3c72");
  gradient.addColorStop(0.5, "#2a5298");
  gradient.addColorStop(1, "#3a7bd5");

  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);

  // 添加一些星星效果
  context.fillStyle = "rgba(255, 255, 255, 0.8)";
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 2 + 1;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }

  const backgroundTexture = new THREE.CanvasTexture(canvas);
  scene.background = backgroundTexture;

  // 获取容器尺寸
  const container = canvasRef.value.parentElement;
  const width = container.clientWidth;
  const height = container.clientHeight;

  // 创建相机 - 从上方垂直俯视
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(0, 12, 0);
  camera.lookAt(0, 0, 0);

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: false,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // 添加多重光照系统
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);

  // 主方向光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(10, 15, 8);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -15;
  directionalLight.shadow.camera.right = 15;
  directionalLight.shadow.camera.top = 15;
  directionalLight.shadow.camera.bottom = -15;
  directionalLight.shadow.bias = -0.0001;
  scene.add(directionalLight);

  // 辅助光源
  const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
  fillLight.position.set(-5, 8, -5);
  scene.add(fillLight);

  // 点光源用于高光
  const pointLight = new THREE.PointLight(0xffffff, 0.5, 30);
  pointLight.position.set(0, 10, 0);
  scene.add(pointLight);

  // 创建粒子系统用于庆祝效果
  createParticleSystem();

  // 创建地面 - 带纹理的真实地面
  const groundGeometry = new THREE.PlaneGeometry(20, 20);

  // 创建地面纹理
  const groundCanvas = document.createElement("canvas");
  groundCanvas.width = 512;
  groundCanvas.height = 512;
  const groundCtx = groundCanvas.getContext("2d");

  // 绘制棋盘格纹理
  const gridSize = 64;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      groundCtx.fillStyle = (i + j) % 2 === 0 ? "#2a3f5f" : "#1e2d45";
      groundCtx.fillRect(i * gridSize, j * gridSize, gridSize, gridSize);
    }
  }

  const groundTexture = new THREE.CanvasTexture(groundCanvas);
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(2, 2);

  const groundMaterial = new THREE.MeshPhongMaterial({
    map: groundTexture,
    color: 0xffffff,
    shininess: 20,
  });

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);
}

// 初始化Cannon.js物理世界
function initCannonJS() {
  world = new CANNON.World();
  world.gravity.set(0, -25, 0); // 设置重力
  world.broadphase = new CANNON.SAPBroadphase(world);

  // 骰子材质
  const diceMaterial = new CANNON.Material("dice");
  // 地面材质
  const groundMaterial = new CANNON.Material("ground");

  // 设置材质接触参数
  const diceGroundContact = new CANNON.ContactMaterial(
    diceMaterial,
    groundMaterial,
    {
      friction: 0.4,
      restitution: 0.3, // 弹性系数
    }
  );
  world.addContactMaterial(diceGroundContact);

  // 骰子之间的接触
  const diceDiceContact = new CANNON.ContactMaterial(
    diceMaterial,
    diceMaterial,
    {
      friction: 0.3,
      restitution: 0.2,
    }
  );
  world.addContactMaterial(diceDiceContact);

  // 创建地面物理体
  const groundShape = new CANNON.Plane();
  groundBody = new CANNON.Body({
    mass: 0,
    material: groundMaterial,
  });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  groundBody.position.set(0, 0, 0);
  world.addBody(groundBody);

  // 保存材质以便后续使用
  world.diceMaterial = diceMaterial;
  world.groundMaterial = groundMaterial;

  // 创建四周边界墙
  const wallHeight = 5;
  const wallThickness = 0.5;
  const arenaSize = 10;

  // 前墙 (+Z)
  const wallFront = new CANNON.Body({
    mass: 0,
    material: groundMaterial,
    shape: new CANNON.Box(
      new CANNON.Vec3(arenaSize / 2, wallHeight / 2, wallThickness / 2)
    ),
  });
  wallFront.position.set(0, wallHeight / 2, arenaSize / 2);
  world.addBody(wallFront);

  // 后墙 (-Z)
  const wallBack = new CANNON.Body({
    mass: 0,
    material: groundMaterial,
    shape: new CANNON.Box(
      new CANNON.Vec3(arenaSize / 2, wallHeight / 2, wallThickness / 2)
    ),
  });
  wallBack.position.set(0, wallHeight / 2, -arenaSize / 2);
  world.addBody(wallBack);

  // 左墙 (-X)
  const wallLeft = new CANNON.Body({
    mass: 0,
    material: groundMaterial,
    shape: new CANNON.Box(
      new CANNON.Vec3(wallThickness / 2, wallHeight / 2, arenaSize / 2)
    ),
  });
  wallLeft.position.set(-arenaSize / 2, wallHeight / 2, 0);
  world.addBody(wallLeft);

  // 右墙 (+X)
  const wallRight = new CANNON.Body({
    mass: 0,
    material: groundMaterial,
    shape: new CANNON.Box(
      new CANNON.Vec3(wallThickness / 2, wallHeight / 2, arenaSize / 2)
    ),
  });
  wallRight.position.set(arenaSize / 2, wallHeight / 2, 0);
  world.addBody(wallRight);

  // 设置时间步长
  world.fixedTimeStep = 1 / 60;
}

// 创建粒子系统
function createParticleSystem() {
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  // 初始化粒子位置（完全隐藏在远处）
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = -100; // 隐藏在地下很远的地方
    positions[i * 3 + 2] = 0;

    colors[i * 3] = 0; // R - 完全黑色
    colors[i * 3 + 1] = 0; // G
    colors[i * 3 + 2] = 0; // B

    sizes[i] = 0.01; // 极小尺寸
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;

      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;

      void main() {
        float r = distance(gl_PointCoord, vec2(0.5, 0.5));
        if (r > 0.5) discard;

        gl_FragColor = vec4(vColor, 1.0 - r * 2.0);
      }
    `,
    transparent: true,
    vertexColors: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });

  particles = geometry;
  particleSystem = new THREE.Points(geometry, material);
  particleSystem.visible = false; // 完全隐藏粒子系统
  scene.add(particleSystem);
}

// 触发庆祝效果
function triggerCelebration() {
  // 暂时禁用庆祝粒子效果以避免光源混乱
  // 确保所有粒子都隐藏
  if (particles && particles.attributes && particles.attributes.position) {
    const positions = particles.attributes.position.array;
    for (let i = 0; i < 200; i++) {
      positions[i * 3 + 1] = -100; // 隐藏在地下
    }
    particles.attributes.position.needsUpdate = true;
  }
}

// 创建骰子
function createDiceMesh() {
  // 骰子几何体 - 使用圆角盒子几何体
  // 参数: 宽度, 高度, 深度, 分段数, 圆角半径
  const geometry = new RoundedBoxGeometry(1.5, 1.5, 1.5, 4, 0.15);

  // 创建骰子材质 - 每个面显示点数
  const materials = [];

  // 骰子面的点数配置 (按照Three.js的BoxGeometry面的顺序)
  // BoxGeometry材质顺序: +X, -X, +Y, -Y, +Z, -Z
  // 标准骰子规则：对面之和为7 (1对6, 2对5, 3对4)
  const faceNumbers = [3, 4, 6, 1, 2, 5];

  // 骰子点的位置配置
  const dotPatterns = {
    1: [[0.5, 0.5]],
    2: [
      [0.3, 0.3],
      [0.7, 0.7],
    ],
    3: [
      [0.3, 0.3],
      [0.5, 0.5],
      [0.7, 0.7],
    ],
    4: [
      [0.3, 0.3],
      [0.7, 0.3],
      [0.3, 0.7],
      [0.7, 0.7],
    ],
    5: [
      [0.3, 0.3],
      [0.7, 0.3],
      [0.5, 0.5],
      [0.3, 0.7],
      [0.7, 0.7],
    ],
    6: [
      [0.3, 0.3],
      [0.7, 0.3],
      [0.3, 0.5],
      [0.7, 0.5],
      [0.3, 0.7],
      [0.7, 0.7],
    ],
  };

  for (let i = 0; i < 6; i++) {
    // 创建高分辨率画布
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");

    // 创建径向渐变背景 - 白色到浅灰
    const gradient = context.createRadialGradient(256, 256, 50, 256, 256, 350);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.5, "#f5f5f5");
    gradient.addColorStop(1, "#e8e8e8");

    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);

    // 添加细微的纹理
    for (let j = 0; j < 100; j++) {
      context.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.02})`;
      context.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // 绘制圆角矩形边框
    const borderRadius = 40;
    context.strokeStyle = "rgba(0, 0, 0, 0.15)";
    context.lineWidth = 4;
    context.lineJoin = "round";
    context.beginPath();
    context.roundRect(15, 15, 482, 482, borderRadius);
    context.stroke();

    // 绘制骰子点
    const currentFace = faceNumbers[i];
    const dots = dotPatterns[currentFace];

    dots.forEach(([x, y]) => {
      const dotX = x * 512;
      const dotY = y * 512;

      // 根据点数设置颜色和大小
      const isRed = currentFace === 1 || currentFace === 4;
      const dotRadius = currentFace === 1 ? 65 : 48; // 1点更大，所有点都放大

      // 点的颜色
      const dotColor = isRed
        ? ["#c0392b", "#921e1e", "#5a0f0f"]
        : ["#2c3e50", "#1a252f", "#0d1419"];
      const glowColor = isRed ? "rgba(192, 57, 43, 0.2)" : "rgba(0, 0, 0, 0.1)";

      // 点的外发光效果
      const dotGradient = context.createRadialGradient(
        dotX,
        dotY,
        0,
        dotX,
        dotY,
        dotRadius * 1.5
      );
      dotGradient.addColorStop(0, glowColor);
      dotGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      context.fillStyle = dotGradient;
      context.beginPath();
      context.arc(dotX, dotY, dotRadius * 1.5, 0, Math.PI * 2);
      context.fill();

      // 绘制主点 - 带有立体感
      const mainGradient = context.createRadialGradient(
        dotX - 8,
        dotY - 8,
        0,
        dotX,
        dotY,
        dotRadius
      );
      mainGradient.addColorStop(0, dotColor[0]);
      mainGradient.addColorStop(0.6, dotColor[1]);
      mainGradient.addColorStop(1, dotColor[2]);

      context.fillStyle = mainGradient;
      context.beginPath();
      context.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      context.fill();

      // 添加高光
      context.fillStyle = "rgba(255, 255, 255, 0.3)";
      context.beginPath();
      context.arc(dotX - 10, dotY - 10, dotRadius * 0.4, 0, Math.PI * 2);
      context.fill();
    });

    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // 创建Phong材质以获得更好的光照效果
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      transparent: false,
      shininess: 100,
      specular: 0x222222,
      emissive: 0x000000,
      reflectivity: 0.1,
    });

    materials.push(material);
  }

  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

// 创建骰子物理体
function createDiceBody(position) {
  const shape = new CANNON.Box(new CANNON.Vec3(0.75, 0.75, 0.75));
  const body = new CANNON.Body({
    mass: 1,
    material: world.diceMaterial,
  });
  body.addShape(shape);
  body.position.copy(position);
  body.linearDamping = 0.3; // 线性阻尼
  body.angularDamping = 0.3; // 角阻尼
  world.addBody(body);

  return body;
}

// 添加骰子
function addDieToScene() {
  // 计算骰子在屏幕内的位置
  const diceCount = diceMeshes.length + 1;
  const positions = calculateScreenPositions(diceCount);

  const position = positions[diceMeshes.length] || new CANNON.Vec3(0, 0, 0);

  const mesh = createDiceMesh();
  const body = createDiceBody(position);

  // 添加发光效果
  addGlowEffect(mesh);

  diceMeshes.push(mesh);
  diceBodies.push(body);

  scene.add(mesh);
}

// 计算骰子在屏幕内的位置（初始抛掷位置）
function calculateScreenPositions(count) {
  const positions = [];
  const radius = 2; // 骰子分布半径
  const height = 6; // 抛掷起始高度

  for (let i = 0; i < count; i++) {
    if (count === 1) {
      // 单个骰子放在中心上方
      positions.push(new CANNON.Vec3(0, height, 0));
    } else if (count === 2) {
      // 两个骰子左右分布
      positions.push(new CANNON.Vec3((i === 0 ? -1 : 1) * 1.5, height, 0));
    } else {
      // 多个骰子圆形分布
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.push(new CANNON.Vec3(x, height, z));
    }
  }

  return positions;
}

// 添加骰子发光效果
function addGlowEffect(mesh) {
  // 创建发光材质 - 适配新尺寸
  const glowGeometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x4a90e2,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
  });

  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  mesh.add(glowMesh);

  // 存储发光网格引用
  mesh.glowMesh = glowMesh;
}

// 更新骰子位置和旋转
function updateDice() {
  for (let i = 0; i < diceMeshes.length; i++) {
    diceMeshes[i].position.copy(diceBodies[i].position);
    diceMeshes[i].quaternion.copy(diceBodies[i].quaternion);
  }
}

// 计算骰子点数
function calculateDiceValue(body) {
  // 骰子的6个面在局部坐标系中的法向量（法向量指向面外）
  // 顺序必须与材质数组中的faceNumbers对应
  const localNormals = [
    new THREE.Vector3(1, 0, 0), // +X (右面) - 3
    new THREE.Vector3(-1, 0, 0), // -X (左面) - 4
    new THREE.Vector3(0, 1, 0), // +Y (上面) - 6
    new THREE.Vector3(0, -1, 0), // -Y (下面) - 1
    new THREE.Vector3(0, 0, 1), // +Z (前面) - 2
    new THREE.Vector3(0, 0, -1), // -Z (后面) - 5
  ];

  // 对应的点数值（与faceNumbers一致）
  const faceValues = [3, 4, 6, 1, 2, 5];

  // 找到Y轴(上方向)最接近的面
  let maxDot = -1;
  let bestValue = 1;

  const worldUp = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < localNormals.length; i++) {
    // 将局部法向量旋转到世界坐标系
    const worldNormal = localNormals[i]
      .clone()
      .applyQuaternion(body.quaternion);

    // 计算与世界Y轴的点积（点积越大，法向量与向上方向越接近）
    const dot = worldNormal.dot(worldUp);

    if (dot > maxDot) {
      maxDot = dot;
      bestValue = faceValues[i];
    }
  }

  return bestValue;
}

// 检查骰子是否停止
function checkDiceStopped() {
  if (!isRolling.value) return;

  // 检测所有骰子是否基本静止
  let allStopped = true;
  const threshold = 0.1; // 速度阈值

  for (let i = 0; i < diceBodies.length; i++) {
    const body = diceBodies[i];
    const linearSpeed = body.velocity.length();
    const angularSpeed = body.angularVelocity.length();

    if (linearSpeed > threshold || angularSpeed > threshold) {
      allStopped = false;
      break;
    }
  }

  // 如果所有骰子都停止了，计算结果
  if (allStopped) {
    isRolling.value = false;

    // 计算所有骰子的点数
    dice.value.forEach((die, index) => {
      if (diceBodies[index]) {
        die.value = calculateDiceValue(diceBodies[index]);
      }
    });

    // 触发庆祝效果
    triggerCelebration();
  }
}

// 渲染循环
let animationId;
let isVisible = true;

function animate() {
  if (!isVisible) return;

  animationId = requestAnimationFrame(animate);

  if (world) {
    world.fixedStep();
  }

  updateDice();

  // 控制旋转减速
  if (isRolling.value && rollStartTime > 0) {
    const elapsed = Date.now() - rollStartTime;

    if (elapsed > 2000) {
      // 2秒后开始减速
      const slowdownTime = elapsed - 2000;
      const slowdownDuration = 1500; // 1.5秒减速到停止

      if (slowdownTime < slowdownDuration) {
        // 逐渐减速 - 使用缓动函数
        const progress = slowdownTime / slowdownDuration;
        const damping = 1 - progress; // 从1减到0

        diceBodies.forEach((body) => {
          // 平滑减速
          body.angularVelocity.x *= 0.95 * damping + 0.05;
          body.angularVelocity.y *= 0.95 * damping + 0.05;
          body.angularVelocity.z *= 0.95 * damping + 0.05;
        });
      } else {
        // 完全停止
        diceBodies.forEach((body) => {
          body.angularVelocity.set(0, 0, 0);
        });

        if (isRolling.value) {
          isRolling.value = false;

          // 计算所有骰子的点数
          dice.value.forEach((die, index) => {
            if (diceBodies[index]) {
              die.value = calculateDiceValue(diceBodies[index]);
            }
          });

          // 触发庆祝效果
          triggerCelebration();
        }
      }
    }
  }

  // 相机保持固定俯视角度
  camera.lookAt(0, 0, 0);

  // 发光效果动画
  const time = Date.now() * 0.005;
  diceMeshes.forEach((mesh) => {
    if (mesh.glowMesh) {
      const intensity = 0.05 + Math.sin(time + mesh.position.x) * 0.05;
      mesh.glowMesh.material.opacity = Math.max(0, intensity);
    }
  });

  checkDiceStopped();

  if (renderer) {
    renderer.render(scene, camera);
  }
}

// 页面可见性处理
function handleVisibilityChange() {
  isVisible = !document.hidden;
  if (isVisible) {
    animate(); // 重新开始动画
  }
}

// 摇骰子
const rollAllDice = () => {
  if (isRolling.value) return;

  isRolling.value = true;
  rollStartTime = Date.now();

  // 移动端震动反馈
  triggerVibration();

  // 重新排列骰子位置到高处
  const positions = calculateScreenPositions(diceBodies.length);

  diceBodies.forEach((body, index) => {
    // 设置到计算好的高处位置
    const targetPos = positions[index] || new CANNON.Vec3(0, 6, 0);
    body.position.copy(targetPos);

    // 随机初始旋转
    body.quaternion.set(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    );
    body.quaternion.normalize();

    // 给予随机初始速度
    body.velocity.set(
      (Math.random() - 0.5) * 4, // X方向随机速度
      -1, // Y方向轻微向下
      (Math.random() - 0.5) * 4 // Z方向随机速度
    );

    // 施加随机旋转速度
    body.angularVelocity.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20
    );
  });
};

// 添加骰子
const addDie = () => {
  if (dice.value.length < 6) {
    dice.value.push(createDie());
    addDieToScene();
  }
};

// 移除骰子
const removeDie = () => {
  if (dice.value.length > 1) {
    dice.value.pop();
    const mesh = diceMeshes.pop();
    const body = diceBodies.pop();

    if (mesh) scene.remove(mesh);
    if (body) world.removeBody(body);
  }
};

// 重置骰子
const resetDice = () => {
  if (isRolling.value) return;

  // 重新计算位置 - 放在地面上
  const positions = calculateScreenPositions(diceBodies.length);

  // 重置所有骰子的位置和旋转
  diceBodies.forEach((body, index) => {
    // 设置到计算好的位置，在地面上方
    const targetPos = positions[index] || new CANNON.Vec3(0, 2, 0);
    targetPos.y = 2; // 放在地面上方
    body.position.copy(targetPos);

    // 随机初始旋转
    body.quaternion.setFromEuler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    // 停止运动
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
  });

  // 重置骰子数值显示
  dice.value.forEach((die) => {
    die.value = Math.floor(Math.random() * 6) + 1;
  });
};

// 初始化
function init() {
  initThreeJS();
  initCannonJS();

  // 添加初始骰子
  addDieToScene();

  // 开始渲染循环
  animate();
}

// 窗口大小调整处理
function onWindowResize() {
  if (camera && renderer && canvasRef.value) {
    const container = canvasRef.value.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
}

// 组件挂载时初始化
onMounted(() => {
  setTimeout(() => {
    init();
  }, 100);

  // 添加窗口大小监听
  window.addEventListener("resize", onWindowResize);

  // 添加页面可见性监听
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // 移动端：添加陀螺仪监听
  if (isMobileDevice()) {
    requestMotionPermission();
  }
});

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener("resize", onWindowResize);
  document.removeEventListener("visibilitychange", handleVisibilityChange);

  // 移除陀螺仪监听
  if (isMobileDevice()) {
    window.removeEventListener("devicemotion", handleDeviceMotion);
  }

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  if (renderer) {
    renderer.dispose();
  }
  if (scene) {
    scene.clear();
  }

  if (celebrationTimeout) {
    clearTimeout(celebrationTimeout);
  }
});
</script>

<style scoped>
.dice-container {
  max-width: 1000px;
  width: calc(100% - 40px);
  margin: 20px auto;
  padding: 30px 20px;
  text-align: center;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #3a7bd5 100%);
  border-radius: 25px;
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  color: white;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.dice-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 15% 15%, rgba(255, 255, 255, 0.12) 0%, transparent 40%),
    radial-gradient(circle at 85% 85%, rgba(58, 123, 213, 0.15) 0%, transparent 40%);
  pointer-events: none;
}

.dice-container h2 {
  font-size: clamp(1.5rem, 5vw, 3rem);
  margin-bottom: 20px;
  text-shadow:
    3px 3px 6px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(255, 255, 255, 0.3);
  font-weight: 800;
  letter-spacing: 2px;
  position: relative;
  z-index: 2;
}

.dice-wrapper {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
  min-height: 300px;
  position: relative;
  z-index: 2;
}

.dice-canvas-container {
  width: 100%;
  max-width: 600px;
  height: 400px;
  position: relative;
  border-radius: 15px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
}

.dice-canvas {
  width: 100%;
  height: 100%;
  border-radius: 15px;
  position: relative;
}

.controls {
  margin: 20px 0;
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
}

.controls .el-button {
  flex: 1;
  min-width: 140px;
  max-width: 200px;
  height: 56px;
  border-radius: 30px;
  font-weight: 700;
  font-size: 17px;
  padding: 0 25px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow:
    0 6px 12px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: none;
  position: relative;
  overflow: hidden;
}

.controls .el-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.controls .el-button:hover::before {
  left: 100%;
}

.controls .el-button:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow:
    0 10px 20px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.controls .el-button:active {
  transform: translateY(-1px) scale(1.02);
}

.result {
  margin-top: 20px;
  padding: 20px;
  background:
    rgba(255, 255, 255, 0.15),
    linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  position: relative;
  z-index: 2;
}

.result p {
  font-size: clamp(20px, 4vw, 28px);
  font-weight: 800;
  margin: 0 0 15px 0;
  text-shadow:
    2px 2px 4px rgba(0, 0, 0, 0.4),
    0 0 15px rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
  background: linear-gradient(45deg, #ffffff, #f8f9ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.individual-results {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.die-result-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.die-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.die-result {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.15));
  border-radius: 50%;
  width: 55px;
  height: 55px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 28px;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
  box-shadow:
    0 6px 12px rgba(0, 0, 0, 0.3),
    inset 0 2px 4px rgba(255, 255, 255, 0.2);
  border: 3px solid rgba(255, 255, 255, 0.4);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.die-result:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.4),
    inset 0 2px 4px rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .dice-container {
    margin: 10px auto;
    padding: 20px 15px;
    width: calc(100% - 20px);
    border-radius: 20px;
  }

  .dice-container h2 {
    font-size: 1.8rem;
    margin-bottom: 15px;
  }

  .dice-wrapper {
    gap: 15px;
    margin: 15px 0;
    min-height: 250px;
  }

  .dice-canvas-container {
    width: 100%;
    max-width: 100%;
    height: 300px;
  }

  .dice-canvas {
    width: 100% !important;
    height: 100% !important;
  }

  .controls {
    gap: 10px;
    margin: 15px 0;
  }

  .controls .el-button {
    flex: 1;
    min-width: 100px;
    max-width: 160px;
    height: 50px;
    font-size: 15px;
    padding: 0 20px;
  }

  .result {
    margin-top: 15px;
    padding: 15px;
  }

  .result p {
    font-size: 20px;
    margin-bottom: 12px;
  }

  .individual-results {
    gap: 12px;
  }

  .die-result {
    width: 48px;
    height: 48px;
    font-size: 24px;
    border-width: 2px;
  }

  .die-label {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .dice-container {
    margin: 5px auto;
    padding: 15px 10px;
    width: calc(100% - 10px);
    border-radius: 15px;
    height: 96vh;
  }

  .dice-container h2 {
    font-size: 1.5rem;
    margin-bottom: 10px;
  }

  .dice-wrapper {
    margin: 10px 0;
    min-height: 200px;
  }

  .dice-canvas-container {
    height: 250px;
  }

  .controls {
    gap: 8px;
    margin: 10px 0;
  }

  .controls .el-button {
    flex: 1;
    min-width: 85px;
    max-width: 140px;
    height: 48px;
    font-size: 14px;
    padding: 0 16px;
  }

  .result {
    margin-top: 10px;
    padding: 12px;
  }

  .result p {
    font-size: 18px;
    margin-bottom: 10px;
  }

  .die-result {
    width: 42px;
    height: 42px;
    font-size: 20px;
  }

  .die-label {
    font-size: 12px;
  }
}
</style>

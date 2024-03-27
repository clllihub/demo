import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as TWEEN from "@tweenjs/tween.js";

let scene,
  camera,
  renderer,
  model,
  controls,
  autoRotate = true,
  pointCloud,
  currentLoadingModel = "",
  modelsInScene = [],
  pointCloudsInScene = [];

const DEFAULT_MODEL_PATH = "ferrari_f50_1995.glb";

const modelAttributes = {
  "ferrari_f50_1995.glb": {
    backgroundColor: new THREE.Color(0x726e36),
    cameraPosition: new THREE.Vector3(1.25, 0.6, 2.5),
  },
  default: {
    backgroundColor: new THREE.Color(0x191919),
    // cameraPosition: new THREE.Vector3(1.25, 0.6, 2.5),
    cameraPosition: new THREE.Vector3(1.25, 0, 0),
  },
};

function updateLoadingProgress(percentage) {
  document.getElementById("progress-bar").style.width = percentage + "%";
  document.getElementById(
    "loading-text"
  ).textContent = `正在加载模型 ${percentage}%`;
}

function loadModel(modelPath) {
  const oldPointCloud = pointCloud;

  if (currentLoadingModel === modelPath) {
    return;
  }

  currentLoadingModel = modelPath;

  modelsInScene.forEach((m) => scene.remove(m));
  modelsInScene = [];

  pointCloudsInScene.forEach((pc) => scene.remove(pc));
  pointCloudsInScene = [];

  const attributes = modelAttributes[modelPath] || modelAttributes.default;
  scene.background = attributes.backgroundColor;
  camera.position.copy(attributes.cameraPosition);

  if (model) scene.remove(model);
  if (pointCloud) scene.remove(pointCloud);

  document.getElementById("progress-container").style.display = "block";
  updateLoadingProgress(0);

  const loader = new GLTFLoader();
  loader.load(
    modelPath,
    (gltf) => {
      // 隐藏进度条
      document.getElementById("progress-container").style.display = "none";
      if (currentLoadingModel !== modelPath) return;

      model = gltf.scene;
      model.visible = false;
      scene.add(model);
      modelsInScene.push(model);

      createPointCloud(model, oldPointCloud);
      animatePointsToTarget(pointCloud);
      pointCloudsInScene.push(pointCloud);

      // 隐藏进度条
      document.getElementById("progress-container").style.display = "none";
    },
    (xhr) => {
      if (xhr.lengthComputable && modelPath === currentLoadingModel) {
        const percentage = ((xhr.loaded / xhr.total) * 100).toFixed(2);
        updateLoadingProgress(percentage);
      }
    }
  );
}

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(1.25, 0.6, 4);

  renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#app"),
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.gammaFactor = 2.2;
  renderer.gammaOutput = true;
  renderer.physicallyCorrectLights = true;

  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(
    new RoomEnvironment(),
    0.04
  ).texture;

  setupModelSwitcher();
  loadModel(DEFAULT_MODEL_PATH);
  setupLights();
  setupControls();

  window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
}

function setupModelSwitcher() {
  const btnContainer = document.createElement("div");
  btnContainer.style.position = "absolute";
  btnContainer.style.top = "10px";
  btnContainer.style.right = "10px";
  btnContainer.style.zIndex = "1000";

  const models = [
    "glock_21_custom.glb",
    "modified_mosin.glb",
    "ferrari_f50_1995.glb",
    "Y.glb",
  ];
  models.forEach((modelPath) => {
    const btn = document.createElement("button");
    btn.innerText = modelPath.split("_").slice(0, 2).join(" ");
    btn.addEventListener("click", () => loadModel(modelPath));
    btnContainer.appendChild(btn);
  });

  document.body.appendChild(btnContainer);
}

function setupLights() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 5, 1);
  scene.add(directionalLight);
}

function setupControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.addEventListener("start", () => (autoRotate = false));
  controls.addEventListener("end", () => (autoRotate = true));
}

function animate() {
  requestAnimationFrame(animate);
  TWEEN.update(); // 更新Tween
  if (model && autoRotate) model.rotation.y -= 0.003;
  if (pointCloud && autoRotate) pointCloud.rotation.y -= 0.003;
  controls.update();
  renderer.render(scene, camera);
}

function createPointCloud(mesh) {
  if (!mesh) {
    console.error("Mesh is not provided or not loaded properly");
    return;
  }
  const vertices = [];
  let initialPositions;

  mesh.updateMatrixWorld(true);
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const vertex = new THREE.Vector3();
      const positions = child.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);
        vertex.applyMatrix4(child.matrixWorld);
        vertices.push(vertex.x, vertex.y, vertex.z);
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  if (pointCloud) {
    // 获取当前点云的位置
    initialPositions = pointCloud.geometry.attributes.position.array.slice();
  } else {
    initialPositions = new Float32Array(vertices.length);
    for (let i = 0; i < initialPositions.length; i += 3) {
      initialPositions[i] = (Math.random() - 0.5) * 10;
      initialPositions[i + 1] = (Math.random() - 0.5) * 10;
      initialPositions[i + 2] = (Math.random() - 0.5) * 10;
    }
  }

  // Create a circular texture for the points using 2D Canvas API
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(32, 32, 31, 0, 2 * Math.PI, false);
  ctx.fillStyle = 'white';
  ctx.fill();

  const circleTexture = new THREE.CanvasTexture(canvas);

  const material = new THREE.PointsMaterial({
    size: 0.006,
    color: 0xffffff,
    // transparent: true,
    // alphaTest: 0.5,
    map: circleTexture // Set the map to the circular texture
  });

  const newPointCloud = new THREE.Points(geometry, material);
  scene.add(newPointCloud);

  // 使用Tween.js进行动画
  // 假设您已经在项目中包含了Tween.js
  const tweenPositions = { alpha: 0 };
  new TWEEN.Tween(tweenPositions)
    .to({ alpha: 1 }, 1000) // 动画持续时间为1000ms
    .onUpdate(() => {
      for (let i = 0; i < vertices.length; i += 3) {
        newPointCloud.geometry.attributes.position.array[i] =
          initialPositions[i] +
          (vertices[i] - initialPositions[i]) * tweenPositions.alpha;
        newPointCloud.geometry.attributes.position.array[i + 1] =
          initialPositions[i + 1] +
          (vertices[i + 1] - initialPositions[i + 1]) * tweenPositions.alpha;
        newPointCloud.geometry.attributes.position.array[i + 2] =
          initialPositions[i + 2] +
          (vertices[i + 2] - initialPositions[i + 2]) * tweenPositions.alpha;
      }
      newPointCloud.geometry.attributes.position.needsUpdate = true;
    })
    .onComplete(() => {
      if (pointCloud) scene.remove(pointCloud);
      pointCloud = newPointCloud;
    })
    .start();
}


function animatePointsToTarget(pointCloud) {
  if (!pointCloud || (pointCloud && !pointCloud.geometry)) {
    console.error("pointCloud or pointCloud.geometry is not defined");
    return;
  }
  const positions = pointCloud.geometry.attributes.position;
  const targets = pointCloud.userData.targets;

  let progress = 0.0;
  // const speed = 0.02; // 速度可以根据需要进行调整
  const speed = 0.00005; // 速度可以根据需要进行调整

  const animatePoints = () => {
    progress += speed;

    if (progress > 1.0) progress = 1.0;

    for (let i = 0; i < positions.count; i++) {
      const px = positions.array[i * 3];
      const py = positions.array[i * 3 + 1];
      const pz = positions.array[i * 3 + 2];

      const tx = targets[i].x;
      const ty = targets[i].y;
      const tz = targets[i].z;

      positions.array[i * 3] = px + (tx - px) * progress;
      positions.array[i * 3 + 1] = py + (ty - py) * progress;
      positions.array[i * 3 + 2] = pz + (tz - pz) * progress;
    }

    positions.needsUpdate = true;

    if (progress < 1.0) {
      requestAnimationFrame(animatePoints);
    } else {
      // pointCloud.visible = false;
      // model.visible = true;
    }
  };

  animatePoints();
}

init();
animate();

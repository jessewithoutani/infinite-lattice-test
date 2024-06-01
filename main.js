import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth - 60, window.innerHeight - 60);
renderer.setPixelRatio(0.3);
document.body.appendChild(renderer.domElement);

const player = new THREE.Object3D();
let playerVelocity = 0;
scene.add(player);
player.position.set(1.25, 1.5, -1.25);
const groundCheck = new THREE.Raycaster(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0), 0, 1);

player.add(camera);
scene.background = new THREE.Color(0xaaaaaa);

const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = 0.6;
let locked = false;
controls.addEventListener("lock", () => {
	// menu.style.display = "none";
    locked = true;
});
controls.addEventListener("unlock", () => {
	// menu.style.display = "block";
    locked = false;
});
document.body.addEventListener("click", () => {
	controls.lock();
})

const CHUNK_SIZE = 64;
const RENDER_DISTANCE = 6;
scene.fog = new THREE.Fog(scene.background, 0, CHUNK_SIZE * RENDER_DISTANCE * 0.9);

const directional = new THREE.DirectionalLight(0xffffff, 2.5);
directional.position.set(0.5, 1, 0.1);
scene.add(directional);
const ambient = new THREE.AmbientLight(0x888899, 2);
scene.add(ambient);

let lattice = {};
let latticeObjects = [];
const latticeMaterial = new THREE.MeshPhongMaterial();

var pressedKeys = {};
window.onkeyup = function(event) { pressedKeys[event.key] = false; }
window.onkeydown = function(event) { pressedKeys[event.key] = true; }

function latticeBarName(i, j, axis, k = -1) {
	return `${i}_${j}_${k}_${axis}`;
}

function preloadLattice() {
	const xGeometry = new THREE.BoxGeometry(CHUNK_SIZE * RENDER_DISTANCE * 2, 3, 3);
	const yGeometry = new THREE.BoxGeometry(3, CHUNK_SIZE * RENDER_DISTANCE * 2, 3);
	const zGeometry = new THREE.BoxGeometry(3, 3, CHUNK_SIZE * RENDER_DISTANCE * 2);
	const platformGeometry = new THREE.BoxGeometry(7.5, 3, 7.5);

	function addItem(i, j, axis, item, k = -1) {
		lattice[latticeBarName(i, j, axis, k)] = item;
		scene.add(item);
		latticeObjects.push(item);
	}

	for (let i = -RENDER_DISTANCE; i <= RENDER_DISTANCE; i++) {
		for (let j = -RENDER_DISTANCE; j <= RENDER_DISTANCE; j++) {
			const I_DISTANCE = CHUNK_SIZE * i;
			const J_DISTANCE = CHUNK_SIZE * j;

			// x
			const xBar = new THREE.Mesh(xGeometry, latticeMaterial);
			xBar.position.set(0, I_DISTANCE, J_DISTANCE);
			addItem(i, j, "x", xBar);

			// y
			const yBar = new THREE.Mesh(yGeometry, latticeMaterial);
			yBar.position.set(I_DISTANCE, 0, J_DISTANCE);
			addItem(i, j, "y", yBar);

			// z
			const zBar = new THREE.Mesh(zGeometry, latticeMaterial);
			zBar.position.set(I_DISTANCE, J_DISTANCE, 0);
			addItem(i, j, "z", zBar);

			// ================================================
			for (let k = -RENDER_DISTANCE; k <= RENDER_DISTANCE; k++) {
				const platform = new THREE.Mesh(platformGeometry, latticeMaterial);
				platform.position.set(
					CHUNK_SIZE * i,
					CHUNK_SIZE * j,
					CHUNK_SIZE * k
				);
				addItem(i, j, "n", platform, k);
			}
		}
	}
}
preloadLattice();

const DOWN = new THREE.Vector3(0, -1, 0);

function isGrounded() {
	groundCheck.set(new THREE.Vector3(player.position.x, player.position.y + 1, player.position.z), DOWN);
	const intersections = groundCheck.intersectObjects(latticeObjects);
	// alert(JSON.stringify(intersections[0]))
	return intersections.length > 0;
}

const positionDebug = document.querySelector("#position");
const velocityDebug = document.querySelector("#velocity");
const deltaDebug = document.querySelector("#delta");
function roundTo2Dec(v) {
	return Math.round(v * 100.0) / 100.0;
}
function updateInformation(delta) {
	positionDebug.innerHTML = `<${roundTo2Dec(player.position.x)}, ${roundTo2Dec(player.position.y)}, ${roundTo2Dec(player.position.z)}>`;
	velocityDebug.innerHTML = roundTo2Dec(playerVelocity);
	deltaDebug.innerHTML = roundTo2Dec(delta);
}

function updateScene() {
	const snappedPosition = new THREE.Vector3(
		Math.floor(player.position.x / CHUNK_SIZE) * CHUNK_SIZE,
		Math.floor(player.position.y / CHUNK_SIZE) * CHUNK_SIZE,
		Math.floor(player.position.z / CHUNK_SIZE) * CHUNK_SIZE
	);

	for (let i = -RENDER_DISTANCE; i <= RENDER_DISTANCE; i++) {
		for (let j = -RENDER_DISTANCE; j <= RENDER_DISTANCE; j++) {
			const I_DISTANCE = CHUNK_SIZE * i;
			const J_DISTANCE = CHUNK_SIZE * j;

			// x
			const xBar = lattice[latticeBarName(i, j, "x")];
			xBar.position.copy(snappedPosition).add(new THREE.Vector3(0, I_DISTANCE, J_DISTANCE));

			// y
			const yBar = lattice[latticeBarName(i, j, "y")];
			yBar.position.copy(snappedPosition).add(new THREE.Vector3(I_DISTANCE, 0, J_DISTANCE));

			// z
			const zBar = lattice[latticeBarName(i, j, "z")];
			zBar.position.copy(snappedPosition).add(new THREE.Vector3(I_DISTANCE, J_DISTANCE, 0));

			// ================================================
			for (let k = -RENDER_DISTANCE; k <= RENDER_DISTANCE; k++) {
				const platform = lattice[latticeBarName(i, j, "n", k)];
				// alert(latticeBarName(i, j, "n", k))
				platform.position.copy(snappedPosition).add(new THREE.Vector3(
					CHUNK_SIZE * i,
					CHUNK_SIZE * j,
					CHUNK_SIZE * k
				));
			}
		}
	}
	// alert(JSON.stringify(Object.keys(lattice)))
}

const clock = new THREE.Clock();
let timeElapsed = 0;
// update() runs every frame
function update() {
	requestAnimationFrame(update);
	const delta = clock.getDelta();
	timeElapsed += delta;

	if (!locked) {
		pressedKeys = {};
	}

	// do input
	let walkMovement = 0;
	let strafeMovement = 0;
	if (pressedKeys.w || pressedKeys.W) walkMovement++;
	if (pressedKeys.s || pressedKeys.S) walkMovement--;
	if (pressedKeys.a || pressedKeys.A) strafeMovement--;
	if (pressedKeys.d || pressedKeys.D) strafeMovement++;

	const theta = camera.rotation.y;
	const walkVector = new THREE.Vector3(
		Math.sin(theta), 0, Math.cos(theta)); walkVector.multiplyScalar(4 * delta * -walkMovement);
	const strafeVector = new THREE.Vector3(
		Math.sin(theta + Math.PI / 2), 0, Math.cos(theta + Math.PI / 2)); strafeVector.multiplyScalar(4 * delta * strafeMovement);
	if (!isGrounded()) {
		playerVelocity -= 9.81 * delta;
		playerVelocity = Math.max(playerVelocity, -80); // limit to terminal velocity
	}
	else {
		playerVelocity = 0;
	}
	const gravityVector = new THREE.Vector3(0, playerVelocity * delta, 0);
	player.position.add(walkVector).add(strafeVector).add(gravityVector);
	camera.position.y = 2 + (Math.sin(timeElapsed * 12.5) * Math.max(Math.abs(walkMovement), Math.abs(strafeMovement)) * 0.07);

	updateScene();
	updateInformation(delta);

	renderer.render(scene, camera);
}
update();
import './style.css'
//import './checker.png'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PCFShadowMap } from 'three'

// Debug
const gui = new dat.GUI()

// Texture Loader
const txtLoader = new THREE.TextureLoader()

// GLTF Loader
const gltfLoader = new GLTFLoader()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Uniforms
let uniforms = {
    time: { value: 1.0 },
    resolution: { type: "v2", value: new THREE.Vector2() },
    sampleTxt: {
        value: txtLoader.load('https://threejsfundamentals.org/threejs/resources/images/checker.png')
    }
};

// Objects
const torusGeo = new THREE.TorusGeometry(.75, .2, 16, 100);
const planeGeo = new THREE.PlaneGeometry(1, 1);
const boxGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
const sphereGeo = new THREE.SphereGeometry(.5, 100, 100);

// Materials

const redMat = new THREE.MeshBasicMaterial();
redMat.color = new THREE.Color(0xff0000);

const phongMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
});

const checkTxt = txtLoader.load(`https://threejsfundamentals.org/threejs/resources/images/checker.png`);
//const checkTxt = txtLoader.load(`checker.png`);
checkTxt.wrapS = THREE.RepeatWrapping;
checkTxt.wrapT = THREE.RepeatWrapping;
checkTxt.repeat.set(10, 10);
checkTxt.magFilter = THREE.NearestFilter;
const txtMat = new THREE.MeshBasicMaterial({
    map: checkTxt,
    side: THREE.DoubleSide
})

/* const refractMat = new THREE.MeshPhysicalMaterial({
    roughness: 0,
    transmission: 1
    thickness: 2
}); */

const shaderMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader').textContent,
    side: THREE.DoubleSide
});

const shaderMat2 = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader2').textContent,
    side: THREE.DoubleSide
});

const shaderMat3 = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader3').textContent,
    side: THREE.DoubleSide
});
//console.log(document.getElementById('fragmentShader').textContent)

// Mesh
const torusMesh = new THREE.Mesh(torusGeo, shaderMat3);
scene.add(torusMesh);

const planeMesh = new THREE.Mesh(planeGeo, phongMat);
planeMesh.rotation.x = 1.75;
planeMesh.castShadow = true;
planeMesh.receiveShadow = true;
scene.add(planeMesh);

const planeMesh2 = new THREE.Mesh(planeGeo, phongMat);
planeMesh2.position.z = -.25;
planeMesh2.castShadow = true;
planeMesh2.receiveShadow = true;
scene.add(planeMesh2);

const boxMesh = new THREE.Mesh(boxGeo, phongMat);
boxMesh.position.y = .15;
boxMesh.position.x = .15;
boxMesh.castShadow = true;
boxMesh.receiveShadow = true;
scene.add(boxMesh);

const sphereMesh = new THREE.Mesh(sphereGeo, shaderMat);
sphereMesh.position.x = -1;
scene.add(sphereMesh);

// load boy
gltfLoader.load(`theBoy_animsx2_v1.gltf`, (gltf) => {
    gltf.scene.scale.set(.05, .05, .05);
    scene.add(gltf.scene)

    gltf.scene.traverse(function (object) {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
            console.log("cast shadow")
        }
    });
});

// Lights

/* const pointLight = new THREE.PointLight(0xffffff, 1)
//pointLight.position.set(2, 3, 4);
pointLight.position.set(0.5, 1, 0);
pointLight.castShadow = true;
scene.add(pointLight); */

/* const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
hemiLight.position.set(0, 20, 0);
hemiLight.castShadow = true;
scene.add(hemiLight);
scene.add(new THREE.CameraHelper(hemiLight.shadow.camera)); */


const dirLight = new THREE.DirectionalLight(0xffffff);
dirLight.position.set(3, 10, 10);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 2;
dirLight.shadow.camera.bottom = - 2;
dirLight.shadow.camera.left = - 2;
dirLight.shadow.camera.right = 2;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 40;
dirLight.target = boxMesh;
scene.add(dirLight);
scene.add(new THREE.CameraHelper(dirLight.shadow.camera));

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 0
camera.position.y = 0
camera.position.z = 2
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;

/**
 * Animate
 */

const clock = new THREE.Clock()

const tick = () => {

    const elapsedTime = clock.getElapsedTime();

    // Update Uniforms
    uniforms['time'].value = performance.now() / 1000;
    uniforms['resolution'].value = [window.innerWidth, window.innerHeight];

    // Update objects
    torusMesh.rotation.y = .25 * elapsedTime;
    //planeMesh.rotation.x = .25 * elapsedTime;
    boxMesh.rotation.x = .25 * elapsedTime;
    boxMesh.rotation.y = .25 * elapsedTime;

    // Update Orbital Controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
import './style.css'
//import './checker.png'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { AnimationMixer, BlendingSrcFactor, BufferAttribute, DstAlphaFactor, OneFactor, PCFShadowMap, SkeletonHelper, SrcAlphaFactor, SubtractEquation } from 'three'
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { SelectiveBloomEffect, BloomEffect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
/* import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
 */
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { gsap } from 'gsap/all';


//#region SCENE VARIABLES

// Debug
const gui = new dat.GUI();
const stats = Stats();
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

// Clock
const clock = new THREE.Clock();

// Texture Loader
const txtLoader = new THREE.TextureLoader();

// GLTF Loader
const gltfLoader = new GLTFLoader();

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();
//scene.background = new THREE.Color(0xffffff);

// Uniforms
let uniforms = {
    time: { value: 1.0 },
    resolution: { value: new THREE.Vector4() },
    positionTexture: { value: null },
};


//#endregion

/** 
 * GLOBAL VARIABLES
 */

// init objects
//const bloomLayer = new THREE.Layers();
//#region global variables
let effectComposer, renderPass, bloomPass;
let axesHelper;

let boyAnimations, girlAnimations, settings;
let mats = [];
let gltfModels = [];

let windVideo;
let boxMesh, sphereMesh, pointsMesh;
let boyMixer, girlMixer;
let skeleton, boyModel, girlModel, duneModel, sandWispModel, windWispModel, flowerModel;
let activeClip, pole_walking_NLA, sitting_NLA, start_walking_NLA, movePos1_NLA, walk_cycle_NLA;
let blow_kiss_NLA;

let allNarration, activeSceneNum = 0;
let fadeOverride = false;

/* function timelineObj(enter, executed, clip) {
    this.enter = enter;
    this.executed = executed;
    this.clip = clip;
} */

function timelineObj(name, repeat, actors, playActions) {
    this.name = name;
    this.repeat = repeat;
    this.actors = actors;
    this.playActions = playActions;
}
const timelineClips = [];
let gsapT1 = gsap.timeline({ repeat: 0 });

let controls, camera, renderer;
let meshLoaded = false, mixerLoaded = false, isRotating = true, canBegin = false;

//#endregion






/**
 * INIT OJBECTS
 */
function initObjects() {
    //#region GEO/TXT
    // Geometry
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const sphereGeo = new THREE.SphereGeometry(.5, 100, 100);


    //#region BUFFER GEOMETRY
    const bufferGeo = new THREE.BufferGeometry();
    let positions = new Float32Array(WIDTH * WIDTH * 3);
    let reference = new Float32Array(WIDTH * WIDTH * 2);
    for (let i = 0; i < WIDTH * WIDTH; i++) {
        let x = Math.random();
        let y = Math.random();
        let z = Math.random();

        let xx = (i % WIDTH) / WIDTH;
        let yy = ~~(i / WIDTH) / WIDTH;

        positions.set([x, y, z], i * 3)
        reference.set([xx, yy], i * 2)
    }

    bufferGeo.setAttribute('position', new BufferAttribute(positions, 3));
    bufferGeo.setAttribute('reference', new BufferAttribute(reference, 2));

    console.log(positions)
    console.log(reference)
    //#endregion


    //  Textures
    const checkTxt = txtLoader.load(`https://threejsfundamentals.org/threejs/resources/images/checker.png`);
    checkTxt.wrapS = THREE.RepeatWrapping;
    checkTxt.wrapT = THREE.RepeatWrapping;
    checkTxt.repeat.set(10, 10);
    checkTxt.magFilter = THREE.NearestFilter;

    //#endregion

    //#region MATERIALS

    const pointsMat = new THREE.PointsMaterial({
        transparent: true,
        size: .001,
    })

    const glowMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        //emissive: 0xffffff,
        //emissiveIntensity: 10,
        transparent: true,
    });
    mats.push(glowMat);

    // Shader Materials
    //#region SHADERMATS

    particleShader = new THREE.ShaderMaterial({
        extensions: {
            derivatives: "extension GL_OES_standard_derivatives : enable"
        },
        uniforms: uniforms,
        vertexShader: document.getElementById('vertexParticleShader').textContent,
        fragmentShader: document.getElementById('fragmentShaderColor').textContent,
        transparent: true,
    });

    //#endregion

    //#endregion

    //#region MESH

    /* sphereMesh = new THREE.Mesh(sphereGeo, shaderMat4);
    sphereMesh.scale.set(1, 1, 1);
    sphereMesh.position.set(.5, -1, -2);
    //scene.add(sphereMesh);

    boxMesh = new THREE.Mesh(boxGeo, shaderMat5);
    boxMesh.scale.set(1, 1, 1);
    boxMesh.position.set(-1, 1, -1);
    //scene.add(boxMesh); */

    //pointsMesh = new THREE.Points(pointsGeo, shaderMat5);
    pointsMesh = new THREE.Points(bufferGeo, pointsMat);
    scene.add(pointsMesh);

    //#endregion

    //#region LIGHTS

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 20, 0);
    hemiLight.layers.enableAll();
    scene.add(hemiLight);

    //#endregion
}


/**
 * INIT SCENE
 */
function initScene() {
    //#region LISTENERS/SIZE
    /**
     * Sizes
     */
    const sizes = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

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
        //effectComposer.setSize(sizes.width, sizes.height)
    })

    //#endregion

    /**
     * Camera
     */
    camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
    camera.position.x = 0
    camera.position.y = 0
    camera.position.z = 2
    scene.add(camera)
    gui.add(camera.position, "y").min(-10).max(10);
    gui.add(camera.position, "x").min(-10).max(10);

    // Controls
    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true;
    //controls.enabled = false;

    /**
     * Renderer
     */
    renderer = new THREE.WebGLRenderer({
        canvas: canvas
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;

    // Postprocessing
    //#region BLOOM


    effectComposer = new EffectComposer(renderer);
    renderPass = new RenderPass(scene, camera);

    //bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.95);
    bloomPass = new BloomEffect({
        intensity: 2,
        luminanceThreshold: .5
    })
    const effectPass = new EffectPass(
        camera,
        bloomPass
    );

    effectComposer.addPass(renderPass);
    //effectComposer.addPass(bloomPass);
    effectComposer.addPass(effectPass);


    //#endregion

    // Load GUI Items

}

function fillPositions(dt) {
    //console.log(dt);

    let dtArr = dt.image.data

    for (let i = 0; i < dtArr.length; i = i + 4) {
        let x = Math.random();
        let y = Math.random();
        let z = Math.random();

        dtArr[i] = x;
        dtArr[i + 1] = y;
        dtArr[i + 2] = z;
        dtArr[i + 3] = 1;
    }
    //console.log(dtArr)
}
//#endregion

/**
 * Animate
 */

const tick = () => {

    //#region BASIC

    stats.begin()


    // Update Uniforms
    uniforms['time'].value = clock.getElapsedTime();
    uniforms.resolution.value.x = window.innerWidth;
    uniforms.resolution.value.y = window.innerHeight;

    //sandWispModel.rotation.y = clock.getElapsedTime();
    //camera.rotation.y = clock.getElapsedTime();
    //camera.rotation.x = clock.getElapsedTime();
    //camera.rotation.z = clock.getElapsedTime();
    //#endregion



    // Update stats
    stats.update();

    // Update Orbital Controls

    if (!isRotating) { controls.update(); }

    // Render
    //effectComposer.render();
    renderer.render(scene, camera);

    gpuCompute.compute();
    console.log(gpuCompute.getCurrentRenderTarget(positionVariable));
    particleShader.uniforms.positionTexture.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;

    stats.end()

    // Call tick again on the next frame
    requestAnimationFrame(tick);
}



initScene();


//#region GPGPU

// * texturePosition: a texture that holds the positions of particles sent to particle fragment shader
// * positionTexture: the position of the texture that is sent to the particle vertex shader

//TEXTURE WIDTH FOR SIMULATING PARTICLES
const WIDTH = 32;
let particleShader;
// TODO: add this declaration to main script (DON'T FORGET)
let gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);
let positionVariable; // references the uniforms sent to the GPU via GPUCompute

const dtPosition = gpuCompute.createTexture();
fillPositions(dtPosition);

positionVariable = gpuCompute.addVariable('texturePosition', document.getElementById('fragmentSimulation').textContent, dtPosition);
positionVariable.material.uniforms['time'] = { value: 0 };
//positionVariable.material.uniforms['resolution'] = { value: 0 };

positionVariable.wrapS = THREE.RepeatWrapping;
positionVariable.wrapT = THREE.RepeatWrapping;

gpuCompute.init()
const error = gpuCompute.init();
if (error !== null) {
    console.error(error);
}

console.log(gpuCompute)
console.log(positionVariable.material.uniforms)

initObjects();
//initGPGPU();
tick();
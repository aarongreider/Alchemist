import './style.css'
//import './checker.png'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { AnimationMixer, BlendingSrcFactor, DstAlphaFactor, OneFactor, PCFShadowMap, SkeletonHelper, SrcAlphaFactor, SubtractEquation } from 'three'
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { SelectiveBloomEffect, BloomEffect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
/* import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
 */
import { gsap } from 'gsap/all';



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

// Uniforms
let uniforms = {
    time: { value: 1.0 },
    resolution: { type: "v2", value: new THREE.Vector2() },
    sampleTxt: {
        value: txtLoader.load('https://threejsfundamentals.org/threejs/resources/images/checker.png')
    }
};

/** 
 * GLOBAL VARIABLES
 */

// init objects
//const bloomLayer = new THREE.Layers();

let effectComposer, renderPass, bloomPass;

let autoscroll = true;
let boyAnimations, settings;
let boxMesh, sphereMesh;
let boyMixer1, skeleton, boyModel, duneModel;
let activeClip;

let activeSceneNum = 0;
/* function timelineObj(enter, executed, clip) {
    this.enter = enter;
    this.executed = executed;
    this.clip = clip;
} */
function timelineObj(name, repeat, playActions) {
    this.name = name;
    this.repeat = repeat;
    this.playActions = playActions;

}
const timelineClips = [];
let gsapT1 = gsap.timeline(/* { repeat: -1 } */);

let wheelDeltaY, wheelTotalY, controls, camera, renderer;
let scrollControl = { scrollspeed: 1 };
let htmlBody = document.querySelector("html");
let meshLoaded = false;

/**
 * INIT OJBECTS
 */
function initObjects() {
    //#region GEO/TXT
    // Geometry
    //const torusGeo = new THREE.TorusGeometry(.75, .2, 16, 100);
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const sphereGeo = new THREE.SphereGeometry(.5, 100, 100);
    const circleGeo = new THREE.CircleGeometry(.5, 30);

    //  Textures
    const checkTxt = txtLoader.load(`https://threejsfundamentals.org/threejs/resources/images/checker.png`);
    checkTxt.wrapS = THREE.RepeatWrapping;
    checkTxt.wrapT = THREE.RepeatWrapping;
    checkTxt.repeat.set(10, 10);
    checkTxt.magFilter = THREE.NearestFilter;
    //#endregion

    //#region MATERIALS
    const whiteMat = new THREE.MeshBasicMaterial();
    whiteMat.color = new THREE.Color(0xfefefe);

    const phongMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });

    const txtMat = new THREE.MeshBasicMaterial({
        map: checkTxt,
        side: THREE.DoubleSide
    })

    const glowMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        //emissive: 0xffffff,
        //emissiveIntensity: 10,
        transparent: false
    });

    // Shader Materials
    //#region SHADERMATS
    const shaderMat = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
        side: THREE.DoubleSide,
        blending: THREE.CustomBlending,
        blendSrc: SrcAlphaFactor,
        blendDst: DstAlphaFactor,
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
    //#endregion

    //#endregion

    //#region MESH

    sphereMesh = new THREE.Mesh(sphereGeo, glowMat);
    sphereMesh.scale.set(1.5, 1.5, 1.5);
    sphereMesh.position.set(0, 0, 0);
    scene.add(sphereMesh);

    boxMesh = new THREE.Mesh(boxGeo, glowMat);
    boxMesh.scale.set(1, 1, 1);
    boxMesh.position.set(-1, 1, -1);
    scene.add(boxMesh);

    //#endregion

    //#region GLTF

    //#endregion

    //#region LIGHTS

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);


    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(3, 10, 10);
    dirLight.intensity = .5;
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 2;
    dirLight.shadow.camera.bottom = - 2;
    dirLight.shadow.camera.left = - 2;
    dirLight.shadow.camera.right = 2;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 40;
    scene.add(new THREE.CameraHelper(dirLight.shadow.camera));
    //#endregion
}
function switchGLTFAnims(newClip) {
    console.log(newClip);
    newClip.enabled = true;
    newClip.setEffectiveWeight(1);
    newClip.play();
    activeClip.crossFadeTo(newClip, .25, false);

    activeClip = newClip;
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

    /**
     * Mouse Wheel Event
     */

    /* wheelTotalY = 0;
    window.addEventListener("wheel", event => {
        wheelDeltaY = event.deltaY;
        wheelTotalY += wheelDeltaY;
        //console.log(wheelDeltaY);
        //console.log("total Y: " + wheelTotalY);
    }); */
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


/**
 * INIT TIMELINE
 */

//#region GSAP ANIMS
function initTimeline() {
    timelineClips.push(
        new timelineObj(
            'move sphere by x', -1,
            function () {
                gsapT1.clear();
                gsapT1.to(sphereMesh.position, { duration: 1, x: sphereMesh.position.x + 1 });
                gsapT1.to(sphereMesh.position, { duration: 1, x: sphereMesh.position.x });
            }
        ),
        new timelineObj(
            'move sphere by y', -1,
            function () {
                gsapT1.clear();
                gsapT1.to(sphereMesh.position, { duration: 1, y: sphereMesh.position.y + 1 });
                gsapT1.to(sphereMesh.position, { duration: 1, y: sphereMesh.position.y });
            }
        ),
        new timelineObj(
            'move sphere by z', -1,
            function () {
                gsapT1.clear();
                gsapT1.to(sphereMesh.position, { duration: 1, z: sphereMesh.position.z + 1 });
                gsapT1.to(sphereMesh.position, { duration: 1, z: sphereMesh.position.z });
            }
        ),
    );
    initLayers();
    playScene(timelineClips[activeSceneNum]);

    // load GUI items

    //toggle the GSAP timeline
    let playing = true;
    gui.add({ button: playing }, "button").name("play/pause").onChange(function () {
        if (playing) {
            gsapT1.pause();
        } else {
            gsapT1.play();
        }
        playing = !playing;
    });

    // continue to next scene
    gui.add({
        nextScene: function () {
            console.log(`timelineClips length ${timelineClips.length}`)
            if (activeSceneNum < timelineClips.length - 1) {
                activeSceneNum++;
                playScene(timelineClips[activeSceneNum])
            } else {
                activeSceneNum = 0;
                playScene(timelineClips[activeSceneNum])
            }
        }
    }, 'nextScene');
}

function initLayers() {
    sphereMesh.layers.enableAll();
    boxMesh.layers.set(1);
    camera.layers.set(0);
}

function playScene(sceneObj) {
    console.log(`active scene: ${sceneObj.name}`);
    console.log(sceneObj);

    gsapT1.repeat(sceneObj.repeat);
    sceneObj.playActions();
}

//#endregion


/**
 * Animate
 */

const tick = () => {

    //#region BASIC

    stats.begin()

    // Update Uniforms
    uniforms['time'].value = performance.now() / 1000;
    uniforms['resolution'].value = [window.innerWidth, window.innerHeight];

    // Update objects
    //sphereMesh.position.x = Math.sin(clock.getElapsedTime());

    // init GSAP only when models are loaded
    if (!meshLoaded) {
        if (sphereMesh) {
            initTimeline();
            meshLoaded = true;
        }
    }

    //#endregion



    // Update stats
    stats.update();

    // Update Orbital Controls
    controls.update();

    // Render
    effectComposer.render();
    //renderer.render(scene, camera);

    stats.end()

    // Call tick again on the next frame
    requestAnimationFrame(tick);
}



initObjects();
initScene();
tick();
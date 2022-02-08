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

// Uniforms
let uniforms = {
    time: { value: 1.0 },
    resolution: { type: "v2", value: new THREE.Vector2() },
    sampleTxt: {
        value: txtLoader.load('https://threejsfundamentals.org/threejs/resources/images/checker.png')
    }
};

// Click Listeners
let cursor = document.getElementById('cursor');
cursor.addEventListener("click", advanceScene);

//#endregion

/** 
 * GLOBAL VARIABLES
 */

// init objects
//const bloomLayer = new THREE.Layers();

let effectComposer, renderPass, bloomPass;

let boyAnimations, settings;
let mats = [];
let gltfModels = [];

let boxMesh, sphereMesh;
let boyMixer1, skeleton, boyModel, duneModel;
let activeClip, pole_walking_NLA, sitting_NLA, start_walking_NLA, movePos1_NLA, walk_cycle_NLA;
let allNarration, activeSceneNum = 0;

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
// T1 — handles scene/mesh animations
// T2 — handles text transitions
// T3 — handles material transitions
let gsapT1 = gsap.timeline(/* { repeat: -1 } */);
let gsapT2 = gsap.timeline();
let gsapT3 = gsap.timeline();
gsapT2.repeat(0);
gsapT3.repeat(0);

let controls, camera, renderer;
let meshLoaded = false, mixerLoaded = false;

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
        transparent: true,
    });

    mats.push(glowMat, txtMat, phongMat, whiteMat);

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
    sphereMesh.scale.set(1, 1, 1);
    sphereMesh.position.set(.5, -1, -2);
    scene.add(sphereMesh);

    boxMesh = new THREE.Mesh(boxGeo, glowMat);
    boxMesh.scale.set(1, 1, 1);
    boxMesh.position.set(-1, 1, -1);
    scene.add(boxMesh);

    //#endregion

    //#region GLTF

    /**
    * LOAD BOY GLTF
    */
    gltfLoader.load(`boy_v15.gltf`, (gltf) => {
        boyModel = gltf.scene;

        //set transforms
        boyModel.scale.set(.1, .1, .1);

        // assign cast shadow and materials
        /* boyModel.traverse(function (child) {
            if (child.isMesh) {
                //object.castShadow = true;
                //object.receiveShadow = true;
                //console.log("object name: " + object.name)
                child.material = glowMat;
            }
        }); */

        // add BOY to scene
        gltfModels.push(boyModel);
        scene.add(boyModel);
        console.log(boyModel)
        console.log(gltfModels)

        // show rig skeleton
        skeleton = new THREE.SkeletonHelper(boyModel);
        skeleton.visible = true;
        //scene.add(skeleton);

        // init animation mixer
        boyMixer1 = new THREE.AnimationMixer(boyModel);
        boyAnimations = gltf.animations;

        movePos1_NLA = boyMixer1.clipAction(gltf.animations[0]);
        pole_walking_NLA = boyMixer1.clipAction(gltf.animations[1]);
        sitting_NLA = boyMixer1.clipAction(gltf.animations[2]);
        start_walking_NLA = boyMixer1.clipAction(gltf.animations[3]);
        walk_cycle_NLA = boyMixer1.clipAction(gltf.animations[4]);

        activeClip = walk_cycle_NLA;
        activeClip.play();

        //#region BOY GUI
        const folder1 = gui.addFolder('boy controls');

        settings = {
            'sit down': function () { switchGLTFAnims(sitting_NLA) },
            'walk cycle': function () { switchGLTFAnims(walk_cycle_NLA) },
            'move position 1': function () { switchGLTFAnims(movePos1_NLA) },
            'pole walking': function () { switchGLTFAnims(pole_walking_NLA) },
            'start walking': function () { switchGLTFAnims(start_walking_NLA) }
        }
        folder1.add(settings, 'sit down');
        folder1.add(settings, 'walk cycle');
        folder1.add(settings, 'move position 1');
        folder1.add(settings, 'pole walking');
        folder1.add(settings, 'start walking');

        //#endregion
        //initTimeline(boyAnimations);
    });
    //#endregion

    //#region LIGHTS

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 20, 0);
    hemiLight.layers.enableAll();
    scene.add(hemiLight);

    //#endregion
}
function switchGLTFAnims(newClip) {
    console.log(newClip);
    newClip.enabled = true;
    newClip.setEffectiveWeight(1);
    newClip.play();
    activeClip.crossFadeTo(newClip, .5, false);

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
    //#region TIMELINE OBJs
    timelineClips.push(
        new timelineObj(
            'move sphere by x', -1,
            [sphereMesh, boyModel],
            function () {
                gsapT1.clear();
                gsapT1.call(function () {
                    if (activeClip != sitting_NLA) { switchGLTFAnims(sitting_NLA) }
                })
                gsapT1.to(sphereMesh.position, { duration: 1, x: sphereMesh.position.x + 1 });
                gsapT1.to(sphereMesh.position, { duration: 1, x: sphereMesh.position.x });
            }
        ),
        new timelineObj(
            'move sphere by y', -1,
            [boxMesh, sphereMesh, boyModel],
            function () {
                gsapT1.clear();
                gsapT1.call(function () {
                    if (activeClip != walk_cycle_NLA) { switchGLTFAnims(walk_cycle_NLA) }
                })
                gsapT1.to(sphereMesh.position, { duration: 1, y: sphereMesh.position.y + 1 });
                gsapT1.to(sphereMesh.position, { duration: 1, y: sphereMesh.position.y });
            }
        ),
        new timelineObj(
            'rotate box by z', -1,
            [boxMesh],
            function () {
                gsapT1.clear();
                gsapT1.to(boxMesh.rotation, { duration: 1, z: boxMesh.rotation.z + 6 });
                gsapT1.to(boxMesh.rotation, { duration: 1, z: boxMesh.rotation.z });
            }
        ),
        new timelineObj(
            'rotate box by z', -1,
            [boxMesh, boyModel],
            function () {
                gsapT1.clear();
                gsapT1.call(function () {
                    if (activeClip != sitting_NLA) { switchGLTFAnims(sitting_NLA) }
                })
                gsapT1.to(boxMesh.rotation, { duration: 1, z: boxMesh.rotation.z + 6 });
                gsapT1.to(boxMesh.rotation, { duration: 1, z: boxMesh.rotation.z });
            }
        ),
    );
    //#endregion

    initNarration();
    initLayers();
    playScene(timelineClips[activeSceneNum], activeSceneNum);

    //#region TL GUI
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
            advanceScene();
        }
    }, 'nextScene');
    //#endregion

    /* gsapT1.timeScale(2);
    gsapT2.timeScale(2);
    gsapT3.timeScale(2); */
}

function advanceScene() {
    cursor.style.display = 'none';
    console.log(`set cursor to none`)
    //console.log(`timelineClips length ${timelineClips.length}`)
    if (activeSceneNum < timelineClips.length - 1) {
        activeSceneNum++;
        swapNarration(allNarration[activeSceneNum].innerHTML);
        playScene(timelineClips[activeSceneNum], activeSceneNum)
    } else {
        activeSceneNum = 0;
        swapNarration(allNarration[activeSceneNum].innerHTML);
        playScene(timelineClips[activeSceneNum], activeSceneNum)
    }
}

function initLayers() {
    scene.traverse(child => {
        if (child instanceof THREE.Mesh) {
            child.layers.disableAll();
        }
    });
}

function playScene(sceneObj, layerNum) {
    console.log(`active scene: ${layerNum} ${sceneObj.name}`);
    //console.log(sceneObj);

    gsapT3.clear();

    // fade out mats
    gsapT3.to(mats[0], { duration: .5, opacity: 0 });

    // assign layers
    gsapT3.call(function () { assignLayers(sceneObj, layerNum) });

    // set repeat and play animations
    gsapT1.repeat(sceneObj.repeat);
    gsapT3.call(function () { sceneObj.playActions() });

    // queue the cursor fade to t2 after t1 has completed
    /* gsapT1.call(function () { */
    gsapT2.call(function () {
        cursor.style.display = 'block'
        console.log(`cursor to block`)
    })
    /* }); */

    // fade in mats
    gsapT3.to(mats[0], { duration: 1, opacity: 1 });
}

function assignLayers(sceneObj, layerNum) {
    // set layer actors
    for (let i = 0; i < sceneObj.actors.length; i++) {
        //console.log(sceneObj.actors[i]);
        sceneObj.actors[i].traverse(function (child) {
            child.layers.set(layerNum);
        });

    }
    camera.layers.set(layerNum);
}



//#endregion

//#region NARRATOR

function initNarration() {
    //get array of all narration, get narrator, swap allNarration[i] with narrator on timer
    allNarration = document.querySelectorAll(".allNarration p");
    swapNarration(allNarration[activeSceneNum].innerHTML);
}

function swapNarration(newText) {
    //get timeline2, clear t2, fade out and then in narration over duration .5s

    let narration = document.querySelector(".narrator p");
    //console.log(`${newText.includes('span') ? 'has' : 'does not have'} span`);
    gsapT2.clear();
    let spans = spliceString(newText, '<span>');
    if (!spans) {
        //if spans is not found
        gsapT2.to(narration, { duration: .5, opacity: 0 });
        gsapT2.call(function () { narration.innerHTML = newText });
        gsapT2.to(narration, { duration: .75, opacity: 1 });
        gsapT2.to(narration, { duration: (newText.length / 25) * 1 });
    } else {
        //if spans[] is returned
        spans.forEach(span => {
            gsapT2.to(narration, { duration: .5, opacity: 0 });
            gsapT2.call(function () { narration.innerHTML = span });
            gsapT2.to(narration, { duration: .75, opacity: 1 });
            /** call redundant timeline function for a forced wait time, 
             * duration ( number of characters / 25 ) * 1.25 
             */
            gsapT2.to(narration, { duration: (span.length / 25) * 1, opacity: 1 });
        });
    }
}

function spliceString(str, substr) {
    let flag = false;
    let indexes = [];
    let spans = [];

    // get index of all spans
    for (let i = 0; i < str.length - substr.length + 1; i++) {
        if (str.substring(i, substr.length + i) == substr) {
            indexes.push(i);
            flag = true;
        }
    }
    //split string into substrings
    for (let i = 0; i < indexes.length; i++) {
        spans.push(str.slice(indexes[i], indexes[i + 1]));
    };
    //console.log(spans);

    return (flag ? spans : false);
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
    if (!mixerLoaded) {
        if (boyMixer1) {
            initTimeline();
            mixerLoaded = true;
            console.log("mixer and timeline loaded");
        }
    } else {
        // Update animation timing
        boyMixer1.setTime(clock.getElapsedTime());
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
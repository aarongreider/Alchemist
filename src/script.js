//#region IMPORT
import './style.css'
//import './checker.png'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { AnimationMixer, BlendingSrcFactor, DstAlphaFactor, Object3D, OneFactor, PCFShadowMap, SkeletonHelper, SrcAlphaFactor, SubtractEquation } from 'three'
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { SelectiveBloomEffect, BloomEffect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
/* import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
 */
import { gsap } from 'gsap/all';
//#endregion

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
const fbxLoader = new FBXLoader();

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

let startButton = document.querySelector('#splash button');
startButton.addEventListener("click", function () {
    console.log('%c starting 3D experience', 'color: lightgreen');
    canBegin = true;
    windVideo.play();
    gsap.to(document.getElementById('splash'), {
        duration: 2, ease: "power2.inOut", opacity: 0, onComplete: function () {
            document.getElementById('splash').style.display = 'none';
        }
    });
});

//#endregion

//#region OBJECT VARIBLES
/** 
 * GLOBAL VARIABLES
 */

// init objects
//const bloomLayer = new THREE.Layers();

let effectComposer, renderPass, bloomPass;
let axesHelper;

let boyAnimParams;
let mats = [];
let gltfModels = [];
let mixers = [];

let windVideo;
let boxMesh, sphereMesh, pointsMesh;
let boyMixer, girlMixer, heartMixer, birdMixer;
let boyAnimations, girlAnimations, heartAnimations, birdAnimations;
let boySkeleton, birdSkeleton, boyModel, girlModel, duneModel, sandWispModel, windWispModel, flowerModel, heartModel, heartPointsModel, birdModel;
let activeClip, pole_walking_NLA, sitting_NLA, start_walking_NLA, movePos1_NLA, walk_cycle_NLA;
let blow_kiss_NLA, spin_NLA;

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
// T1 — handles finite scene/mesh animations
// T1_2 — handles repeating scene/mesh animations
// T2 — handles HTML transitions
// T3 — handles material transitions
let gsapT1 = gsap.timeline({ repeat: 0 });
let gsapT1_2 = gsap.timeline({ repeat: -1 });
let gsapT2 = gsap.timeline({ repeat: 0 });
let gsapT3 = gsap.timeline({ repeat: 0 });

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
    const pointsGeo = new THREE.SphereGeometry(.1, 10, 10);

    //  Textures
    const checkTxt = txtLoader.load(`https://threejsfundamentals.org/threejs/resources/images/checker.png`);
    checkTxt.wrapS = THREE.RepeatWrapping;
    checkTxt.wrapT = THREE.RepeatWrapping;
    checkTxt.repeat.set(10, 10);
    checkTxt.magFilter = THREE.NearestFilter;

    const wispTxt = txtLoader.load(`SandWispTxt2k.png`);
    const wispTxtAlpha = txtLoader.load(`SandWispTxt2k_alpha.png`);

    windVideo = document.getElementById('windVideo');
    const windTxt = new THREE.VideoTexture(windVideo);
    //#endregion

    //#region MATERIALS
    const whiteMat = new THREE.MeshBasicMaterial();
    whiteMat.color = new THREE.Color(0xfefefe);

    const phongMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    mats.push(phongMat);

    const txtMat = new THREE.MeshBasicMaterial({
        map: checkTxt,
        side: THREE.DoubleSide
    });

    const wireMat = new THREE.MeshPhongMaterial({
        wireframe: true,
        opacity: .5,
        transparent: true,
    });
    mats.push(wireMat);

    const sandWispMat = new THREE.MeshBasicMaterial({
        map: wispTxt,
        //color: 0xffffff,
        side: THREE.DoubleSide,
        alphaMap: wispTxtAlpha,
        transparent: true,
    })
    mats.push(sandWispMat);

    const windMat = new THREE.MeshBasicMaterial({
        transparent: true,
        map: windTxt,
        side: THREE.DoubleSide,
        opacity: .25,
        alphaMap: windTxt,
    });
    mats.push(windMat);

    const flowerMat = new THREE.MeshBasicMaterial({
        map: txtLoader.load("flower_diffuse.png"),
        side: THREE.DoubleSide,
        transparent: true,
    });
    mats.push(flowerMat);

    const pointsMat = new THREE.PointsMaterial({
        transparent: true,
        size: .0001,
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

    const wireFrontMat = new THREE.ShaderMaterial({
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader4').textContent,
        side: THREE.DoubleSide,
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

    pointsMesh = new THREE.Points(pointsGeo, pointsMat);
    scene.add(pointsMesh);

    //#endregion

    //#region GLTF

    /**
     * LOAD WISPS GLTF 
     */
    gltfLoader.load(`sandWisp_v1.gltf`, (gltf) => {
        sandWispModel = gltf.scene;

        //set transforms
        sandWispModel.scale.set(2, 2, 2);
        sandWispModel.position.set(-1, 0, -1);
        //console.log(wispModel)

        // assign material and shadow
        sandWispModel.traverse(function (child) {
            if (child.isMesh) {
                //object.receiveShadow = true;
                child.material = sandWispMat;
            }
        });

        // add model to scene
        gltfModels.push(sandWispModel);
        scene.add(sandWispModel);
    });

    gltfLoader.load(`wind_wisp_long1.gltf`, (gltf) => {
        windWispModel = gltf.scene;

        //set transforms
        windWispModel.scale.set(1, 1, 1);
        windWispModel.position.set(0, 0, 0);
        console.log(`%c ${windWispModel}`, `color: #e26f03`)

        // assign material and shadow
        windWispModel.traverse(function (child) {
            if (child.isMesh) {
                //object.receiveShadow = true;
                child.material = windMat;
            }
        });

        // add model to scene
        gltfModels.push(windWispModel);
        scene.add(windWispModel);
    });

    /**
     * LOAD FLOWER GLTF 
     */
    gltfLoader.load(`desert_flower_v4.gltf`, (gltf) => {
        flowerModel = gltf.scene;

        //set transforms
        flowerModel.scale.set(.1, .1, .1);

        // assign material and shadow
        flowerModel.traverse(function (child) {
            if (child.isMesh) {
                if (child.name.includes("flower")) {
                    //console.log("child flower name: " + child.name);
                    child.material = flowerMat;
                } else {
                    child.material = wireMat;
                }
            }
        });

        // add model to scene
        gltfModels.push(flowerModel);
        scene.add(flowerModel);
    });

    /**
    * LOAD HEART GLTF 
    */
    gltfLoader.load(`crystal_heart.gltf`, (gltf) => {
        heartModel = gltf.scene;
        heartModel.name = `heart`;

        //set transforms
        heartModel.scale.set(1, 1, 1);

        //heartPointsModel = new THREE.Points(heartModel, pointsMat);

        // assign material and shadow
        /* heartModel.traverse(function (child) {
            if (child.isMesh) {
                child.material = pointsMat;
            }
        }); */

        // add model to scene
        //gltfModels.push(heartModel);
        gltfModels.push(heartModel);
        scene.add(heartModel);

        // init animation mixer
        heartMixer = new THREE.AnimationMixer(heartModel);
        heartAnimations = gltf.animations;
        mixers.push(heartMixer);

        spin_NLA = heartMixer.clipAction(gltf.animations[0]);
        spin_NLA.play();
    });

    /**
    * LOAD BIRDIE GLTF 
    */
    fbxLoader.load(`birdie_v8.fbx`, function (fbx) {
        birdModel = fbx;
        birdModel.name = `bird`;

        //set transforms
        birdModel.scale.set(.0001, .0001, .0001);

        // assign material and shadow
        /* birdModel.traverse(function (child) {
            if (child.isMesh) {
                child.material = glowMat;
            }
        }); */

        // add model to scene
        //gltfModels.push(birdModel);
        scene.add(birdModel);

        // init animation mixer
        birdMixer = new THREE.AnimationMixer(birdModel);
        birdAnimations = fbx.animations;
        mixers.push(birdMixer);

        birdModel.activeClip = birdMixer.clipAction(fbx.animations[3]);
        birdModel.activeClip.play();
        //let fly_NLA = birdMixer.clipAction(fbx.animations[3]);
        //fly_NLA.play();

        //console.log(fbx.animations);

        //switchGLTFAnims(birdModel, birdMixer.clipAction(fbx.animations[0]))
    });

    /**
    * LOAD BOY GLTF
    */

    gltfLoader.load(`boy_v15.gltf`, (gltf) => {
        boyModel = gltf.scene;
        boyModel.name = `boy`;

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
        //console.log(boyModel)
        //console.log(gltfModels)

        // show rig skeleton
        /* boySkeleton = new THREE.SkeletonHelper(boyModel);
        boySkeleton.visible = true; */
        //scene.add(skeleton);

        // init animation mixer
        boyMixer = new THREE.AnimationMixer(boyModel);
        boyAnimations = gltf.animations;
        mixers.push(boyMixer);

        movePos1_NLA = boyMixer.clipAction(gltf.animations[0]);
        pole_walking_NLA = boyMixer.clipAction(gltf.animations[1]);
        sitting_NLA = boyMixer.clipAction(gltf.animations[2]);
        start_walking_NLA = boyMixer.clipAction(gltf.animations[3]);
        walk_cycle_NLA = boyMixer.clipAction(gltf.animations[4]);

        boyModel.activeClip = walk_cycle_NLA;
        boyModel.activeClip.play();

        //#region BOY GUI
        const folder1 = gui.addFolder('boy controls');

        boyAnimParams = {
            'sit down': function () { switchGLTFAnims(boyModel, sitting_NLA) },
            'walk cycle': function () { switchGLTFAnims(boyModel, walk_cycle_NLA) },
            'move position 1': function () { switchGLTFAnims(boyModel, movePos1_NLA) },
            'pole walking': function () { switchGLTFAnims(boyModel, pole_walking_NLA) },
            'start walking': function () { switchGLTFAnims(boyModel, start_walking_NLA) }
        }
        folder1.add(boyAnimParams, 'sit down');
        folder1.add(boyAnimParams, 'walk cycle');
        folder1.add(boyAnimParams, 'move position 1');
        folder1.add(boyAnimParams, 'pole walking');
        folder1.add(boyAnimParams, 'start walking');

        //#endregion
    });

    /**
    * LOAD GIRL GLTF
    */

    gltfLoader.load(`theGirl_v6.gltf`, (gltf) => {
        girlModel = gltf.scene;

        //set transforms
        girlModel.scale.set(.1, .1, .1);
        girlModel.position.set(-.6, 0, 2);
        girlModel.rotation.set(0, degToRad(170), 0);

        // assign cast shadow and materials
        /* girlModel.traverse(function (child) {
            if (child.isMesh) {
                //object.castShadow = true;
                child.material = txtMat;
            }
        }); */

        // add GIRL to scene
        gltfModels.push(girlModel);
        scene.add(girlModel);
        /* console.log(`girlModel: `);
        console.log(girlModel)
        console.log(`gltfModels[]: `);
        console.log(gltfModels) */

        // init animation mixer
        girlMixer = new THREE.AnimationMixer(girlModel);
        girlAnimations = gltf.animations;
        mixers.push(girlMixer);

        blow_kiss_NLA = girlMixer.clipAction(gltf.animations[0]);
        blow_kiss_NLA.play();
    });
    //#endregion

    //#region LIGHTS

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 20, 0);
    hemiLight.layers.enableAll();
    scene.add(hemiLight);

    //#endregion
}
function switchGLTFAnims(model, newClip) {
    if (model.activeClip != newClip) {
        console.log(`%c ${model.name}: ${newClip._clip.name}`, `color: DarkGoldenRod`);
        newClip.enabled = true;
        newClip.setEffectiveWeight(1);
        newClip.play();
        model.activeClip.crossFadeTo(newClip, .5, false);

        model.activeClip = newClip;
    }
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

/**
 * INIT TIMELINE
 */

//#region GSAP ANIMS
function initTimeline() {
    //#region TIMELINE OBJs
    timelineClips.push(
        new timelineObj(
            'zoom through rocks to flower', 0,
            [flowerModel, boyModel, sandWispModel],
            function () {
                //camera.rotation.x += (Math.PI / 180);
                //camera.rotateOnWorldAxis(new THREE.Vector3(0.0, 1.0, 0.0), 3)

                gsapT1.clear();
                gsapT1.call(function () {
                    switchGLTFAnims(boyModel, sitting_NLA);
                })

                //initial camera pos
                gsapT1.call(function () {
                    let pos;
                    flowerModel.traverse(function (child) {
                        if (child.name.includes("flower")) {
                            pos = child.position;
                            camera.lookAt(pos);
                        }
                    })
                });
                gsapT1.to(camera.position, { duration: .1, z: -1.75 }, `<`);
                gsapT1.to(camera.position, { duration: .1, y: .35 }, `<`);
                gsapT1.to(camera.position, { duration: .1, x: -.75 }, `<`);
                gsapT1.to(camera.position, { duration: 2, x: -.75 }); //stall for 2s
                //gsapT1.call(function () { gsapT1.pause(); });

                //to camera pos
                gsapT1.to(camera.position, { duration: 10, ease: "power2.inOut", z: 21.75 },);
                gsapT1.to(camera.position, { duration: 10, ease: "power2.inOut", x: -1.15 }, `<`);


                // false = fade out | true = custom transition handler
                gsapT1.call(function () { fadeOverride = true });
            }
        ),
        new timelineObj(
            'obscure flower and fade in boy', 0,
            [flowerModel, boyModel, sandWispModel],
            function () {
                gsapT1.clear();
                gsapT1.call(function () {
                    switchGLTFAnims(boyModel, sitting_NLA);
                })
                mats.forEach(mat => {
                    gsapT1.to(mat, { duration: .5, opacity: 0 }, '<');
                });

                gsapT1.to(camera.position, { duration: 2, ease: "power2.inOut", z: 2.5 });
                gsapT1.to(camera.position, { duration: 2, ease: "power2.inOut", x: -.5 }, `<`);
                gsapT1.to(camera.position, { duration: 2, ease: "power2.inOut", y: -.25 }, `<`);

                /* gsapT1.to(camera.rotation, { duration: 2, ease: "power2.inOut", x: -1 });
                gsapT1.to(camera.rotation, { duration: 2, ease: "power2.inOut", y: .5 }, `<`); */
                //gsapT1.to(camera.rotation, { duration: 2, ease: "power2.inOut", z: -1 }, `<`);
                // lerp lookat() function
                let vecFrom = camera.getWorldDirection(new THREE.Vector3());
                let vecTo = new THREE.Vector3(-1, .5, 0);
                let state;
                gsapT1.to({}, {
                    duration: 2, ease: "power2.inOut",
                    onUpdate: function () {
                        state = vecFrom.lerp(vecTo, this.progress());
                        camera.lookAt(state);
                        //console.log(`lookat ` + this.progress());
                    }
                }, `<`);

                gsapT1.to(mats[0], { duration: 1, opacity: 0 });

                mats.forEach(mat => {
                    gsapT1.to(mat, { duration: 1, opacity: 1 }, '<');
                });
            }
        ),
        new timelineObj(
            'fade girl and blow kiss', 0,
            [boyModel, girlModel, axesHelper],
            function () {
                gsapT1.clear();
                gsapT1.call(function () {
                    switchGLTFAnims(boyModel, sitting_NLA);
                });

                // make this fade out girl at some point
                girlModel.traverse(child => {
                    if (child.material) {
                        child.material.transparent = true;
                        gsapT1.to(child.material, { duration: .01, opacity: 0 }, '<');
                    };
                    //console.log(`%c FADE OUT GIRL SCENE 3`, 'color: #00FFE3')
                });

                // set initial camera rotation/position
                gsapT1.to(camera.position, { duration: 0, x: -1.3 }, `<`);
                gsapT1.to(camera.position, { duration: 0, y: .55 }, `<`);
                gsapT1.to(camera.position, { duration: 0, z: 2.55 }, `<`);
                gsapT1.call(function () {
                    camera.lookAt(new THREE.Vector3(.5, .5, 0));
                })

                // filler
                gsapT1.to(sphereMesh.position, { duration: 3, x: sphereMesh.position }); //filler
                gsapT1.to(sphereMesh.position, { duration: 1, x: sphereMesh.position }); //filler

                girlModel.traverse(child => {
                    if (child.material) {
                        child.material.transparent = true;
                        gsapT1.to(child.material, { duration: 3.5, opacity: 1 }, '<');
                    };
                    //console.log(`%c FADE OUT GIRL SCENE 3`, 'color: #00FFE3')
                });
            }
        ),
        new timelineObj(
            'boy turns into wind', -1,
            [windWispModel, boyModel],
            function () {
                gsapT1.clear();
                gsapT1.call(function () {
                    switchGLTFAnims(boyModel, sitting_NLA);
                })
                gsapT1.to(boxMesh.rotation, { duration: 1, z: boxMesh.rotation.z + 6 });
                gsapT1.to(boxMesh.rotation, { duration: 1, z: boxMesh.rotation.z });
            }
        ),
        new timelineObj(
            'heart fades in and rotates', -1,
            [heartModel],
            function () {
                gsapT1.clear();
                gsapT1.call(function () {

                })
                gsapT1.to(camera.position, { duration: 0, x: 0 }, `<`);
                gsapT1.to(camera.position, { duration: 0, y: .55 }, `<`);
                gsapT1.to(camera.position, { duration: 0, z: -2 }, `<`);
                gsapT1.call(function () {
                    camera.lookAt(new THREE.Vector3(0, .5, 0));
                })
                //heart fade in and rotate

            }
        ),
        new timelineObj(
            'bird glides in', 0,
            [birdModel],
            function () {
                gsapT1.clear();
                gsapT1_2.clear();

                gsapT1.to(camera.position, { duration: 0, x: .25 }, `<`);
                gsapT1.to(camera.position, { duration: 0, y: .55 }, `<`);
                gsapT1.to(camera.position, { duration: 0, z: -1 }, `<`);
                gsapT1.call(function () {
                    camera.lookAt(new THREE.Vector3(0, 0, 0));
                })

                // bird flap
                gsapT1_2.call(function () {
                    switchGLTFAnims(birdModel, birdMixer.clipAction(birdAnimations[2]))
                })

                // filler
                gsapT1_2.to(sphereMesh.position, { duration: 5, x: sphereMesh.position }); //filler

                gsapT1_2.call(function () {
                    switchGLTFAnims(birdModel, birdMixer.clipAction(birdAnimations[3]))
                })

                // filler
                gsapT1_2.to(sphereMesh.position, { duration: 3, x: sphereMesh.position }); //filler

                gsapT1_2.call(function () {
                    switchGLTFAnims(birdModel, birdMixer.clipAction(birdAnimations[3]))
                })

                // false = fade out | true = custom transition handler
                gsapT1.call(function () { fadeOverride = true });

            }
        ),
        new timelineObj(
            'camera pans around bird', -1,
            [birdModel, flowerModel, axesHelper,],
            function () {
                gsapT1.clear();
                gsapT1_2.clear();

                gsapT1.to(camera.position, { duration: 0, x: .25 }, `<`);
                gsapT1.to(camera.position, { duration: 0, y: .55 }, `<`);
                gsapT1.to(camera.position, { duration: 0, z: -1 }, `<`);
                gsapT1.call(function () {
                    camera.lookAt(new THREE.Vector3(0, 0, 0));
                })

                flowerModel.position.y = -10;

                //#region bird flap
                gsapT1_2.call(function () {
                    switchGLTFAnims(birdModel, birdMixer.clipAction(birdAnimations[2]))
                })

                // filler
                gsapT1_2.to(sphereMesh.position, { duration: (Math.random() * 5 + 2), x: sphereMesh.position }); //filler

                gsapT1_2.call(function () {
                    switchGLTFAnims(birdModel, birdMixer.clipAction(birdAnimations[3]))
                })

                // filler
                gsapT1_2.to(sphereMesh.position, { duration: (Math.random() * 5 + 1), x: sphereMesh.position }); //filler

                gsapT1_2.call(function () {
                    switchGLTFAnims(birdModel, birdMixer.clipAction(birdAnimations[3]))
                })
                //#endregion


                //camera pan
                //make new object 3d
                //make camera a child of rotObj
                let rotObj = new Object3D();
                scene.add(rotObj);
                rotObj.add(camera);

                gsapT1.to(rotObj.rotation, { duration: 18, ease: "linear", y: 6.28319 });


                // false = fade out | true = custom transition handler
                gsapT1.call(function () { fadeOverride = true });

            }
        ),
        new timelineObj(
            'bird is sand', -1,
            [birdModel],
            function () {
                gsapT1.clear();
                gsapT1_2.clear();

                //init pos
                gsapT1.to(camera.position, { duration: 2, x: .25 }, `<`);
                gsapT1.to(camera.position, { duration: 2, y: .25 }, `<`);
                gsapT1.to(camera.position, {
                    duration: 2, ease: "power2.inOut", z: -.25,
                    onUpdate: function () {
                        camera.lookAt(new THREE.Vector3(0, 0, 0));
                    }
                }, `<`);


                //#region bird flap
                gsapT1_2.call(function () {
                    switchGLTFAnims(birdModel, birdMixer.clipAction(birdAnimations[2]))
                })

                // filler
                gsapT1_2.to(sphereMesh.position, { duration: (Math.random() * 5 + 2), x: sphereMesh.position }); //filler

                gsapT1_2.call(function () {
                    switchGLTFAnims(birdModel, birdMixer.clipAction(birdAnimations[3]))
                })

                // filler
                gsapT1_2.to(sphereMesh.position, { duration: (Math.random() * 5 + 1), x: sphereMesh.position }); //filler

                gsapT1_2.call(function () {
                    switchGLTFAnims(birdModel, birdMixer.clipAction(birdAnimations[3]))
                })
                //#endregion

                //#region rejected points bird
                // bird to points
                /* let birdPointsMat = new THREE.PointsMaterial()
                let birdGeo = birdModel.getObjectByName('Raven Poly Art_01 - Default_0');
                let birdPoints = new THREE.Points(birdGeo, birdPointsMat) */

                /* gsapT1.call(function () {
                    birdModel.traverse(child => {
                        if (child.isMesh) {
                            child.material = material;
                        };
                    });
                }); */
                //#endregion

                //#region POINTS
                let vertices = [];

                for (let i = 0; i < 5000; i++) {
                    const x = THREE.MathUtils.randFloatSpread(1);
                    const y = THREE.MathUtils.randFloatSpread(1);
                    const z = THREE.MathUtils.randFloatSpread(1);

                    vertices.push(x, y, z);
                }

                /* const buffGeometry = new THREE.BufferGeometry();
                buffGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                buffGeometry.attributes.position.needsUpdate = true; */

                const material = new THREE.PointsMaterial({
                    color: 0x888888,
                    size: .0025,
                    transparent: true,
                    opacity: 0,
                });
                /* const points = new THREE.Points(buffGeometry, material); */


                let points = new THREE.Points(
                    new THREE.BufferGeometry().setAttribute('position',
                        new THREE.Float32BufferAttribute(vertices, 3)), material);

                scene.add(points);
                points.layers.set(activeSceneNum);


                class particleSystem {
                    constructor(_geometry, _uniforms, _vertices) {
                        this._geometry = geometry;
                        this._vertices = vertices;

                        this._material = new THREE.ShaderMaterial({
                            uniforms: _uniforms,
                            vertexShader: document.getElementById(`vertexParticleShader`),
                            fragmentShader: document.getElementById(`fragmentSimulation`),
                        });

                        this._points = new THREE.Points(_geometry, _material);
                        this.updateGeometry()
                    }

                    updateGeometry() {

                        this._geometry.setAttribute('position', new THREE.Float32BufferAttribute(this._vertices, 3));
                        this._geometry.attributes.position.needsUpdate = true;
                    }

                    updateParticles() {

                    }
                }
                //#endregion

                //camera pan
                let rotObj = new Object3D();
                scene.add(rotObj);
                rotObj.add(camera);

                gsapT1.to(rotObj.rotation, { duration: 18, ease: "linear", y: 6.28319 });
                gsapT1.to(material, { duration: 1, opacity: 1 }, '<');

                //move particles in random direction and update buffer
                //console.log(vertices);

                /* gsapT1.to({}, {
                    duration: 5, ease: "power2.inOut",
                    onUpdate: function () {
                        //fromVal.lerp(toVal, this.progress());
                        vertices.forEach(vertex => {
                            vertex += Math.random();
                        });
                        buffGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                        buffGeometry.attributes.position.needsUpdate = true;
                        console.log(this.progress());
                    }
                }, `<`); */
                gsapT1.to({}, {
                    duration: 5, ease: "power2.inOut",
                    onUpdate: function () {
                        scene.remove(points);
                        //fromVal.lerp(toVal, this.progress());
                        vertices = [];

                        for (let i = 0; i < 5000; i++) {
                            const x = THREE.MathUtils.randFloatSpread(1);
                            const y = THREE.MathUtils.randFloatSpread(1);
                            const z = THREE.MathUtils.randFloatSpread(1);

                            vertices.push(x, y, z);
                        }

                        points = new THREE.Points(
                            new THREE.BufferGeometry().setAttribute('position',
                                new THREE.Float32BufferAttribute(vertices, 3)), material);

                        scene.add(points);
                        points.layers.set(activeSceneNum);
                        console.log(this.progress());
                    }
                }, `<`);
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
    //console.log(`%c set cursor to none`, `#fefefe`)
    //console.log(`timelineClips length ${timelineClips.length}`)
    if (activeSceneNum < timelineClips.length - 1) {
        activeSceneNum++;
        //handle <p> swap for narration
        swapNarration(allNarration[activeSceneNum].innerHTML);
        //handle fade out, layers, and cursor
        playScene(timelineClips[activeSceneNum], activeSceneNum)
    } else {
        activeSceneNum = 0;
        swapNarration(allNarration[activeSceneNum].innerHTML);
        playScene(timelineClips[activeSceneNum], activeSceneNum)
    }
}

function playScene(sceneObj, layerNum) {
    console.log(`%c active scene: ${layerNum} ${sceneObj.name}`, 'color: #1BA5D8');
    //console.log(sceneObj);

    gsapT3.clear();
    //gsapT1.progress(0);
    gsapT1.clear();

    // fade out mats
    console.log(`%c playScene fade mats`, `color: #B5B5B5`)
    if (!fadeOverride) {
        mats.forEach(mat => {
            gsapT3.to(mat, { duration: .5, opacity: 0 }, '<');
        });
    }
    // fade out GLTF mats
    gltfModels.forEach(model => {
        model.traverse(child => {
            if (child.material) {
                child.material.transparent = true;
                gsapT3.to(child.material, { duration: .5, opacity: 0 }, '<');
            };
        });
    });

    // assign layers
    gsapT3.call(function () { assignLayers(sceneObj, layerNum) });

    // set repeat and play animations
    gsapT1.repeat(sceneObj.repeat);

    gsapT3.call(function () {
        fadeOverride = false;
        sceneObj.playActions();
    });

    // queue the cursor fade to t2 after t1 has completed
    /* gsapT1.call(function () { */
    gsapT2.call(function () {
        cursor.style.display = 'block'
        //console.log(`%c cursor to block`, `#fefefe`);
    })
    /* }); */

    // fade in mats
    /**
     * TODO: assign mats via initial parameters, rather than uniform values
     */
    mats.forEach(mat => {
        gsapT3.to(mat, { duration: 1, opacity: 1 }, '<');
    });
    // fade in GLTF mats
    gltfModels.forEach(model => {
        model.traverse(child => {
            if (child.material) {
                child.material.transparent = true;
                gsapT3.to(child.material, { duration: .75, opacity: 1 }, '<');
            };
        });
    });
}

function initLayers() {
    scene.traverse(child => {
        if (child instanceof THREE.Mesh) {
            child.layers.disableAll();
        }
    });
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

function degToRad(deg) {
    return (deg * (Math.PI / 180))
}
//#endregion

//#region NARRATOR

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
function initNarration() {
    //get array of all narration, get narrator, swap allNarration[i] with narrator on timer
    allNarration = document.querySelectorAll(".allNarration p");
    swapNarration(allNarration[activeSceneNum].innerHTML);
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
    //wispModel.rotation.x = Math.sin(clock.getElapsedTime());

    // init GSAP only when models are loaded
    if (!mixerLoaded) {
        if (canBegin && boyMixer && sandWispModel && flowerModel && birdMixer) {
            initTimeline();
            mixerLoaded = true;
            console.log(sandWispModel);
            console.log(`%c mixer and timeline loaded`, 'color: #B5B5B5');

        }
    } else {
        // Update animation timing
        //console.log(mixers)
        for (let i = 0; i < mixers.length; i++) {
            mixers[i].setTime(clock.getElapsedTime());
        }
        //boyMixer.setTime(clock.getElapsedTime());
        //girlMixer.setTime(clock.getElapsedTime());
        sandWispModel.rotation.y = clock.getElapsedTime();
    }

    //camera.rotation.y = clock.getElapsedTime();
    //camera.rotation.x = clock.getElapsedTime();
    //camera.rotation.z = clock.getElapsedTime();
    //#endregion



    // Update stats
    stats.update();

    // Update Orbital Controls

    if (!isRotating) { controls.update(); }

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
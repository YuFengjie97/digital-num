import { abs, assign, attribute, cos, cross, dot, float, floor, Fn, fwidth, hash, hue, instancedArray, instanceIndex, log, mat2, mat3, max, min, mix, mod, mx_noise_float, mx_noise_vec3, mx_rotate3d, normalLocal, normalView, PI, positionLocal, pow, sin, smoothstep, sqrt, step, time, transformedNormalView, TWO_PI, uniform, uv, varying, vec3, vec4 } from "three/tsl"
import * as THREE from "three/webgpu"

import {renderer, scene} from '@/world/scene'
import { FontLoader, TextGeometry } from "three/examples/jsm/Addons.js";
import { emitter } from "@/utils/emitter";
import { gui } from "@/utils/guiPane";


export default async function Digital(){
  const loader = new FontLoader();
  const url = import.meta.env.BASE_URL + 'font/Digital_Regular.json'
  const font = await loader.loadAsync( url );
  const fontSize = .2
  const fontDepth = .04
  const geo0 = new TextGeometry( '0', {
    font: font,
    size: fontSize,
    depth: fontDepth,
    curveSegments: 12
  } );
  const geo1 = new TextGeometry( '1', {
    font: font,
    size: fontSize,
    depth: fontDepth,
    curveSegments: 12
  } );

  const COUNT = 20000
  const gap = uniform(.3)
  const rScale = uniform(.06)
  const speed = uniform(.1)


  const posBuffer = instancedArray(COUNT, 'vec3')
  const velBuffer = instancedArray(COUNT, 'vec3')
  const stateBuffer = instancedArray(COUNT, 'float')

  const colNode = Fn(() => {
    const idx = float(instanceIndex)
    const state = stateBuffer.element(idx)
    const c = mix(vec3(0,2,0), vec3(0,-.4,0), state.oneMinus())
    // const c = vec3(state, 0, 0)
    // const c = hue(vec3(1,0,0), state.mul(2))
    return c
  })()

  const lookCenter = Fn(([pos, vel]: [THREE.Node<'vec3'>, THREE.Node<'vec3'>]) => {
    let up = vec3(0,1,0)
    // const dir = mx_noise_vec3(seed.mul(.1).add(time.mul(1.3))).normalize()
    const dir = pos.normalize()
    const right = vel
    up = cross(right, dir).normalize()
    return mat3(right, up, dir)
  })


  const mat0 = new THREE.MeshBasicNodeMaterial()
  mat0.positionNode = Fn(() => {
    const idx = float(instanceIndex)
    const pos = posBuffer.element(idx)
    const vel = velBuffer.element(idx)
    const state = stateBuffer.element(idx)
    const show = step(.5, state).oneMinus()
    return lookCenter(pos, vel).mul(show.mul(positionLocal)).add(pos)
  })()
  mat0.colorNode = colNode

  const mat1 = new THREE.MeshBasicNodeMaterial()
  mat1.positionNode = Fn(() => {
    const idx = float(instanceIndex)
    const pos = posBuffer.element(idx)
    const vel = velBuffer.element(idx)
    const state = stateBuffer.element(idx)
    const show = step(.5, state)
    return lookCenter(pos, vel).mul(show.mul(positionLocal)).add(pos)
  })()
  mat1.colorNode = colNode




  const updatePos = Fn(() => {
    const idx = float(instanceIndex)

    const totalLength = idx.mul(gap)

    const r = sqrt(totalLength.mul(rScale))

    const ang = totalLength.div(r)

    const circleId = floor(r.div(rScale))

    const x = cos(ang.add(time.mul(speed))).mul(r)
    const z = sin(ang.add(time.mul(speed))).mul(r)
    const y = float(0.0)
    const pos = vec3(x, y, z).toVar()

    const rotationAngle = sin(circleId.mul(234.34)).mul(4444)

    const posRaw = posBuffer.element(idx)
    const posNew = mx_rotate3d(pos, rotationAngle, vec3(1).normalize())
    const vel = posNew.sub(posRaw).normalize()
    velBuffer.element(idx).assign(vel)

    posBuffer.element(idx).assign(posNew)



    const state = hash(idx.mul(33.14).add(time.mul(10)))
    stateBuffer.element(idx).assign(state)

  })().compute(COUNT)

  emitter.on('animate', () => {
    renderer.compute(updatePos)
  })

  const ins0 = new THREE.InstancedMesh(geo0, mat0, COUNT)
  const ins1 = new THREE.InstancedMesh(geo1, mat1, COUNT)
  scene.add(ins0)
  scene.add(ins1)

  gui.add(rScale, 'value', .01, .2, .01).name('rScale')
  gui.add(gap, 'value', .3, 1.5, .01).name('gap')
  gui.add(speed, 'value', .01, 2, .01).name('speed')
}
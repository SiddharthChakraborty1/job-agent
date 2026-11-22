import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { algorithms } from '../data'
import { PHASES } from '../data/types'

/** Soft radial glow texture, generated once. */
function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.2, 'rgba(255,255,255,0.55)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Shorter names for the map; the hover/tap card shows the full name. */
const SHORT: Record<string, string> = {
  'linked-list-ops': 'In-place Reversal',
  stack: 'Stack',
  'fast-slow': 'Fast & Slow',
  'graph-traversal': 'Graph BFS / DFS',
  'topological-sort': 'Topo Sort',
  dijkstra: 'Dijkstra',
  heap: 'Heap / Top-K',
  'dp-1d': '1D DP',
  'dp-2d': '2D DP',
  bits: 'Bits',
}

/** Learning flows left → right by phase; nodes in a phase sit on a ring around that x. */
function layout() {
  const byPhase = new Map<number, typeof algorithms>()
  algorithms.forEach((a) => byPhase.set(a.phase, [...(byPhase.get(a.phase) ?? []), a]))
  const pos = new Map<string, THREE.Vector3>()
  for (const [phase, list] of byPhase) {
    const x = (phase - 3) * 3.3
    const r = 1.1 + list.length * 0.22
    list.forEach((a, i) => {
      const t = (i / list.length) * Math.PI * 2 + phase * 0.9
      pos.set(a.id, new THREE.Vector3(x + Math.sin(t * 2) * 0.55, Math.cos(t) * r, Math.sin(t) * r))
    })
  }
  return pos
}

export function Constellation() {
  const mountRef = useRef<HTMLDivElement>(null)
  const labelsRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const navigate = useNavigate()
  const navRef = useRef(navigate)
  navRef.current = navigate

  useEffect(() => {
    const mount = mountRef.current!
    const labelLayer = labelsRef.current!
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
    camera.position.set(0, 0.6, 15)

    // frame: placement/orientation for the viewport; world: animated rotation
    const frame = new THREE.Group()
    const world = new THREE.Group()
    frame.add(world)
    scene.add(frame)

    // Starfield
    const starGeo = new THREE.BufferGeometry()
    const STARS = window.innerWidth < 700 ? 600 : 1400
    const sp = new Float32Array(STARS * 3)
    for (let i = 0; i < STARS; i++) {
      const r = 30 + Math.random() * 50
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      sp.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)], i * 3)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3))
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0x9fb4d9, size: 0.12, transparent: true, opacity: 0.6, depthWrite: false }),
    )
    scene.add(stars)

    // Nodes
    const glow = glowTexture()
    const positions = layout()
    const nodes: {
      id: string
      core: THREE.Mesh
      halo: THREE.Sprite
      hit: THREE.Mesh
      base: number
      label: HTMLDivElement
      w: number
    }[] = []
    const hitMeshes: THREE.Mesh[] = []
    const coreGeo = new THREE.SphereGeometry(1, 24, 24)
    const hitGeo = new THREE.SphereGeometry(1, 8, 8)
    const hitMat = new THREE.MeshBasicMaterial({ visible: false })

    labelLayer.innerHTML = ''
    for (const a of algorithms) {
      const color = new THREE.Color(PHASES[a.phase].color)
      const q = a.groups.reduce((n, g) => n + g.questions.length, 0)
      const base = 0.13 + Math.min(q, 25) * 0.007
      const p = positions.get(a.id)!

      const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color }))
      core.scale.setScalar(base)
      core.position.copy(p)
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
      )
      halo.scale.setScalar(base * 9)
      halo.position.copy(p)
      const hit = new THREE.Mesh(hitGeo, hitMat)
      hit.scale.setScalar(0.55)
      hit.position.copy(p)
      hit.userData.id = a.id
      world.add(core, halo, hit)
      hitMeshes.push(hit)

      const label = document.createElement('div')
      label.className = 'node-label'
      label.textContent = SHORT[a.id] ?? a.name
      label.style.setProperty('--c', PHASES[a.phase].color)
      labelLayer.appendChild(label)
      nodes.push({ id: a.id, core, halo, hit, base, label, w: 0 })
    }

    // Prerequisite edges (gradient lines) + travelling pulses
    const edgePts: number[] = []
    const edgeCols: number[] = []
    const edges: [THREE.Vector3, THREE.Vector3, THREE.Color][] = []
    for (const a of algorithms) {
      for (const pre of a.prereqs) {
        const from = positions.get(pre)
        const to = positions.get(a.id)
        const fromAlgo = algorithms.find((x) => x.id === pre)
        if (!from || !to || !fromAlgo) continue
        const c1 = new THREE.Color(PHASES[fromAlgo.phase].color)
        const c2 = new THREE.Color(PHASES[a.phase].color)
        edgePts.push(from.x, from.y, from.z, to.x, to.y, to.z)
        edgeCols.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b)
        edges.push([from, to, c2])
      }
    }
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePts, 3))
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(edgeCols, 3))
    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.28, depthWrite: false }),
    )
    world.add(lines)

    const pulseGeo = new THREE.BufferGeometry()
    const pulsePos = new Float32Array(edges.length * 3)
    const pulseCol = new Float32Array(edges.length * 3)
    edges.forEach((e, i) => pulseCol.set([e[2].r, e[2].g, e[2].b], i * 3))
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3))
    pulseGeo.setAttribute('color', new THREE.BufferAttribute(pulseCol, 3))
    const pulses = new THREE.Points(
      pulseGeo,
      new THREE.PointsMaterial({ size: 0.28, map: glow, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    world.add(pulses)
    const offsets = edges.map(() => Math.random())

    // Spread node positions (not the scene scale, which would squash the spheres)
    const basePos = new Map([...positions].map(([id, v]) => [id, v.clone()]))
    const linePos = lineGeo.attributes.position as THREE.BufferAttribute
    const stretch = (sx: number, sy: number) => {
      for (const [id, v] of positions) {
        const b = basePos.get(id)!
        v.set(b.x * sx, b.y * sy, b.z)
      }
      for (const n of nodes) {
        const v = positions.get(n.id)!
        n.core.position.copy(v)
        n.halo.position.copy(v)
        n.hit.position.copy(v)
      }
      edges.forEach(([a, b], i) => {
        linePos.setXYZ(i * 2, a.x, a.y, a.z)
        linePos.setXYZ(i * 2 + 1, b.x, b.y, b.z)
      })
      linePos.needsUpdate = true
      lineGeo.computeBoundingSphere()
    }

    // Sizing
    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      const portrait = w / h < 0.9
      if (portrait) {
        // phases flow top -> bottom on tall screens
        frame.rotation.z = -Math.PI / 2
        frame.position.set(0, 0, 0)
        // local y becomes screen x after the rotation: widen each phase's ring so names separate
        stretch(1.15, 1.6)
        camera.position.z = 26
      } else {
        // leave the left side free for the hero text on wide screens
        frame.rotation.z = 0
        stretch(1, 1)
        const wide = w >= 1000
        frame.position.set(wide ? 4.6 : 0, wide ? -0.4 : -1.2, 0)
        camera.position.z = wide ? 15.5 : 19
      }
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    // Pointer: parallax + hover + click
    const pointer = new THREE.Vector2(10, 10)
    const target = { x: 0, y: 0 }
    const raycaster = new THREE.Raycaster()
    let hoverId: string | null = null
    let downAt = { x: 0, y: 0 }

    const toNdc = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1
    }
    const pick = () => {
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(hitMeshes)[0]
      return (hit?.object.userData.id as string | undefined) ?? null
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      toNdc(e)
      target.x = pointer.x * 0.35
      target.y = pointer.y * 0.18
      const id = pick()
      if (id !== hoverId) {
        hoverId = id
        setHovered(id)
        renderer.domElement.style.cursor = id ? 'pointer' : 'grab'
      }
    }
    const onDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return
      toNdc(e)
      const id = pick()
      if (e.pointerType === 'mouse') {
        if (id) navRef.current(`/a/${id}`)
        return
      }
      // touch: first tap selects (shows the card), second tap on the same node opens it
      if (id && id === hoverId) navRef.current(`/a/${id}`)
      else {
        hoverId = id
        setHovered(id)
      }
    }
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      pointer.set(10, 10)
      hoverId = null
      setHovered(null)
    }
    const el = renderer.domElement
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointerleave', onLeave)

    // Only animate while visible
    let visible = true
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
    io.observe(mount)

    const v = new THREE.Vector3()
    const clock = new THREE.Clock()
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!visible) return
      const t = clock.getElapsedTime()
      const sway = reduceMotion ? 0 : Math.sin(t * 0.12) * 0.38
      const bob = reduceMotion ? 0 : Math.sin(t * 0.15) * 0.08
      world.rotation.y += (target.x + sway - world.rotation.y) * 0.04
      world.rotation.x += (-target.y + bob - world.rotation.x) * 0.03
      stars.rotation.y = t * 0.004

      edges.forEach(([a, b], i) => {
        const k = reduceMotion ? 0.5 : (offsets[i] + t * 0.18) % 1
        pulsePos[i * 3] = a.x + (b.x - a.x) * k
        pulsePos[i * 3 + 1] = a.y + (b.y - a.y) * k
        pulsePos[i * 3 + 2] = a.z + (b.z - a.z) * k
      })
      pulseGeo.attributes.position.needsUpdate = true

      const w = mount.clientWidth
      const h = mount.clientHeight
      for (const n of nodes) {
        const isHover = n.id === hoverId
        const s = n.base * (isHover ? 1.8 : 1 + (reduceMotion ? 0 : Math.sin(t * 2 + n.base * 40) * 0.06))
        n.core.scale.setScalar(n.core.scale.x + (s - n.core.scale.x) * 0.2)
        n.halo.scale.setScalar(n.core.scale.x * 9)

        n.core.getWorldPosition(v)
        const depth = THREE.MathUtils.clamp((v.z + 4) / 8, 0, 1) // 0 = far, 1 = near
        v.project(camera)
        const y = (-v.y * 0.5 + 0.5) * h
        if (!n.w) n.w = n.label.offsetWidth
        const half = n.w / 2 + 4
        const x = THREE.MathUtils.clamp((v.x * 0.5 + 0.5) * w, half, w - half) // keep names on screen
        n.label.style.transform = `translate(${x}px, ${y}px) translate(-50%, 14px)`
        n.label.style.opacity = isHover ? '1' : String(0.3 + depth * 0.6)
        n.label.style.zIndex = isHover ? '10' : String(Math.round(depth * 9))
        n.label.classList.toggle('is-hover', isHover)
      }
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointerleave', onLeave)
      scene.traverse((o) => {
        const obj = o as THREE.Mesh
        obj.geometry?.dispose()
        const m = obj.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m?.dispose()
      })
      glow.dispose()
      renderer.dispose()
      el.remove()
    }
  }, [])

  const info = hovered ? algorithms.find((a) => a.id === hovered) : null

  return (
    <div className="constellation">
      <div ref={mountRef} className="constellation-canvas" />
      <div ref={labelsRef} className="constellation-labels" aria-hidden />
      <div className={`constellation-card ${info ? 'show' : ''}`} aria-live="polite">
        {info && (
          <>
            <span className="pill" style={{ ['--c' as string]: PHASES[info.phase].color }}>
              {PHASES[info.phase].name}
            </span>
            <strong>{info.name}</strong>
            <p>{info.tagline}</p>
            <Link className="card-open" to={`/a/${info.id}`}>
              Open {info.name} →
            </Link>
            <span className="muted hint-mouse">Click the node to open</span>
            <span className="muted hint-touch">Tap the node again to open</span>
          </>
        )}
      </div>
    </div>
  )
}

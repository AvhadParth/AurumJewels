import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// 1. Ultra-Snappy Smooth Scroll (0.7s duration for 60fps response across mobile & desktop)
const lenis = new Lenis({
  duration: 0.7,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  touchMultiplier: 1.2,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// 2. High-Performance Three.js WebGL Scene Setup
const canvas = document.getElementById('coin-canvas');

const scene = new THREE.Scene();

// Camera setup (Focal plane aligned to viewport center)
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 7.5);

// Adaptive Pixel Ratio Cap (1.15 on mobile, 1.4 on desktop to guarantee zero GPU stutter)
const getAdaptivePixelRatio = () => Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.15 : 1.4);

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(getAdaptivePixelRatio());
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;

// Freeze shadow map updates after initial load to avoid per-frame shadow map recalculation lag!
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;

// 3. Balanced Moderate Studio Lighting Engine
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffebd8, 2.0);
scene.add(hemiLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff8ee, 3.5);
keyLight.position.set(4, 6, 7);
keyLight.castShadow = true;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 2.2);
fillLight.position.set(-5, 3, -4);
scene.add(fillLight);

const bounceLight = new THREE.DirectionalLight(0xffede4, 1.5);
bounceLight.position.set(0, -5, 4);
scene.add(bounceLight);

const pointLight = new THREE.PointLight(0xffffff, 2.5, 20);
pointLight.position.set(0, 1.5, 5);
scene.add(pointLight);

// 4. Generate Studio Environment Map for Moderate Metallic Reflections
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const envScene = new THREE.Scene();
envScene.background = new THREE.Color(0xf4eee7);
const envLight1 = new THREE.DirectionalLight(0xffffff, 3.0);
envLight1.position.set(1, 1, 1);
envScene.add(envLight1);
const envLight2 = new THREE.DirectionalLight(0xfff5ea, 3.0);
envLight2.position.set(-1, -1, -1);
envScene.add(envLight2);

const envMap = pmremGenerator.fromScene(envScene).texture;
scene.environment = envMap;

// 5. Responsive Scale Logic for Mobile, Tablet, Laptop & Desktop
function getResponsiveScale() {
  const w = window.innerWidth;
  if (w < 480) return 0.72;
  if (w < 768) return 0.88;
  if (w < 1024) return 1.08;
  return 1.25;
}

// Load User's Custom ring.glb 3D Model with Perfect Pivot Alignment
let ringGroup = new THREE.Group();
scene.add(ringGroup);

let loadedRingModel = null;
const ringMaterials = [];

const loader = new GLTFLoader();
loader.load(
  '/models/ring.glb',
  (gltf) => {
    const model = gltf.scene;
    loadedRingModel = model;

    // Calculate exact bounding box to center geometry perfectly at origin
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -center.y, -center.z);

    const size = box.getSize(new THREE.Vector3());

    // Traverse ring model — keep native materials with balanced envMap intensity
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        if (child.material) {
          if (child.material.envMapIntensity !== undefined) {
            child.material.envMapIntensity = 1.4;
          }
          child.material.needsUpdate = true;
          ringMaterials.push(child.material);
        }
      }
    });

    // Scale ring model appropriately for viewport
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetScale = getResponsiveScale() / maxDim;
    model.scale.set(targetScale, targetScale, targetScale);

    // Initial 3D ring position
    model.rotation.x = 0.3;

    ringGroup.add(model);
    ringGroup.position.set(0, 0.6, 0);
    ringGroup.rotation.set(0.3, 0, 0);

    // Freeze static shadow maps once after load
    renderer.shadowMap.needsUpdate = true;

    setupScrollAnimations();
    setupCustomizerControls();
    ScrollTrigger.refresh();
  },
  undefined,
  (error) => {
    console.error('Error loading ring.glb model:', error);
    createFallbackRing();
  }
);

let fallbackBandMesh = null;

function createFallbackRing() {
  const bandGeo = new THREE.TorusGeometry(1.2, 0.16, 32, 100);
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0xc48b78,
    metalness: 0.95,
    roughness: 0.14,
    envMapIntensity: 1.4
  });
  fallbackBandMesh = new THREE.Mesh(bandGeo, bandMat);

  const gemGeo = new THREE.OctahedronGeometry(0.55, 2);
  const gemMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.96,
    ior: 2.417
  });
  const fallbackGem = new THREE.Mesh(gemGeo, gemMat);
  fallbackGem.position.set(0, 1.35, 0);

  ringGroup.add(fallbackBandMesh);
  ringGroup.add(fallbackGem);
  ringMaterials.push(bandMat);

  ringGroup.position.set(0, 0.6, 0);
  ringGroup.rotation.set(0.3, 0, 0);
  renderer.shadowMap.needsUpdate = true;
  setupScrollAnimations();
  setupCustomizerControls();
  ScrollTrigger.refresh();
}

// 6. Live Precious Metal Swatches Logic
let currentMetal = 'rose-gold';

const metalConfig = {
  'rose-gold': { color: '#c48b78', label: '18K Rose Gold', priceAdd: 0 },
  'yellow-gold': { color: '#e6ca65', label: '18K Yellow Gold', priceAdd: 500 },
  'platinum': { color: '#e2e8f0', label: 'Platinum', priceAdd: 2200 }
};

function setupCustomizerControls() {
  const metalBtns = document.querySelectorAll('[data-metal]');

  metalBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      metalBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMetal = btn.getAttribute('data-metal');
      updateRingMetalAndCard();
    });
  });
}

function updateRingMetalAndCard() {
  const metal = metalConfig[currentMetal];

  // Update Three.js Metal Materials
  ringMaterials.forEach((mat) => {
    if (mat.color) {
      gsap.to(mat.color, {
        r: new THREE.Color(metal.color).r,
        g: new THREE.Color(metal.color).g,
        b: new THREE.Color(metal.color).b,
        duration: 0.4
      });
    }
  });

  // Update Card Product Specs & Price
  const basePrice = 16800;
  const totalPrice = basePrice + metal.priceAdd;
  const formattedPrice = '$' + totalPrice.toLocaleString() + ' USD';

  const titleEl = document.getElementById('custom-ring-title');
  const priceEl = document.getElementById('custom-ring-price');
  const descEl = document.getElementById('custom-ring-desc');
  const specMetalEl = document.getElementById('spec-metal');
  const buyBtnEl = document.getElementById('custom-buy-btn');

  if (titleEl) titleEl.textContent = `The ${metal.label} Solitaire`;
  if (priceEl) priceEl.innerHTML = `${formattedPrice} <span class="currency">USD</span>`;
  if (descEl) descEl.textContent = `Hand-forged in ${metal.label} with a 3.0 Carat VVS1 Cushion Cut Diamond. Features a cathedral setting and hand-engraved interior band.`;
  if (specMetalEl) specMetalEl.textContent = metal.label;
  if (buyBtnEl) buyBtnEl.textContent = `ACQUIRE NOW — ${formattedPrice}`;
}

// 7. GSAP ScrollTriggers: Synchronized Dual-Axis Rotation
function setupScrollAnimations() {
  const mainTL = gsap.timeline({
    scrollTrigger: {
      trigger: '#scroll-experience',
      start: 'top top',
      end: 'bottom bottom',
      pin: '.canvas-wrapper',
      pinSpacing: false,
      scrub: 0.2,
    }
  });

  const productPanel = document.getElementById('product-reveal-panel');

  ringGroup.position.set(0, 0.6, 0);
  ringGroup.rotation.set(0.3, 0, 0);

  const targetY = window.innerWidth < 768 ? 1.15 : 1.30;

  mainTL
    .fromTo(ringGroup.position, { y: 0.6 }, { y: 0, ease: 'none', duration: 0.75 }, 0)
    .to(ringGroup.rotation, { y: Math.PI * 4, ease: 'none', duration: 0.75 }, 0)
    .to(ringGroup.rotation, { x: Math.PI * 2 + 0.3, ease: 'none', duration: 0.75 }, 0)
    
    .to(ringGroup.position, { y: targetY, ease: 'power2.out', duration: 0.25 }, 0.75)
    .to(ringGroup.rotation, { x: 0.3, y: Math.PI * 4, ease: 'power2.out', duration: 0.25 }, 0.75)
    
    .to(productPanel, { 
      opacity: 1, 
      scale: 1, 
      pointerEvents: 'auto', 
      ease: 'power2.out', 
      duration: 0.25,
      onStart: () => productPanel.classList.add('active'),
      onReverseComplete: () => productPanel.classList.remove('active')
    }, 0.75);

  const getGapWidth = () => Math.min(window.innerWidth * 0.35, 450);

  const lines = document.querySelectorAll('.poetry-line');
  lines.forEach((line) => {
    const gap = line.querySelector('.dynamic-gap');
    if (!gap) return;

    const lineTL = gsap.timeline({
      scrollTrigger: {
        trigger: line,
        start: 'top 82%',
        end: 'bottom 18%',
        scrub: 0.2,
      }
    });

    lineTL
      .to(gap, { width: getGapWidth, ease: 'power2.out' })
      .to(gap, { width: 0, ease: 'power2.in' });
  });
}

// 8. Custom Glassmorphism Maison Toast Notification System
function showMaisonToast(badge, title, message, icon = '❖') {
  const container = document.getElementById('maison-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'maison-toast';

  toast.innerHTML = `
    <div class="toast-icon-box">${icon}</div>
    <div class="toast-content">
      <span class="toast-badge">${badge}</span>
      <h4 class="toast-title">${title}</h4>
      <p class="toast-message">${message}</p>
    </div>
    <button class="toast-close-btn" aria-label="Close Toast">✕</button>
    <div class="toast-progress-bar"></div>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('active');
    const bar = toast.querySelector('.toast-progress-bar');
    if (bar) bar.style.width = '0%';
  });

  const closeToast = () => {
    toast.classList.remove('active');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  };

  const closeBtn = toast.querySelector('.toast-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeToast);

  setTimeout(closeToast, 3500);
}

// 9. Interactive Event Listeners & Custom Toast Triggers
const openConciergeBtn = document.getElementById('open-concierge');
const heroBookBtn = document.getElementById('hero-book-btn');
const closeConciergeBtn = document.getElementById('close-concierge');
const drawerOverlay = document.getElementById('drawer-overlay');

if (openConciergeBtn && drawerOverlay) {
  openConciergeBtn.addEventListener('click', () => drawerOverlay.classList.add('active'));
}
if (heroBookBtn && drawerOverlay) {
  heroBookBtn.addEventListener('click', () => drawerOverlay.classList.add('active'));
}
if (closeConciergeBtn && drawerOverlay) {
  closeConciergeBtn.addEventListener('click', () => drawerOverlay.classList.remove('active'));
}
if (drawerOverlay) {
  drawerOverlay.addEventListener('click', (e) => {
    if (e.target === drawerOverlay) drawerOverlay.classList.remove('active');
  });
}

// Customizer Add To Bag & Acquire Buttons
const customAddBagBtn = document.getElementById('custom-add-bag-btn');
const customBuyBtn = document.getElementById('custom-buy-btn');

if (customAddBagBtn) {
  customAddBagBtn.addEventListener('click', () => {
    const metalLabel = metalConfig[currentMetal].label;
    showMaisonToast('BAG ADDITION', 'Added to Shopping Bag', `${metalLabel} Solitaire has been added to your order.`, '🛍️');
  });
}

if (customBuyBtn) {
  customBuyBtn.addEventListener('click', () => {
    showMaisonToast('INSTANT CHECKOUT', 'Proceeding to Checkout', 'Connecting to secure Place Vendôme payment portal...', '🔒');
  });
}

// Collections Inquiry Buttons
const collectionInquiryBtns = document.querySelectorAll('.collection-inquiry-btn');
collectionInquiryBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const ringTitle = btn.getAttribute('data-title') || 'Haute Creation';
    showMaisonToast('INQUIRY RECEIVED', 'Atelier Inquiry Sent', `Our master jeweler will reach out regarding ${ringTitle}.`, '💎');
  });
});

// Consultation Drawer Form Submission
const vipBookingForm = document.getElementById('vip-booking-form');
if (vipBookingForm) {
  vipBookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (drawerOverlay) drawerOverlay.classList.remove('active');
    vipBookingForm.reset();
    showMaisonToast('CONSULTATION RESERVED', 'Private Session Booked', 'Our master joaillier will reach out within 24 hours to confirm your suite.', '🏛️');
  });
}

// Newsletter Subscription Form
const newsletterForm = document.getElementById('newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    newsletterForm.reset();
    showMaisonToast('MAISON GAZETTE', 'Welcome to La Maison', 'You are now subscribed to private atelier debuts and seasonal unveilings.', '💌');
  });
}

// Render Loop (Optimized Passive Mouse Parallax)
let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;

window.addEventListener('mousemove', (e) => {
  targetMouseX = (e.clientX / window.innerWidth - 0.5) * 0.15;
  targetMouseY = (e.clientY / window.innerHeight - 0.5) * 0.15;
}, { passive: true });

function animate() {
  requestAnimationFrame(animate);

  mouseX += (targetMouseX - mouseX) * 0.08;
  mouseY += (targetMouseY - mouseY) * 0.08;

  if (ringGroup) {
    scene.rotation.y = mouseX * 0.15;
    scene.rotation.x = mouseY * 0.15;
  }

  renderer.render(scene, camera);
}
animate();

// Optimized Window Resize Handler
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(getAdaptivePixelRatio());
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (loadedRingModel) {
      const box = new THREE.Box3().setFromObject(loadedRingModel);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetScale = getResponsiveScale() / maxDim;
      loadedRingModel.scale.set(targetScale, targetScale, targetScale);
    }
    ScrollTrigger.refresh();
  }, 100);
});

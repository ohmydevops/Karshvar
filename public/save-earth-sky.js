import { solarSystemSunPosition } from "./save-earth-solar-system.js";
import * as THREE from "./vendor/three.module.min.js";
import { addCelestialBodies } from "./save-earth-celestial.js";

export const celestialSunDirection = new THREE.Vector3()
  .fromArray(solarSystemSunPosition)
  .normalize();

// Distant scenery stays centred on the pilot, but never follows their rotation.
export function createDeepSky() {
  const sky = new THREE.Group();
  let seed = 7231;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = new Float32Array(9000),
    colors = new Float32Array(9000),
    magnitudes = new Float32Array(3000);
  for (let i = 0; i < 3000; i++) {
    const y = random() * 2 - 1,
      a = random() * Math.PI * 2,
      r = Math.sqrt(1 - y * y),
      d = 1700 + random() * 400;
    positions.set([Math.cos(a) * r * d, y * d, Math.sin(a) * r * d], i * 3);
    const temperature = random();
    const tint =
      temperature < 0.12
        ? [1, 0.66, 0.4]
        : temperature < 0.4
          ? [1, 0.88, 0.7]
          : temperature < 0.84
            ? [0.9, 0.95, 1]
            : [0.62, 0.79, 1];
    colors.set(tint, i * 3);
    magnitudes[i] =
      random() < 0.035
        ? 0.8 + random() * 0.5
        : 0.09 + 0.55 * Math.pow(random(), 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("magnitude", new THREE.BufferAttribute(magnitudes, 1));
  sky.add(
    new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: {
          pixelRatio: { value: Math.min(globalThis.devicePixelRatio || 1, 2) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        toneMapped: false,
        vertexShader: `attribute float magnitude; uniform float pixelRatio; varying vec3 starColor; varying float light;
          void main(){starColor=color;light=magnitude;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
          gl_PointSize=(2.2+4.*magnitude)*pixelRatio;}`,
        fragmentShader: `varying vec3 starColor; varying float light;
          void main(){vec2 p=gl_PointCoord*2.-1.;float radius=length(p);if(radius>1.)discard;
          float core=exp(-dot(p,p)*22.);float halo=exp(-dot(p,p)*4.5)*.15*smoothstep(.55,1.2,light);
          float alpha=(core+halo)*light*(1.-smoothstep(.75,1.,radius));
          gl_FragColor=vec4(starColor,alpha);}`,
      }),
    ),
  );
  // A faint, irregular Milky Way band, not decorative spiral galaxies.
  const dust = new THREE.Mesh(
    new THREE.SphereGeometry(2300, 48, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      transparent: true,
      vertexShader:
        "varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec3 direction;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){vec3 d=normalize(direction);float band=exp(-pow(dot(d,normalize(vec3(.3,1.,.5)))*9.,2.));float clouds=noise(d*9.)*.55+noise(d*24.)*.3+noise(d*65.)*.15;float lane=smoothstep(.25,.7,noise(d*18.+5.));gl_FragColor=vec4(vec3(.23,.26,.32),band*clouds*lane*.13);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}
    `,
    }),
  );
  sky.add(dust);
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(40, 96, 64),
    new THREE.ShaderMaterial({
      // Stylized photosphere; surface detail stays fixed to the sphere.
      vertexShader: `varying vec3 surfacePoint; varying vec3 viewNormal; varying vec3 viewDirection;
        void main(){surfacePoint=normalize(position);viewNormal=normalize(normalMatrix*normal);
          vec4 p=modelViewMatrix*vec4(position,1.);viewDirection=normalize(-p.xyz);
          gl_Position=projectionMatrix*p;}`,
      fragmentShader: `varying vec3 surfacePoint; varying vec3 viewNormal; varying vec3 viewDirection;
        float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
        float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
        void main(){vec3 p=normalize(surfacePoint);
          float broad=noise(p*19.);float grain=noise(p*110.);
          float detail=.65*broad+.35*grain;
          float limb=.42+.58*pow(max(0.,dot(normalize(viewNormal),normalize(viewDirection))),.45);
          vec3 color=mix(vec3(.72,.19,.025),vec3(1.4,.84,.24),detail)*limb;
          gl_FragColor=vec4(color,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  sun.position.fromArray(solarSystemSunPosition);
  sun.name = "Sun";
  sky.add(sun);
  // Analytic billboard glow: no low-resolution texels to enlarge while aiming.
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(250, 250),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv;
        void main(){vUv=uv;vec4 center=modelViewMatrix*vec4(0.,0.,0.,1.);
          center.xy+=position.xy;gl_Position=projectionMatrix*center;}`,
      fragmentShader: `varying vec2 vUv;
        #include <common>
        #include <dithering_pars_fragment>
        void main(){float radius=length(vUv-.5)*2.;
          float glow=pow(max(0.,1.-radius),3.);
          gl_FragColor=vec4(vec3(1.,.54,.20),glow*.3);
          #include <colorspace_fragment>
          #include <dithering_fragment>
        }`,
      dithering: true,
    }),
  );
  halo.position.copy(sun.position);
  sky.add(halo);
  addCelestialBodies(sky, celestialSunDirection);
  addDistantMeteors(sky);
  addAndromeda(sky);
  return sky;
}

function addAndromeda(sky) {
  const texture = new THREE.TextureLoader().load(
    new URL("./art/andromeda.jpg", import.meta.url).href,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  const galaxy = new THREE.Mesh(
    new THREE.PlaneGeometry(180, (180 * 563) / 1280),
    new THREE.ShaderMaterial({
      uniforms: { photograph: { value: texture } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv;
        void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform sampler2D photograph;varying vec2 vUv;
        void main(){vec3 image=texture2D(photograph,vUv).rgb;
          vec2 edge=smoothstep(vec2(0.),vec2(.25),vUv)*smoothstep(vec2(0.),vec2(.25),1.-vUv);
          float radial=1.-smoothstep(.52,1.,length((vUv-.5)*2.));
          gl_FragColor=vec4(max(image-vec3(.008),vec3(0.))*.8,edge.x*edge.y*radial*.7);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  const azimuth = THREE.MathUtils.degToRad(-105);
  const elevation = THREE.MathUtils.degToRad(28);
  galaxy.position
    .set(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      -Math.cos(azimuth) * Math.cos(elevation),
    )
    .multiplyScalar(1800);
  galaxy.lookAt(0, 0, 0);
  galaxy.rotateZ(-0.22);
  galaxy.name = "Andromeda — R. Gendler / ESO";
  sky.add(galaxy);
}

function addDistantMeteors(sky) {
  const time = { value: 0 };
  const geometry = new THREE.PlaneGeometry(68, 1.35);
  const placements = [
    [-12, 18, -0.32],
    [44, 30, 0.45],
    [-80, -5, -0.55],
    [135, 20, 0.2],
    [-140, -10, -0.2],
    [60, -20, 0.65],
  ];
  placements.forEach(([azimuth, elevation, roll], index) => {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        time,
        start: { value: 7 + index * (52 / 6) },
        duration: { value: 0.5 + index * 0.045 },
      },
      vertexShader: `uniform float time,start,duration;varying vec2 vUv;varying float life;
        void main(){vUv=uv;life=mod(time-start+52.,52.)/duration;
          vec3 p=position;p.x+=(clamp(life,0.,1.)-.5)*180.;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        }`,
      fragmentShader: `varying vec2 vUv;varying float life;
        void main(){if(life>1.)discard;
          float fade=smoothstep(0.,.12,life)*(1.-smoothstep(.6,1.,life));
          // One narrow luminous streak: no fireball or enlarged head.
          float edge=abs(vUv.y-.5)*2.;
          float line=exp(-edge*edge*7.);
          float tail=smoothstep(0.,.8,vUv.x)*(1.-smoothstep(.94,1.,vUv.x));
          vec3 color=vec3(1.35,1.3,1.15);
          gl_FragColor=vec4(color,line*tail*fade*.65);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const meteor = new THREE.Mesh(geometry, material);
    meteor.name = `Distant meteor ${index + 1}`;
    const az = THREE.MathUtils.degToRad(azimuth);
    const el = THREE.MathUtils.degToRad(elevation);
    meteor.position.set(
      Math.sin(az) * Math.cos(el) * 1375,
      Math.sin(el) * 1375,
      -Math.cos(az) * Math.cos(el) * 1375,
    );
    meteor.lookAt(0, 0, 0);
    meteor.rotateZ(roll);
    // The shader moves the streak outside its static quad bounds.
    meteor.frustumCulled = false;
    sky.add(meteor);
  });
  sky.userData.update = (seconds) => {
    time.value = seconds;
  };
}

import * as THREE from "./vendor/three.module.min.js";
import {
  createSolarSystemLayout,
  solarSystemSunPosition,
} from "./save-earth-solar-system.js";
export {
  solarSystem,
  solarSystemSources,
  solarSystemSunPosition,
  createSolarSystemLayout,
} from "./save-earth-solar-system.js";

// Compressed heliocentric distances and authored phases, not an ephemeris.
// Earth is the existing gameplay world; do not add a second Earth to the sky.
const moonAzimuth = THREE.MathUtils.degToRad(-25);
const moonElevation = THREE.MathUtils.degToRad(10);
export const celestialLayout = [
  {
    name: "Moon",
    azimuth: -25,
    elevation: 10,
    diameter: 2,
    kind: 0,
    texture: "moon.jpg",
    distance: 1250,
    radius: 1250 * Math.sin(THREE.MathUtils.degToRad(1)),
    position: [
      Math.sin(moonAzimuth) * Math.cos(moonElevation) * 1250,
      Math.sin(moonElevation) * 1250,
      -Math.cos(moonAzimuth) * Math.cos(moonElevation) * 1250,
    ],
  },
  ...createSolarSystemLayout().filter((body) => body.name !== "Earth"),
];

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  void main(){
    vUv=uv;
    vLocalNormal=normal;
    vWorldNormal=normalize(mat3(modelMatrix)*normal);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
  }`;

const fragmentShader = `
  uniform vec3 sunDirection;
  uniform int kind;
  uniform sampler2D surfaceMap;
  uniform float surfaceReady;
  varying vec2 vUv;
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float noise(vec3 p){
    vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  void main(){
    vec3 p=normalize(vLocalNormal);
    float cloud=noise(p*8.)*.65+noise(p*21.)*.35;
    vec3 surface=vec3(.32+.15*cloud);
    if(kind==1){
      surface=mix(vec3(.48,.38,.22),vec3(.88,.79,.57),.45+cloud*.45);
    }else if(kind==2){
      surface=mix(vec3(.16,.075,.035),vec3(.53,.24,.11),smoothstep(.25,.7,cloud));
      float cap=smoothstep(.93,.99,abs(p.y));
      surface=mix(surface,vec3(.68,.65,.58),cap*.7);
    }else if(kind==3){
      float latitude=p.y+sin(p.x*19.+p.z*13.)*.006+(cloud-.5)*.025;
      float belts=sin(latitude*29.)*.5+.5;
      float fine=sin(latitude*105.)*.5+.5;
      surface=mix(vec3(.32,.18,.10),vec3(.78,.67,.49),smoothstep(.2,.85,belts));
      surface*=.88+fine*.12;
      vec2 storm=(vUv-vec2(.25,.43))/vec2(.055,.025);
      float spot=1.-smoothstep(.5,1.,length(storm));
      surface=mix(surface,vec3(.48,.20,.12),spot*.75);
    }else if(kind==4){
      float bands=sin((p.y+(cloud-.5)*.018)*42.)*.5+.5;
      surface=mix(vec3(.51,.40,.24),vec3(.77,.67,.45),bands*.28+.38);
    }else if(kind==6){
      surface=mix(vec3(.35,.57,.59),vec3(.51,.72,.72),cloud*.4);
    }else if(kind==7){
      surface=mix(vec3(.09,.22,.43),vec3(.20,.41,.59),cloud*.4);
    }
    surface=mix(surface,texture2D(surfaceMap,vUv).rgb,surfaceReady);
    float sunlight=dot(normalize(vWorldNormal),normalize(sunDirection));
    float day=smoothstep(-.08,.18,sunlight);
    vec3 color=surface*(.035+day*.13+max(sunlight,0.)*1.05);
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export function addCelestialBodies(sky) {
  const loader = new THREE.TextureLoader();
  const geometry = new THREE.SphereGeometry(1, 96, 64);
  sky.userData.celestialBodies = celestialLayout;
  sky.userData.solarSystemDisplay =
    "Compressed heliocentric distances; authored orbital phases; enlarged apparent sizes.";
  for (const body of celestialLayout) {
    const position = new THREE.Vector3().fromArray(body.position);
    const bodySunDirection = new THREE.Vector3()
      .fromArray(solarSystemSunPosition)
      .sub(position)
      .normalize();
    const placeholder = new THREE.DataTexture(
      new Uint8Array([160, 160, 160, 255]),
      1,
      1,
    );
    placeholder.needsUpdate = true;
    const textureUniforms = {
      surfaceMap: { value: placeholder },
      surfaceReady: { value: 0 },
    };
    // Local maps load asynchronously once, never during pointer/motion updates.
    loader.load(
      new URL(`./art/${body.texture}`, import.meta.url).href,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        textureUniforms.surfaceMap.value = texture;
        textureUniforms.surfaceReady.value = 1;
        placeholder.dispose();
      },
      undefined,
      () => {},
    );
    const material = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: bodySunDirection },
        kind: { value: body.kind },
        ...textureUniforms,
      },
      vertexShader,
      fragmentShader,
    });
    const planet = new THREE.Mesh(geometry, material);
    planet.name = body.name;
    planet.position.copy(position);
    planet.lookAt(0, 0, 0);
    // The source map places the Great Red Spot near longitude U=.366.
    if (body.name === "Jupiter") planet.rotateY((0.25 - 0.366) * Math.PI * 2);
    planet.scale.setScalar(body.radius);
    sky.add(planet);
    if (body.name === "Saturn") {
      const ringPlaceholder = new THREE.DataTexture(
        new Uint8Array([145, 122, 84, 180]),
        1,
        1,
      );
      ringPlaceholder.needsUpdate = true;
      const ringUniforms = {
        ringMap: { value: ringPlaceholder },
        ringReady: { value: 0 },
      };
      loader.load(
        new URL("./art/saturn-rings.webp", import.meta.url).href,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          ringUniforms.ringMap.value = texture;
          ringUniforms.ringReady.value = 1;
          ringPlaceholder.dispose();
        },
        undefined,
        () => {},
      );
      const rings = new THREE.Mesh(
        new THREE.RingGeometry(1.28, 2.25, 96),
        new THREE.ShaderMaterial({
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          uniforms: {
            sunDirection: { value: bodySunDirection },
            ...ringUniforms,
          },
          vertexShader: `varying float radius;varying vec3 worldNormal;
            void main(){radius=length(position.xy);worldNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
          fragmentShader: `uniform vec3 sunDirection;uniform sampler2D ringMap;uniform float ringReady;varying float radius;varying vec3 worldNormal;
            void main(){float band=.65+.12*sin(radius*84.)+.08*sin(radius*205.);
              float gap=1.-.85*exp(-pow((radius-1.86)/.028,2.));
              float edge=smoothstep(1.28,1.34,radius)*(1.-smoothstep(2.16,2.25,radius));
              float light=.18+.82*abs(dot(normalize(worldNormal),sunDirection));
              vec4 sampled=texture2D(ringMap,vec2(clamp((radius-1.28)/.97,0.,1.),.5));
              vec3 surface=mix(vec3(.57,.48,.33),sampled.rgb,ringReady);
              float opacity=mix(band*gap*edge*.82,sampled.a,ringReady);
              gl_FragColor=vec4(surface*light,opacity);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }`,
        }),
      );
      rings.name = "Saturn rings";
      rings.rotation.x = 1.13;
      rings.rotation.z = -0.25;
      planet.add(rings);
    }
  }
}

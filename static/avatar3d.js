// V1.1 · Avatar Facecap con animación facial, mirada y movimiento expresivo.
// Se usa síntesis de voz del navegador; el movimiento labial es aproximado,
// no sincronización fonética precisa.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
window.avatar3dIniciado=true;
const diagnostico=document.getElementById('avatarDiagnostico');
const avisoModelo=document.getElementById('avatarFallback');
if(avisoModelo) avisoModelo.hidden=true;
const panel=document.querySelector('.avatar-panel'), holder=document.getElementById('avatarEscena'),status=document.getElementById('avatarEstado'),caption=document.getElementById('avatarTranscripcion');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,0.01,100);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;holder.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x647e8f,2.1));const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(2,4,6);scene.add(key);const fill=new THREE.DirectionalLight(0x91dfff,1.0);fill.position.set(-3,1,1);scene.add(fill);
let face=null, headRoot=null, meshes=[],clock=new THREE.Clock(),mode='idle',speakingStarted=0,speechEnd=0,eyeblink=0;
const map={mouth:['JawOpen','jawOpen','MouthOpen','mouthOpen','viseme_aa'],funnel:['MouthFunnel','mouthFunnel'],pucker:['MouthPucker','mouthPucker'],smileL:['MouthSmile_L','mouthSmile_L'],smileR:['MouthSmile_R','mouthSmile_R'],blinkL:['EyeBlink_L','eyeBlink_L'],blinkR:['EyeBlink_R','eyeBlink_R'],brow:['BrowInnerUp','browInnerUp']};
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function morph(name,v){for(const m of meshes){let index=m.idx[name];if(index!==undefined)m.obj.morphTargetInfluences[index]=THREE.MathUtils.clamp(v,0,1)}}
function setMode(next,message){mode=next;panel.classList.remove('listening','speaking','thinking');if(['listening','speaking','thinking'].includes(next))panel.classList.add(next);status.textContent={idle:'En espera',loading:'Cargando...',listening:'● Escuchando',speaking:'● Hablando',thinking:'Preparando...',error:'Sin conexión 3D'}[next]||'En espera';if(message)caption.textContent=message;}
function adjust(){const w=holder.clientWidth,h=holder.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}window.addEventListener('resize',adjust);adjust();
const ktx2=new KTX2Loader().setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/').detectSupport(renderer);
const loader=new GLTFLoader().setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
loader.load('/static/facecap.glb',glb=>{face=glb.scene;const box=new THREE.Box3().setFromObject(face),size=new THREE.Vector3(),center=new THREE.Vector3();box.getSize(size);box.getCenter(center);const max=Math.max(size.x,size.y,size.z)||1;face.scale.setScalar(2.15/max);face.position.copy(center.multiplyScalar(-2.15/max));headRoot=new THREE.Group();headRoot.add(face);scene.add(headRoot);const bounds=new THREE.Box3().setFromObject(headRoot);const sz=new THREE.Vector3();bounds.getSize(sz);camera.position.set(0,0.1,Math.max(2.8,sz.y*1.55));camera.lookAt(0,0,0);face.traverse(obj=>{if(obj.isMesh){obj.frustumCulled=false;const idx={};const dict=obj.morphTargetDictionary||{};for(const [key,names] of Object.entries(map)){for(const candidate of names){const found=Object.keys(dict).find(k=>norm(k)===norm(candidate)||norm(k).endsWith(norm(candidate)));if(found){idx[key]=dict[found];break}}}if(obj.morphTargetInfluences)meshes.push({obj,idx})}});if(avisoModelo) avisoModelo.hidden=true;setMode('idle','Avatar listo. Presiona «Dictar tema» o «Presentarse».');diagnostico.textContent='Modelo 3D cargado correctamente.';},undefined,err=>{setMode('error','No se pudo cargar facecap.glb.');if(avisoModelo) avisoModelo.hidden=false;diagnostico.textContent='Error GLB: '+String(err?.message||err).slice(0,240);console.error('Error cargando avatar:',err)});
function tick(){requestAnimationFrame(tick);const t=clock.getElapsedTime();if(headRoot){headRoot.rotation.y=0.07*Math.sin(t*.7);headRoot.rotation.x=0.024*Math.sin(t*.93)+(mode==='listening'?0.055*Math.sin(t*3):0);headRoot.rotation.z=0.024*Math.sin(t*.65);headRoot.position.y=.022*Math.sin(t*1.3);const mouth=mode==='speaking'?Math.max(.09,.20+.55*Math.abs(Math.sin(t*11.5)*Math.cos(t*4.1))):0;morph('mouth',mouth);morph('funnel',mode==='speaking'?.15*(1+Math.sin(t*6)):0);morph('pucker',mode==='speaking'?.08:0);morph('smileL',mode==='speaking'?.2:.06);morph('smileR',mode==='speaking'?.2:.06);const blink=Math.pow(Math.max(0,Math.sin(t*1.8)),35);morph('blinkL',blink);morph('blinkR',blink);morph('brow',mode==='listening'?.12:mode==='speaking'?.22:0)}renderer.render(scene,camera)}tick();
let vozToken=0;
function stop(){vozToken++;window.speechSynthesis?.cancel();setMode('idle','Voz detenida.');}
function fragmentarVoz(texto){
  const oraciones=String(texto||'').match(/[^.!?\n]+[.!?]?/g)||[String(texto||'')];
  const bloques=[];let actual='';
  for(const frase of oraciones){for(const trozo of (frase.trim().match(/.{1,180}(?:\s|$)|.{1,180}/g)||[])){
    if((actual+' '+trozo).length>220&&actual){bloques.push(actual);actual='';}
    actual+=(actual?' ':'')+trozo.trim();
  }}if(actual)bloques.push(actual);return bloques;
}
function speak(text){
  stop();const token=++vozToken;
  if(!('speechSynthesis'in window)){setMode('error','El navegador no dispone de síntesis de voz.');window.dispatchEvent(new CustomEvent('avatar-voz-fin',{detail:{error:true}}));return;}
  const partes=fragmentarVoz(text);let indice=0;const voices=speechSynthesis.getVoices();
  const voice=voices.find(v=>v.lang.toLowerCase()==='es-pe')||voices.find(v=>v.lang.toLowerCase().startsWith('es-'));
  function siguiente(){
    if(token!==vozToken)return;
    if(indice>=partes.length){setMode('idle','Respuesta terminada.');window.dispatchEvent(new CustomEvent('avatar-voz-fin',{detail:{error:false}}));return;}
    const u=new SpeechSynthesisUtterance(partes[indice++]);u.lang='es-PE';u.rate=.94;u.pitch=1;if(voice)u.voice=voice;
    u.onstart=()=>{if(token===vozToken)setMode('speaking','Asistente dictando...')};
    u.onend=()=>{if(token===vozToken)siguiente()};
    u.onerror=()=>{if(token!==vozToken)return;setMode('idle','No se pudo reproducir la voz.');window.dispatchEvent(new CustomEvent('avatar-voz-fin',{detail:{error:true}}))};
    speechSynthesis.speak(u);
  }
  if(!partes.length){window.dispatchEvent(new CustomEvent('avatar-voz-fin',{detail:{error:false}}));return;}
  siguiente();
}
window.addEventListener('avatar-hablar',e=>speak(e.detail?.texto));window.addEventListener('avatar-estado',e=>{const {tipo,texto}=e.detail||{};if(tipo==='stop')stop();else if(tipo==='listening'){speechSynthesis?.cancel();setMode('listening',texto)}else setMode(tipo||'idle',texto)});
setMode('loading','Cargando facecap.glb...');diagnostico.textContent='Cargando modelo local y decodificadores...';

let catalogo = null, sesion = null;
const $ = id => document.getElementById(id);
const escapeHTML = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const option=(value,label=value)=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;};
async function cargar(){try{const r=await fetch('/api/catalogo');catalogo=await r.json();$('estadoIA').textContent=catalogo.modo_ia?'● IA Groq habilitada':'● Modo local (sin IA)'; for(const x of Object.keys(catalogo.competencias))$('area').append(option(x));for(const x of catalogo.enfoques)$('enfoque').append(option(x));}catch{$('estadoIA').textContent='Servicio no disponible';}}
$('area').addEventListener('change',()=>{const sel=$('competencia');sel.replaceChildren(option('','Seleccionar competencia'));(catalogo?.competencias[$('area').value]||[]).forEach(x=>sel.append(option(x)));});
function editar(k,label,text){return `<h3>${escapeHTML(label)}</h3><p contenteditable="true" data-key="${k}">${escapeHTML(text)}</p>`;}
function render(s){detenerClase();sesion=s;window.__sesionPedagogicaLista=true;$('clasePanel').hidden=false;$('empty').hidden=true;$('results').hidden=false;document.querySelector('[data-key="titulo"]').textContent=s.titulo;
$('metadata').innerHTML=Object.entries({'Grado':`${s.datos.grado}.°`,'Área':s.datos.area,'Duración':`${s.datos.duracion} minutos`,'Docente':s.datos.docente||'—','I. E.':s.datos.institucion||'—','Tema':s.datos.tema}).map(([k,v])=>`<div><b>${escapeHTML(k)}:</b> ${escapeHTML(v)}</div>`).join('');
let h=editar('proposito','I. Propósito de aprendizaje',s.proposito)+editar('competencia','Competencia',s.competencia)+editar('capacidades','Capacidades (verificar)',s.capacidades)+editar('desempeno','Desempeño (verificar)',s.desempeno)+'<h3>Criterios de evaluación</h3><ol class="items">'+s.criterios.map((c,i)=>`<li contenteditable="true" data-list="criterios" data-index="${i}">${escapeHTML(c)}</li>`).join('')+'</ol>'+editar('evidencia','Evidencia de aprendizaje',s.evidencia)+editar('instrumento','Instrumento de evaluación',s.instrumento)+editar('enfoque','Enfoque transversal',s.enfoque)+'<h3>II. Secuencia didáctica</h3>';
for(const [k,n] of [['inicio','Inicio'],['desarrollo','Desarrollo'],['cierre','Cierre']]) h+=`<div class="etapa"><b>${n} · ${s[k].minutos} minutos</b><p contenteditable="true" data-etapa="${k}">${escapeHTML(s[k].actividades)}</p></div>`;
h+= '<h3>III. Recursos</h3><ul class="items">'+s.recursos.map((c,i)=>`<li contenteditable="true" data-list="recursos" data-index="${i}">${escapeHTML(c)}</li>`).join('')+'</ul>'+editar('atencion_diversidad','Atención a la diversidad',s.atencion_diversidad)+editar('retroalimentacion','Retroalimentación formativa',s.retroalimentacion)+'<h3>IV. Lista de cotejo</h3><ol class="items">'+s.lista_cotejo.map((x,i)=>`<li contenteditable="true" data-cotejo="${i}">${escapeHTML(x.criterio)}</li>`).join('')+'</ol>';
$('editor').innerHTML=h;$('claseEtapa').textContent='Sesión lista';actualizarControles();$('claseTexto').textContent=`Sesión lista: ${s.titulo}. Pulsa «Iniciar clase» para empezar.`;$('claseEstado').textContent='La sesión está cargada. Revisa su contenido e inicia la clase cuando quieras.';$('msg').textContent=s.origen==='plantilla_local'?'Borrador generado con plantilla local. No es una generación de IA. Verifica la adecuación de actividades y todos los referentes curriculares.':'Borrador generado por IA. Revisa la pertinencia didáctica y verifica desempeños y capacidades oficiales.';}
function sincronizar(){if(!sesion)return;for(const el of document.querySelectorAll('[data-key]'))sesion[el.dataset.key]=el.innerText.trim();for(const el of document.querySelectorAll('[data-etapa]'))sesion[el.dataset.etapa].actividades=el.innerText.trim();for(const el of document.querySelectorAll('[data-list]'))sesion[el.dataset.list][Number(el.dataset.index)]=el.innerText.trim();for(const el of document.querySelectorAll('[data-cotejo]'))sesion.lista_cotejo[Number(el.dataset.cotejo)].criterio=el.innerText.trim();}
$('form').addEventListener('submit',async(e)=>{e.preventDefault();const btn=$('generar');btn.disabled=true;btn.textContent='Generando borrador...';try{const data=Object.fromEntries(new FormData(e.currentTarget).entries());const r=await fetch('/api/generar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const body=await r.json();if(!r.ok)throw new Error(body.error||'Error al generar');render(body.sesion);hablarAvatar('He preparado tu sesión de aprendizaje: '+body.sesion.titulo+'. Puedes revisar y editar las actividades antes de exportarla.');if(body.advertencia)$('msg').textContent=body.advertencia+' '+$('msg').textContent;}catch(err){alert(err.message)}finally{btn.disabled=false;btn.textContent='✦ Generar sesión de aprendizaje';}});
$('word').onclick=async()=>{sincronizar();try{const r=await fetch('/api/exportar-word',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sesion)});if(!r.ok)throw new Error('No se pudo exportar');const blob=await r.blob();descargar(blob,'sesion_primaria_peru.docx');}catch(err){alert(err.message)}};
$('json').onclick=()=>{sincronizar();descargar(new Blob([JSON.stringify(sesion,null,2)],{type:'application/json'}),'sesion_primaria_peru.json')};
$('imprimir').onclick=()=>{sincronizar();window.print()};
function descargar(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
// Enviar estados al avatar sin depender de la carga de Three.js.
function avisoAvatar(tipo,texto=''){window.dispatchEvent(new CustomEvent('avatar-estado',{detail:{tipo,texto}}));}
function hablarAvatar(texto){window.dispatchEvent(new CustomEvent('avatar-hablar',{detail:{texto}}));}
$('voice').onclick=()=>{const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Rec){alert('El navegador no admite reconocimiento de voz. Usa Chrome o Edge actualizado, o escribe el tema.');return;}const sr=new Rec();sr.lang='es-PE';sr.interimResults=true;sr.continuous=false;let resultado='';sr.onstart=()=>avisoAvatar('listening','Escuchando el tema...');sr.onresult=e=>{let texto='';for(let i=0;i<e.results.length;i++)texto+=e.results[i][0].transcript+' ';resultado=texto.trim();document.querySelector('[name="tema"]').value=resultado;avisoAvatar('listening','Escuchando: '+resultado);};sr.onend=()=>{avisoAvatar('idle','Dictado finalizado.');if(resultado)hablarAvatar('He registrado el tema: '+resultado+'. Selecciona el grado y el área, y presiona generar sesión.');};sr.onerror=e=>{avisoAvatar('error','Error del micrófono: '+e.error);alert('No se pudo reconocer la voz: '+e.error);};try{sr.start()}catch(err){alert('No se pudo iniciar el micrófono: '+err.message)}};
$('speak').onclick=()=>{if(!sesion){hablarAvatar('Primero debes generar una sesión de aprendizaje.');return;}sincronizar();hablarAvatar(`Sesión de aprendizaje: ${sesion.titulo}. Propósito: ${sesion.proposito}`)};
$('avatarSaludar').onclick=()=>hablarAvatar('Hola, soy tu asistente pedagógico virtual. Puedo ayudarte a elaborar sesiones de aprendizaje para educación primaria del Perú. Dime el tema que quieres desarrollar.');
$('avatarSilencio').onclick=()=>{avisoAvatar('stop','Voz detenida.');if(claseActiva){$('claseEstado').textContent='Audio detenido. Pulsa Repetir o Continuar.';$('claseContinuar').disabled=false;}};
// V1.4 · La clase se dicta por etapas, sin utilizar bases de datos.
let claseGuion=[],claseIndice=-1,claseActiva=false,esperaClase=false;
function resumirActividad(valor){return String(valor||'').replace(/\s+/g,' ').trim();}
function construirGuion(){
 const d=sesion.datos||{},titulo=sesion.titulo||d.tema||'Nuestra clase';
 return [
 {etapa:'Presentación',texto:`Buenos días, niñas y niños. Hoy aprenderemos sobre ${d.tema||titulo}. Nuestra clase se llama ${titulo}. ${sesion.proposito||''} ¿Qué saben acerca de este tema? Escuchemos algunas ideas.`,instruccion:'Escucha algunas respuestas antes de continuar.'},
 {etapa:'Inicio',texto:`Comencemos con las actividades de inicio. ${resumirActividad(sesion.inicio?.actividades)} Ahora participen y compartan sus ideas.`,instruccion:`Realiza las actividades de inicio (${sesion.inicio?.minutos||'?'} minutos) y después continúa.`},
 {etapa:'Desarrollo',texto:`Ahora vamos a trabajar y aprender juntos. ${resumirActividad(sesion.desarrollo?.actividades)} Lean, observen o resuelvan la actividad según las indicaciones.`,instruccion:`Realiza las actividades de desarrollo (${sesion.desarrollo?.minutos||'?'} minutos). Pausa el asistente mientras trabajan.`},
 {etapa:'Reflexión',texto:`Pensemos en lo que hemos realizado. ¿Qué aprendimos? ¿Qué fue difícil? ¿Cómo podríamos explicar nuestra respuesta a un compañero? Levanten la mano para compartir.`,instruccion:'Da tiempo para que los estudiantes respondan.'},
 {etapa:'Cierre',texto:`Terminemos nuestra sesión. ${resumirActividad(sesion.cierre?.actividades)} Recuerden lo aprendido y comenten dónde podrían aplicarlo.`,instruccion:`Realiza las actividades de cierre (${sesion.cierre?.minutos||'?'} minutos).`},
 {etapa:'Despedida',texto:'Excelente trabajo de hoy. Hemos llegado al final de la sesión. Sigan practicando lo aprendido y compartan sus ideas con respeto. ¡Hasta la próxima clase!',instruccion:'Fin de la clase. El docente revisa las evidencias y la evaluación.'}
 ];
}
function actualizarControles(){
 $('claseContinuar').disabled=!claseActiva||!esperaClase;
 $('claseRepetir').disabled=!claseActiva;
 $('claseDetener').disabled=!claseActiva;
 $('claseIniciar').disabled=!(sesion&&sesion.titulo)||claseActiva;
}
function detenerClase(){
 if(claseActiva)avisoAvatar('stop','Clase detenida.');
 claseActiva=false;esperaClase=false;claseIndice=-1;claseGuion=[];
 const panel=$('clasePanel');if(!panel)return;
 $('claseEtapa').textContent='Preparado';$('claseProgressBar').style.width='0%';
 $('claseTexto').textContent='La clase estará lista cuando generes una sesión. El docente controla cada etapa.';
 $('claseEstado').textContent='Puedes iniciar la clase cuando hayas revisado el contenido.';
 actualizarControles();
}
function dictarPaso(indice){
 if(!claseActiva||indice>=claseGuion.length)return;
 claseIndice=indice;esperaClase=false;const paso=claseGuion[indice];
 $('claseEtapa').textContent=`${indice+1} / ${claseGuion.length} · ${paso.etapa}`;
 $('claseTexto').textContent=paso.texto;
 $('claseEstado').textContent='El avatar está explicando. '+paso.instruccion;
 $('claseProgressBar').style.width=`${(indice+1)/claseGuion.length*100}%`;
 actualizarControles();hablarAvatar(paso.texto);
}
$('claseIniciar').onclick=()=>{
 if(!sesion)return alert('Primero genera una sesión de aprendizaje.');
 sincronizar();claseGuion=construirGuion();claseActiva=true;dictarPaso(0);
 $('clasePanel').scrollIntoView({behavior:'smooth',block:'center'});
};
$('claseContinuar').onclick=()=>{
 if(!claseActiva||!esperaClase)return;
 if(claseIndice===claseGuion.length-1){detenerClase();$('claseEstado').textContent='Clase finalizada.';return;}
 dictarPaso(claseIndice+1);
};
$('claseRepetir').onclick=()=>{if(claseActiva&&claseIndice>=0)dictarPaso(claseIndice)};
$('claseDetener').onclick=detenerClase;
window.addEventListener('avatar-voz-fin',e=>{
 if(!claseActiva||claseIndice<0)return;
 esperaClase=true;
 $('claseEstado').textContent=(e.detail?.error?'La voz no se pudo reproducir. Puedes leer el texto y continuar. ':'')+claseGuion[claseIndice].instruccion;
 $('claseContinuar').textContent=claseIndice===claseGuion.length-1?'✓ Finalizar':'→ Continuar';
 actualizarControles();
});
actualizarControles();
window.__versionPedagogica='V1.4.2';
const versionBadge=document.getElementById('versionFrontend');if(versionBadge)versionBadge.textContent='Frontend V1.4.2 activo';
cargar();

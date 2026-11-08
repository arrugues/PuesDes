// Función de IA de PuesDes: Gemini (gratis) detrás de login de Supabase.
const P={
leccion:d=>`Crea una lección de ruso para hispanohablantes de España (nivel ${d.nivel||'A1'}) sobre: ${JSON.stringify(d.tema||'libre')}. Devuelve JSON: {"titulo":str,"palabras":[[ruso,español,pronunciación escrita para españoles] x5],"teoria":str (gramática breve y clara),"truco":str,"curiosidad":str,"juego":str,"solucion":str}`,
charla:d=>`Eres un tutor de ruso amable. Conversa en ruso sencillo (A1-A2) con un hispanohablante de España. Si el historial está vacío, saluda tú primero. Historial (u=alumno, m=tú): ${JSON.stringify(d.msgs||[])}. Responde JSON: {"ru":str,"es":traducción al español,"fix":corrección breve en español del último mensaje del alumno, o ""}`,
trad:d=>`Traduce entre español de España y ruso (detecta el idioma). Texto: ${JSON.stringify(d.texto||'')}. JSON: {"ru":str,"es":str,"tr":pronunciación para españoles,"nota":nota breve en español}`,
dibujo:d=>`La imagen es un dibujo a mano alzada de texto en ruso (cirílico). Léelo. ${d.esperado?'Se esperaba: '+d.esperado+'. ':''}JSON: {"texto":str,"ok":boolean,"consejo":str breve en español}`,
audio:d=>`Audio de un hispanohablante diciendo algo en ruso. ${d.esperado?'Debía decir: '+d.esperado+'. ':''}JSON: {"oido":str,"ok":boolean,"consejo":str breve en español sobre pronunciación}`};
const X=d=>JSON.stringify(String(d.texto||'').slice(0,2000));
Object.assign(P,{
duda:d=>`Eres un profesor de ruso para hispanohablantes de España. Responde con claridad y ejemplos (ruso + pronunciación + español) a: ${X(d)}. JSON: {"respuesta":str}`,
corregir:d=>`Corrige este texto de un alumno de ruso (hispanohablante): ${X(d)}. JSON: {"ru":texto corregido,"es":traducción al español,"respuesta":explicación breve en español de cada error}`,
historia:d=>`Escribe una historia de 4 frases en ruso nivel A1 sobre: ${X(d)} (si está vacío, la vida diaria). JSON: {"ru":historia,"es":traducción,"respuesta":3 palabras clave con traducción}`});
exports.handler=async ev=>{
  const H={'Content-Type':'application/json'},E=(c,m)=>({statusCode:c,headers:H,body:JSON.stringify({error:m})});
  if(ev.httpMethod==='GET')return{statusCode:200,headers:H,body:JSON.stringify({ok:true,gemini:!!process.env.GEMINI_API_KEY,supabase:!!(process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY)})};
  if(ev.httpMethod!=='POST')return E(405,'Método no permitido');
  const tk=(ev.headers.authorization||'').replace('Bearer ','');
  const u=await fetch(process.env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_ANON_KEY,Authorization:'Bearer '+tk}});
  if(!u.ok)return E(401,'Inicia sesión para usar la IA');
  let d;try{d=JSON.parse(ev.body)}catch{return E(400,'JSON no válido')}
  if(!P[d.task])return E(400,'Tarea desconocida');
  const parts=[{text:P[d.task](d)}];
  if(d.img)parts.push({inline_data:{mime_type:'image/png',data:d.img}});
  if(d.audio)parts.push({inline_data:{mime_type:'audio/wav',data:d.audio}});
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL||'gemini-flash-latest'}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts}],generationConfig:{responseMimeType:'application/json'}})});
  const j=await r.json();
  if(!r.ok)return E(502,(j.error&&j.error.message)||'Error de Gemini');
  try{return{statusCode:200,headers:H,body:j.candidates[0].content.parts[0].text}}catch{return E(502,'Respuesta vacía')}
};

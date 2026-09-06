// sRGB <-> OKLab. OKLab ist wahrnehmungsnah: gleiche L bedeutet gleiche
// empfundene Helligkeit, gleiche C gleiche empfundene Buntheit.
const f = x => x <= 0.04045 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4);
const g = x => x <= 0.0031308 ? 12.92*x : 1.055*Math.pow(x, 1/2.4) - 0.055;

export function hexZuOklab(hex){
  const r=f(parseInt(hex.slice(1,3),16)/255), gr=f(parseInt(hex.slice(3,5),16)/255), b=f(parseInt(hex.slice(5,7),16)/255);
  const l=Math.cbrt(0.4122214708*r+0.5363325363*gr+0.0514459929*b);
  const m=Math.cbrt(0.2119034982*r+0.6806995451*gr+0.1073969566*b);
  const s=Math.cbrt(0.0883024619*r+0.2817188376*gr+0.6299787005*b);
  return { L:0.2104542553*l+0.7936177850*m-0.0040720468*s,
           a:1.9779984951*l-2.4285922050*m+0.4505937099*s,
           b:0.0259040371*l+0.7827717662*m-0.8086757660*s };
}
export function oklabZuHex({L,a,b}){
  const l=(L+0.3963377774*a+0.2158037573*b)**3;
  const m=(L-0.1055613458*a-0.0638541728*b)**3;
  const s=(L-0.0894841775*a-1.2914855480*b)**3;
  const R=g( 4.0767416621*l-3.3077115913*m+0.2309699292*s);
  const G=g(-1.2684380046*l+2.6097574011*m-0.3413193965*s);
  const B=g(-0.0041960863*l-0.7034186147*m+1.7076147010*s);
  const k=x=>Math.round(Math.max(0,Math.min(1,x))*255).toString(16).padStart(2,'0');
  return '#'+k(R)+k(G)+k(B);
}
export const chroma = o => Math.hypot(o.a,o.b);
export const winkel = o => (Math.atan2(o.b,o.a)*180/Math.PI+360)%360;

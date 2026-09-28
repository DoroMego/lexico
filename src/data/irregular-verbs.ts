// Independently prepared sample overrides; RAE DLE used to check grammatical forms.
// Reference links and review scope: docs/CONTENT_REVIEW.md.
import type { IrregularSpec } from '@/lib/conjugation';
export const IRREGULARS: Record<string, IrregularSpec> = { tener: {
 futureStem: 'tendr', forms: {
 presente: {yo:'tengo',tu:'tienes',el:'tiene',ellos:'tienen'},
 preteritoIndefinido: {yo:'tuve',tu:'tuviste',el:'tuvo',nosotros:'tuvimos',vosotros:'tuvisteis',ellos:'tuvieron'},
 presenteSubj: {yo:'tenga',tu:'tengas',el:'tenga',nosotros:'tengamos',vosotros:'tengáis',ellos:'tengan'},
 imperfectoSubj: {yo:'tuviera',tu:'tuvieras',el:'tuviera',nosotros:'tuviéramos',vosotros:'tuvierais',ellos:'tuvieran'},
 imperativoAfirmativo: {tu:'ten'},
 } } };

const persons = ['yo','tu','el','nosotros','vosotros','ellos'] as const;
function six(forms: string) { return Object.fromEntries(forms.split(' ').map((form,i)=>[persons[i],form])); }
IRREGULARS.ser = {gerundio:'siendo', participio:'sido', forms:{
 presente:six('soy eres es somos sois son'), preteritoImperfecto:six('era eras era éramos erais eran'),
 preteritoIndefinido:six('fui fuiste fue fuimos fuisteis fueron'), presenteSubj:six('sea seas sea seamos seáis sean'),
 imperfectoSubj:six('fuera fueras fuera fuéramos fuerais fueran'), imperativoAfirmativo:{tu:'sé',vosotros:'sed'}
}};
IRREGULARS.ir = {gerundio:'yendo', forms:{
 presente:six('voy vas va vamos vais van'), preteritoImperfecto:six('iba ibas iba íbamos ibais iban'),
 preteritoIndefinido:six('fui fuiste fue fuimos fuisteis fueron'), presenteSubj:six('vaya vayas vaya vayamos vayáis vayan'),
 imperfectoSubj:six('fuera fueras fuera fuéramos fuerais fueran'), imperativoAfirmativo:{tu:'ve',nosotros:'vamos'}
}};
IRREGULARS.hacer = {futureStem:'har',participio:'hecho',forms:{
 presente:{yo:'hago'}, preteritoIndefinido:six('hice hiciste hizo hicimos hicisteis hicieron'),
 presenteSubj:six('haga hagas haga hagamos hagáis hagan'), imperfectoSubj:six('hiciera hicieras hiciera hiciéramos hicierais hicieran'),
 imperativoAfirmativo:{tu:'haz'}
}};
IRREGULARS.poder = {futureStem:'podr',gerundio:'pudiendo',forms:{
 presente:{yo:'puedo',tu:'puedes',el:'puede',ellos:'pueden'}, preteritoIndefinido:six('pude pudiste pudo pudimos pudisteis pudieron'),
 presenteSubj:six('pueda puedas pueda podamos podáis puedan'), imperfectoSubj:six('pudiera pudieras pudiera pudiéramos pudierais pudieran')
}};
IRREGULARS.dormir = {gerundio:'durmiendo',forms:{
 presente:{yo:'duermo',tu:'duermes',el:'duerme',ellos:'duermen'}, preteritoIndefinido:{el:'durmió',ellos:'durmieron'},
 presenteSubj:six('duerma duermas duerma durmamos durmáis duerman'), imperfectoSubj:six('durmiera durmieras durmiera durmiéramos durmierais durmieran')
}};

import sampleWords from '@/data/wordbank.json';
import { ConjugationTable } from '@/components/conjugation-table';
import { MaxContentWidth } from '@/constants/theme';
import { useEffect, useState } from 'react';
import { ScrollView, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getWord, searchWords, collectWord, isCollected, uncollectWord } from '@/lib/db';
import { Word, Familiarity } from '@/lib/types';
import { FamiliarityPicker } from '@/components/familiarity-picker';
import { speakWord } from '@/lib/speech';
import { getFamily } from '@/lib/wordbank-meta';
import { conjugateInfinitive } from '@/lib/conjugate-verb';
export default function WordScreen() {
 const {id}=useLocalSearchParams<{id:string}>(); const router=useRouter();
 const [word,setWord]=useState<Word|null>(null); const [saved,setSaved]=useState(false); const [picking,setPicking]=useState(false);
 useEffect(()=>{getWord(Number(id)).then(setWord); isCollected(Number(id)).then(setSaved);},[id]);
 if(!word) return <Text>Loading word…</Text>;
 const conjugation=word.pos==='verb'?conjugateInfinitive(word.spanish):null;
 return <ScrollView contentContainerStyle={{width:'100%',maxWidth:MaxContentWidth,alignSelf:'center',padding:16,gap:16}}>
 <Text style={{fontSize:30}}>{word.spanish}</Text><Text>{word.english} · {word.chinese}</Text>
 <Text>{word.pos} · {word.gender??'—'} · {word.level}</Text>
 <Text>{word.exampleEs}</Text><Text>{word.exampleZh}</Text>
 <Pressable onPress={()=>speakWord(word.spanish)}><Text>朗读 · Listen</Text></Pressable>
 <Pressable style={{backgroundColor:saved?'#F0EDE8':'#C8793A',padding:12,borderRadius:8,alignItems:'center'}} onPress={async()=>{if(saved){await uncollectWord(word.id);setSaved(false);}else setPicking(true);}}><Text style={{color:saved?'#1A1A1A':'#FFFFFF',fontWeight:'600'}}>{saved?'取消收藏':'收藏 · Collect'}</Text></Pressable>
 <FamiliarityPicker visible={picking} onCancel={()=>setPicking(false)} onPick={async(f:Familiarity)=>{await collectWord(word.id,f,Date.now());setSaved(true);setPicking(false);}} />
 {(getFamily(word.spanish)??[]).map(name=><Pressable key={name} onPress={async()=>{const w=(await searchWords(name)).find(w=>w.spanish===name);if(w)router.push(`/word/${w.id}`);}}><Text>{name}</Text></Pressable>)}
 {conjugation && <ConjugationTable conjugation={conjugation} alwaysShowForms />}
 </ScrollView>;
}

export function generateStaticParams() {
 return sampleWords.map((_, index) => ({ id: String(index + 1) }));
}

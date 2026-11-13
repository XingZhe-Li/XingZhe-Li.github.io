import { LAB_TYPES,makeLab,normalizeLab } from './labs/defaults.js';
export const STORAGE_KEY='tingjian-study-v2';
export const LEGACY_KEY='mitakeko-learning-v1';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function createState() {return {version:2,completed:[],answers:{},practice:{},notes:{},labs:{},labBackups:{},activity:{},bookmarks:[],lastLesson:'u01-01',settings:{volume:.45},legacy:null};}
export function normalizeState(raw,lessons=[]) {
  if(!object(raw))throw new Error('请选择有效的学习记录 JSON。');
  if(raw.version===1)return migrateLegacy(raw,lessons);
  if(raw.version!==2)throw new Error('学习记录版本不兼容，请保留原文件。');
  const state=createState(),ids=new Set(lessons.map(l=>l.id));
  state.completed=Array.isArray(raw.completed)?[...new Set(raw.completed.filter(id=>ids.has(id)))]:[];
  state.bookmarks=Array.isArray(raw.bookmarks)?[...new Set(raw.bookmarks.filter(id=>ids.has(id)))]:[];
  if(ids.has(raw.lastLesson))state.lastLesson=raw.lastLesson;
  if(Number.isFinite(raw.settings?.volume))state.settings.volume=Math.max(0,Math.min(1,raw.settings.volume));
  for(const lesson of lessons) {
    const id=lesson.id;
    if(typeof raw.notes?.[id]==='string')state.notes[id]=raw.notes[id].slice(0,8000);
    if(Array.isArray(raw.answers?.[id]))state.answers[id]=lesson.quiz.map((q,i)=>Number.isInteger(raw.answers[id][i])&&raw.answers[id][i]>=0&&raw.answers[id][i]<q.options.length?raw.answers[id][i]:null);
    if(Array.isArray(raw.practice?.[id]))state.practice[id]=lesson.practice.criteria.map((_,i)=>raw.practice[id][i]===true);
    if(object(raw.labs?.[id]))state.labs[id]=normalizeLab(raw.labs[id],lesson.lab.type,lesson.lab.config);
    if(object(raw.labBackups?.[id]))state.labBackups[id]=normalizeLab(raw.labBackups[id],lesson.lab.type,lesson.lab.config);
    if(object(raw.activity?.[id]))state.activity[id]={played:raw.activity[id].played===true,changed:raw.activity[id].changed===true};
  }
  for(const type of Object.keys(LAB_TYPES)){const key='scratch-'+type;if(object(raw.labs?.[key]))state.labs[key]=normalizeLab(raw.labs[key],type);}
  if(object(raw.legacy))state.legacy={version:1,completed:Array.isArray(raw.legacy.completed)?raw.legacy.completed.filter(s=>['listening','pulse','rhythm','pitch','motif'].includes(s)):[],notice:'旧版笔记与声音草稿已保留；正式课程按新的学习目标记录进度。'};
  return state;
}
function migrateLegacy(raw,lessons) {
  const state=createState(),mapping={listening:'u01-01',pulse:'u02-01',rhythm:'u02-02',pitch:'u03-01',motif:'u05-01'},valid=new Set(lessons.map(l=>l.id));
  for(const [old,id] of Object.entries(mapping))if(valid.has(id)&&typeof raw.notes?.[old]==='string')state.notes[id]=raw.notes[old].slice(0,8000);
  if(Number.isFinite(raw.settings?.volume))state.settings.volume=Math.max(0,Math.min(1,raw.settings.volume));
  for(const [old,id] of Object.entries(mapping)){
    const lesson=lessons.find(l=>l.id===id);if(!lesson)continue;
    const lab=makeLab(lesson.lab.type,lesson.lab.config),s=raw.settings||{};
    lab.bpm=Number.isFinite(s.bpm)?s.bpm:90;
    if(old==='listening')lab.layers={...lab.layers,...(s.layers||{})};
    if(old==='rhythm'){lab.drums=s.drums||lab.drums;lab.drumsA=s.drumsA||lab.drumsA;}
    if(old==='motif'){lab.melody=s.melody||lab.melody;if(s.melody){delete lab.timedEvents;delete lab.timedA;}}
    state.labs[id]=normalizeLab(lab,lesson.lab.type,lesson.lab.config);
  }
  if(valid.has(mapping[raw.lastLesson]))state.lastLesson=mapping[raw.lastLesson];
  state.legacy={version:1,completed:Array.isArray(raw.completed)?raw.completed.filter(id=>Object.hasOwn(mapping,id)):[],notice:'旧版笔记与声音草稿已保留；正式课程按新的学习目标记录进度。'};
  return state;
}
export function labFor(state,lesson,key=lesson.id) {
  if(!state.labs[key])state.labs[key]=makeLab(lesson.lab.type,lesson.lab.config);
  return state.labs[key];
}
/** One reversible, exportable starter load per lesson; notes and achievement records stay independent. */
export function loadLessonStart(state,lesson) {
  state.labBackups||={};
  state.labBackups[lesson.id]=normalizeLab(labFor(state,lesson),lesson.lab.type,lesson.lab.config);
  return state.labs[lesson.id]=makeLab(lesson.lab.type,lesson.lab.config);
}
export function restoreLessonDraft(state,lesson) {
  const backup=state.labBackups?.[lesson.id];if(!backup)return null;
  state.labs[lesson.id]=normalizeLab(backup,lesson.lab.type,lesson.lab.config);
  delete state.labBackups[lesson.id];return state.labs[lesson.id];
}
export function completionMissing(state,lesson) {
  const missing=[];
  if(!state.activity[lesson.id]?.played)missing.push('试听本课的原创声音模型');
  if(!lesson.quiz.every((q,i)=>state.answers[lesson.id]?.[i]===q.correctIndex))missing.push('完成两道理解题并阅读解释');
  if(!lesson.practice.criteria.every((_,i)=>state.practice[lesson.id]?.[i]===true))missing.push('按练习标准完成自评');
  return missing;
}

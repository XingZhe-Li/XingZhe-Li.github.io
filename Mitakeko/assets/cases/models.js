import { validateModel } from '../music/models.js';

export function excerptVariant(excerpt,id) {
  const variant=excerpt.variants.find(item=>item.id===id);
  if(!variant)throw new RangeError('找不到这个谱例版本。');
  return variant;
}

export function caseBarRanges(excerpt) {
  const lengths=excerpt.barBeats||Array(excerpt.bars).fill(excerpt.beatsPerBar);
  if(lengths.length!==excerpt.bars||lengths.some(value=>!Number.isFinite(value)||value<=0))throw new RangeError('谱例小节长度无效。');
  let start=0;return lengths.map(length=>{const range={start,end:start+length};start=range.end;return range;});
}

/** Use the same timed notes for notation and synthesis. Never fetch a recording. */
export function caseModel(excerpt,variantId,solo='all',pulse=false) {
  const variant=excerptVariant(excerpt,variantId);
  if(solo!=='all'&&!variant.parts.some(part=>part.id===solo))throw new RangeError('找不到这个声部。');
  const events=[];
  for(const part of variant.parts) {
    if(solo!=='all'&&part.id!==solo)continue;
    for(const event of part.events) {
      const kind=event.kind||'tone',layer=part.layer||(kind==='tone'?'melody':'rhythm');
      const common={beat:event.beat,duration:event.duration,kind,layer,velocity:event.velocity??part.velocity??.55,partId:part.id};
      if(kind==='tone')for(const note of event.notes||[])events.push({...common,note,waveform:part.waveform||'triangle',attack:part.attack??.015,release:part.release??.08});
      else events.push(common);
    }
  }
  if(pulse)for(const bar of caseBarRanges(excerpt)) {
    // Align a short pickup to the end of its notional full bar: a 1.5-beat
    // pickup has its last quarter-note pulse half a beat after the first note.
    const length=bar.end-bar.start,offset=length<excerpt.beatsPerBar?length%1:0;
    for(let beat=bar.start+offset;beat<bar.end-1e-7;beat+=1)events.push({beat,duration:Math.min(.06,bar.end-beat),kind:'hat',layer:'rhythm',velocity:.22,partId:'__pulse'});
  }
  const model={beats:caseBarRanges(excerpt).at(-1).end,events,meta:{meter:excerpt.meter,beatUnit:'四分音符',excerptId:excerpt.id,variantId,solo,pulse}};
  validateModel(model);
  return model;
}

export function inspectStudy(study,lessonIds) {
  const errors=[],assert=(test,message)=>{if(!test)errors.push(message);};
  assert(study.id&&study.caseId&&study.title&&study.thesis,'案例缺少身份与分析结论');
  assert(Array.isArray(study.sources)&&study.sources.length>=2,'深入案例需要可核对的来源');
  const sources=new Set((study.sources||[]).map(s=>s.id)),figures=new Set();
  for(const source of study.sources||[])assert(source.title&&/^https:\/\//.test(source.url)&&source.locator,`来源${source.id}缺少链接或定位`);
  for(const section of study.sections||[]) {
    assert(section.heading&&section.claim&&section.explanation?.length&&section.listen?.length,'分析小节缺少结论、解释或可听线索');
    assert(section.evidence?.length&&section.evidence.every(id=>sources.has(id)),`${section.id}引用未知来源`);
    assert(section.lessonIds?.length&&section.lessonIds.every(id=>lessonIds.has(id)),`${section.id}课程链接无效`);
  }
  assert(study.sections?.length>=3,'深入案例至少需要三个分析层次');
  for(const excerpt of study.excerpts||[]) {
    assert(!figures.has(excerpt.id),`重复谱例${excerpt.id}`);figures.add(excerpt.id);
    assert(excerpt.title&&excerpt.identity&&excerpt.locator&&excerpt.caption,`${excerpt.id}未说明谱例身份与定位`);
    assert(excerpt.sourceIds?.length&&excerpt.sourceIds.every(id=>sources.has(id)),`${excerpt.id}引用未知谱源`);
    assert(excerpt.barLabels?.length===excerpt.bars,`${excerpt.id}小节定位不完整`);
    assert(excerpt.variants?.length>=2,`${excerpt.id}缺少可比较的版本`);
    for(const variant of excerpt.variants||[]) {
      assert(variant.label&&variant.description&&variant.identity,`${excerpt.id}/${variant.id}未说明改写边界`);
      const parts=new Set();
      for(const part of variant.parts||[]) {
        assert(part.id&&part.name&&!parts.has(part.id),`${excerpt.id}声部身份重复或缺失`);parts.add(part.id);
        for(const event of part.events||[])assert(Array.isArray(event.notes)&&Number.isFinite(event.beat)&&Number.isFinite(event.duration),`${excerpt.id}记谱事件不完整`);
      }
      try{caseModel(excerpt,variant.id);for(const part of variant.parts)caseModel(excerpt,variant.id,part.id);}catch(error){errors.push(`${excerpt.id}/${variant.id}声音模型：${error.message}`);}
    }
  }
  const rendered=new Set();
  for(const section of study.sections||[]) {
    if(section.excerptId){assert(figures.has(section.excerptId),`${section.id}引用未知谱例`);assert(!rendered.has(section.excerptId),`${section.id}重复渲染同一谱例，请使用跳转引用`);rendered.add(section.excerptId);}
    if(section.relatedExcerptId)assert(figures.has(section.relatedExcerptId),`${section.id}关联未知谱例`);
  }
  return errors;
}

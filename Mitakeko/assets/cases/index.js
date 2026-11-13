import { fishmansStudy } from './fishmans.js';
import { rachmaninoffStudy } from './rachmaninoff.js';
export const caseStudies=[fishmansStudy,rachmaninoffStudy];
const studiesByCase=new Map(caseStudies.map(study=>[study.caseId,study]));
export const findCaseStudy=id=>studiesByCase.get(id);
export const findCaseExcerpt=(study,id)=>study?.excerpts.find(excerpt=>excerpt.id===id);

import { z } from 'zod';
export const loginSchema=z.object({email:z.string().email(),password:z.string().min(8)});
export const registerSchema=loginSchema.extend({fullName:z.string().trim().min(2).max(80),username:z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/)});
export const profileSchema=z.object({full_name:z.string().trim().min(2).max(80),username:z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/),bio:z.string().max(280).optional(),status_text:z.string().max(100).optional()});
export const messageSchema=z.object({content:z.string().trim().min(1).max(5000)});
export const locationSchema=z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)});
export const autoDeleteSchema=z.object({mode:z.enum(['never','24h','12h','3h','5m_after_view','instant_after_view','custom']),custom_seconds:z.number().int().min(60).max(604800).optional()});
export const ALLOWED_FILES=['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/webm','audio/ogg','application/pdf','application/zip','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'];
export const validateFile=(file:File)=>{ if(!ALLOWED_FILES.includes(file.type)) throw new Error('This file type is not supported.'); if(file.size>100*1024*1024) throw new Error('Files must be 100 MB or smaller.'); };

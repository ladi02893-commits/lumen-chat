export type MessageType = 'TEXT'|'EMOJI'|'IMAGE'|'VIDEO'|'AUDIO'|'DOCUMENT'|'LOCATION'|'LINK'|'SYSTEM';
export type Profile = { id:string; auth_user_id:string; full_name:string; username:string; email:string; avatar_url:string|null; bio:string|null; status_text:string|null; is_online:boolean; last_seen_at:string|null };
export type Conversation = { id:string; updated_at:string; auto_delete_mode:string; auto_delete_seconds:number|null; other?:Profile; unread_count?:number; last_message?:Message };
export type Attachment = { id:string; storage_path:string; file_name:string; mime_type:string; file_size:number; thumbnail_path:string|null };
export type Message = { id:string; conversation_id:string; sender_id:string; message_type:MessageType; content:string|null; created_at:string; viewed_at:string|null; deleted_at:string|null; expires_at:string|null; reply_to_message_id:string|null; attachments?:Attachment[]; sender?:Pick<Profile,'id'|'full_name'|'avatar_url'> };

export interface Status {
  online: boolean
  project: string
  voice: string
  listening: boolean
  speaking: boolean
  hotword: boolean
  vu_level: number
  lat_stt: number
  lat_llm: number
  lat_tts: number
  lat_total: number
}

export type Ok<T = any> = { ok: true } & T
export type Err = { ok: false; error: string }
export type Result<T = any> = Ok<T> | Err

export interface ZandaleeApi {
  get_status(): Promise<Status>

  // Chat / voice
  send_text(text: string): Promise<Result<{ handled?: boolean; stored_as?: number }>>
  speak(text: string): Promise<boolean>

  // Memory
  mem_learn(
    text: string,
    kind?: string,
    tags?: string,
    importance?: number,
    relevance?: number
  ): Promise<Result<{ id: number }>>
  mem_search(query: string, limit?: number): Promise<Result<{ results: any[] }>>
  mem_snapshot(): Promise<Result<{ path: string }>>
  mem_rollup(ym?: string): Promise<Result<{ path: string }>>

  // Projects
  project_new(name: string): Promise<Result<{ name: string; path: string; created: boolean }>>
  project_switch(name: string): Promise<Result<{ name: string; path: string }>>
  project_list(): Promise<Result<{ projects: string[] }>>

  // Security / Laws
  policy_list(): Promise<Result<{ policy: any }>>
  policy_allow(kind: 'domain' | 'app', value: string): Promise<Result<{ msg: string }>>
  policy_block(kind: 'domain' | 'app', value: string): Promise<Result<{ msg: string }>>
  laws_update_from_file(path: string, token: string): Promise<Result>
}

/** Minimal shape used by the UI for memory rows. Add fields freely as needed. */
export type Memory = {
  id: number | string
  text: string
  kind?: string
  tags?: string[] | string
  importance?: number
  relevance?: number
  project?: string
  created_at?: string
  [key: string]: any
}

// Re-export the runtime API so `import { api } from "@/types/api"` works.
export { zapi as api } from "../lib/bridge"
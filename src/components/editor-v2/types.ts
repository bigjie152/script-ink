import type { JSONContent } from "@tiptap/core";

export type EntityType = "truth" | "role" | "clue" | "flow_node";

export interface ScriptEntity {
  id: string;
  type: EntityType;
  title: string;
  content: JSONContent;
  props: Record<string, unknown>;
}

export type ScriptEntityStore = {
  version: number;
  entities: ScriptEntity[];
  activeEntityId?: string;
};

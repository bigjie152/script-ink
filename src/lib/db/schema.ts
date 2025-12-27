import { integer, sqliteTable, text, primaryKey, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => ({
  usernameUnique: uniqueIndex("users_username_unique").on(table.username),
}));

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => ({
  userIndex: index("sessions_user_id_idx").on(table.userId),
}));

export const scripts = sqliteTable("scripts", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  coverUrl: text("cover_url"),
  isPublic: integer("is_public").notNull(),
  allowFork: integer("allow_fork").notNull(),
  rootId: text("root_id"),
  parentId: text("parent_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => ({
  authorIndex: index("scripts_author_id_idx").on(table.authorId),
  rootIndex: index("scripts_root_id_idx").on(table.rootId),
}));

export const scriptSections = sqliteTable("script_sections", {
  id: text("id").primaryKey(),
  scriptId: text("script_id").notNull(),
  sectionType: text("section_type").notNull(),
  contentMd: text("content_md").notNull(),
}, (table) => ({
  scriptIndex: index("script_sections_script_id_idx").on(table.scriptId),
}));

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  scriptId: text("script_id").notNull(),
  name: text("name").notNull(),
  contentMd: text("content_md").notNull(),
}, (table) => ({
  scriptIndex: index("roles_script_id_idx").on(table.scriptId),
}));

export const clues = sqliteTable("clues", {
  id: text("id").primaryKey(),
  scriptId: text("script_id").notNull(),
  title: text("title").notNull(),
  contentMd: text("content_md").notNull(),
}, (table) => ({
  scriptIndex: index("clues_script_id_idx").on(table.scriptId),
}));

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
}, (table) => ({
  nameUnique: uniqueIndex("tags_name_unique").on(table.name),
}));

export const scriptTags = sqliteTable("script_tags", {
  scriptId: text("script_id").notNull(),
  tagId: text("tag_id").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.scriptId, table.tagId] }),
  scriptIndex: index("script_tags_script_id_idx").on(table.scriptId),
  tagIndex: index("script_tags_tag_id_idx").on(table.tagId),
}));

export const ratings = sqliteTable("ratings", {
  id: text("id").primaryKey(),
  scriptId: text("script_id").notNull(),
  userId: text("user_id").notNull(),
  logicScore: integer("logic_score").notNull(),
  proseScore: integer("prose_score").notNull(),
  trickScore: integer("trick_score").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => ({
  userIndex: index("ratings_user_id_idx").on(table.userId),
  scriptIndex: index("ratings_script_id_idx").on(table.scriptId),
  uniqueUserScript: uniqueIndex("ratings_user_script_unique").on(table.userId, table.scriptId),
}));

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  scriptId: text("script_id").notNull(),
  authorId: text("author_id").notNull(),
  parentId: text("parent_id"),
  content: text("content").notNull(),
  isDeleted: integer("is_deleted").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => ({
  scriptIndex: index("comments_script_id_idx").on(table.scriptId),
  authorIndex: index("comments_author_id_idx").on(table.authorId),
  parentIndex: index("comments_parent_id_idx").on(table.parentId),
}));

export const commentLikes = sqliteTable("comment_likes", {
  commentId: text("comment_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.commentId, table.userId] }),
  commentIndex: index("comment_likes_comment_id_idx").on(table.commentId),
  userIndex: index("comment_likes_user_id_idx").on(table.userId),
}));

export const scriptFavorites = sqliteTable("script_favorites", {
  scriptId: text("script_id").notNull(),
  userId: text("user_id").notNull(),
  folder: text("folder").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.scriptId, table.userId] }),
  scriptIndex: index("script_favorites_script_id_idx").on(table.scriptId),
  userIndex: index("script_favorites_user_id_idx").on(table.userId),
}));

import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  googleId: text('google_id').unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tables = pgTable('tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  hostId: uuid('host_id').notNull().references(() => users.id),
  seats: integer('seats').notNull(),
  minBuyIn: integer('min_buy_in').notNull(),
  smallBlind: integer('small_blind').notNull(),
  bigBlind: integer('big_blind').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tableSessions = pgTable('table_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableId: uuid('table_id').notNull().references(() => tables.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  totalBuyIn: integer('total_buy_in').notNull().default(0),
  rebuyCount: integer('rebuy_count').notNull().default(0),
  endChips: integer('end_chips'),
  net: integer('net'),
  handsPlayed: integer('hands_played').notNull().default(0),
  handsWon: integer('hands_won').notNull().default(0),
  biggestPot: integer('biggest_pot').notNull().default(0),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
});

export const hands = pgTable('hands', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableId: uuid('table_id').notNull().references(() => tables.id),
  handNumber: integer('hand_number').notNull(),
  board: jsonb('board').notNull(),
  totalPot: integer('total_pot').notNull(),
  winners: jsonb('winners').notNull(),
  actionLog: jsonb('action_log').notNull(),
  holeCards: jsonb('hole_cards').notNull(),
  showdownInfo: jsonb('showdown_info'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

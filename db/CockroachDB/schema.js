import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const records = pgTable("records", {
    id: serial("id").primaryKey(),

    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),

    description: text("description"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
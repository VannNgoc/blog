'use server';

import { sql } from "@/lib/db";
type CreateUserInput = {
  id: string;
  email: string;
  name: string;
  createdAt: Date | string;
};

export async function createUser(data: CreateUserInput) {
    const {id, email, name, createdAt} = data;
    await sql`
        INSERT INTO "USERS" (id, email, username, created_at)
        VALUES (${id}, ${email}, ${name}, ${createdAt})
    `;
    return "User created successfully";
  }
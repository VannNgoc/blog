import { sql } from "@/lib/db";
export async function createUser(data: any) {
    const {id, email, name, createdAt} = data;
    console.log(id + " " + email + " " + name + " " + createdAt)
    await sql`
        INSERT INTO "USERS" (neon_auth_id, email, username, created_at)
        VALUES (${id}, ${email}, ${name}, ${createdAt})
    `;
    return "User created successfully";
  }
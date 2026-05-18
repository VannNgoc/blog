// import { sql } from "@/lib/db";

// // lib/users/queries.ts
// export async function createUser(authId: string, firstName: string, lastName: string, email: string) {
//     await db.query(
//       `INSERT INTO "USERS" (first_name, last_name, email, neon_auth_id, created_at)
//        VALUES ($1, $2, $3, $4, NOW())`,
//       [firstName, lastName, email, authId]
//     );
//   }
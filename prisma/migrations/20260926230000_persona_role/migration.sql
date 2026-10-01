-- Who the user's character is in the world, so characters don't assume a role from their canon.
ALTER TABLE "Persona" ADD COLUMN "role" TEXT NOT NULL DEFAULT '';

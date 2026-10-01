-- Characters may write private thoughts: (thought:Name) text. Off until turned on.
ALTER TABLE "Settings" ADD COLUMN "innerThoughts" BOOLEAN NOT NULL DEFAULT false;

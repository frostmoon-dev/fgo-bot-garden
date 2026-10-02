-- Top K sampling. 0 means it is not sent, since not every provider accepts top_k.
ALTER TABLE "Settings" ADD COLUMN "topK" INTEGER NOT NULL DEFAULT 0;

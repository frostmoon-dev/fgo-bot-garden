-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "customBg" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "font" TEXT NOT NULL DEFAULT 'clear',
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'night';

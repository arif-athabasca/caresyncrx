/*
  Warnings:

  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add ProviderSpecialty new columns
ALTER TABLE "ProviderSpecialty" ADD COLUMN     "certificationBody" TEXT,
ADD COLUMN     "registrationNum" TEXT;

-- AlterTable: Add status column first with default
ALTER TABLE "User" ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- AlterTable: Add firstName and lastName with temporary default, then update with real values
ALTER TABLE "User" ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "User" ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT 'User';

-- Update existing users with parsed names from email
UPDATE "User" SET 
  "firstName" = CASE 
    WHEN "email" LIKE 'dr.%' THEN INITCAP(SUBSTRING("email" FROM 4 FOR POSITION('.' IN SUBSTRING("email" FROM 4)) - 1))
    WHEN "email" LIKE 'nurse.%' THEN INITCAP(SUBSTRING("email" FROM 7 FOR POSITION('.' IN SUBSTRING("email" FROM 7)) - 1))
    WHEN "email" LIKE 'pharm.%' THEN INITCAP(SUBSTRING("email" FROM 7 FOR POSITION('.' IN SUBSTRING("email" FROM 7)) - 1))
    ELSE INITCAP(SUBSTRING("email" FROM 1 FOR POSITION('@' IN "email") - 1))
  END,
  "lastName" = CASE 
    WHEN "email" LIKE 'dr.%.%@%' THEN INITCAP(SUBSTRING("email" FROM POSITION('.' IN SUBSTRING("email" FROM 4)) + 4 FOR POSITION('@' IN "email") - POSITION('.' IN SUBSTRING("email" FROM 4)) - 4))
    WHEN "email" LIKE 'nurse.%.%@%' THEN INITCAP(SUBSTRING("email" FROM POSITION('.' IN SUBSTRING("email" FROM 7)) + 7 FOR POSITION('@' IN "email") - POSITION('.' IN SUBSTRING("email" FROM 7)) - 7))
    WHEN "email" LIKE 'pharm.%.%@%' THEN INITCAP(SUBSTRING("email" FROM POSITION('.' IN SUBSTRING("email" FROM 7)) + 7 FOR POSITION('@' IN "email") - POSITION('.' IN SUBSTRING("email" FROM 7)) - 7))
    ELSE 'User'
  END;

-- Remove the default values now that all records have been updated
ALTER TABLE "User" ALTER COLUMN "firstName" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "lastName" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "User_firstName_lastName_idx" ON "User"("firstName", "lastName");

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uid" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "lastLoggedIn" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'L',
    "bpLastSaved" TEXT
);

-- CreateTable
CREATE TABLE "SavedMail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ops" TEXT NOT NULL,
    "lastSaved" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "SavedMail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("uid") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlueprintAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountIndex" INTEGER NOT NULL,
    "accountName" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "BlueprintAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("uid") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "show" BOOLEAN NOT NULL DEFAULT true,
    "tag" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_uid_key" ON "User"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintAccount_userId_accountIndex_key" ON "BlueprintAccount"("userId", "accountIndex");

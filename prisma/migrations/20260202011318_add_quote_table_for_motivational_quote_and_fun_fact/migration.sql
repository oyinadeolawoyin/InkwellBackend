-- CreateTable
CREATE TABLE "Quote" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "quoteId" INTEGER NOT NULL,

    CONSTRAINT "QuoteLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteLike_userId_quoteId_key" ON "QuoteLike"("userId", "quoteId");

-- AddForeignKey
ALTER TABLE "QuoteLike" ADD CONSTRAINT "QuoteLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLike" ADD CONSTRAINT "QuoteLike_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

const prisma = require("../config/prismaClient");

async function createQuote({ title, content }) {
  return prisma.quote.create({
    data: {
      title,
      content,
    },
  });
}

async function updateQuote({ quoteId, title, content }) {
  return prisma.quote.update({
    where: { id: quoteId },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
    },
  });
}

async function toggleLikeQuote({ userId, quoteId }) {
  return prisma.$transaction(async (tx) => {
    const existingLike = await tx.quoteLike.findUnique({
      where: {
        userId_quoteId: {
          userId,
          quoteId,
        },
      },
    });

    let liked;

    if (existingLike) {
      await tx.quoteLike.delete({
        where: {
          userId_quoteId: {
            userId,
            quoteId,
          },
        },
      });
      liked = false;
    } else {
      await tx.quoteLike.create({
        data: {
          userId,
          quoteId,
        },
      });
      liked = true;
    }

    // count likes after toggle
    const likesCount = await tx.quoteLike.count({
      where: { quoteId },
    });

    return { liked, likesCount };
  });
}

async function fetchQuote() {
  return await prisma.quote.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: { likes: true },
      },
    },
  });
}

module.exports = {
  createQuote,
  updateQuote,
  toggleLikeQuote,
  fetchQuote
};
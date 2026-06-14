/**
 * One-off migration script
 * ─────────────────────────────────────────────────────────────────────────
 * Moves all WritingSnippet rows (plus their SnippetComments and
 * SnippetReplies) into the "Daily Writing Challenge" Thread as
 * ThreadComments (and ThreadReplies).
 *
 * Mapping:
 *   WritingSnippet   -> ThreadComment   (under the target thread)
 *     - content      -> content
 *     - mediaUrl     -> mediaUrl / mediaUrls
 *     - userId       -> authorId
 *     - createdAt    -> createdAt (preserved)
 *
 *   SnippetComment   -> ThreadReply     (attached to the ThreadComment
 *                                         created from its parent snippet)
 *     - content      -> content
 *     - userId       -> authorId
 *
 *   SnippetReply     -> ThreadReply     (flattened — see NOTE below)
 *
 * NOTE on nesting:
 *   Threads only support two levels: ThreadComment -> ThreadReply.
 *   WritingSnippets support three: Snippet -> Comment -> Reply.
 *   To fit the new shape, both SnippetComments AND SnippetReplies become
 *   ThreadReplies on the same ThreadComment (the one created from the
 *   snippet). Reply text is prefixed with "↳ " so the original nesting is
 *   still visible to readers.
 *
 * Likes (SnippetLike, SnippetCommentLike, SnippetReplyLike) are NOT
 * migrated — there's no equivalent guarantee of meaning once content is
 * reparented, and re-creating likes on different users' behalf is usually
 * undesirable. Counts will simply reset to 0 on the new ThreadComments.
 *
 * USAGE:
 *   1. Make sure you've already created the thread whose title contains
 *      "Daily Writing Challenge" (per threadservice.getDailyThread()).
 *   2. node migrateSnippetsToThread.js            (dry run — logs only)
 *   3. node migrateSnippetsToThread.js --commit   (actually writes data)
 *   4. node migrateSnippetsToThread.js --commit --delete-snippets
 *        (also deletes the original WritingSnippet rows + their comments/
 *         replies/likes once migration succeeds)
 *
 * Always back up your database before running with --commit.
 */

const prisma = require("../config/prismaClient");

const COMMIT = process.argv.includes("--commit");
const DELETE_AFTER = process.argv.includes("--delete-snippets");

async function findDailyChallengeThread() {
  const thread = await prisma.thread.findFirst({
    where: {
      title: { contains: "Daily Writing Challenge", mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!thread) {
    throw new Error(
      'No thread found with a title containing "Daily Writing Challenge". ' +
        "Create that thread first, then re-run this script."
    );
  }

  return thread;
}

async function run() {
  console.log(`Mode: ${COMMIT ? "COMMIT (writing data)" : "DRY RUN (no writes)"}`);
  if (COMMIT && DELETE_AFTER) {
    console.log("Will DELETE original snippet data after a successful migration.");
  }

  const thread = await findDailyChallengeThread();
  console.log(`Target thread: #${thread.id} — "${thread.title}"`);

  const snippets = await prisma.writingSnippet.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          replies: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  console.log(`Found ${snippets.length} snippet(s) to migrate.`);

  let migratedSnippets = 0;
  let migratedReplies = 0;

  for (const snippet of snippets) {
    const mediaUrls = snippet.mediaUrl ? [snippet.mediaUrl] : [];

    // Build content for the new ThreadComment from the snippet's text +
    // optional context, so nothing is lost even though ThreadComment has
    // no dedicated "context" field.
    const parts = [];
    if (snippet.content) parts.push(snippet.content);
    if (snippet.context) parts.push(`\n\n— ${snippet.context}`);
    const content = parts.join("") || "(empty snippet)";

    console.log(
      `\nSnippet #${snippet.id} (user ${snippet.userId}, ${snippet.comments.length} comment(s)) -> ThreadComment`
    );

    if (!COMMIT) {
      migratedSnippets++;
      let replyCount = 0;
      for (const comment of snippet.comments) {
        replyCount += 1 + comment.replies.length;
      }
      migratedReplies += replyCount;
      continue;
    }

    // Create the ThreadComment for this snippet
    const threadComment = await prisma.threadComment.create({
      data: {
        threadId: thread.id,
        authorId: snippet.userId,
        content,
        mediaUrl: mediaUrls[0] ?? null,
        mediaUrls,
        createdAt: snippet.createdAt,
      },
    });

    // Flatten SnippetComments + their SnippetReplies into ThreadReplies
    for (const comment of snippet.comments) {
      if (comment.userId != null) {
        await prisma.threadReply.create({
          data: {
            commentId: threadComment.id,
            authorId: comment.userId,
            content: comment.content,
            createdAt: comment.createdAt,
          },
        });
        migratedReplies++;
      } else {
        console.log(`  - skipped SnippetComment #${comment.id} (no userId)`);
      }

      for (const reply of comment.replies) {
        if (reply.userId == null) {
          console.log(`  - skipped SnippetReply #${reply.id} (no userId)`);
          continue;
        }
        await prisma.threadReply.create({
          data: {
            commentId: threadComment.id,
            authorId: reply.userId,
            content: `↳ ${reply.content}`,
            createdAt: reply.createdAt,
          },
        });
        migratedReplies++;
      }
    }

    migratedSnippets++;
  }

  console.log(
    `\n${COMMIT ? "Migrated" : "Would migrate"} ${migratedSnippets} snippet(s) and ${migratedReplies} comment/reply row(s).`
  );

  if (COMMIT && DELETE_AFTER) {
    console.log("\nDeleting original snippet data…");
    for (const snippet of snippets) {
      // Likes and comments/replies cascade on delete per schema.prisma
      await prisma.writingSnippet.delete({ where: { id: snippet.id } });
    }
    console.log(`Deleted ${snippets.length} snippet(s) (cascaded comments/replies/likes).`);
  }

  if (!COMMIT) {
    console.log("\nThis was a dry run. Re-run with --commit to write changes.");
  }
}

run()
  .catch(err => {
    console.error("\nMigration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import { prisma } from '@/src/infrastructure/db/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { authOptions } from '@/infrastructure/auth/auth';

// Helper to convert titles to kebab-case tags - only defined once now!
function toTag(str: string): string {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get current user with their learning paths AND topics
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      paths: {
        where: { status: 'READY' },
        include: {
          topics: { select: { title: true } },
          goal: { select: { title: true } }
        }
      }
    }
  });

  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Build user's interest tags from all their learning content
  const userTags = new Set<string>();
  (currentUser.paths as any[]).forEach((path) => {
    if (path.title) userTags.add(toTag(path.title));
    if (path.goal?.title) userTags.add(toTag(path.goal.title));
    path.topics?.forEach((topic: { title: string }) => {
      if (topic.title) userTags.add(toTag(topic.title));
    });
  });

  // Get groups user is already in
  const userConversations = await prisma.conversationParticipant.findMany({
    where: { userId: currentUser.id },
    select: { conversationId: true }
  });
  const existingGroupIds = userConversations.map(c => c.conversationId);

  // Fetch all available groups
  const availableGroups = await prisma.conversation.findMany({
    where: {
      type: 'GROUP',
      id: { notIn: existingGroupIds }
    },
    include: {
      _count: { select: { participants: true } },
      learningPath: { select: { title: true } }
    }
  });

  // Score and sort groups by relevance
  const scoredGroups = availableGroups.map(group => {
    const groupTags = new Set(group.topicTags || []);
    let matchCount = 0;
    userTags.forEach(userTag => {
      if (groupTags.has(userTag)) matchCount++;
    });
    if (group.learningPath?.title && userTags.has(toTag(group.learningPath.title))) {
      matchCount += 2; // Extra weight for exact learning path matches
    }
    return { ...group, matchCount };
  }).sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
  });

  // Format with intelligent match reasons
  const formattedSuggestions = scoredGroups.slice(0, 5).map(group => {
    let matchReason: string;
    if (group.matchCount >= 3) matchReason = 'Highly relevant to your learning goals';
    else if (group.matchCount > 0) matchReason = 'Matches some of your interests';
    else if (group.learningPath) matchReason = `Popular ${group.learningPath.title} community`;
    else matchReason = 'Trending in your network';

    return {
      id: group.id,
      name: group.name || 'Unnamed Group',
      description: group.description,
      imageUrl: group.imageUrl,
      memberCount: group.memberCount || group._count.participants,
      topicTags: group.topicTags || [],
      lastActivityAt: group.lastActivityAt?.toISOString() || new Date().toISOString(),
      matchReason
    };
  });

  return NextResponse.json(formattedSuggestions);
}

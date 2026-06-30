export function buildLinkedKnowledgeFromChunks(chunks: KnowledgeChunkRecord[]) {
  const sourceChunks = chunks.slice(0, 8);
  const points = sourceChunks.map((chunk, index) => {
    const title = titleFromChunk(chunk.content, chunk.chunkIndex);
    const difficulty = scoreDifficulty(chunk.content);
    const createdAt = now();
    return {
      id: createId(),
      title,
      difficulty,
      sourceChunkIds: [chunk.id],
      sourceFiles: [chunk.fileName],
      chunkIds: [chunk.id],
      mastery: scoreMastery(chunk.content),
      priority: Math.max(1, Math.min(5, index + 1)),
      status: nodeStatus(index, sourceChunks.length),
      createdAt,
      tree: [
        {
          id: createId(),
          title,
          difficulty,
          chunkIds: [chunk.id],
          sourceFiles: [chunk.fileName],
          mastery: scoreMastery(chunk.content),
          priority: Math.max(1, Math.min(5, index + 1)),
          status: nodeStatus(index, sourceChunks.length),
          createdAt,
          children: []
        }
      ]
    } as LearningKnowledgePoint;
  });

  const titles = points.map((item) => item.title);
  const dailyPlan = titles.slice(0, 3).map((title) => `学习：${title}`);
  const reviewPlan = titles.slice(0, 4).map((title, index) => `第${index + 1}轮复习：${title}`);
  const exercises = titles.slice(0, 5).map((title, index) => `练习题 ${index + 1}：围绕 ${title} 出 1 道题`);

  return {
    points,
    learningRoute: titles.slice(0, 6),
    dailyPlan,
    reviewPlan,
    exercises
  };
}

export function buildLinkedTaskTitleFromChunk(content: string, chunkIndex: number) {
  return `学习并应用：${titleFromChunk(content, chunkIndex)}`;
}
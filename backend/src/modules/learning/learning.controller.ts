    const tasks: LearningTaskRecord[] = rankedChunks.map((chunk, index) => {
      const point = linkedLearning.points[index];
      return {
        id: createId(),
        userId,
        learningPlanId: plan.id,
        title: buildLinkedTaskTitleFromChunk(chunk.content, chunk.chunkIndex),
        status: index === 0 ? 'active' : 'pending',
        order: index + 1,
        dueDate: now(),
        sourceChunkId: chunk.id,
        fileName: chunk.fileName,
        knowledgePointId: point?.id || createId(),
        knowledgePointTitle: point?.title || chunk.fileName,
        sourceType: 'rag-chat',
        queryText: query,
        createdAt: now()
      };
    });
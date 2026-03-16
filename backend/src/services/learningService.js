const db = require("../../db");

const recommendationRules = [
  {
    eventType: "OVERTRADING",
    lessonSlug: "risk-management-basics",
    recommendationType: "LESSON",
    reason: "Frequent consecutive trades suggest overtrading. Review position sizing and trade selection discipline.",
  },
  {
    eventType: "PANIC_SELL",
    lessonSlug: "avoiding-emotional-trading",
    recommendationType: "LESSON",
    reason: "Recent selling behavior appears emotional. Review panic selling and decision discipline.",
  },
  {
    eventType: "STOP_LOSS_NEGLECT",
    lessonSlug: "stop-loss-foundations",
    recommendationType: "LESSON",
    reason: "Several trades were placed without enough downside planning. Review stop-loss foundations.",
  },
  {
    eventType: "POOR_DIVERSIFICATION",
    lessonSlug: "diversification-principles",
    recommendationType: "LESSON",
    reason: "Your portfolio is concentrated in very few assets. Review diversification principles.",
  },
];

async function recordLearningEvent(client, userId, eventType, severity, metadata = {}) {
  await client.query(
    `
      INSERT INTO learning_events (user_id, event_type, severity, metadata)
      VALUES ($1, $2, $3, $4::jsonb)
    `,
    [userId, eventType, severity, JSON.stringify(metadata)]
  );
}

async function upsertRecommendation(client, userId, eventType) {
  const rule = recommendationRules.find((item) => item.eventType === eventType);
  if (!rule) {
    return;
  }

  const lessonResult = await client.query(
    `
      SELECT id
      FROM lessons
      WHERE slug = $1
    `,
    [rule.lessonSlug]
  );

  const lessonId = lessonResult.rowCount > 0 ? lessonResult.rows[0].id : null;

  await client.query(
    `
      INSERT INTO learning_recommendations (
        user_id,
        lesson_id,
        recommendation_type,
        reason,
        status
      )
      VALUES ($1, $2, $3, $4, 'ACTIVE')
    `,
    [userId, lessonId, rule.recommendationType, rule.reason]
  );
}

async function analyzePortfolioBehavior(client, userId, portfolioId) {
  const events = [];

  const orderResult = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM orders
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
    `,
    [userId]
  );

  const orderCount = orderResult.rows[0]?.count || 0;
  if (orderCount >= 6) {
    events.push({
      eventType: "OVERTRADING",
      severity: "MEDIUM",
      metadata: { orderCountLast24h: orderCount },
    });
  }

  const panicSellResult = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM transactions
      WHERE portfolio_id = $1
        AND side = 'SELL'
        AND realized_pl < 0
        AND created_at >= NOW() - INTERVAL '7 days'
    `,
    [portfolioId]
  );

  const panicSellCount = panicSellResult.rows[0]?.count || 0;
  if (panicSellCount >= 3) {
    events.push({
      eventType: "PANIC_SELL",
      severity: "MEDIUM",
      metadata: { losingSellsLast7d: panicSellCount },
    });
  }

  const concentrationResult = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM holdings
      WHERE portfolio_id = $1 AND quantity > 0
    `,
    [portfolioId]
  );

  const holdingCount = concentrationResult.rows[0]?.count || 0;
  if (holdingCount > 0 && holdingCount < 2) {
    events.push({
      eventType: "POOR_DIVERSIFICATION",
      severity: "LOW",
      metadata: { activeHoldingCount: holdingCount },
    });
  }

  return events;
}

async function evaluateAndStoreInsights(client, userId, portfolioId, tradeContext = {}) {
  const combinedEvents = [];

  if (tradeContext.side === "BUY" && tradeContext.priceVsReference >= 2.5) {
    combinedEvents.push({
      eventType: "BUYING_SPIKE",
      severity: "LOW",
      metadata: {
        pair: tradeContext.pair,
        priceVsReference: tradeContext.priceVsReference,
      },
    });
  }

  if (tradeContext.side === "SELL" && tradeContext.realizedPl < 0) {
    combinedEvents.push({
      eventType: "PANIC_SELL",
      severity: "MEDIUM",
      metadata: {
        pair: tradeContext.pair,
        realizedPl: tradeContext.realizedPl,
      },
    });
  }

  if (!tradeContext.stopLossProvided) {
    combinedEvents.push({
      eventType: "STOP_LOSS_NEGLECT",
      severity: "LOW",
      metadata: {
        pair: tradeContext.pair,
      },
    });
  }

  const portfolioEvents = await analyzePortfolioBehavior(client, userId, portfolioId);
  combinedEvents.push(...portfolioEvents);

  for (const event of combinedEvents) {
    await recordLearningEvent(
      client,
      userId,
      event.eventType,
      event.severity,
      event.metadata
    );
    await upsertRecommendation(client, userId, event.eventType);
  }
}

async function getRecommendations(userId) {
  const result = await db.query(
    `
      SELECT
        lr.id,
        lr.recommendation_type,
        lr.reason,
        lr.status,
        lr.created_at,
        l.id AS lesson_id,
        l.title,
        l.slug,
        l.level,
        l.category
      FROM learning_recommendations lr
      LEFT JOIN lessons l ON l.id = lr.lesson_id
      WHERE lr.user_id = $1
      ORDER BY lr.created_at DESC
      LIMIT 10
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    recommendationType: row.recommendation_type,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    lesson: row.lesson_id
      ? {
          id: row.lesson_id,
          title: row.title,
          slug: row.slug,
          level: row.level,
          category: row.category,
        }
      : null,
  }));
}

module.exports = {
  evaluateAndStoreInsights,
  getRecommendations,
};

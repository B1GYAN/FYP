INSERT INTO watchlist (symbol, quote)
VALUES
  ('BTC', 'USDT'),
  ('ETH', 'USDT'),
  ('SOL', 'USDT')
ON CONFLICT DO NOTHING;

INSERT INTO market_assets (symbol, quote, asset_type, provider_symbol)
VALUES
  ('BTC', 'USDT', 'CRYPTO', 'BTCUSDT'),
  ('ETH', 'USDT', 'CRYPTO', 'ETHUSDT'),
  ('SOL', 'USDT', 'CRYPTO', 'SOLUSDT'),
  ('EUR', 'USD', 'FOREX', 'EURUSD'),
  ('GBP', 'USD', 'FOREX', 'GBPUSD')
ON CONFLICT DO NOTHING;

INSERT INTO lessons (slug, title, category, level, summary, content, estimated_minutes)
VALUES
  (
    'risk-management-basics',
    'Risk Management Basics',
    'Risk Management',
    'Beginner',
    'Learn how to protect your virtual capital using position sizing and defined risk.',
    'Risk management helps traders survive losing streaks. In PaperTrade, users should learn to size positions relative to account balance, avoid all-in trades, and define maximum loss before entering an order.',
    8
  ),
  (
    'stop-loss-foundations',
    'Stop-Loss Foundations',
    'Trade Planning',
    'Beginner',
    'Understand why stop-loss planning matters and how it reduces emotional exits.',
    'A stop-loss is a predefined exit level designed to control downside. Even in a simulation, repeated neglect of stop-loss planning often leads to panic selling and poor discipline.',
    7
  ),
  (
    'avoiding-emotional-trading',
    'Avoiding Emotional Trading',
    'Trading Psychology',
    'Intermediate',
    'Recognize panic selling, revenge trading, and impulsive buying during spikes.',
    'Emotional trading shows up as overtrading, chasing momentum after sharp candles, and selling immediately after drawdowns. Tracking these patterns lets the system recommend corrective lessons.',
    10
  ),
  (
    'diversification-principles',
    'Diversification Principles',
    'Portfolio Construction',
    'Beginner',
    'Explore why spreading risk across assets can stabilize portfolio behavior.',
    'Diversification reduces concentration risk. A student-friendly simulator can highlight when too much capital is committed to a single asset or correlated assets.',
    9
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO quizzes (lesson_id, title)
SELECT id, title || ' Quiz'
FROM lessons
ON CONFLICT DO NOTHING;

INSERT INTO quiz_questions (
  quiz_id,
  question_text,
  answer_options,
  correct_answer,
  explanation,
  sort_order
)
SELECT
  q.id,
  'What is the main purpose of position sizing?',
  '["To control risk per trade","To guarantee profits","To increase leverage"]'::jsonb,
  'To control risk per trade',
  'Position sizing helps limit how much capital is exposed on a single idea.',
  1
FROM quizzes q
JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'risk-management-basics'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_questions qq
    WHERE qq.quiz_id = q.id AND qq.sort_order = 1
  );

INSERT INTO quiz_questions (
  quiz_id,
  question_text,
  answer_options,
  correct_answer,
  explanation,
  sort_order
)
SELECT
  q.id,
  'Why do traders use stop-loss levels?',
  '["To define downside before entering","To force bigger trades","To predict the market"]'::jsonb,
  'To define downside before entering',
  'A stop-loss is mainly a risk-control tool rather than a prediction tool.',
  1
FROM quizzes q
JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'stop-loss-foundations'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_questions qq
    WHERE qq.quiz_id = q.id AND qq.sort_order = 1
  );

INSERT INTO quiz_questions (
  quiz_id,
  question_text,
  answer_options,
  correct_answer,
  explanation,
  sort_order
)
SELECT
  q.id,
  'Which behavior is a sign of emotional trading?',
  '["Revenge trading after losses","Following a written plan","Scaling in carefully"]'::jsonb,
  'Revenge trading after losses',
  'Revenge trading is a classic example of emotionally driven decision-making.',
  1
FROM quizzes q
JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'avoiding-emotional-trading'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_questions qq
    WHERE qq.quiz_id = q.id AND qq.sort_order = 1
  );

INSERT INTO quiz_questions (
  quiz_id,
  question_text,
  answer_options,
  correct_answer,
  explanation,
  sort_order
)
SELECT
  q.id,
  'Why can diversification help a paper trader?',
  '["It reduces concentration risk","It guarantees every trade wins","It removes the need for research"]'::jsonb,
  'It reduces concentration risk',
  'Diversification spreads exposure and lowers dependence on one asset.',
  1
FROM quizzes q
JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'diversification-principles'
  AND NOT EXISTS (
    SELECT 1 FROM quiz_questions qq
    WHERE qq.quiz_id = q.id AND qq.sort_order = 1
  );

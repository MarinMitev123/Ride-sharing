UPDATE users u
INNER JOIN (
    SELECT to_user_id, ROUND(AVG(score), 1) AS avg_score
    FROM ratings
    GROUP BY to_user_id
) r ON u.id = r.to_user_id
SET u.rating_average = r.avg_score;

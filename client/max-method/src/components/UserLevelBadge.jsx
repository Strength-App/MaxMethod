import { levelProgress } from '../utils/classification';

function UserLevelBadge({ sex, bodyweight, total, showProgress = true }) {
  const bw = Number(bodyweight);
  const t = Number(total);
  if (!sex || !bw || !t) return null;

  const { fineLevel, nextLevel, lbsToNext } = levelProgress({
    sex,
    bodyweight: bw,
    total: t,
  });
  const isElite = nextLevel == null;

  return (
    <div className="user-level-badge">
      <div className="user-level-badge__label">{fineLevel}</div>
      {showProgress && (
        <div className="user-level-badge__progress">
          {isElite ? (
            'Maxed Out'
          ) : (
            <>
              <span style={{ color: 'var(--accent)' }}>{lbsToNext} lbs</span>
              {' to '}
              {nextLevel}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default UserLevelBadge;
